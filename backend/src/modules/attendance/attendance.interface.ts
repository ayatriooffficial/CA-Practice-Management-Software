import { Document, Types } from 'mongoose';

export type AttendanceSource = 'punch' | 'regularized' | 'manual';
export type AttendancePunctuality = 'On Time' | 'Late' | '-';
export type DailyAttendanceBadge = 'Present' | 'Absent' | 'On Leave' | 'Half Day' | 'Week Off' | 'Holiday' | '-';

export interface IGeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface IAttendanceDocument extends Document {
  firmId: Types.ObjectId;
  userId: Types.ObjectId;
  date: string; // 'YYYY-MM-DD' IST
  punchIn: Date;
  punchOut?: Date;
  breakMinutes: number;
  totalMinutes: number;
  geo?: IGeoLocation;
  officeId?: string;
  distanceM?: number;
  source: AttendanceSource;
  status: AttendancePunctuality;
  workLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHolidayDocument extends Document {
  firmId: Types.ObjectId;
  date: string; // 'YYYY-MM-DD' IST
  name: string;
  description: string;
  createdAt: Date;
}

export interface IOfficeNoticeDocument extends Document {
  firmId: Types.ObjectId;
  title: string;
  body: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: Date;
}

export interface ILeaveDocument extends Document {
  firmId: Types.ObjectId;
  userId: Types.ObjectId;
  applicant: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned Leave';
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}
