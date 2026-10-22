import { HydratedDocument, Types } from 'mongoose';

export type AgentModule = 'Task' | 'DSC' | 'License';
export type AgentStatus = 'draft' | 'published' | 'disabled';
export type AgentChannel = 'Email' | 'WhatsApp' | 'In-app';
export type AgentAction =
  | 'Send notification'
  | 'Send expiry reminder'
  | 'Send renewal reminder'
  | 'Notify assignee';
export type AgentRecipient =
  | 'Assigned user'
  | 'Task owner'
  | 'Account administrator'
  | 'Responsible person';

export interface AgentConfig {
  trigger?: string;
  conditions?: Record<string, number>;
  recipient?: AgentRecipient[] | AgentRecipient | string[] | string;
  channel?: AgentChannel;
  action?: AgentAction;
  message?: string;
  [key: string]: unknown;
}

export interface IAgent {
  name: string;
  module: AgentModule;
  description: string;
  status: AgentStatus;
  config: AgentConfig;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
}

export type IAgentDocument = HydratedDocument<IAgent>;

export type AgentRunStatus = 'success' | 'failed';
export type ExecutionMode = 'mock' | 'real';

export interface IAgentRun {
  agentId: Types.ObjectId;
  agentName: string;
  agentModule: AgentModule;
  runType: 'test' | 'actual';
  status: AgentRunStatus;
  triggerData: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  executionMode: ExecutionMode;
  runKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IAgentRunDocument = HydratedDocument<IAgentRun>;
