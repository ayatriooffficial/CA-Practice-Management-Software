import { Schema, model } from 'mongoose';
import { IFollowUpStateDocument } from './followUp.interface';

const clientResponseRecordSchema = new Schema(
  {
    receivedAt: { type: Date, default: Date.now },
    channel: { type: String, enum: ['WhatsApp', 'Email'], required: true },
    providerMessageId: { type: String, trim: true },
    senderAddress: { type: String, trim: true },
    rawText: { type: String, trim: true },
    attachmentName: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    aiClassification: {
      intent: { type: String },
      confidence: { type: Number },
      notes: { type: String },
      requiresHumanReview: { type: Boolean },
      actionSuggested: { type: String },
    },
  },
  { _id: false }
);

const followUpStateSchema = new Schema<IFollowUpStateDocument>(
  {
    orgId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    agentName: { type: String, trim: true },
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, trim: true },
    clientEmail: { type: String, trim: true, lowercase: true },
    clientMobile: { type: String, trim: true },
    module: { type: String, enum: ['Task', 'DSC', 'License'], required: true, index: true },
    sourceId: { type: String, required: true, index: true },
    sourceName: { type: String, trim: true },
    documentRequestId: { type: String, trim: true, index: true },
    documentTitle: { type: String, trim: true },
    channel: { type: String, enum: ['Email', 'WhatsApp'], required: true },
    providerMessageId: { type: String, trim: true, index: true },
    emailThreadId: { type: String, trim: true, index: true },
    status: {
      type: String,
      enum: [
        'pending',
        'waiting_client',
        'response_received',
        'document_received',
        'verified',
        'escalated',
        'cancelled',
        'completed',
        'opt_out',
      ],
      default: 'waiting_client',
      index: true,
    },
    attemptCount: { type: Number, default: 1 },
    maxAttempts: { type: Number, default: 4 },
    lastReminderAt: { type: Date, default: Date.now },
    nextReminderAt: { type: Date, index: true },
    lastResponseAt: { type: Date },
    resolutionNotes: { type: String, trim: true },
    resolvedAt: { type: Date },
    responseHistory: { type: [clientResponseRecordSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high performance polling and tenant safety
followUpStateSchema.index({ orgId: 1, status: 1, nextReminderAt: 1 });
followUpStateSchema.index({ orgId: 1, sourceId: 1, documentRequestId: 1 });
followUpStateSchema.index({ orgId: 1, clientMobile: 1, status: 1 });
followUpStateSchema.index({ orgId: 1, emailThreadId: 1 });

export const FollowUpState = model<IFollowUpStateDocument>('FollowUpState', followUpStateSchema);
