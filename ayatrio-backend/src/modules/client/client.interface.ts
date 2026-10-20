import { Types } from 'mongoose';
import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

export interface IPromoterFile {
  key?: number;
  name: string;
  pan?: string;
  share?: string;
  designation?: string;
  mcaId?: string;
  mcaPassword?: string;
}

export interface IStatutoryFile {
  key?: number;
  type: string;
  idNo: string;
  userId?: string;
  password?: string;
  attachment?: string | null;
}

export interface IRecurringFile {
  key?: number;
  category: string;
  service: string;
  tariff: string;
}

export interface ICustomerFiles {
  promoter: IPromoterFile[];
  statutory: IStatutoryFile[];
  recurring: IRecurringFile[];
}

export interface IClient {
  name: string;
  fileNo: string;
  type: string;
  mobile: string;
  secondaryMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  group: string;
  tags: string[];
  active: boolean;
  services: string[];
  users: string[];
  pan?: string;
  dob?: string;
  referredBy?: string;
  photo?: string | null;
  leadId?: Types.ObjectId | null;
  customerFiles: ICustomerFiles;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IClientDocument extends IClient, ISoftDeleteDocument {}
