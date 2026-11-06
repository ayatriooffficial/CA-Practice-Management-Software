import { Schema, model } from 'mongoose';
import { IGroupDocument } from './group.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

const groupSchema = new Schema<IGroupDocument>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      index: true,
    },
    groupId: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    clientIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        index: true,
      },
    ],
    pocClientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
      index: true,
    },
    orgId: {
      type: String,
      index: true,
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
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Apply soft-delete plugin
groupSchema.plugin(softDeletePlugin);

// Compound text search index
groupSchema.index({ name: 'text', groupId: 'text', description: 'text' });

export const Group = model<IGroupDocument, ISoftDeleteModel<IGroupDocument>>(
  'Group',
  groupSchema
);

