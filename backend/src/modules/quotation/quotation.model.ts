import { Schema, model } from 'mongoose';
import { IQuotationDocument } from './quotation.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

const quotationItemSchema = new Schema(
  {
    serviceId: { type: String, default: null },
    serviceName: { type: String, required: true },
    hsnSac: { type: String, default: '' },
    quantity: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true, default: 0 },
    discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
    discountValue: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    description: { type: String, default: '' },
    isReimbursement: { type: Boolean, default: false },
  },
  { _id: true }
);

const quotationSchema = new Schema<IQuotationDocument>(
  {
    quotationNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    quotationDate: {
      type: String,
      required: true,
    },
    dueDate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Accepted', 'Rejected', 'Expired'],
      default: 'Pending',
      index: true,
    },
    template: {
      type: String,
      enum: ['Aura', 'Classic', 'Modern'],
      default: 'Aura',
    },
    billingOrg: {
      orgId: { type: String, default: null },
      name: { type: String, required: true, default: '' },
      address: { type: String, default: '' },
      priority: { type: String, default: '' },
      gstin: { type: String, default: '' },
      pan: { type: String, default: '' },
      lutNumber: { type: String, default: '' },
      lutDisabled: { type: Boolean, default: true },
      email: { type: String, default: '' },
      mobile: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    quotationTo: {
      leadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null, index: true },
      clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
      businessName: { type: String, default: '' },
      name: { type: String, required: true },
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      stateCode: { type: String, default: '' },
      placeOfSupply: { type: String, default: '' },
      gstin: { type: String, default: '' },
      pan: { type: String, default: '' },
      email: { type: String, default: '' },
      mobile: { type: String, default: '' },
    },
    bankDetails: {
      paymentType: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      accountType: { type: String, default: '' },
      bankBranch: { type: String, default: '' },
      upi: { type: String, default: '' },
      currencyCode: { type: String, default: '' },
    },
    items: [quotationItemSchema],
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    terms: { type: String, default: '' },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    userId: {
      type: String,
      default: null,
    },
    createdBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

quotationSchema.plugin(softDeletePlugin);

quotationSchema.index({ quotationNo: 1, isDeleted: 1 });
quotationSchema.index({ leadId: 1, isDeleted: 1 });
quotationSchema.index({ status: 1, isDeleted: 1 });

export const Quotation = model<IQuotationDocument, ISoftDeleteModel<IQuotationDocument>>(
  'Quotation',
  quotationSchema
);
