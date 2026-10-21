import { FilterQuery } from 'mongoose';
import { AppError } from '../../shared/utils/apiError';
import { Agent } from './agent.model';
import { AgentConfig, AgentModule, AgentStatus, IAgent } from './agent.interface';
import { findTrigger, MODULES, RECIPIENTS, CHANNELS, ACTIONS } from './definitions';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

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

  if (typeof config.channel !== 'string' || !CHANNELS.includes(config.channel as (typeof CHANNELS)[number])) {
    errors.push(`Channel must be one of: ${CHANNELS.join(', ')}.`);
  }
  if (!isNonEmptyString(config.action)) errors.push('Action is required.');
  else if (!ACTIONS.includes(config.action as (typeof ACTIONS)[number])) errors.push(`Action must be one of: ${ACTIONS.join(', ')}.`);
  if (!isNonEmptyString(config.message)) errors.push('Message template is required.');
  else if (config.message.trim().length > 1000) errors.push('Message must be 1000 characters or fewer.');

  if (errors.length) return { valid: false, errors, config: null };
  return {
    valid: true,
    errors: [],
    config: {
      trigger: String(config.trigger),
      conditions,
      recipient: [...new Set(rawRecipients as string[])],
      channel: config.channel as AgentConfig['channel'],
      action: config.action as AgentConfig['action'],
      message: String(config.message).trim(),
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
  static async list(filters: { module?: AgentModule; status?: AgentStatus; search?: string } = {}) {
    const query: FilterQuery<IAgent> = {};
    if (filters.module) query.module = filters.module;
    if (filters.status) query.status = filters.status;
    if (filters.search?.trim()) query.name = { $regex: escapeRegex(filters.search.trim()), $options: 'i' };
    return Agent.find(query).sort({ updatedAt: -1, _id: -1 }).exec();
  }

  static async get(id: string) {
    const agent = await Agent.findById(id).exec();
    if (!agent) throw AppError.notFound('Agent not found.');
    return agent;
  }

  static async create(input: Record<string, unknown>) {
    const allowDraft = input.saveDraft === true;
    const normalized = normalizeAgentInput(input, allowDraft);
    const agent = new Agent({ ...normalized, status: 'draft', publishedAt: null });
    return agent.save();
  }

  static async update(id: string, input: Record<string, unknown>) {
    const existing = await Agent.findById(id).exec();
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

  static async publish(id: string) {
    const agent = await Agent.findById(id).exec();
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

  static async disable(id: string) {
    const agent = await Agent.findById(id).exec();
    if (!agent) throw AppError.notFound('Agent not found.');
    if (agent.status !== 'published') {
      throw AppError.conflict(`Only published agents can be disabled (this agent is ${agent.status}).`);
    }
    agent.status = 'disabled';
    await agent.save();
    return agent;
  }

  static validateConfig(moduleName: unknown, config: unknown) {
    return configValidation(moduleName, config);
  }
}
