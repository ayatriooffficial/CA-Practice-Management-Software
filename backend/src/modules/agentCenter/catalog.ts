/**
 * Static Agent Center catalog shared with the frontend. Dynamic agent records
 * and execution history remain backend data and are never represented here.
 */
export const PUBLIC_AGENT_DEFINITIONS = {
  modules: {
    Task: {
      symbol: 'T',
      cardDescription: 'Task creation, assignment events and reminders',
      description: 'Task creation, assignment notifications, and reminders',
      defaultMessage: 'Hello, this is a reminder regarding your task.',
      triggers: [
        { value: 'Task created', condition: null },
        { value: 'Task assigned', condition: null },
        { value: 'Task due soon', condition: { key: 'daysBeforeDue', label: 'Days before due date', min: 1, max: 90, default: 2 } },
        { value: 'Task Completed & Final Document Uploaded', condition: null },
        { value: 'Comment Added', condition: null },
        { value: 'Timesheet Log Added', condition: null },
        { value: 'Expense Added', condition: null },
        { value: 'Due Date Approaching', condition: { key: 'daysBeforeDue', label: 'Days before due date', min: 1, max: 90, default: 2 } },
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
      ],
    },
    DSC: {
      symbol: 'D',
      cardDescription: 'Digital signature expiry and renewal reminders',
      description: 'Digital signature certificate expiry and renewal reminders',
      defaultMessage: 'Your digital signature certificate is approaching expiry.',
      triggers: [
        { value: 'DSC expiry approaching', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
        { value: 'DSC expired', condition: null },
        { value: 'Renewal required', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
      ],
    },
    License: {
      symbol: 'L',
      cardDescription: 'License expiry and renewal notifications',
      description: 'License expiry reminders and renewal notifications',
      defaultMessage: 'Your license is approaching expiry.',
      triggers: [
        { value: 'License expiry approaching', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
        { value: 'License expired', condition: null },
        { value: 'Renewal required', condition: { key: 'daysBeforeExpiry', label: 'Days before expiry', min: 1, max: 365, default: 30 } },
      ],
    },
  },
  recipients: [
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
};
