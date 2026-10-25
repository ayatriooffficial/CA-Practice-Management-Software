import { FilterQuery } from 'mongoose';
import { AppError } from '../../shared/utils/apiError';
import { Agent } from './agent.model';
import { AgentConfig, AgentModule, AgentStatus, IAgent, WorkflowGraph } from './agent.interface';
import { findTrigger, MODULES, RECIPIENTS, CHANNELS, ACTIONS, getPublicDefinitions } from './definitions';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const PUBLIC_DEFINITIONS = getPublicDefinitions();
const TEMPLATE_VARIABLES = new Set(PUBLIC_DEFINITIONS.templateVariables);

function validateTemplateVariables(template: string, label: string, errors: string[]) {
  const matches = template.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g);
  for (const [, variable] of matches) {
    if (!TEMPLATE_VARIABLES.has(variable)) errors.push(`${label} uses unsupported template variable "${variable}".`);
  }
}

interface NormalizedAgentInput {
  name: string;
  module: AgentModule;
  description: string;
  config: AgentConfig;
}

function configValidation(moduleName: unknown, config: unknown): { valid: boolean; errors: string[]; config: AgentConfig | null } {
  if (!isPlainObject(config)) return { valid: false, errors: ['Configuration is required.'], config: null };
  const errors: string[] = [];
  const trigger = findTrigger(moduleName, config.trigger);
  if (!isNonEmptyString(config.trigger)) errors.push('Trigger is required.');
  else if (MODULES.includes(moduleName as AgentModule) && !trigger) {
    errors.push(`Trigger "${String(config.trigger)}" is not available for the ${String(moduleName)} module.`);
  } else if (trigger && !trigger.runtimeAvailable) {
    errors.push(`${trigger.value} cannot be published: ${trigger.supportReason || 'no runtime event source is configured'}`);
  }

  const conditions: Record<string, number> = {};
  if (trigger?.condition) {
    const { key, label, min, max, default: defaultValue } = trigger.condition;
    const raw = isPlainObject(config.conditions) ? config.conditions[key] : undefined;
    if (raw === undefined || raw === null || raw === '') conditions[key] = defaultValue;
    else if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < min || raw > max) {
      errors.push(`${label} must be a whole number between ${min} and ${max}.`);
    } else conditions[key] = raw;
  }

  const rawRecipients = Array.isArray(config.recipient)
    ? config.recipient
    : config.recipient
      ? [config.recipient]
      : [];
  if (!rawRecipients.length) errors.push('Recipient is required.');
  else if (rawRecipients.some((recipient) => typeof recipient !== 'string' || !RECIPIENTS.includes(recipient as (typeof RECIPIENTS)[number]))) {
    errors.push(`Recipient must be one or more of: ${RECIPIENTS.join(', ')}.`);
  }
  const hasClientRecipient = rawRecipients.includes('Client');
  const recipientResolution = config.recipientResolution;
  if (hasClientRecipient) {
    if (moduleName === 'Task') {
      if (!isPlainObject(recipientResolution) || recipientResolution.mode !== 'task-linked-client' || recipientResolution.relationship !== 'trigger-record') {
        errors.push('Client recipients must resolve to the client linked to the triggering task.');
      }
    } else if (recipientResolution !== undefined && !isPlainObject(recipientResolution)) {
      errors.push('Client recipient resolution configuration must be an object.');
    }
  }

  if (typeof config.channel !== 'string' || !CHANNELS.includes(config.channel as (typeof CHANNELS)[number])) {
    errors.push(`Channel must be one of: ${CHANNELS.join(', ')}.`);
  }
  if (!isNonEmptyString(config.action)) errors.push('Action is required.');
  else if (!ACTIONS.includes(config.action as (typeof ACTIONS)[number])) errors.push(`Action must be one of: ${ACTIONS.join(', ')}.`);
  if (!isNonEmptyString(config.message)) errors.push('Message template is required.');
  else if (config.message.trim().length > 1000) errors.push('Message must be 1000 characters or fewer.');
  const templateId = typeof config.templateId === 'string' ? config.templateId : 'custom';
  if (config.templateId !== undefined && typeof config.templateId !== 'string') errors.push('Selected email template identifier must be text.');
  const knownTemplate = templateId === 'custom' || PUBLIC_DEFINITIONS.emailTemplates.some((item) => item.id === templateId);
  if (!knownTemplate) errors.push('Selected email template is unavailable.');
  if (config.subject !== undefined && typeof config.subject !== 'string') errors.push('Email subject must be text.');
  const subject = config.subject === undefined ? String(config.action || 'Notification') : typeof config.subject === 'string' ? config.subject : '';
  if (config.channel === 'Email' && !isNonEmptyString(subject)) errors.push('Email subject is required.');
  if (subject.trim().length > 200) errors.push('Email subject must be 200 characters or fewer.');
  validateTemplateVariables(subject, 'Email subject', errors);
  if (typeof config.message === 'string') validateTemplateVariables(config.message, 'Message template', errors);

  let workflowGraph: WorkflowGraph | undefined;
  if (config.workflowGraph !== undefined) {
    const rawGraph = config.workflowGraph;
    if (!isPlainObject(rawGraph) || !Array.isArray(rawGraph.nodes) || !Array.isArray(rawGraph.edges)) {
      errors.push('Workflow graph must contain nodes and edges arrays.');
    } else {
      const nodes = rawGraph.nodes as unknown[];
      const edges = rawGraph.edges as unknown[];
      if (nodes.length > 12 || edges.length > 32) errors.push('Workflow graphs may contain at most 12 nodes and 32 connections.');
      const nodeIds = new Set<string>();
      const normalizedNodes: WorkflowGraph['nodes'] = [];
      const allowedFields: Record<string, string[]> = {
        Task: ['task.priority', 'task.status', 'task.taskName', 'task.clientName', 'task.targetDueDate'],
        DSC: ['dsc.expiryDate'],
        License: ['license.expiryDate'],
      };
      for (const [index, rawNode] of nodes.entries()) {
        if (!isPlainObject(rawNode) || !isPlainObject(rawNode.config) || typeof rawNode.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(rawNode.id) || !['action', 'condition'].includes(String(rawNode.type)) || !isNonEmptyString(rawNode.name)) {
          errors.push(`Workflow node ${index + 1} is malformed.`); continue;
        }
        if (nodeIds.has(rawNode.id)) errors.push(`Workflow node identifier "${rawNode.id}" is duplicated.`);
        nodeIds.add(rawNode.id);
        const nodeConfig = rawNode.config;
        if (rawNode.type === 'action') {
          const validChannel = CHANNELS.includes(nodeConfig.channel as (typeof CHANNELS)[number]);
          if (!validChannel) errors.push(`${rawNode.name}: choose a supported channel.`);
          if (!RECIPIENTS.includes(nodeConfig.recipient as (typeof RECIPIENTS)[number])) errors.push(`${rawNode.name}: choose a supported recipient role.`);
          if (nodeConfig.recipient === 'Client' && nodeConfig.recipientResolution !== undefined && !isPlainObject(nodeConfig.recipientResolution)) errors.push(`${rawNode.name}: Client resolution must be a valid configuration object.`);
          if (!ACTIONS.includes(nodeConfig.action as (typeof ACTIONS)[number])) errors.push(`${rawNode.name}: choose a supported action.`);
          if (!isNonEmptyString(nodeConfig.message) || nodeConfig.message.length > 1000) errors.push(`${rawNode.name}: message must contain 1 to 1000 characters.`);
          const nodeSubject = nodeConfig.subject === undefined ? String(nodeConfig.action || rawNode.name) : nodeConfig.subject;
          if (validChannel && nodeConfig.channel === 'Email' && !isNonEmptyString(nodeSubject)) errors.push(`${rawNode.name}: email subject is required.`);
          if (typeof nodeSubject === 'string' && nodeSubject.length > 200) errors.push(`${rawNode.name}: subject must be 200 characters or fewer.`);
          if (typeof nodeSubject === 'string') validateTemplateVariables(nodeSubject, `${rawNode.name} subject`, errors);
          if (typeof nodeConfig.message === 'string') validateTemplateVariables(nodeConfig.message, `${rawNode.name} message`, errors);
          if (nodeConfig.templateId !== undefined && nodeConfig.templateId !== 'custom' && !PUBLIC_DEFINITIONS.emailTemplates.some((item) => item.id === nodeConfig.templateId)) errors.push(`${rawNode.name}: selected template is unavailable.`);
        } else {
          const validOperators = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists'];
          if (typeof nodeConfig.field !== 'string' || !allowedFields[String(moduleName)]?.includes(nodeConfig.field)) errors.push(`${rawNode.name}: field is not available for this module.`);
          if (!validOperators.includes(String(nodeConfig.operator))) errors.push(`${rawNode.name}: condition operator is unsupported.`);
          if (nodeConfig.operator !== 'exists' && (typeof nodeConfig.value !== 'string' || nodeConfig.value.length > 200 || !nodeConfig.value.trim())) errors.push(`${rawNode.name}: comparison value is required (maximum 200 characters).`);
          if (nodeConfig.operator === 'contains' && !['task.taskName', 'task.clientName'].includes(String(nodeConfig.field))) errors.push(`${rawNode.name}: contains is only supported for task text fields.`);
          if (['greater_than', 'less_than'].includes(String(nodeConfig.operator)) && !['task.targetDueDate', 'dsc.expiryDate', 'license.expiryDate'].includes(String(nodeConfig.field))) errors.push(`${rawNode.name}: date comparison is only supported for expiry and due dates.`);
          if (['greater_than', 'less_than'].includes(String(nodeConfig.operator)) && (typeof nodeConfig.value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(nodeConfig.value) || !Number.isFinite(Date.parse(nodeConfig.value)))) errors.push(`${rawNode.name}: date comparison value must be a valid YYYY-MM-DD date.`);
        }
        normalizedNodes.push({ id: rawNode.id, type: rawNode.type as 'action' | 'condition', name: rawNode.name.trim().slice(0, 80), config: { ...nodeConfig, ...(rawNode.type === 'action' && nodeConfig.subject === undefined ? { subject: String(nodeConfig.action || rawNode.name) } : {}) } });
      }
      const normalizedEdges: WorkflowGraph['edges'] = [];
      const outputs = new Set<string>();
      const edgeIds = new Set<string>();
      for (const [index, rawEdge] of edges.entries()) {
        if (!isPlainObject(rawEdge) || typeof rawEdge.id !== 'string' || typeof rawEdge.source !== 'string' || typeof rawEdge.target !== 'string' || !nodeIds.has(rawEdge.source) || (rawEdge.target !== '__end__' && !nodeIds.has(rawEdge.target)) || !['true', 'false', 'next'].includes(String(rawEdge.sourceHandle))) {
          errors.push(`Workflow connection ${index + 1} is malformed or references a missing node.`); continue;
        }
        if (edgeIds.has(rawEdge.id)) errors.push(`Workflow connection identifier "${rawEdge.id}" is duplicated.`);
        edgeIds.add(rawEdge.id);
        const edgeKey = `${rawEdge.source}:${rawEdge.sourceHandle}`;
        if (outputs.has(edgeKey)) errors.push(`Workflow node "${rawEdge.source}" has duplicate ${String(rawEdge.sourceHandle)} connections.`);
        outputs.add(edgeKey);
        normalizedEdges.push({ id: rawEdge.id.slice(0, 180), source: rawEdge.source, target: rawEdge.target, sourceHandle: rawEdge.sourceHandle as 'true' | 'false' | 'next' });
      }
      for (const node of normalizedNodes) {
        const nodeEdges = normalizedEdges.filter((edge) => edge.source === node.id);
        if (node.type === 'condition' && (!outputs.has(`${node.id}:true`) || !outputs.has(`${node.id}:false`) || nodeEdges.length !== 2 || nodeEdges.some((edge) => !['true', 'false'].includes(String(edge.sourceHandle))))) errors.push(`${node.name}: connect only the true and false branches, including End workflow.`);
        if (node.type === 'action' && (normalizedEdges.filter((edge) => edge.source === node.id).some((edge) => edge.sourceHandle !== 'next') || normalizedEdges.filter((edge) => edge.source === node.id).length > 1)) errors.push(`${node.name}: action nodes can have at most one next connection.`);
      }
      const nodeMap = new Map(normalizedNodes.map((node) => [node.id, node]));
      if (normalizedNodes.length && !normalizedNodes.some((node) => node.type === 'action')) errors.push('Workflow graph must contain at least one action.');
      const visiting = new Set<string>();
      const reachable = new Set<string>();
      const walk = (id: string): boolean => {
        if (visiting.has(id)) return false;
        if (reachable.has(id)) return true;
        visiting.add(id); reachable.add(id);
        for (const connection of normalizedEdges.filter((item) => item.source === id && item.target !== '__end__')) if (!walk(connection.target)) return false;
        visiting.delete(id); return true;
      };
      if (normalizedNodes.length && !walk(normalizedNodes[0].id)) errors.push('Workflow connections cannot contain cycles.');
      if (reachable.size !== normalizedNodes.length) errors.push('Every workflow node must be reachable from the first node.');
      if (normalizedNodes.length && !nodeMap.has(normalizedNodes[0].id)) errors.push('Workflow graph has no valid entry node.');
      workflowGraph = { nodes: normalizedNodes, edges: normalizedEdges };
    }
  }

  if (errors.length) return { valid: false, errors, config: null };
  return {
    valid: true,
    errors: [],
    config: {
      trigger: String(config.trigger),
      conditions,
      recipient: [...new Set(rawRecipients as string[])],
      ...(hasClientRecipient ? { recipientResolution: { mode: 'task-linked-client' as const, relationship: 'trigger-record' as const } } : {}),
      channel: config.channel as AgentConfig['channel'],
      action: config.action as AgentConfig['action'],
      subject,
      templateId,
      message: String(config.message).trim(),
      ...(workflowGraph ? { workflowGraph } : {}),
    },
  };
}

function normalizeAgentInput(input: Record<string, unknown>, allowDraft: boolean): NormalizedAgentInput {
  const errors: string[] = [];
  if (!isNonEmptyString(input.name)) errors.push('Name is required.');
  else if (input.name.trim().length > 100) errors.push('Name must be 100 characters or fewer.');
  if (!MODULES.includes(input.module as AgentModule)) errors.push('Module must be Task, DSC, or License.');
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') errors.push('Description must be text.');
    else if (input.description.trim().length > 500) errors.push('Description must be 500 characters or fewer.');
  }
  if (!isPlainObject(input.config)) errors.push('Configuration is required.');

  let nextConfig: AgentConfig = isPlainObject(input.config) ? input.config as AgentConfig : {};
  if (!allowDraft && !errors.length) {
    const validation = configValidation(input.module, nextConfig);
    errors.push(...validation.errors);
    if (validation.valid && validation.config) nextConfig = validation.config;
  }

  if (errors.length) {
    throw AppError.badRequest(errors.join(' '), errors.map((message) => ({ field: 'agent', message })));
  }

  return {
    name: String(input.name).trim(),
    module: input.module as AgentModule,
    description: typeof input.description === 'string' ? input.description.trim() : '',
    config: nextConfig,
  };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class AgentCenterService {
  static async list(orgId: string, filters: { module?: AgentModule; status?: AgentStatus; search?: string } = {}) {
    const query: FilterQuery<IAgent> = { orgId };
    if (filters.module) query.module = filters.module;
    if (filters.status) query.status = filters.status;
    if (filters.search?.trim()) query.name = { $regex: escapeRegex(filters.search.trim()), $options: 'i' };
    return Agent.find(query).sort({ updatedAt: -1, _id: -1 }).exec();
  }

  static async get(id: string, orgId: string) {
    const agent = await Agent.findOne({ _id: id, orgId }).exec();
    if (!agent) throw AppError.notFound('Agent not found.');
    return agent;
  }

  static async create(input: Record<string, unknown>, orgId: string) {
    const allowDraft = input.saveDraft === true;
    const normalized = normalizeAgentInput(input, allowDraft);
    const agent = new Agent({ ...normalized, orgId, status: 'draft', publishedAt: null });
    return agent.save();
  }

  static async update(id: string, input: Record<string, unknown>, orgId: string) {
    const existing = await Agent.findOne({ _id: id, orgId }).exec();
    if (!existing) throw AppError.notFound('Agent not found.');
    if (existing.status !== 'draft') {
      throw AppError.conflict(`Only draft agents can be edited (this agent is ${existing.status}).`);
    }
    const merged: Record<string, unknown> = {
      name: input.name ?? existing.name,
      module: input.module ?? existing.module,
      description: input.description ?? existing.description,
      config: input.config ?? existing.config,
    };
    const normalized = normalizeAgentInput(merged, input.saveDraft === true);
    existing.name = normalized.name;
    existing.module = normalized.module;
    existing.description = normalized.description;
    existing.config = normalized.config;
    await existing.save();
    return existing;
  }

  static async publish(id: string, orgId: string) {
    const agent = await Agent.findOne({ _id: id, orgId }).exec();
    if (!agent) throw AppError.notFound('Agent not found.');
    if (agent.status !== 'draft') {
      throw AppError.conflict(`Only drafts can be published (this agent is ${agent.status}).`);
    }
    const normalized = normalizeAgentInput({
      name: agent.name,
      module: agent.module,
      description: agent.description,
      config: agent.config,
    }, false);
    agent.config = normalized.config;
    agent.status = 'published';
    agent.publishedAt = new Date();
    await agent.save();
    return agent;
  }

  static async disable(id: string, orgId: string) {
    const agent = await Agent.findOne({ _id: id, orgId }).exec();
    if (!agent) throw AppError.notFound('Agent not found.');
    if (agent.status !== 'published') {
      throw AppError.conflict(`Only published agents can be disabled (this agent is ${agent.status}).`);
    }
    agent.status = 'disabled';
    await agent.save();
    return agent;
  }

  static async deleteDraft(id: string, orgId: string) {
    const agent = await Agent.findOne({ _id: id, orgId }).exec();
    if (!agent) throw AppError.notFound('Agent not found.');
    if (agent.status !== 'draft') throw AppError.conflict('Only draft agents can be deleted. Disable a published agent first.');
    await agent.deleteOne();
    return { id, deleted: true };
  }

  static validateConfig(moduleName: unknown, config: unknown) {
    return configValidation(moduleName, config);
  }
}
