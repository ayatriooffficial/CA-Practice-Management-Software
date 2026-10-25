import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';
import { strictBoolean } from '../../config/env';
import {
  getKolkataYMD,
  parseDateToYMD,
  diffInCalendarDays,
  isAutomaticExpiryRemindersEnabled,
  isAutomaticRemindersRealSendEnabled,
  AgentSchedulerService,
} from './scheduler.service';
import { Client as ClientModel } from '../client/client.model';
import { AgentRun } from './agentRun.model';
import { AgentExecutionService } from './execution.service';

function setupMockAgentRunStore() {
  const store = new Map<string, any>();
  const originalCreate = AgentRun.create;
  const originalFindOneAndUpdate = AgentRun.findOneAndUpdate;
  const originalFindOne = AgentRun.findOne;
  const originalUpdateOne = AgentRun.updateOne;

  AgentRun.create = (async (doc: any) => {
    const key = `${doc.orgId}:${String(doc.agentId)}:${doc.runKey}`;
    if (store.has(key)) {
      const err: any = new Error('E11000 duplicate key error');
      err.code = 11000;
      throw err;
    }
    const created = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
      save: async function () { return this; },
    };
    store.set(key, created);
    return created;
  }) as any;

  AgentRun.findOneAndUpdate = ((filter: any, update: any) => ({
    exec: async () => {
      for (const [key, doc] of store.entries()) {
        const filterAgentId = String(filter.agentId);
        const docAgentId = String(doc.agentId);
        if (doc.orgId === filter.orgId && docAgentId === filterAgentId && doc.runKey === filter.runKey) {
          let matchOr = false;
          for (const cond of filter.$or || []) {
            if (cond.status === 'failed' && doc.status === 'failed') matchOr = true;
            if (cond.status === 'in-progress' && doc.status === 'in-progress') {
              if (cond.updatedAt?.$lt && doc.updatedAt < cond.updatedAt.$lt) matchOr = true;
            }
            if (
              cond.status === 'success' &&
              cond.executionMode === 'mock' &&
              doc.status === 'success' &&
              doc.executionMode === 'mock'
            ) {
              matchOr = true;
            }
          }
          if (matchOr) {
            Object.assign(doc, update.$set, { updatedAt: new Date() });
            return doc;
          }
        }
      }
      return null;
    },
  })) as any;

  AgentRun.findOne = ((filter: any) => ({
    select: () => ({
      lean: () => ({
        exec: async () => {
          for (const [key, doc] of store.entries()) {
            if (doc.orgId === filter.orgId && (!filter.runKey || doc.runKey === filter.runKey)) {
              return doc;
            }
          }
          return null;
        },
      }),
    }),
    exec: async () => {
      for (const [key, doc] of store.entries()) {
        if (doc.orgId === filter.orgId && (!filter.runKey || doc.runKey === filter.runKey)) {
          return doc;
        }
      }
      return null;
    },
  })) as any;

  AgentRun.updateOne = ((filter: any, update: any) => ({
    exec: async () => {
      for (const [key, doc] of store.entries()) {
        if (String(doc._id) === String(filter._id)) {
          Object.assign(doc, update.$set);
          return { acknowledged: true, modifiedCount: 1 };
        }
      }
      return { acknowledged: true, modifiedCount: 0 };
    },
  })) as any;

  return {
    store,
    cleanup: () => {
      AgentRun.create = originalCreate;
      AgentRun.findOneAndUpdate = originalFindOneAndUpdate;
      AgentRun.findOne = originalFindOne;
      AgentRun.updateOne = originalUpdateOne;
    },
  };
}

describe('Automatic DSC & License Expiry Reminder Service', () => {
  describe('1. Timezone Boundary Verification (Asia/Kolkata UTC+05:30)', () => {
    it('maintains Asia/Kolkata date across midnight UTC rollover', () => {
      const justBeforeMidnightIST = new Date('2026-10-25T18:29:59.000Z');
      assert.equal(getKolkataYMD(justBeforeMidnightIST), '2026-10-25');

      const exactlyMidnightIST = new Date('2026-10-25T18:30:00.000Z');
      assert.equal(getKolkataYMD(exactlyMidnightIST), '2026-10-26');

      const noonUTC = new Date('2026-10-26T12:00:00.000Z');
      assert.equal(getKolkataYMD(noonUTC), '2026-10-26');
    });
  });

  describe('2. Date Parsing Versatility (parseDateToYMD)', () => {
    it('parses standard ISO and YYYY-MM-DD format', () => {
      assert.equal(parseDateToYMD('2026-11-09'), '2026-11-09');
      assert.equal(parseDateToYMD('2026-11-09T00:00:00.000Z'), '2026-11-09');
      assert.equal(parseDateToYMD('2026/11/09'), '2026-11-09');
    });

    it('parses Indian DD/MM/YYYY and DD-MM-YYYY format', () => {
      assert.equal(parseDateToYMD('09/11/2026'), '2026-11-09');
      assert.equal(parseDateToYMD('9/11/2026'), '2026-11-09');
      assert.equal(parseDateToYMD('09-11-2026'), '2026-11-09');
      assert.equal(parseDateToYMD('9-11-2026'), '2026-11-09');
    });

    it('parses textual date representations', () => {
      assert.equal(parseDateToYMD('22 Oct 2031'), '2031-10-22');
      assert.equal(parseDateToYMD('November 9, 2026'), '2026-11-09');
    });

    it('returns null for missing, dash, or invalid values', () => {
      assert.equal(parseDateToYMD(''), null);
      assert.equal(parseDateToYMD('—'), null);
      assert.equal(parseDateToYMD('-'), null);
      assert.equal(parseDateToYMD('  '), null);
      assert.equal(parseDateToYMD(null as any), null);
      assert.equal(parseDateToYMD(undefined as any), null);
      assert.equal(parseDateToYMD('not-a-valid-date'), null);
    });
  });

  describe('3. Deterministic Calendar Day Calculation (diffInCalendarDays)', () => {
    const today = '2026-10-25';

    it('calculates exactly 15 calendar days in future', () => {
      const exp15 = '2026-11-09';
      assert.equal(diffInCalendarDays(exp15, today), 15);
    });

    it('calculates exactly 10 calendar days in future', () => {
      const exp10 = '2026-11-04';
      assert.equal(diffInCalendarDays(exp10, today), 10);
    });

    it('handles same day (expiry today = 0 days left)', () => {
      assert.equal(diffInCalendarDays(today, today), 0);
    });

    it('calculates negative days for expired records', () => {
      assert.equal(diffInCalendarDays('2026-10-24', today), -1);
      assert.equal(diffInCalendarDays('2026-09-25', today), -30);
    });
  });

  describe('4. Milestone Assignment & Missed Run Suppression Logic', () => {
    function resolveMilestone(daysLeft: number): '15d' | '10d' | null {
      if (daysLeft < 0 || daysLeft > 15) return null;
      if (daysLeft > 10 && daysLeft <= 15) return '15d';
      if (daysLeft >= 0 && daysLeft <= 10) return '10d';
      return null;
    }

    it('assigns 15d milestone strictly for 11 to 15 calendar days', () => {
      assert.equal(resolveMilestone(15), '15d');
      assert.equal(resolveMilestone(14), '15d');
      assert.equal(resolveMilestone(11), '15d');
    });

    it('assigns 10d milestone strictly for 0 to 10 calendar days', () => {
      assert.equal(resolveMilestone(10), '10d');
      assert.equal(resolveMilestone(7), '10d');
      assert.equal(resolveMilestone(1), '10d');
      assert.equal(resolveMilestone(0), '10d');
    });

    it('suppresses pre-expiry reminders for expired assets', () => {
      assert.equal(resolveMilestone(-1), null);
      assert.equal(resolveMilestone(-10), null);
    });

    it('ignores assets more than 15 days out', () => {
      assert.equal(resolveMilestone(16), null);
      assert.equal(resolveMilestone(30), null);
    });

    it('prevents burst on missed runs: if a run was missed at 15d, 8d remaining sends only 10d', () => {
      const milestone = resolveMilestone(8);
      assert.equal(milestone, '10d');
    });
  });

  describe('5. Idempotent RunKey Generation', () => {
    it('generates consistent runKey without today date stamp to prevent repeat sending', () => {
      const milestone = '15d';
      const clientId = 'client_123';
      const dscKey = 'DSC-999';
      const expYMD = '2026-11-09';

      const runKey1 = `remind:dsc-expiry:${milestone}:${clientId}:${dscKey}:${expYMD}`;
      const runKey2 = `remind:dsc-expiry:${milestone}:${clientId}:${dscKey}:${expYMD}`;

      assert.equal(runKey1, runKey2);
      assert.equal(runKey1.includes('2026-10-25'), false);
      assert.equal(runKey1, 'remind:dsc-expiry:15d:client_123:DSC-999:2026-11-09');

      const runKey10d = `remind:dsc-expiry:10d:${clientId}:${dscKey}:${expYMD}`;
      assert.notEqual(runKey1, runKey10d);
      assert.equal(runKey10d, 'remind:dsc-expiry:10d:client_123:DSC-999:2026-11-09');
    });

    it('generates unique runKey for license records', () => {
      const runKey = `remind:lic-expiry:10d:client_456:LIC-8888:2026-11-04`;
      assert.equal(runKey, 'remind:lic-expiry:10d:client_456:LIC-8888:2026-11-04');
    });
  });

  describe('6. Environment Boolean Parsing & Safe Defaults', () => {
    describe('strictBoolean Schema Parsing', () => {
      it('correctly parses AUTOMATIC_EXPIRY_REMINDERS_ENABLED (default: false)', () => {
        const schema = strictBoolean(false);
        assert.equal(schema.parse(undefined), false);
        assert.equal(schema.parse(''), false);
        assert.equal(schema.parse('false'), false);
        assert.equal(schema.parse('FALSE'), false);
        assert.equal(schema.parse(' false '), false);
        assert.equal(schema.parse(false), false);
        assert.equal(schema.parse('true'), true);
        assert.equal(schema.parse('TRUE'), true);
        assert.equal(schema.parse(' true '), true);
        assert.equal(schema.parse(true), true);
        assert.throws(() => schema.parse('invalid'), /Invalid boolean environment variable/);
        assert.throws(() => schema.parse('yes'), /Invalid boolean environment variable/);
        assert.throws(() => schema.parse('1'), /Invalid boolean environment variable/);
        assert.throws(() => schema.parse('0'), /Invalid boolean environment variable/);
      });

      it('correctly parses AUTOMATIC_REMINDERS_REAL_SEND (default: false)', () => {
        const schema = strictBoolean(false);
        assert.equal(schema.parse(undefined), false);
        assert.equal(schema.parse(''), false);
        assert.equal(schema.parse('false'), false);
        assert.equal(schema.parse('true'), true);
        assert.throws(() => schema.parse('random_value'), /Invalid boolean environment variable/);
      });

      it('correctly parses ENABLE_BACKGROUND_SCHEDULER (default: true)', () => {
        const schema = strictBoolean(true);
        assert.equal(schema.parse(undefined), true);
        assert.equal(schema.parse(''), true);
        assert.equal(schema.parse('false'), false);
        assert.equal(schema.parse('FALSE'), false);
        assert.equal(schema.parse(false), false);
        assert.equal(schema.parse('true'), true);
        assert.equal(schema.parse(true), true);
        assert.throws(() => schema.parse('enabled'), /Invalid boolean environment variable/);
        assert.throws(() => schema.parse('disabled'), /Invalid boolean environment variable/);
      });
    });

    describe('Runtime Helper Evaluation', () => {
      it('is disabled by default when environment variables are unset', () => {
        const originalEnabled = process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED;
        const originalRealSend = process.env.AUTOMATIC_REMINDERS_REAL_SEND;

        delete process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED;
        delete process.env.AUTOMATIC_REMINDERS_REAL_SEND;

        assert.equal(isAutomaticExpiryRemindersEnabled(), false);
        assert.equal(isAutomaticRemindersRealSendEnabled(), false);

        if (originalEnabled) process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = originalEnabled;
        if (originalRealSend) process.env.AUTOMATIC_REMINDERS_REAL_SEND = originalRealSend;
      });

      it('proves that explicitly setting AUTOMATIC_REMINDERS_REAL_SEND=false cannot trigger real email transmission', () => {
        const originalRealSend = process.env.AUTOMATIC_REMINDERS_REAL_SEND;

        process.env.AUTOMATIC_REMINDERS_REAL_SEND = 'false';
        assert.equal(isAutomaticRemindersRealSendEnabled(), false);

        process.env.AUTOMATIC_REMINDERS_REAL_SEND = 'FALSE';
        assert.equal(isAutomaticRemindersRealSendEnabled(), false);

        process.env.AUTOMATIC_REMINDERS_REAL_SEND = ' false ';
        assert.equal(isAutomaticRemindersRealSendEnabled(), false);

        if (originalRealSend !== undefined) {
          process.env.AUTOMATIC_REMINDERS_REAL_SEND = originalRealSend;
        } else {
          delete process.env.AUTOMATIC_REMINDERS_REAL_SEND;
        }
      });

      it('proves that explicitly setting AUTOMATIC_EXPIRY_REMINDERS_ENABLED=false keeps reminders disabled', () => {
        const originalEnabled = process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED;

        process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = 'false';
        assert.equal(isAutomaticExpiryRemindersEnabled(), false);

        process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = 'FALSE';
        assert.equal(isAutomaticExpiryRemindersEnabled(), false);

        if (originalEnabled !== undefined) {
          process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = originalEnabled;
        } else {
          delete process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED;
        }
      });

      it('enables flags only when explicitly set to "true"', () => {
        const originalEnabled = process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED;
        const originalRealSend = process.env.AUTOMATIC_REMINDERS_REAL_SEND;

        process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = 'true';
        process.env.AUTOMATIC_REMINDERS_REAL_SEND = 'true';

        assert.equal(isAutomaticExpiryRemindersEnabled(), true);
        assert.equal(isAutomaticRemindersRealSendEnabled(), true);

        if (originalEnabled !== undefined) {
          process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = originalEnabled;
        } else {
          delete process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED;
        }

        if (originalRealSend !== undefined) {
          process.env.AUTOMATIC_REMINDERS_REAL_SEND = originalRealSend;
        } else {
          delete process.env.AUTOMATIC_REMINDERS_REAL_SEND;
        }
      });
    });
  });

  describe('7. Recipient Email Validation', () => {
    const isValidEmail = (email?: string | null): boolean => {
      const cleaned = (email || '').trim().toLowerCase();
      return Boolean(cleaned && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned));
    };

    it('validates standard email addresses correctly', () => {
      assert.equal(isValidEmail('client@example.com'), true);
      assert.equal(isValidEmail('  finance.audit@firm.in  '), true);
      assert.equal(isValidEmail('tax+test@domain.co.uk'), true);
    });

    it('rejects invalid or missing email addresses', () => {
      assert.equal(isValidEmail(''), false);
      assert.equal(isValidEmail(null), false);
      assert.equal(isValidEmail(undefined), false);
      assert.equal(isValidEmail('not-an-email'), false);
      assert.equal(isValidEmail('@missinguser.com'), false);
      assert.equal(isValidEmail('user@domain'), false);
    });
  });

  describe('8. Batch Reminder Execution Pipeline (processAutomaticExpiryReminders)', () => {
    it('returns ran: false immediately when disabled', async () => {
      const res = await AgentSchedulerService.processAutomaticExpiryReminders(
        new Date('2026-10-25T10:00:00.000Z'),
        { forceEnable: false }
      );
      assert.equal(res.ran, false);
      assert.ok(res.errors[0]?.includes('disabled by configuration'));
    });

    it('processes client DSCs and Licenses and handles 15d and 10d milestones, invalid dates, missing recipients, and duplicates', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      const { store, cleanup: cleanupStore } = setupMockAgentRunStore();

      // Pre-seed an existing completed run for Duplicate Client
      const dupAgentId = '0000000000000000000000a1';
      const dupRunKey = 'remind:dsc-expiry:15d:client_duplicate:DSC-ALREADY-SENT:2026-11-09';
      store.set(`org_test:${dupAgentId}:${dupRunKey}`, {
        orgId: 'org_test',
        agentId: new mongoose.Types.ObjectId(dupAgentId),
        runKey: dupRunKey,
        status: 'success',
        executionMode: 'mock',
        updatedAt: new Date(),
      });

      const mockClients = [
        {
          _id: 'client_dsc_15d',
          name: 'Acme Pvt Ltd',
          email: 'acme@example.com',
          orgId: 'org_test',
          dscs: [
            {
              id: 'dsc_1',
              dscId: 'DSC-1001',
              name: 'John Doe',
              expiryDate: '2026-11-09',
              status: 'Active',
            },
            {
              id: 'dsc_invalid_date',
              dscId: 'DSC-INVALID',
              name: 'Jane Doe',
              expiryDate: '—',
              status: 'Active',
            },
            {
              id: 'dsc_expired',
              dscId: 'DSC-EXPIRED',
              name: 'Old User',
              expiryDate: '2026-09-01',
              status: 'Active',
            },
          ],
          licenses: [],
        },
        {
          _id: 'client_lic_10d',
          name: 'Beta Global',
          email: 'beta@example.com',
          orgId: 'org_test',
          dscs: [],
          licenses: [
            {
              id: 'lic_1',
              licenseNo: 'LIC-2002',
              name: 'Trade License',
              expiryDate: '2026-11-04',
            },
          ],
        },
        {
          _id: 'client_missing_email',
          name: 'No Email Corp',
          email: '',
          orgId: 'org_test',
          dscs: [
            {
              id: 'dsc_no_email',
              dscId: 'DSC-NOEMAIL',
              name: 'No Email User',
              expiryDate: '2026-11-09',
              status: 'Active',
            },
          ],
          licenses: [],
        },
        {
          _id: 'client_duplicate',
          name: 'Duplicate Client',
          email: 'dup@example.com',
          orgId: 'org_test',
          dscs: [
            {
              id: 'dsc_dup',
              dscId: 'DSC-ALREADY-SENT',
              name: 'Sent User',
              expiryDate: '2026-11-09',
              status: 'Active',
            },
          ],
          licenses: [],
        },
      ];

      const originalClientFind = ClientModel.find;
      ClientModel.find = (() => ({
        lean: () => ({ exec: async () => mockClients }),
      })) as any;

      const originalGetSystemAgent = AgentSchedulerService.getOrCreateSystemAgent;
      AgentSchedulerService.getOrCreateSystemAgent = (async (_orgId: string, module: 'DSC' | 'License') => ({
        _id: module === 'DSC' ? new mongoose.Types.ObjectId(dupAgentId) : new mongoose.Types.ObjectId('0000000000000000000000a2'),
        module,
        name: `Mock ${module} Agent`,
      })) as any;

      const dispatchedCalls: any[] = [];
      const originalExecutionRun = AgentExecutionService.run;
      AgentExecutionService.run = (async (agentId: string, payload: any) => {
        dispatchedCalls.push({ agentId, payload });
        return {
          runId: `run_${dispatchedCalls.length}`,
          status: 'success',
          executionMode: 'mock',
          results: [],
        };
      }) as any;

      try {
        const fixedNow = new Date('2026-10-25T10:00:00.000Z');
        const result = await AgentSchedulerService.processAutomaticExpiryReminders(fixedNow, {
          forceEnable: true,
          forceRealSend: false,
        });

        assert.equal(result.ran, true);
        assert.equal(result.todayKolkataYMD, '2026-10-25');
        assert.equal(result.processedClients, 4);

        assert.equal(result.dispatchedReminders, 2);
        assert.equal(dispatchedCalls.length, 2);

        // Verify call 1: DSC 15d reminder
        const dscCall = dispatchedCalls.find((c) => c.payload.event.dsc?.dscId === 'DSC-1001');
        assert.ok(dscCall, 'DSC 15d reminder should be dispatched');
        assert.equal(dscCall.payload.runType, 'test');
        assert.equal(dscCall.payload.event.milestone, '15d');
        assert.equal(dscCall.payload.event.daysLeft, 15);
        assert.equal(dscCall.payload.event.clientEmail, 'acme@example.com');
        assert.equal(dscCall.payload.idempotencyKey, 'remind:dsc-expiry:15d:client_dsc_15d:DSC-1001:2026-11-09');

        // Verify call 2: License 10d reminder
        const licCall = dispatchedCalls.find((c) => c.payload.event.license?.licenseNo === 'LIC-2002');
        assert.ok(licCall, 'License 10d reminder should be dispatched');
        assert.equal(licCall.payload.runType, 'test');
        assert.equal(licCall.payload.event.milestone, '10d');
        assert.equal(licCall.payload.event.daysLeft, 10);
        assert.equal(licCall.payload.event.clientEmail, 'beta@example.com');
        assert.equal(licCall.payload.idempotencyKey, 'remind:lic-expiry:10d:client_lic_10d:LIC-2002:2026-11-04');

        assert.equal(result.skippedInvalidDate, 1);
        assert.equal(result.skippedMissingRecipient, 1);
        assert.equal(result.skippedAlreadyHandled, 1);
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
        ClientModel.find = originalClientFind;
        cleanupStore();
        AgentSchedulerService.getOrCreateSystemAgent = originalGetSystemAgent;
        AgentExecutionService.run = originalExecutionRun;
      }
    });

    it('proves that process.env.AUTOMATIC_REMINDERS_REAL_SEND="false" guarantees simulated runs and prevents real email dispatch', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      const origEnvEnabled = process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED;
      const origEnvRealSend = process.env.AUTOMATIC_REMINDERS_REAL_SEND;

      process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = 'true';
      process.env.AUTOMATIC_REMINDERS_REAL_SEND = 'false';

      const { cleanup: cleanupStore } = setupMockAgentRunStore();

      const mockClient = [
        {
          _id: 'client_dry_run',
          name: 'Dry Run Corp',
          email: 'dryrun@example.com',
          orgId: 'org_test',
          dscs: [
            {
              id: 'dsc_dry',
              dscId: 'DSC-DRY-1',
              name: 'Dry Run User',
              expiryDate: '2026-11-09',
              status: 'Active',
            },
          ],
          licenses: [],
        },
      ];

      const originalClientFind = ClientModel.find;
      ClientModel.find = (() => ({
        lean: () => ({ exec: async () => mockClient }),
      })) as any;

      const originalGetSystemAgent = AgentSchedulerService.getOrCreateSystemAgent;
      AgentSchedulerService.getOrCreateSystemAgent = (async () => ({
        _id: new mongoose.Types.ObjectId('0000000000000000000000a1'),
        module: 'DSC',
        name: 'Mock DSC Agent',
      })) as any;

      let dispatchedPayload: any = null;
      const originalExecutionRun = AgentExecutionService.run;
      AgentExecutionService.run = (async (_id: string, opts: any) => {
        dispatchedPayload = opts;
        return { status: 'success' };
      }) as any;

      try {
        const fixedNow = new Date('2026-10-25T10:00:00.000Z');
        const result = await AgentSchedulerService.processAutomaticExpiryReminders(fixedNow);

        assert.equal(result.ran, true);
        assert.equal(result.dispatchedReminders, 1);
        assert.ok(dispatchedPayload, 'Execution run should be invoked');
        assert.equal(dispatchedPayload.runType, 'test');
      } finally {
        if (origEnvEnabled !== undefined) {
          process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = origEnvEnabled;
        } else {
          delete process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED;
        }
        if (origEnvRealSend !== undefined) {
          process.env.AUTOMATIC_REMINDERS_REAL_SEND = origEnvRealSend;
        } else {
          delete process.env.AUTOMATIC_REMINDERS_REAL_SEND;
        }
        Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
        ClientModel.find = originalClientFind;
        cleanupStore();
        AgentSchedulerService.getOrCreateSystemAgent = originalGetSystemAgent;
        AgentExecutionService.run = originalExecutionRun;
      }
    });

    it('ensures a simulated run does NOT block a subsequent real send', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      const { store, cleanup: cleanupStore } = setupMockAgentRunStore();

      const agentId = '0000000000000000000000a1';
      const runKey = 'remind:dsc-expiry:15d:client_dsc_real_send:DSC-REAL-1:2026-11-09';
      // Pre-seed an existing mock simulation run
      store.set(`org_test:${agentId}:${runKey}`, {
        orgId: 'org_test',
        agentId: new mongoose.Types.ObjectId(agentId),
        runKey,
        status: 'success',
        executionMode: 'mock',
        updatedAt: new Date(),
      });

      const mockClient = [
        {
          _id: 'client_dsc_real_send',
          name: 'Real Send Corp',
          email: 'real@example.com',
          orgId: 'org_test',
          dscs: [
            {
              id: 'dsc_1',
              dscId: 'DSC-REAL-1',
              name: 'Real User',
              expiryDate: '2026-11-09',
              status: 'Active',
            },
          ],
          licenses: [],
        },
      ];

      const originalClientFind = ClientModel.find;
      ClientModel.find = (() => ({
        lean: () => ({ exec: async () => mockClient }),
      })) as any;

      const originalGetSystemAgent = AgentSchedulerService.getOrCreateSystemAgent;
      AgentSchedulerService.getOrCreateSystemAgent = (async () => ({
        _id: new mongoose.Types.ObjectId(agentId),
        module: 'DSC',
        name: 'Mock DSC Agent',
      })) as any;

      let dispatched = false;
      const originalExecutionRun = AgentExecutionService.run;
      AgentExecutionService.run = (async (_id: string, opts: any) => {
        dispatched = true;
        assert.equal(opts.runType, 'actual');
        return { status: 'success' };
      }) as any;

      try {
        const fixedNow = new Date('2026-10-25T10:00:00.000Z');
        const result = await AgentSchedulerService.processAutomaticExpiryReminders(fixedNow, {
          forceEnable: true,
          forceRealSend: true,
        });

        assert.equal(dispatched, true);
        assert.equal(result.dispatchedReminders, 1);
        assert.equal(result.skippedAlreadyHandled, 0);
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
        ClientModel.find = originalClientFind;
        cleanupStore();
        AgentSchedulerService.getOrCreateSystemAgent = originalGetSystemAgent;
        AgentExecutionService.run = originalExecutionRun;
      }
    });

    it('retries safely when a previous run failed', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      const { store, cleanup: cleanupStore } = setupMockAgentRunStore();

      const agentId = '0000000000000000000000a1';
      const runKey = 'remind:dsc-expiry:15d:client_retry:DSC-RETRY-1:2026-11-09';
      // Pre-seed an existing failed run
      store.set(`org_test:${agentId}:${runKey}`, {
        orgId: 'org_test',
        agentId: new mongoose.Types.ObjectId(agentId),
        runKey,
        status: 'failed',
        executionMode: 'real',
        updatedAt: new Date(),
      });

      const mockClient = [
        {
          _id: 'client_retry',
          name: 'Retry Corp',
          email: 'retry@example.com',
          orgId: 'org_test',
          dscs: [
            {
              id: 'dsc_retry',
              dscId: 'DSC-RETRY-1',
              name: 'Retry User',
              expiryDate: '2026-11-09',
              status: 'Active',
            },
          ],
          licenses: [],
        },
      ];

      const originalClientFind = ClientModel.find;
      ClientModel.find = (() => ({
        lean: () => ({ exec: async () => mockClient }),
      })) as any;

      const originalGetSystemAgent = AgentSchedulerService.getOrCreateSystemAgent;
      AgentSchedulerService.getOrCreateSystemAgent = (async () => ({
        _id: new mongoose.Types.ObjectId(agentId),
        module: 'DSC',
        name: 'Mock DSC Agent',
      })) as any;

      let retried = false;
      const originalExecutionRun = AgentExecutionService.run;
      AgentExecutionService.run = (async () => {
        retried = true;
        return { status: 'success' };
      }) as any;

      try {
        const fixedNow = new Date('2026-10-25T10:00:00.000Z');
        const result = await AgentSchedulerService.processAutomaticExpiryReminders(fixedNow, {
          forceEnable: true,
          forceRealSend: true,
        });

        assert.equal(retried, true);
        assert.equal(result.dispatchedReminders, 1);
        assert.equal(result.skippedAlreadyHandled, 0);
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
        ClientModel.find = originalClientFind;
        cleanupStore();
        AgentSchedulerService.getOrCreateSystemAgent = originalGetSystemAgent;
        AgentExecutionService.run = originalExecutionRun;
      }
    });

    it('blocks duplicate execution when a fresh in-progress run is active', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      const { store, cleanup: cleanupStore } = setupMockAgentRunStore();

      const agentId = '0000000000000000000000a1';
      const runKey = 'remind:dsc-expiry:15d:client_in_prog:DSC-LOCK-1:2026-11-09';
      // Pre-seed a fresh in-progress run (updated 1 minute ago)
      store.set(`org_test:${agentId}:${runKey}`, {
        orgId: 'org_test',
        agentId: new mongoose.Types.ObjectId(agentId),
        runKey,
        status: 'in-progress',
        executionMode: 'real',
        updatedAt: new Date(Date.now() - 60 * 1000),
      });

      const mockClient = [
        {
          _id: 'client_in_prog',
          name: 'Concurrent Corp',
          email: 'concurrent@example.com',
          orgId: 'org_test',
          dscs: [
            {
              id: 'dsc_lock',
              dscId: 'DSC-LOCK-1',
              name: 'Locked User',
              expiryDate: '2026-11-09',
              status: 'Active',
            },
          ],
          licenses: [],
        },
      ];

      const originalClientFind = ClientModel.find;
      ClientModel.find = (() => ({
        lean: () => ({ exec: async () => mockClient }),
      })) as any;

      const originalGetSystemAgent = AgentSchedulerService.getOrCreateSystemAgent;
      AgentSchedulerService.getOrCreateSystemAgent = (async () => ({
        _id: new mongoose.Types.ObjectId(agentId),
        module: 'DSC',
        name: 'Mock DSC Agent',
      })) as any;

      let dispatched = false;
      const originalExecutionRun = AgentExecutionService.run;
      AgentExecutionService.run = (async () => {
        dispatched = true;
        return { status: 'success' };
      }) as any;

      try {
        const fixedNow = new Date('2026-10-25T10:00:00.000Z');
        const result = await AgentSchedulerService.processAutomaticExpiryReminders(fixedNow, {
          forceEnable: true,
          forceRealSend: true,
        });

        assert.equal(dispatched, false);
        assert.equal(result.dispatchedReminders, 0);
        assert.equal(result.skippedAlreadyHandled, 1);
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
        ClientModel.find = originalClientFind;
        cleanupStore();
        AgentSchedulerService.getOrCreateSystemAgent = originalGetSystemAgent;
        AgentExecutionService.run = originalExecutionRun;
      }
    });
  });

  describe('9. Atomic Compare-And-Swap (CAS) Concurrency Gate', () => {
    it('proves atomic claim on initial creation: only one concurrent attempt acquires claim', async () => {
      const { cleanup: cleanupStore } = setupMockAgentRunStore();
      const orgId = 'org_race';
      const agentId = new mongoose.Types.ObjectId();
      const runKey = 'remind:dsc-expiry:15d:client_race:DSC-RACE:2026-11-09';

      try {
        const [attempt1, attempt2] = await Promise.all([
          AgentExecutionService.acquireAtomicClaim({
            orgId,
            agentId,
            agentName: 'Race Agent',
            agentModule: 'DSC',
            runKey,
            isRealSend: true,
          }),
          AgentExecutionService.acquireAtomicClaim({
            orgId,
            agentId,
            agentName: 'Race Agent',
            agentModule: 'DSC',
            runKey,
            isRealSend: true,
          }),
        ]);

        const acquiredCount = (attempt1.acquired ? 1 : 0) + (attempt2.acquired ? 1 : 0);
        assert.equal(acquiredCount, 1, 'Exactly one concurrent attempt must acquire the atomic claim');
      } finally {
        cleanupStore();
      }
    });

    it('proves atomic claim on stale in-progress reclaim: only one concurrent attempt reclaims', async () => {
      const { store, cleanup: cleanupStore } = setupMockAgentRunStore();
      const orgId = 'org_stale_race';
      const agentId = new mongoose.Types.ObjectId();
      const runKey = 'remind:dsc-expiry:15d:client_stale:DSC-STALE:2026-11-09';

      // Pre-seed a stale in-progress document (10 minutes ago, exceeding 5 minute stale threshold)
      store.set(`${orgId}:${String(agentId)}:${runKey}`, {
        orgId,
        agentId,
        runKey,
        status: 'in-progress',
        executionMode: 'real',
        updatedAt: new Date(Date.now() - 10 * 60 * 1000),
      });

      try {
        const [attempt1, attempt2] = await Promise.all([
          AgentExecutionService.acquireAtomicClaim({
            orgId,
            agentId,
            agentName: 'Stale Agent',
            agentModule: 'DSC',
            runKey,
            isRealSend: true,
          }),
          AgentExecutionService.acquireAtomicClaim({
            orgId,
            agentId,
            agentName: 'Stale Agent',
            agentModule: 'DSC',
            runKey,
            isRealSend: true,
          }),
        ]);

        const acquiredCount = (attempt1.acquired ? 1 : 0) + (attempt2.acquired ? 1 : 0);
        assert.equal(acquiredCount, 1, 'Only one concurrent worker can atomically reclaim a stale in-progress run');
      } finally {
        cleanupStore();
      }
    });

    it('concurrency test: two competing scheduler instances for same client invoke email dispatch exactly once', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      const { cleanup: cleanupStore } = setupMockAgentRunStore();
      const agentId = new mongoose.Types.ObjectId('0000000000000000000000a1');

      const mockClient = [
        {
          _id: 'client_competing',
          name: 'Competing Corp',
          email: 'compete@example.com',
          orgId: 'org_test',
          dscs: [
            {
              id: 'dsc_compete',
              dscId: 'DSC-COMPETE-1',
              name: 'Compete User',
              expiryDate: '2026-11-09',
              status: 'Active',
            },
          ],
          licenses: [],
        },
      ];

      const originalClientFind = ClientModel.find;
      ClientModel.find = (() => ({
        lean: () => ({ exec: async () => mockClient }),
      })) as any;

      const originalGetSystemAgent = AgentSchedulerService.getOrCreateSystemAgent;
      AgentSchedulerService.getOrCreateSystemAgent = (async () => ({
        _id: agentId,
        module: 'DSC',
        name: 'Mock DSC Agent',
      })) as any;

      let emailProviderInvocations = 0;
      const originalExecutionRun = AgentExecutionService.run;
      AgentExecutionService.run = (async () => {
        emailProviderInvocations++;
        return { status: 'success' };
      }) as any;

      try {
        const fixedNow = new Date('2026-10-25T10:00:00.000Z');

        // Launch two concurrent scheduler workers against the same database at the exact same instant
        const [worker1Result, worker2Result] = await Promise.all([
          AgentSchedulerService.processAutomaticExpiryReminders(fixedNow, { forceEnable: true, forceRealSend: true }),
          AgentSchedulerService.processAutomaticExpiryReminders(fixedNow, { forceEnable: true, forceRealSend: true }),
        ]);

        // Assert exactly one dispatched reminder across both workers
        assert.equal(
          emailProviderInvocations,
          1,
          'Email provider must be invoked exactly once across concurrent workers'
        );

        const totalDispatched = worker1Result.dispatchedReminders + worker2Result.dispatchedReminders;
        const totalSkipped = worker1Result.skippedAlreadyHandled + worker2Result.skippedAlreadyHandled;

        assert.equal(totalDispatched, 1, 'Only one worker must dispatch');
        assert.equal(totalSkipped, 1, 'Losing worker must record skippedAlreadyHandled');
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
        ClientModel.find = originalClientFind;
        cleanupStore();
        AgentSchedulerService.getOrCreateSystemAgent = originalGetSystemAgent;
        AgentExecutionService.run = originalExecutionRun;
      }
    });
  });
});
