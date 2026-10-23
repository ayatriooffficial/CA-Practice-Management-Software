import { Schema, model } from 'mongoose';
import { IUserDocument } from './auth.interface';

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
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'partner', 'manager', 'employee', 'associate', 'staff', 'Admin', 'Partner', 'Manager', 'Employee'],
      default: 'admin',
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
      enum: ['active', 'suspended', 'invited', 'Active', 'Deactivated', 'Resigned', 'Inactive'],
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
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = String(ret._id);
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
