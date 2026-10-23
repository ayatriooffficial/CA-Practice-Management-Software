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
  | 'Client'
  | 'Assigned user'
  | 'Task owner'
  | 'Account administrator'
  | 'Responsible person';

export type WorkflowNodeType = 'action' | 'condition';
export type WorkflowOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
}
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: 'true' | 'false' | 'next';
}
export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface AgentConfig {
  trigger?: string;
  conditions?: Record<string, number>;
  recipient?: AgentRecipient[] | AgentRecipient | string[] | string;
  channel?: AgentChannel;
  action?: AgentAction;
  message?: string;
  subject?: string;
  templateId?: string;
  recipientResolution?: { mode: 'task-linked-client'; relationship: 'trigger-record' };
  workflowGraph?: WorkflowGraph;
  [key: string]: unknown;
}

export interface IAgent {
  orgId: string;
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

export type AgentRunStatus = 'success' | 'partial-failed' | 'failed' | 'skipped';
export type ExecutionMode = 'mock' | 'real';

export interface IAgentRun {
  orgId: string;
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
