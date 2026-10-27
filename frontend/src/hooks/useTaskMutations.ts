'use client';

import { useAppDispatch } from '@/store/hooks';
import { taskApi } from '@/services/taskApi';
import { LinkedEmail } from '@/data/taskData';
import { fetchTaskByIdRequest, fetchTasksRequest } from '@/store/features/tasks/taskSlice';

export function useLinkEmailToTask() {
  const dispatch = useAppDispatch();

  return {
    mutateAsync: async ({ taskId, email }: { taskId: string; email: LinkedEmail }) => {
      const res = await taskApi.linkEmailToTask(taskId, email);
      if (!res.success && res.message) {
        throw new Error(res.message);
      }
      dispatch(fetchTaskByIdRequest(taskId));
      dispatch(fetchTasksRequest());
      return res.data;
    },
    isPending: false,
  };
}

export function useUnlinkEmailFromTask() {
  const dispatch = useAppDispatch();

  return {
    mutateAsync: async ({ taskId, messageId }: { taskId: string; messageId: string }) => {
      const res = await taskApi.unlinkEmailFromTask(taskId, messageId);
      if (!res.success && res.message) {
        throw new Error(res.message);
      }
      dispatch(fetchTaskByIdRequest(taskId));
      dispatch(fetchTasksRequest());
      return res.data;
    },
    isPending: false,
  };
}
