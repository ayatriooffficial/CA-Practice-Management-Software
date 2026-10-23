import { Document, Types } from 'mongoose';
import { IAddress } from '../../shared/schemas/address.schema';
import { IPaymentDetails } from '../../shared/schemas/payment.schema';

export type UserRole = 'admin' | 'partner' | 'manager' | 'employee' | 'associate' | 'staff';
export type UserStatus = 'active' | 'suspended' | 'invited';

export interface IPermissionAction {
  view: boolean;
  addEdit: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
}

export type RolePermissionsMap = Record<string, IPermissionAction>;

export interface IOrganization {
  _id: Types.ObjectId;
  name: string;
  code?: string;
  pan?: string;
  gstin?: string;
  email?: string;
  mobile?: string;
  website?: string;
  lutNumber?: string;
  lutDisabled?: boolean;
  address?: string;
  addressDetails?: IAddress;
  paymentDetails?: IPaymentDetails;
  totalSeats: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganizationDocument extends IOrganization, Document {
  _id: Types.ObjectId;
}

export interface IUser {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  firmName?: string;
  name: string;
  email: string;
  mobile: string;
  passwordHash?: string;
  role: UserRole;
  initials: string;
  department?: string;
  designation?: string;
  /** Internal labor cost in paise per hour; never a customer billing rate. */
  internalCostRatePaisePerHour?: number;
  status: UserStatus;
  permissions?: RolePermissionsMap;
  tokenVersion: number;
  lastLoginAt?: Date;
  addressDetails?: IAddress;
  paymentDetails?: IPaymentDetails;
  isEmailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
}

export interface IRefreshSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  orgId: Types.ObjectId;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshSessionDocument extends IRefreshSession, Document {
  _id: Types.ObjectId;
}

export interface IOtpVerification {
  _id: Types.ObjectId;
  target: string; // email or mobile
  codeHash: string;
  type: 'login' | 'signup' | 'reset';
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface IOtpVerificationDocument extends IOtpVerification, Document {
  _id: Types.ObjectId;
}

export interface IJwtUserPayload {
  userId: string;
  orgId: string;
  firmName: string;
  email: string;
  role: UserRole;
  name: string;
  initials: string;
  permissions?: RolePermissionsMap;
  tokenVersion: number;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
}

export interface ITrustedDevice {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  email: string;
  deviceId: string;
  tokenHash: string;
  isVerified: boolean;
  verifiedAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrustedDeviceDocument extends ITrustedDevice, Document {
  _id: Types.ObjectId;
}

export interface IDeviceCredential {
  email: string;
  deviceId: string;
  deviceToken: string;
}

