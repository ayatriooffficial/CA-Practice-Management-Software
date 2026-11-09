import { Schema, model, Document } from 'mongoose';
import { IHomeMetricsSnapshot } from './homeDashboard.interface';

export interface IHomeMetricsSnapshotDoc extends IHomeMetricsSnapshot, Document {}

const HomeMetricsSnapshotSchema = new Schema<IHomeMetricsSnapshotDoc>(
  {
    accountKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      default: '',
      index: true,
    },
    userEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      default: 'admin',
      index: true,
    },
    orgId: {
      type: String,
      default: '',
    },
    metrics: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'home_metrics_snapshots',
  }
);

export const HomeMetricsSnapshotModel = model<IHomeMetricsSnapshotDoc>(
  'HomeMetricsSnapshot',
  HomeMetricsSnapshotSchema
);

