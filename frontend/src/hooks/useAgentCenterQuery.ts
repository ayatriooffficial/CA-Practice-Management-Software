import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentCenterApi } from '@/services/agentCenterApi';
import { AgentConfigDraft, AgentFilters, AgentModule } from '@/types/agentCenter';

export const AGENT_CENTER_KEYS = {
  all: ['agent-center'] as const,
  lists: () => [...AGENT_CENTER_KEYS.all, 'list'] as const,
  list: (filters: AgentFilters = {}) => [...AGENT_CENTER_KEYS.lists(), filters] as const,
  detail: (id: string) => [...AGENT_CENTER_KEYS.all, 'detail', id] as const,
  definitions: () => [...AGENT_CENTER_KEYS.all, 'definitions'] as const,
  history: () => [...AGENT_CENTER_KEYS.all, 'history'] as const,
  agentHistory: (id: string) => [...AGENT_CENTER_KEYS.history(), id] as const,
};

export function useAgentDefinitions() {
  return useQuery({
    queryKey: AGENT_CENTER_KEYS.definitions(),
    queryFn: () => agentCenterApi.getDefinitions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgents(filters: AgentFilters = {}) {
  return useQuery({
    queryKey: AGENT_CENTER_KEYS.list(filters),
    queryFn: () => agentCenterApi.listAgents(filters),
    staleTime: 30 * 1000,
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: AGENT_CENTER_KEYS.detail(id),
    queryFn: () => agentCenterApi.getAgent(id),
    enabled: Boolean(id),
  });
}

export function useAgentHistory(id: string) {
  return useQuery({
    queryKey: AGENT_CENTER_KEYS.agentHistory(id),
    queryFn: () => agentCenterApi.getAgentHistory(id),
    enabled: Boolean(id),
  });
}

export function useAgentGlobalHistory(limit = 100) {
  return useQuery({
    queryKey: [...AGENT_CENTER_KEYS.history(), 'global', limit],
    queryFn: () => agentCenterApi.getHistory(limit),
  });
}

function invalidateAgentData(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: AGENT_CENTER_KEYS.lists() });
  void queryClient.invalidateQueries({ queryKey: AGENT_CENTER_KEYS.history() });
  if (id) void queryClient.invalidateQueries({ queryKey: AGENT_CENTER_KEYS.detail(id) });
  if (id) void queryClient.invalidateQueries({ queryKey: AGENT_CENTER_KEYS.agentHistory(id) });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; module: AgentModule; description: string; config: AgentConfigDraft; saveDraft?: boolean }) => agentCenterApi.createAgent(payload),
    onSuccess: () => invalidateAgentData(queryClient),
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<{ name: string; module: AgentModule; description: string; config: AgentConfigDraft; saveDraft: boolean }> }) => agentCenterApi.updateAgent(id, payload),
    onSuccess: (agent) => invalidateAgentData(queryClient, agent.id),
  });
}

export function usePublishAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentCenterApi.publishAgent(id),
    onSuccess: (agent) => invalidateAgentData(queryClient, agent.id),
  });
}

export function useDisableAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentCenterApi.disableAgent(id),
    onSuccess: (agent) => invalidateAgentData(queryClient, agent.id),
  });
}

export function useTestRunAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentCenterApi.testRunAgent(id),
    onSuccess: (run) => invalidateAgentData(queryClient, run.agentId),
  });
}
