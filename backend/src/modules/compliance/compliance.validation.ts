import { z } from 'zod';

export const complianceGridQuerySchema = z
  .object({
    categoryId: z.string().optional(),
    fy: z.string().optional().default('FY 2025-2026'),
    frequency: z
      .enum(['monthly', 'quarterly', 'half_yearly', 'yearly', 'all'])
      .optional()
      .default('all'),
    search: z.string().optional(),
  })
  .strict();

export const complianceEntryUpsertSchema = z
  .object({
    itemId: z.string().min(1, 'itemId required'),
    fy: z.string().min(1, 'fy required'),
    periodKey: z.string().min(1, 'periodKey required'),
    dueDate: z.string().min(1, 'dueDate required'),
    filedOn: z.string().nullable().optional(),
    statusOverride: z.enum(['filed', 'missed', 'pending']).nullable().optional(),
    documents: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          url: z.string(),
          mime: z.string(),
        })
      )
      .optional()
      .default([]),
    source: z.enum(['portal', 'manual']).optional().default('manual'),
  })
  .strict();

export const complianceItemRefreshSchema = z
  .object({
    categoryId: z.string().optional(),
    clientId: z.string().optional(),
  })
  .strict();

export type ComplianceGridQueryInput = z.infer<typeof complianceGridQuerySchema>;
export type ComplianceEntryUpsertInput = z.infer<typeof complianceEntryUpsertSchema>;
export type ComplianceItemRefreshInput = z.infer<typeof complianceItemRefreshSchema>;
