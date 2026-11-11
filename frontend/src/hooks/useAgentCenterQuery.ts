"use client";

import { useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAgentsRequest,
  fetchAgentByIdRequest,
  createAgentRequest,
  updateAgentRequest,
  publishAgentRequest,
  disableAgentRequest,
  deleteAgentRequest,
  testRunAgentRequest,
  fetchHistoryRequest,
  fetchAgentHistoryRequest,
  fetchIntegrationsStatusRequest,
  fetchDiagnosticsRequest,
  fetchFollowUpsRequest,
} from '@/store/features/agentCenter/agentCenterSlice';
import {
  selectAllAgents,
  selectSelectedAgent,
  selectAgentLoading,
  selectAgentMutating,
  selectAgentError,
  selectAgentHistory,
  selectAgentDetailHistory,
  selectAgentHistoryLoading,
  selectAgentIntegrations,
  selectAgentDiagnostics,
  selectAgentDiagnosticsLoading,
  selectAgentFollowUps,
  selectAgentFollowUpsLoading,
  selectFilteredAgents,
} from '@/store/features/agentCenter/agentCenterSelectors';
import { Agent, AgentConfigDraft, AgentFilters, AgentModule, AgentRun } from '@/types/agentCenter';

/**
 * useAgents - fetches list of agents through Redux Saga and subscribes to Redux state
 */
export function useAgents(filters: AgentFilters = {}, enabled = true) {
  const dispatch = useAppDispatch();
  const allAgents = useAppSelector(selectAllAgents);
  const isLoading = useAppSelector(selectAgentLoading);
  const error = useAppSelector(selectAgentError);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const refetch = useCallback(() => {
    if (!enabled) return;
    dispatch(fetchAgentsRequest(filters));
  }, [dispatch, enabled, filtersKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Apply filters locally if module / status / search are provided
  const data = useMemo(() => {
    if (!filters || (!filters.module && !filters.status && !filters.search)) {
      return allAgents;
    }
    return allAgents.filter((agent) => {
      if (filters.module && filters.module !== 'All' && agent.module !== filters.module) {
        return false;
      }
      if (filters.status && filters.status !== 'All' && agent.status !== filters.status) {
        return false;
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const matches =
          agent.name.toLowerCase().includes(q) ||
          agent.description?.toLowerCase().includes(q) ||
          (typeof agent.config?.trigger === 'string' && agent.config.trigger.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [allAgents, filtersKey]);

  const errorObj = useMemo(() => (error ? new Error(error) : null), [error]);

  return {
    data,
    isLoading: isLoading && data.length === 0,
    isFetching: isLoading,
    error: errorObj,
    isError: Boolean(error),
    refetch,
  };
}

/**
 * useAgent - fetches single agent by ID
 */
export function useAgent(id: string) {
  const dispatch = useAppDispatch();
  const selectedAgent = useAppSelector(selectSelectedAgent);
  const allAgents = useAppSelector(selectAllAgents);
  const isLoading = useAppSelector(selectAgentLoading);
  const error = useAppSelector(selectAgentError);

  const refetch = useCallback(() => {
    if (!id) return;
    dispatch(fetchAgentByIdRequest(id));
  }, [dispatch, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const data = useMemo(() => {
    if (selectedAgent && selectedAgent.id === id) return selectedAgent;
    return allAgents.find((a) => a.id === id) || null;
  }, [selectedAgent, allAgents, id]);

  return {
    data,
    isLoading: isLoading && !data,
    isFetching: isLoading,
    error: error ? new Error(error) : null,
    isError: Boolean(error),
    refetch,
  };
}

/**
 * useAgentHistory - execution runs for a single agent
 */
export function useAgentHistory(id: string) {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAgentDetailHistory);
  const isLoading = useAppSelector(selectAgentHistoryLoading);
  const error = useAppSelector(selectAgentError);

  const refetch = useCallback(() => {
    if (!id) return;
    dispatch(fetchAgentHistoryRequest(id));
  }, [dispatch, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    data,
    isLoading: isLoading && data.length === 0,
    isFetching: isLoading,
    error: error ? new Error(error) : null,
    isError: Boolean(error),
    refetch,
  };
}

/**
 * useAgentGlobalHistory - global execution history
 */
export function useAgentGlobalHistory(limit = 100) {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAgentHistory);
  const isLoading = useAppSelector(selectAgentHistoryLoading);
  const error = useAppSelector(selectAgentError);

  const refetch = useCallback(() => {
    dispatch(fetchHistoryRequest(limit));
  }, [dispatch, limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    data,
    isLoading: isLoading && data.length === 0,
    isFetching: isLoading,
    error: error ? new Error(error) : null,
    isError: Boolean(error),
    refetch,
  };
}

/**
 * useCreateAgent - mutation hook with Redux dispatch
 */
export function useCreateAgent() {
  const dispatch = useAppDispatch();
  const isPending = useAppSelector(selectAgentMutating);

  const mutateAsync = useCallback(
    async (payload: {
      name: string;
      module: AgentModule;
      description: string;
      config: AgentConfigDraft;
      saveDraft?: boolean;
    }): Promise<Agent> => {
      return new Promise<Agent>((resolve) => {
        dispatch(
          createAgentRequest({
            ...payload,
            onSuccess: (agent) => resolve(agent),
          })
        );
      });
    },
    [dispatch]
  );

  return { mutateAsync, isPending };
}

/**
 * useUpdateAgent - mutation hook with Redux dispatch
 */
export function useUpdateAgent() {
  const dispatch = useAppDispatch();
  const isPending = useAppSelector(selectAgentMutating);

  const mutateAsync = useCallback(
    async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<{
        name: string;
        module: AgentModule;
        description: string;
        config: AgentConfigDraft;
        saveDraft: boolean;
      }>;
    }): Promise<Agent> => {
      return new Promise<Agent>((resolve) => {
        dispatch(
          updateAgentRequest({
            id,
            payload,
            onSuccess: (agent) => resolve(agent),
          })
        );
      });
    },
    [dispatch]
  );

  return { mutateAsync, isPending };
}

/**
 * usePublishAgent - mutation hook with Redux dispatch
 */
export function usePublishAgent() {
  const dispatch = useAppDispatch();
  const isPending = useAppSelector(selectAgentMutating);

  const mutateAsync = useCallback(
    async (id: string): Promise<any> => {
      dispatch(publishAgentRequest(id));
      return { id, status: 'Active' };
    },
    [dispatch]
  );

  return { mutateAsync, isPending };
}

/**
 * useDisableAgent - mutation hook with Redux dispatch
 */
export function useDisableAgent() {
  const dispatch = useAppDispatch();
  const isPending = useAppSelector(selectAgentMutating);

  const mutateAsync = useCallback(
    async (id: string): Promise<any> => {
      dispatch(disableAgentRequest(id));
      return { id, status: 'Draft' };
    },
    [dispatch]
  );

  return { mutateAsync, isPending };
}

/**
 * useDeleteAgent - mutation hook with Redux dispatch
 */
export function useDeleteAgent() {
  const dispatch = useAppDispatch();
  const isPending = useAppSelector(selectAgentMutating);

  const mutateAsync = useCallback(
    async (id: string): Promise<any> => {
      dispatch(deleteAgentRequest(id));
      return { id };
    },
    [dispatch]
  );

  return { mutateAsync, isPending };
}

/**
 * useTestRunAgent - mutation hook with Redux dispatch
 */
export function useTestRunAgent() {
  const dispatch = useAppDispatch();
  const isPending = useAppSelector(selectAgentMutating);

  const mutateAsync = useCallback(
    async (
      variables:
        | string
        | {
            id: string;
            testEmail?: string;
            mode?: 'test' | 'live';
            failRecipient?: string;
            messageId?: string;
          }
    ): Promise<AgentRun> => {
      const id = typeof variables === 'string' ? variables : variables.id;
      const options =
        typeof variables === 'string'
          ? undefined
          : {
              testEmail: variables.testEmail,
              mode: variables.mode,
              failRecipient: variables.failRecipient,
              messageId: variables.messageId,
            };

      return new Promise<AgentRun>((resolve) => {
        dispatch(
          testRunAgentRequest({
            id,
            options,
            onSuccess: (run) => resolve(run),
          })
        );
      });
    },
    [dispatch]
  );

  return { mutateAsync, isPending };
}

/**
 * useIntegrationsStatus - fetches email and whatsapp integration status
 */
export function useIntegrationsStatus() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAgentIntegrations);
  const isLoading = !data;

  useEffect(() => {
    dispatch(fetchIntegrationsStatusRequest());
  }, [dispatch]);

  return { data, isLoading };
}

/**
 * useAgentDiagnostics - fetches diagnostic summary
 */
export function useAgentDiagnostics() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAgentDiagnostics);
  const isLoading = useAppSelector(selectAgentDiagnosticsLoading);

  const refetch = useCallback(() => {
    dispatch(fetchDiagnosticsRequest());
  }, [dispatch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, refetch };
}

/**
 * useAgentFollowUps - fetches follow up records
 */
export function useAgentFollowUps(status?: string) {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAgentFollowUps);
  const isLoading = useAppSelector(selectAgentFollowUpsLoading);

  const refetch = useCallback(() => {
    dispatch(fetchFollowUpsRequest(status));
  }, [dispatch, status]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, refetch };
}
