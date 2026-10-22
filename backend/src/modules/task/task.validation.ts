import { z } from 'zod';

const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Date must be a valid calendar date');

export const profitabilityReportQuerySchema = z.object({
  from: isoDateOnly,
  to: isoDateOnly,
});


export const taskIdParamSchema = z.object({
  id: z.string().min(1, 'Task identifier is required'),
});

export const taskChecklistItemSchema = z.object({
  id: z.string().optional().default(() => `c_${Date.now()}`),
  title: z.string().min(1, 'Checklist title is required'),
  completed: z.boolean().optional().default(false),
  isMandatory: z.boolean().optional().default(true),
  taskId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
});

export const taskDocumentRequestItemSchema = z.object({
  id: z.string().optional().default(() => `d_${Date.now()}`),
  title: z.string().min(1, 'Document title is required'),
  description: z.string().optional().default(''),
  status: z.enum(['Pending', 'Received', 'Requested']).optional().default('Pending'),
  isMandatory: z.boolean().optional().default(true),
  fileUrl: z.string().optional().default(''),
  receivedAt: z.union([z.string(), z.date()]).optional().nullable(),
  taskId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
});

export const taskSubTaskSchema = z.object({
  id: z.string().optional().default(() => `st_${Date.now()}`),
  title: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  completed: z.boolean().optional().default(false),
  timeSpent: z.string().optional().default('00:00:00'),
  totalHours: z.string().optional(),
  percentage: z.number().optional(),
  taskId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
});

export const taskComplianceSchema = z.object({
  period: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['Overdue', 'Compliant', 'Pending', 'Filed']).optional(),
  filedDate: z.string().optional(),
  referenceNo: z.string().optional(),
  attachmentsCount: z.number().optional(),
});

export const createTaskSchema = z.object({
  taskId: z.string().optional(),
  taskName: z.string().optional().default('-'),
  clientId: z.string().optional().nullable(),
  clientName: z.string().min(1, 'Client is required'),
  clientFileNo: z.string().optional().default(''),
  clientPan: z.string().optional().default('-'),
  legalName: z.string().optional().default(''),
  serviceId: z.string().optional().nullable(),
  serviceName: z.string().min(1, 'Service is required'),
  frequency: z.string().optional().default('Monthly'),
  period: z.string().min(1, 'Period is required'),
  financialYear: z.string().min(1, 'Financial Year is required'),
  department: z.string().optional().default('GST'),
  assigneeId: z.string().optional().nullable(),
  assigneeName: z.string().min(1, 'Assignee is required'),
  assigneeInitials: z.string().optional().default(''),
  assigneeColor: z.string().optional().default('#8B5CF6'),
  reviewerId: z.string().optional().nullable(),
  reviewerName: z.string().optional().default(''),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Low'),
  startDate: z.string().min(1, 'Start date is required'),
  targetDueDate: z.string().min(1, 'Target due date is required'),
  endDate: z.string().min(1, 'End date is required'),
  billingType: z.enum(['Billable', 'Non Billable']).default('Billable'),
  billingStatus: z.enum(['Pending', 'Ready to Bill', 'Billed']).optional().default('Pending'),
  isSprintPlanner: z.boolean().optional().default(false),
  category: z.string().optional().default('GST'),
  taskType: z.enum(['One-Time Task', 'Recurring Task']).optional().default('One-Time Task'),
  status: z
    .enum([
      'Pending',
      'In Progress',
      'Sent for Review',
      'Request Changes',
      'Overdue',
      'Completed',
      'Ready to Bill',
      'On Hold',
      'Cancelled',
    ])
    .optional()
    .default('Pending'),
  description: z.string().optional().default(''),
  createProformaInvoice: z.boolean().optional().default(false),
  creatorName: z.string().optional(),
  adminId: z.string().optional(),
  sop: z.string().optional().default(''),
  subTasks: z.array(taskSubTaskSchema).optional(),
  checklist: z.array(taskChecklistItemSchema).optional(),
  documentRequests: z.array(taskDocumentRequestItemSchema).optional(),
  complianceStatus: taskComplianceSchema.optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z
    .enum([
      'Pending',
      'In Progress',
      'Sent for Review',
      'Request Changes',
      'Overdue',
      'Completed',
      'Ready to Bill',
      'On Hold',
      'Cancelled',
    ])
    .optional(),
  billingStatus: z.enum(['Pending', 'Ready to Bill', 'Billed']).optional(),
  isTimerRunning: z.boolean().optional(),
  timeSpentSeconds: z.number().optional(),
  subTasks: z.array(taskSubTaskSchema).optional(),
  checklist: z.array(taskChecklistItemSchema).optional(),
  documentRequests: z.array(taskDocumentRequestItemSchema).optional(),
  complianceStatus: taskComplianceSchema.optional(),
}).passthrough();

export const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text cannot be empty'),
  author: z.string().optional().default('Team Member'),
  authorInitials: z.string().optional().default('TM'),
  avatarColor: z.string().optional().default('#3B82F6'),
});
