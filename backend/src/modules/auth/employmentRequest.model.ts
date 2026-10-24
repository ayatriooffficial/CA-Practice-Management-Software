import { Schema, model, Document, Types } from 'mongoose';

export type EmploymentRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface IEmploymentRequestDocument extends Document {
  userId: Types.ObjectId;
  name: string;
  email: string;
  status: EmploymentRequestStatus;
  requestedAt: Date;
  statusChangedAt: Date;
  decidedBy?: Types.ObjectId | null;
  decidedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const employmentRequestSchema = new Schema<IEmploymentRequestDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    statusChangedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedByName: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for sorting by status and most recent changes
employmentRequestSchema.index({ status: 1, statusChangedAt: -1 });

export const EmploymentRequestModel = model<IEmploymentRequestDocument>(
  'EmploymentRequest',
  employmentRequestSchema
);
