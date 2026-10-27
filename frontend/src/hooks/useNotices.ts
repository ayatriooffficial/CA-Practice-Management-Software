"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GetNoticesParams, NoticeStatus, NoticeSummary } from '@/types/notices';
import { noticeApi } from '@/services/noticeApi';

export function useNotices(options: GetNoticesParams = {}) {
  const [noticesData, setNoticesData] = useState<any>(null);
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const optionsKey = useMemo(() => JSON.stringify(options), [options]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [notices, summary, clients] = await Promise.all([
        noticeApi.getNotices(options),
        noticeApi.getSummary(options.portal === 'ALL' ? undefined : options.portal),
        noticeApi.getClients(),
      ]);
      setNoticesData({
        ...notices.data,
        summary: { ...notices.data?.summary, ...summary.data },
      });
      setClientsData(clients.data?.data ?? []);
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

  const summary: NoticeSummary = noticesData?.summary ?? {
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

  const changeStatus = useCallback(
    async (id: string, status: NoticeStatus) => {
      await noticeApi.updateStatus(id, status);
      await fetchData();
    },
    [fetchData]
  );

  return {
    notices: noticesData?.data ?? [],
    clients: clientsData,
    summary,
    loading,
    error,
    refetch: fetchData,
    changeStatus,
  };
}
