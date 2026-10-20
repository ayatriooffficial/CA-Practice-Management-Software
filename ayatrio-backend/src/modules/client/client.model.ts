import { Schema, model } from 'mongoose';
import {
  IClientDocument,
  IPromoterFile,
  IStatutoryFile,
  IRecurringFile,
} from './client.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

const promoterSchema = new Schema<IPromoterFile>(
  {
    key: { type: Number },
    name: { type: String, required: true, trim: true },
    pan: { type: String, trim: true, uppercase: true, default: '' },
    share: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    mcaId: { type: String, trim: true, default: '' },
    mcaPassword: { type: String, select: false },
  },
  { _id: true }
);

const statutorySchema = new Schema<IStatutoryFile>(
  {
    key: { type: Number },
    type: { type: String, required: true, trim: true },
    idNo: { type: String, required: true, trim: true },
    userId: { type: String, trim: true, default: '' },
    password: { type: String, select: false },
    attachment: { type: String, default: null },
  },
  { _id: true }
);

const recurringSchema = new Schema<IRecurringFile>(
  {
    key: { type: Number },
    category: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    tariff: { type: String, trim: true, default: '0.00' },
  },
  { _id: true }
);

const clientSchema = new Schema<IClientDocument>(
  {
    name: {
      type: String,
      required: [true, 'Client/Entity name is required'],
      trim: true,
      index: true,
    },
    fileNo: {
      type: String,
      required: [true, 'File Number is required'],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Client constitution type is required'],
      trim: true,
      index: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    secondaryMobile: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
    },
    group: {
      type: String,
      required: [true, 'Client practice group is required'],
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    services: {
      type: [String],
      default: [],
    },
    users: {
      type: [String],
      default: [],
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      default: '',
    },
    dob: {
      type: String,
      trim: true,
      default: '',
    },
    referredBy: {
      type: String,
      trim: true,
      default: '',
    },
    photo: {
      type: String,
      default: null,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    customerFiles: {
      promoter: { type: [promoterSchema], default: [] },
      statutory: { type: [statutorySchema], default: [] },
      recurring: { type: [recurringSchema], default: [] },
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

// Apply Soft Delete Plugin
clientSchema.plugin(softDeletePlugin);

// Compound and Search Indexes
clientSchema.index({ fileNo: 1, isDeleted: 1 });
clientSchema.index({ mobile: 1, isDeleted: 1 });
clientSchema.index({ pan: 1, isDeleted: 1 });
clientSchema.index({ group: 1, active: 1, isDeleted: 1 });
clientSchema.index({ type: 1, isDeleted: 1 });
clientSchema.index(
  {
    name: 'text',
    fileNo: 'text',
    mobile: 'text',
    email: 'text',
    pan: 'text',
    city: 'text',
  },
  {
    weights: {
      name: 10,
      fileNo: 8,
      pan: 7,
      mobile: 6,
      email: 5,
      city: 3,
    },
    name: 'ClientTextSearchIndex',
  }
);

export const Client = model<IClientDocument, ISoftDeleteModel<IClientDocument>>('Client', clientSchema);
