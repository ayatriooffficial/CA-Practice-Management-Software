"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { agentCenterApi } from '@/services/agentCenterApi';
import { Agent, AgentConfigDraft, AgentFilters, AgentModule, AgentRun } from '@/types/agentCenter';

export function useAgents(filters: AgentFilters = {}, enabled = true) {
  const [data, setData] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<any>(null);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const res = await agentCenterApi.listAgents(filters);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, filtersKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isFetching: isLoading, error, isError: Boolean(error), refetch };
}

export function useAgent(id: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<any>(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await agentCenterApi.getAgent(id);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isFetching: isLoading, error, isError: Boolean(error), refetch };
}

export function useAgentHistory(id: string) {
  const [data, setData] = useState<AgentRun[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<any>(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await agentCenterApi.getAgentHistory(id);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isFetching: isLoading, error, isError: Boolean(error), refetch };
}

export function useAgentGlobalHistory(limit = 100) {
  const [data, setData] = useState<AgentRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await agentCenterApi.getHistory(limit);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isFetching: isLoading, error, isError: Boolean(error), refetch };
}

export function useCreateAgent() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async (payload: { name: string; module: AgentModule; description: string; config: AgentConfigDraft; saveDraft?: boolean }) => {
      setIsPending(true);
      try {
        return await agentCenterApi.createAgent(payload);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}

export function useUpdateAgent() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async ({ id, payload }: { id: string; payload: Partial<{ name: string; module: AgentModule; description: string; config: AgentConfigDraft; saveDraft: boolean }> }) => {
      setIsPending(true);
      try {
        return await agentCenterApi.updateAgent(id, payload);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}

export function usePublishAgent() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async (id: string) => {
      setIsPending(true);
      try {
        return await agentCenterApi.publishAgent(id);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}

export function useDisableAgent() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async (id: string) => {
      setIsPending(true);
      try {
        return await agentCenterApi.disableAgent(id);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}

export function useDeleteAgent() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async (id: string) => {
      setIsPending(true);
      try {
        return await agentCenterApi.deleteAgent(id);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}

export function useTestRunAgent() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async (variables: string | { id: string; testEmail?: string; mode?: 'test' | 'live'; failRecipient?: string; messageId?: string }) => {
      setIsPending(true);
      try {
        const id = typeof variables === 'string' ? variables : variables.id;
        const options = typeof variables === 'string' ? undefined : {
          testEmail: variables.testEmail,
          mode: variables.mode,
          failRecipient: variables.failRecipient,
          messageId: variables.messageId,
        };
        return await agentCenterApi.testRunAgent(id, options);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}

export function useIntegrationsStatus() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    agentCenterApi.getIntegrationsStatus()
      .then(setData)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading };
}
