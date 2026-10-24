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

export interface IServiceSop {
  purpose?: string;
  applicability?: string;
  steps?: string[];
  lastUpdated?: Date | string;
}

export interface IServiceComment {
  id: string;
  author: string;
  authorInitials?: string;
  avatarColor?: string;
  text: string;
  createdAt?: Date;
}

export interface IServiceRecurringPeriod {
  period: string; // e.g. "Apr 2026"
  subPeriod?: string; // e.g. "Filing for Apr 2026"
  dueIn: string; // e.g. "May 2026"
  dueInType?: 'after_period' | 'within_period';
  startDay: number;
  targetDay: number;
  dueDay: number;
  isOverride?: boolean;
  startDate?: string;
  targetDate?: string;
  dueDate?: string;
}

export interface IServiceRecurringSchedule {
  timingType: 'after_period' | 'within_period';
  periods: IServiceRecurringPeriod[];
  generatedForYear?: string;
  lastGeneratedAt?: Date | string;
}

export interface IService {
  serviceId?: string;
  name: string;
  category: string;
  frequency: ServiceFrequency;
  difficulty: ServiceDifficulty;
  description?: string;
  isRecurring: boolean;
  recurringSchedule?: IServiceRecurringSchedule;
  professionalFee: number;
  taxRate?: string;
  sacCode?: string;
  exemptionReason?: string;
  maxOopBudget?: number;
  tatDays?: number;
  tatHours?: string;
  note?: string;
  sop?: string;
  sopDetails?: IServiceSop;
  comments?: IServiceComment[];
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
