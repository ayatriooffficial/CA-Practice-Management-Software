import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { serviceApi, ServiceQueryParams } from '@/services/serviceApi';
import { Service, INITIAL_SERVICES } from '@/data/serviceData';

export const SERVICE_QUERY_KEYS = {
  all: ['services'] as const,
  lists: () => [...SERVICE_QUERY_KEYS.all, 'list'] as const,
  list: (params: ServiceQueryParams) => [...SERVICE_QUERY_KEYS.lists(), params] as const,
  details: () => [...SERVICE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SERVICE_QUERY_KEYS.details(), id] as const,
  stats: () => [...SERVICE_QUERY_KEYS.all, 'stats'] as const,
};

/**
 * Fetch paginated, filtered, and searched services
 */
export function useServices(params: ServiceQueryParams = {}) {
  return useQuery({
    queryKey: SERVICE_QUERY_KEYS.list(params),
    queryFn: async () => {
      try {
        const response = await serviceApi.getServices(params);
        return {
          services: response.data || [],
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
        // Fallback to local data if backend is starting or offline
        console.warn('Backend API unavailable, falling back to local service dataset:', error);
        
        let filtered = [...INITIAL_SERVICES];
        if (params.search?.trim()) {
          const q = params.search.toLowerCase().trim();
          filtered = filtered.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.category.toLowerCase().includes(q) ||
              (s.sacCode && s.sacCode.toLowerCase().includes(q))
          );
        }
        if (params.category) {
          filtered = filtered.filter((s) => s.category === params.category);
        }
        if (params.frequency) {
          filtered = filtered.filter((s) => s.frequency === params.frequency);
        }
        if (params.difficulty) {
          filtered = filtered.filter((s) => s.difficulty === params.difficulty);
        }
        if (params.isRecurring !== undefined) {
          filtered = filtered.filter((s) => s.isRecurring === params.isRecurring);
        }
        if (params.status) {
          filtered = filtered.filter((s) => s.status === params.status);
        }

        const page = params.page || 1;
        const limit = params.limit || 10;
        const start = (page - 1) * limit;
        const paginated = filtered.slice(start, start + limit);

        return {
          services: paginated,
          pagination: {
            page,
            limit,
            totalDocs: filtered.length,
            totalPages: Math.ceil(filtered.length / limit) || 1,
            hasNextPage: start + limit < filtered.length,
            hasPrevPage: page > 1,
          },
        };
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch service catalog analytics
 */
export function useServiceStats() {
  return useQuery({
    queryKey: SERVICE_QUERY_KEYS.stats(),
    queryFn: async () => {
      const response = await serviceApi.getServiceStats();
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Mutation: Create new service
 */
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newService: Partial<Service>) => serviceApi.createService(newService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Update existing service
 */
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Service> }) =>
      serviceApi.updateService(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Soft delete service
 */
export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => serviceApi.softDeleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation: Restore soft-deleted service
 */
export function useRestoreService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => serviceApi.restoreService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.stats() });
    },
  });
}
