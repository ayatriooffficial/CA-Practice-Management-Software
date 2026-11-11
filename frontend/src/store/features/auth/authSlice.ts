import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, RegisterOrgPayload } from '@/components/auth/authTypes';
import { RolePermissionsMap } from '@/store/permissions/permissionsMatrix';
import { normalizeRole, isRoleAdmin } from '@/store/permissions/roleSelectors';
import { getPermissionsForRole } from '@/store/permissions/permissionsMatrix';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  role: string;
  isAdmin: boolean;
  permissions: RolePermissionsMap | string[] | any | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  role: 'employee',
  isAdmin: false,
  permissions: null,
  loading: false,
  error: null,
  lastFetched: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest: (
      state,
      _action: PayloadAction<{ email: string; password: string }>
    ) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User }>) => {
      const u = action.payload.user;
      const role = normalizeRole(u.role);
      const isAdmin = isRoleAdmin(role);
      const permissions = isAdmin
        ? getPermissionsForRole('admin')
        : (Array.isArray(u.permissions) && u.permissions.length > 0)
        ? u.permissions
        : (u.permissions && typeof u.permissions === 'object' && Object.keys(u.permissions).length > 0)
        ? u.permissions
        : getPermissionsForRole(role);

      state.user = {
        ...u,
        role,
        permissions,
      };
      state.isAuthenticated = true;
      state.role = role;
      state.isAdmin = isAdmin;
      state.permissions = permissions;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },

    signupRequest: (state, _action: PayloadAction<RegisterOrgPayload>) => {
      state.loading = true;
      state.error = null;
    },
    signupSuccess: (state, action: PayloadAction<{ user: User }>) => {
      const u = action.payload.user;
      const role = normalizeRole(u.role || 'admin');
      const isAdmin = isRoleAdmin(role);
      const permissions = getPermissionsForRole('admin');

      state.user = {
        ...u,
        role,
        permissions,
      };
      state.isAuthenticated = true;
      state.role = role;
      state.isAdmin = isAdmin;
      state.permissions = permissions;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    signupFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    restoreSession: (state, action: PayloadAction<{ user: User }>) => {
      const u = action.payload.user;
      const role = normalizeRole(u.role);
      const isAdmin = isRoleAdmin(role);
      const permissions = isAdmin
        ? getPermissionsForRole('admin')
        : (Array.isArray(u.permissions) && u.permissions.length > 0)
        ? u.permissions
        : (u.permissions && typeof u.permissions === 'object' && Object.keys(u.permissions).length > 0)
        ? u.permissions
        : getPermissionsForRole(role);

      state.user = {
        ...u,
        role,
        permissions,
      };
      state.isAuthenticated = true;
      state.role = role;
      state.isAdmin = isAdmin;
      state.permissions = permissions;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },

    logoutRequest: (state) => {
      state.loading = true;
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.role = 'employee';
      state.isAdmin = false;
      state.permissions = null;
      state.loading = false;
      state.error = null;
      state.lastFetched = null;
    },

    clearAuthError: (state) => {
      state.error = null;
    },
  },
});

export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  signupRequest,
  signupSuccess,
  signupFailure,
  restoreSession,
  logoutRequest,
  logoutSuccess,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;

