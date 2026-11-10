import { call, put, takeLatest, takeLeading, all, select } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import {
  AdminTaskItem,
  TeamTaskItem,
  TodoCalendarEvent,
  TodoItem,
  TodoSummary,
  todoApi,
} from '@/services/todoApi';
import {
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
} from './todoSlice';
import { showToast } from '../ui/uiSlice';
import { pageStateCache } from '@/services/pageStateCache';
import { getTodayKolkataYMD } from '@/components/todo/todoDateUtils';
import { RootState } from '../../rootReducer';

// ==============================================================================
// Read Handlers
// ==============================================================================

function* handleFetchWorkspace(
  action: PayloadAction<{ isSilent?: boolean; role?: string; userId?: string } | undefined>
): Generator<any, void, any> {
  try {
    const authState = yield select((state: RootState) => state.auth);
    const role = (action.payload?.role || authState?.user?.role || 'employee').toLowerCase().trim();
    const isAdmin = ['admin', 'owner', 'partner', 'manager'].includes(role);
    const currentUserId = action.payload?.userId || authState?.user?.id || 'me';
    const currentUserName = authState?.user?.name || (isAdmin ? 'Admin' : 'Me');

    // 1. Fetch personal todos concurrently with role-based tasks
    let personalTodos: TodoItem[] = [];
    try {
      personalTodos = yield call(todoApi.getTodos);
    } catch {
      personalTodos = [];
    }

    let summary: TodoSummary = { role: isAdmin ? 'admin' : 'employee' };
    try {
      summary = yield call(todoApi.getSummary);
    } catch {
      // default summary
    }

    let adminTasks: AdminTaskItem[] = [];
    let myTasks: TeamTaskItem[] = [];
    let teamTasks: TeamTaskItem[] = [];

    if (isAdmin) {
      try {
        adminTasks = yield call(todoApi.getAdminTasks);
      } catch {
        adminTasks = [];
      }

      try {
        const teamRes = yield call(todoApi.getTeamTasks, { page: 1, limit: 100 });
        teamTasks = teamRes?.tasks || [];
      } catch {
        teamTasks = [];
      }
    } else {
      try {
        myTasks = yield call(todoApi.getMyTasks);
      } catch {
        myTasks = [];
      }
    }

    // Map personal to-dos to TeamTaskItem format for unified display
    const mappedPersonal: TeamTaskItem[] = personalTodos.map((pt) => ({
      id: `pt_${pt.id}`,
      taskId: pt.id,
      taskName: pt.title,
      description: pt.description || '',
      category: pt.category || 'General',
      clientName: pt.clientName || 'Personal',
      clientId: pt.clientId,
      assigneeId: currentUserId,
      assigneeName: currentUserName,
      assigneeInitials: (currentUserName || 'U').slice(0, 2).toUpperCase(),
      assigneeColor: '#31719B',
      priority: pt.priority || 'Medium',
      status: pt.completed ? 'Completed' : 'Pending',
      startDate: pt.createdAt ? pt.createdAt.slice(0, 10) : '',
      targetDueDate: pt.dueDate || '',
      progress: pt.completed ? 100 : 0,
      checklistTotal: 0,
      checklistCompleted: 0,
      checklist: [],
      isOverdue: !pt.completed && Boolean(pt.dueDate && pt.dueDate < getTodayKolkataYMD()),
      daysLeft: pt.dueDate
        ? Math.ceil((new Date(pt.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 999,
      createdAt: pt.createdAt,
      updatedAt: pt.updatedAt,
      isPersonal: true,
    }));

    const seenIds = new Set<string>();
    const unifiedTasks: TeamTaskItem[] = [];

    for (const item of mappedPersonal) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        unifiedTasks.push(item);
      }
    }

    if (isAdmin) {
      const mappedAdminTasks: TeamTaskItem[] = adminTasks.map((at) => ({
        id: at.dedupKey || at.id,
        taskId: at.sourceId || at.id,
        taskName: at.title,
        description: at.description,
        category: at.category,
        clientName: at.clientName,
        clientId: at.clientId,
        assigneeId: currentUserId || 'admin',
        assigneeName: currentUserName || 'Admin',
        assigneeInitials: (currentUserName || 'AD').slice(0, 2).toUpperCase(),
        assigneeColor: '#6366F1',
        priority: at.priority,
        status: at.completed ? 'Completed' : at.status === 'Expired' ? 'Overdue' : 'Pending',
        startDate: at.createdAt ? at.createdAt.slice(0, 10) : '',
        targetDueDate: at.dueDate,
        progress: at.completed ? 100 : 0,
        checklistTotal: 1,
        checklistCompleted: at.completed ? 1 : 0,
        checklist: [
          {
            id: `chk_${at.id}`,
            title: at.actionLabel || 'Review and resolve obligation',
            completed: at.completed,
            isMandatory: true,
          },
        ],
        isOverdue: !at.completed && (at.daysLeft < 0 || at.status === 'Expired'),
        daysLeft: at.daysLeft,
        createdAt: at.createdAt,
        updatedAt: at.updatedAt,
        actionUrl: at.actionUrl,
        isAdministrative: true,
      }));

      for (const item of mappedAdminTasks) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          unifiedTasks.push(item);
        }
      }

      for (const item of teamTasks) {
        const itemKey = item.taskId || item.id;
        if (!seenIds.has(itemKey) && !seenIds.has(item.id)) {
          seenIds.add(itemKey);
          unifiedTasks.push(item);
        }
      }
    } else {
      for (const item of myTasks) {
        const itemKey = item.taskId || item.id;
        if (!seenIds.has(itemKey) && !seenIds.has(item.id)) {
          seenIds.add(itemKey);
          unifiedTasks.push(item);
        }
      }
    }

    // Cache state for 0ms page revisits
    pageStateCache.set('todo_workspace_data', {
      personalTodos,
      adminTasks,
      myTasks,
      teamTasks,
      unifiedTasks,
      summary,
    });
    pageStateCache.markLoaded('/to-do');

    yield put(
      fetchWorkspaceSuccess({
        summary,
        personalTodos,
        adminTasks,
        myTasks,
        teamTasks,
        unifiedTasks,
      })
    );
  } catch (err: any) {
    yield put(fetchWorkspaceFailure(err?.message || 'Failed to load to-do workspace'));
  }
}

function* handleFetchSummary(): Generator<any, void, any> {
  try {
    const summary: TodoSummary = yield call(todoApi.getSummary);
    yield put(fetchSummarySuccess(summary));
  } catch (err) {
    yield put(fetchSummaryFailure());
  }
}

function* handleFetchAdminTasks(
  action: PayloadAction<{ category?: string; status?: string; search?: string } | undefined>
): Generator<any, void, any> {
  try {
    const tasks: AdminTaskItem[] = yield call(todoApi.getAdminTasks, action.payload);
    yield put(fetchAdminTasksSuccess(tasks));
  } catch (err) {
    yield put(fetchAdminTasksFailure());
  }
}

function* handleFetchTeamTasks(
  action: PayloadAction<
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
): Generator<any, void, any> {
  try {
    const res: { tasks: TeamTaskItem[]; total: number; totalPages: number } = yield call(
      todoApi.getTeamTasks,
      action.payload
    );
    yield put(fetchTeamTasksSuccess(res));
  } catch (err) {
    yield put(fetchTeamTasksFailure());
  }
}

function* handleFetchMyTasks(
  action: PayloadAction<{ status?: string; priority?: string; search?: string } | undefined>
): Generator<any, void, any> {
  try {
    const tasks: TeamTaskItem[] = yield call(todoApi.getMyTasks, action.payload);
    yield put(fetchMyTasksSuccess(tasks));
  } catch (err) {
    yield put(fetchMyTasksFailure());
  }
}

function* handleFetchCalendarEvents(
  action: PayloadAction<{ month?: string; employeeId?: string } | undefined>
): Generator<any, void, any> {
  try {
    const events: TodoCalendarEvent[] = yield call(
      todoApi.getCalendarEvents,
      action.payload?.month,
      action.payload?.employeeId
    );
    yield put(fetchCalendarEventsSuccess(events));
  } catch (err) {
    yield put(fetchCalendarEventsFailure());
  }
}

// ==============================================================================
// Mutation Handlers (takeLeading protects against double submissions)
// ==============================================================================

function* handleAssignTask(
  action: PayloadAction<{
    taskData: any;
    onSuccess?: (created: any) => void;
  }>
): Generator<any, void, any> {
  try {
    const { taskData, onSuccess } = action.payload;
    const res: any = yield call(todoApi.assignTask, taskData);
    yield put(assignTaskSuccess(res));
    yield put(showToast({ type: 'success', message: 'Task assigned successfully.' }));
    if (onSuccess) {
      onSuccess(res);
    }
    yield put(fetchWorkspaceRequest({ isSilent: true }));
  } catch (err: any) {
    const msg = err?.message || 'Failed to assign task';
    yield put(assignTaskFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handleUpdateTaskProgress(
  action: PayloadAction<{
    taskId: string;
    data: any;
    onSuccess?: () => void;
  }>
): Generator<any, void, any> {
  try {
    const { taskId, data, onSuccess } = action.payload;
    yield call(todoApi.updateTaskProgress, taskId, data);
    yield put(updateTaskProgressSuccess());
    if (onSuccess) {
      onSuccess();
    }
    yield put(fetchWorkspaceRequest({ isSilent: true }));
  } catch (err: any) {
    const msg = err?.message || 'Failed to update task progress';
    yield put(updateTaskProgressFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handleToggleAdminTask(
  action: PayloadAction<{
    dedupKey: string;
    completed: boolean;
    onSuccess?: () => void;
  }>
): Generator<any, void, any> {
  try {
    const { dedupKey, completed, onSuccess } = action.payload;
    yield call(todoApi.toggleAdminTask, dedupKey, completed);
    yield put(toggleAdminTaskSuccess());
    if (onSuccess) {
      onSuccess();
    }
    yield put(fetchWorkspaceRequest({ isSilent: true }));
  } catch (err: any) {
    const msg = err?.message || 'Failed to update administrative obligation';
    yield put(toggleAdminTaskFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handleCreatePersonalTodo(
  action: PayloadAction<{
    title: string;
    dueDate?: string | null;
    extra?: any;
    onSuccess?: (todo: TodoItem) => void;
  }>
): Generator<any, void, any> {
  try {
    const { title, dueDate, extra, onSuccess } = action.payload;
    const created: TodoItem = yield call(todoApi.createTodo, title, dueDate, extra);
    yield put(createPersonalTodoSuccess(created));
    yield put(showToast({ type: 'success', message: 'To-Do item created.' }));
    if (onSuccess) {
      onSuccess(created);
    }
    yield put(fetchWorkspaceRequest({ isSilent: true }));
  } catch (err: any) {
    const msg = err?.message || 'Failed to create to-do';
    yield put(createPersonalTodoFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handleUpdatePersonalTodo(
  action: PayloadAction<{
    id: string;
    updates: any;
    onSuccess?: (todo: TodoItem) => void;
  }>
): Generator<any, void, any> {
  try {
    const { id, updates, onSuccess } = action.payload;
    const updated: TodoItem = yield call(todoApi.updateTodo, id, updates);
    yield put(updatePersonalTodoSuccess(updated));
    if (onSuccess) {
      onSuccess(updated);
    }
    yield put(fetchWorkspaceRequest({ isSilent: true }));
  } catch (err: any) {
    const msg = err?.message || 'Failed to update to-do';
    yield put(updatePersonalTodoFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handleDeletePersonalTodo(
  action: PayloadAction<{ id: string; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    const { id, onSuccess } = action.payload;
    yield call(todoApi.deleteTodo, id);
    yield put(deletePersonalTodoSuccess(id));
    yield put(showToast({ type: 'success', message: 'To-Do deleted.' }));
    if (onSuccess) {
      onSuccess();
    }
    yield put(fetchWorkspaceRequest({ isSilent: true }));
  } catch (err: any) {
    const msg = err?.message || 'Failed to delete to-do';
    yield put(deletePersonalTodoFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

// ==============================================================================
// Root Feature Saga Watcher
// ==============================================================================

export function* todoSaga() {
  yield all([
    // Reads
    takeLatest(fetchWorkspaceRequest.type, handleFetchWorkspace),
    takeLatest(fetchSummaryRequest.type, handleFetchSummary),
    takeLatest(fetchAdminTasksRequest.type, handleFetchAdminTasks),
    takeLatest(fetchTeamTasksRequest.type, handleFetchTeamTasks),
    takeLatest(fetchMyTasksRequest.type, handleFetchMyTasks),
    takeLatest(fetchCalendarEventsRequest.type, handleFetchCalendarEvents),

    // Mutations
    takeLeading(assignTaskRequest.type, handleAssignTask),
    takeLeading(updateTaskProgressRequest.type, handleUpdateTaskProgress),
    takeLeading(toggleAdminTaskRequest.type, handleToggleAdminTask),
    takeLeading(createPersonalTodoRequest.type, handleCreatePersonalTodo),
    takeLeading(updatePersonalTodoRequest.type, handleUpdatePersonalTodo),
    takeLeading(deletePersonalTodoRequest.type, handleDeletePersonalTodo),
  ]);
}
