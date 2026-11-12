import { z } from 'zod';

export const complianceGridQuerySchema = z
  .object({
    category: z.string().optional(),
    categoryId: z.string().optional(),
    fy: z.string().optional().default('FY 2025-2026'),
    frequency: z
      .preprocess(
        (val) => (typeof val === 'string' ? val.toLowerCase().replace(/-/g, '_') : val),
        z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly', 'all'])
      )
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

export const complianceGstSyncSchema = z
  .object({
    clientIds: z.array(z.string()).optional(),
    fy: z.string().optional().default('2026-27'),
    refreshPreference: z.boolean().optional().default(false),
  })
  .strict();

export type ComplianceGridQueryInput = z.infer<typeof complianceGridQuerySchema>;
export type ComplianceEntryUpsertInput = z.infer<typeof complianceEntryUpsertSchema>;
export type ComplianceItemRefreshInput = z.infer<typeof complianceItemRefreshSchema>;
export type ComplianceGstSyncInput = z.infer<typeof complianceGstSyncSchema>;
