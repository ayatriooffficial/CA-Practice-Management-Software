import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { leadApi, LeadQueryParams, ConvertLeadPayload } from '@/services/leadApi';
import { Lead } from '@/data/crmData';
import { localSyncManager, SYNC_KEYS } from '@/services/localSyncManager';

export const LEAD_QUERY_KEYS = {
  all: ['leads'] as const,
  lists: () => [...LEAD_QUERY_KEYS.all, 'list'] as const,
  list: (params: LeadQueryParams) => [...LEAD_QUERY_KEYS.lists(), params] as const,
  details: () => [...LEAD_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...LEAD_QUERY_KEYS.details(), id] as const,
  stats: () => [...LEAD_QUERY_KEYS.all, 'stats'] as const,
};

/**
 * Fetch paginated, filtered, and searched leads with local-first cache
 */
export function useLeads(params: LeadQueryParams = {}) {
  return useQuery({
    queryKey: LEAD_QUERY_KEYS.list(params),
    queryFn: async () => {
      try {
        const response = await leadApi.getLeads(params);
        if (response.data && Array.isArray(response.data)) {
          // Sync server response directly to local storage cache
          localSyncManager.setCached(SYNC_KEYS.LEADS, response.data);
        }
        return {
          leads: response.data || [],
          pagination: response.pagination || {
            page: params.page || 1,
            limit: params.limit || 15,
            totalDocs: response.data?.length || 0,
            totalPages: Math.max(1, Math.ceil((response.data?.length || 0) / (params.limit || 15))),
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      } catch (error) {
        // Fallback to real local cache (zero dummy data)
        const cached = localSyncManager.getCached<Lead>(SYNC_KEYS.LEADS);
        return {
          leads: cached,
          pagination: {
            page: 1,
            limit: params.limit || 15,
            totalDocs: cached.length,
            totalPages: Math.max(1, Math.ceil(cached.length / (params.limit || 15))),
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch lead conversion and pipeline metrics
 */
export function useLeadStats() {
  return useQuery({
    queryKey: LEAD_QUERY_KEYS.stats(),
    queryFn: async () => {
      const response = await leadApi.getLeadStats();
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Mutation: Create new lead (with local cache update)
 */
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newLead: Partial<Lead>) => leadApi.createLead(newLead),
    onSuccess: (res) => {
      if (res?.data) {
        localSyncManager.upsertItem(SYNC_KEYS.LEADS, res.data);
      }
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Update existing lead (with local cache update)
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      leadApi.updateLead(id, data),
    onSuccess: (res, variables) => {
      if (res?.data) {
        localSyncManager.upsertItem(SYNC_KEYS.LEADS, res.data);
      }
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Soft delete lead (with local cache update)
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leadApi.softDeleteLead(id),
    onSuccess: (_, id) => {
      localSyncManager.removeItem(SYNC_KEYS.LEADS, id);
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Restore soft-deleted lead
 */
export function useRestoreLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leadApi.restoreLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Convert Lead to Client
 */
export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConvertLeadPayload }) =>
      leadApi.convertLead(id, payload),
    onSuccess: () => {
      // Invalidate both leads and clients to maintain state synchronization
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.stats() });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

/**
 * Fetch single lead details
 */
export function useLeadById(id: string | null | undefined) {
  return useQuery({
    queryKey: LEAD_QUERY_KEYS.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await leadApi.getLeadById(id);
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch lead follow-up tasks
 */
export function useLeadTasks(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ['lead-tasks', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const res = await leadApi.getLeadTasks(leadId);
      return res.data || [];
    },
    enabled: Boolean(leadId),
    staleTime: 30 * 1000,
  });
}

/**
 * Mutation: Create lead follow-up task
 */
export function useCreateLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: any }) =>
      leadApi.createLeadTask(leadId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', vars.leadId] });
    },
  });
}

/**
 * Mutation: Update lead follow-up task
 */
export function useUpdateLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, taskId, data }: { leadId: string; taskId: string; data: any }) =>
      leadApi.updateLeadTask(leadId, taskId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', vars.leadId] });
    },
  });
}

/**
 * Mutation: Delete lead follow-up task
 */
export function useDeleteLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, taskId }: { leadId: string; taskId: string }) =>
      leadApi.deleteLeadTask(leadId, taskId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', vars.leadId] });
    },
  });
}

/**
 * Mutation: Add detail note to lead
 */
export function useAddLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, note, author }: { leadId: string; note: string; author?: string }) =>
      leadApi.addLeadNote(leadId, note, author),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.detail(vars.leadId) });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Mutation: Delete detail note from lead
 */
export function useDeleteLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, noteId }: { leadId: string; noteId: string }) =>
      leadApi.deleteLeadNote(leadId, noteId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.detail(vars.leadId) });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.lists() });
    },
  });
}

