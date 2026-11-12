import { call, put, select, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { clientApi, ClientQueryParams, ClientStats } from '@/services/clientApi';
import { ApiResponse } from '@/services/apiClient';
import { Client } from '@/data/crmData';
import { RootState } from '../../rootReducer';
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
import { pageStateCache } from '@/services/pageStateCache';
import { removeWorkDoneClient } from '../workdone/workdoneSlice';
import { removeTasksForClient } from '../tasks/taskSlice';
import { removeInvoicesAndReceiptsForClient } from '../invoices/invoiceSlice';

function* handleFetchClients(action: PayloadAction<ClientQueryParams | undefined>): Generator<any, void, any> {
  try {
    const isLoaded: boolean = yield select((state: RootState) => state.clients.isLoaded);
    const hasParams = Boolean(action.payload && Object.keys(action.payload).length > 0);
    if (isLoaded && !hasParams) {
      return;
    }

    const response: ApiResponse<Client[]> = yield call(clientApi.getClients, action.payload || {});
    const clients = response.data || [];
    yield put(
      fetchClientsSuccess({
        clients,
        pagination: response.pagination,
      })
    );
    if (!action.payload || Object.keys(action.payload).length === 0) {
      pageStateCache.set('clients_list_data', {
        clients,
        pagination: response.pagination,
      });
      pageStateCache.markLoaded('/client');
    }
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
    const existingStats = yield select((state: RootState) => state.clients.stats);
    if (existingStats && Object.keys(existingStats).length > 0) {
      return;
    }
    const response: ApiResponse<ClientStats> = yield call(clientApi.getClientStats);
    if (response.data) {
      yield put(fetchClientStatsSuccess(response.data));
    }
  } catch (error: any) {
    console.warn('Failed to fetch client stats:', error);
  }
}

function* handleCreateClient(
  action: PayloadAction<{
    data: Partial<Client>;
    onSuccess?: (client: Client) => void;
    onError?: (error: any) => void;
  }>
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
    if (action.payload.onError) {
      action.payload.onError(error);
    }
  }
}

function* handleUpdateClient(
  action: PayloadAction<{
    id: string;
    data: Partial<Client>;
    onSuccess?: (client: Client) => void;
    onError?: (error: any) => void;
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
    if (action.payload.onError) {
      action.payload.onError(error);
    }
  }
}

function* handleDeleteClient(
  action: PayloadAction<{ id: string; onSuccess?: () => void; onError?: (error: any) => void }>
): Generator<any, void, any> {
  try {
    yield call(clientApi.softDeleteClient, action.payload.id);
    yield put(deleteClientSuccess(action.payload.id));
    yield put(removeWorkDoneClient(action.payload.id));
    yield put(removeTasksForClient({ clientId: action.payload.id }));
    yield put(removeInvoicesAndReceiptsForClient({ clientId: action.payload.id }));
    pageStateCache.delete('clients_list_data');
    pageStateCache.delete('tasks_list_data');
    pageStateCache.delete('invoices_list_data');
    pageStateCache.delete('workdone_list_data');
    yield put(showToast({ type: 'success', message: 'Client deleted successfully' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(deleteClientFailure(error.message || 'Failed to delete client'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to delete client' }));
    if (action.payload.onError) {
      action.payload.onError(error);
    }
  }
}

function* handleBulkDeleteClients(
  action: PayloadAction<{ ids: string[]; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield all(action.payload.ids.map((id) => call(clientApi.softDeleteClient, id)));
    yield put(bulkDeleteClientsSuccess(action.payload.ids));
    for (const id of action.payload.ids) {
      yield put(removeWorkDoneClient(id));
      yield put(removeTasksForClient({ clientId: id }));
      yield put(removeInvoicesAndReceiptsForClient({ clientId: id }));
    }
    pageStateCache.delete('clients_list_data');
    pageStateCache.delete('tasks_list_data');
    pageStateCache.delete('invoices_list_data');
    pageStateCache.delete('workdone_list_data');
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
