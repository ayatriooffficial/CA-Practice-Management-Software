'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '@/services/taskApi';
import { LinkedEmail, TaskItem } from '@/data/taskData';

export const TASK_QUERY_KEYS = {
  all: ['tasks'] as const,
  lists: () => [...TASK_QUERY_KEYS.all, 'list'] as const,
  details: () => [...TASK_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TASK_QUERY_KEYS.details(), id] as const,
};

export function useLinkEmailToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, email }: { taskId: string; email: LinkedEmail }) => {
      const res = await taskApi.linkEmailToTask(taskId, email);
      if (!res.success && res.message) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.detail(variables.taskId) });
      void queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.lists() });
      if (data?.id) {
        void queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.detail(data.id) });
      }
      if (data?.taskId) {
        void queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.detail(data.taskId) });
      }
    },
  });
}

export function useUnlinkEmailFromTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, messageId }: { taskId: string; messageId: string }) => {
      const res = await taskApi.unlinkEmailFromTask(taskId, messageId);
      if (!res.success && res.message) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.detail(variables.taskId) });
      void queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.lists() });
      if (data?.id) {
        void queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.detail(data.id) });
      }
      if (data?.taskId) {
        void queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.detail(data.taskId) });
      }
    },
  });
}
