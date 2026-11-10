import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { complianceApi } from '@/services/complianceApi';
import { ApiResponse } from '@/services/apiClient';
import type {
  ComplianceGridResponse,
  GetComplianceGridParams,
} from '@/types/compliance';
import {
  fetchComplianceRequest,
  fetchComplianceSuccess,
  fetchComplianceFailure,
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

export function* complianceSaga() {
  yield takeLatest(fetchComplianceRequest.type, handleFetchCompliance);
}

