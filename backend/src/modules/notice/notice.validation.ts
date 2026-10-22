import { z } from 'zod';

export const noticeQuerySchema = z
  .object({
    portal: z.enum(['GST', 'IT', 'TDS']).optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    groupBy: z.enum(['client', 'none']).optional().default('none'),
    sortBy: z.string().optional().default('syncedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(200).optional().default(50),
    clientId: z.string().refine((value) => /^[a-f\d]{24}$/i.test(value), 'clientId must be a valid ObjectId').optional(),
  })
  .strict();

export const calendarQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM')
      .optional(),
    portal: z.enum(['GST', 'IT', 'TDS', 'ALL']).optional(),
    status: z.string().optional(),
    by: z.enum(['notice_date', 'due_date']).optional().default('due_date'),
    module: z.enum(['notices', 'compliance']).optional().default('notices'),
  })
  .strict();

export type NoticeQueryInput = z.infer<typeof noticeQuerySchema>;
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;

export const noticeStatusUpdateSchema = z.object({
  status: z.enum([
    'new',
    'response_preparing',
    'response_filed',
    'under_dept_review',
    'hearing_scheduled',
    'appeal_filed',
    'closed',
    'no_status',
  ]),
});
