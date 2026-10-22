"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Portal } from '@/types/notices';
import { syncApi } from '@/services/syncApi';

export const SYNC_QUERY_KEYS = {
  all: ['sync'] as const,
  jobs: (params: Record<string, unknown> = {}) => [...SYNC_QUERY_KEYS.all, 'jobs', params] as const,
  activity: (params: Record<string, unknown> = {}) => [...SYNC_QUERY_KEYS.all, 'activity', params] as const,
  entitlement: () => [...SYNC_QUERY_KEYS.all, 'entitlement'] as const,
};

export function useSyncJobs(params: Record<string, string | number | undefined> = {}) {
  return useQuery({
    queryKey: SYNC_QUERY_KEYS.jobs(params),
    queryFn: () => syncApi.getJobs(params).then((response) => response.data),
  });
}

export function useActivityLogs(params: Record<string, string | number | undefined> = {}) {
  return useQuery({
    queryKey: SYNC_QUERY_KEYS.activity(params),
    queryFn: () => syncApi.getActivity(params).then((response) => response.data),
  });
}

export function useSyncClients() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { clientIds: string[]; portals: Portal[]; module?: 'notices' | 'compliance'; isFreeSync?: boolean }) =>
      payload.isFreeSync ? syncApi.freeSync(payload) : payload.module === 'compliance' ? syncApi.syncCompliance(payload) : syncApi.syncClients(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: SYNC_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });
}
