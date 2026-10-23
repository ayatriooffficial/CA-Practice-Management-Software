import { Schema } from 'mongoose';

export interface IBankDetails {
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifscCode?: string;
  branchName?: string;
  accountType?: 'Current' | 'Savings' | 'OD' | string;
  upiId?: string;
  qrCodeUrl?: string;
}

export interface IPaymentDetails {
  bankDetails?: IBankDetails;
  paymentMode?: 'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Card' | 'Net Banking' | string;
  currency?: string;
  terms?: string;
  isDefault?: boolean;
}

export const bankDetailsSchema = new Schema<IBankDetails>(
  {
    bankName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    accountHolderName: { type: String, trim: true, default: '' },
    ifscCode: { type: String, trim: true, uppercase: true, default: '' },
    branchName: { type: String, trim: true, default: '' },
    accountType: { type: String, default: 'Current' },
    upiId: { type: String, trim: true, default: '' },
    qrCodeUrl: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

export const paymentDetailsSchema = new Schema<IPaymentDetails>(
  {
    bankDetails: { type: bankDetailsSchema, default: () => ({}) },
    paymentMode: { type: String, default: 'Bank Transfer' },
    currency: { type: String, default: 'INR' },
    terms: { type: String, default: 'Payment due within 15 days of invoice date.' },
    isDefault: { type: Boolean, default: true },
  },
  { _id: false }
);
