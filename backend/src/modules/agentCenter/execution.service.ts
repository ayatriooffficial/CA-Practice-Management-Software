import { createHash, randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { AppError } from '../../shared/utils/apiError';
import { Agent } from './agent.model';
import { AgentRun } from './agentRun.model';
import { AgentConfig, AgentModule, WorkflowGraph, WorkflowNode } from './agent.interface';
import { findTrigger } from './definitions';
import { AgentCenterService } from './agent.service';
import { Client } from '../client/client.model';
import { UserModel } from '../auth/user.model';

const DEMO_RECIPIENTS: Record<string, { name: string; address?: string; email?: string; mobile?: string; id?: string }> = {
  Client: { name: 'Sample Company', address: 'sample.client@example.test', mobile: '+10000000000', id: 'sample-client' },
  'Assigned user': { name: 'Sample User', address: 'sample.user@example.test', mobile: '+10000000001', id: 'sample-assignee' },
  'Task owner': { name: 'Sample Manager', address: 'sample.manager@example.test', mobile: '+10000000002', id: 'sample-owner' },
  'Account administrator': { name: 'Account Administrator', address: 'admin@example.test', mobile: '+10000000003', id: 'sample-admin' },
  'Responsible person': { name: 'Responsible Person', address: 'responsible@example.test', mobile: '+10000000004', id: 'sample-reviewer' },
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

export function compareCondition(node: WorkflowNode, variables: Record<string, unknown>): { result: boolean; value: unknown } {
  const actual = readPath(variables, String(node.config.field));
  const expected = node.config.value;
  const operator = String(node.config.operator);
  if (operator === 'exists') return { result: actual !== undefined && actual !== null && actual !== '', value: actual };
  if (actual === undefined || actual === null) return { result: false, value: actual };
  if (operator === 'equals') return { result: String(actual).toLowerCase() === String(expected).toLowerCase(), value: actual };
  if (operator === 'not_equals') return { result: String(actual).toLowerCase() !== String(expected).toLowerCase(), value: actual };
  if (operator === 'contains') return { result: String(actual).toLowerCase().includes(String(expected).toLowerCase()), value: actual };
  const actualDate = Date.parse(String(actual));
  const expectedDate = Date.parse(String(expected));
  if (!Number.isFinite(actualDate) || !Number.isFinite(expectedDate)) throw new Error(`Condition ${node.name} requires valid dates for comparison.`);
  return { result: operator === 'greater_than' ? actualDate > expectedDate : actualDate < expectedDate, value: actual };
}

export function runGraph(graph: WorkflowGraph, variables: Record<string, unknown>, failRecipient?: string) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const trace: Array<Record<string, unknown>> = [];
  const results: Array<Record<string, unknown>> = [];
  let currentId = graph.nodes[0]?.id;
  let visitedCount = 0;
  while (currentId) {
    if (currentId === '__end__') break;
    const node = nodes.get(currentId);
    if (!node) throw new Error(`Workflow connection points to missing node ${currentId}.`);
    if (++visitedCount > graph.nodes.length) throw new Error('Workflow stopped because the execution step limit was reached.');
    if (node.type === 'condition') {
      const evaluated = compareCondition(node, variables);
      const branch = evaluated.result ? 'true' : 'false';
      trace.push({ nodeId: node.id, nodeName: node.name, type: 'condition', field: node.config.field, operator: node.config.operator, expected: node.config.value ?? null, actual: evaluated.value ?? null, result: evaluated.result, branch });
      const nextId = graph.edges.find((item) => item.source === node.id && item.sourceHandle === branch)?.target;
      if (!nextId) throw new Error(`Condition ${node.name} has no ${branch} branch connection.`);
      currentId = nextId;
      continue;
    }
    const recipient = String(node.config.recipient);
    const actualRecipients = variables.resolvedRecipients as Record<string, { name: string; email?: string; mobile?: string; id?: string }> | undefined;
    const recipientData: { name: string; address?: string; email?: string; mobile?: string; id?: string } = variables.previewOnly === true
      ? DEMO_RECIPIENTS[recipient] || { name: recipient, address: '' }
      : actualRecipients?.[recipient] || { name: recipient, address: '' };
    const channel = String(node.config.channel);
    const recipientAddress = channel === 'Email' ? recipientData.email || (recipientData as { address?: string }).address || ''
      : channel === 'WhatsApp' ? recipientData.mobile || ''
        : recipientData.id || '';
    const renderedMessage = renderAgentTemplate(String(node.config.message), { ...variables, recipient: recipientData });
    const renderedSubject = renderAgentTemplate(String(node.config.subject || node.config.action), { ...variables, recipient: recipientData });
    const output = mockProvider(channel, { recipient: recipientAddress, recipientLabel: recipient, message: renderedMessage, subject: renderedSubject, previewOnly: variables.previewOnly === true, simulateFailure: failRecipient === recipient });
    results.push({ nodeId: node.id, nodeName: node.name, recipient, ...output });
    trace.push({ nodeId: node.id, nodeName: node.name, type: 'action', status: output.status, provider: output.provider, simulated: true });
    currentId = graph.edges.find((item) => item.source === node.id && item.sourceHandle === 'next')?.target ?? '__end__';
  }
  return { trace, results };
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

function mockProvider(channel: string, payload: { recipient: string; recipientLabel: string; message: string; subject: string; previewOnly: boolean; simulateFailure: boolean }): MockProviderOutput {
  const providerName = channel === 'Email' ? 'email' : channel === 'WhatsApp' ? 'whatsapp' : 'in-app';
  const envName = channel === 'Email' ? 'MOCK_EMAIL_FAILURE' : channel === 'WhatsApp' ? 'MOCK_WHATSAPP_FAILURE' : '';
  const configuredFailure = envName ? process.env[envName] === 'true' : false;
  const fingerprint = createHash('sha256')
    .update(`${providerName}:${payload.recipient}:${payload.message}`)
    .digest('hex')
    .slice(0, 16);
  const executionId = `${providerName}-mock-${fingerprint}`;
  const missingTemplateData = /\{\{[^}]+\}\}/.test(payload.message) || (channel === 'Email' && /\{\{[^}]+\}\}/.test(payload.subject));
  const invalidContact = channel === 'Email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.recipient)
    : channel === 'WhatsApp' ? !/^\+?[0-9]{7,15}$/.test(payload.recipient.replace(/[\s()-]/g, ''))
      : !payload.recipient;
  if (!payload.recipient || invalidContact || !payload.message || (channel === 'Email' && !payload.subject.trim()) || missingTemplateData || configuredFailure || payload.simulateFailure) {
    return {
      provider: providerName,
      mode: 'mock',
      status: 'failed',
      simulated: true,
      error: !payload.recipient || invalidContact ? 'Recipient contact details are missing or invalid for this channel.' : !payload.message || (channel === 'Email' && !payload.subject.trim()) ? 'Required message content is missing.' : missingTemplateData ? 'Required template data is missing from the event record.' : 'Simulated provider failure.',
      timestamp: new Date().toISOString(),
      executionId,
    };
  }
  return {
    provider: providerName,
    mode: 'mock',
    status: 'simulated',
    simulated: true,
    executionId,
      timestamp: new Date().toISOString(),
    recipient: payload.recipientLabel,
    ...(payload.previewOnly ? { subject: payload.subject || null, renderedMessage: payload.message } : {}),
  };
}

export function buildTaskClientLookup(orgId: string, clientId: string) {
  if (!Types.ObjectId.isValid(clientId)) return null;
  return { _id: clientId, orgId, active: true, isDeleted: false };
}

async function resolveActualRecipients(orgId: string, task: Record<string, unknown>, recipients: string[]) {
  const resolved: Record<string, { name: string; email?: string; mobile?: string; id?: string }> = {};
  const activeUser = async (id: unknown) => {
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) return null;
    return UserModel.findOne({ _id: id, orgId, status: { $in: ['active', 'Active'] } }).select('name email mobile').lean().exec();
  };
  for (const role of new Set(recipients)) {
    if (role === 'Client') {
      const clientId = typeof task.clientId === 'string' ? task.clientId : '';
      const lookup = buildTaskClientLookup(orgId, clientId);
      if (!lookup) continue;
      const client = await Client.findOne(lookup).select('name email mobile').lean().exec();
      if (client) resolved[role] = { name: client.name, email: client.email || '', mobile: client.mobile || '', id: String(client._id) };
      continue;
    }
    const user = role === 'Assigned user' ? await activeUser(task.assigneeId)
      : role === 'Task owner' ? await activeUser(task.createdBy || task.userId)
        : role === 'Responsible person' ? await activeUser(task.reviewerId)
          : role === 'Account administrator' ? await UserModel.findOne({ orgId, role: { $in: ['admin', 'Admin'] }, status: { $in: ['active', 'Active'] } }).sort({ createdAt: 1, _id: 1 }).select('name email mobile').lean().exec()
            : null;
    if (user) resolved[role] = { name: user.name, email: user.email || '', mobile: user.mobile || '', id: String(user._id) };
  }
  return resolved;
}

export class AgentExecutionService {
  static async run(id: string, context: { idempotencyKey?: string; failRecipient?: string; orgId: string; event?: Record<string, unknown>; runType?: 'test' | 'actual' }) {
    const agent = await Agent.findOne({ _id: id, orgId: context.orgId }).exec();
    if (!agent) throw AppError.notFound('Agent not found.');
    if (agent.status !== 'published') {
      throw AppError.conflict(`Only published agents can be test-run (this agent is ${agent.status}).`);
    }

    const runKey = context.idempotencyKey || randomUUID();
    const existingRun = await AgentRun.findOne({ agentId: agent._id, orgId: context.orgId, runKey }).exec();
    if (existingRun) return existingRun;
    const checked = AgentCenterService.validateConfig(agent.module, agent.config);
    if (!checked.valid || !checked.config) {
      const errorMessage = `Simulation failed: ${checked.errors.join(' ')}`;
      const run = await AgentRun.create({
        orgId: context.orgId,
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
    const triggerData: Record<string, unknown> = context.event
      ? { simulated: false, event: config.trigger, task: context.event }
      : { simulated: true, ...trigger.sampleEvent(config.conditions) };
    const event = (triggerData['task'] || triggerData['dsc'] || triggerData['license'] || {}) as Record<string, unknown>;
    const graph = config.workflowGraph as WorkflowGraph | undefined;
    const recipients = (Array.isArray(config.recipient) ? config.recipient : [config.recipient])
      .filter((recipient): recipient is string => typeof recipient === 'string');
    const graphRecipients = graph?.nodes.filter((node) => node.type === 'action').map((node) => String(node.config.recipient)) || [];
    const resolvedRecipients = context.event
      ? await resolveActualRecipients(context.orgId, event, [...recipients, ...graphRecipients])
      : undefined;
    const clientRecord = resolvedRecipients?.Client || (!context.event && agent.module === 'Task' ? { name: String(event.clientName || 'Sample Company'), email: 'sample.client@example.test' } : undefined);
    const variables: Record<string, unknown> = {
      agent: { name: agent.name }, event, ...triggerData, ...event, trigger: config.trigger,
      previewOnly: !context.event,
      resolvedRecipients,
      ...(clientRecord ? { client: { name: clientRecord.name, email: clientRecord.email } } : {}),
    };
    // The strict validator guarantees this list is normalized and valid.
    const graphRun = graph?.nodes.length ? runGraph(graph, variables, context.failRecipient) : null;
    const results = graphRun ? graphRun.results : recipients.map((recipient) => {
      const recipientData: { name: string; address?: string; email?: string; mobile?: string; id?: string } = context.event ? resolvedRecipients?.[recipient] || { name: recipient, address: '' } : DEMO_RECIPIENTS[recipient] || { name: recipient, address: '' };
      const renderedMessage = renderAgentTemplate(String(config.message), {
        ...variables,
        recipient: recipientData,
      });
      const renderedSubject = renderAgentTemplate(String(config.subject || config.action), { ...variables, recipient: recipientData });
      const recipientAddress = config.channel === 'Email' ? recipientData.email || recipientData.address || ''
        : config.channel === 'WhatsApp' ? recipientData.mobile || ''
          : recipientData.id || '';
      const output = mockProvider(String(config.channel), {
        recipient: recipientAddress,
        recipientLabel: recipient,
        message: renderedMessage,
        subject: renderedSubject,
        previewOnly: !context.event,
        simulateFailure: context.failRecipient === recipient,
      });
      return { recipient, ...output };
    });

    const failed = results.filter((result) => result.status === 'failed');
    const status = graphRun && results.length === 0 ? 'skipped' : failed.length === results.length ? 'failed' : failed.length > 0 ? 'partial-failed' : 'success';
    const executedRecipients = graphRun ? [...new Set(graphRun.results.map((item) => String(item.recipient)))] : recipients;
    const renderedMessage = String(results[0]?.renderedMessage ?? renderAgentTemplate(String(config.message), variables));
    const result = {
      simulated: true,
      executionMode: 'mock',
      label: 'SIMULATED RUN: no notification was sent.',
      message: context.event
        ? `Task event “${config.trigger}” matched “${agent.name}”. Actions were simulated; no real notification was sent.`
        : `Simulation completed for “${agent.name}”. No real notification was sent.`,
      trigger: config.trigger,
      conditions: config.conditions,
      recipients: executedRecipients,
      recipient: executedRecipients,
      channel: graphRun ? 'multiple' : config.channel,
      action: graphRun ? 'Connected workflow' : config.action,
      renderedMessage: context.event ? '[Message content is omitted from event execution history.]' : renderedMessage,
      results,
      partialFailure: failed.length > 0 && failed.length < results.length,
      steps: graphRun ? graphRun.trace.map((item) => item.type === 'condition' ? `${String(item.nodeName)} evaluated ${String(item.field)} ${String(item.operator)} ${String(item.expected)} as ${String(item.result)}; took ${String(item.branch)} branch.` : `${String(item.nodeName)} prepared a simulated ${String(item.provider)} action (${String(item.status)}).`) : [
        `Sample "${config.trigger}" event generated.`,
        'Conditions evaluated against the sample event.',
        `Recipients resolved (simulated): ${recipients.join(', ')}.`,
        `Would deliver via ${String(config.channel)} (not sent).`,
        `Action prepared: ${String(config.action)}.`,
      ],
      executionTrace: graphRun?.trace || [],
    };
    const run = await AgentRun.create({
      orgId: context.orgId,
      agentId: agent._id,
      agentName: agent.name,
      agentModule: agent.module,
      runType: context.runType || 'test',
      status,
      triggerData,
      result,
      errorMessage: failed.length ? `${failed.length} of ${results.length} provider operation(s) failed.` : null,
      executionMode: 'mock',
      runKey,
    });
    return run;
  }

  static async dispatchTaskEvent(orgId: string, triggerName: string, task: Record<string, unknown>, eventId: string) {
    if (!orgId || !eventId) return [];
    const agents = await Agent.find({ orgId, module: 'Task', status: 'published' }).select('_id config').exec();
    const matching = agents.filter((agent) => (agent.config as AgentConfig)?.trigger === triggerName);
    const safeTask = {
      id: String(task.id || ''),
      taskId: String(task.taskId || ''),
      clientId: String(task.clientId || ''),
      taskName: String(task.taskName || ''),
      clientName: String(task.clientName || ''),
      priority: String(task.priority || ''),
      status: String(task.status || ''),
      targetDueDate: String(task.targetDueDate || ''),
      assigneeName: String(task.assigneeName || ''),
      assigneeId: String(task.assigneeId || ''),
      reviewerId: String(task.reviewerId || ''),
      createdBy: String(task.createdBy || ''),
      userId: String(task.userId || ''),
    };
    return Promise.all(matching.map((agent) => this.run(String(agent._id), {
      orgId,
      event: safeTask,
      runType: 'actual',
      idempotencyKey: `task-event:${eventId}:${String(agent._id)}`,
    })));
  }

  static async forAgent(id: string, orgId: string) {
    return AgentRun.find({ agentId: id, orgId }).sort({ createdAt: -1, _id: -1 }).exec();
  }

  static async list(orgId: string, limit = 100, includeActivities = true) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 250);
    const runs = await AgentRun.find({ orgId }).sort({ createdAt: -1, _id: -1 }).limit(safeLimit).exec();
    const runItems = runs.map((run) => ({
      ...run.toJSON(),
      historyType: 'run',
      action: 'test-run',
    }));
    if (!includeActivities) return runItems;

    const agents = await Agent.find({ orgId }).select('name module status createdAt').sort({ createdAt: -1, _id: -1 }).limit(safeLimit).exec();
    const activities = agents.map((agent) => ({
      id: `created-${String(agent._id)}`,
      orgId,
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
