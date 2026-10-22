"use client";

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ComplianceCategory } from '@/types/compliance';
import { complianceApi } from '@/services/complianceApi';

export const COMPLIANCE_QUERY_KEYS = {
  all: ['compliance'] as const,
  categories: () => [...COMPLIANCE_QUERY_KEYS.all, 'categories'] as const,
  grid: (params: Record<string, unknown>) => [...COMPLIANCE_QUERY_KEYS.all, 'grid', params] as const,
  entitlement: () => [...COMPLIANCE_QUERY_KEYS.all, 'entitlement'] as const,
};

export function useComplianceCategories() {
  const query = useQuery({
    queryKey: COMPLIANCE_QUERY_KEYS.categories(),
    queryFn: () => complianceApi.getCategories().then((response) => response.data),
  });
  return {
    categories: query.data ?? ([] as ComplianceCategory[]),
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSyncEntitlementData() {
  const [now] = useState(() => Date.now());
  const query = useQuery({
    queryKey: COMPLIANCE_QUERY_KEYS.entitlement(),
    queryFn: () => complianceApi.getEntitlement().then((response) => response.data),
  });
  const last = query.data?.lastFreeSyncAt ? new Date(query.data.lastFreeSyncAt).getTime() : 0;
  const daysRemaining = last
    ? Math.max(0, (query.data?.cooldownDays ?? 14) - Math.floor((now - last) / 86400000))
    : 0;
  return {
    entitlement: query.data ?? null,
    daysRemaining,
    isCooldown: daysRemaining > 0,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreditsData() {
  const query = useQuery({
    queryKey: COMPLIANCE_QUERY_KEYS.entitlement(),
    queryFn: () => complianceApi.getEntitlement().then((response) => response.data),
  });
  return { credits: query.data?.credits ?? null, loading: query.isLoading, error: query.error, refetch: query.refetch };
}
