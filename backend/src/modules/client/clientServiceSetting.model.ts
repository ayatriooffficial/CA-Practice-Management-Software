import { Schema, model, Types } from 'mongoose';
import { IClientServiceSetting } from './client.interface';
import { softDeletePlugin, ISoftDeleteModel, ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

export interface IClientServiceSettingDocument extends Omit<IClientServiceSetting, 'id'>, ISoftDeleteDocument {
  clientId: Types.ObjectId;
  orgId?: string | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const clientServiceSettingSchema = new Schema<IClientServiceSettingDocument>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    orgId: {
      type: String,
      default: null,
      index: true,
    },
    serviceId: {
      type: String,
      default: null,
      index: true,
    },
    serviceName: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    compliance: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    recTask: {
      type: String,
      default: 'Disabled',
    },
    recInvoice: {
      type: String,
      default: 'Disabled',
    },
    frequency: {
      type: String,
      default: 'Monthly',
    },
    start: {
      type: String,
      default: 'Day 1',
    },
    target: {
      type: String,
      default: 'Day 15',
    },
    end: {
      type: String,
      default: 'Day 20',
    },
    invFreq: {
      type: String,
      default: 'Monthly',
    },
    invDay: {
      type: Schema.Types.Mixed,
      default: 1,
    },
    amount: {
      type: Number,
      default: 0,
    },
    professionalFee: {
      type: Number,
      default: 0,
    },
    governmentFee: {
      type: Number,
      default: 0,
    },
    otherCharges: {
      type: Number,
      default: 0,
    },
    totalServiceFee: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: String,
      default: '18%',
    },
    taskName: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      default: 'Medium',
    },
    assignee: {
      type: String,
      default: '',
    },
    reviewer: {
      type: String,
      default: '',
    },
    startDate: {
      type: String,
      default: '',
    },
    targetDate: {
      type: String,
      default: '',
    },
    endDate: {
      type: String,
      default: '',
    },
    recurringTask: {
      type: Schema.Types.Mixed,
      default: null,
    },
    createdBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'client_service_settings',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id?.toString() || ret.id;
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

clientServiceSettingSchema.plugin(softDeletePlugin);

clientServiceSettingSchema.index({ clientId: 1, serviceId: 1, isDeleted: 1 });
clientServiceSettingSchema.index({ clientId: 1, serviceName: 1, isDeleted: 1 });
clientServiceSettingSchema.index({ clientId: 1, isActive: 1, isDeleted: 1 });
clientServiceSettingSchema.index({ orgId: 1, clientId: 1, isDeleted: 1 });

export const ClientServiceSetting = model<IClientServiceSettingDocument, ISoftDeleteModel<IClientServiceSettingDocument>>(
  'ClientServiceSetting',
  clientServiceSettingSchema
);
