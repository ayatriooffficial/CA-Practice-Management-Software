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

function triggerSupport(_moduleName: AgentModule, _trigger: string) {
  // All listed Task, DSC, and License triggers are supported via real domain event
  // dispatching and the background automated scheduler.
  return { runtimeAvailable: true };
}

// Fixed sample records are used only by the backend's deterministic test-run simulation.
const SAMPLE_TASK = {
  id: 'TASK-1001',
  taskId: 'TASK-1001',
  title: 'Prepare monthly compliance report',
  taskName: 'Prepare monthly compliance report',
  name: 'Prepare monthly compliance report',
  clientName: 'Sample Company',
  clientEmail: 'sample.client@example.test',
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

const SAMPLE_DSC = {
  id: 'DSC-2001',
  dscId: '#S00184',
  holder: 'Sample User',
  name: 'Sample User DSC',
  certificateClass: 'Class 3',
  expiryDate: '2026-02-01',
  vendor: 'eMudhra',
  clientName: 'Sample Company',
  clientEmail: 'sample.client@example.test',
  your_firm_name: 'Ayatrio Practice',
};

const SAMPLE_LICENSE = {
  id: 'LIC-3001',
  licenseNo: 'LIC-78902',
  name: 'Sample Trade License',
  owner: 'Sample Company',
  expiryDate: '2026-02-01',
  clientName: 'Sample Company',
  clientEmail: 'sample.client@example.test',
  your_firm_name: 'Ayatrio Practice',
};

const taskEvent = (event: string) => () => ({ event, task: SAMPLE_TASK, ...SAMPLE_TASK });

function sampleEventFor(moduleName: AgentModule, trigger: string): TriggerDefinition['sampleEvent'] {
  const norm = trigger.toLowerCase();
  if (moduleName === 'Task') {
    if (norm === 'task created') return () => ({ event: trigger, task: SAMPLE_TASK, ...SAMPLE_TASK });
    if (norm === 'task assigned') return () => ({ event: trigger, task: SAMPLE_TASK, assignedTo: SAMPLE_TASK.assignee, ...SAMPLE_TASK });
    if (norm === 'due date approaching' || norm === 'task due soon') return (conditions) => ({ event: trigger, task: SAMPLE_TASK, daysUntilDue: conditions?.daysBeforeDue ?? 2, ...SAMPLE_TASK });
    if (norm === 'task overdue') return () => ({ event: trigger, task: SAMPLE_TASK, overdueDays: 3, ...SAMPLE_TASK });
    if (norm === 'document request (repeating)') return (conditions) => ({ event: trigger, task: SAMPLE_TASK, repeatIntervalDays: conditions?.repeatIntervalDays ?? 3, ...SAMPLE_TASK });
    return taskEvent(trigger);
  }

  if (moduleName === 'DSC') {
    if (norm.includes('approaching') || norm.includes('renewal')) return (conditions) => ({ event: trigger, dsc: SAMPLE_DSC, daysToExpiry: conditions?.daysBeforeExpiry ?? 30, ...SAMPLE_DSC });
    if (norm.includes('expired')) return () => ({ event: trigger, dsc: SAMPLE_DSC, expired: true, ...SAMPLE_DSC });
    return () => ({ event: trigger, dsc: SAMPLE_DSC, ...SAMPLE_DSC });
  }

  if (norm.includes('approaching') || norm.includes('renewal')) return (conditions) => ({ event: trigger, license: SAMPLE_LICENSE, daysToExpiry: conditions?.daysBeforeExpiry ?? 30, ...SAMPLE_LICENSE });
  if (norm.includes('expired')) return () => ({ event: trigger, license: SAMPLE_LICENSE, expired: true, ...SAMPLE_LICENSE });
  return () => ({ event: trigger, license: SAMPLE_LICENSE, ...SAMPLE_LICENSE });
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
  const list = MODULE_DEFINITIONS[moduleName as AgentModule].triggers;
  // Try exact match first
  const exact = list.find((trigger) => trigger.value === value);
  if (exact) return exact;
  // Fall back to normalized case-insensitive match
  const valLower = value.trim().toLowerCase();
  return list.find((trigger) => trigger.value.toLowerCase() === valLower) ?? null;
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
