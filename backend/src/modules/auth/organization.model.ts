import { Schema, model } from 'mongoose';
import { IOrganizationDocument } from './auth.interface';

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
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
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
