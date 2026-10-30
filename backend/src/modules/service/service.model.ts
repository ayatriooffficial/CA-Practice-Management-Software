import { Schema, model } from 'mongoose';
import { IServiceDocument } from './service.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

export const subTaskSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: '' },
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    totalHours: { type: String, default: '00:00:00' },
    percentage: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    timeSpent: { type: String, default: '00:00:00' },
    taskId: { type: String, default: null },
    serviceId: { type: String, default: null },
  },
  { _id: false }
);

export const checklistSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    isMandatory: { type: Boolean, default: true },
    taskId: { type: String, default: null },
    serviceId: { type: String, default: null },
  },
  { _id: false }
);

export const documentRequestSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Received', 'Requested'],
      default: 'Pending',
    },
    isMandatory: { type: Boolean, default: true },
    fileUrl: { type: String, default: '' },
    receivedAt: { type: Date, default: null },
    taskId: { type: String, default: null },
    serviceId: { type: String, default: null },
  },
  { _id: false }
);

export const serviceSopSchema = new Schema(
  {
    purpose: { type: String, default: '' },
    applicability: { type: String, default: '' },
    steps: { type: [String], default: [] },
    lastUpdated: { type: Date, default: Date.now },
  },
  { _id: false }
);

export const serviceCommentSchema = new Schema(
  {
    id: { type: String, required: true },
    author: { type: String, required: true },
    authorInitials: { type: String, default: 'AU' },
    avatarColor: { type: String, default: '#3D6A9E' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export const recurringPeriodSchema = new Schema(
  {
    period: { type: String, required: true },
    subPeriod: { type: String, default: '' },
    dueIn: { type: String, required: true },
    dueInType: {
      type: String,
      enum: ['after_period', 'within_period'],
      default: 'after_period',
    },
    startDay: { type: Number, default: 1 },
    targetDay: { type: Number, default: 5 },
    dueDay: { type: Number, default: 7 },
    isOverride: { type: Boolean, default: false },
    startDate: { type: String, default: '' },
    targetDate: { type: String, default: '' },
    dueDate: { type: String, default: '' },
  },
  { _id: false }
);

export const recurringScheduleSchema = new Schema(
  {
    timingType: {
      type: String,
      enum: ['after_period', 'within_period'],
      default: 'after_period',
    },
    periods: { type: [recurringPeriodSchema], default: [] },
    generatedForYear: { type: String, default: '' },
    lastGeneratedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const serviceSchema = new Schema<IServiceDocument>(
  {
    serviceId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Service Name is required'],
      trim: true,
      maxlength: [150, 'Service name cannot exceed 150 characters'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Service Category is required'],
      trim: true,
    },
    frequency: {
      type: String,
      enum: [
        'Monthly',
        'Quarterly',
        'Half-Yearly',
        'Annually',
        'One-Time',
        'Weekly',
        'Bi-Weekly',
        'As-Needed',
      ],
      default: 'Monthly',
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Complex'],
      default: 'Medium',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: '',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringSchedule: {
      type: recurringScheduleSchema,
      default: null,
    },
    professionalFee: {
      type: Number,
      required: [true, 'Professional fee is required'],
      min: [0, 'Fee cannot be negative'],
      default: 0,
    },
    governmentFee: {
    type: Number,
    required: [true, 'Government fee is required'],
    min: [0, 'Government fee cannot be negative'],
    default: 0,
  },
  totalServiceFee: {
    type: Number,
    required: [true, 'Total service fee is required'],
    min: [0, 'Total service fee cannot be negative'],
    default: 0,
  },
    taxRate: {
      type: String,
      trim: true,
      default: '18%',
    },
    sacCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    exemptionReason: {
      type: String,
      trim: true,
      default: '',
    },
    maxOopBudget: {
      type: Number,
      min: [0, 'Max OOP budget cannot be negative'],
      default: 0,
    },
    tatDays: {
      type: Number,
      min: [0, 'TAT days cannot be negative'],
      default: 3,
    },
    tatHours: {
      type: String,
      trim: true,
      default: '00:00',
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      default: '',
    },
    sop: {
      type: String,
      trim: true,
      default: 'Standard SOP v1.0',
    },
    sopDetails: {
      type: serviceSopSchema,
      default: () => ({
        purpose: 'Standard operating procedure for service execution, quality compliance, and client delivery.',
        applicability: 'All active clients with recurring or on-demand engagements under this category.',
        steps: [
          'Initiate intake checklist and collect mandatory records',
          'Perform statutory verification and preliminary ledger analysis',
          'Execute regulatory computation and quality review',
          'Final sign-off, client confirmation, and portal submission',
        ],
        lastUpdated: new Date(),
      }),
    },
    comments: {
      type: [serviceCommentSchema],
      default: [],
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
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Draft'],
      default: 'Active',
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
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Apply soft delete plugin
serviceSchema.plugin(softDeletePlugin);

// Compound indexes for high-speed queries (Production Strategy)
serviceSchema.index({ isDeleted: 1, createdAt: -1 });
serviceSchema.index({ category: 1, isDeleted: 1 });
serviceSchema.index({ isRecurring: 1, isDeleted: 1 });
serviceSchema.index({ status: 1, isDeleted: 1 });
serviceSchema.index({ frequency: 1, isDeleted: 1 });
serviceSchema.index({ orgId: 1, isDeleted: 1, createdAt: -1 });

// Full text search index
serviceSchema.index(
  {
    name: 'text',
    category: 'text',
    sacCode: 'text',
    description: 'text',
  },
  {
    weights: {
      name: 10,
      category: 6,
      sacCode: 4,
      description: 2,
    },
    name: 'ServiceTextSearchIndex',
  }
);

export const Service = model<IServiceDocument, ISoftDeleteModel<IServiceDocument>>(
  'Service',
  serviceSchema
);
