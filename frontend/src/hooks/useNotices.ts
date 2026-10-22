"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetNoticesParams, NoticeStatus, NoticeSummary } from '@/types/notices';
import { noticeApi } from '@/services/noticeApi';

export const NOTICE_QUERY_KEYS = {
  all: ['notices'] as const,
  list: (params: GetNoticesParams) => [...NOTICE_QUERY_KEYS.all, 'list', params] as const,
  clients: (params: Record<string, unknown> = {}) => [...NOTICE_QUERY_KEYS.all, 'clients', params] as const,
  calendar: (params: Record<string, unknown> = {}) => [...NOTICE_QUERY_KEYS.all, 'calendar', params] as const,
  credits: () => [...NOTICE_QUERY_KEYS.all, 'credits'] as const,
};

export function useNotices(options: GetNoticesParams = {}) {
  const queryClient = useQueryClient();

  const noticesQuery = useQuery({
    queryKey: NOTICE_QUERY_KEYS.list(options),
    queryFn: async () => {
      const [notices, summary] = await Promise.all([
        noticeApi.getNotices(options),
        noticeApi.getSummary(options.portal === 'ALL' ? undefined : options.portal),
      ]);
      return { ...notices.data, summary: { ...notices.data.summary, ...summary.data } };
    },
  });

  const clientsQuery = useQuery({
    queryKey: NOTICE_QUERY_KEYS.clients(),
    queryFn: () => noticeApi.getClients().then((response) => response.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: NoticeStatus }) => noticeApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
  });

  const summary: NoticeSummary = noticesQuery.data?.summary ?? {
    total: 0,
    new: 0,
    response_preparing: 0,
    response_filed: 0,
    under_dept_review: 0,
    hearing_scheduled: 0,
    appeal_filed: 0,
    closed: 0,
    no_status: 0,
  };

  return {
    notices: noticesQuery.data?.data ?? [],
    clients: clientsQuery.data?.data ?? [],
    summary,
    loading: noticesQuery.isLoading || clientsQuery.isLoading,
    error: noticesQuery.error ?? clientsQuery.error,
    refetch: async () => {
      await Promise.all([noticesQuery.refetch(), clientsQuery.refetch()]);
    },
    changeStatus: (id: string, status: NoticeStatus) => statusMutation.mutateAsync({ id, status }),
  };
}
