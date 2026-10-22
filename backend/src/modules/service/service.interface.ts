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
  name?: string;
  title?: string;
  description?: string;
  totalHours?: string;
  percentage?: number;
  completed?: boolean;
  timeSpent?: string;
  attachments?: string[];
  taskId?: string | null;
  serviceId?: string | null;
}

export interface IServiceChecklistItem {
  id: string;
  title: string;
  completed?: boolean;
  isMandatory?: boolean;
  taskId?: string | null;
  serviceId?: string | null;
}

export interface IServiceDocumentRequestItem {
  id: string;
  title: string;
  description?: string;
  status?: 'Pending' | 'Received' | 'Requested';
  isMandatory?: boolean;
  fileUrl?: string;
  receivedAt?: Date | null;
  taskId?: string | null;
  serviceId?: string | null;
}

export interface IService {
  serviceId?: string;
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
  orgId?: string | null;
  userId?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IServiceDocument extends IService, ISoftDeleteDocument {}
