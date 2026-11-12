import { call, put, select, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { complianceApi } from '@/services/complianceApi';
import { ApiResponse } from '@/services/apiClient';
import type {
  ComplianceGridResponse,
  GetComplianceGridParams,
  GstSyncRequest,
  GstSyncResponse,
} from '@/types/compliance';
import {
  fetchComplianceRequest,
  fetchComplianceSuccess,
  fetchComplianceFailure,
  syncGstRequest,
  syncGstSuccess,
  syncGstFailure,
} from './complianceSlice';
import { showToast } from '../ui/uiSlice';
import { pageStateCache } from '@/services/pageStateCache';

function* handleFetchCompliance(
  action: PayloadAction<GetComplianceGridParams | undefined>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<ComplianceGridResponse> = yield call(
      complianceApi.getGrid,
      action.payload || {}
    );
    const data = response.data;
    const payload = {
      rows: data?.rows || [],
      columns: data?.columns || [],
      entries: data?.entries,
      clients: data?.clients,
    };
    yield put(fetchComplianceSuccess(payload));
    pageStateCache.set('compliance_grid_data', payload);
    pageStateCache.markLoaded('/compliance');
  } catch (error: any) {
    const errorMsg = error.message || 'Failed to fetch compliance grid';
    yield put(fetchComplianceFailure(errorMsg));
    yield put(showToast({ type: 'error', message: errorMsg }));
  }
}

function* handleSyncGst(
  action: PayloadAction<GstSyncRequest | undefined>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<GstSyncResponse> = yield call(
      complianceApi.syncGst,
      action.payload || {}
    );
    const result = response.data || {
      syncedClients: 0,
      updatedEntries: 0,
      failedClients: 0,
      errors: [],
    };
    yield put(syncGstSuccess(result));
    yield put(
      showToast({
        type: result.failedClients > 0 && result.syncedClients === 0 ? 'error' : 'success',
        message: `Synced ${result.syncedClients} client(s), updated ${result.updatedEntries} GST filing entries.`,
      })
    );
    const currentParams: GetComplianceGridParams = yield select(
      (state: any) => state.compliance.currentParams
    );
    yield put(fetchComplianceRequest(currentParams));
  } catch (error: any) {
    const errorMsg = error.message || 'Failed to sync GST portal data';
    yield put(syncGstFailure(errorMsg));
    yield put(showToast({ type: 'error', message: errorMsg }));
  }
}

export function* complianceSaga() {
  yield takeLatest(fetchComplianceRequest.type, handleFetchCompliance);
  yield takeLatest(syncGstRequest.type, handleSyncGst);
}

