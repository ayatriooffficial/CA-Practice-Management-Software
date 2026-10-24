export interface ServiceSubTask {
  id: string;
  name: string;
  description?: string;
  totalHours?: string;
  percentage?: number;
  attachments?: string[];
}

export interface ServiceChecklistItem {
  id: string;
  title: string;
  isMandatory?: boolean;
}

export interface ServiceDocumentRequestItem {
  id: string;
  title: string;
  description?: string;
  isMandatory?: boolean;
}

export interface ServiceSop {
  purpose?: string;
  applicability?: string;
  steps?: string[];
  lastUpdated?: string | Date;
}

export interface ServiceComment {
  id: string;
  author: string;
  authorInitials?: string;
  avatarColor?: string;
  text: string;
  createdAt?: string | Date;
}

export interface ServiceRecurringPeriod {
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

export interface ServiceRecurringSchedule {
  timingType: 'after_period' | 'within_period';
  periods: ServiceRecurringPeriod[];
  generatedForYear?: string;
  lastGeneratedAt?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  frequency: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Complex';
  description?: string;
  isRecurring: boolean;
  recurringSchedule?: ServiceRecurringSchedule;
  professionalFee: number;
  taxRate?: string;
  sacCode?: string;
  exemptionReason?: string;
  maxOopBudget?: number;
  tatDays?: number;
  tatHours?: string;
  note?: string;
  sop?: string;
  sopDetails?: ServiceSop;
  comments?: ServiceComment[];
  subTasks?: (string | ServiceSubTask)[];
  checklist?: (string | ServiceChecklistItem)[];
  documentRequests?: (string | ServiceDocumentRequestItem)[];
  status: 'Active' | 'Inactive' | 'Draft';
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export const SERVICE_CATEGORIES = [
  'Retainer',
  'G.S.T',
  'Income Tax',
  'R.O.C',
  'E.P.F.P',
  'E.S.I.C',
  'Audit',
  'Import Export',
  'Profession Tax',
  'Shram Suvida',
  'Trade License',
];

export const SERVICE_FREQUENCIES = [
  'Monthly',
  'Quarterly',
  'Half-Yearly',
  'Annually',
  'One-Time',
  'Weekly',
  'Bi-Weekly',
  'As-Needed',
];

export const SERVICE_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Complex'] as const;

export const TAX_RATES = ['18%', '12%', '5%', '0%', 'Exempt'];

export const EXEMPTION_REASONS = [
  'SEZ Supply',
  'Export of Services',
  'Nil Rated',
  'Government Entity',
  'Other',
];

export const INITIAL_SERVICES: Service[] = [];
