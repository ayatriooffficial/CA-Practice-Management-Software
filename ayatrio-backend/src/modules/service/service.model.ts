import { Schema, model } from 'mongoose';
import { IServiceDocument } from './service.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

const serviceSchema = new Schema<IServiceDocument>(
  {
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
      index: true,
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
      index: true,
    },
    professionalFee: {
      type: Number,
      required: [true, 'Professional fee is required'],
      min: [0, 'Fee cannot be negative'],
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
    subTasks: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Draft'],
      default: 'Active',
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

// Compound indexes for high-speed queries
serviceSchema.index({ category: 1, isDeleted: 1 });
serviceSchema.index({ isRecurring: 1, isDeleted: 1 });
serviceSchema.index({ status: 1, isDeleted: 1 });
serviceSchema.index({ createdAt: -1, isDeleted: 1 });

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
