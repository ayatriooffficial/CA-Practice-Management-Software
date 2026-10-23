import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { leadApi, LeadQueryParams, ConvertLeadPayload } from '@/services/leadApi';
import { Lead, INITIAL_LEADS } from '@/data/crmData';

export const LEAD_QUERY_KEYS = {
  all: ['leads'] as const,
  lists: () => [...LEAD_QUERY_KEYS.all, 'list'] as const,
  list: (params: LeadQueryParams) => [...LEAD_QUERY_KEYS.lists(), params] as const,
  details: () => [...LEAD_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...LEAD_QUERY_KEYS.details(), id] as const,
  stats: () => [...LEAD_QUERY_KEYS.all, 'stats'] as const,
};

/**
 * Fetch paginated, filtered, and searched leads
 */
export function useLeads(params: LeadQueryParams = {}) {
  return useQuery({
    queryKey: LEAD_QUERY_KEYS.list(params),
    queryFn: async () => {
      try {
        const response = await leadApi.getLeads(params);
        return {
          leads: response.data || [],
          pagination: response.pagination || {
            page: params.page || 1,
            limit: params.limit || 15,
            totalDocs: response.data?.length || 0,
            totalPages: Math.ceil((response.data?.length || 0) / (params.limit || 15)) || 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      } catch (error) {
        // Fallback to local data gracefully if backend is offline or starting
        console.warn('Backend API unavailable, falling back to local dataset:', error);
        return {
          leads: INITIAL_LEADS,
          pagination: {
            page: 1,
            limit: params.limit || 15,
            totalDocs: INITIAL_LEADS.length,
            totalPages: Math.ceil(INITIAL_LEADS.length / (params.limit || 15)),
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    },
    placeholderData: keepPreviousData, // Keeps previous page data while loading new page to prevent layout shifts
    staleTime: 60 * 1000, // 1 min cache
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
 * Mutation: Create new lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newLead: Partial<Lead>) => leadApi.createLead(newLead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Update existing lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      leadApi.updateLead(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Soft delete lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leadApi.softDeleteLead(id),
    onSuccess: () => {
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

