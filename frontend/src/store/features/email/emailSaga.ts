import { call, put, select, takeLatest } from 'redux-saga/effects';
import { RootState } from '@/store/rootReducer';
import { emailApi } from '@/services/emailApi';
import {
  EMAIL_CACHE_TTL,
  fetchEmailsRequest,
  fetchEmailsSuccess,
  fetchEmailsFailure,
} from './emailSlice';

export function* handleFetchEmails(action: ReturnType<typeof fetchEmailsRequest>): Generator<any, void, any> {
  try {
    const { isLoaded, lastFetched } = yield select((state: RootState) => state.emails);
    const forceRefresh = action.payload?.forceRefresh;

    const now = Date.now();
    const isExpired = !lastFetched || (now - lastFetched > EMAIL_CACHE_TTL);

    // CACHE HIT: Valid data exists, not forced, and within 5-minute window
    if (isLoaded && !isExpired && !forceRefresh) {
      return; // Serve existing Redux state instantly without triggering API
    }

    // CACHE MISS / EXPIRED: Proceed with API fetch
    const response = yield call(emailApi.getEmails, action.payload);
    yield put(fetchEmailsSuccess(response.data));
  } catch (error: any) {
    yield put(fetchEmailsFailure(error.message || 'Failed to fetch emails'));
  }
}

export function* emailSaga() {
  yield takeLatest(fetchEmailsRequest.type, handleFetchEmails);
}

