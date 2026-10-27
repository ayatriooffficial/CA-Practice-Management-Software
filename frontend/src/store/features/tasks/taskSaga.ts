import { call, put, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { taskApi, TaskQueryParams } from '@/services/taskApi';
import { ApiResponse } from '@/services/apiClient';
import { TaskItem, TaskStats } from '@/data/taskData';
import {
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
} from './taskSlice';
import { showToast } from '../ui/uiSlice';

function* handleFetchTasks(action: PayloadAction<TaskQueryParams | undefined>): Generator<any, void, any> {
  try {
    const response: ApiResponse<TaskItem[]> = yield call(taskApi.getTasks, action.payload || {});
    yield put(
      fetchTasksSuccess({
        tasks: response.data || [],
        pagination: response.pagination,
      })
    );
  } catch (error: any) {
    yield put(fetchTasksFailure(error.message || 'Failed to fetch tasks'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to fetch tasks' }));
  }
}

function* handleFetchTaskById(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const response: ApiResponse<TaskItem> = yield call(taskApi.getTaskById, action.payload);
    if (response.data) {
      yield put(fetchTaskByIdSuccess(response.data));
    } else {
      yield put(fetchTaskByIdFailure('Task data not found'));
    }
  } catch (error: any) {
    yield put(fetchTaskByIdFailure(error.message || 'Failed to fetch task'));
  }
}

function* handleFetchTaskStats(action: PayloadAction<string | undefined>): Generator<any, void, any> {
  try {
    const response: ApiResponse<TaskStats> = yield call(taskApi.getTaskStats, action.payload);
    if (response.data) {
      yield put(fetchTaskStatsSuccess(response.data));
    }
  } catch (error: any) {
    console.warn('Failed to fetch task stats:', error);
  }
}

function* handleCreateTask(
  action: PayloadAction<{ data: Partial<TaskItem>; onSuccess?: (task: TaskItem) => void }>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<TaskItem> = yield call(taskApi.createTask, action.payload.data);
    if (response.data) {
      yield put(createTaskSuccess(response.data));
      yield put(showToast({ type: 'success', message: 'Task created successfully' }));
      if (action.payload.onSuccess) {
        action.payload.onSuccess(response.data);
      }
    }
  } catch (error: any) {
    yield put(createTaskFailure(error.message || 'Failed to create task'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to create task' }));
  }
}

function* handleUpdateTask(
  action: PayloadAction<{
    id: string;
    data: Partial<TaskItem>;
    onSuccess?: (task: TaskItem) => void;
  }>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<TaskItem> = yield call(
      taskApi.updateTask,
      action.payload.id,
      action.payload.data
    );
    if (response.data) {
      yield put(updateTaskSuccess(response.data));
      yield put(showToast({ type: 'success', message: 'Task updated successfully' }));
      if (action.payload.onSuccess) {
        action.payload.onSuccess(response.data);
      }
    }
  } catch (error: any) {
    yield put(updateTaskFailure(error.message || 'Failed to update task'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to update task' }));
  }
}

function* handleDeleteTask(
  action: PayloadAction<{ id: string; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield call(taskApi.deleteTask, action.payload.id);
    yield put(deleteTaskSuccess(action.payload.id));
    yield put(showToast({ type: 'success', message: 'Task deleted successfully' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(deleteTaskFailure(error.message || 'Failed to delete task'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to delete task' }));
  }
}

function* handleBulkDeleteTasks(
  action: PayloadAction<{ ids: string[]; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield all(action.payload.ids.map((id) => call(taskApi.deleteTask, id)));
    yield put(bulkDeleteTasksSuccess(action.payload.ids));
    yield put(showToast({ type: 'success', message: `${action.payload.ids.length} tasks deleted` }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(bulkDeleteTasksFailure(error.message || 'Failed to delete selected tasks'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to delete selected tasks' }));
  }
}

export function* taskSaga() {
  yield takeLatest(fetchTasksRequest.type, handleFetchTasks);
  yield takeLatest(fetchTaskByIdRequest.type, handleFetchTaskById);
  yield takeLatest(fetchTaskStatsRequest.type, handleFetchTaskStats);
  yield takeLatest(createTaskRequest.type, handleCreateTask);
  yield takeLatest(updateTaskRequest.type, handleUpdateTask);
  yield takeLatest(deleteTaskRequest.type, handleDeleteTask);
  yield takeLatest(bulkDeleteTasksRequest.type, handleBulkDeleteTasks);
}
