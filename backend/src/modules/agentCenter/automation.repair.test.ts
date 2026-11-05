import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import mongoose from 'mongoose';
import {
  AgentSchedulerService,
  resolveExpiryMilestone,
  isAutomaticExpiryRemindersEnabled,
  isAutomaticRemindersRealSendEnabled,
} from './scheduler.service';
import { Agent } from './agent.model';
import { SchedulerLock } from './schedulerLock.model';
import { ClientService } from '../client/client.service';
import { Client } from '../client/client.model';
import { AgentExecutionService, executeProvider, resolveRecipientWithFallback } from './execution.service';
import { WhatsAppService } from '../../shared/utils/whatsAppService';
import { parseExpiryMilestones } from '../../config/env';
import { AgentRun } from './agentRun.model';

describe('Agent Center Automation Audit & Repair Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. System Agent Isolation & Anti-Hijacking', () => {
    it('strictly queries dedicated system agent and never selects user-created published agents', async () => {
      // Simulate existing user published agent for DSC
      const userAgent = {
        _id: '507f191e810c4f7290349999',
        name: 'Notify Partner on High Value DSC',
        module: 'DSC',
        status: 'published',
        isSystem: false,
        config: { trigger: 'DSC Created', recipient: ['Task owner'] },
      };

      const findOneCalls: any[] = [];
      let createdDoc: any = null;

      // Mock Agent.findOne
      const origFindOne = Agent.findOne;
      Agent.findOne = ((query: any) => {
        findOneCalls.push(query);
        return {
          exec: async () => null, // No system agent exists yet
        } as any;
      }) as any;

      // Mock Agent.create
      const origCreate = Agent.create;
      Agent.create = (async (doc: any) => {
        createdDoc = doc;
        return {
          _id: '507f191e810c4f7290341111',
          ...doc,
          save: async () => doc,
        } as any;
      }) as any;

      try {
        const agent = await AgentSchedulerService.getOrCreateSystemAgent('org_acme', 'DSC');

        // Verify first query strictly looks for isSystem: true and systemKey
        assert.ok(findOneCalls.length > 0, 'Agent.findOne should have been called');
        const primarySystemQuery = findOneCalls[0];
        assert.equal(primarySystemQuery.orgId, 'org_acme');
        assert.equal(primarySystemQuery.isSystem, true);
        assert.equal(primarySystemQuery.systemKey, 'system:dsc:expiry-reminder');

        // Verify user agent with name "Notify Partner on High Value DSC" is NEVER queried
        assert.ok(!findOneCalls.some((q) => q.name === userAgent.name));

        // Verify created document has system tags
        assert.ok(createdDoc, 'New system agent should be created');
        assert.equal(createdDoc.isSystem, true);
        assert.equal(createdDoc.systemKey, 'system:dsc:expiry-reminder');
        assert.equal(createdDoc.name, 'Automatic DSC Expiry Reminders');
        assert.equal(agent.isSystem, true);
      } finally {
        Agent.findOne = origFindOne;
        Agent.create = origCreate;
      }
    });

    it('returns existing system agent when already created without touching user agents', async () => {
      const existingSystemAgent = {
        _id: '507f191e810c4f7290348888',
        name: 'Automatic License Expiry Reminders',
        module: 'License',
        status: 'published',
        isSystem: true,
        systemKey: 'system:license:expiry-reminder',
      };

      const origFindOne = Agent.findOne;
      Agent.findOne = ((query: any) => ({
        exec: async () => {
          if (query.isSystem && query.systemKey === 'system:license:expiry-reminder') {
            return existingSystemAgent;
          }
          return null;
        },
      })) as any;

      try {
        const agent = await AgentSchedulerService.getOrCreateSystemAgent('org_acme', 'License');
        assert.equal(agent._id, existingSystemAgent._id);
        assert.equal(agent.isSystem, true);
        assert.equal(agent.systemKey, 'system:license:expiry-reminder');
      } finally {
        Agent.findOne = origFindOne;
      }
    });
  });

  describe('2. Configurable Expiry Milestones Engine', () => {
    it('supports custom multi-milestone arrays [30, 15, 10, 7]', () => {
      const customMilestones = [30, 15, 10, 7];

      // 30-day window: 16 to 30 days
      assert.equal(resolveExpiryMilestone(30, customMilestones), '30d');
      assert.equal(resolveExpiryMilestone(25, customMilestones), '30d');
      assert.equal(resolveExpiryMilestone(16, customMilestones), '30d');

      // 15-day window: 11 to 15 days
      assert.equal(resolveExpiryMilestone(15, customMilestones), '15d');
      assert.equal(resolveExpiryMilestone(12, customMilestones), '15d');
      assert.equal(resolveExpiryMilestone(11, customMilestones), '15d');

      // 10-day window: 8 to 10 days
      assert.equal(resolveExpiryMilestone(10, customMilestones), '10d');
      assert.equal(resolveExpiryMilestone(9, customMilestones), '10d');
      assert.equal(resolveExpiryMilestone(8, customMilestones), '10d');

      // 7-day window: 0 to 7 days
      assert.equal(resolveExpiryMilestone(7, customMilestones), '7d');
      assert.equal(resolveExpiryMilestone(4, customMilestones), '7d');
      assert.equal(resolveExpiryMilestone(0, customMilestones), '7d');

      // Out of bounds
      assert.equal(resolveExpiryMilestone(35, customMilestones), null);
      assert.equal(resolveExpiryMilestone(-1, customMilestones), null);
    });

    it('defaults to standard 15d and 10d windows when milestones not specified', () => {
      // 15d milestone: 11 to 15 calendar days
      assert.equal(resolveExpiryMilestone(15), '15d');
      assert.equal(resolveExpiryMilestone(14), '15d');
      assert.equal(resolveExpiryMilestone(11), '15d');

      // 10d milestone: 0 to 10 calendar days
      assert.equal(resolveExpiryMilestone(10), '10d');
      assert.equal(resolveExpiryMilestone(5), '10d');
      assert.equal(resolveExpiryMilestone(0), '10d');

      // Beyond 15 days or expired
      assert.equal(resolveExpiryMilestone(16), null);
      assert.equal(resolveExpiryMilestone(30), null);
      assert.equal(resolveExpiryMilestone(-2), null);
    });
  });

  describe('3. Production Environment Defaults & Safety', () => {
    it('defaults automatic reminders to true in production mode unless explicitly disabled', () => {
      delete process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED;
      process.env.NODE_ENV = 'production';
      assert.equal(isAutomaticExpiryRemindersEnabled(), true);

      process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = 'false';
      assert.equal(isAutomaticExpiryRemindersEnabled(), false);

      process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED = 'true';
      assert.equal(isAutomaticExpiryRemindersEnabled(), true);
    });

    it('defaults real send to false in development/test unless explicitly enabled', () => {
      delete process.env.AUTOMATIC_REMINDERS_REAL_SEND;
      process.env.NODE_ENV = 'development';
      assert.equal(isAutomaticRemindersRealSendEnabled(), false);

      process.env.AUTOMATIC_REMINDERS_REAL_SEND = 'true';
      assert.equal(isAutomaticRemindersRealSendEnabled(), true);
    });
  });

  describe('4. Distributed Single-Owner Leader Lock', () => {
    it('allows only one instance to acquire the lease and blocks competing instances', async () => {
      let currentLockDoc: any = null;

      const origReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      const origFindOneAndUpdate = SchedulerLock.findOneAndUpdate;
      SchedulerLock.findOneAndUpdate = ((filter: any, update: any) => {
        const now = new Date();
        const instanceId = update.$set.instanceId;
        const leaseExpiresAt = update.$set.leaseExpiresAt;

        if (!currentLockDoc || currentLockDoc.leaseExpiresAt < now || currentLockDoc.instanceId === instanceId) {
          currentLockDoc = {
            _id: 'agent-center-scheduler-leader',
            instanceId,
            leaseExpiresAt,
            updatedAt: now,
          };
          return { exec: async () => currentLockDoc } as any;
        }

        // Another instance holds the valid lease
        return { exec: async () => null } as any;
      }) as any;

      try {
        // Instance 1 acquires
        const acquired = await AgentSchedulerService.acquireLeaderLock(30000);
        assert.equal(acquired, true);

        // Instance 2 tries to acquire while lease is active
        const origInstanceId = (AgentSchedulerService as any).instanceId;
        (AgentSchedulerService as any).instanceId = 'competing-worker-uuid-2';

        const competingAcquired = await AgentSchedulerService.acquireLeaderLock(30000);
        assert.equal(competingAcquired, false, 'Competing instance must not acquire active lease');

        // Restore instanceId
        (AgentSchedulerService as any).instanceId = origInstanceId;
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
        SchedulerLock.findOneAndUpdate = origFindOneAndUpdate;
      }
    });
  });

  describe('5. DSC & License Lifecycle Hook Event Dispatching', () => {
    it('dispatches DSC Renewed when expiry date or status is updated in ClientService.updateDsc', async () => {
      let dispatchedEvent: { orgId: string; trigger: string; dsc: any } | null = null;

      const origDispatch = AgentExecutionService.dispatchDscEvent;
      AgentExecutionService.dispatchDscEvent = (async (orgId: string, trigger: string, payload: any) => {
        dispatchedEvent = { orgId, trigger, dsc: payload.dsc };
        return [];
      }) as any;

      const mockClient: any = {
        _id: '507f191e810c4f7290342222',
        orgId: 'org_test_ca',
        name: 'Alpha Traders LLP',
        dscs: [
          {
            id: 'dsc_101',
            dscId: '#S00101',
            name: 'Director DSC',
            expiryDate: '2026-03-01',
            status: 'Active',
          },
        ],
        markModified: () => {},
        save: async function () { return this; },
      };

      const origFindById = Client.findById;
      Client.findById = (() => Promise.resolve(mockClient)) as any;

      try {
        await ClientService.updateDsc('507f191e810c4f7290342222', 'dsc_101', {
          expiryDate: '2028-03-01', // Renewed expiry date
          status: 'Active',
        });

        assert.ok(dispatchedEvent, 'AgentExecutionService.dispatchDscEvent should have been called');
        assert.equal(dispatchedEvent.trigger, 'DSC Renewed');
        assert.equal(dispatchedEvent.orgId, 'org_test_ca');
        assert.equal(dispatchedEvent.dsc.expiryDate, '2028-03-01');
      } finally {
        AgentExecutionService.dispatchDscEvent = origDispatch;
        Client.findById = origFindById;
      }
    });

    it('dispatches License Renewed when expiry date or status is updated in ClientService.updateLicense', async () => {
      let dispatchedEvent: { orgId: string; trigger: string; license: any } | null = null;

      const origDispatch = AgentExecutionService.dispatchLicenseEvent;
      AgentExecutionService.dispatchLicenseEvent = (async (orgId: string, trigger: string, payload: any) => {
        dispatchedEvent = { orgId, trigger, license: payload.license };
        return [];
      }) as any;

      const mockClient: any = {
        _id: '507f191e810c4f7290343333',
        orgId: 'org_test_ca',
        name: 'Beta Global Inc',
        licenses: [
          {
            id: 'lic_201',
            licenseNo: 'FSSAI-999',
            name: 'Food Safety License',
            expiryDate: '2026-04-15',
            status: 'Active',
          },
        ],
        markModified: () => {},
        save: async function () { return this; },
      };

      const origFindById = Client.findById;
      Client.findById = (() => Promise.resolve(mockClient)) as any;

      try {
        await ClientService.updateLicense('507f191e810c4f7290343333', 'lic_201', {
          expiryDate: '2029-04-15', // Renewed expiry date
        });

        assert.ok(dispatchedEvent, 'AgentExecutionService.dispatchLicenseEvent should have been called');
        assert.equal(dispatchedEvent.trigger, 'License Renewed');
        assert.equal(dispatchedEvent.orgId, 'org_test_ca');
        assert.equal(dispatchedEvent.license.expiryDate, '2029-04-15');
      } finally {
        AgentExecutionService.dispatchLicenseEvent = origDispatch;
        Client.findById = origFindById;
      }
    });
  });

  describe('6. WhatsApp & Email Provider Live Send Realism', () => {
    it('honestly records failure when WhatsApp credentials are missing in real send mode', async () => {
      delete process.env.WHATSAPP_API_TOKEN;
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;

      const result = await executeProvider('WhatsApp', {
        recipient: '+919876543210',
        recipientLabel: 'Director',
        message: 'Reminder: Your license is expiring.',
        subject: '',
        previewOnly: false,
        simulateFailure: false,
      });

      assert.equal(result.mode, 'real');
      assert.equal(result.status, 'failed');
      assert.equal(result.simulated, false);
      assert.ok(result.error?.includes('WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID required'));
    });

    it('WhatsAppService.sendMessage returns failed status when unconfigured without crashing', async () => {
      delete process.env.WHATSAPP_API_TOKEN;
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;

      const res = await WhatsAppService.sendMessage({
        to: '+91 98765 43210',
        message: 'Test message',
      });

      assert.equal(res.success, false);
      assert.equal(res.status, 'failed');
      assert.ok(res.error?.includes('WHATSAPP_API_TOKEN'));
    });
  });

  describe('7. DSC & License Client Recipient Resolution & Tenant Safety', () => {
    it('resolves real DB email and marks isRealEmail: true when valid', () => {
      const res = resolveRecipientWithFallback(
        'Client',
        { id: 'c1', name: 'Tata Motors', email: 'director@tatamotors.com', mobile: '+919876543210' },
        true
      );
      assert.equal(res.name, 'Tata Motors');
      assert.equal(res.email, 'director@tatamotors.com');
      assert.equal(res.isRealEmail, true);
    });

    it('suppresses demo email and sets empty string when fallbackToDemo is false in live send mode', () => {
      const res = resolveRecipientWithFallback(
        'Client',
        { id: 'c2', name: 'No Email Corp', email: '', mobile: '+919876543210' },
        false
      );
      assert.equal(res.name, 'No Email Corp');
      assert.equal(res.email, '');
      assert.equal(res.isRealEmail, false);
    });
  });

  describe('8. Configurable Milestones Environment Parser', () => {
    it('parses descending deduplicated positive integers from AUTOMATIC_EXPIRY_MILESTONES', () => {
      const milestones = parseExpiryMilestones('30, 15, 10, 7, 15, 30');
      assert.deepEqual(milestones, [30, 15, 10, 7]);
    });

    it('gracefully falls back to [15, 10] on invalid input or empty string', () => {
      assert.deepEqual(parseExpiryMilestones(''), [15, 10]);
      assert.deepEqual(parseExpiryMilestones('invalid, -5, 0'), [15, 10]);
    });
  });

  describe('9. DSC & License Deletion Event Hooks', () => {
    it('dispatches DSC Deleted trigger with deterministic key on deleteDsc', async () => {
      let dispatchedEvent: any = null;
      const origDispatch = AgentExecutionService.dispatchDscEvent;
      AgentExecutionService.dispatchDscEvent = (async (orgId: string, trigger: string, payload: any, eventId: string) => {
        dispatchedEvent = { orgId, trigger, payload, eventId };
        return [];
      }) as any;

      const mockClient = {
        _id: '507f191e810c4f7290344444',
        name: 'Infosys Ltd',
        orgId: 'org_test_ca',
        email: 'compliance@infosys.com',
        dscs: [
          {
            id: 'dsc_del_1',
            dscId: 'DSC-1099',
            name: 'Salil Parekh',
            expiryDate: '2026-12-31',
            status: 'Active',
          },
        ],
        markModified: () => {},
        save: async function () { return this; },
      };

      const origFindById = Client.findById;
      Client.findById = (() => Promise.resolve(mockClient)) as any;

      try {
        await ClientService.deleteDsc('507f191e810c4f7290344444', 'dsc_del_1');

        assert.ok(dispatchedEvent, 'AgentExecutionService.dispatchDscEvent should have been called');
        assert.equal(dispatchedEvent.trigger, 'DSC Deleted');
        assert.equal(dispatchedEvent.orgId, 'org_test_ca');
        assert.equal(dispatchedEvent.payload.dsc.id, 'dsc_del_1');
        assert.equal(dispatchedEvent.eventId, 'dsc-deleted:507f191e810c4f7290344444:dsc_del_1');
      } finally {
        AgentExecutionService.dispatchDscEvent = origDispatch;
        Client.findById = origFindById;
      }
    });

    it('dispatches License Deleted trigger with deterministic key on deleteLicense', async () => {
      let dispatchedEvent: any = null;
      const origDispatch = AgentExecutionService.dispatchLicenseEvent;
      AgentExecutionService.dispatchLicenseEvent = (async (orgId: string, trigger: string, payload: any, eventId: string) => {
        dispatchedEvent = { orgId, trigger, payload, eventId };
        return [];
      }) as any;

      const mockClient = {
        _id: '507f191e810c4f7290345555',
        name: 'Wipro Ltd',
        orgId: 'org_test_ca',
        email: 'legal@wipro.com',
        licenses: [
          {
            id: 'lic_del_1',
            licenseNo: 'LIC-7788',
            name: 'Trade License',
            expiryDate: '2026-08-31',
            status: 'Active',
          },
        ],
        markModified: () => {},
        save: async function () { return this; },
      };

      const origFindById = Client.findById;
      Client.findById = (() => Promise.resolve(mockClient)) as any;

      try {
        await ClientService.deleteLicense('507f191e810c4f7290345555', 'lic_del_1');

        assert.ok(dispatchedEvent, 'AgentExecutionService.dispatchLicenseEvent should have been called');
        assert.equal(dispatchedEvent.trigger, 'License Deleted');
        assert.equal(dispatchedEvent.orgId, 'org_test_ca');
        assert.equal(dispatchedEvent.payload.license.id, 'lic_del_1');
        assert.equal(dispatchedEvent.eventId, 'lic-deleted:507f191e810c4f7290345555:lic_del_1');
      } finally {
        AgentExecutionService.dispatchLicenseEvent = origDispatch;
        Client.findById = origFindById;
      }
    });
  });

  describe('10. WhatsApp Webhook Delivery Status Updates', () => {
    it('updates AgentRun status to delivered on webhook status callback', async () => {
      const mockRun = {
        _id: 'run_123',
        status: 'success',
        result: {
          results: [
            {
              recipient: 'Director',
              status: 'accepted',
              executionId: 'wamid.HBgLMTEyMjMz',
            },
          ],
        },
        markModified: () => {},
        save: async function () { return this; },
      };

      const origFindOne = AgentRun.findOne;
      AgentRun.findOne = (() => ({
        exec: async () => mockRun,
      })) as any;

      try {
        const updated = await AgentExecutionService.updateWhatsAppDeliveryStatus('wamid.HBgLMTEyMjMz', 'delivered');
        assert.equal(updated, true);
        assert.equal(mockRun.result.results[0].status, 'delivered');
      } finally {
        AgentRun.findOne = origFindOne;
      }
    });

    it('updates AgentRun status to failed on webhook failure callback', async () => {
      const mockRun = {
        _id: 'run_124',
        status: 'success',
        result: {
          results: [
            {
              recipient: 'Director',
              status: 'accepted',
              executionId: 'wamid.HBgLMTEyMjM0',
            },
          ],
        },
        markModified: () => {},
        save: async function () { return this; },
      };

      const origFindOne = AgentRun.findOne;
      AgentRun.findOne = (() => ({
        exec: async () => mockRun,
      })) as any;

      try {
        const updated = await AgentExecutionService.updateWhatsAppDeliveryStatus(
          'wamid.HBgLMTEyMjM0',
          'failed',
          [{ message: '131026: Message undeliverable' }]
        );
        assert.equal(updated, true);
        assert.equal(mockRun.result.results[0].status, 'failed');
        assert.equal(mockRun.status, 'failed');
      } finally {
        AgentRun.findOne = origFindOne;
      }
    });
  });

  describe('11. Scheduler Leader Heartbeat & Shutdown Cleanup', () => {
    it('stop clears both timer and initialTimer gracefully', () => {
      const origDelete = SchedulerLock.deleteOne;
      SchedulerLock.deleteOne = (() => ({ exec: async () => ({}) })) as any;

      try {
        AgentSchedulerService.start(60000);
        assert.equal(AgentSchedulerService.isSchedulerActive(), true);
        AgentSchedulerService.stop();
        assert.equal(AgentSchedulerService.isSchedulerActive(), false);
      } finally {
        SchedulerLock.deleteOne = origDelete;
      }
    });
  });
});
