import { Schema, model } from 'mongoose';
import { IFinancialInvoice, IFinancialReceipt, ITaskExpense, ITimeEntry } from './financial.interface';

const allocationSchema = new Schema(
  {
    taskId: { type: String, required: true, trim: true },
    amountPaise: { type: Number, required: true, min: 0 },
    creditedPaise: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IFinancialInvoice>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    kind: { type: String, enum: ['invoice', 'credit_note'], required: true },
    state: { type: String, enum: ['draft', 'issued', 'void'], required: true, default: 'draft' },
    number: { type: String, required: true, trim: true },
    issueDate: { type: Date, default: null },
    originalInvoiceId: { type: Schema.Types.ObjectId, ref: 'FinancialInvoice', default: null },
    allocations: { type: [allocationSchema], required: true, default: [] },
    details: { type: Schema.Types.Mixed, required: true, default: {} },
    idempotencyKey: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);
invoiceSchema.index({ orgId: 1, idempotencyKey: 1 }, { unique: true });
invoiceSchema.index({ orgId: 1, number: 1 }, { unique: true });
invoiceSchema.index({ orgId: 1, state: 1, issueDate: 1 });
invoiceSchema.index({ orgId: 1, 'allocations.taskId': 1 });

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    taskId: { type: String, required: true, trim: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workDate: { type: Date, required: true, index: true },
    durationSeconds: { type: Number, required: true, min: 1 },
    internalCostRatePaisePerHour: { type: Number, required: true, min: 0 },
    costPaise: { type: Number, required: true, min: 0 },
    idempotencyKey: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
timeEntrySchema.index({ orgId: 1, idempotencyKey: 1 }, { unique: true });
timeEntrySchema.index({ orgId: 1, taskId: 1, workDate: 1 });
timeEntrySchema.index({ orgId: 1, employeeId: 1, workDate: 1 });

const expenseSchema = new Schema<ITaskExpense>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    taskId: { type: String, required: true, trim: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    particulars: { type: String, required: true, trim: true, maxlength: 300 },
    incurredDate: { type: Date, required: true, index: true },
    amountPaise: { type: Number, required: true, min: 1 },
    state: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
    idempotencyKey: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);
expenseSchema.index({ orgId: 1, idempotencyKey: 1 }, { unique: true });
expenseSchema.index({ orgId: 1, taskId: 1, state: 1, incurredDate: 1 });

const receiptSchema = new Schema<IFinancialReceipt>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    receiptNo: { type: String, required: true, trim: true },
    invoiceId: { type: Schema.Types.Mixed, default: null },
    invoiceNumber: { type: String, trim: true, default: '' },
    clientId: { type: String, trim: true, default: '' },
    businessName: { type: String, trim: true, default: '' },
    legalName: { type: String, trim: true, default: '' },
    group: { type: String, trim: true, default: '' },
    billingOrg: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    method: { type: String, enum: ['Bank Transfer', 'Cash', 'Cheque', 'UPI'], default: 'Bank Transfer' },
    bankAccountId: { type: String, trim: true, default: '' },
    bankName: { type: String, trim: true, default: '' },
    referenceNumber: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    financialYear: { type: String, trim: true, default: '' },
    isAdvance: { type: Boolean, default: false },
    amountForService:{type:Schema.Types.Mixed},
    tdsAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    badDebtAmount: { type: Number, default: 0 },
    details: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

receiptSchema.index({ orgId: 1, receiptNo: 1 }, { unique: true });
receiptSchema.index({ orgId: 1, paymentDate: -1 });
receiptSchema.index({ orgId: 1, clientId: 1 });
receiptSchema.index({ orgId: 1, invoiceNumber: 1 });

export const FinancialInvoice = model<IFinancialInvoice>('FinancialInvoice', invoiceSchema);
export const FinancialTimeEntry = model<ITimeEntry>('FinancialTimeEntry', timeEntrySchema);
export const TaskExpense = model<ITaskExpense>('TaskExpense', expenseSchema);
export const FinancialReceipt = model<IFinancialReceipt>('FinancialReceipt', receiptSchema);

/** autoIndex is disabled in production, so explicitly create financial uniqueness/query indexes at startup. */
export async function initializeFinancialIndexes(): Promise<void> {
  await Promise.all([
    FinancialInvoice.createIndexes(),
    FinancialTimeEntry.createIndexes(),
    TaskExpense.createIndexes(),
    FinancialReceipt.createIndexes(),
  ]);
}
