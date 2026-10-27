"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ComplianceCategory } from '@/types/compliance';
import { complianceApi } from '@/services/complianceApi';

export function useComplianceCategories() {
  const [categories, setCategories] = useState<ComplianceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complianceApi.getCategories();
      setCategories(res.data ?? []);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
}

export function useSyncEntitlementData() {
  const [entitlement, setEntitlement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchEntitlement = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complianceApi.getEntitlement();
      setEntitlement(res.data ?? null);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntitlement();
  }, [fetchEntitlement]);

  const now = Date.now();
  const last = entitlement?.lastFreeSyncAt ? new Date(entitlement.lastFreeSyncAt).getTime() : 0;
  const daysRemaining = last
    ? Math.max(0, (entitlement?.cooldownDays ?? 14) - Math.floor((now - last) / 86400000))
    : 0;

  return {
    entitlement,
    daysRemaining,
    isCooldown: daysRemaining > 0,
    loading,
    error,
    refetch: fetchEntitlement,
  };
}

export function useCreditsData() {
  const [credits, setCredits] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchCredits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complianceApi.getEntitlement();
      setCredits(res.data?.credits ?? null);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    credits,
    loading,
    error,
    refetch: fetchCredits,
  };
}
