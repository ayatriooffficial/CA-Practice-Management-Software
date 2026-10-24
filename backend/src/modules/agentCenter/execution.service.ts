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
import { MailService } from '../../shared/utils/mailService';
import { WhatsAppService, isWhatsAppConfigured } from '../../shared/utils/whatsAppService';
import { env } from '../../config/env';
import { IntegrationModel } from '../integration/integration.model';

const DEMO_RECIPIENTS: Record<string, { name: string; address?: string; email?: string; mobile?: string; id?: string }> = {
  Client: { name: 'Sample Company', address: 'sample.client@example.test', email: 'sample.client@example.test', mobile: '+10000000000', id: 'sample-client' },
  'Assigned user': { name: 'Sample User', address: 'sample.user@example.test', email: 'sample.user@example.test', mobile: '+10000000001', id: 'sample-assignee' },
  Assignee: { name: 'Sample User', address: 'sample.user@example.test', email: 'sample.user@example.test', mobile: '+10000000001', id: 'sample-assignee' },
  'Task owner': { name: 'Sample Manager', address: 'sample.manager@example.test', email: 'sample.manager@example.test', mobile: '+10000000002', id: 'sample-owner' },
  Manager: { name: 'Sample Manager', address: 'sample.manager@example.test', email: 'sample.manager@example.test', mobile: '+10000000002', id: 'sample-owner' },
  'Account administrator': { name: 'Account Administrator', address: 'admin@example.test', email: 'admin@example.test', mobile: '+10000000003', id: 'sample-admin' },
  Admin: { name: 'Account Administrator', address: 'admin@example.test', email: 'admin@example.test', mobile: '+10000000003', id: 'sample-admin' },
  'Responsible person': { name: 'Responsible Person', address: 'responsible@example.test', email: 'responsible@example.test', mobile: '+10000000004', id: 'sample-reviewer' },
  Reviewer: { name: 'Responsible Person', address: 'responsible@example.test', email: 'responsible@example.test', mobile: '+10000000004', id: 'sample-reviewer' },
};

/**
 * 5-point recipient email resolution priority:
 * 1. Check database record for recipient's real email.
 * 2. If valid real email found, use that email directly.
 * 3. If no real email exists, fall back to demo recipient email for testing.
 * 4. Never overwrite real email with demo or send to both.
 * 5. Accurately record status for each recipient (delivered or failed).
 */
export function resolveRecipientWithFallback(
  role: string,
  dbRecord?: { name: string; email?: string; mobile?: string; id?: string } | null,
  fallbackToDemo = true
): { name: string; email: string; mobile: string; id: string; isRealEmail: boolean } {
  const dbEmail = dbRecord?.email?.trim();
  const isValidDbEmail = Boolean(dbEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dbEmail));

  if (isValidDbEmail && dbEmail) {
    // Priority 1 & 2: Valid real email from database
    return {
      name: dbRecord?.name || role,
      email: dbEmail,
      mobile: dbRecord?.mobile || '',
      id: dbRecord?.id || '',
      isRealEmail: true,
    };
  }

  // Priority 3 & 4: Fallback to demo recipient if real email absent
  const demo = DEMO_RECIPIENTS[role] || {
    name: role,
    email: 'demo@example.test',
    mobile: '+91 98765 43210',
    id: `demo-${role.toLowerCase().replace(/\s+/g, '-')}`,
  };

  return {
    name: dbRecord?.name || demo.name || role,
    email: fallbackToDemo ? (demo.email || '') : (dbEmail || ''),
    mobile: dbRecord?.mobile || demo.mobile || '',
    id: dbRecord?.id || demo.id || '',
    isRealEmail: false,
  };
}

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

export async function runGraph(graph: WorkflowGraph, variables: Record<string, unknown>, failRecipient?: string) {
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
    const output = await executeProvider(channel, { recipient: recipientAddress, recipientLabel: recipient, message: renderedMessage, subject: renderedSubject, previewOnly: variables.previewOnly === true, simulateFailure: failRecipient === recipient });
    results.push({ nodeId: node.id, nodeName: node.name, recipient, ...output });
    trace.push({ nodeId: node.id, nodeName: node.name, type: 'action', status: output.status, provider: output.provider, simulated: output.simulated });
    currentId = graph.edges.find((item) => item.source === node.id && item.sourceHandle === 'next')?.target ?? '__end__';
  }
  return { trace, results };
}

export interface ProviderExecutionOutput {
  provider: string;
  mode: 'mock' | 'real';
  status: 'failed' | 'simulated' | 'delivered';
  simulated: boolean;
  error?: string;
  timestamp: string;
  executionId: string;
  recipient?: string;
  subject?: string | null;
  renderedMessage?: string;
}

export async function isEmailConfiguredAsync(): Promise<boolean> {
  const hasSmtp = Boolean(
    (process.env.SMTP_USER || env.SMTP_USER) &&
    (process.env.SMTP_PASS || env.SMTP_PASS)
  );
  if (hasSmtp) return true;

  const hasGmailEnv = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    (process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN)
  );
  if (hasGmailEnv) return true;

  try {
    const googleIntegration = await IntegrationModel.findOne({ provider: 'google' }).lean().exec();
    if (googleIntegration?.email && (googleIntegration?.refreshToken || googleIntegration?.accessToken)) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export function isEmailConfigured(): boolean {
  const hasSmtp = Boolean(
    (process.env.SMTP_USER || env.SMTP_USER) &&
    (process.env.SMTP_PASS || env.SMTP_PASS)
  );
  const hasGmail = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    (process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN)
  );
  return hasSmtp || hasGmail;
}

export async function executeProvider(
  channel: string,
  payload: {
    recipient: string;
    recipientLabel: string;
    message: string;
    subject: string;
    previewOnly: boolean;
    simulateFailure: boolean;
  }
): Promise<ProviderExecutionOutput> {
  const providerName = channel === 'Email' ? 'email' : channel === 'WhatsApp' ? 'whatsapp' : 'in-app';
  const envName = channel === 'Email' ? 'MOCK_EMAIL_FAILURE' : channel === 'WhatsApp' ? 'MOCK_WHATSAPP_FAILURE' : '';
  const configuredFailure = envName ? process.env[envName] === 'true' : false;
  const fingerprint = createHash('sha256')
    .update(`${providerName}:${payload.recipient}:${payload.message}`)
    .digest('hex')
    .slice(0, 16);
  const executionId = `${providerName}-${payload.previewOnly ? 'mock' : 'real'}-${fingerprint}`;
  const missingTemplateMatches = [
    ...payload.message.matchAll(/\{\{([a-zA-Z0-9_.-]+)\}\}/g),
    ...(channel === 'Email' && payload.subject ? payload.subject.matchAll(/\{\{([a-zA-Z0-9_.-]+)\}\}/g) : []),
  ].map((m) => m[1]);
  const missingTemplateData = missingTemplateMatches.length > 0;
  const missingTemplateMsg = missingTemplateData
    ? `Required template variable(s) missing from event record: {{${[...new Set(missingTemplateMatches)].join('}}, {{')}}}.`
    : 'Required template data is missing from the event record.';
  const invalidContact = channel === 'Email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.recipient)
    : channel === 'WhatsApp' ? !/^\+?[0-9]{7,15}$/.test(payload.recipient.replace(/[\s()-]/g, ''))
      : !payload.recipient;

  if (payload.previewOnly) {
    if (!payload.recipient || invalidContact || !payload.message || (channel === 'Email' && !payload.subject.trim()) || missingTemplateData || configuredFailure || payload.simulateFailure) {
      return {
        provider: providerName,
        mode: 'mock',
        status: 'failed',
        simulated: true,
        error: !payload.recipient || invalidContact ? 'Recipient contact details are missing or invalid for this channel.' : !payload.message || (channel === 'Email' && !payload.subject.trim()) ? 'Required message content is missing.' : missingTemplateData ? missingTemplateMsg : 'Simulated provider failure.',
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
      subject: payload.subject || null,
      renderedMessage: payload.message,
    };
  }

  // Real execution
  if (!payload.recipient || invalidContact) {
    return {
      provider: providerName,
      mode: 'real',
      status: 'failed',
      simulated: false,
      error: `Recipient contact address is missing or invalid for ${payload.recipientLabel} (${channel}).`,
      timestamp: new Date().toISOString(),
      executionId,
    };
  }

  if (!payload.message || (channel === 'Email' && !payload.subject.trim())) {
    return {
      provider: providerName,
      mode: 'real',
      status: 'failed',
      simulated: false,
      error: 'Required notification subject or message content is missing.',
      timestamp: new Date().toISOString(),
      executionId,
    };
  }

  if (channel === 'Email') {
    const emailConfigured = await isEmailConfiguredAsync();
    if (!emailConfigured) {
      return {
        provider: 'email',
        mode: 'real',
        status: 'failed',
        simulated: false,
        error: 'Email delivery provider credentials not configured in environment (SMTP or Gmail OAuth required for live delivery).',
        timestamp: new Date().toISOString(),
        executionId,
      };
    }

    const mailResult = await MailService.sendMail({
      to: payload.recipient,
      subject: payload.subject,
      text: payload.message,
    });

    if (!mailResult.success) {
      return {
        provider: 'email',
        mode: 'real',
        status: 'failed',
        simulated: false,
        error: mailResult.error || 'Email delivery transmission failure.',
        timestamp: new Date().toISOString(),
        executionId,
      };
    }

    return {
      provider: 'email',
      mode: 'real',
      status: 'delivered',
      simulated: false,
      executionId: mailResult.messageId || executionId,
      timestamp: new Date().toISOString(),
      recipient: payload.recipientLabel,
      subject: payload.subject,
      renderedMessage: payload.message,
    };
  }

  if (channel === 'WhatsApp') {
    if (!isWhatsAppConfigured()) {
      return {
        provider: 'whatsapp',
        mode: 'real',
        status: 'failed',
        simulated: false,
        error: 'WhatsApp Business API provider credentials not configured in environment (WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID required).',
        timestamp: new Date().toISOString(),
        executionId,
      };
    }

    const waResult = await WhatsAppService.sendMessage({
      to: payload.recipient,
      message: payload.message,
    });

    if (!waResult.success) {
      return {
        provider: 'whatsapp',
        mode: 'real',
        status: 'failed',
        simulated: false,
        error: waResult.error || 'WhatsApp message dispatch failed.',
        timestamp: new Date().toISOString(),
        executionId,
      };
    }

    return {
      provider: 'whatsapp',
      mode: 'real',
      status: 'delivered',
      simulated: false,
      executionId: waResult.messageId || executionId,
      timestamp: new Date().toISOString(),
      recipient: payload.recipientLabel,
    };
  }

  return {
    provider: 'in-app',
    mode: 'real',
    status: 'delivered',
    simulated: false,
    executionId,
    timestamp: new Date().toISOString(),
    recipient: payload.recipientLabel,
  };
}

export const mockProvider = executeProvider;

export function buildTaskClientLookup(orgId: string, clientId: string) {
  if (!Types.ObjectId.isValid(clientId)) return null;
  return { _id: clientId, orgId, active: true, isDeleted: false };
}

async function resolveActualRecipients(orgId: string, event: Record<string, unknown>, recipients: string[]) {
  const resolved: Record<string, { name: string; email?: string; mobile?: string; id?: string }> = {};
  const activeUser = async (id: unknown) => {
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) return null;
    return UserModel.findOne({ _id: id, orgId, status: { $in: ['active', 'Active'] } }).select('name email mobile').lean().exec();
  };
  for (const role of new Set(recipients)) {
    if (role === 'Client') {
      const clientId = typeof event.clientId === 'string' ? event.clientId : '';
      const lookup = buildTaskClientLookup(orgId, clientId);
      if (lookup) {
        const client = await Client.findOne(lookup).select('name email mobile').lean().exec();
        if (client) {
          resolved[role] = { name: client.name, email: client.email || '', mobile: client.mobile || '', id: String(client._id) };
          continue;
        }
      }
      if (event.clientName || event.clientEmail) {
        resolved[role] = {
          name: String(event.clientName || 'Client'),
          email: String(event.clientEmail || ''),
          mobile: String(event.clientMobile || event.mobile || ''),
          id: clientId || '',
        };
      }
      continue;
    }
    const user = role === 'Assigned user' || role === 'Assignee' ? await activeUser(event.assigneeId)
      : role === 'Task owner' || role === 'Creator' ? await activeUser(event.createdBy || event.userId)
        : role === 'Responsible person' || role === 'Reviewer' ? await activeUser(event.reviewerId)
          : role === 'Account administrator' || role === 'Admin' || role === 'Manager' ? await UserModel.findOne({ orgId, role: { $in: ['admin', 'Admin', 'manager', 'Manager'] }, status: { $in: ['active', 'Active'] } }).sort({ createdAt: 1, _id: 1 }).select('name email mobile').lean().exec()
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
      ? { simulated: false, event: config.trigger, ...context.event }
      : { simulated: true, ...trigger.sampleEvent(config.conditions) };
    const event = (triggerData['task'] || triggerData['dsc'] || triggerData['license'] || context.event || {}) as Record<string, unknown>;
    const graph = config.workflowGraph as WorkflowGraph | undefined;
    const recipients = (Array.isArray(config.recipient) ? config.recipient : [config.recipient])
      .filter((recipient): recipient is string => typeof recipient === 'string');
    const graphRecipients = graph?.nodes.filter((node) => node.type === 'action').map((node) => String(node.config.recipient)) || [];
    const resolvedRecipients = context.event
      ? await resolveActualRecipients(context.orgId, event, [...recipients, ...graphRecipients])
      : undefined;
    const clientRecord = resolvedRecipients?.Client || {
      name: String(event.clientName || triggerData.clientName || 'Sample Company'),
      email: String(event.clientEmail || triggerData.clientEmail || 'sample.client@example.test'),
      mobile: String(event.clientMobile || triggerData.clientMobile || '+91 98765 43210'),
    };
    const isRealRun = Boolean(context.event && context.runType === 'actual');
    const taskContext = (triggerData['task'] || (agent.module === 'Task' ? event : undefined)) as Record<string, unknown> | undefined;
    const dscContext = (triggerData['dsc'] || (agent.module === 'DSC' ? event : undefined)) as Record<string, unknown> | undefined;
    const licenseContext = (triggerData['license'] || (agent.module === 'License' ? event : undefined)) as Record<string, unknown> | undefined;

    const defaultTask = {
      id: 'TASK-1001',
      taskId: 'TASK-1001',
      taskName: 'Prepare monthly compliance report',
      title: 'Prepare monthly compliance report',
      name: 'Prepare monthly compliance report',
      clientName: clientRecord.name,
      clientEmail: clientRecord.email,
      priority: 'High',
      status: 'In Progress',
      targetDueDate: '2026-01-15',
      dueDate: '2026-01-15',
      createdBy: 'Sample Manager',
      creatorName: 'Sample Manager',
      assignee: 'Sample User',
      assigneeName: 'Sample User',
      reviewer_name: 'Sample Reviewer',
      reviewerName: 'Sample Reviewer',
      expense_name: 'Design Assets',
      expense_amount: '₹ 15,000',
      your_firm_name: 'Ayatrio Practice',
      task_status: 'In Progress',
    };

    const defaultDsc = {
      id: 'DSC-2001',
      dscId: '#S00184',
      holder: 'Sample User',
      name: 'Sample User DSC',
      certificateClass: 'Class 3',
      expiryDate: '2026-02-01',
      vendor: 'eMudhra',
      clientName: clientRecord.name,
      clientEmail: clientRecord.email,
      your_firm_name: 'Ayatrio Practice',
    };

    const defaultLicense = {
      id: 'LIC-3001',
      licenseNo: 'LIC-78902',
      name: 'Sample Trade License',
      owner: clientRecord.name,
      expiryDate: '2026-02-01',
      clientName: clientRecord.name,
      clientEmail: clientRecord.email,
      your_firm_name: 'Ayatrio Practice',
    };

    const mergedTask = { ...defaultTask, ...(taskContext || (agent.module === 'Task' ? event : {})) };
    const mergedDsc = { ...defaultDsc, ...(dscContext || (agent.module === 'DSC' ? event : {})) };
    const mergedLicense = { ...defaultLicense, ...(licenseContext || (agent.module === 'License' ? event : {})) };

    const variables: Record<string, unknown> = {
      agent: { name: agent.name },
      event,
      ...triggerData,
      ...event,
      trigger: config.trigger,
      previewOnly: !isRealRun,
      resolvedRecipients,
      task: mergedTask,
      dsc: mergedDsc,
      license: mergedLicense,
      client: {
        name: clientRecord.name,
        email: clientRecord.email,
        mobile: clientRecord.mobile,
      },
      clientName: clientRecord.name,
      clientEmail: clientRecord.email,
      clientMobile: clientRecord.mobile,
      your_firm_name: String(event.your_firm_name || triggerData.your_firm_name || mergedTask.your_firm_name || 'Ayatrio Practice'),
      expense_name: String(event.expense_name || triggerData.expense_name || mergedTask.expense_name || 'Design Assets'),
      expense_amount: String(event.expense_amount || triggerData.expense_amount || mergedTask.expense_amount || '₹ 15,000'),
      reviewer_name: String(event.reviewer_name || triggerData.reviewer_name || mergedTask.reviewer_name || 'Sample Reviewer'),
      task_status: String(event.task_status || triggerData.task_status || event.status || mergedTask.status || 'In Progress'),
    };
    // The strict validator guarantees this list is normalized and valid.
    const graphRun = graph?.nodes.length ? await runGraph(graph, variables, context.failRecipient) : null;
    const results = graphRun ? graphRun.results : await Promise.all(recipients.map(async (recipient) => {
      const dbRecipient = resolvedRecipients?.[recipient];
      const resolved = resolveRecipientWithFallback(recipient, dbRecipient, !isRealRun);
      const recipientAddress = config.channel === 'Email' ? (resolved.email || '')
        : config.channel === 'WhatsApp' ? (resolved.mobile || '')
          : (resolved.id || '');
      const recipientData = {
        name: resolved.name,
        address: recipientAddress,
        email: resolved.email,
        mobile: resolved.mobile,
        id: resolved.id,
      };
      const renderedMessage = renderAgentTemplate(String(config.message), {
        ...variables,
        recipient: recipientData,
      });
      const renderedSubject = renderAgentTemplate(String(config.subject || config.action), {
        ...variables,
        recipient: recipientData,
      });
      const output = await mockProvider(String(config.channel), {
        recipient: recipientAddress,
        recipientLabel: recipient,
        message: renderedMessage,
        subject: renderedSubject,
        previewOnly: !isRealRun,
        simulateFailure: context.failRecipient === recipient,
      });
      return { recipient, ...output };
    }));

    const executionMode: 'real' | 'mock' = isRealRun ? 'real' : 'mock';
    const failed = results.filter((result) => result.status === 'failed');
    const status = graphRun && results.length === 0 ? 'skipped' : failed.length === results.length ? 'failed' : failed.length > 0 ? 'partial-failed' : 'success';
    const executedRecipients = graphRun ? [...new Set(graphRun.results.map((item) => String(item.recipient)))] : recipients;
    const renderedMessage = String(results[0]?.renderedMessage ?? renderAgentTemplate(String(config.message), variables));
    const result = {
      simulated: !isRealRun,
      executionMode,
      label: isRealRun
        ? failed.length === results.length
          ? 'Execution failed: no notifications were delivered.'
          : failed.length > 0
            ? 'Execution completed with partial delivery failures.'
            : 'Execution completed: notifications delivered.'
        : 'SIMULATED RUN: no notification was sent.',
      message: isRealRun
        ? `${agent.module} event “${config.trigger}” executed for “${agent.name}”. ${failed.length ? `${failed.length} delivery attempt(s) failed.` : 'All notifications delivered.'}`
        : context.event
          ? `${agent.module} event “${config.trigger}” matched “${agent.name}”. Actions were simulated; no real notification was sent.`
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
      steps: graphRun ? graphRun.trace.map((item) => item.type === 'condition' ? `${String(item.nodeName)} evaluated ${String(item.field)} ${String(item.operator)} ${String(item.expected)} as ${String(item.result)}; took ${String(item.branch)} branch.` : `${String(item.nodeName)} prepared a ${isRealRun ? 'real' : 'simulated'} ${String(item.provider)} action (${String(item.status)}).`) : [
        `Sample "${config.trigger}" event generated.`,
        'Conditions evaluated against the sample event.',
        `Recipients resolved (${isRealRun ? 'actual' : 'simulated'}): ${recipients.join(', ')}.`,
        isRealRun ? `Dispatched via ${String(config.channel)}.` : `Would deliver via ${String(config.channel)} (not sent).`,
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
      executionMode,
      runKey,
    });
    return run;
  }

  static async dispatchTaskEvent(orgId: string, triggerName: string, task: Record<string, unknown>, eventId: string) {
    if (!orgId || !eventId) return [];
    const agents = await Agent.find({ orgId, module: 'Task', status: 'published' }).select('_id config').exec();
    const matching = agents.filter((agent) => {
      const cfg = (agent.config as AgentConfig)?.trigger || '';
      return cfg.toLowerCase() === triggerName.toLowerCase();
    });
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
      expense_name: task.expense_name ? String(task.expense_name) : undefined,
      expense_amount: task.expense_amount ? String(task.expense_amount) : undefined,
      reviewer_name: task.reviewer_name ? String(task.reviewer_name) : undefined,
      your_firm_name: task.your_firm_name ? String(task.your_firm_name) : 'CA Practice Firm',
      task_status: task.status ? String(task.status) : undefined,
    };
    return Promise.all(matching.map((agent) => this.run(String(agent._id), {
      orgId,
      event: safeTask,
      runType: 'actual',
      idempotencyKey: `task-event:${eventId}:${String(agent._id)}`,
    })));
  }

  static async dispatchDscEvent(orgId: string, triggerName: string, dsc: Record<string, unknown>, eventId: string) {
    if (!orgId || !eventId) return [];
    const agents = await Agent.find({ orgId, module: 'DSC', status: 'published' }).select('_id config').exec();
    const matching = agents.filter((agent) => {
      const cfg = (agent.config as AgentConfig)?.trigger || '';
      return cfg.toLowerCase() === triggerName.toLowerCase();
    });
    return Promise.all(matching.map((agent) => this.run(String(agent._id), {
      orgId,
      event: dsc,
      runType: 'actual',
      idempotencyKey: `dsc-event:${eventId}:${String(agent._id)}`,
    })));
  }

  static async dispatchLicenseEvent(orgId: string, triggerName: string, license: Record<string, unknown>, eventId: string) {
    if (!orgId || !eventId) return [];
    const agents = await Agent.find({ orgId, module: 'License', status: 'published' }).select('_id config').exec();
    const matching = agents.filter((agent) => {
      const cfg = (agent.config as AgentConfig)?.trigger || '';
      return cfg.toLowerCase() === triggerName.toLowerCase();
    });
    return Promise.all(matching.map((agent) => this.run(String(agent._id), {
      orgId,
      event: license,
      runType: 'actual',
      idempotencyKey: `license-event:${eventId}:${String(agent._id)}`,
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
