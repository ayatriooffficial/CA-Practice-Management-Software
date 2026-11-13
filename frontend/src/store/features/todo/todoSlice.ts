import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AdminTaskItem,
  TeamTaskItem,
  TodoCalendarEvent,
  TodoItem,
  TodoSummary,
} from '@/services/todoApi';
import { pageStateCache } from '@/services/pageStateCache';
import { TuriaNavSection } from '@/components/todo/TuriaTodoSidebar';

export interface TodoFilterState {
  activeSection: TuriaNavSection;
  adminScope: 'my_work' | 'team_work' | 'all_work';
  selectedTag: string | null;
  searchQuery: string;
  selectedClientId: string;
  selectedAssigneeId: string;
  sortBy: 'created-desc' | 'created-asc' | 'due-asc' | 'priority-desc';
  dueDateFilter: string | null;
  dateFilterTab: 'all' | 'today' | 'tomorrow' | 'upcoming' | 'overdue';
}

export interface TodoPaginationState {
  page: number;
  limit: number;
  totalDocs: number;
  totalPages: number;
}

export interface TodoState {
  // Summary
  summary: TodoSummary | null;
  summaryLoading: boolean;

  // Personal To-Dos (Legacy CRUD)
  personalTodos: TodoItem[];
  personalTodosLoading: boolean;

  // Admin Tasks
  adminTasks: AdminTaskItem[];
  adminTasksLoading: boolean;

  // Team Tasks (Delegated & Supervised)
  teamTasks: TeamTaskItem[];
  teamTasksLoading: boolean;
  teamTasksPagination: TodoPaginationState;

  // Employee Assigned Tasks
  myTasks: TeamTaskItem[];
  myTasksLoading: boolean;

  // Calendar
  calendarEvents: TodoCalendarEvent[];
  calendarLoading: boolean;

  // Unified / Mapped Tasks Cache
  unifiedTasks: TeamTaskItem[];

  // Filters & UI state
  filters: TodoFilterState;
  pagination: TodoPaginationState;

  // Global Flags
  isLoading: boolean;
  isRefreshing: boolean;
  mutating: boolean;
  error: string | null;
  isLoaded: boolean;
}

const getInitialTodoState = (): TodoState => {
  const cached =
    typeof window !== 'undefined'
      ? pageStateCache.get<any>('todo_workspace_data')
      : null;

  return {
    summary: cached?.summary || null,
    summaryLoading: false,
    personalTodos: cached?.personalTodos || [],
    personalTodosLoading: false,
    adminTasks: cached?.adminTasks || [],
    adminTasksLoading: false,
    teamTasks: cached?.teamTasks || [],
    teamTasksLoading: false,
    teamTasksPagination: {
      page: 1,
      limit: 50,
      totalDocs: cached?.teamTasks?.length || 0,
      totalPages: 1,
    },
    myTasks: cached?.myTasks || [],
    myTasksLoading: false,
    calendarEvents: [],
    calendarLoading: false,
    unifiedTasks: cached?.unifiedTasks || [],
    filters: {
      activeSection: 'my-todo',
      adminScope: 'my_work',
      selectedTag: null,
      searchQuery: '',
      selectedClientId: 'All',
      selectedAssigneeId: 'All',
      sortBy: 'created-desc',
      dueDateFilter: null,
      dateFilterTab: 'all',
    },
    pagination: {
      page: 1,
      limit: 50,
      totalDocs: cached?.unifiedTasks?.length || 0,
      totalPages: 1,
    },
    isLoading: false,
    isRefreshing: false,
    mutating: false,
    error: null,
    isLoaded: Boolean(cached?.unifiedTasks?.length || cached?.personalTodos?.length),
  };
};

const initialState: TodoState = getInitialTodoState();

export const todoSlice = createSlice({
  name: 'todo',
  initialState,
  reducers: {
    // -------------------------------------------------------------------------
    // Workspace Sync (Fetch all required tasks for current user role)
    // -------------------------------------------------------------------------
    fetchWorkspaceRequest: (
      state,
      action: PayloadAction<{ isSilent?: boolean; role?: string; userId?: string } | undefined>
    ) => {
      if (action.payload?.isSilent) {
        state.isRefreshing = true;
      } else {
        state.isLoading = true;
      }
      state.error = null;
    },
    fetchWorkspaceSuccess: (
      state,
      action: PayloadAction<{
        summary?: TodoSummary;
        personalTodos: TodoItem[];
        adminTasks: AdminTaskItem[];
        myTasks: TeamTaskItem[];
        teamTasks: TeamTaskItem[];
        unifiedTasks: TeamTaskItem[];
      }>
    ) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.isLoaded = true;
      state.error = null;

      if (action.payload.summary) {
        state.summary = action.payload.summary;
      }
      state.personalTodos = action.payload.personalTodos;
      state.adminTasks = action.payload.adminTasks;
      state.myTasks = action.payload.myTasks;
      state.teamTasks = action.payload.teamTasks;
      state.unifiedTasks = action.payload.unifiedTasks;

      state.pagination.totalDocs = action.payload.unifiedTasks.length;
      state.pagination.totalPages = Math.max(
        1,
        Math.ceil(action.payload.unifiedTasks.length / state.pagination.limit)
      );
    },
    fetchWorkspaceFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = action.payload;
    },

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    fetchSummaryRequest: (state) => {
      state.summaryLoading = true;
    },
    fetchSummarySuccess: (state, action: PayloadAction<TodoSummary>) => {
      state.summary = action.payload;
      state.summaryLoading = false;
    },
    fetchSummaryFailure: (state) => {
      state.summaryLoading = false;
    },

    // -------------------------------------------------------------------------
    // Admin Tasks
    // -------------------------------------------------------------------------
    fetchAdminTasksRequest: (
      state,
      _action: PayloadAction<{ category?: string; status?: string; search?: string } | undefined>
    ) => {
      state.adminTasksLoading = true;
    },
    fetchAdminTasksSuccess: (state, action: PayloadAction<AdminTaskItem[]>) => {
      state.adminTasks = action.payload;
      state.adminTasksLoading = false;
    },
    fetchAdminTasksFailure: (state) => {
      state.adminTasksLoading = false;
    },

    // -------------------------------------------------------------------------
    // Team Tasks
    // -------------------------------------------------------------------------
    fetchTeamTasksRequest: (
      state,
      _action: PayloadAction<
        | {
            employeeId?: string;
            employee?: string;
            clientId?: string;
            clientName?: string;
            status?: string;
            priority?: string;
            category?: string;
            search?: string;
            page?: number;
            limit?: number;
          }
        | undefined
      >
    ) => {
      state.teamTasksLoading = true;
    },
    fetchTeamTasksSuccess: (
      state,
      action: PayloadAction<{ tasks: TeamTaskItem[]; total: number; totalPages: number }>
    ) => {
      state.teamTasks = action.payload.tasks;
      state.teamTasksLoading = false;
      state.teamTasksPagination.totalDocs = action.payload.total;
      state.teamTasksPagination.totalPages = action.payload.totalPages;
    },
    fetchTeamTasksFailure: (state) => {
      state.teamTasksLoading = false;
    },

    // -------------------------------------------------------------------------
    // My Tasks
    // -------------------------------------------------------------------------
    fetchMyTasksRequest: (
      state,
      _action: PayloadAction<{ status?: string; priority?: string; search?: string } | undefined>
    ) => {
      state.myTasksLoading = true;
    },
    fetchMyTasksSuccess: (state, action: PayloadAction<TeamTaskItem[]>) => {
      state.myTasks = action.payload;
      state.myTasksLoading = false;
    },
    fetchMyTasksFailure: (state) => {
      state.myTasksLoading = false;
    },

    // -------------------------------------------------------------------------
    // Calendar Events
    // -------------------------------------------------------------------------
    fetchCalendarEventsRequest: (
      state,
      _action: PayloadAction<{ month?: string; employeeId?: string } | undefined>
    ) => {
      state.calendarLoading = true;
    },
    fetchCalendarEventsSuccess: (state, action: PayloadAction<TodoCalendarEvent[]>) => {
      state.calendarEvents = action.payload;
      state.calendarLoading = false;
    },
    fetchCalendarEventsFailure: (state) => {
      state.calendarLoading = false;
    },

    // -------------------------------------------------------------------------
    // Filter Setters
    // -------------------------------------------------------------------------
    setActiveSection: (state, action: PayloadAction<TuriaNavSection>) => {
      state.filters.activeSection = action.payload;
      state.pagination.page = 1;
    },
    setAdminScope: (state, action: PayloadAction<'my_work' | 'team_work' | 'all_work'>) => {
      state.filters.adminScope = action.payload;
      state.pagination.page = 1;
    },
    setSelectedTag: (state, action: PayloadAction<string | null>) => {
      state.filters.selectedTag = action.payload;
      state.pagination.page = 1;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.filters.searchQuery = action.payload;
      state.pagination.page = 1;
    },
    setSelectedClientId: (state, action: PayloadAction<string>) => {
      state.filters.selectedClientId = action.payload;
      state.pagination.page = 1;
    },
    setSelectedAssigneeId: (state, action: PayloadAction<string>) => {
      state.filters.selectedAssigneeId = action.payload;
      state.pagination.page = 1;
    },
    setSortBy: (
      state,
      action: PayloadAction<'created-desc' | 'created-asc' | 'due-asc' | 'priority-desc'>
    ) => {
      state.filters.sortBy = action.payload;
    },
    setDueDateFilter: (state, action: PayloadAction<string | null>) => {
      state.filters.dueDateFilter = action.payload;
      state.pagination.page = 1;
    },
    setDateFilterTab: (
      state,
      action: PayloadAction<'all' | 'today' | 'tomorrow' | 'upcoming' | 'overdue'>
    ) => {
      state.filters.dateFilterTab = action.payload;
      state.pagination.page = 1;
    },
    setTodoPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setTodoLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    resetTodoFilters: (state) => {
      state.filters.activeSection = 'my-todo';
      state.filters.selectedTag = null;
      state.filters.searchQuery = '';
      state.filters.selectedClientId = 'All';
      state.filters.selectedAssigneeId = 'All';
      state.filters.dueDateFilter = null;
      state.filters.dateFilterTab = 'all';
      state.pagination.page = 1;
    },

    // -------------------------------------------------------------------------
    // Mutations
    // -------------------------------------------------------------------------
    assignTaskRequest: (
      state,
      _action: PayloadAction<{
        taskData: {
          taskName: string;
          description?: string;
          category?: string;
          clientId?: string;
          clientName?: string;
          assigneeId: string;
          assigneeName?: string;
          priority?: string;
          startDate?: string;
          targetDueDate: string;
          checklist?: Array<{ title: string; isMandatory?: boolean }>;
        };
        onSuccess?: (created: any) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    assignTaskSuccess: (state, action: PayloadAction<any>) => {
      state.mutating = false;
      if (action.payload) {
        state.teamTasks.unshift(action.payload);
      }
    },
    assignTaskFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    updateTaskProgressRequest: (
      state,
      _action: PayloadAction<{
        taskId: string;
        data: {
          status?: string;
          progress?: number;
          toggleChecklistId?: string;
          checklistCompleted?: boolean;
          note?: string;
          reassignEmployeeId?: string;
          targetDueDate?: string;
        };
        onSuccess?: () => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    updateTaskProgressSuccess: (state) => {
      state.mutating = false;
    },
    updateTaskProgressFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    toggleAdminTaskRequest: (
      state,
      _action: PayloadAction<{
        dedupKey: string;
        completed: boolean;
        onSuccess?: () => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    toggleAdminTaskSuccess: (state) => {
      state.mutating = false;
    },
    toggleAdminTaskFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Personal To-Do CRUD
    createPersonalTodoRequest: (
      state,
      _action: PayloadAction<{
        title: string;
        dueDate?: string | null;
        extra?: {
          description?: string;
          priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
          category?: string;
          clientName?: string;
          clientId?: string;
        };
        onSuccess?: (todo: TodoItem) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    createPersonalTodoSuccess: (state, action: PayloadAction<TodoItem>) => {
      state.mutating = false;
      state.personalTodos.unshift(action.payload);
    },
    createPersonalTodoFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    updatePersonalTodoRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        updates: {
          title?: string;
          completed?: boolean;
          dueDate?: string | null;
          description?: string;
          priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
          category?: string;
        };
        onSuccess?: (todo: TodoItem) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    updatePersonalTodoSuccess: (state, action: PayloadAction<TodoItem>) => {
      state.mutating = false;
      const idx = state.personalTodos.findIndex((t) => t.id === action.payload.id);
      if (idx >= 0) {
        state.personalTodos[idx] = action.payload;
      }
    },
    updatePersonalTodoFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    deletePersonalTodoRequest: (
      state,
      _action: PayloadAction<{ id: string; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    deletePersonalTodoSuccess: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.personalTodos = state.personalTodos.filter((t) => t.id !== action.payload);
    },
    deletePersonalTodoFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchWorkspaceRequest,
  fetchWorkspaceSuccess,
  fetchWorkspaceFailure,
  fetchSummaryRequest,
  fetchSummarySuccess,
  fetchSummaryFailure,
  fetchAdminTasksRequest,
  fetchAdminTasksSuccess,
  fetchAdminTasksFailure,
  fetchTeamTasksRequest,
  fetchTeamTasksSuccess,
  fetchTeamTasksFailure,
  fetchMyTasksRequest,
  fetchMyTasksSuccess,
  fetchMyTasksFailure,
  fetchCalendarEventsRequest,
  fetchCalendarEventsSuccess,
  fetchCalendarEventsFailure,
  setActiveSection,
  setAdminScope,
  setSelectedTag,
  setSearchQuery,
  setSelectedClientId,
  setSelectedAssigneeId,
  setSortBy,
  setDueDateFilter,
  setDateFilterTab,
  setTodoPage,
  setTodoLimit,
  resetTodoFilters,
  assignTaskRequest,
  assignTaskSuccess,
  assignTaskFailure,
  updateTaskProgressRequest,
  updateTaskProgressSuccess,
  updateTaskProgressFailure,
  toggleAdminTaskRequest,
  toggleAdminTaskSuccess,
  toggleAdminTaskFailure,
  createPersonalTodoRequest,
  createPersonalTodoSuccess,
  createPersonalTodoFailure,
  updatePersonalTodoRequest,
  updatePersonalTodoSuccess,
  updatePersonalTodoFailure,
  deletePersonalTodoRequest,
  deletePersonalTodoSuccess,
  deletePersonalTodoFailure,
} = todoSlice.actions;

export default todoSlice.reducer;
