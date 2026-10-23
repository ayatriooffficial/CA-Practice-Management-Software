import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationApi, Quotation, QuotationQueryParams } from '@/services/quotationApi';

export const QUOTATION_QUERY_KEYS = {
  all: ['quotations'] as const,
  lists: () => [...QUOTATION_QUERY_KEYS.all, 'list'] as const,
  list: (params: QuotationQueryParams) => [...QUOTATION_QUERY_KEYS.lists(), params] as const,
  details: () => [...QUOTATION_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...QUOTATION_QUERY_KEYS.details(), id] as const,
};

export function useQuotations(params: QuotationQueryParams = {}) {
  return useQuery({
    queryKey: QUOTATION_QUERY_KEYS.list(params),
    queryFn: async () => {
      const response = await quotationApi.getQuotations(params);
      return {
        quotations: response.data || [],
        pagination: response.pagination || {
          page: params.page || 1,
          limit: params.limit || 10,
          totalDocs: response.data?.length || 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    },
    staleTime: 30 * 1000,
  });
}

export function useQuotationById(id: string | null | undefined) {
  return useQuery({
    queryKey: QUOTATION_QUERY_KEYS.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await quotationApi.getQuotationById(id);
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Quotation>) => quotationApi.createQuotation(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.lists() });
      if (vars.leadId) {
        queryClient.invalidateQueries({
          queryKey: QUOTATION_QUERY_KEYS.list({ leadId: vars.leadId }),
        });
      }
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Quotation> }) =>
      quotationApi.updateQuotation(id, data),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.detail(vars.id) });
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotationApi.deleteQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.lists() });
    },
  });
}
