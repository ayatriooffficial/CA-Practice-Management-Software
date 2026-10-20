import { Types } from 'mongoose';
import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

export type LeadGender = 'Male' | 'Female' | 'Others' | 'Transgender' | '';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'dropped';

export interface ILead {
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  abbreviation?: string;
  dob?: string;
  aadhaarMobile?: string;
  mobile: string;
  email?: string;
  pan?: string;
  panAttachment?: string | null;
  aadhaar?: string;
  aadhaarAttachment?: string | null;
  gender?: LeadGender;
  address?: string;
  country: string;
  state?: string;
  pincode?: string;
  nationality: string;
  policeStation?: string;
  postOffice?: string;
  din?: string;
  dinAttachment?: string | null;
  mcaId?: string;
  mcaPassword?: string;
  referredBy?: string;
  photo?: string | null;
  status: LeadStatus;
  notes?: string;
  convertedToClientId?: Types.ObjectId | null;
  convertedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILeadDocument extends ILead, ISoftDeleteDocument {}
