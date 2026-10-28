import { Schema, model } from 'mongoose';
import { ISoftDeleteDocument, softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

export interface ITaskTemplateChecklistItem {
  id?: string;
  title: string;
  isMandatory?: boolean;
}

export interface ITaskTemplate {
  templateName: string;
  taskTitle: string;
  category: string;
  department?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  frequency: string;
  estimatedHours?: string;
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string;
  defaultReviewerId?: string | null;
  defaultReviewerName?: string;
  billingType: 'Billable' | 'Non Billable';
  description?: string;
  checklist?: ITaskTemplateChecklistItem[];
  orgId?: string | null;
  userId?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskTemplateDocument extends ITaskTemplate, ISoftDeleteDocument {}

const templateChecklistSchema = new Schema(
  {
    id: { type: String, default: () => `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` },
    title: { type: String, required: true },
    isMandatory: { type: Boolean, default: true },
  },
  { _id: false }
);

export const taskTemplateSchema = new Schema<ITaskTemplateDocument>(
  {
    templateName: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      index: true,
    },
    taskTitle: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      default: 'GST',
      trim: true,
      index: true,
    },
    department: {
      type: String,
      default: 'GST',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    frequency: {
      type: String,
      default: 'One-Time',
    },
    estimatedHours: {
      type: String,
      default: '',
    },
    defaultAssigneeId: {
      type: String,
      default: null,
    },
    defaultAssigneeName: {
      type: String,
      default: '',
    },
    defaultReviewerId: {
      type: String,
      default: null,
    },
    defaultReviewerName: {
      type: String,
      default: '',
    },
    billingType: {
      type: String,
      enum: ['Billable', 'Non Billable'],
      default: 'Billable',
    },
    description: {
      type: String,
      default: '',
    },
    checklist: {
      type: [templateChecklistSchema],
      default: [],
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

taskTemplateSchema.plugin(softDeletePlugin);

taskTemplateSchema.index({ orgId: 1, isDeleted: 1, createdAt: -1 });

export const TaskTemplate = model<ITaskTemplateDocument, ISoftDeleteModel<ITaskTemplateDocument>>(
  'TaskTemplate',
  taskTemplateSchema
);
