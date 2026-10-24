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

export interface TriggerCondition {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
}

export interface TriggerDefinition {
  value: string;
  description?: string;
  condition: TriggerCondition | null;
  runtimeAvailable?: boolean;
  supportReason?: string;
}

export interface AgentModuleDefinition {
  description: string;
  defaultMessage: string;
  triggers: TriggerDefinition[];
}

export interface IntegrationStatus {
  email: {
    configured: boolean;
    provider: string;
    details: string;
  };
  whatsApp: {
    configured: boolean;
    provider: string;
    details: string;
  };
}

export interface AgentDefinitions {
  modules: Record<AgentModule, AgentModuleDefinition>;
  recipients: AgentRecipient[];
  channels: AgentChannel[];
  actions: AgentAction[];
  emailTemplates: AgentEmailTemplate[];
  templateVariables: string[];
  integrations?: IntegrationStatus;
}

export interface AgentEmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
}

export interface AgentConfig {
  trigger: string;
  conditions: Record<string, number>;
  recipient: AgentRecipient[];
  channel: AgentChannel;
  action: AgentAction;
  message: string;
  subject: string;
  templateId: string;
  recipientResolution?: { mode: 'task-linked-client'; relationship: 'trigger-record' };
}

export type WorkflowNodeType = 'action' | 'condition';
export type WorkflowConditionOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
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

export type AgentConfigDraft = Partial<AgentConfig> & Record<string, unknown>;

export interface Agent {
  id: string;
  name: string;
  module: AgentModule;
  description: string;
  status: AgentStatus;
  config: AgentConfigDraft;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface ProviderResult {
  nodeId?: string;
  nodeName?: string;
  recipient?: string;
  recipientData?: { name: string; address: string };
  provider?: string;
  mode?: 'mock';
  status: 'simulated' | 'failed';
  simulated: true;
  executionId?: string;
  timestamp?: string;
  subject?: string | null;
  renderedMessage?: string;
  error?: string;
}

export interface AgentExecutionResult {
  simulated: true;
  executionMode: 'mock';
  label: string;
  message: string;
  trigger: string;
  conditions: Record<string, number>;
  recipients: string[];
  recipient: string[];
  channel: AgentChannel | 'multiple';
  action: AgentAction | 'Connected workflow';
  renderedMessage: string;
  results: ProviderResult[];
  partialFailure: boolean;
  steps: string[];
  executionTrace?: Array<Record<string, unknown>>;
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentName: string;
  agentModule: AgentModule;
  runType: 'test' | 'actual' | null;
  status: 'success' | 'partial-failed' | 'failed' | 'skipped' | 'draft';
  triggerData: Record<string, unknown> | null;
  result: AgentExecutionResult | null;
  errorMessage: string | null;
  executionMode: 'mock' | 'real';
  runKey: string | null;
  createdAt: string;
  updatedAt: string;
  historyType?: 'run' | 'activity';
  action?: 'test-run' | 'created';
}

export interface AgentFilters {
  module?: AgentModule | 'All';
  status?: AgentStatus | 'All';
  search?: string;
}
