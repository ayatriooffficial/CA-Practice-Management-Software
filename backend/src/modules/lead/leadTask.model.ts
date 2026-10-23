import { Schema, model, Types } from 'mongoose';
import { softDeletePlugin, ISoftDeleteDocument, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

export interface ILeadTask {
  leadId: Types.ObjectId | string;
  title: string;
  taskDate: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  assigneeId?: string;
  assigneeName: string;
  assigneeInitials?: string;
  startTime?: string;
  endTime?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  contactMethod: 'Call' | 'Email' | 'WhatsApp' | 'Meeting';
  outcome?: string;
  author: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  orgId?: Types.ObjectId | null;
  userId?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILeadTaskDocument extends ILeadTask, ISoftDeleteDocument {}

const leadTaskSchema = new Schema<ILeadTaskDocument>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    taskDate: {
      type: String,
      required: true,
      default: () => new Date().toISOString().split('T')[0],
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
      default: 'Pending',
      index: true,
    },
    assigneeId: {
      type: String,
      default: '',
    },
    assigneeName: {
      type: String,
      required: true,
      default: 'Staff',
    },
    assigneeInitials: {
      type: String,
      default: 'ST',
    },
    startTime: {
      type: String,
      default: '-',
    },
    endTime: {
      type: String,
      default: '-',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    contactMethod: {
      type: String,
      enum: ['Call', 'Email', 'WhatsApp', 'Meeting'],
      default: 'Call',
    },
    outcome: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      default: 'Staff',
    },
    contactEmail: {
      type: String,
      default: '',
    },
    contactPhone: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    userId: {
      type: String,
      default: null,
    },
    createdBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

leadTaskSchema.plugin(softDeletePlugin);

export const LeadTask = model<ILeadTaskDocument, ISoftDeleteModel<ILeadTaskDocument>>('LeadTask', leadTaskSchema);
