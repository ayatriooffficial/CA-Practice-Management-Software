import { useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchServicesRequest,
  fetchServiceStatsRequest,
  createServiceRequest,
  updateServiceRequest,
  deleteServiceRequest,
} from '@/store/features/services/serviceSlice';
import { fetchClientsRequest } from '@/store/features/clients/clientSlice';
import { ServiceQueryParams, serviceApi } from '@/services/serviceApi';
import { Service } from '@/data/serviceData';

/**
 * Fetch paginated, filtered, and searched services using Redux Toolkit & Saga
 * In-memory caching: Fetches once per parameter configuration, renders instantly from state on tab returns.
 */
export function useServices(params: ServiceQueryParams = {}) {
  const dispatch = useAppDispatch();
  const { items, pagination, loading, error, isLoaded, currentParams } = useAppSelector(
    (state) => state.services
  );

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    const isSameParams = JSON.stringify(currentParams) === paramsKey;

    // If data is already in state and params haven't changed, reuse state (no network refetch on tab switch)
    if (isLoaded && isSameParams) {
      return;
    }

    dispatch(fetchServicesRequest(params));
  }, [dispatch, paramsKey, isLoaded, currentParams]);

  const refetch = useCallback(() => {
    dispatch(fetchServicesRequest(params));
  }, [dispatch, params]);

  return {
    data: {
      services: items,
      pagination,
    },
    isLoading: loading && !isLoaded,
    isFetching: loading,
    error: error ? new Error(error) : null,
    refetch,
  };
}

/**
 * Fetch service catalog analytics
 */
export function useServiceStats() {
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((state) => state.services);

  useEffect(() => {
    dispatch(fetchServiceStatsRequest());
  }, [dispatch]);

  return {
    data: stats,
    isLoading: loading,
    error: error ? new Error(error) : null,
    refetch: () => dispatch(fetchServiceStatsRequest()),
  };
}

/**
 * Mutation: Create new service via Redux Saga
 */
export function useCreateService() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.services.mutating);

  const mutateAsync = useCallback(
    (newService: Partial<Service>) => {
      return new Promise<{ data: Service }>((resolve, reject) => {
        dispatch(
          createServiceRequest({
            data: newService,
            onSuccess: (service) => resolve({ data: service }),
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (newService: Partial<Service>) => mutateAsync(newService),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Mutation: Update existing service via Redux Saga
 */
export function useUpdateService() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.services.mutating);

  const mutateAsync = useCallback(
    ({ id, data }: { id: string; data: Partial<Service> }) => {
      return new Promise<{ data: Service }>((resolve, reject) => {
        dispatch(
          updateServiceRequest({
            id,
            data,
            onSuccess: (service) => resolve({ data: service }),
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (payload: { id: string; data: Partial<Service> }) => mutateAsync(payload),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Mutation: Soft delete service via Redux Saga
 */
export function useDeleteService() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.services.mutating);

  const mutateAsync = useCallback(
    (id: string) => {
      return new Promise<void>((resolve, reject) => {
        dispatch(
          deleteServiceRequest({
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
 * Mutation: Restore soft-deleted service
 */
export function useRestoreService() {
  const dispatch = useAppDispatch();
  return {
    mutateAsync: async (id: string) => {
      const res = await serviceApi.restoreService(id);
      dispatch(fetchServicesRequest());
      return res;
    },
    isPending: false,
  };
}

/**
 * Mutation: Toggle client recurring service compliance status
 */
export function useToggleClientServiceMutation() {
  const dispatch = useAppDispatch();
  return {
    mutateAsync: async ({
      serviceId,
      clientId,
      enabled,
    }: {
      serviceId: string;
      clientId: string;
      enabled: boolean;
    }) => {
      const res = await serviceApi.toggleClientService(serviceId, clientId, enabled);
      dispatch(fetchServicesRequest());
      dispatch(fetchClientsRequest());
      return res;
    },
    isPending: false,
  };
}
