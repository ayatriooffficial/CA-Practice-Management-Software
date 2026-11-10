import { Document } from 'mongoose';

export type FollowUpModule = 'Task' | 'DSC' | 'License';

export type FollowUpStatus =
  | 'pending'
  | 'waiting_client'
  | 'response_received'
  | 'document_received'
  | 'verified'
  | 'escalated'
  | 'cancelled'
  | 'completed'
  | 'opt_out';

export interface IClientResponseRecord {
  receivedAt: Date;
  channel: 'WhatsApp' | 'Email';
  providerMessageId?: string;
  senderAddress?: string;
  rawText?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  aiClassification?: {
    intent: string;
    confidence: number;
    notes?: string;
    requiresHumanReview?: boolean;
    actionSuggested?: string;
  };
}

export interface IFollowUpState {
  orgId: string;
  agentId: string;
  agentName?: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  clientMobile?: string;
  module: FollowUpModule;
  sourceId: string; // taskId, dscId, or licenseId
  sourceName?: string;
  documentRequestId?: string; // for task.documentRequests item ID
  documentTitle?: string;
  channel: 'Email' | 'WhatsApp';
  providerMessageId?: string;
  emailThreadId?: string;
  status: FollowUpStatus;
  attemptCount: number;
  maxAttempts: number;
  lastReminderAt?: Date;
  nextReminderAt?: Date | null;
  lastResponseAt?: Date | null;
  resolutionNotes?: string;
  resolvedAt?: Date | null;
  responseHistory: IClientResponseRecord[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFollowUpStateDocument extends IFollowUpState, Document {}
