import { call, put, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { SagaIterator } from 'redux-saga';
import { fetchWorkDoneRequest, fetchWorkDoneSuccess, fetchWorkDoneFailure } from './workdoneSlice';
import { getWorkDone } from '@/services/workdoneApi';
import { showToast } from '../ui';

function fetchWorkDoneApi(params?: any) {
    return getWorkDone(params);
}


function* handleFetchWorkDone(action: PayloadAction<Record<string, any> | undefined>): SagaIterator {
    try {
        const clients = yield call(fetchWorkDoneApi, action.payload);
        yield put(fetchWorkDoneSuccess({ clients }));
    } catch (error: any) {
        yield put(fetchWorkDoneFailure(error.message || 'Failed to fetch workdone clients'));
        yield put(showToast({ type: 'error', message: error.message || 'Failed to fetch workdone clients' }));
    }
}

export function* workdoneSaga() {
    yield takeLatest(fetchWorkDoneRequest.type, handleFetchWorkDone);
}
