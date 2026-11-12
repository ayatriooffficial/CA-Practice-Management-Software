import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchTasksRequest,
  fetchTaskStatsRequest,
  createTaskRequest,
  updateTaskRequest,
  deleteTaskRequest,
} from '@/store/features/tasks/taskSlice';
import { TaskQueryParams, taskApi } from '@/services/taskApi';
import { TaskItem } from '@/data/taskData';

/**
 * Fetch paginated, filtered, and searched tasks using Redux Toolkit & Saga
 * In-memory caching: Fetches once per parameter configuration, renders instantly from state on tab returns.
 */
export function useTasks(params: TaskQueryParams = {}) {
  const dispatch = useAppDispatch();
  const { items, pagination, loading, error, isLoaded, currentParams } = useAppSelector(
    (state) => state.tasks
  );

  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);
  const lastDispatchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const isSameParams = JSON.stringify(currentParams) === paramsKey;

    // 1. If data is already in state and params haven't changed, reuse state (no network refetch on tab switch)
    if (isLoaded && isSameParams) {
      lastDispatchedKeyRef.current = paramsKey;
      return;
    }

    // 2. If already dispatched for these exact params and currently loading or already loaded, avoid duplicate requests
    if (lastDispatchedKeyRef.current === paramsKey && (loading || isLoaded)) {
      return;
    }

    // 3. Otherwise (not loaded yet, params changed, or hard reload), fetch data
    lastDispatchedKeyRef.current = paramsKey;
    dispatch(fetchTasksRequest(params));
  }, [dispatch, paramsKey, isLoaded, currentParams, loading, params]);

  const refetch = useCallback(() => {
    lastDispatchedKeyRef.current = null;
    dispatch(fetchTasksRequest(params));
  }, [dispatch, params]);

  return {
    data: {
      tasks: items,
      pagination,
    },
    isLoading: loading && !isLoaded,
    isFetching: loading,
    error: error ? new Error(error) : null,
    refetch,
  };
}

/**
 * Fetch task overview statistics
 */
export function useTaskStats(category?: string) {
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((state) => state.tasks);

  useEffect(() => {
    dispatch(fetchTaskStatsRequest(category));
  }, [dispatch, category]);

  return {
    data: stats,
    isLoading: loading,
    error: error ? new Error(error) : null,
    refetch: () => dispatch(fetchTaskStatsRequest(category)),
  };
}

/**
 * Mutation: Create task via Redux Saga
 */
export function useCreateTask() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.tasks.mutating);

  const mutateAsync = useCallback(
    (newTask: Partial<TaskItem>) => {
      return new Promise<{ data: TaskItem }>((resolve, reject) => {
        dispatch(
          createTaskRequest({
            data: newTask,
            onSuccess: (task) => resolve({ data: task }),
            onError: (err) => reject(err),
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (newTask: Partial<TaskItem>) => mutateAsync(newTask),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Mutation: Update task via Redux Saga
 */
export function useUpdateTask() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.tasks.mutating);

  const mutateAsync = useCallback(
    ({ id, data }: { id: string; data: Partial<TaskItem> }) => {
      return new Promise<{ data: TaskItem }>((resolve, reject) => {
        dispatch(
          updateTaskRequest({
            id,
            data,
            onSuccess: (task) => resolve({ data: task }),
            onError: (err) => reject(err),
          })
        );
      });
    },
    [dispatch]
  );

  return {
    mutate: (payload: { id: string; data: Partial<TaskItem> }) => mutateAsync(payload),
    mutateAsync,
    isPending: mutating,
  };
}

/**
 * Mutation: Delete task via Redux Saga
 */
export function useDeleteTask() {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.tasks.mutating);

  const mutateAsync = useCallback(
    (id: string) => {
      return new Promise<void>((resolve, reject) => {
        dispatch(
          deleteTaskRequest({
            id,
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
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
