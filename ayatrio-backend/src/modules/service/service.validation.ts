import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const serviceIdParamSchema = z.object({
  id: z.string().regex(OBJECT_ID_REGEX, 'Invalid Service ID format'),
});

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
  subTasks: z.array(z.string()).optional().default([]),
  status: z.enum(['Active', 'Inactive', 'Draft']).default('Active'),
});

export const updateServiceSchema = createServiceSchema.partial();

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
