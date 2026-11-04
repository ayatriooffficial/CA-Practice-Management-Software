import { RootState } from '../../rootReducer';
import { createSelector } from '@reduxjs/toolkit';

const selectSelf = (state: RootState) => (state as any).auth;

export const selectAuthUser = createSelector(
  [selectSelf],
  (auth) => auth?.user ?? null
);

export const selectIsAuthenticated = createSelector(
  [selectSelf],
  (auth) => Boolean(auth?.isAuthenticated && auth?.user)
);

export const selectAuthRole = createSelector(
  [selectSelf],
  (auth) => auth?.role ?? 'employee'
);

export const selectAuthIsAdmin = createSelector(
  [selectSelf],
  (auth) => Boolean(auth?.isAdmin)
);

export const selectAuthPermissions = createSelector(
  [selectSelf],
  (auth) => auth?.permissions ?? null
);

export const selectAuthLoading = createSelector(
  [selectSelf],
  (auth) => Boolean(auth?.loading)
);

export const selectAuthError = createSelector(
  [selectSelf],
  (auth) => auth?.error ?? null
);

