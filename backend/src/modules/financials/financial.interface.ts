import { Document, Types } from 'mongoose';

export type InvoiceKind = 'invoice' | 'credit_note';
export type InvoiceState = 'draft' | 'issued' | 'void';
export type ExpenseState = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface IInvoiceAllocation {
  taskId: string;
  amountPaise: number;
  creditedPaise?: number;
}

export interface IFinancialInvoice extends Document {
  orgId: Types.ObjectId;
  kind: InvoiceKind;
  state: InvoiceState;
  number: string;
  issueDate: Date | null;
  originalInvoiceId?: Types.ObjectId | null;
  allocations: IInvoiceAllocation[];
  details: Record<string, unknown>;
  idempotencyKey: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITimeEntry extends Document {
  orgId: Types.ObjectId;
  taskId: string;
  employeeId: Types.ObjectId;
  workDate: Date;
  durationSeconds: number;
  internalCostRatePaisePerHour: number;
  costPaise: number;
  idempotencyKey: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface ITaskExpense extends Document {
  orgId: Types.ObjectId;
  taskId: string;
  employeeId: Types.ObjectId;
  particulars: string;
  incurredDate: Date;
  amountPaise: number;
  state: ExpenseState;
  idempotencyKey: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'Cheque' | 'UPI';

export interface IFinancialReceipt extends Document {
  orgId: Types.ObjectId;
  receiptNo: string;
  invoiceId?: Types.ObjectId | string | null;
  invoiceNumber?: string;
  clientId?: string;
  businessName?: string;
  legalName?: string;
  group?: string;
  billingOrg?: string;
  amount: number;
  amountPaise: number;
  paymentDate: Date;
  method: PaymentMethod;
  amountForService:any;
  bankAccountId?: string;
  bankName?: string;
  referenceNumber?: string;
  notes?: string;
  financialYear?: string;
  isAdvance: boolean;
  tdsAmount: number;
  discountAmount: number;
  badDebtAmount: number;
  details: Record<string, unknown>;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
