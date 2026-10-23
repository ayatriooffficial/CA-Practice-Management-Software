import { Types } from 'mongoose';
import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

export interface IQuotationItem {
  id?: string;
  serviceId?: string;
  serviceName: string;
  hsnSac?: string;
  quantity: number;
  price: number;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
  taxRate: number; // e.g. 18
  sgst?: number;
  cgst?: number;
  igst?: number;
  amount: number;
  total: number;
  description?: string;
  isReimbursement?: boolean;
}

export interface IBillingOrgDetails {
  orgId?: string;
  name: string;
  address: string;
  priority?: string;
  gstin?: string;
  pan?: string;
  lutNumber?: string;
  lutDisabled?: boolean;
  email?: string;
  mobile?: string;
  website?: string;
}

export interface IQuotationToDetails {
  leadId?: Types.ObjectId | string;
  clientId?: Types.ObjectId | string;
  businessName?: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state: string;
  stateCode?: string;
  placeOfSupply?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  mobile?: string;
}

export interface IQuotationBankDetails {
  paymentType: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  accountType: string;
  bankBranch: string;
  upi?: string;
  currencyCode: string;
}

export interface IQuotation {
  quotationNo: string;
  quotationDate: string;
  dueDate: string;
  status: 'Draft' | 'Pending' | 'Accepted' | 'Rejected' | 'Expired';
  template: 'Aura' | 'Classic' | 'Modern';
  billingOrg: IBillingOrgDetails;
  quotationTo: IQuotationToDetails;
  bankDetails: IQuotationBankDetails;
  items: IQuotationItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  notes?: string;
  terms?: string;
  leadId?: Types.ObjectId | string | null;
  clientId?: Types.ObjectId | string | null;
  orgId?: Types.ObjectId | null;
  userId?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQuotationDocument extends IQuotation, ISoftDeleteDocument {}
