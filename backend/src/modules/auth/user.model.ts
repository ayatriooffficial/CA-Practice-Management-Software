import { Schema, model } from 'mongoose';
import { IUserDocument } from './auth.interface';
import { addressSchema } from '../../shared/schemas/address.schema';
import { paymentDetailsSchema } from '../../shared/schemas/payment.schema';

const userSchema = new Schema<IUserDocument>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    firmName: {
      type: String,
      trim: true,
      default: '',
    },
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    password: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      set: (v: string) => (v ? v.toLowerCase() : 'employee'),
      enum: ['admin', 'partner', 'manager', 'employee', 'associate', 'staff', 'pending', 'rejected', '', 'Admin', 'Partner', 'Manager', 'Employee', 'Associate', 'Staff', 'Pending', 'Rejected'],
      default: 'employee',
      index: true,
    },
    initials: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'U',
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    designation: {
      type: String,
      trim: true,
      default: 'Staff',
    },
    internalCostRatePaisePerHour: {
      type: Number,
      min: 0,
      default: null,
      select: false,
    },
    status: {
      type: String,
      set: (v: string) => (v ? v.toLowerCase() : 'active'),
      enum: ['active', 'suspended', 'invited', 'deactivated', 'resigned', 'inactive', 'pending', 'rejected', 'Active', 'Suspended', 'Invited', 'Deactivated', 'Resigned', 'Inactive', 'Pending', 'Rejected'],
      default: 'active',
      index: true,
    },
    permissions: {
      type: Schema.Types.Mixed,
      default: {},
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    addressDetails: {
      type: addressSchema,
      default: () => ({}),
    },
    paymentDetails: {
      type: paymentDetailsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = String(ret._id);
        if (ret.orgId && typeof ret.orgId === 'object') {
          ret.firmName = ret.firmName || ret.orgId.name || '';
          ret.orgId = String(ret.orgId._id || ret.orgId);
        } else if (ret.orgId) {
          ret.orgId = String(ret.orgId);
        }
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Compound index for firm + email search
userSchema.index({ orgId: 1, email: 1 });

export const UserModel = model<IUserDocument>('User', userSchema);
