"use client";

import { useQuery } from '@tanstack/react-query';
import type { Portal } from '@/types/notices';
import { noticeApi, type NoticeClient } from '@/services/noticeApi';

export type ClientWithStats = NoticeClient;

export interface UseNoticeClientsOptions {
  search?: string;
  filter?: 'all' | 'notices' | 'issues';
  portal?: Portal | 'ALL';
  sort?: string;
}

export const NOTICE_CLIENT_QUERY_KEYS = {
  all: ['notice-clients'] as const,
  list: (params: UseNoticeClientsOptions) => [...NOTICE_CLIENT_QUERY_KEYS.all, params] as const,
};

export function useNoticeClients(options: UseNoticeClientsOptions = {}) {
  const query = useQuery({
    queryKey: NOTICE_CLIENT_QUERY_KEYS.list(options),
    queryFn: () => noticeApi.getClients(options).then((response) => response.data),
  });

  return {
    clients: query.data?.data ?? [],
    counts: query.data?.counts ?? { all: 0, notices: 0, issues: 0, gst: 0, it: 0, tds: 0 },
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export const useClients = useNoticeClients;
