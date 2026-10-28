import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchClientsRequest,
  fetchClientStatsRequest,
  createClientRequest,
  updateClientRequest,
  deleteClientRequest,
} from '@/store/features/clients/clientSlice';
import { ClientQueryParams } from '@/services/clientApi';
import { Client } from '@/data/crmData';
import { clientApi } from '@/services/clientApi';

/**
 * Fetch paginated, filtered, and searched clients using Redux Toolkit & Saga
 * In-memory caching: Fetches once per parameter configuration, renders instantly from state on tab returns.
 */
export function useClients(params: ClientQueryParams = {}) {
  const dispatch = useAppDispatch();
  const { items, pagination, loading, error, isLoaded, currentParams } = useAppSelector(
    (state) => state.clients
  );

  const paramsKey = JSON.stringify(params || {});
  const lastFetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastFetchedKeyRef.current === paramsKey) {
      return;
    }

    const isSameParams = JSON.stringify(currentParams) === paramsKey;

    // If data is already in state and params haven't changed, reuse state (no network refetch on tab switch)
    if (isLoaded && isSameParams) {
      lastFetchedKeyRef.current = paramsKey;
      return;
    }

    lastFetchedKeyRef.current = paramsKey;
    dispatch(fetchClientsRequest(params));
  }, [dispatch, paramsKey, isLoaded, currentParams, params]);

  const refetch = useCallback(() => {
    lastFetchedKeyRef.current = null;
    dispatch(fetchClientsRequest(params));
  }, [dispatch, params]);

  return {
    data: {
      clients: items,
      pagination,
    },
    isLoading: loading && !isLoaded,
    isFetching: loading,
    error: error ? new Error(error) : null,
    refetch,
  };
}

/**
 * Fetch client practice overview statistics using Redux
 */
export function useClientStats() {
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((state) => state.clients);

  useEffect(() => {
    dispatch(fetchClientStatsRequest());
  }, [dispatch]);

  return {
    data: stats,
    isLoading: loading,
    error: error ? new Error(error) : null,
    refetch: () => dispatch(fetchClientStatsRequest()),
  };
}

/**
 * Mutation: Register new client via Redux Saga
 */
export function useCreateClient() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.clients.mutating);

  const mutateAsync = useCallback(
    (newClient: Partial<Client>) => {
      return new Promise<{ data: Client }>((resolve, reject) => {
        dispatch(
          createClientRequest({
            data: newClient,
            onSuccess: (client) => resolve({ data: client }),
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (newClient: Partial<Client>) => mutateAsync(newClient),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Mutation: Update client details via Redux Saga
 */
export function useUpdateClient() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.clients.mutating);

  const mutateAsync = useCallback(
    ({ id, data }: { id: string; data: Partial<Client> }) => {
      return new Promise<{ data: Client }>((resolve, reject) => {
        dispatch(
          updateClientRequest({
            id,
            data,
            onSuccess: (client) => resolve({ data: client }),
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (payload: { id: string; data: Partial<Client> }) => mutateAsync(payload),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Mutation: Soft delete client via Redux Saga
 */
export function useDeleteClient() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.clients.mutating);

  const mutateAsync = useCallback(
    (id: string) => {
      return new Promise<void>((resolve, reject) => {
        dispatch(
          deleteClientRequest({
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
 * Mutation: Restore soft-deleted client
 */
export function useRestoreClient() {
  const dispatch = useAppDispatch();
  return {
    mutateAsync: async (id: string) => {
      const res = await clientApi.restoreClient(id);
      dispatch(fetchClientsRequest());
      return res;
    },
    isPending: false,
  };
}

/**
 * Mutation: Add subdocument entry to customerFiles
 */
export function useAddCustomerFile() {
  const dispatch = useAppDispatch();
  return {
    mutateAsync: async ({
      clientId,
      fileType,
      itemData,
    }: {
      clientId: string;
      fileType: 'promoter' | 'statutory' | 'recurring';
      itemData: Record<string, unknown>;
    }) => {
      const res = await clientApi.addCustomerFile(clientId, fileType, itemData);
      dispatch(fetchClientsRequest());
      return res;
    },
    isPending: false,
  };
}

/**
 * Mutation: Remove subdocument entry from customerFiles
 */
export function useRemoveCustomerFile() {
  const dispatch = useAppDispatch();
  return {
    mutateAsync: async ({
      clientId,
      fileType,
      itemId,
    }: {
      clientId: string;
      fileType: 'promoter' | 'statutory' | 'recurring';
      itemId: string | number;
    }) => {
      const res = await clientApi.removeCustomerFile(clientId, fileType, itemId);
      dispatch(fetchClientsRequest());
      return res;
    },
    isPending: false,
  };
}
