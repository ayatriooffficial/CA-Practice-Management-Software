import { useAuth } from '../auth/AuthContext';
import { teamStore } from './teamStore';
import { getPresetPermissions } from './permissionsConfig';
import { RolePermissionsMap, TeamRole } from './types';

export type PermissionAction = 'view' | 'addEdit' | 'delete' | 'import' | 'export';

export function usePermission() {
  const { currentUser } = useAuth();
  const user = currentUser;

  const getEffectivePermissions = (): RolePermissionsMap | null => {
    if (!user) return null;

    // 1. If user object has permissions directly
    if (user.permissions) {
      return user.permissions as RolePermissionsMap;
    }

    // 2. Check teamStore by email / mobile
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
    const rawRole = (user.role || '').toLowerCase();
    let teamRole: TeamRole = 'Employee';
    if (rawRole === 'admin') teamRole = 'Admin';
    else if (rawRole === 'partner') teamRole = 'Partner';
    else if (rawRole === 'manager') teamRole = 'Manager';

    return getPresetPermissions(teamRole);
  };

  const permissions = getEffectivePermissions();

  const can = (moduleKey: string, action: PermissionAction = 'view'): boolean => {
    if (!user) return true;
    const roleLower = (user.role || '').toLowerCase();
    if (roleLower === 'admin') return true;

    if (!permissions) return false;
    const mod = permissions[moduleKey];
    if (!mod) return false;

    return Boolean(mod[action]);
  };

  return {
    user,
    permissions,
    can,
    canView: (modKey: string) => can(modKey, 'view'),
    canAddEdit: (modKey: string) => can(modKey, 'addEdit'),
    canDelete: (modKey: string) => can(modKey, 'delete'),
    canImport: (modKey: string) => can(modKey, 'import'),
    canExport: (modKey: string) => can(modKey, 'export'),
  };
}
