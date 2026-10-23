import { Types } from 'mongoose';
import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

export type LeadGender = 'Male' | 'Female' | 'Others' | 'Transgender' | '';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'dropped';

export interface ILeadScore {
  score: number;
  businessSize: number;
  responseTime: number;
  engagement: number;
  sourceQuality: number;
}

export interface ILeadNoteItem {
  id: string;
  note: string;
  author: string;
  createdAt: Date;
}

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
  pipelineStage?: string;
  leadScore?: ILeadScore;
  dealValue?: number;
  daysInStage?: number;
  businessName?: string;
  businessType?: string;
  servicesInterested?: string[];
  gstin?: string;
  detailNotes?: ILeadNoteItem[];
  orgId?: string | Types.ObjectId | null;
  userId?: string | null;
  createdBy?: string | null;
  convertedToClientId?: Types.ObjectId | null;
  convertedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILeadDocument extends ILead, ISoftDeleteDocument {}
