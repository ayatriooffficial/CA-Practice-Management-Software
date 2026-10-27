import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TaskItem, TaskStats } from '@/data/taskData';
import { TaskQueryParams } from '@/services/taskApi';
import { PaginationState } from '../clients/clientSlice';

export interface TaskState {
  items: TaskItem[];
  selectedTask: TaskItem | null;
  stats: TaskStats | null;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  pagination: PaginationState;
  currentParams: TaskQueryParams;
  isLoaded: boolean;
}

const initialState: TaskState = {
  items: [],
  selectedTask: null,
  stats: null,
  loading: false,
  mutating: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    totalDocs: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  currentParams: {},
  isLoaded: false,
};

export const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    hydrateTasks: (
      state,
      action: PayloadAction<{ tasks: TaskItem[]; pagination?: PaginationState; params?: TaskQueryParams }>
    ) => {
      state.items = action.payload.tasks;
      state.isLoaded = true;
      state.loading = false;
      state.error = null;
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.tasks.length;
        state.pagination.totalPages = Math.max(
          1,
          Math.ceil(action.payload.tasks.length / (state.pagination.limit || 10))
        );
      }
      if (action.payload.params) {
        state.currentParams = action.payload.params;
      }
    },
    fetchTasksRequest: (state, action: PayloadAction<TaskQueryParams | undefined>) => {
      state.loading = true;
      state.error = null;
      if (action.payload) {
        state.currentParams = action.payload;
      }
    },
    fetchTasksSuccess: (
      state,
      action: PayloadAction<{ tasks: TaskItem[]; pagination?: PaginationState }>
    ) => {
      state.loading = false;
      state.items = action.payload.tasks;
      state.isLoaded = true;
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.tasks.length;
        state.pagination.totalPages = Math.max(
          1,
          Math.ceil(action.payload.tasks.length / (state.pagination.limit || 10))
        );
      }
    },
    fetchTasksFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchTaskByIdRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchTaskByIdSuccess: (state, action: PayloadAction<TaskItem>) => {
      state.loading = false;
      state.selectedTask = action.payload;
      const index = state.items.findIndex(
        (t) => t.id === action.payload.id || (t as any)._id === action.payload.id
      );
      if (index >= 0) {
        state.items[index] = action.payload;
      }
    },
    fetchTaskByIdFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchTaskStatsRequest: (_state, _action: PayloadAction<string | undefined>) => {},
    fetchTaskStatsSuccess: (state, action: PayloadAction<TaskStats>) => {
      state.stats = action.payload;
    },

    createTaskRequest: (
      state,
      _action: PayloadAction<{ data: Partial<TaskItem>; onSuccess?: (task: TaskItem) => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    createTaskSuccess: (state, action: PayloadAction<TaskItem>) => {
      state.mutating = false;
      state.items = [action.payload, ...state.items];
      state.pagination.totalDocs += 1;
    },
    createTaskFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    updateTaskRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        data: Partial<TaskItem>;
        onSuccess?: (task: TaskItem) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    updateTaskSuccess: (state, action: PayloadAction<TaskItem>) => {
      state.mutating = false;
      const index = state.items.findIndex(
        (t) => t.id === action.payload.id || (t as any)._id === action.payload.id
      );
      if (index >= 0) {
        state.items[index] = action.payload;
      }
      if (
        state.selectedTask &&
        (state.selectedTask.id === action.payload.id ||
          (state.selectedTask as any)._id === action.payload.id)
      ) {
        state.selectedTask = action.payload;
      }
    },
    updateTaskFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    deleteTaskRequest: (
      state,
      _action: PayloadAction<{ id: string; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    deleteTaskSuccess: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.items = state.items.filter(
        (t) => t.id !== action.payload && (t as any)._id !== action.payload
      );
      if (
        state.selectedTask &&
        (state.selectedTask.id === action.payload ||
          (state.selectedTask as any)._id === action.payload)
      ) {
        state.selectedTask = null;
      }
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - 1);
    },
    deleteTaskFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    bulkDeleteTasksRequest: (
      state,
      _action: PayloadAction<{ ids: string[]; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    bulkDeleteTasksSuccess: (state, action: PayloadAction<string[]>) => {
      state.mutating = false;
      const idSet = new Set(action.payload);
      state.items = state.items.filter(
        (t) => !idSet.has(t.id) && !idSet.has((t as any)._id)
      );
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - action.payload.length);
    },
    bulkDeleteTasksFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    setSelectedTask: (state, action: PayloadAction<TaskItem | null>) => {
      state.selectedTask = action.payload;
    },
    clearTaskError: (state) => {
      state.error = null;
    },
  },
});

export const {
  hydrateTasks,
  fetchTasksRequest,
  fetchTasksSuccess,
  fetchTasksFailure,
  fetchTaskByIdRequest,
  fetchTaskByIdSuccess,
  fetchTaskByIdFailure,
  fetchTaskStatsRequest,
  fetchTaskStatsSuccess,
  createTaskRequest,
  createTaskSuccess,
  createTaskFailure,
  updateTaskRequest,
  updateTaskSuccess,
  updateTaskFailure,
  deleteTaskRequest,
  deleteTaskSuccess,
  deleteTaskFailure,
  bulkDeleteTasksRequest,
  bulkDeleteTasksSuccess,
  bulkDeleteTasksFailure,
  setSelectedTask,
  clearTaskError,
} = taskSlice.actions;

export default taskSlice.reducer;
