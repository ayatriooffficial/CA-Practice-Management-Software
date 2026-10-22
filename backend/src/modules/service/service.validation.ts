import { z } from 'zod';

export const serviceIdParamSchema = z.object({
  id: z.string().min(1, 'Service identifier is required'),
});

export const serviceChecklistItemSchema = z.union([
  z.string(),
  z.object({
    id: z.string().optional().default(() => `c_${Date.now()}`),
    title: z.string().min(1, 'Title is required'),
    isMandatory: z.boolean().optional().default(true),
    taskId: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
  }),
]);

export const serviceDocumentRequestItemSchema = z.union([
  z.string(),
  z.object({
    id: z.string().optional().default(() => `d_${Date.now()}`),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().default(''),
    isMandatory: z.boolean().optional().default(true),
    taskId: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
  }),
]);

export const serviceSubTaskSchema = z.union([
  z.string(),
  z.object({
    id: z.string().optional().default(() => `st_${Date.now()}`),
    name: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    totalHours: z.string().optional(),
    percentage: z.number().optional(),
    attachments: z.array(z.string()).optional(),
    taskId: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
  }),
]);

export const createServiceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters').max(150),
  category: z.string().min(1, 'Category is required'),
  frequency: z
    .enum([
      'Monthly',
      'Quarterly',
      'Half-Yearly',
      'Annually',
      'One-Time',
      'Weekly',
      'Bi-Weekly',
      'As-Needed',
    ])
    .default('Monthly'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Complex']).default('Medium'),
  description: z.string().max(300).optional().default(''),
  isRecurring: z.boolean().default(false),
  professionalFee: z.coerce.number().min(0, 'Professional fee cannot be negative').default(0),
  taxRate: z.string().optional().default('18%'),
  sacCode: z.string().max(20).optional().default(''),
  exemptionReason: z.string().max(100).optional().default(''),
  maxOopBudget: z.coerce.number().min(0).optional().default(0),
  tatDays: z.coerce.number().min(0).optional().default(3),
  tatHours: z.string().max(10).optional().default('00:00'),
  note: z.string().max(500).optional().default(''),
  sop: z.string().optional().default('Standard SOP v1.0'),
  subTasks: z.array(serviceSubTaskSchema).optional().default([]),
  checklist: z.array(serviceChecklistItemSchema).optional().default([]),
  documentRequests: z.array(serviceDocumentRequestItemSchema).optional().default([]),
  status: z.enum(['Active', 'Inactive', 'Draft']).default('Active'),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  subTasks: z.array(serviceSubTaskSchema).optional(),
  checklist: z.array(serviceChecklistItemSchema).optional(),
  documentRequests: z.array(serviceDocumentRequestItemSchema).optional(),
}).passthrough();

export const queryServiceSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  category: z.string().optional(),
  frequency: z.string().optional(),
  difficulty: z.string().optional(),
  isRecurring: z.enum(['true', 'false']).optional(),
  status: z.enum(['Active', 'Inactive', 'Draft']).optional(),
  includeDeleted: z.enum(['true', 'false']).optional(),
});

export const toggleClientServiceParamSchema = z.object({
  id: z.string().min(1, 'Service identifier is required'),
  clientId: z.string().min(1, 'Client identifier is required'),
});

export const toggleClientServiceBodySchema = z.object({
  enabled: z.boolean().optional(),
  compliance: z.boolean().optional(),
});
