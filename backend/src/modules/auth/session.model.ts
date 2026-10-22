import { Schema, model } from 'mongoose';
import { IRefreshSessionDocument } from './auth.interface';

const sessionSchema = new Schema<IRefreshSessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB automatic TTL cleanup
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = String(ret._id);
        delete ret.__v;
        delete ret.tokenHash;
        return ret;
      },
    },
  }
);

export const RefreshSessionModel = model<IRefreshSessionDocument>('RefreshSession', sessionSchema);
