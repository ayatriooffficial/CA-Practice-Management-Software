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

export interface TriggerCondition {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
}

export interface TriggerDefinition {
  value: string;
  condition: TriggerCondition | null;
}

export interface AgentModuleDefinition {
  description: string;
  defaultMessage: string;
  triggers: TriggerDefinition[];
}

export interface AgentDefinitions {
  modules: Record<AgentModule, AgentModuleDefinition>;
  recipients: AgentRecipient[];
  channels: AgentChannel[];
  actions: AgentAction[];
}

export interface AgentConfig {
  trigger: string;
  conditions: Record<string, number>;
  recipient: AgentRecipient[];
  channel: AgentChannel;
  action: AgentAction;
  message: string;
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
  channel: AgentChannel;
  action: AgentAction;
  renderedMessage: string;
  results: ProviderResult[];
  partialFailure: boolean;
  steps: string[];
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentName: string;
  agentModule: AgentModule;
  runType: 'test' | 'actual' | null;
  status: 'success' | 'failed' | 'draft';
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
