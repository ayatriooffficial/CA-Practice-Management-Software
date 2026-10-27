import { z } from 'zod';

export const templateIdParamSchema = z.object({
  id: z.string().min(1, 'Template identifier is required'),
});

export const templateChecklistItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Checklist title is required'),
  isMandatory: z.boolean().optional().default(true),
});

export const createTaskTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
  taskTitle: z.string().min(1, 'Task title is required'),
  category: z.string().optional().default('GST'),
  department: z.string().optional().default('GST'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
  frequency: z.string().optional().default('One-Time'),
  estimatedHours: z.string().optional().default(''),
  defaultAssigneeId: z.string().optional().nullable(),
  defaultAssigneeName: z.string().optional().default(''),
  defaultReviewerId: z.string().optional().nullable(),
  defaultReviewerName: z.string().optional().default(''),
  billingType: z.enum(['Billable', 'Non Billable']).optional().default('Billable'),
  description: z.string().optional().default(''),
  checklist: z.array(templateChecklistItemSchema).optional().default([]),
});

export const updateTaskTemplateSchema = createTaskTemplateSchema.partial();
