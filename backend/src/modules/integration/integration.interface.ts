import { Document } from 'mongoose';

export interface IIntegrationDocument extends Document {
  provider: 'google';
  email: string;
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
  scope?: string;
  createdAt: Date;
  updatedAt: Date;
}
