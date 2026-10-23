import { Schema, model } from 'mongoose';
import { ITrustedDeviceDocument } from './auth.interface';

const trustedDeviceSchema = new Schema<ITrustedDeviceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB automatic TTL cleanup
    },
    userAgent: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
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

// Compound unique index for email + deviceId
trustedDeviceSchema.index({ email: 1, deviceId: 1 }, { unique: true });

export const TrustedDeviceModel = model<ITrustedDeviceDocument>(
  'TrustedDevice',
  trustedDeviceSchema
);
