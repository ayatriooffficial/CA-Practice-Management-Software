export type InvoiceTab = 'proforma' | 'invoice' | 'reimbursement' | 'receipts' | 'recurring' | 'analytics';

export type RecurringFrequency = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';

export interface RecurringInvoiceRecord {
  id: string;
  templateNo: string;
  billingOrg: string;
  clientBusinessName: string;
  clientLegalName: string;
  clientGroup?: string;
  clientGstin?: string;
  service: string;
  taxRate: string;
  frequency: RecurringFrequency;
  createdOn: string;
  startDate: string;
  totalAmount: number;
  status: 'Active' | 'Paused' | 'Ended' | 'Completed';
  financialYear: string;
}

export type InvoiceStatus = 'Paid' | 'Partially Paid' | 'Receivable' | 'Pending' | 'Overdue' | 'Advance Paid' | 'Write-Off' | 'Cancelled' | 'Converted' | 'Credit Note';

export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'Cheque' | 'UPI';

export type AccountType = 'Savings' | 'Current' | 'Over Draft';

export type FrequencyType = 'One-Time' | 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Annual';

export interface BankAccount {
  id: string;
  bankName: string;
  accountBusinessName: string;
  accountNumber: string;
  ifscCode: string;
  branchAddress: string;
  accountType: AccountType;
  paymentMethod: PaymentMethod;
  upi?: string;
  description?: string;
  isPrimary: boolean;
  currencyCode: string;
}

export interface ServiceItem {
  id: string;
  serviceName: string;
  description: string;
  compliancePeriod: string;
  frequency: FrequencyType;
  periodLabel: string;
  quantity: number;
  price: number;
  amount: number;
  total: number;
  isReimbursement?: boolean;
}

export interface InvoiceRecord {
  id: string;
  type: 'invoice' | 'proforma' | 'reimbursement' | 'credit_note';
  number: string;
  date: string;
  dueDate: string;
  billingOrg: string;
  billingAddress: string;
  clientId: string;
  clientBusinessName: string;
  clientLegalName: string;
  clientGroup: string;
  clientGstin: string;
  clientAddress: string;
  clientPan: string;
  services: ServiceItem[];
  subTotal: number;
  totalPayable: number;
  tdsExcludedAmount: number;
  currency: string;
  status: InvoiceStatus;
  bankAccountId?: string;
  notes?: string;
  paidAmount: number;
  balanceAmount: number;
  financialYear: string;
  createdAt: string;
  daysPastDue?: number;
  taskId?: string;
  taskAllocations?: { taskId: string; amountPaise: number; creditedPaise?: number }[];
  taskStatus?: string;
  source?: string;
  placeOfSupply?: string;
  assignee?: string;
  reviewer?: string;
}

export interface ReceiptRecord {
  id: string;
  receiptNo: string;
  billingOrg: string;
  clientId: string;
  businessName: string;
  legalName: string;
  group: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  bankAccountId: string;
  bankName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  proformaId?: string;
  proformaNumber?: string;
  reimbursementId?: string;
  reimbursementNumber?: string;
  referenceNumber: string;
  notes?: string;
  isAdvance?: boolean;
  financialYear: string;
}

export interface EmployeeClaimRecord {
  id: string;
  taskId: string;
  employee: string;
  client: string;
  particulars: string;
  date: string;
  amount: number;
  attachments: number;
  status: 'Approved' | 'Applied' | 'Rejected';
  paymentStatus: 'Paid' | 'Unpaid' | 'Pending';
}

export interface GstSupplyRecord {
  id: string;
  gstin: string;
  receiverName: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  applicableRate: number;
  taxableValue: number;
  integratedTax: number;
  centralTax: number;
  stateTax: number;
  category: 'B2B' | 'B2C' | 'NilRated' | 'HSN' | 'Documents';
}

export interface SlaRetainerRecord {
  id: string;
  client: string;
  group: string;
  hasSla: boolean;
  monthlyHours: number;
  hourlyRate: number;
  teamCost: number;
  retainerRevenue: number;
  netProfit: number;
  marginPercent: number;
  slaLines: number;
  status: 'Profitable' | 'Under 10%' | 'Loss';
}

export interface UserRevenueRecord {
  id: string;
  member: string;
  role: 'Assignee' | 'Reviewer' | 'Both';
  invoicesCount: number;
  totalRevenue: number;
  collectedAmount: number;
  pendingAmount: number;
  avgInvoiceValue: number;
  collectionRate: number;
}
