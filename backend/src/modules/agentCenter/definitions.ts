import { AgentAction, AgentChannel, AgentModule, AgentRecipient } from './agent.interface';

export interface TriggerCondition {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
}

export interface TriggerDefinition {
  value: string;
  condition: TriggerCondition | null;
  sampleEvent: (conditions?: Record<string, number>) => Record<string, unknown>;
}

export interface ModuleDefinition {
  description: string;
  defaultMessage: string;
  triggers: TriggerDefinition[];
}

export const CHANNELS: AgentChannel[] = ['Email', 'WhatsApp', 'In-app'];
export const RECIPIENTS: AgentRecipient[] = [
  'Assigned user',
  'Task owner',
  'Account administrator',
  'Responsible person',
];
export const ACTIONS: AgentAction[] = [
  'Send notification',
  'Send expiry reminder',
  'Send renewal reminder',
  'Notify assignee',
];
export const MODULES: AgentModule[] = ['Task', 'DSC', 'License'];

const expiryCondition = (): TriggerCondition => ({
  key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30,
});
const dueCondition = (): TriggerCondition => ({
  key: 'daysBeforeDue', label: 'Days before due date', min: 1, max: 90, default: 2,
});

// Fictional fixed sample records make test runs deterministic and do not read live business data.
const SAMPLE_TASK = {
  id: 'TASK-1001',
  title: 'Prepare monthly compliance report',
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

export const MODULE_DEFINITIONS: Record<AgentModule, ModuleDefinition> = {
  Task: {
    description: 'Task creation, assignment notifications, and reminders',
    defaultMessage: 'Hello, this is a reminder regarding your task.',
    triggers: [
      { value: 'Task created', condition: null, sampleEvent: () => ({ event: 'Task created', task: SAMPLE_TASK }) },
      { value: 'Task assigned', condition: null, sampleEvent: () => ({ event: 'Task assigned', task: SAMPLE_TASK, assignedTo: SAMPLE_TASK.assignee }) },
      { value: 'Task due soon', condition: dueCondition(), sampleEvent: (c) => ({ event: 'Task due soon', task: SAMPLE_TASK, daysUntilDue: c?.daysBeforeDue ?? 2 }) },
      { value: 'Task Completed & Final Document Uploaded', condition: null, sampleEvent: taskEvent('Task Completed & Final Document Uploaded') },
      { value: 'Comment Added', condition: null, sampleEvent: taskEvent('Comment Added') },
      { value: 'Timesheet Log Added', condition: null, sampleEvent: taskEvent('Timesheet Log Added') },
      { value: 'Expense Added', condition: null, sampleEvent: taskEvent('Expense Added') },
      { value: 'Due Date Approaching', condition: dueCondition(), sampleEvent: (c) => ({ event: 'Due Date Approaching', task: SAMPLE_TASK, daysUntilDue: c?.daysBeforeDue ?? 2 }) },
      { value: 'Due Date Changed', condition: null, sampleEvent: taskEvent('Due Date Changed') },
      { value: 'Priority Changed', condition: null, sampleEvent: taskEvent('Priority Changed') },
      { value: 'Status Changed', condition: null, sampleEvent: taskEvent('Status Changed') },
      { value: 'Task Completed', condition: null, sampleEvent: taskEvent('Task Completed') },
      { value: 'Task Deleted', condition: null, sampleEvent: taskEvent('Task Deleted') },
      { value: 'Task Sent for Review', condition: null, sampleEvent: taskEvent('Task Sent for Review') },
      { value: 'Task Put on Hold', condition: null, sampleEvent: taskEvent('Task Put on Hold') },
      { value: 'Sub-Status Changed', condition: null, sampleEvent: taskEvent('Sub-Status Changed') },
      { value: 'Subtask Status Changed', condition: null, sampleEvent: taskEvent('Subtask Status Changed') },
      { value: 'Files Uploaded', condition: null, sampleEvent: taskEvent('Files Uploaded') },
    ],
  },
  DSC: {
    description: 'Digital signature certificate expiry and renewal reminders',
    defaultMessage: 'Your digital signature certificate is approaching expiry.',
    triggers: [
      { value: 'DSC expiry approaching', condition: expiryCondition(), sampleEvent: (c) => ({ event: 'DSC expiry approaching', dsc: SAMPLE_DSC, daysToExpiry: c?.daysBeforeExpiry ?? 30 }) },
      { value: 'DSC expired', condition: null, sampleEvent: () => ({ event: 'DSC expired', dsc: SAMPLE_DSC, expired: true }) },
      { value: 'Renewal required', condition: expiryCondition(), sampleEvent: (c) => ({ event: 'Renewal required', dsc: SAMPLE_DSC, renewalWindowDays: c?.daysBeforeExpiry ?? 30 }) },
    ],
  },
  License: {
    description: 'License expiry reminders and renewal notifications',
    defaultMessage: 'Your license is approaching expiry.',
    triggers: [
      { value: 'License expiry approaching', condition: expiryCondition(), sampleEvent: (c) => ({ event: 'License expiry approaching', license: SAMPLE_LICENSE, daysToExpiry: c?.daysBeforeExpiry ?? 30 }) },
      { value: 'License expired', condition: null, sampleEvent: () => ({ event: 'License expired', license: SAMPLE_LICENSE, expired: true }) },
      { value: 'Renewal required', condition: expiryCondition(), sampleEvent: (c) => ({ event: 'Renewal required', license: SAMPLE_LICENSE, renewalWindowDays: c?.daysBeforeExpiry ?? 30 }) },
    ],
  },
};

export function findTrigger(moduleName: unknown, value: unknown): TriggerDefinition | null {
  if (typeof moduleName !== 'string' || !MODULES.includes(moduleName as AgentModule)) return null;
  if (typeof value !== 'string') return null;
  return MODULE_DEFINITIONS[moduleName as AgentModule].triggers.find((trigger) => trigger.value === value) ?? null;
}

export function getPublicDefinitions() {
  const modules = {} as Record<AgentModule, Omit<ModuleDefinition, 'triggers'> & { triggers: Array<{ value: string; condition: TriggerCondition | null }> }>;
  for (const moduleName of MODULES) {
    const definition = MODULE_DEFINITIONS[moduleName];
    modules[moduleName] = {
      description: definition.description,
      defaultMessage: definition.defaultMessage,
      triggers: definition.triggers.map(({ value, condition }) => ({ value, condition })),
    };
  }
  return { modules, recipients: RECIPIENTS, channels: CHANNELS, actions: ACTIONS };
}
