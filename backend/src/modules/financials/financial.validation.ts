import { z } from 'zod';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Date must be a valid calendar date');

const allocations = z.array(z.object({
  taskId: z.string().trim().min(1),
  amountPaise: z.number().int().positive().safe(),
})).min(1).refine((rows) => new Set(rows.map((row) => row.taskId)).size === rows.length, 'Each task may only appear once per invoice');

export const createInvoiceSchema = z.object({
  kind: z.enum(['invoice', 'credit_note']).default('invoice'),
  state: z.enum(['draft', 'issued']).default('draft'),
  number: z.string().trim().min(1).max(80),
  issueDate: dateOnly.nullable().optional(),
  originalInvoiceId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  allocations,
  details: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().trim().min(12).max(120),
});

export const createTimeEntrySchema = z.object({
  taskId: z.string().trim().min(1),
  workDate: dateOnly,
  durationSeconds: z.number().int().positive().max(24 * 60 * 60),
  idempotencyKey: z.string().trim().min(12).max(120),
});

export const createExpenseSchema = z.object({
  taskId: z.string().trim().min(1),
  particulars: z.string().trim().min(1).max(300),
  incurredDate: dateOnly,
  amountPaise: z.number().int().positive().safe(),
  idempotencyKey: z.string().trim().min(12).max(120),
});

export const expenseStateSchema = z.object({ state: z.enum(['approved', 'rejected', 'cancelled']) });
export const voidInvoiceSchema = z.object({ reason: z.string().trim().min(3).max(300) });
export const reportDateQuerySchema = z.object({ from: dateOnly, to: dateOnly });
export const compensationSchema = z.object({ internalCostRatePaisePerHour: z.number().int().nonnegative().safe().nullable() });
