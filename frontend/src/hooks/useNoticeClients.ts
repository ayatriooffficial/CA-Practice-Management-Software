"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Portal } from '@/types/notices';
import { noticeApi, type NoticeClient } from '@/services/noticeApi';

export type ClientWithStats = NoticeClient;

export interface UseNoticeClientsOptions {
  search?: string;
  filter?: 'all' | 'notices' | 'issues';
  portal?: Portal | 'ALL';
  sort?: string;
}

export function useNoticeClients(options: UseNoticeClientsOptions = {}) {
  const [data, setData] = useState<{
    data: NoticeClient[];
    counts: { all: number; notices: number; issues: number; gst: number; it: number; tds: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const optionsKey = useMemo(() => JSON.stringify(options), [options]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await noticeApi.getClients(options);
      setData(response.data);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [optionsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    clients: data?.data ?? [],
    counts: data?.counts ?? { all: 0, notices: 0, issues: 0, gst: 0, it: 0, tds: 0 },
    loading,
    error,
    refetch: fetchData,
  };
}

export const useClients = useNoticeClients;
