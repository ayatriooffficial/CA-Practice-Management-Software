export type AgentModule = 'Task' | 'DSC' | 'License';
export type AgentStatus = 'draft' | 'published' | 'disabled';
export type AgentChannel = 'Email' | 'WhatsApp' | 'In-app';
export type AgentAction =
  | 'Send notification'
  | 'Send expiry reminder'
  | 'Send renewal reminder'
  | 'Notify assignee';
export type AgentRecipient =
  | 'Client'
  | 'Assigned user'
  | 'Task owner'
  | 'Account administrator'
  | 'Responsible person';

/**
 * Static Agent Center catalog shared with the frontend. Dynamic agent records
 * and execution history remain backend data and are never represented here.
 */
export const PUBLIC_AGENT_DEFINITIONS = {
  modules: {
    Task: {
      symbol: 'T',
      cardDescription: 'Task creation, assignment notifications, and reminders.',
      description: 'Agents for task creation, assignment notifications, and reminders.',
      defaultMessage: 'Hello, this is a reminder regarding your task.',
      triggers: [
        { value: 'Task Created', condition: null },
        { value: 'Task Assigned', condition: null },
        { value: 'Task Unassigned from a User', condition: null },
        { value: 'Task Name/Description Updated', condition: null },
        { value: 'Due Date Changed', condition: null },
        { value: 'Priority Changed', condition: null },
        { value: 'Status Changed', condition: null },
        { value: 'Task Completed', condition: null },
        { value: 'Task Deleted', condition: null },
        { value: 'Task Sent for Review', condition: null },
        { value: 'Task Put on Hold', condition: null },
        { value: 'Sub-Status Changed', condition: null },
        { value: 'Subtask Status Changed', condition: null },
        { value: 'Files Uploaded', condition: null },
        { value: 'Task Completed & Final Document Uploaded', condition: null },
        { value: 'Comment Added', condition: null },
        { value: 'Tagged in a Comment', condition: null },
        { value: 'Timesheet Log Added', condition: null },
        { value: 'Expense Added', condition: null },
        { value: 'Due Date Approaching', condition: { key: 'daysBeforeDue', label: 'Days before due date', min: 1, max: 90, default: 2 } },
        { value: 'Task Overdue', condition: null },
        { value: 'Document Request (Repeating)', condition: { key: 'repeatIntervalDays', label: 'Repeat every (days)', min: 1, max: 30, default: 3 } },
        // Backwards compatibility for existing saved agents:
        { value: 'Task created', condition: null },
        { value: 'Task assigned', condition: null },
        { value: 'Task due soon', condition: { key: 'daysBeforeDue', label: 'Days before due date', min: 1, max: 90, default: 2 } },
      ],
    },
    DSC: {
      symbol: 'D',
      cardDescription: 'Agents for DSC expiry reminders and renewal notifications.',
      description: 'Agents for DSC expiry reminders and renewal notifications.',
      defaultMessage: 'Your digital signature certificate is approaching expiry.',
      triggers: [
        { value: 'DSC Created', condition: null },
        { value: 'DSC Renewed', condition: null },
        { value: 'DSC Expiry Approaching', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
        { value: 'DSC Expired', condition: null },
        // Backwards compatibility:
        { value: 'DSC expiry approaching', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
        { value: 'DSC expired', condition: null },
        { value: 'Renewal required', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
      ],
    },
    License: {
      symbol: 'L',
      cardDescription: 'Agents for license expiry reminders and renewal notifications.',
      description: 'Agents for license expiry reminders and renewal notifications.',
      defaultMessage: 'Your license is approaching expiry.',
      triggers: [
        { value: 'License Created', condition: null },
        { value: 'License Renewed', condition: null },
        { value: 'License Expiry Approaching', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
        { value: 'License Expired', condition: null },
        // Backwards compatibility:
        { value: 'License expiry approaching', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
        { value: 'License expired', condition: null },
        { value: 'Renewal required', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
      ],
    },
  },
  recipients: [
    'Client',
    'Assigned user',
    'Task owner',
    'Account administrator',
    'Responsible person',
  ],
  channels: ['Email', 'WhatsApp', 'In-app'],
  actions: [
    'Send notification',
    'Send expiry reminder',
    'Send renewal reminder',
    'Notify assignee',
  ],
  templateVariables: [
    'task.taskName', 'task.clientName', 'task.targetDueDate', 'task.priority', 'task.status',
    'dsc.holder', 'dsc.expiryDate', 'dsc.dscId', 'dsc.vendor',
    'license.name', 'license.owner', 'license.expiryDate', 'license.licenseNo',
    'client.name', 'client.email', 'recipient.name', 'recipient.address', 'recipient.email', 'recipient.mobile', 'agent.name', 'trigger',
    'expense_name', 'expense_amount', 'reviewer_name', 'your_firm_name', 'task_status',
    'daysLeft', 'daysToExpiry', 'milestone',
  ],
  emailTemplates: [
    { id: 'expense-added', name: 'Expense added for task', subject: 'Expense Added for Task', message: 'Dear Team,\n\nA new expense has been recorded for the following task.\n\nTask Name: {{task.taskName}}\nExpense: {{expense_name}}\nAmount: {{expense_amount}}\nAssignee: Milton\nReviewer: {{reviewer_name}}\nCurrent Status: {{task_status}}\n\nPlease review the expense details and take any necessary action.\n\nBest Regards,\n{{your_firm_name}}' },
    { id: 'task-due-reminder', name: 'Task due date reminder', subject: 'Reminder: {{task.taskName}} is due {{task.targetDueDate}}', message: 'Hello {{recipient.name}},\n\n{{task.taskName}} for {{client.name}} is due on {{task.targetDueDate}}. Please review the task in your portal.\n\nRegards,\n{{agent.name}}' },
    { id: 'task-assigned', name: 'Task assigned notification', subject: 'A task has been assigned to {{recipient.name}}', message: 'Hello {{recipient.name}},\n\n{{task.taskName}} for {{client.name}} has been assigned to you.\n\nRegards,\n{{agent.name}}' },
    { id: 'client-task-update', name: 'Client task update', subject: 'Update about {{task.taskName}}', message: 'Hello {{client.name}},\n\nHere is an update about {{task.taskName}}. Current status: {{task.status}}.\n\nRegards,\n{{agent.name}}' },
    { id: 'dsc-expiry-reminder', name: 'DSC expiry reminder', subject: 'Urgent: DSC for {{dsc.holder}} is expiring on {{dsc.expiryDate}}', message: 'Hello {{recipient.name}},\n\nThis is a notification that the Digital Signature Certificate for {{dsc.holder}} (ID: {{dsc.dscId}}) will expire on {{dsc.expiryDate}}. Please arrange for renewal.\n\nRegards,\n{{agent.name}}' },
    { id: 'license-expiry-reminder', name: 'License expiry reminder', subject: 'Reminder: License {{license.name}} is expiring on {{license.expiryDate}}', message: 'Hello {{recipient.name}},\n\nThis is a reminder that the license {{license.name}} (No: {{license.licenseNo}}) for {{client.name}} will expire on {{license.expiryDate}}.\n\nRegards,\n{{agent.name}}' },
  ],
};

