"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Portal } from '@/types/notices';
import { syncApi } from '@/services/syncApi';

export function useSyncJobs(params: Record<string, string | number | undefined> = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await syncApi.getJobs(params);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

export function useActivityLogs(params: Record<string, string | number | undefined> = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await syncApi.getActivity(params);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

export function useSyncClients() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async (payload: { clientIds: string[]; portals: Portal[]; module?: 'notices' | 'compliance'; isFreeSync?: boolean }) => {
      setIsPending(true);
      try {
        if (payload.isFreeSync) {
          return await syncApi.freeSync(payload);
        }
        if (payload.module === 'compliance') {
          return await syncApi.syncCompliance(payload);
        }
        return await syncApi.syncClients(payload);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}
