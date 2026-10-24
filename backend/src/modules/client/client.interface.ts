import { Types } from 'mongoose';
import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';
import { IAddress } from '../../shared/schemas/address.schema';
import { IPaymentDetails } from '../../shared/schemas/payment.schema';

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

export interface IClientLicense {
  id?: string;
  name: string;
  licenseNo?: string;
  issuedDate?: string;
  expiryDate?: string;
  url?: string;
  file?: string | null;
  remarks?: string;
}

export interface IClientDsc {
  id?: string;
  dscId?: string;
  name: string;
  issuedDate?: string;
  expiryDate: string;
  binNumber?: string;
  vendor?: string;
  class?: string;
  location: 'CA Office' | 'Client Office' | 'Missing' | string;
  status: 'Active' | 'Expired' | string;
  remarks?: string;
}

export interface IClientDocumentInOut {
  id?: string;
  documentName: string;
  personName: string;
  date: string;
  status: 'In' | 'Out' | string;
  returnable: boolean | string;
  returnDate?: string;
  remarks?: string;
  file?: string | null;
}

export interface IClientRecurringTaskConfig {
  taskName?: string;
  frequency?: string;
  priority?: string;
  startDay?: string | number;
  startDate?: string;
  targetDay?: string | number;
  targetDate?: string;
  endDay?: string | number;
  endDate?: string;
  assignee?: string;
  reviewer?: string;
}

export interface IClientServiceSetting {
  id?: string;
  serviceId?: string;
  serviceName: string;
  category: string;
  compliance: boolean;
  recTask: 'Enabled' | 'Disabled' | string;
  recInvoice: 'Enabled' | 'Disabled' | string;
  frequency: string;
  start: string;
  target: string;
  end: string;
  invFreq?: string;
  invDay?: number | string;
  amount: number;
  // Recurring Task Fields matching UI
  taskName?: string;
  priority?: string;
  assignee?: string;
  reviewer?: string;
  startDate?: string;
  targetDate?: string;
  endDate?: string;
  recurringTask?: IClientRecurringTaskConfig;
}

export interface IClientPassword {
  id?: string;
  portal: string;
  userId: string;
  password?: string;
  url?: string;
  remarks?: string;
}

export interface IClientNote {
  id?: string;
  title: string;
  content: string;
  createdAt: string;
  author?: string;
}

export interface IClientContact {
  id?: string;
  name: string;
  isPrimary?: boolean;
  designation?: string;
  din?: string;
  dinStatus?: string;
  appointmentDate?: string;
  dob?: string;
  email?: string;
  mobile?: string;
  pan?: string;
  aadhar?: string;
  passport?: string;
  fatherName?: string;
  address?: string;
  createdAt?: string;
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
  addressDetails?: IAddress;
  paymentDetails?: IPaymentDetails;
  group: string;
  tags: string[];
  active: boolean;
  status?: string;
  legalName?: string;
  services: string[];
  users: string[];
  pan?: string;
  dob?: string;
  referredBy?: string;
  photo?: string | null;
  leadId?: Types.ObjectId | null;
  customerFiles: ICustomerFiles;
  promoters?: any[];
  contacts?: IClientContact[];
  licenses?: IClientLicense[];
  dscs?: IClientDsc[];
  documentsInOut?: IClientDocumentInOut[];
  serviceSettings?: IClientServiceSetting[];
  passwords?: IClientPassword[];
  notes?: IClientNote[];
  orgId?: string | null;
  userId?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IClientDocument extends IClient, ISoftDeleteDocument {}
