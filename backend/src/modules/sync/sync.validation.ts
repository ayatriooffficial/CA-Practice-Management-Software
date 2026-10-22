import { z } from 'zod';

export const syncClientsSchema = z
  .object({
    clientIds: z.array(z.string().min(1)).min(1, 'At least one clientId required'),
    portals: z
      .array(z.enum(['GST', 'IT', 'TDS']))
      .min(1, 'At least one portal required'),
    module: z.enum(['notices', 'compliance']).default('notices'),
    triggeredBy: z.string().optional().default('user'),
    isFreeSync: z.boolean().optional().default(false),
  })
  .strict();

export const syncJobQuerySchema = z
  .object({
    module: z.enum(['notices', 'compliance']).optional(),
    status: z.enum(['running', 'success', 'partial', 'failed']).optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  })
  .strict();

export const activityQuerySchema = z
  .object({
    clientId: z.string().optional(),
    noticeId: z.string().optional(),
    action: z
      .enum(['status_changed', 'task_created', 'file_downloaded', 'note_added'])
      .optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  })
  .strict();

export type SyncClientsInput = z.infer<typeof syncClientsSchema>;
export type SyncJobQueryInput = z.infer<typeof syncJobQuerySchema>;
export type ActivityQueryInput = z.infer<typeof activityQuerySchema>;
