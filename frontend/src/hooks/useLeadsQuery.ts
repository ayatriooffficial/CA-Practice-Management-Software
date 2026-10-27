import { useEffect, useCallback, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchLeadsRequest,
  fetchLeadStatsRequest,
  createLeadRequest,
  updateLeadRequest,
  deleteLeadRequest,
  convertLeadRequest,
  fetchLeadByIdRequest,
} from '@/store/features/leads/leadSlice';
import { fetchClientsRequest } from '@/store/features/clients/clientSlice';
import { LeadQueryParams, ConvertLeadPayload, leadApi } from '@/services/leadApi';
import { Lead } from '@/data/crmData';

/**
 * Fetch paginated, filtered, and searched leads using Redux Toolkit & Saga
 * In-memory caching: Fetches once per parameter configuration, renders instantly from state on tab returns.
 */
export function useLeads(params: LeadQueryParams = {}) {
  const dispatch = useAppDispatch();
  const { items, pagination, loading, error, isLoaded, currentParams } = useAppSelector(
    (state) => state.leads
  );

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    const isSameParams = JSON.stringify(currentParams) === paramsKey;

    // If data is already in state and params haven't changed, reuse state (no network refetch on tab switch)
    if (isLoaded && isSameParams) {
      return;
    }

    dispatch(fetchLeadsRequest(params));
  }, [dispatch, paramsKey, isLoaded, currentParams]);

  const refetch = useCallback(() => {
    dispatch(fetchLeadsRequest(params));
  }, [dispatch, params]);

  return {
    data: {
      leads: items,
      pagination,
    },
    isLoading: loading && !isLoaded,
    isFetching: loading,
    error: error ? new Error(error) : null,
    refetch,
  };
}

/**
 * Fetch lead conversion and pipeline metrics
 */
export function useLeadStats() {
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((state) => state.leads);

  useEffect(() => {
    dispatch(fetchLeadStatsRequest());
  }, [dispatch]);

  return {
    data: stats,
    isLoading: loading,
    error: error ? new Error(error) : null,
    refetch: () => dispatch(fetchLeadStatsRequest()),
  };
}

/**
 * Mutation: Create new lead via Redux Saga
 */
export function useCreateLead() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.leads.mutating);

  const mutateAsync = useCallback(
    (newLead: Partial<Lead>) => {
      return new Promise<{ data: Lead }>((resolve, reject) => {
        dispatch(
          createLeadRequest({
            data: newLead,
            onSuccess: (lead) => resolve({ data: lead }),
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (newLead: Partial<Lead>) => mutateAsync(newLead),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Mutation: Update existing lead via Redux Saga
 */
export function useUpdateLead() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.leads.mutating);

  const mutateAsync = useCallback(
    ({ id, data }: { id: string; data: Partial<Lead> }) => {
      return new Promise<{ data: Lead }>((resolve, reject) => {
        dispatch(
          updateLeadRequest({
            id,
            data,
            onSuccess: (lead) => resolve({ data: lead }),
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (payload: { id: string; data: Partial<Lead> }) => mutateAsync(payload),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Mutation: Soft delete lead via Redux Saga
 */
export function useDeleteLead() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.leads.mutating);

  const mutateAsync = useCallback(
    (id: string) => {
      return new Promise<void>((resolve, reject) => {
        dispatch(
          deleteLeadRequest({
            id,
            onSuccess: () => resolve(),
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (id: string) => mutateAsync(id),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Mutation: Restore soft-deleted lead
 */
export function useRestoreLead() {
  const dispatch = useAppDispatch();
  return {
    mutateAsync: async (id: string) => {
      const res = await leadApi.restoreLead(id);
      dispatch(fetchLeadsRequest());
      return res;
    },
    isPending: false,
  };
}

/**
 * Mutation: Convert Lead to Client via Redux Saga
 */
export function useConvertLead() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.leads.mutating);

  const mutateAsync = useCallback(
    ({ id, payload }: { id: string; payload: ConvertLeadPayload }) => {
      return new Promise<any>((resolve, reject) => {
        dispatch(
          convertLeadRequest({
            id,
            payload,
            onSuccess: (res) => {
              dispatch(fetchClientsRequest());
              resolve(res);
            },
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (payload: { id: string; payload: ConvertLeadPayload }) => mutateAsync(payload),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Fetch single lead details
 */
export function useLeadById(id: string | null | undefined) {
  const dispatch = useAppDispatch();
  const leadFromStore = useAppSelector((state) =>
    id ? state.leads.items.find((l) => l.id === id) || state.leads.selectedLead : null
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchLeadByIdRequest(id));
    }
  }, [dispatch, id]);

  return {
    data: leadFromStore,
    isLoading: false,
    refetch: () => id && dispatch(fetchLeadByIdRequest(id)),
  };
}

/**
 * Fetch lead follow-up tasks
 */
export function useLeadTasks(leadId: string | null | undefined) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await leadApi.getLeadTasks(leadId);
      setTasks(res.data || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    data: tasks,
    isLoading: loading,
    refetch: fetchTasks,
  };
}

/**
 * Mutation: Create lead follow-up task
 */
export function useCreateLeadTask() {
  return {
    mutateAsync: async ({ leadId, data }: { leadId: string; data: any }) => {
      return leadApi.createLeadTask(leadId, data);
    },
    isPending: false,
  };
}

/**
 * Mutation: Update lead follow-up task
 */
export function useUpdateLeadTask() {
  return {
    mutateAsync: async ({
      leadId,
      taskId,
      data,
    }: {
      leadId: string;
      taskId: string;
      data: any;
    }) => {
      return leadApi.updateLeadTask(leadId, taskId, data);
    },
    isPending: false,
  };
}

/**
 * Mutation: Delete lead follow-up task
 */
export function useDeleteLeadTask() {
  return {
    mutateAsync: async ({ leadId, taskId }: { leadId: string; taskId: string }) => {
      return leadApi.deleteLeadTask(leadId, taskId);
    },
    isPending: false,
  };
}

/**
 * Mutation: Add detail note to lead
 */
export function useAddLeadNote() {
  const dispatch = useAppDispatch();
  return {
    mutateAsync: async ({
      leadId,
      note,
      author,
    }: {
      leadId: string;
      note: string;
      author?: string;
    }) => {
      const res = await leadApi.addLeadNote(leadId, note, author);
      if (leadId) {
        dispatch(fetchLeadByIdRequest(leadId));
      }
      return res;
    },
    isPending: false,
  };
}

/**
 * Mutation: Delete detail note from lead
 */
export function useDeleteLeadNote() {
  const dispatch = useAppDispatch();
  return {
    mutateAsync: async ({ leadId, noteId }: { leadId: string; noteId: string }) => {
      const res = await leadApi.deleteLeadNote(leadId, noteId);
      if (leadId) {
        dispatch(fetchLeadByIdRequest(leadId));
      }
      return res;
    },
    isPending: false,
  };
}
