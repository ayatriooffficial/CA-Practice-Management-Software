import { Model, Schema, model, models } from 'mongoose';
import { IAgentRun } from './agent.interface';

const agentRunSchema = new Schema<IAgentRun>(
  {
    orgId: { type: String, required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'AgentCenterAgent', required: true, index: true },
    agentName: { type: String, required: true },
    agentModule: { type: String, enum: ['Task', 'DSC', 'License'], required: true },
    runType: { type: String, enum: ['test', 'actual'], default: 'test', required: true },
    status: { type: String, enum: ['success', 'partial-failed', 'failed', 'skipped', 'in-progress'], required: true, index: true },
    triggerData: { type: Schema.Types.Mixed, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: null },
    executionMode: { type: String, enum: ['mock', 'real'], default: 'mock', required: true },
    runKey: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret.agentId = ret.agentId ? String(ret.agentId) : ret.agentId;
        delete ret._id;
        delete ret.orgId;
        return ret;
      },
    },
  }
);

agentRunSchema.index({ orgId: 1, agentId: 1, createdAt: -1, _id: -1 });
agentRunSchema.index({ orgId: 1, createdAt: -1, _id: -1 });
agentRunSchema.index({ orgId: 1, agentId: 1, runKey: 1 }, { unique: true, partialFilterExpression: { orgId: { $type: 'string' } } });
agentRunSchema.index({ orgId: 1, runKey: 1 });

export const AgentRun: Model<IAgentRun> = (models.AgentCenterRun as Model<IAgentRun>) || model<IAgentRun>('AgentCenterRun', agentRunSchema);
