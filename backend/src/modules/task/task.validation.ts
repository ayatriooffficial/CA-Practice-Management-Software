import { z } from 'zod';


export const taskIdParamSchema = z.object({
  id: z.string().min(1, 'Task identifier is required'),
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
});

export const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text cannot be empty'),
  author: z.string().optional().default('Likith S'),
  authorInitials: z.string().optional().default('LI'),
  avatarColor: z.string().optional().default('#06B6D4'),
});
