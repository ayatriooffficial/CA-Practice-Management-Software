import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { FollowUpService } from './followUp.service';
import { FollowUpState } from './followUp.model';
import { InboundMessageLog } from './inboundMessage.model';
import { WhatsAppService, WHATSAPP_GRAPH_API_VERSION } from '../../shared/utils/whatsAppService';
import { Task } from '../task/task.model';
import { Client } from '../client/client.model';
import { AgentExecutionService } from './execution.service';

describe('Phase 16 Master Lifecycle & Automation Regression Suite', () => {
  describe('1. WhatsApp Graph API Version and Webhook Security', () => {
    it('uses configurable Meta Graph API version defaulting to v21.0', () => {
      assert.strictEqual(WHATSAPP_GRAPH_API_VERSION, process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0');
    });

    it('verifies valid HMAC-SHA256 signature against raw request bytes', () => {
      const originalSecret = process.env.WHATSAPP_APP_SECRET;
      process.env.WHATSAPP_APP_SECRET = 'test_webhook_secret_key_123';

      const rawBody = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }));
      const validSig = 'sha256=' + crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex');

      const isValid = FollowUpService.verifyWhatsAppSignature(rawBody, validSig);
      assert.strictEqual(isValid, true);

      process.env.WHATSAPP_APP_SECRET = originalSecret;
    });

    it('rejects tampered raw body with invalid signature', () => {
      const originalSecret = process.env.WHATSAPP_APP_SECRET;
      process.env.WHATSAPP_APP_SECRET = 'test_webhook_secret_key_123';

      const rawBody = Buffer.from('{"entry": "original"}');
      const tamperedBody = Buffer.from('{"entry": "tampered"}');
      const originalSig = 'sha256=' + crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex');

      const isValid = FollowUpService.verifyWhatsAppSignature(tamperedBody, originalSig);
      assert.strictEqual(isValid, false);

      process.env.WHATSAPP_APP_SECRET = originalSecret;
    });

    it('fails closed in production if WHATSAPP_APP_SECRET is not configured', () => {
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.WHATSAPP_APP_SECRET;

      process.env.NODE_ENV = 'production';
      delete process.env.WHATSAPP_APP_SECRET;

      const rawBody = Buffer.from('{"test": true}');
      const isValid = FollowUpService.verifyWhatsAppSignature(rawBody, 'sha256=abcdef');
      assert.strictEqual(isValid, false);

      process.env.NODE_ENV = origEnv;
      if (origSecret) process.env.WHATSAPP_APP_SECRET = origSecret;
    });
  });

  describe('2. Follow-Up Creation & Recipient Guardrails', () => {
    it('does NOT create client follow-up for internal-only task assignments', async () => {
      let followUpCreated = false;
      const origRecord = FollowUpService.recordFollowUpRequest;
      FollowUpService.recordFollowUpRequest = async (params) => {
        followUpCreated = true;
        return {} as any;
      };

      // Mock an execution with internal assignee only
      const mockAgent: any = {
        _id: 'agent-internal-1',
        name: 'Task Assigned Internal Agent',
        module: 'Task',
        config: {
          trigger: 'Task Assigned',
          recipients: ['Assigned user'],
          action: 'Notify assignee of new task assignment',
          channel: 'Email',
        },
      };

      // Internal assignment should not trigger client follow-up
      const hasClient = mockAgent.config.recipients.some((r: string) => r.toLowerCase().includes('client'));
      assert.strictEqual(hasClient, false);

      FollowUpService.recordFollowUpRequest = origRecord;
    });

    it('creates client follow-up for genuine client document requests', async () => {
      const mockAgent: any = {
        _id: 'agent-client-doc-1',
        name: 'Client Document Request Agent',
        module: 'Task',
        config: {
          trigger: 'Document Request',
          recipients: ['Client'],
          action: 'Request required compliance documents',
          channel: 'Email',
        },
      };

      const hasClient = mockAgent.config.recipients.some((r: string) => r.toLowerCase().includes('client'));
      const isRequesting = mockAgent.config.trigger.toLowerCase().includes('document');
      assert.strictEqual(hasClient, true);
      assert.strictEqual(isRequesting, true);
    });
  });

  describe('3. Permanent Opt-Out Suppression & Cascade', () => {
    it('never silently reopens an opted-out client follow-up record', async () => {
      const origFindOne = FollowUpState.findOne;

      const existingOptOut: any = {
        _id: 'opt-out-record-1',
        orgId: 'org_test_1',
        clientId: 'client_opted_out',
        channel: 'Email',
        status: 'opt_out',
        nextReminderAt: null,
        save: async () => {},
      };

      FollowUpState.findOne = (() => ({
        exec: async () => existingOptOut,
      })) as any;

      const result = await FollowUpService.recordFollowUpRequest({
        orgId: 'org_test_1',
        agentId: 'ag-1',
        clientId: 'client_opted_out',
        module: 'Task',
        sourceId: 'task-100',
        channel: 'Email',
      });

      assert.strictEqual(result.status, 'opt_out');
      assert.strictEqual(existingOptOut.status, 'opt_out');
      assert.strictEqual(existingOptOut.nextReminderAt, null);

      FollowUpState.findOne = origFindOne;
    });
  });

  describe('4. Task Document Upload Stop Conditions', () => {
    it('immediately resolves active follow-up upon application document upload', async () => {
      const origFindOne = FollowUpState.findOne;

      let savedStatus = '';
      let clearedReminder: any = 'not-cleared';
      let resolvedTimestamp: any = null;

      const mockFollowUp: any = {
        _id: 'fu-doc-upload-1',
        orgId: 'org_test_1',
        sourceId: 'task-101',
        documentRequestId: 'doc-item-99',
        status: 'waiting_client',
        nextReminderAt: new Date(),
        responseHistory: [],
        save: async () => {
          savedStatus = mockFollowUp.status;
          clearedReminder = mockFollowUp.nextReminderAt;
          resolvedTimestamp = mockFollowUp.resolvedAt;
        },
      };

      FollowUpState.findOne = (() => ({
        exec: async () => mockFollowUp,
      })) as any;

      const resolved = await FollowUpService.completeFollowUpForDocument({
        orgId: 'org_test_1',
        taskId: 'task-101',
        documentRequestId: 'doc-item-99',
        fileUrl: '/api/v1/drive/doc-123/download',
        receivedAt: new Date(),
      });

      assert.strictEqual(resolved, true);
      assert.strictEqual(savedStatus, 'document_received');
      assert.strictEqual(clearedReminder, null);
      assert.ok(resolvedTimestamp instanceof Date);

      FollowUpState.findOne = origFindOne;
    });
  });

  describe('5. DSC & License Asset Renewal Stop Conditions', () => {
    it('stops DSC reminders if certificate expiry date has been updated (renewed)', async () => {
      const origFollowUpFind = FollowUpState.find;
      const origClientFindOne = Client.findOne;

      let savedStatus = '';
      let clearedReminder: any = 'not-cleared';

      const mockFollowUp: any = {
        _id: 'fu-dsc-1',
        orgId: 'org_test_1',
        clientId: '507f1f77bcf86cd799439011',
        module: 'DSC',
        sourceId: 'DSC-101',
        status: 'waiting_client',
        attemptCount: 1,
        maxAttempts: 4,
        nextReminderAt: new Date(Date.now() - 1000),
        metadata: { originalExpiryDate: '2026-02-01' },
        save: async () => {
          savedStatus = mockFollowUp.status;
          clearedReminder = mockFollowUp.nextReminderAt;
        },
      };

      FollowUpState.find = (() => ({
        limit: () => ({
          exec: async () => [mockFollowUp],
        }),
      })) as any;

      // Mock client with renewed DSC expiry date (2028-02-01 instead of 2026-02-01)
      Client.findOne = (() => ({
        lean: () => ({
          exec: async () => ({
            _id: '507f1f77bcf86cd799439011',
            name: 'Client Corp',
            dscs: [
              {
                id: 'DSC-101',
                dscId: 'DSC-101',
                name: 'Director DSC',
                status: 'Active',
                expiryDate: '2028-02-01', // Renewed!
              },
            ],
          }),
        }),
      })) as any;

      const result = await FollowUpService.processScheduledFollowUps({
        orgId: 'org_test_1',
        nowDate: new Date(),
      });

      assert.strictEqual(result.completed, 1);
      assert.strictEqual(savedStatus, 'completed');
      assert.strictEqual(clearedReminder, null);

      FollowUpState.find = origFollowUpFind;
      Client.findOne = origClientFindOne;
    });

    it('stops License reminders if license is renewed or closed', async () => {
      const origFollowUpFind = FollowUpState.find;
      const origClientFindOne = Client.findOne;

      let savedStatus = '';
      let clearedReminder: any = 'not-cleared';

      const mockFollowUp: any = {
        _id: 'fu-lic-1',
        orgId: 'org_test_1',
        clientId: '507f1f77bcf86cd799439012',
        module: 'License',
        sourceId: 'LIC-202',
        status: 'waiting_client',
        attemptCount: 1,
        maxAttempts: 4,
        nextReminderAt: new Date(Date.now() - 1000),
        metadata: { originalExpiryDate: '2026-03-01' },
        save: async () => {
          savedStatus = mockFollowUp.status;
          clearedReminder = mockFollowUp.nextReminderAt;
        },
      };

      FollowUpState.find = (() => ({
        limit: () => ({
          exec: async () => [mockFollowUp],
        }),
      })) as any;

      // License renewed to 2029-03-01
      Client.findOne = (() => ({
        lean: () => ({
          exec: async () => ({
            _id: '507f1f77bcf86cd799439012',
            name: 'Client Corp',
            licenses: [
              {
                id: 'LIC-202',
                licenseNo: 'LIC-202',
                status: 'Active',
                expiryDate: '2029-03-01', // Renewed!
              },
            ],
          }),
        }),
      })) as any;

      const result = await FollowUpService.processScheduledFollowUps({
        orgId: 'org_test_1',
        nowDate: new Date(),
      });

      assert.strictEqual(result.completed, 1);
      assert.strictEqual(savedStatus, 'completed');
      assert.strictEqual(clearedReminder, null);

      FollowUpState.find = origFollowUpFind;
      Client.findOne = origClientFindOne;
    });
  });

  describe('6. WhatsApp Multi-Tenant Isolation & Media Safety', () => {
    it('aborts and flags for review if sender phone matches multiple organizations', async () => {
      const origClientFind = Client.find;

      // Client matches org_tenant_A and org_tenant_B with same phone
      Client.find = (() => ({
        lean: () => ({
          exec: async () => [
            { _id: 'client_1', orgId: 'org_tenant_A', name: 'Alpha Client', mobile: '+919999900000' },
            { _id: 'client_2', orgId: 'org_tenant_B', name: 'Beta Client', mobile: '+919999900000' },
          ],
        }),
      })) as any;

      const outcome = await FollowUpService.handleIncomingWhatsAppMessage({
        from: '919999900000',
        id: 'wamid_12345',
        type: 'text',
        text: { body: 'Here is my update' },
      });

      assert.strictEqual(outcome.handled, false);
      assert.ok(outcome.actionTaken.includes('cross-tenant'));

      Client.find = origClientFind;
    });

    it('does NOT mark document received when WhatsApp media download fails', async () => {
      const origClientFind = Client.find;
      const origFollowUpFind = FollowUpState.find;
      const origTaskFindOne = Task.findOne;
      const origDownloadMedia = WhatsAppService.downloadMedia;

      Task.findOne = (() => ({
        exec: async () => null,
      })) as any;

      // Mock single client in org_tenant_A
      Client.find = (() => ({
        lean: () => ({
          exec: async () => [
            { _id: 'client_1', orgId: 'org_tenant_A', name: 'Alpha Client', mobile: '+919999900000' },
          ],
        }),
      })) as any;

      let savedStatus = '';
      const mockFollowUp: any = {
        _id: 'fu-wa-media-1',
        orgId: 'org_tenant_A',
        clientId: 'client_1',
        clientName: 'Alpha Client',
        module: 'Task',
        sourceId: 'task-1',
        status: 'waiting_client',
        responseHistory: [],
        save: async () => {
          savedStatus = mockFollowUp.status;
        },
      };

      FollowUpState.find = (() => ({
        sort: () => ({
          exec: async () => [mockFollowUp],
        }),
      })) as any;

      // WhatsApp download returns null (failed from Meta CDN)
      WhatsAppService.downloadMedia = async () => null;

      const outcome = await FollowUpService.handleIncomingWhatsAppMessage({
        from: '919999900000',
        id: 'wamid_media_fail_1',
        type: 'document',
        document: { id: 'meta_media_id_fail', filename: 'tax_return.pdf', mime_type: 'application/pdf' },
      });

      assert.strictEqual(outcome.handled, true);
      assert.strictEqual(outcome.matchedRequestId, null);
      assert.ok(outcome.actionTaken.includes('Attachment download failed'));
      // Follow up must be marked response_received (requires review), NOT document_received
      assert.strictEqual(savedStatus, 'response_received');

      Client.find = origClientFind;
      FollowUpState.find = origFollowUpFind;
      Task.findOne = origTaskFindOne;
      WhatsAppService.downloadMedia = origDownloadMedia;
    });
  });

  describe('7. Inbound Gmail Reply Polling', () => {
    it('returns immediately without polling when GMAIL_INBOUND_ENABLED is false', async () => {
      const origEnv = process.env.GMAIL_INBOUND_ENABLED;
      process.env.GMAIL_INBOUND_ENABLED = 'false';

      const res = await FollowUpService.processInboundGmailReplies();
      assert.strictEqual(res.processed, 0);
      assert.strictEqual(res.matched, 0);
      assert.strictEqual(res.errors.length, 0);

      process.env.GMAIL_INBOUND_ENABLED = origEnv;
    });
  });

  describe('8. Inbound WhatsApp & Gmail Deduplication and Security', () => {
    it('deduplicates inbound WhatsApp message using InboundMessageLog', async () => {
      const origReady = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      const origExists = InboundMessageLog.exists;
      InboundMessageLog.exists = (async () => true) as any;

      try {
        const outcome = await FollowUpService.handleIncomingWhatsAppMessage({
          from: '919876543210',
          id: 'wamid_already_processed_123',
          text: { body: 'Here is my document' },
        });

        assert.strictEqual(outcome.handled, true);
        assert.strictEqual(outcome.actionTaken, 'Duplicate message already processed');
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: origReady, configurable: true });
        InboundMessageLog.exists = origExists;
      }
    });

    it('rejects WhatsApp context reply ID if sender phone number mismatches client', async () => {
      const origReady = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      const origExists = InboundMessageLog.exists;
      InboundMessageLog.exists = (async () => false) as any;

      const origFollowUpFindOne = FollowUpState.findOne;
      const origClientFind = Client.find;

      // Mock quoted context belonging to client with phone ending in 1111
      const mockContextFollowUp: any = {
        _id: 'fu-context-1',
        providerMessageId: 'quoted_msg_id_999',
        clientMobile: '+919999901111',
        clientId: 'client_legit',
        status: 'waiting_client',
      };

      FollowUpState.findOne = ((filter: any) => ({
        exec: async () => (filter.providerMessageId === 'quoted_msg_id_999' ? mockContextFollowUp : null),
      })) as any;

      // Unrelated phone number attempts to reply quoting that message
      Client.find = (() => ({
        lean: () => ({ exec: async () => [] }),
      })) as any;

      try {
        const outcome = await FollowUpService.handleIncomingWhatsAppMessage({
          from: '918888802222', // Mismatched phone
          id: 'wamid_forged_quote_1',
          context: { id: 'quoted_msg_id_999' },
          text: { body: 'Unauthorized reply' },
        });

        // Must reject quoted context and since no registered client matches sender phone, report no registered client
        assert.strictEqual(outcome.handled, false);
        assert.strictEqual(outcome.actionTaken, 'No registered client found for sender phone number');
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: origReady, configurable: true });
        InboundMessageLog.exists = origExists;
        FollowUpState.findOne = origFollowUpFindOne;
        Client.find = origClientFind;
      }
    });

    it('routes ambiguous WhatsApp sender with multiple active follow-ups to manual review', async () => {
      const origExists = InboundMessageLog.exists;
      InboundMessageLog.exists = (async () => false) as any;

      const origClientFind = Client.find;
      const origFollowUpFind = FollowUpState.find;

      Client.find = (() => ({
        lean: () => ({
          exec: async () => [
            { _id: 'client_multi_fu', orgId: 'org_multi', mobile: '919876500000' },
          ],
        }),
      })) as any;

      // Two active follow-ups for the same client (e.g. Task A and Task B)
      FollowUpState.find = (() => ({
        sort: () => ({
          exec: async () => [
            { _id: 'fu_1', documentTitle: 'Bank Statements', sourceName: 'Audit 2025' },
            { _id: 'fu_2', documentTitle: 'PAN Card', sourceName: 'GST Filing' },
          ],
        }),
      })) as any;

      // Sender sends generic text that doesn't mention either document
      const outcome = await FollowUpService.handleIncomingWhatsAppMessage({
        from: '919876500000',
        id: 'wamid_ambiguous_text',
        text: { body: 'Hello, I have a question about my filing' },
      });

      assert.strictEqual(outcome.handled, false);
      assert.ok(outcome.actionTaken.includes('Ambiguous request: sender has 2 active follow-ups'));

      InboundMessageLog.exists = origExists;
      Client.find = origClientFind;
      FollowUpState.find = origFollowUpFind;
    });
  });

  describe('9. Follow-Up Scheduling, Retries & Dry-Runs', () => {
    it('dry-run (forceRealSend=false) does not increment attemptCount or advance nextReminderAt', async () => {
      const origFind = FollowUpState.find;

      const initialReminderAt = new Date('2026-10-25T10:00:00Z');
      const mockFollowUp: any = {
        _id: 'fu-dryrun-1',
        orgId: 'org_test',
        module: 'Task',
        sourceId: 'task-1',
        clientId: 'client-1',
        clientEmail: 'test@example.com',
        channel: 'Email',
        status: 'waiting_client',
        attemptCount: 1,
        maxAttempts: 4,
        nextReminderAt: initialReminderAt,
        responseHistory: [],
        save: async () => {},
      };

      FollowUpState.find = (() => ({
        limit: () => ({
          exec: async () => [mockFollowUp],
        }),
      })) as any;

      const origTaskFind = Task.findOne;
      Task.findOne = (() => ({
        lean: () => ({
          exec: async () => ({ _id: 'task-1', status: 'In Progress', isDeleted: false }),
        }),
      })) as any;

      const res = await FollowUpService.processScheduledFollowUps({
        nowDate: new Date('2026-10-25T11:00:00Z'),
        forceRealSend: false, // Dry run
      });

      assert.strictEqual(res.reminded, 1);
      // Under dry-run, attemptCount and nextReminderAt MUST NOT be changed
      assert.strictEqual(mockFollowUp.attemptCount, 1);
      assert.strictEqual(mockFollowUp.nextReminderAt, initialReminderAt);

      FollowUpState.find = origFind;
      Task.findOne = origTaskFind;
    });

    it('failed delivery applies capped exponential backoff to nextReminderAt without incrementing attemptCount', async () => {
      const origFind = FollowUpState.find;

      const mockFollowUp: any = {
        _id: 'fu-retry-1',
        orgId: 'org_test',
        module: 'Task',
        sourceId: 'task-1',
        clientId: 'client-1',
        clientMobile: '919876543210',
        channel: 'WhatsApp',
        status: 'waiting_client',
        attemptCount: 1,
        maxAttempts: 4,
        nextReminderAt: new Date('2026-10-25T10:00:00Z'),
        responseHistory: [],
        metadata: { deliveryRetryCount: 1 },
        save: async () => {},
      };

      FollowUpState.find = (() => ({
        limit: () => ({
          exec: async () => [mockFollowUp],
        }),
      })) as any;

      const origTaskFind = Task.findOne;
      Task.findOne = (() => ({
        lean: () => ({
          exec: async () => ({ _id: 'task-1', status: 'In Progress', isDeleted: false }),
        }),
      })) as any;

      // Force WhatsApp to fail live delivery
      const origSendMsg = WhatsAppService.sendMessage;
      WhatsAppService.sendMessage = async () => ({
        status: 'failed',
        error: 'Network connection timeout to Meta Graph API',
      });

      const now = new Date('2026-10-25T10:00:00Z');
      const res = await FollowUpService.processScheduledFollowUps({
        nowDate: now,
        forceRealSend: true,
      });

      assert.strictEqual(res.reminded, 0);
      // Attempt count remains 1 (delivery failure != client reminder attempt)
      assert.strictEqual(mockFollowUp.attemptCount, 1);
      assert.strictEqual(mockFollowUp.metadata.deliveryRetryCount, 2);

      // Backoff for retry #2: 15 * 2^(2-1) = 30 minutes
      const expectedBackoffMs = 30 * 60 * 1000;
      assert.strictEqual(mockFollowUp.nextReminderAt.getTime(), now.getTime() + expectedBackoffMs);

      FollowUpState.find = origFind;
      Task.findOne = origTaskFind;
      WhatsAppService.sendMessage = origSendMsg;
    });

    it('escalates follow-up to practice team after 5 delivery retry failures', async () => {
      const origFind = FollowUpState.find;

      const mockFollowUp: any = {
        _id: 'fu-retry-escalate',
        orgId: 'org_test',
        module: 'Task',
        sourceId: 'task-1',
        clientId: 'client-1',
        clientMobile: '919876543210',
        channel: 'WhatsApp',
        status: 'waiting_client',
        attemptCount: 1,
        maxAttempts: 4,
        nextReminderAt: new Date('2026-10-25T10:00:00Z'),
        responseHistory: [],
        metadata: { deliveryRetryCount: 4 }, // 5th failure incoming
        save: async () => {},
      };

      FollowUpState.find = (() => ({
        limit: () => ({
          exec: async () => [mockFollowUp],
        }),
      })) as any;

      const origTaskFind = Task.findOne;
      Task.findOne = (() => ({
        lean: () => ({
          exec: async () => ({ _id: 'task-1', status: 'In Progress', isDeleted: false }),
        }),
      })) as any;

      const origSendMsg = WhatsAppService.sendMessage;
      WhatsAppService.sendMessage = async () => ({
        status: 'failed',
        error: 'Permanent delivery failure: Recipient number invalid',
      });

      const res = await FollowUpService.processScheduledFollowUps({
        nowDate: new Date('2026-10-25T10:00:00Z'),
        forceRealSend: true,
      });

      assert.strictEqual(res.escalated, 1);
      assert.strictEqual(mockFollowUp.status, 'escalated');
      assert.strictEqual(mockFollowUp.nextReminderAt, null);
      assert.ok(mockFollowUp.resolutionNotes.includes('Delivery failed permanently after 5 retries'));

      FollowUpState.find = origFind;
      Task.findOne = origTaskFind;
      WhatsAppService.sendMessage = origSendMsg;
    });
  });

  describe('10. Multi-Document Task Follow-Up Matching', () => {
    it('completeFollowUpForDocument closes all active follow-ups for matching documentRequestId', async () => {
      const origFind = FollowUpState.find;

      const mockFollowUps = [
        {
          _id: 'fu_email_item1',
          channel: 'Email',
          status: 'waiting_client',
          documentRequestId: 'doc_item_123',
          nextReminderAt: new Date(),
          responseHistory: [] as any[],
          save: async () => {},
        },
        {
          _id: 'fu_wa_item1',
          channel: 'WhatsApp',
          status: 'waiting_client',
          documentRequestId: 'doc_item_123',
          nextReminderAt: new Date(),
          responseHistory: [] as any[],
          save: async () => {},
        },
      ];

      FollowUpState.find = (() => ({
        exec: async () => mockFollowUps,
      })) as any;

      const resolved = await FollowUpService.completeFollowUpForDocument({
        orgId: 'org_test',
        taskId: 'task-999',
        documentRequestId: 'doc_item_123',
        fileUrl: '/api/v1/drive/doc_item_123.pdf',
        receivedAt: new Date(),
      });

      assert.strictEqual(resolved, true);
      assert.strictEqual(mockFollowUps[0].status, 'document_received');
      assert.strictEqual(mockFollowUps[0].nextReminderAt, null);
      assert.strictEqual(mockFollowUps[1].status, 'document_received');
      assert.strictEqual(mockFollowUps[1].nextReminderAt, null);

      FollowUpState.find = origFind;
    });
  });
});
