import { Schema, model } from 'mongoose';
import { ITaskDocument } from './task.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';
import { subTaskSchema, checklistSchema, documentRequestSchema } from '../service/service.model';

const commentSchema = new Schema(
  {
    id: { type: String, required: true },
    author: { type: String, required: true },
    authorInitials: { type: String, default: '' },
    avatarColor: { type: String, default: '#3D6A9E' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complianceStatusSchema = new Schema(
  {
    period: { type: String, default: '' },
    dueDate: { type: String, default: '' },
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

export const linkedEmailSchema = new Schema(
  {
    messageId: { type: String, required: true },
    threadId: { type: String, required: true },
    subject: { type: String, default: '' },
    snippet: { type: String, default: '' },
    sender: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export const taskSchema = new Schema<ITaskDocument>(
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
      default: '',
      trim: true,
    },
    period: {
      type: String,
      default: ' ',
      trim: true,
    },
    financialYear: {
      type: String,
      default: '',
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
    },
    assigneeInitials: {
      type: String,
      default: '',
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
      default: '',
    },
    targetDueDate: {
      type: String,
      default: '',
      index: true,
    },
    endDate: {
      type: String,
      default: '',
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
      default: '',
      trim: true,
    },
    adminId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    orgId: {
      type: String,
      default: null,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    createdBy: {
      type: String,
      default: null,
      index: true,
    },
    sop: {
      type: String,
      default: '',
    },
    subTasks: {
      type: [subTaskSchema],
      default: [],
    },
    checklist: {
      type: [checklistSchema],
      default: [],
    },
    documentRequests: {
      type: [documentRequestSchema],
      default: [],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    linkedEmails: {
      type: [linkedEmailSchema],
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

// Compound indexes for optimal query speeds (Production Strategy)
taskSchema.index({ taskId: 1 }, { unique: true });
taskSchema.index({ isDeleted: 1, createdAt: -1 });
taskSchema.index({ status: 1, category: 1, isDeleted: 1 });
taskSchema.index({ assigneeName: 1, status: 1, isDeleted: 1 });
taskSchema.index({ clientId: 1, isDeleted: 1 });
taskSchema.index({ targetDueDate: 1, isDeleted: 1 });
taskSchema.index({ orgId: 1, isDeleted: 1, createdAt: -1 });

export const Task = model<ITaskDocument, ISoftDeleteModel<ITaskDocument>>('Task', taskSchema);
