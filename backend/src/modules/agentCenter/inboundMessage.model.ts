import { Schema, model, Document } from 'mongoose';

export interface IInboundMessageLogDocument extends Document {
  provider: 'gmail' | 'whatsapp';
  messageId: string;
  sender?: string;
  orgId?: string;
  clientId?: string;
  matchedFollowUpId?: string;
  status: 'processed' | 'ambiguous' | 'failed';
  notes?: string;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inboundMessageLogSchema = new Schema<IInboundMessageLogDocument>(
  {
    provider: { type: String, enum: ['gmail', 'whatsapp'], required: true, index: true },
    messageId: { type: String, required: true, trim: true },
    sender: { type: String, trim: true },
    orgId: { type: String, trim: true, index: true },
    clientId: { type: String, trim: true, index: true },
    matchedFollowUpId: { type: String, trim: true },
    status: { type: String, enum: ['processed', 'ambiguous', 'failed'], default: 'processed', index: true },
    notes: { type: String, trim: true },
    processedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

inboundMessageLogSchema.index({ provider: 1, messageId: 1 }, { unique: true });

export const InboundMessageLog = model<IInboundMessageLogDocument>('InboundMessageLog', inboundMessageLogSchema);
