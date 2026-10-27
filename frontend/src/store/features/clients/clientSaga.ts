import { call, put, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { clientApi, ClientQueryParams, ClientStats } from '@/services/clientApi';
import { ApiResponse } from '@/services/apiClient';
import { Client } from '@/data/crmData';
import {
  fetchClientsRequest,
  fetchClientsSuccess,
  fetchClientsFailure,
  fetchClientByIdRequest,
  fetchClientByIdSuccess,
  fetchClientByIdFailure,
  fetchClientStatsRequest,
  fetchClientStatsSuccess,
  createClientRequest,
  createClientSuccess,
  createClientFailure,
  updateClientRequest,
  updateClientSuccess,
  updateClientFailure,
  deleteClientRequest,
  deleteClientSuccess,
  deleteClientFailure,
  bulkDeleteClientsRequest,
  bulkDeleteClientsSuccess,
  bulkDeleteClientsFailure,
} from './clientSlice';
import { showToast } from '../ui/uiSlice';

function* handleFetchClients(action: PayloadAction<ClientQueryParams | undefined>): Generator<any, void, any> {
  try {
    const response: ApiResponse<Client[]> = yield call(clientApi.getClients, action.payload || {});
    yield put(
      fetchClientsSuccess({
        clients: response.data || [],
        pagination: response.pagination,
      })
    );
  } catch (error: any) {
    yield put(fetchClientsFailure(error.message || 'Failed to fetch clients'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to fetch clients' }));
  }
}

function* handleFetchClientById(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const response: ApiResponse<Client> = yield call(clientApi.getClientById, action.payload);
    if (response.data) {
      yield put(fetchClientByIdSuccess(response.data));
    } else {
      yield put(fetchClientByIdFailure('Client data not found'));
    }
  } catch (error: any) {
    yield put(fetchClientByIdFailure(error.message || 'Failed to fetch client'));
  }
}

function* handleFetchClientStats(): Generator<any, void, any> {
  try {
    const response: ApiResponse<ClientStats> = yield call(clientApi.getClientStats);
    if (response.data) {
      yield put(fetchClientStatsSuccess(response.data));
    }
  } catch (error: any) {
    console.warn('Failed to fetch client stats:', error);
  }
}

function* handleCreateClient(
  action: PayloadAction<{ data: Partial<Client>; onSuccess?: (client: Client) => void }>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<Client> = yield call(clientApi.createClient, action.payload.data);
    if (response.data) {
      yield put(createClientSuccess(response.data));
      yield put(showToast({ type: 'success', message: 'Client created successfully' }));
      if (action.payload.onSuccess) {
        action.payload.onSuccess(response.data);
      }
    }
  } catch (error: any) {
    yield put(createClientFailure(error.message || 'Failed to create client'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to create client' }));
  }
}

function* handleUpdateClient(
  action: PayloadAction<{
    id: string;
    data: Partial<Client>;
    onSuccess?: (client: Client) => void;
  }>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<Client> = yield call(
      clientApi.updateClient,
      action.payload.id,
      action.payload.data
    );
    if (response.data) {
      yield put(updateClientSuccess(response.data));
      yield put(showToast({ type: 'success', message: 'Client updated successfully' }));
      if (action.payload.onSuccess) {
        action.payload.onSuccess(response.data);
      }
    }
  } catch (error: any) {
    yield put(updateClientFailure(error.message || 'Failed to update client'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to update client' }));
  }
}

function* handleDeleteClient(
  action: PayloadAction<{ id: string; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield call(clientApi.softDeleteClient, action.payload.id);
    yield put(deleteClientSuccess(action.payload.id));
    yield put(showToast({ type: 'success', message: 'Client deleted successfully' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(deleteClientFailure(error.message || 'Failed to delete client'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to delete client' }));
  }
}

function* handleBulkDeleteClients(
  action: PayloadAction<{ ids: string[]; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield all(action.payload.ids.map((id) => call(clientApi.softDeleteClient, id)));
    yield put(bulkDeleteClientsSuccess(action.payload.ids));
    yield put(showToast({ type: 'success', message: `${action.payload.ids.length} clients deleted` }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(bulkDeleteClientsFailure(error.message || 'Failed to delete selected clients'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to delete selected clients' }));
  }
}

export function* clientSaga() {
  yield takeLatest(fetchClientsRequest.type, handleFetchClients);
  yield takeLatest(fetchClientByIdRequest.type, handleFetchClientById);
  yield takeLatest(fetchClientStatsRequest.type, handleFetchClientStats);
  yield takeLatest(createClientRequest.type, handleCreateClient);
  yield takeLatest(updateClientRequest.type, handleUpdateClient);
  yield takeLatest(deleteClientRequest.type, handleDeleteClient);
  yield takeLatest(bulkDeleteClientsRequest.type, handleBulkDeleteClients);
}
