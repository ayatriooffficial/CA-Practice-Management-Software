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
    dispatch(fetchTasksRequest(params));
  }, [dispatch, paramsKey, isLoaded, currentParams, params]);

  const refetch = useCallback(() => {
    lastFetchedKeyRef.current = null;
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
