import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

export type TaskStatus =
  | 'Pending'
  | 'In Progress'
  | 'Sent for Review'
  | 'Request Changes'
  | 'Overdue'
  | 'Completed'
  | 'Ready to Bill'
  | 'On Hold'
  | 'Cancelled';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskBillingType = 'Billable' | 'Non Billable';
export type TaskType = 'One-Time Task' | 'Recurring Task';

export interface ITaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  isMandatory?: boolean;
  taskId?: string | null;
  serviceId?: string | null;
}

export interface ITaskDocumentRequestItem {
  id: string;
  title: string;
  description?: string;
  status: 'Pending' | 'Received' | 'Requested';
  isMandatory?: boolean;
  fileUrl?: string;
  receivedAt?: Date | null;
  taskId?: string | null;
  serviceId?: string | null;
}

export interface ITaskSubTask {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  completed: boolean;
  timeSpent?: string;
  totalHours?: string;
  percentage?: number;
  taskId?: string | null;
  serviceId?: string | null;
}

export interface ITaskComment {
  id: string;
  author: string;
  authorInitials?: string;
  avatarColor?: string;
  text: string;
  createdAt: Date;
}

export interface ITaskCompliance {
  period: string;
  dueDate: string;
  status: 'Overdue' | 'Compliant' | 'Pending' | 'Filed';
  filedDate?: string;
  referenceNo?: string;
  attachmentsCount?: number;
}


export interface ILinkedEmail {
  messageId: string;
  threadId: string;
  subject: string;
  snippet: string;
  sender: string;
  date: Date;
  linkedAt: Date;
}

export interface ITask {
  taskId: string;
  taskName: string;
  clientId?: string;
  clientName: string;
  clientFileNo: string;
  clientPan: string;
  legalName: string;
  serviceId?: string;
  serviceName: string;
  frequency: string;
  period: string;
  financialYear: string;
  department: string;
  assigneeId?: string;
  assigneeName: string;
  assigneeInitials?: string;
  assigneeColor?: string;
  reviewerId?: string;
  reviewerName?: string;
  priority: TaskPriority;
  startDate: string;
  targetDueDate: string;
  endDate: string;
  billingType: TaskBillingType;
  billingStatus?: 'Pending' | 'Ready to Bill' | 'Billed';
  isSprintPlanner: boolean;
  category: string;
  taskType: TaskType;
  status: TaskStatus;
  description?: string;
  createProformaInvoice?: boolean;
  creatorName?: string;
  adminId?: string;
  sop?: string;
  subTasks: ITaskSubTask[];
  checklist: ITaskChecklistItem[];
  documentRequests: ITaskDocumentRequestItem[];
  comments: ITaskComment[];
  linkedEmails?: ILinkedEmail[];
  complianceStatus?: ITaskCompliance;
  isTimerRunning?: boolean;
  timerStartedAt?: Date | null;
  timeSpentSeconds?: number;
  orgId?: string | null;
  userId?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITaskDocument extends ITask, ISoftDeleteDocument {}

export interface ITaskProfitabilityReportRow {
  taskId: string;
  clientName: string;
  serviceName: string;
  assigneeName: string;
  reportDate: string;
  revenue: number | null;
  manpowerCost: number | null;
  expense: number | null;
  profit: number | null;
}

export interface ITaskSummaryRow {
  groupKey: string;
  groupLabel: string;
  initials?: string;
  avatarColor?: string;
  pending: number;
  inProgress: number;
  sentForReview: number;
  requestChanges: number;
  wipSubTotal: number;
  overdue: number;
  dueToday: number;
  completed: number;
  readyToBill: number;
  onHold: number;
  total: number;
  donePercentage: number;
}

export interface ITaskStats {
  wip: number;
  pending: number;
  inProgress: number;
  sentForReview: number;
  requestChanges: number;
  overdue: number;
  completed: number;
  readyToBill: number;
  cancelled: number;
  allTasks: number;
}
