import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { noticeApi, NoticeResponse } from '@/services/noticeApi';
import { ApiResponse } from '@/services/apiClient';
import type { GetNoticesParams } from '@/types/notices';
import {
  fetchNoticesRequest,
  fetchNoticesSuccess,
  fetchNoticesFailure,
} from './noticeSlice';
import { showToast } from '../ui/uiSlice';

function* handleFetchNotices(
  action: PayloadAction<GetNoticesParams | undefined>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<NoticeResponse> = yield call(
      noticeApi.getNotices,
      action.payload || {}
    );
    const data = response.data;
    yield put(
      fetchNoticesSuccess({
        notices: data?.data || [],
        summary: data?.summary,
        pagination: data?.pagination
          ? {
              page: data.pagination.page,
              limit: data.pagination.pageSize,
              totalDocs: data.pagination.total,
              totalPages: data.pagination.totalPages,
            }
          : undefined,
      })
    );
  } catch (error: any) {
    const errorMsg = error.message || 'Failed to fetch notices';
    yield put(fetchNoticesFailure(errorMsg));
    yield put(showToast({ type: 'error', message: errorMsg }));
  }
}

export function* noticeSaga() {
  yield takeLatest(fetchNoticesRequest.type, handleFetchNotices);
}

