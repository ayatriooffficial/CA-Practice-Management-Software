import { RootState } from '../rootReducer';
import {
  PermissionAction,
  RolePermissionsMap,
  normalizeModuleKey,
} from './permissionsMatrix';

/**
 * Normalizes any role string to standard lowercase.
 */
export function normalizeRole(role?: string | null): string {
  if (!role || typeof role !== 'string') return 'employee';
  return role.trim().toLowerCase();
}

/**
 * Universally checks whether a role is administrative.
 * Admin, Partner, Owner, Superadmin always qualify.
 */
export function isRoleAdmin(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'partner' || r === 'owner' || r === 'superadmin';
}

/**
 * Core permission evaluator.
 * Rule: ANY user with an admin role ALWAYS gets true.
 * Access depends strictly on the role, never on email, domain, or hardcoded IDs.
 */
export function canAccess(
  role?: string | null,
  permissions?: RolePermissionsMap | null,
  moduleKey?: string,
  action: PermissionAction = 'view'
): boolean {
  if (isRoleAdmin(role)) {
    return true;
  }

  if (!moduleKey) return false;
  if (!permissions) return false;

  const normKey = normalizeModuleKey(moduleKey);

  // Employees have guaranteed default access to communication sections (WhatsApp & Email)
  if (normKey === 'whatsapp_business' || normKey === 'email') {
    if (action === 'view' || action === 'addEdit') {
      if (!permissions || !permissions[normKey]) return true;
      return permissions[normKey].view !== false;
    }
  }

  let mod = permissions[normKey] || permissions[moduleKey];

  if (!mod) return false;

  if (action === 'view') {
    return Boolean(mod.view || mod.addEdit || mod.delete || mod.import || mod.export);
  }

  return Boolean(mod[action]);
}

/**
 * Redux Selectors
 */
export const selectCurrentUser = (state: RootState) => {
  return (state as any).auth?.user ?? null;
};

export const selectRole = (state: RootState): string => {
  const user = selectCurrentUser(state);
  return normalizeRole(user?.role);
};

export const selectIsAdmin = (state: RootState): boolean => {
  return isRoleAdmin(selectRole(state));
};

export const selectUserPermissions = (state: RootState): RolePermissionsMap | null => {
  const user = selectCurrentUser(state);
  return user?.permissions ?? null;
};

export const selectCan = (
  state: RootState,
  moduleKey: string,
  action: PermissionAction = 'view'
): boolean => {
  const role = selectRole(state);
  const permissions = selectUserPermissions(state);
  return canAccess(role, permissions, moduleKey, action);
};

