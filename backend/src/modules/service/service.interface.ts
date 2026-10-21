import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

export type ServiceFrequency =
  | 'Monthly'
  | 'Quarterly'
  | 'Half-Yearly'
  | 'Annually'
  | 'One-Time'
  | 'Weekly'
  | 'Bi-Weekly'
  | 'As-Needed';

export type ServiceDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Complex';

export type ServiceStatus = 'Active' | 'Inactive' | 'Draft';

export interface IServiceSubTask {
  id: string;
  name: string;
  description?: string;
  totalHours?: string;
  percentage?: number;
  attachments?: string[];
}

export interface IServiceChecklistItem {
  id: string;
  title: string;
  isMandatory?: boolean;
}

export interface IServiceDocumentRequestItem {
  id: string;
  title: string;
  description?: string;
  isMandatory?: boolean;
}

export interface IService {
  name: string;
  category: string;
  frequency: ServiceFrequency;
  difficulty: ServiceDifficulty;
  description?: string;
  isRecurring: boolean;
  professionalFee: number;
  taxRate?: string;
  sacCode?: string;
  exemptionReason?: string;
  maxOopBudget?: number;
  tatDays?: number;
  tatHours?: string;
  note?: string;
  sop?: string;
  subTasks?: (string | IServiceSubTask)[];
  checklist?: (string | IServiceChecklistItem)[];
  documentRequests?: (string | IServiceDocumentRequestItem)[];
  status: ServiceStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IServiceDocument extends IService, ISoftDeleteDocument {}
