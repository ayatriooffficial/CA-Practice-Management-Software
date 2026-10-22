import { Schema, model } from 'mongoose';
import { IOtpVerificationDocument } from './auth.interface';

const otpSchema = new Schema<IOtpVerificationDocument>(
  {
    target: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['login', 'signup', 'reset'],
      default: 'login',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Auto delete when expired
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const OtpVerificationModel = model<IOtpVerificationDocument>('OtpVerification', otpSchema);
