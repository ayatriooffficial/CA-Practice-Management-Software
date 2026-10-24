import { Schema, model } from 'mongoose';
import { IOrganizationDocument } from './auth.interface';
import { addressSchema } from '../../shared/schemas/address.schema';
import { paymentDetailsSchema } from '../../shared/schemas/payment.schema';

const organizationSchema = new Schema<IOrganizationDocument>(
  {
    name: {
      type: String,
      required: [true, 'Organization / Firm name is required'],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      lowercase: true,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    mobile: {
      type: String,
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    lutNumber: {
      type: String,
      trim: true,
      default: '',
    },
    lutDisabled: {
      type: Boolean,
      default: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    addressDetails: {
      type: addressSchema,
      default: () => ({}),
    },
    paymentDetails: {
      type: paymentDetailsSchema,
      default: () => ({}),
    },
    currency: {
      type: String,
      trim: true,
      default: 'INR',
    },
    businessEntity: {
      type: String,
      trim: true,
      default: '',
    },
    businessType: {
      type: String,
      trim: true,
      default: '',
    },
    isGstRegistered: {
      type: Boolean,
      default: false,
    },
    cinNumber: {
      type: String,
      trim: true,
      default: '',
    },
    tanNumber: {
      type: String,
      trim: true,
      default: '',
    },
    udyamNumber: {
      type: String,
      trim: true,
      default: '',
    },
    msmeCategory: {
      type: String,
      trim: true,
      default: '',
    },
    professionalTaxNumber: {
      type: String,
      trim: true,
      default: '',
    },
    providentFundNumber: {
      type: String,
      trim: true,
      default: '',
    },
    esiRegistrationNumber: {
      type: String,
      trim: true,
      default: '',
    },
    invoiceSettings: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    businessHours: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    integrations: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    onboardingStep: {
      type: Number,
      default: 1,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    totalSeats: {
      type: Number,
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const OrganizationModel = model<IOrganizationDocument>('Organization', organizationSchema);
