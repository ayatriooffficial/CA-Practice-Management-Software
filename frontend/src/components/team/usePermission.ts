import React, { useMemo, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { teamStore } from './teamStore';
import { getPresetPermissions } from './permissionsConfig';
import { RolePermissionsMap, TeamRole } from './types';
import {
  isRoleAdmin,
  canAccess,
  normalizeRole,
} from '@/store/permissions/roleSelectors';
import {
  PermissionAction,
  normalizeModuleKey,
} from '@/store/permissions/permissionsMatrix';

export type { PermissionAction };

export function usePermission() {
  const { currentUser } = useAuth();
  const user = currentUser;

  const role = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const isAdmin = useMemo(() => isRoleAdmin(role), [role]);

  const permissions = useMemo((): RolePermissionsMap | null => {
    if (!user) return null;

    // Full Admin always has complete permissions
    if (isAdmin) {
      return getPresetPermissions('Admin');
    }

    // 1. If user object has permissions directly from server
    if (user.permissions && Object.keys(user.permissions).length > 0) {
      return user.permissions as RolePermissionsMap;
    }

    // 2. Check teamStore by email / mobile for employees
    const employees = teamStore.getEmployees();
    const matched = employees.find(
      (e) =>
        (user.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
        (user.mobile && e.mobile.replace(/\D/g, '').slice(-10) === user.mobile.replace(/\D/g, '').slice(-10))
    );

    if (matched && matched.permissions) {
      return matched.permissions;
    }

    // 3. Fallback to role presets
    let teamRole: TeamRole = 'Employee';
    if (role === 'partner') teamRole = 'Partner';
    else if (role === 'manager') teamRole = 'Manager';

    return getPresetPermissions(teamRole);
  }, [user, role, isAdmin]);

  const can = useCallback(
    (moduleKey: string, action: PermissionAction = 'view'): boolean => {
      if (!user) return true;
      if (isAdmin) return true;
      return canAccess(role, permissions, moduleKey, action);
    },
    [user, role, isAdmin, permissions]
  );

  const canView = useCallback((modKey: string) => can(modKey, 'view'), [can]);
  const canAddEdit = useCallback((modKey: string) => can(modKey, 'addEdit'), [can]);
  const canDelete = useCallback((modKey: string) => can(modKey, 'delete'), [can]);
  const canImport = useCallback((modKey: string) => can(modKey, 'import'), [can]);
  const canExport = useCallback((modKey: string) => can(modKey, 'export'), [can]);

  return useMemo(
    () => ({
      user,
      role,
      isAdmin,
      permissions,
      can,
      canView,
      canAddEdit,
      canDelete,
      canImport,
      canExport,
    }),
    [user, role, isAdmin, permissions, can, canView, canAddEdit, canDelete, canImport, canExport]
  );
}
