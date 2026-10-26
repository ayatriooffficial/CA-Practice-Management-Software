import { Schema, model } from 'mongoose';
import { IIntegrationDocument } from './integration.interface';

const integrationSchema = new Schema<IIntegrationDocument>(
  {
    provider: {
      type: String,
      required: true,
      enum: ['google'],
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    refreshToken: {
      type: String,
      required: true,
      trim: true,
    },
    accessToken: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Number,
    },
    scope: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

integrationSchema.index({ provider: 1 }, { unique: true });

export const IntegrationModel = model<IIntegrationDocument>(
  'Integration',
  integrationSchema
);
