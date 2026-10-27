import { call, put, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { leadApi, LeadQueryParams, LeadStats, ConvertLeadPayload } from '@/services/leadApi';
import { ApiResponse } from '@/services/apiClient';
import { Lead } from '@/data/crmData';
import {
  fetchLeadsRequest,
  fetchLeadsSuccess,
  fetchLeadsFailure,
  fetchLeadByIdRequest,
  fetchLeadByIdSuccess,
  fetchLeadByIdFailure,
  fetchLeadStatsRequest,
  fetchLeadStatsSuccess,
  createLeadRequest,
  createLeadSuccess,
  createLeadFailure,
  updateLeadRequest,
  updateLeadSuccess,
  updateLeadFailure,
  deleteLeadRequest,
  deleteLeadSuccess,
  deleteLeadFailure,
  bulkDeleteLeadsRequest,
  bulkDeleteLeadsSuccess,
  bulkDeleteLeadsFailure,
  convertLeadRequest,
  convertLeadSuccess,
  convertLeadFailure,
} from './leadSlice';
import { showToast } from '../ui/uiSlice';

function* handleFetchLeads(action: PayloadAction<LeadQueryParams | undefined>): Generator<any, void, any> {
  try {
    const response: ApiResponse<Lead[]> = yield call(leadApi.getLeads, action.payload || {});
    yield put(
      fetchLeadsSuccess({
        leads: response.data || [],
        pagination: response.pagination,
      })
    );
  } catch (error: any) {
    yield put(fetchLeadsFailure(error.message || 'Failed to fetch leads'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to fetch leads' }));
  }
}

function* handleFetchLeadById(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const response: ApiResponse<Lead> = yield call(leadApi.getLeadById, action.payload);
    if (response.data) {
      yield put(fetchLeadByIdSuccess(response.data));
    } else {
      yield put(fetchLeadByIdFailure('Lead data not found'));
    }
  } catch (error: any) {
    yield put(fetchLeadByIdFailure(error.message || 'Failed to fetch lead'));
  }
}

function* handleFetchLeadStats(): Generator<any, void, any> {
  try {
    const response: ApiResponse<LeadStats> = yield call(leadApi.getLeadStats);
    if (response.data) {
      yield put(fetchLeadStatsSuccess(response.data));
    }
  } catch (error: any) {
    console.warn('Failed to fetch lead stats:', error);
  }
}

function* handleCreateLead(
  action: PayloadAction<{ data: Partial<Lead>; onSuccess?: (lead: Lead) => void }>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<Lead> = yield call(leadApi.createLead, action.payload.data);
    if (response.data) {
      yield put(createLeadSuccess(response.data));
      yield put(showToast({ type: 'success', message: 'Lead created successfully' }));
      if (action.payload.onSuccess) {
        action.payload.onSuccess(response.data);
      }
    }
  } catch (error: any) {
    yield put(createLeadFailure(error.message || 'Failed to create lead'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to create lead' }));
  }
}

function* handleUpdateLead(
  action: PayloadAction<{
    id: string;
    data: Partial<Lead>;
    onSuccess?: (lead: Lead) => void;
  }>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<Lead> = yield call(
      leadApi.updateLead,
      action.payload.id,
      action.payload.data
    );
    if (response.data) {
      yield put(updateLeadSuccess(response.data));
      yield put(showToast({ type: 'success', message: 'Lead updated successfully' }));
      if (action.payload.onSuccess) {
        action.payload.onSuccess(response.data);
      }
    }
  } catch (error: any) {
    yield put(updateLeadFailure(error.message || 'Failed to update lead'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to update lead' }));
  }
}

function* handleDeleteLead(
  action: PayloadAction<{ id: string; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield call(leadApi.softDeleteLead, action.payload.id);
    yield put(deleteLeadSuccess(action.payload.id));
    yield put(showToast({ type: 'success', message: 'Lead deleted successfully' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(deleteLeadFailure(error.message || 'Failed to delete lead'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to delete lead' }));
  }
}

function* handleBulkDeleteLeads(
  action: PayloadAction<{ ids: string[]; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield all(action.payload.ids.map((id) => call(leadApi.softDeleteLead, id)));
    yield put(bulkDeleteLeadsSuccess(action.payload.ids));
    yield put(showToast({ type: 'success', message: `${action.payload.ids.length} leads deleted` }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(bulkDeleteLeadsFailure(error.message || 'Failed to delete selected leads'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to delete selected leads' }));
  }
}

function* handleConvertLead(
  action: PayloadAction<{
    id: string;
    payload: ConvertLeadPayload;
    onSuccess?: (res: { lead: Lead; client: any }) => void;
  }>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<{ lead: Lead; client: any }> = yield call(
      leadApi.convertLead,
      action.payload.id,
      action.payload.payload
    );
    if (response.data) {
      yield put(convertLeadSuccess(response.data.lead));
      yield put(showToast({ type: 'success', message: 'Lead converted to client successfully' }));
      if (action.payload.onSuccess) {
        action.payload.onSuccess(response.data);
      }
    }
  } catch (error: any) {
    yield put(convertLeadFailure(error.message || 'Failed to convert lead'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to convert lead' }));
  }
}

export function* leadSaga() {
  yield takeLatest(fetchLeadsRequest.type, handleFetchLeads);
  yield takeLatest(fetchLeadByIdRequest.type, handleFetchLeadById);
  yield takeLatest(fetchLeadStatsRequest.type, handleFetchLeadStats);
  yield takeLatest(createLeadRequest.type, handleCreateLead);
  yield takeLatest(updateLeadRequest.type, handleUpdateLead);
  yield takeLatest(deleteLeadRequest.type, handleDeleteLead);
  yield takeLatest(bulkDeleteLeadsRequest.type, handleBulkDeleteLeads);
  yield takeLatest(convertLeadRequest.type, handleConvertLead);
}
