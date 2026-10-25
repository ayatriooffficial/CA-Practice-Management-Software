import { request } from '@/services/apiClient';
import {
  Agent,
  AgentConfigDraft,
  AgentDefinitions,
  AgentFilters,
  AgentModule,
  AgentRun,
} from '@/types/agentCenter';

function filterQuery(filters: AgentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.module && filters.module !== 'All') params.set('module', filters.module);
  if (filters.status && filters.status !== 'All') params.set('status', filters.status);
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  const value = params.toString();
  return value ? `?${value}` : '';
}

export const agentCenterApi = {
  async getDefinitions(): Promise<AgentDefinitions> {
    const response = await request<AgentDefinitions>('/agent-center/definitions');
    return response.data;
  },

  async listAgents(filters: AgentFilters = {}): Promise<Agent[]> {
    const response = await request<Agent[]>(`/agent-center/agents${filterQuery(filters)}`);
    return response.data || [];
  },

  async getAgent(id: string): Promise<Agent> {
    const response = await request<Agent>(`/agent-center/agents/${encodeURIComponent(id)}`);
    return response.data;
  },

  async createAgent(payload: {
    name: string;
    module: AgentModule;
    description: string;
    config: AgentConfigDraft;
    saveDraft?: boolean;
  }): Promise<Agent> {
    const response = await request<Agent>('/agent-center/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updateAgent(id: string, payload: Partial<{
    name: string;
    module: AgentModule;
    description: string;
    config: AgentConfigDraft;
    saveDraft: boolean;
  }>): Promise<Agent> {
    const response = await request<Agent>(`/agent-center/agents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async publishAgent(id: string): Promise<Agent> {
    const response = await request<Agent>(`/agent-center/agents/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return response.data;
  },

  async disableAgent(id: string): Promise<Agent> {
    const response = await request<Agent>(`/agent-center/agents/${encodeURIComponent(id)}/disable`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return response.data;
  },

  async deleteAgent(id: string): Promise<void> {
    await request(`/agent-center/agents/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async testRunAgent(id: string, options?: { testEmail?: string; mode?: 'test' | 'live'; failRecipient?: string; messageId?: string }): Promise<AgentRun> {
    const response = await request<AgentRun>(`/agent-center/agents/${encodeURIComponent(id)}/test-run`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    return response.data;
  },

  async getIntegrationsStatus(): Promise<{
    email: {
      configured: boolean;
      statusText: string;
      provider?: 'gmail' | 'smtp' | 'none';
      email?: string | null;
      needsReconnect?: boolean;
      error?: string;
    };
    whatsapp: {
      configured: boolean;
      statusText: string;
    };
  }> {
    const response = await request<{
      email: {
        configured: boolean;
        statusText: string;
        provider?: 'gmail' | 'smtp' | 'none';
        email?: string | null;
        needsReconnect?: boolean;
        error?: string;
      };
      whatsapp: {
        configured: boolean;
        statusText: string;
      };
    }>('/agent-center/integrations/status');
    return response.data;
  },

  async getAgentHistory(id: string): Promise<AgentRun[]> {
    const response = await request<AgentRun[]>(`/agent-center/agents/${encodeURIComponent(id)}/history`);
    return response.data || [];
  },

  async getHistory(limit = 100): Promise<AgentRun[]> {
    const response = await request<AgentRun[]>(`/agent-center/history?limit=${limit}`);
    return response.data || [];
  },
};
