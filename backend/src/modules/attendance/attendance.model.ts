import { Schema, model } from 'mongoose';
import {
  IAttendanceDocument,
  IHolidayDocument,
  IOfficeNoticeDocument,
  ILeaveDocument,
} from './attendance.interface';

// 1. Attendance Schema
const attendanceSchema = new Schema<IAttendanceDocument>(
  {
    firmId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    punchIn: {
      type: Date,
      required: true,
    },
    punchOut: {
      type: Date,
      default: null,
    },
    breakMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    geo: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
    },
    officeId: {
      type: String,
      trim: true,
      default: '',
    },
    distanceM: {
      type: Number,
      default: null,
    },
    source: {
      type: String,
      enum: ['punch', 'regularized', 'manual'],
      default: 'punch',
    },
    status: {
      type: String,
      enum: ['On Time', 'Late', '-'],
      default: '-',
    },
    workLocation: {
      type: String,
      trim: true,
      default: 'Office',
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

// Compound Unique Index: One attendance document per user per IST date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
// Query Index for firm-wide daily records
attendanceSchema.index({ firmId: 1, date: 1 });

export const AttendanceModel = model<IAttendanceDocument>('Attendance', attendanceSchema, 'attendance');


// 2. Holiday Schema
const holidaySchema = new Schema<IHolidayDocument>(
  {
    firmId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

holidaySchema.index({ firmId: 1, date: 1 });
holidaySchema.index({ firmId: 1, date: 1, name: 1 }, { unique: true });

export const HolidayModel = model<IHolidayDocument>('Holiday', holidaySchema, 'holidays');


// 3. Office Notice Schema (Office Announcement Board)
const officeNoticeSchema = new Schema<IOfficeNoticeDocument>(
  {
    firmId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

officeNoticeSchema.index({ firmId: 1, createdAt: -1 });

export const OfficeNoticeModel = model<IOfficeNoticeDocument>(
  'OfficeNotice',
  officeNoticeSchema,
  'officenotices'
);


// 4. Leave Schema
const leaveSchema = new Schema<ILeaveDocument>(
  {
    firmId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    applicant: {
      type: String,
      required: true,
      trim: true,
    },
    leaveType: {
      type: String,
      enum: ['Casual Leave', 'Sick Leave', 'Earned Leave'],
      default: 'Casual Leave',
    },
    startDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    endDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    days: {
      type: Number,
      required: true,
      min: 0.5,
      default: 1,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    rejectionRemarks: {
      type: String,
      trim: true,
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

leaveSchema.index({ firmId: 1, userId: 1 });
leaveSchema.index({ firmId: 1, startDate: 1 });

export const LeaveModel = model<ILeaveDocument>('Leave', leaveSchema, 'leaves');
