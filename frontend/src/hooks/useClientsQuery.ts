import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { clientApi, ClientQueryParams } from '@/services/clientApi';
import { Client } from '@/data/crmData';
import { localSyncManager, SYNC_KEYS } from '@/services/localSyncManager';

export const CLIENT_QUERY_KEYS = {
  all: ['clients'] as const,
  lists: () => [...CLIENT_QUERY_KEYS.all, 'list'] as const,
  list: (params: ClientQueryParams) => [...CLIENT_QUERY_KEYS.lists(), params] as const,
  details: () => [...CLIENT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CLIENT_QUERY_KEYS.details(), id] as const,
  stats: () => [...CLIENT_QUERY_KEYS.all, 'stats'] as const,
};

/**
 * Fetch paginated, filtered, and searched clients with local-first cache
 */
export function useClients(params: ClientQueryParams = {}) {
  return useQuery({
    queryKey: CLIENT_QUERY_KEYS.list(params),
    queryFn: async () => {
      try {
        const response = await clientApi.getClients(params);
        if (response.data && Array.isArray(response.data)) {
          localSyncManager.setCached(SYNC_KEYS.CLIENTS, response.data);
        }
        return {
          clients: response.data || [],
          pagination: response.pagination || {
            page: params.page || 1,
            limit: params.limit || 10,
            totalDocs: response.data?.length || 0,
            totalPages: Math.max(1, Math.ceil((response.data?.length || 0) / (params.limit || 10))),
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      } catch (error) {
        // Fallback to real local cache (zero dummy data)
        const cached = localSyncManager.getCached<Client>(SYNC_KEYS.CLIENTS);
        return {
          clients: cached,
          pagination: {
            page: 1,
            limit: params.limit || 10,
            totalDocs: cached.length,
            totalPages: Math.max(1, Math.ceil(cached.length / (params.limit || 10))),
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
 * Fetch client practice overview statistics
 */
export function useClientStats() {
  return useQuery({
    queryKey: CLIENT_QUERY_KEYS.stats(),
    queryFn: async () => {
      const response = await clientApi.getClientStats();
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Mutation: Register new client (with local cache update)
 */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newClient: Partial<Client>) => clientApi.createClient(newClient),
    onSuccess: (res) => {
      if (res?.data) {
        localSyncManager.upsertItem(SYNC_KEYS.CLIENTS, res.data);
      }
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Update client details (with local cache update)
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientApi.updateClient(id, data),
    onSuccess: (res, variables) => {
      if (res?.data) {
        localSyncManager.upsertItem(SYNC_KEYS.CLIENTS, res.data);
      }
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Soft delete client (with local cache update)
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientApi.softDeleteClient(id),
    onSuccess: (_, id) => {
      localSyncManager.removeItem(SYNC_KEYS.CLIENTS, id);
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Restore soft-deleted client
 */
export function useRestoreClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientApi.restoreClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Add subdocument entry to customerFiles (promoter, statutory, recurring)
 */
export function useAddCustomerFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      fileType,
      itemData,
    }: {
      clientId: string;
      fileType: 'promoter' | 'statutory' | 'recurring';
      itemData: Record<string, unknown>;
    }) => clientApi.addCustomerFile(clientId, fileType, itemData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.detail(variables.clientId) });
    },
  });
}

/**
 * Mutation: Remove subdocument entry from customerFiles
 */
export function useRemoveCustomerFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      fileType,
      itemId,
    }: {
      clientId: string;
      fileType: 'promoter' | 'statutory' | 'recurring';
      itemId: string | number;
    }) => clientApi.removeCustomerFile(clientId, fileType, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.detail(variables.clientId) });
    },
  });
}
