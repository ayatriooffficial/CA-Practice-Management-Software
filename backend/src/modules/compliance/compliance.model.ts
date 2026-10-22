import { Schema, model, Types } from 'mongoose';
import { ISoftDeleteDocument, softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';
import { Portal, IFileRef } from '../notice/notice.interface';

export type Frequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type ComplianceStatus = 'filed' | 'missed' | 'pending';

// -----------------------------------------------------------------------------
// 1. ComplianceCategory
// -----------------------------------------------------------------------------
export interface IComplianceCategory {
  categoryId: string; // e.g. 'cat-gst', 'cat-tds', 'cat-it', 'cat-adv-tax'
  name: string;
  order: number;
  mode: 'auto' | 'manual';
  portal?: Portal;
  isSeed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IComplianceCategoryDocument
  extends IComplianceCategory,
    ISoftDeleteDocument {}

const complianceCategorySchema = new Schema<IComplianceCategoryDocument>(
  {
    categoryId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    order: {
      type: Number,
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ['auto', 'manual'],
      required: true,
      index: true,
    },
    portal: {
      type: String,
      enum: ['GST', 'IT', 'TDS'],
      index: true,
    },
    isSeed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

complianceCategorySchema.plugin(softDeletePlugin);

export const ComplianceCategoryModel = model<
  IComplianceCategoryDocument,
  ISoftDeleteModel<IComplianceCategoryDocument>
>('ComplianceCategory', complianceCategorySchema);


// -----------------------------------------------------------------------------
// 2. ComplianceItem
// -----------------------------------------------------------------------------
export interface IComplianceItem {
  clientId: Types.ObjectId;
  categoryId: string; // ref to ComplianceCategory.categoryId
  identifier?: string;
  state?: string;
  formCode: string;
  label: string;
  kind?: 'payment' | 'return' | 'certificate';
  frequency: Frequency;
  isCustom: boolean;
  isSeed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IComplianceItemDocument extends IComplianceItem, ISoftDeleteDocument {}

const complianceItemSchema = new Schema<IComplianceItemDocument>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    categoryId: {
      type: String,
      required: true,
      index: true,
    },
    identifier: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    formCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: ['payment', 'return', 'certificate'],
    },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
      required: true,
      index: true,
    },
    isCustom: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSeed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

complianceItemSchema.index({ clientId: 1, categoryId: 1, formCode: 1 });
complianceItemSchema.plugin(softDeletePlugin);

export const ComplianceItemModel = model<
  IComplianceItemDocument,
  ISoftDeleteModel<IComplianceItemDocument>
>('ComplianceItem', complianceItemSchema);


// -----------------------------------------------------------------------------
// 3. ComplianceEntry
// -----------------------------------------------------------------------------
const fileRefSchema = new Schema<IFileRef>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    mime: { type: String, required: true },
  },
  { _id: false }
);

export interface IComplianceEntry {
  itemId: Types.ObjectId; // ref to ComplianceItem._id
  fy: string; // e.g. "FY 2025-2026"
  periodKey: string; // e.g. "2025-04", "Q1", "H1", "Annual"
  dueDate: string; // ISO date string YYYY-MM-DD
  filedOn?: string | null;
  statusOverride?: ComplianceStatus | null; // for manual category cycling
  documents: IFileRef[];
  source: 'portal' | 'manual';
  syncedAt?: Date;
  isSeed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IComplianceEntryDocument extends IComplianceEntry, ISoftDeleteDocument {}

const complianceEntrySchema = new Schema<IComplianceEntryDocument>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceItem',
      required: true,
      index: true,
    },
    fy: {
      type: String,
      required: true,
      index: true,
    },
    periodKey: {
      type: String,
      required: true,
      index: true,
    },
    dueDate: {
      type: String,
      required: true,
      index: true,
    },
    filedOn: {
      type: String,
      default: null,
      index: true,
    },
    statusOverride: {
      type: String,
      enum: ['filed', 'missed', 'pending', null],
      default: null,
    },
    documents: {
      type: [fileRefSchema],
      default: [],
    },
    source: {
      type: String,
      enum: ['portal', 'manual'],
      default: 'portal',
      index: true,
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
    isSeed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

complianceEntrySchema.index({ itemId: 1, fy: 1, periodKey: 1 }, { unique: true });
complianceEntrySchema.plugin(softDeletePlugin);

export const ComplianceEntryModel = model<
  IComplianceEntryDocument,
  ISoftDeleteModel<IComplianceEntryDocument>
>('ComplianceEntry', complianceEntrySchema);
