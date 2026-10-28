import { z } from 'zod';

export const queryDocumentsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['All', 'Ready', 'Password protected', 'Signed', 'Failed']).optional().default('All'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const documentIdParamSchema = z.object({
  id: z.string().min(1, 'Document ID is required'),
});

export const signBatchSchema = z.object({
  documentIds: z.array(z.string().min(1, 'Invalid document ID')).min(1, 'At least one document ID is required'),
  dscRecordId: z.string().min(1, 'DSC record ID is required'),
  reason: z.string().max(200).optional().default('Approved for filing'),
  location: z.string().max(200).optional().default('India'),
  page: z.enum(['First', 'Last', 'Custom']).default('First'),
  customPages: z.array(z.number().int().positive()).optional(),
  placement: z
    .object({
      xPct: z.number().min(0).max(100).default(60),
      yPct: z.number().min(0).max(100).default(80),
      wPct: z.number().min(5).max(100).default(35),
      hPct: z.number().min(3).max(100).default(12),
    })
    .default({ xPct: 60, yPct: 80, wPct: 35, hPct: 12 }),
  appearance: z
    .object({
      showSignerName: z.boolean().default(true),
      showDateTime: z.boolean().default(true),
      showReasonLocation: z.boolean().default(true),
    })
    .default({ showSignerName: true, showDateTime: true, showReasonLocation: true }),
});

export const downloadZipSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1, 'At least one document ID is required'),
});

export const updateDocumentClientSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().optional(),
});
