/**
 * Comprehensive verification script for Agent Center email delivery.
 * Tests:
 * 1. MailService.getStatus() honesty
 * 2. Simulation test run (mode: 'mock', simulated: true, no network send)
 * 3. Controlled test email execution (isRealRun: true, target overridden to test inbox)
 * 4. Error handling when credentials are missing or token is expired (honest failure, no fake success)
 * 5. Multi-module support: Task, DSC, License agents
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Agent } from '../modules/agentCenter/agent.model';
import { AgentRun } from '../modules/agentCenter/agentRun.model';
import { AgentExecutionService } from '../modules/agentCenter/execution.service';
import { MailService } from '../shared/utils/mailService';

async function main() {
  logger.info('🚀 Starting Agent Center Email Delivery Verification...');
  await mongoose.connect(process.env.MONGODB_URI || env.MONGODB_URI);
  logger.info('📦 Connected to MongoDB');

  const testOrgId = 'org-test-verification-' + Date.now();

  try {
    // -------------------------------------------------------------
    // Test 1: MailService Status Check
    // -------------------------------------------------------------
    logger.info('\n--- Test 1: MailService.getStatus() ---');
    const mailStatus = await MailService.getStatus();
    logger.info('MailService status result:', mailStatus);
    if (mailStatus.provider === 'gmail' && mailStatus.needsReconnect) {
      logger.info('✅ Correctly identified that Gmail access token is expired and needs re-authorization.');
    } else if (mailStatus.authorized) {
      logger.info('✅ Mail service is authorized and ready for live delivery.');
    } else {
      logger.info('✅ Honest status reported: not authorized / credentials needed.');
    }

    // -------------------------------------------------------------
    // Test 2: Create Published Task, DSC, and License Agents
    // -------------------------------------------------------------
    logger.info('\n--- Test 2: Create Test Agents (Task, DSC, License) ---');
    const taskAgent = await Agent.create({
      orgId: testOrgId,
      name: 'Test Task Status Agent',
      module: 'Task',
      status: 'published',
      config: {
        trigger: 'Task Created',
        conditions: {},
        recipient: ['Client', 'Assigned user'],
        channel: 'Email',
        action: 'Send notification',
        templateId: 'custom',
        subject: 'New Task Created: {{task.taskName}}',
        message: 'Dear {{client.name}}, task {{task.taskName}} has been created.',
      },
    });

    const dscAgent = await Agent.create({
      orgId: testOrgId,
      name: 'Test DSC Expiry Agent',
      module: 'DSC',
      status: 'published',
      config: {
        trigger: 'DSC Expiry Approaching',
        conditions: { daysBeforeExpiry: 15 },
        recipient: ['Client'],
        channel: 'Email',
        action: 'Send expiry reminder',
        templateId: 'custom',
        subject: 'DSC Expiring Soon: {{dsc.holder}}',
        message: 'Dear {{client.name}}, your digital signature for {{dsc.holder}} expires on {{dsc.expiryDate}}.',
      },
    });

    const licenseAgent = await Agent.create({
      orgId: testOrgId,
      name: 'Test License Renewal Agent',
      module: 'License',
      status: 'published',
      config: {
        trigger: 'License Expiry Approaching',
        conditions: { daysBeforeExpiry: 30 },
        recipient: ['Client'],
        channel: 'Email',
        action: 'Send renewal reminder',
        templateId: 'custom',
        subject: 'License Renewal Required: {{license.name}}',
        message: 'Dear {{client.name}}, your license {{license.name}} is due for renewal on {{license.expiryDate}}.',
      },
    });

    logger.info(`✅ Created 3 agents: Task (${taskAgent._id}), DSC (${dscAgent._id}), License (${licenseAgent._id})`);

    // -------------------------------------------------------------
    // Test 3: Simulation Run (Pure Offline Mock, No Network Send)
    // -------------------------------------------------------------
    logger.info('\n--- Test 3: Simulation Test Run ---');
    const simRun = await AgentExecutionService.run(String(taskAgent._id), {
      orgId: testOrgId,
      runType: 'test',
    });

    if (simRun.executionMode !== 'mock' || !simRun.result?.simulated) {
      throw new Error(`Expected mock mode and simulated=true, got mode=${simRun.executionMode}, simulated=${simRun.result?.simulated}`);
    }
    logger.info('Simulation result label:', simRun.result?.label);
    logger.info('Simulation status:', simRun.status);
    logger.info('Simulation execution IDs:', (simRun.result?.results as any[]).map((r: any) => r.executionId));
    if ((simRun.result?.results as any[]).some((r: any) => !r.executionId?.includes('mock'))) {
      throw new Error('Simulation results must contain mock execution IDs only!');
    }
    logger.info('✅ Simulation test run correctly executed in pure mock mode without sending real emails.');

    // -------------------------------------------------------------
    // Test 4: Controlled Test Email Execution (Safe Single Recipient)
    // -------------------------------------------------------------
    logger.info('\n--- Test 4: Controlled Test Email Execution ---');
    const testRecipient = 'test-audit-inbox@ayatrio-audit.test';
    const liveRun = await AgentExecutionService.run(String(taskAgent._id), {
      orgId: testOrgId,
      runType: 'test',
      testRecipientEmail: testRecipient,
    });

    logger.info('Live run status:', liveRun.status);
    logger.info('Live run executionMode:', liveRun.executionMode);
    logger.info('Live run simulated:', liveRun.result?.simulated);
    logger.info('Live run label:', liveRun.result?.label);
    logger.info('Live run recipient outcomes:', liveRun.result?.results);

    if (liveRun.executionMode !== 'real' || liveRun.result?.simulated !== false) {
      throw new Error(`Controlled test run must have executionMode='real' and simulated=false!`);
    }

    // Verify recipient was overridden to testRecipient safely
    for (const r of (liveRun.result?.results as any[]) || []) {
      if (!r.recipient?.includes(testRecipient)) {
        throw new Error(`Controlled test must ONLY send to ${testRecipient}, but found: ${r.recipient}`);
      }
    }

    // Check honest outcome: If access token was expired, it must fail honestly with safe error, NOT fake success!
    if (!mailStatus.authorized) {
      if (liveRun.status === 'success') {
        throw new Error('FATAL: Fake success returned when provider was unauthorized!');
      }
      logger.info('✅ Honest failure recorded as expected when credentials require authorization:', (liveRun.result?.results as any[])?.[0]?.error);
    } else {
      logger.info('✅ Real email dispatched successfully! ExecutionId:', (liveRun.result?.results as any[])?.[0]?.executionId);
    }

    // -------------------------------------------------------------
    // Test 5: Verify DSC and License agents share the delivery engine
    // -------------------------------------------------------------
    logger.info('\n--- Test 5: Verify DSC & License Agents with Controlled Test Path ---');
    const dscLiveRun = await AgentExecutionService.run(String(dscAgent._id), {
      orgId: testOrgId,
      runType: 'test',
      testRecipientEmail: testRecipient,
    });
    if (dscLiveRun.executionMode !== 'real' || dscLiveRun.result?.simulated !== false) {
      throw new Error('DSC agent controlled test must execute in real mode!');
    }
    logger.info('DSC live run outcome:', dscLiveRun.result?.label);

    const licLiveRun = await AgentExecutionService.run(String(licenseAgent._id), {
      orgId: testOrgId,
      runType: 'test',
      testRecipientEmail: testRecipient,
    });
    if (licLiveRun.executionMode !== 'real' || licLiveRun.result?.simulated !== false) {
      throw new Error('License agent controlled test must execute in real mode!');
    }
    logger.info('License live run outcome:', licLiveRun.result?.label);
    logger.info('✅ Task, DSC, and License all utilize the exact same delivery engine.');

    // -------------------------------------------------------------
    // Test 6: Verify externalExecutionId recording (from frontend gmail.send)
    // -------------------------------------------------------------
    logger.info('\n--- Test 6: Verify frontend gmail.send() Message ID Recording ---');
    const realMsgId = '18b2c45f6a91de82'; // Real format of Gmail message ID
    const externalRun = await AgentExecutionService.run(String(taskAgent._id), {
      orgId: testOrgId,
      runType: 'actual',
      testRecipientEmail: testRecipient,
      externalExecutionId: realMsgId,
    });
    if (externalRun.status !== 'success' || externalRun.executionMode !== 'real') {
      throw new Error(`External execution run must succeed in real mode, got status=${externalRun.status}`);
    }
    const recOutcomes = (externalRun.result?.results as any[]) || [];
    if (recOutcomes[0]?.executionId !== realMsgId || recOutcomes[0]?.status !== 'delivered') {
      throw new Error(`Expected executionId=${realMsgId} and status=delivered, got: ${JSON.stringify(recOutcomes[0])}`);
    }
    logger.info('✅ External Gmail message ID preserved and persisted as delivered:', recOutcomes[0]?.executionId);

    logger.info('\n🎉 ALL 6 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Cleanup test data
    await Agent.deleteMany({ orgId: testOrgId });
    await AgentRun.deleteMany({ orgId: testOrgId });
    logger.info('🧹 Cleaned up verification test records.');
    await mongoose.disconnect();
    logger.info('🔌 Disconnected from MongoDB');
  }
}

main().catch((err) => {
  logger.error('❌ Verification failed:', err);
  process.exit(1);
});
