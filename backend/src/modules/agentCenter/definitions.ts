import { AgentAction, AgentChannel, AgentModule, AgentRecipient, PUBLIC_AGENT_DEFINITIONS } from './catalog';

export interface TriggerCondition {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
}

export interface TriggerDefinition {
  value: string;
  description?: string;
  condition: TriggerCondition | null;
  sampleEvent: (conditions?: Record<string, number>) => Record<string, unknown>;
  runtimeAvailable: boolean;
  supportReason?: string;
}

export interface ModuleDefinition {
  description: string;
  defaultMessage: string;
  triggers: TriggerDefinition[];
}

export interface AgentEmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
}

export const CHANNELS: AgentChannel[] = [...PUBLIC_AGENT_DEFINITIONS.channels] as AgentChannel[];
export const RECIPIENTS: AgentRecipient[] = [...PUBLIC_AGENT_DEFINITIONS.recipients] as AgentRecipient[];
export const ACTIONS: AgentAction[] = [...PUBLIC_AGENT_DEFINITIONS.actions] as AgentAction[];
export const MODULES: AgentModule[] = Object.keys(PUBLIC_AGENT_DEFINITIONS.modules) as AgentModule[];

const LIVE_TASK_TRIGGERS = new Set([
  'Task created', 'Task assigned', 'Due Date Changed', 'Priority Changed', 'Status Changed',
  'Task Completed', 'Task Deleted', 'Task Sent for Review', 'Task Put on Hold', 'Comment Added',
  'Subtask Status Changed', 'Files Uploaded',
]);

function triggerSupport(moduleName: AgentModule, trigger: string) {
  if (moduleName === 'Task' && LIVE_TASK_TRIGGERS.has(trigger)) return { runtimeAvailable: true };
  if (moduleName !== 'Task') return { runtimeAvailable: false, supportReason: 'No expiry scheduler is configured for this record type.' };
  if (trigger.toLowerCase().includes('due') || trigger.toLowerCase().includes('expiry')) return { runtimeAvailable: false, supportReason: 'Scheduler configuration required: no scheduled worker evaluates date-based triggers.' };
  return { runtimeAvailable: false, supportReason: 'No application event source currently emits this event.' };
}

// Fixed sample records are used only by the backend's deterministic test-run simulation.
const SAMPLE_TASK = {
  id: 'TASK-1001',
  title: 'Prepare monthly compliance report',
  taskName: 'Prepare monthly compliance report',
  clientName: 'Sample Company',
  priority: 'High',
  status: 'In Progress',
  targetDueDate: '2026-01-15',
  createdBy: 'Sample Manager',
  assignee: 'Sample User',
  dueDate: '2026-01-15',
};
const SAMPLE_DSC = {
  id: 'DSC-2001', holder: 'Sample User', certificateClass: 'Class 3', expiryDate: '2026-02-01',
};
const SAMPLE_LICENSE = {
  id: 'LIC-3001', name: 'Sample Trade License', owner: 'Sample Company', expiryDate: '2026-02-01',
};

const taskEvent = (event: string) => () => ({ event, task: SAMPLE_TASK });

function sampleEventFor(moduleName: AgentModule, trigger: string): TriggerDefinition['sampleEvent'] {
  if (moduleName === 'Task') {
    if (trigger === 'Task created') return () => ({ event: trigger, task: SAMPLE_TASK });
    if (trigger === 'Task assigned') return () => ({ event: trigger, task: SAMPLE_TASK, assignedTo: SAMPLE_TASK.assignee });
    if (trigger === 'Task due soon') return (conditions) => ({ event: trigger, task: SAMPLE_TASK, daysUntilDue: conditions?.daysBeforeDue ?? 2 });
    if (trigger === 'Due Date Approaching') return (conditions) => ({ event: trigger, task: SAMPLE_TASK, daysUntilDue: conditions?.daysBeforeDue ?? 2 });
    return taskEvent(trigger);
  }

  if (moduleName === 'DSC') {
    if (trigger === 'DSC expiry approaching') return (conditions) => ({ event: trigger, dsc: SAMPLE_DSC, daysToExpiry: conditions?.daysBeforeExpiry ?? 30 });
    if (trigger === 'DSC expired') return () => ({ event: trigger, dsc: SAMPLE_DSC, expired: true });
    return (conditions) => ({ event: trigger, dsc: SAMPLE_DSC, renewalWindowDays: conditions?.daysBeforeExpiry ?? 30 });
  }

  if (trigger === 'License expiry approaching') return (conditions) => ({ event: trigger, license: SAMPLE_LICENSE, daysToExpiry: conditions?.daysBeforeExpiry ?? 30 });
  if (trigger === 'License expired') return () => ({ event: trigger, license: SAMPLE_LICENSE, expired: true });
  return (conditions) => ({ event: trigger, license: SAMPLE_LICENSE, renewalWindowDays: conditions?.daysBeforeExpiry ?? 30 });
}

export const MODULE_DEFINITIONS = Object.fromEntries(
  MODULES.map((moduleName) => {
    const definition = PUBLIC_AGENT_DEFINITIONS.modules[moduleName];
    return [moduleName, {
      description: definition.description,
      defaultMessage: definition.defaultMessage,
      triggers: definition.triggers.map((trigger) => ({
        ...trigger,
        ...triggerSupport(moduleName, trigger.value),
        sampleEvent: sampleEventFor(moduleName, trigger.value),
      })),
    }];
  })
) as Record<AgentModule, ModuleDefinition>;

export function findTrigger(moduleName: unknown, value: unknown): TriggerDefinition | null {
  if (typeof moduleName !== 'string' || !MODULES.includes(moduleName as AgentModule)) return null;
  if (typeof value !== 'string') return null;
  return MODULE_DEFINITIONS[moduleName as AgentModule].triggers.find((trigger) => trigger.value === value) ?? null;
}

export function getPublicDefinitions() {
  const modules = {} as Record<AgentModule, Omit<ModuleDefinition, 'triggers'> & { triggers: Array<{ value: string; description: string; condition: TriggerCondition | null; runtimeAvailable: boolean; supportReason?: string }> }>;
  for (const moduleName of MODULES) {
    const definition = MODULE_DEFINITIONS[moduleName];
    modules[moduleName] = {
      description: definition.description,
      defaultMessage: definition.defaultMessage,
      triggers: definition.triggers.map(({ value, description, condition, runtimeAvailable, supportReason }) => ({ value, description: description || supportReason || `${value} event`, condition, runtimeAvailable, supportReason })),
    };
  }
  return {
    modules,
    recipients: RECIPIENTS,
    channels: CHANNELS,
    actions: ACTIONS,
    emailTemplates: PUBLIC_AGENT_DEFINITIONS.emailTemplates as AgentEmailTemplate[],
    templateVariables: [...PUBLIC_AGENT_DEFINITIONS.templateVariables],
  };
}
