import { Schema, model } from 'mongoose';
import { ITaskDocument } from './task.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

const subTaskSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    timeSpent: { type: String, default: '00:00:00' },
  },
  { _id: false }
);

const checklistSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    isMandatory: { type: Boolean, default: true },
  },
  { _id: false }
);

const documentRequestSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Received', 'Requested'],
      default: 'Pending',
    },
    isMandatory: { type: Boolean, default: true },
    fileUrl: { type: String, default: '' },
    receivedAt: { type: Date, default: null },
  },
  { _id: false }
);

const commentSchema = new Schema(
  {
    id: { type: String, required: true },
    author: { type: String, required: true },
    authorInitials: { type: String, default: 'US' },
    avatarColor: { type: String, default: '#6366F1' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complianceStatusSchema = new Schema(
  {
    period: { type: String, default: 'Jun 2026' },
    dueDate: { type: String, default: '27 Jul, 2026' },
    status: {
      type: String,
      enum: ['Overdue', 'Compliant', 'Pending', 'Filed'],
      default: 'Pending',
    },
    filedDate: { type: String, default: '—' },
    referenceNo: { type: String, default: '—' },
    attachmentsCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const taskSchema = new Schema<ITaskDocument>(
  {
    taskId: {
      type: String,
      required: [true, 'Task ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    taskName: {
      type: String,
      default: '-',
      trim: true,
      index: true,
    },
    clientId: {
      type: String,
      default: null,
      index: true,
    },
    clientName: {
      type: String,
      required: [true, 'Client/Business name is required'],
      trim: true,
      index: true,
    },
    clientFileNo: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    clientPan: {
      type: String,
      default: '-',
      trim: true,
      index: true,
    },
    legalName: {
      type: String,
      default: '',
      trim: true,
    },
    serviceId: {
      type: String,
      default: null,
      index: true,
    },
    serviceName: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      index: true,
    },
    frequency: {
      type: String,
      default: 'Monthly',
      trim: true,
    },
    period: {
      type: String,
      default: 'Jun 2026',
      trim: true,
    },
    financialYear: {
      type: String,
      default: 'FY 2026 - 2027',
      trim: true,
      index: true,
    },
    department: {
      type: String,
      default: 'GST',
      trim: true,
      index: true,
    },
    assigneeId: {
      type: String,
      default: null,
      index: true,
    },
    assigneeName: {
      type: String,
      required: [true, 'Assignee name is required'],
      trim: true,
      index: true,
    },
    assigneeInitials: {
      type: String,
      default: 'MI',
    },
    assigneeColor: {
      type: String,
      default: '#8B5CF6',
    },
    reviewerId: {
      type: String,
      default: null,
    },
    reviewerName: {
      type: String,
      default: '',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Low',
      index: true,
    },
    startDate: {
      type: String,
      default: '27/07/2026',
    },
    targetDueDate: {
      type: String,
      default: '27/07/2026',
      index: true,
    },
    endDate: {
      type: String,
      default: '27/07/2026',
    },
    billingType: {
      type: String,
      enum: ['Billable', 'Non Billable'],
      default: 'Billable',
      index: true,
    },
    billingStatus: {
      type: String,
      enum: ['Pending', 'Ready to Bill', 'Billed'],
      default: 'Pending',
      index: true,
    },
    isSprintPlanner: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      default: 'GST',
      trim: true,
      index: true,
    },
    taskType: {
      type: String,
      enum: ['One-Time Task', 'Recurring Task'],
      default: 'One-Time Task',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'In Progress',
        'Sent for Review',
        'Request Changes',
        'Overdue',
        'Completed',
        'Ready to Bill',
        'On Hold',
        'Cancelled',
      ],
      default: 'Pending',
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    createProformaInvoice: {
      type: Boolean,
      default: false,
    },
    creatorName: {
      type: String,
      default: 'Dipak Sahani',
      trim: true,
    },
    adminId: {
      type: String,
      default: 'admin-dipak-sahani',
      trim: true,
      index: true,
    },
    subTasks: {
      type: [subTaskSchema],
      default: [
        { id: '1', title: 'Step 1', completed: false, timeSpent: '00:00:00' },
        { id: '2', title: 'Step 2', completed: false, timeSpent: '00:00:00' },
        { id: '3', title: 'Step 3', completed: false, timeSpent: '00:00:00' },
      ],
    },
    checklist: {
      type: [checklistSchema],
      default: [
        { id: 'c1', title: 'Verify Source Invoices & Bank Statements', completed: false, isMandatory: true },
        { id: 'c2', title: 'Reconcile 2B/GSTR Data on Portal', completed: false, isMandatory: true },
        { id: 'c3', title: 'Review Tax Computation & Get Partner Sign-off', completed: false, isMandatory: true },
      ],
    },
    documentRequests: {
      type: [documentRequestSchema],
      default: [
        { id: 'd1', title: 'Sales Register & Output Tax Summary', status: 'Pending', isMandatory: true },
        { id: 'd2', title: 'Bank Account Statement (Monthly)', status: 'Pending', isMandatory: true },
      ],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    complianceStatus: {
      type: complianceStatusSchema,
      default: () => ({
        period: 'Jun 2026',
        dueDate: '27 Jul, 2026',
        status: 'Pending',
        filedDate: '—',
        referenceNo: '—',
        attachmentsCount: 0,
      }),
    },
    isTimerRunning: {
      type: Boolean,
      default: false,
    },
    timerStartedAt: {
      type: Date,
      default: null,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

taskSchema.plugin(softDeletePlugin);

// Compound indexes for optimal query speeds
taskSchema.index({ status: 1, category: 1 });
taskSchema.index({ assigneeName: 1, status: 1 });
taskSchema.index({ createdAt: -1 });

export const Task = model<ITaskDocument, ISoftDeleteModel<ITaskDocument>>('Task', taskSchema);
