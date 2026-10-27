"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { quotationApi, Quotation, QuotationQueryParams } from '@/services/quotationApi';

export function useQuotations(params: QuotationQueryParams = {}) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [pagination, setPagination] = useState({
    page: params.page || 1,
    limit: params.limit || 10,
    totalDocs: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(true);

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await quotationApi.getQuotations(params);
      setQuotations(response.data || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch {
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  return {
    data: {
      quotations,
      pagination,
    },
    isLoading: loading,
    refetch: fetchQuotations,
  };
}

export function useQuotationById(id: string | null | undefined) {
  const [data, setData] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  const fetchQuotation = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await quotationApi.getQuotationById(id);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  return { data, isLoading: loading, refetch: fetchQuotation };
}

export function useCreateQuotation() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async (data: Partial<Quotation>) => {
      setIsPending(true);
      try {
        return await quotationApi.createQuotation(data);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}

export function useUpdateQuotation() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async ({ id, data }: { id: string; data: Partial<Quotation> }) => {
      setIsPending(true);
      try {
        return await quotationApi.updateQuotation(id, data);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}

export function useDeleteQuotation() {
  const [isPending, setIsPending] = useState(false);
  return {
    mutateAsync: async (id: string) => {
      setIsPending(true);
      try {
        return await quotationApi.deleteQuotation(id);
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}
