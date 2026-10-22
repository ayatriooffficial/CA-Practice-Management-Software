import { Schema, model } from 'mongoose';
import { INoticeDocument, IFileRef } from './notice.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

const fileRefSchema = new Schema<IFileRef>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    mime: { type: String, required: true },
  },
  { _id: false }
);

const noticeSchema = new Schema<INoticeDocument>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    portal: {
      type: String,
      enum: ['GST', 'IT', 'TDS'],
      required: [true, 'Portal is required'],
      index: true,
    },
    noticeNumber: {
      type: String,
      required: [true, 'Notice Number is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    files: {
      type: [fileRefSchema],
      default: [],
    },
    syncedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // GST Notice fields
    type: {
      type: String,
      enum: ['Notice', 'Appeal', 'Order'],
    },
    noticeDate: {
      type: String,
      index: true,
    },
    dueDate: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'new',
        'response_preparing',
        'response_filed',
        'under_dept_review',
        'hearing_scheduled',
        'appeal_filed',
        'closed',
        'no_status',
      ],
      index: true,
    },
    taskId: {
      type: String,
      default: null,
    },
    // TDS / IT Notice fields
    category: {
      type: String,
      trim: true,
    },
    period: {
      type: String,
      trim: true,
    },
    formType: {
      type: String,
      trim: true,
    },
    portalStatus: {
      type: String,
      trim: true,
    },
    manualStatus: {
      type: String,
      enum: [
        'new',
        'response_preparing',
        'response_filed',
        'under_dept_review',
        'hearing_scheduled',
        'appeal_filed',
        'closed',
        'no_status',
      ],
      index: true,
    },
    periodAY: {
      type: String,
      trim: true,
    },
    issuedOn: {
      type: String,
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

// Compound indexes for optimal queries and idempotency
noticeSchema.index({ clientId: 1, portal: 1, noticeNumber: 1 });
noticeSchema.index({ clientId: 1, dueDate: 1 });
noticeSchema.index({ portal: 1, status: 1 });
noticeSchema.index({ portal: 1, manualStatus: 1 });

// Soft delete plugin
noticeSchema.plugin(softDeletePlugin);

export const NoticeModel = model<INoticeDocument, ISoftDeleteModel<INoticeDocument>>(
  'Notice',
  noticeSchema
);
