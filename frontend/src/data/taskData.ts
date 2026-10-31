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

export interface TaskSubTask {
  id: string;
  title: string;
  name?: string;
  completed: boolean;
  timeSpent?: string;
  totalHours?: string;
  percentage?: number;
  taskId?: string;
  serviceId?: string;
}

export interface TaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  isMandatory?: boolean;
  taskId?: string;
  serviceId?: string;
}

export interface TaskTemplateChecklistItem {
  id?: string;
  title: string;
  isMandatory?: boolean;
}

export interface TaskTemplateItem {
  id: string;
  _id?: string;
  templateName: string;
  taskTitle: string;
  category: string;
  department?: string;
  priority: TaskPriority;
  frequency: string;
  estimatedHours?: string;
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string;
  defaultReviewerId?: string | null;
  defaultReviewerName?: string;
  billingType: TaskBillingType;
  description?: string;
  checklist?: TaskTemplateChecklistItem[];
  orgId?: string | null;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskDocumentRequestItem {
  id: string;
  title: string;
  description?: string;
  status: 'Pending' | 'Received' | 'Requested';
  isMandatory?: boolean;
  fileUrl?: string;
  receivedAt?: string;
  taskId?: string;
  serviceId?: string;
}

export interface TaskComment {
  id: string;
  author: string;
  authorInitials?: string;
  avatarColor?: string;
  text: string;
  createdAt: string;
}

export interface TaskComplianceStatus {
  period: string;
  dueDate: string;
  status: 'Overdue' | 'Compliant' | 'Pending' | 'Filed';
  filedDate?: string;
  referenceNo?: string;
  attachmentsCount?: number;
}

export interface LinkedEmail {
  messageId: string;
  threadId: string;
  subject: string;
  snippet: string;
  sender: string;
  date: string | Date;
  linkedAt: string | Date;
}

export interface TaskItem {
  id: string;
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
  subTasks: TaskSubTask[];
  checklist: TaskChecklistItem[];
  documentRequests: TaskDocumentRequestItem[];
  comments: TaskComment[];
  linkedEmails?: LinkedEmail[];
  complianceStatus?: TaskComplianceStatus;
  isTimerRunning?: boolean;
  timeSpentSeconds?: number;
  trackedHours?: number;
  hourlyRate?: number;
  serviceFee?: number;
  clientGstin?: string;
  groupName?: string;
  clientAddress?: string;
  reimbursements?: Array<{ id: string; category?: string; title?: string; description?: string; amount: number }>;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskSummaryRow {
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

export interface TaskStats {
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

export const TASK_CATEGORIES = [
  'All Categories',
  'CA Test',
  'Stage 1',
  'Loan',
  'Customs',
  'Pune PT',
  'GST',
  'Income Tax',
  'Accounts',
  'Notice',
  'Retainer',
];

export const TASK_DEPARTMENTS = [
  'All Dept',
  'GST',
  'Income Tax',
  'Accounts',
  'Audit',
  'MCA/ROC',
  'Customs',
  'Loan',
  'Pune PT',
  'Legal',
];

export const FINANCIAL_YEARS = [
  'FY 2026 - 2027',
  'FY 2025 - 2026',
  'FY 2024 - 2025',
  'FY 2023 - 2024',
];

export const INITIAL_TASKS: TaskItem[] = [];
