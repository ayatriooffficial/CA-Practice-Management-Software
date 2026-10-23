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
  'Turia Test',
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

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'tsk-06008',
    taskId: '#TSK06008',
    taskName: 'GST IFF',
    clientName: '1234 Milty',
    clientFileNo: 'PVT00001',
    clientPan: 'ATVPP3459J',
    legalName: '1234 Milty PVT LTD',
    serviceName: 'GST IFF',
    frequency: 'Monthly',
    period: 'Jun 2026',
    financialYear: 'FY 2026 - 2027',
    department: 'GST',
    assigneeName: 'Milton',
    assigneeInitials: 'MI',
    assigneeColor: '#8B5CF6',
    reviewerName: 'Deekshith',
    priority: 'Low',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Pending',
    isSprintPlanner: false,
    category: 'Retainer',
    taskType: 'One-Time Task',
    status: 'Pending',
    description: 'Prepare invoice data for IFF under QRMP scheme. Perform reconciliation with GSTR-2B before filing.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1 - Collect Invoices', completed: false, timeSpent: '00:00:00' },
      { id: '2', title: 'Step 2 - Reconcile GSTR-2B', completed: false, timeSpent: '00:00:00' },
      { id: '3', title: 'Step 3 - Final Filing', completed: false, timeSpent: '00:00:00' },
    ],
    checklist: [
      { id: 'c1', title: 'Verify B2B & B2C Invoices with Sales Book', completed: false, isMandatory: true },
      { id: 'c2', title: 'Confirm GSTR-2B ITC matches 100%', completed: false, isMandatory: true },
      { id: 'c3', title: 'Partner Sign-off on Net Tax Liability', completed: false, isMandatory: true },
    ],
    documentRequests: [
      { id: 'd1', title: 'Monthly Outward Sales Register (Excel)', status: 'Pending', isMandatory: true },
      { id: 'd2', title: 'Bank Statement for Jun 2026', status: 'Pending', isMandatory: true },
    ],
    comments: [],
    complianceStatus: {
      period: 'Jun 2026',
      dueDate: '27 Jul, 2026',
      status: 'Overdue',
      filedDate: '—',
      referenceNo: '—',
      attachmentsCount: 0,
    },
    createdAt: '2026-07-27T10:00:00Z',
  },
  {
    id: 'tsk-06007',
    taskId: '#TSK06007',
    taskName: '-',
    clientName: 'Turia Industries private Limited',
    clientFileNo: 'PVT0000',
    clientPan: 'ATVPP3459J',
    legalName: 'Turia',
    serviceName: 'GSTR-3B (Monthly)',
    frequency: 'Monthly',
    period: 'Jun 2026',
    financialYear: 'FY 2026 - 2027',
    department: 'GST',
    assigneeName: 'Milton',
    assigneeInitials: 'MI',
    assigneeColor: '#8B5CF6',
    reviewerName: 'Deekshith',
    priority: 'Low',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Pending',
    isSprintPlanner: false,
    category: 'GST',
    taskType: 'One-Time Task',
    status: 'Pending',
    description: 'Monthly GSTR-3B return compilation and liability setoff.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1', completed: false, timeSpent: '00:00:00' },
      { id: '2', title: 'Step 2', completed: false, timeSpent: '00:00:00' },
      { id: '3', title: 'Step 3', completed: false, timeSpent: '00:00:00' },
    ],
    checklist: [
      { id: 'c1', title: 'Verify ITC from 2B', completed: false },
      { id: 'c2', title: 'Pay Cash Ledger challan', completed: false },
    ],
    documentRequests: [
      { id: 'd1', title: 'Purchase Register', status: 'Pending' },
    ],
    comments: [],
    createdAt: '2026-07-27T09:30:00Z',
  },
  {
    id: 'tsk-06006',
    taskId: '#TSK06006',
    taskName: '-',
    clientName: 'KARNATAKA STORES',
    clientFileNo: 'IND00003',
    clientPan: 'AOVFV6657F',
    legalName: 'KARNATAKA STORES',
    serviceName: 'NOTICE - GST',
    frequency: 'One-Time',
    period: 'FY 2026 - 2027',
    financialYear: 'FY 2026 - 2027',
    department: 'GST',
    assigneeName: 'Deekshith',
    assigneeInitials: 'DE',
    assigneeColor: '#3B82F6',
    reviewerName: 'Milton',
    priority: 'Urgent',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Pending',
    isSprintPlanner: true,
    category: 'Notice',
    taskType: 'One-Time Task',
    status: 'Overdue',
    description: 'GST DRC-01 show-cause notice defense reply drafting and document submission.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1', completed: false, timeSpent: '00:00:00' },
      { id: '2', title: 'Step 2', completed: false, timeSpent: '00:00:00' },
    ],
    checklist: [],
    documentRequests: [],
    comments: [],
    createdAt: '2026-07-27T09:00:00Z',
  },
  {
    id: 'tsk-06005',
    taskId: '#TSK06005',
    taskName: '-',
    clientName: 'Turia Industries private Limited',
    clientFileNo: 'PVT0000',
    clientPan: 'ATVPP3459J',
    legalName: 'Turia',
    serviceName: 'Monthly Accounting',
    frequency: 'Monthly',
    period: 'Jun 2026',
    financialYear: 'FY 2026 - 2027',
    department: 'Accounts',
    assigneeName: 'Kishore',
    assigneeInitials: 'KI',
    assigneeColor: '#10B981',
    reviewerName: 'Pavan F',
    priority: 'Low',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Pending',
    isSprintPlanner: false,
    category: 'Accounts',
    taskType: 'One-Time Task',
    status: 'Pending',
    description: 'Bank reconciliation, sales voucher entry and journal reconciliation.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1', completed: false, timeSpent: '00:00:00' },
      { id: '2', title: 'Step 2', completed: false, timeSpent: '00:00:00' },
    ],
    checklist: [],
    documentRequests: [],
    comments: [],
    createdAt: '2026-07-27T08:30:00Z',
  },
  {
    id: 'tsk-06004',
    taskId: '#TSK06004',
    taskName: '-',
    clientName: 'Turia Industries private Limited',
    clientFileNo: 'PVT0000',
    clientPan: 'ATVPP3459J',
    legalName: 'Turia',
    serviceName: 'GST 3B - Monthly',
    frequency: 'Monthly',
    period: 'Jun 2026',
    financialYear: 'FY 2026 - 2027',
    department: 'GST',
    assigneeName: 'Santhosh Test',
    assigneeInitials: 'ST',
    assigneeColor: '#F59E0B',
    reviewerName: 'Milton',
    priority: 'High',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Pending',
    isSprintPlanner: false,
    category: 'GST',
    taskType: 'One-Time Task',
    status: 'In Progress',
    description: 'Reconcile ITC with 2B and verify supplier outward supplies.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1', completed: true, timeSpent: '00:15:00' },
      { id: '2', title: 'Step 2', completed: false, timeSpent: '00:00:00' },
    ],
    checklist: [],
    documentRequests: [],
    comments: [],
    createdAt: '2026-07-27T08:00:00Z',
  },
  {
    id: 'tsk-06003',
    taskId: '#TSK06003',
    taskName: 'Case 1',
    clientName: 'ADITYA ENTERPRISES',
    clientFileNo: 'SPE00242',
    clientPan: '-',
    legalName: 'ADITYA ENTERPRISES',
    serviceName: 'Case 1',
    frequency: 'Monthly',
    period: 'FY 2026 - 2027',
    financialYear: 'FY 2026 - 2027',
    department: 'Audit',
    assigneeName: 'Alsafa S',
    assigneeInitials: 'AS',
    assigneeColor: '#EC4899',
    reviewerName: 'Deekshith',
    priority: 'Medium',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Pending',
    isSprintPlanner: false,
    category: 'Stage 1',
    taskType: 'Recurring Task',
    status: 'Pending',
    description: 'Initial advisory and stage 1 document collection.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1', completed: false, timeSpent: '00:00:00' },
    ],
    checklist: [],
    documentRequests: [],
    comments: [],
    createdAt: '2026-07-27T07:45:00Z',
  },
  {
    id: 'tsk-06002',
    taskId: '#TSK06002',
    taskName: 'ITR-1 Return',
    clientName: 'ADITYA BIRLA FASHION',
    clientFileNo: 'PLC09920',
    clientPan: 'AABCB1122D',
    legalName: 'ADITYA BIRLA FASHION',
    serviceName: 'ITR-1 Return',
    frequency: 'Annually',
    period: 'AY 2026 - 2027',
    financialYear: 'FY 2025 - 2026',
    department: 'Income Tax',
    assigneeName: 'kavin raj',
    assigneeInitials: 'KR',
    assigneeColor: '#6366F1',
    reviewerName: 'Likith',
    priority: 'Low',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Ready to Bill',
    isSprintPlanner: false,
    category: 'Turia Test',
    taskType: 'Recurring Task',
    status: 'Completed',
    description: 'Salary and other sources individual return filed with Form 16 verification.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1', completed: true, timeSpent: '00:30:00' },
      { id: '2', title: 'Step 2', completed: true, timeSpent: '00:20:00' },
    ],
    checklist: [],
    documentRequests: [],
    comments: [],
    createdAt: '2026-07-27T07:30:00Z',
  },
  {
    id: 'tsk-06001',
    taskId: '#TSK06001',
    taskName: 'ITR-1 Return',
    clientName: 'ACHIEVERS MARKETING SOL...',
    clientFileNo: 'SPE00334',
    clientPan: '-',
    legalName: 'ACHIEVERS MARKETING...',
    serviceName: 'ITR-1 Return',
    frequency: 'Annually',
    period: 'AY 2026 - 2027',
    financialYear: 'FY 2025 - 2026',
    department: 'Income Tax',
    assigneeName: 'Pavan F',
    assigneeInitials: 'PF',
    assigneeColor: '#14B8A6',
    reviewerName: 'Milton',
    priority: 'Low',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Ready to Bill',
    isSprintPlanner: false,
    category: 'Loan',
    taskType: 'Recurring Task',
    status: 'Ready to Bill',
    description: 'Individual return ready for invoice generation.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1', completed: true, timeSpent: '00:25:00' },
    ],
    checklist: [],
    documentRequests: [],
    comments: [],
    createdAt: '2026-07-27T07:15:00Z',
  },
  {
    id: 'tsk-06000',
    taskId: '#TSK06000',
    taskName: 'ITR-3 (Non - Audit A...',
    clientName: 'AANYA HOSPITALITY LLP',
    clientFileNo: 'SPE00284',
    clientPan: 'AAIFA3344K',
    legalName: 'AANYA HOSPITALITY LLP',
    serviceName: 'ITR-3 (Non - Audit A...',
    frequency: 'Annually',
    period: 'AY 2026 - 2027',
    financialYear: 'FY 2025 - 2026',
    department: 'Income Tax',
    assigneeName: 'Likith',
    assigneeInitials: 'LI',
    assigneeColor: '#06B6D4',
    reviewerName: 'Santhosh Test',
    priority: 'Medium',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Ready to Bill',
    isSprintPlanner: false,
    category: 'Income Tax',
    taskType: 'Recurring Task',
    status: 'Completed',
    description: 'LLP business ITR filed under Section 44AD presumptive scheme.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1', completed: true, timeSpent: '00:40:00' },
      { id: '2', title: 'Step 2', completed: true, timeSpent: '00:15:00' },
    ],
    checklist: [],
    documentRequests: [],
    comments: [],
    createdAt: '2026-07-27T07:00:00Z',
  },
  {
    id: 'tsk-05999',
    taskId: '#TSK05999',
    taskName: 'ITR-1 Return',
    clientName: '1234',
    clientFileNo: 'AOPT00003',
    clientPan: '-',
    legalName: 'sdfsajl',
    serviceName: 'ITR-1 Return',
    frequency: 'Annually',
    period: 'AY 2026 - 2027',
    financialYear: 'FY 2025 - 2026',
    department: 'Income Tax',
    assigneeName: 'Vignesh Sabapathi',
    assigneeInitials: 'VS',
    assigneeColor: '#84CC16',
    reviewerName: 'Milton',
    priority: 'Low',
    startDate: '27/07/2026',
    targetDueDate: '27/07/2026',
    endDate: '27/07/2026',
    billingType: 'Billable',
    billingStatus: 'Ready to Bill',
    isSprintPlanner: false,
    category: 'Customs',
    taskType: 'Recurring Task',
    status: 'Completed',
    description: 'Income tax individual verification.',
    creatorName: '',
    adminId: '',
    subTasks: [
      { id: '1', title: 'Step 1', completed: true, timeSpent: '00:10:00' },
    ],
    checklist: [],
    documentRequests: [],
    comments: [],
    createdAt: '2026-07-27T06:45:00Z',
  },
];
