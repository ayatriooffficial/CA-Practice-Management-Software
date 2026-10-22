import { createHash, randomUUID } from 'crypto';
import { AppError } from '../../shared/utils/apiError';
import { Agent } from './agent.model';
import { AgentRun } from './agentRun.model';
import { AgentConfig, AgentModule } from './agent.interface';
import { findTrigger } from './definitions';
import { AgentCenterService } from './agent.service';

const DEMO_RECIPIENTS: Record<string, { name: string; address: string }> = {
  'Assigned user': { name: 'Sample User', address: 'sample.user@example.test' },
  'Task owner': { name: 'Sample Manager', address: 'sample.manager@example.test' },
  'Account administrator': { name: 'Account Administrator', address: 'admin@example.test' },
  'Responsible person': { name: 'Responsible Person', address: 'responsible@example.test' },
};

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, part) => {
    if (value && typeof value === 'object') return (value as Record<string, unknown>)[part];
    return undefined;
  }, source);
}

export function renderAgentTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key: string) => {
    const value = readPath(variables, key);
    return value === undefined || value === null ? match : String(value);
  });
}

interface MockProviderOutput {
  provider: string;
  mode: 'mock';
  status: 'failed' | 'simulated';
  simulated: true;
  error?: string;
  timestamp: string;
  executionId: string;
  recipient?: string;
  subject?: string | null;
  renderedMessage?: string;
}

function mockProvider(channel: string, payload: { recipient: string; message: string; subject: string; simulateFailure: boolean }): MockProviderOutput {
  const providerName = channel === 'Email' ? 'email' : channel === 'WhatsApp' ? 'whatsapp' : 'in-app';
  const envName = channel === 'Email' ? 'MOCK_EMAIL_FAILURE' : channel === 'WhatsApp' ? 'MOCK_WHATSAPP_FAILURE' : '';
  const configuredFailure = envName ? process.env[envName] === 'true' : false;
  const fingerprint = createHash('sha256')
    .update(`${providerName}:${payload.recipient}:${payload.message}`)
    .digest('hex')
    .slice(0, 16);
  const executionId = `${providerName}-mock-${fingerprint}`;
  if (!payload.recipient || !payload.message || configuredFailure || payload.simulateFailure) {
    return {
      provider: providerName,
      mode: 'mock',
      status: 'failed',
      simulated: true,
      error: !payload.recipient || !payload.message ? 'Provider payload is incomplete.' : 'Simulated provider failure.',
      timestamp: '2026-01-01T00:00:00.000Z',
      executionId,
    };
  }
  return {
    provider: providerName,
    mode: 'mock',
    status: 'simulated',
    simulated: true,
    executionId,
    timestamp: '2026-01-01T00:00:00.000Z',
    recipient: payload.recipient,
    subject: payload.subject || null,
    renderedMessage: payload.message,
  };
}

export class AgentExecutionService {
  static async run(id: string, context: { idempotencyKey?: string; failRecipient?: string } = {}) {
    const agent = await Agent.findById(id).exec();
    if (!agent) throw AppError.notFound('Agent not found.');
    if (agent.status !== 'published') {
      throw AppError.conflict(`Only published agents can be test-run (this agent is ${agent.status}).`);
    }

    const runKey = context.idempotencyKey || randomUUID();
    const checked = AgentCenterService.validateConfig(agent.module, agent.config);
    if (!checked.valid || !checked.config) {
      const errorMessage = `Simulation failed: ${checked.errors.join(' ')}`;
      const run = await AgentRun.create({
        agentId: agent._id,
        agentName: agent.name,
        agentModule: agent.module,
        runType: 'test',
        status: 'failed',
        triggerData: { simulated: true, event: (agent.config as AgentConfig)?.trigger ?? null },
        result: null,
        errorMessage,
        executionMode: 'mock',
        runKey,
      });
      return run;
    }

    const config = checked.config;
    const trigger = findTrigger(agent.module, config.trigger);
    if (!trigger) throw AppError.badRequest('Configured trigger is not available for this module.');
    const triggerData: Record<string, unknown> = { simulated: true, ...trigger.sampleEvent(config.conditions) };
    const event = (triggerData['task'] || triggerData['dsc'] || triggerData['license'] || {}) as Record<string, unknown>;
    const variables: Record<string, unknown> = { agent: { name: agent.name }, event, ...event, trigger: config.trigger };
    const recipients = (Array.isArray(config.recipient) ? config.recipient : [config.recipient])
      .filter((recipient): recipient is string => typeof recipient === 'string');
    // The strict validator guarantees this list is normalized and valid.
    const results = recipients.map((recipient) => {
      const recipientData = DEMO_RECIPIENTS[recipient] || { name: recipient, address: '' };
      const renderedMessage = renderAgentTemplate(String(config.message), {
        ...variables,
        recipient: recipientData,
      });
      const output = mockProvider(String(config.channel), {
        recipient: recipientData.address || recipientData.name,
        message: renderedMessage,
        subject: String(config.action),
        simulateFailure: context.failRecipient === recipient,
      });
      return { recipient, recipientData, ...output };
    });

    const failed = results.filter((result) => result.status === 'failed');
    const status = failed.length === results.length ? 'failed' : 'success';
    const renderedMessage = String(results[0]?.renderedMessage ?? renderAgentTemplate(String(config.message), variables));
    const result = {
      simulated: true,
      executionMode: 'mock',
      label: 'SIMULATED RUN: no notification was sent.',
      message: `Simulation completed for “${agent.name}”. No real notification was sent.`,
      trigger: config.trigger,
      conditions: config.conditions,
      recipients,
      recipient: recipients,
      channel: config.channel,
      action: config.action,
      renderedMessage,
      results,
      partialFailure: failed.length > 0 && failed.length < results.length,
      steps: [
        `Sample "${config.trigger}" event generated.`,
        'Conditions evaluated against the sample event.',
        `Recipients resolved (simulated): ${recipients.join(', ')}.`,
        `Would deliver via ${String(config.channel)} (not sent).`,
        `Action prepared: ${String(config.action)}.`,
      ],
    };
    const run = await AgentRun.create({
      agentId: agent._id,
      agentName: agent.name,
      agentModule: agent.module,
      runType: 'test',
      status,
      triggerData,
      result,
      errorMessage: failed.length ? `${failed.length} of ${results.length} provider operation(s) failed.` : null,
      executionMode: 'mock',
      runKey,
    });
    return run;
  }

  static async forAgent(id: string) {
    return AgentRun.find({ agentId: id }).sort({ createdAt: -1, _id: -1 }).exec();
  }

  static async list(limit = 100, includeActivities = true) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 250);
    const runs = await AgentRun.find().sort({ createdAt: -1, _id: -1 }).limit(safeLimit).exec();
    const runItems = runs.map((run) => ({
      ...run.toJSON(),
      historyType: 'run',
      action: 'test-run',
    }));
    if (!includeActivities) return runItems;

    const agents = await Agent.find().select('name module status createdAt').sort({ createdAt: -1, _id: -1 }).limit(safeLimit).exec();
    const activities = agents.map((agent) => ({
      id: `created-${String(agent._id)}`,
      agentId: String(agent._id),
      agentName: agent.name,
      agentModule: agent.module as AgentModule,
      runType: null,
      status: 'draft',
      triggerData: null,
      result: null,
      errorMessage: null,
      executionMode: 'mock',
      runKey: null,
      createdAt: agent.createdAt,
      updatedAt: agent.createdAt,
      historyType: 'activity',
      action: 'created',
    }));
    return [...runItems, ...activities]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, safeLimit);
  }
}
