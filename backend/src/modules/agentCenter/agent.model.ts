import { Model, Schema, model, models } from 'mongoose';
import { IAgent } from './agent.interface';
import { MODULES } from './definitions';

const agentSchema = new Schema<IAgent>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, index: true },
    module: { type: String, enum: MODULES, required: true, index: true },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: ['draft', 'published', 'disabled'], required: true, default: 'draft', index: true },
    // Drafts deliberately permit an incomplete config. Strict validation happens on publish/test-run.
    config: { type: Schema.Types.Mixed, required: true, default: {} },
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  }
);

agentSchema.index({ module: 1, status: 1, updatedAt: -1 });
agentSchema.index({ updatedAt: -1 });

export const Agent: Model<IAgent> = (models.AgentCenterAgent as Model<IAgent>) || model<IAgent>('AgentCenterAgent', agentSchema);
