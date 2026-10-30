import { call, put, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { SagaIterator } from 'redux-saga';
import { fetchWorkDoneRequest, fetchWorkDoneSuccess, fetchWorkDoneFailure } from './workdoneSlice';
import { showToast } from '../ui/uiSlice';

// Simple API wrapper
const API_URL = 'http://localhost:5000/api/v1/workdone/client-work-done';

function fetchWorkDoneApi(params?: any) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(API_URL + query, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    }).then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch workdone clients. Status: ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error('API returned unsuccessful response');
        return data.data;
    });
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
