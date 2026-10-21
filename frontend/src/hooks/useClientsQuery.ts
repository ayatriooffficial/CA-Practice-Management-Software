import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { clientApi, ClientQueryParams } from '@/services/clientApi';
import { Client, INITIAL_CLIENTS } from '@/data/crmData';

export const CLIENT_QUERY_KEYS = {
  all: ['clients'] as const,
  lists: () => [...CLIENT_QUERY_KEYS.all, 'list'] as const,
  list: (params: ClientQueryParams) => [...CLIENT_QUERY_KEYS.lists(), params] as const,
  details: () => [...CLIENT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CLIENT_QUERY_KEYS.details(), id] as const,
  stats: () => [...CLIENT_QUERY_KEYS.all, 'stats'] as const,
};

/**
 * Fetch paginated, filtered, and searched clients
 */
export function useClients(params: ClientQueryParams = {}) {
  return useQuery({
    queryKey: CLIENT_QUERY_KEYS.list(params),
    queryFn: async () => {
      try {
        const response = await clientApi.getClients(params);
        return {
          clients: response.data || [],
          pagination: response.pagination || {
            page: params.page || 1,
            limit: params.limit || 10,
            totalDocs: response.data?.length || 0,
            totalPages: Math.ceil((response.data?.length || 0) / (params.limit || 10)) || 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      } catch (error) {
        console.warn('Backend API unavailable, falling back to local dataset:', error);
        return {
          clients: INITIAL_CLIENTS,
          pagination: {
            page: 1,
            limit: params.limit || 10,
            totalDocs: INITIAL_CLIENTS.length,
            totalPages: Math.ceil(INITIAL_CLIENTS.length / (params.limit || 10)),
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
 * Mutation: Register new client
 */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newClient: Partial<Client>) => clientApi.createClient(newClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Update client details
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientApi.updateClient(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Soft delete client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientApi.softDeleteClient(id),
    onSuccess: () => {
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
