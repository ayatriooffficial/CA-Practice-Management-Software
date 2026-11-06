import { call, put, takeLeading, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { authService } from '@/components/auth/authService';
import { RegisterOrgPayload, User } from '@/components/auth/authTypes';
import {
  loginRequest,
  loginSuccess,
  loginFailure,
  signupRequest,
  signupSuccess,
  signupFailure,
  logoutRequest,
  logoutSuccess,
} from './authSlice';

function* handleLogin(
  action: PayloadAction<{ email: string; password: string }>
): Generator<any, void, any> {
  try {
    const { email, password } = action.payload;
    const res = yield call(authService.loginWithPassword, email, password);

    if (res.success && res.user) {
      yield put(loginSuccess({ user: res.user }));
    } else {
      yield put(loginFailure(res.message || 'Invalid email or password.'));
    }
  } catch (error: any) {
    yield put(
      loginFailure(
        error?.message || 'Unable to sign in. Please check your credentials.'
      )
    );
  }
}

function* handleSignup(
  action: PayloadAction<RegisterOrgPayload>
): Generator<any, void, any> {
  try {
    const res = yield call(authService.registerOrganization, action.payload);

    if (res.success && res.user) {
      yield put(signupSuccess({ user: res.user }));
    } else {
      yield put(signupFailure(res.message || 'Registration failed.'));
    }
  } catch (error: any) {
    yield put(
      signupFailure(
        error?.message || 'Registration failed. Please check your inputs.'
      )
    );
  }
}

function* handleLogout(): Generator<any, void, any> {
  try {
    yield call(authService.logout);
  } catch {
    // Continue cleanup even if offline
  } finally {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        localStorage.removeItem('turia_current_user');
        localStorage.setItem('turia_user_logged_out', 'true');
        document.cookie = 'token=; Max-Age=0; path=/;';
        document.cookie = 'turia_access_token=; Max-Age=0; path=/;';
      } catch {}
    }
    yield put(logoutSuccess());
  }
}

export function* authSaga() {
  yield all([
    takeLeading(loginRequest.type, handleLogin),
    takeLeading(signupRequest.type, handleSignup),
    takeLatest(logoutRequest.type, handleLogout),
  ]);
}

