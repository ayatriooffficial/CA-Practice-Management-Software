import { Schema, model, models, Model } from 'mongoose';

export interface ISchedulerLock {
  _id: string;
  instanceId: string;
  leaseExpiresAt: Date;
  updatedAt: Date;
}

const schedulerLockSchema = new Schema<ISchedulerLock>(
  {
    _id: { type: String, required: true },
    instanceId: { type: String, required: true },
    leaseExpiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const SchedulerLock: Model<ISchedulerLock> =
  (models.SchedulerLock as Model<ISchedulerLock>) ||
  model<ISchedulerLock>('SchedulerLock', schedulerLockSchema);
