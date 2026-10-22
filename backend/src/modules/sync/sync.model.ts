import { Schema, model, Types } from 'mongoose';
import { ISoftDeleteDocument, softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';
import { Portal } from '../notice/notice.interface';

// -----------------------------------------------------------------------------
// 1. PortalSyncState
// -----------------------------------------------------------------------------
export type SyncStatus = 'ready' | 'error' | 'stale' | 'never_synced';

export interface IPortalSyncState {
  clientId: Types.ObjectId;
  portal: Portal;
  status: SyncStatus;
  errorMessage?: string;
  lastSyncAt?: Date | null;
  hasCredentials?: boolean;
  isSeed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPortalSyncStateDocument extends IPortalSyncState, ISoftDeleteDocument {}

const portalSyncStateSchema = new Schema<IPortalSyncStateDocument>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    portal: {
      type: String,
      enum: ['GST', 'IT', 'TDS'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ready', 'error', 'stale', 'never_synced'],
      default: 'never_synced',
      index: true,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    hasCredentials: {
      type: Boolean,
      default: false,
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

portalSyncStateSchema.index({ clientId: 1, portal: 1 }, { unique: true });
portalSyncStateSchema.plugin(softDeletePlugin);

export const PortalSyncStateModel = model<
  IPortalSyncStateDocument,
  ISoftDeleteModel<IPortalSyncStateDocument>
>('PortalSyncState', portalSyncStateSchema);


// -----------------------------------------------------------------------------
// 2. SyncJob
// -----------------------------------------------------------------------------
export interface ISyncResult {
  clientId: Types.ObjectId;
  portal: Portal;
  ok: boolean;
  found: number;
  error?: string;
}

export interface ISyncJob {
  startedAt: Date;
  finishedAt?: Date | null;
  triggeredBy: string;
  module: 'notices' | 'compliance';
  portals: Portal[];
  clientIds: Types.ObjectId[];
  status: 'running' | 'success' | 'partial' | 'failed';
  creditsUsed: number;
  newItems: number;
  results: ISyncResult[];
  isSeed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISyncJobDocument extends ISyncJob, ISoftDeleteDocument {}

const syncResultSchema = new Schema<ISyncResult>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    portal: { type: String, enum: ['GST', 'IT', 'TDS'], required: true },
    ok: { type: Boolean, required: true },
    found: { type: Number, default: 0 },
    error: { type: String },
  },
  { _id: false }
);

const syncJobSchema = new Schema<ISyncJobDocument>(
  {
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    triggeredBy: {
      type: String,
      default: 'System',
    },
    module: {
      type: String,
      enum: ['notices', 'compliance'],
      required: true,
      index: true,
    },
    portals: [{ type: String, enum: ['GST', 'IT', 'TDS'] }],
    clientIds: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
    status: {
      type: String,
      enum: ['running', 'success', 'partial', 'failed'],
      default: 'running',
      index: true,
    },
    creditsUsed: {
      type: Number,
      default: 0,
    },
    newItems: {
      type: Number,
      default: 0,
    },
    results: [syncResultSchema],
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

syncJobSchema.plugin(softDeletePlugin);

export const SyncJobModel = model<ISyncJobDocument, ISoftDeleteModel<ISyncJobDocument>>(
  'SyncJob',
  syncJobSchema
);


// -----------------------------------------------------------------------------
// 3. ActivityLog
// -----------------------------------------------------------------------------
export interface IActivityLog {
  at: Date;
  userId: string;
  clientId: Types.ObjectId;
  noticeId?: Types.ObjectId | null;
  action: 'status_changed' | 'task_created' | 'file_downloaded' | 'note_added';
  from?: string;
  to?: string;
  details?: Record<string, unknown>;
  isSeed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IActivityLogDocument extends IActivityLog, ISoftDeleteDocument {}

const activityLogSchema = new Schema<IActivityLogDocument>(
  {
    at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    noticeId: {
      type: Schema.Types.ObjectId,
      ref: 'Notice',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: ['status_changed', 'task_created', 'file_downloaded', 'note_added'],
      required: true,
      index: true,
    },
    from: { type: String },
    to: { type: String },
    details: { type: Schema.Types.Mixed },
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

activityLogSchema.plugin(softDeletePlugin);

export const ActivityLogModel = model<
  IActivityLogDocument,
  ISoftDeleteModel<IActivityLogDocument>
>('ActivityLog', activityLogSchema);


// -----------------------------------------------------------------------------
// 4. PracticeSetting (credits, sync entitlements, cooldown)
// -----------------------------------------------------------------------------
export interface IPracticeSetting {
  key: string;
  credits: number;
  lastFreeSyncAt?: Date | null;
  cooldownDays: number;
  plan: string;
  isSeed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPracticeSettingDocument extends IPracticeSetting, ISoftDeleteDocument {}

const practiceSettingSchema = new Schema<IPracticeSettingDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
      index: true,
    },
    credits: {
      type: Number,
      default: 13841,
    },
    lastFreeSyncAt: {
      type: Date,
      default: null,
    },
    cooldownDays: {
      type: Number,
      default: 14,
    },
    plan: {
      type: String,
      default: 'PRO',
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

practiceSettingSchema.plugin(softDeletePlugin);

export const PracticeSettingModel = model<
  IPracticeSettingDocument,
  ISoftDeleteModel<IPracticeSettingDocument>
>('PracticeSetting', practiceSettingSchema);
