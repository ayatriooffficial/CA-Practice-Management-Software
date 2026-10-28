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
    if (user.permissions && Object.keys(user.permissions).length > 0) {
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

    // Big roles can see and do everything
    if (roleLower === 'admin' || roleLower === 'partner' || roleLower === 'manager' || roleLower === 'owner') {
      return true;
    }

    // Role-based rule for Employees:
    if (roleLower === 'employee') {
      // 1. Invoice, billing, proposals, dsc, and pdf-signer are completely hidden/blocked for employees
      if (
        moduleKey === 'invoice' ||
        moduleKey === 'billing' ||
        moduleKey === 'proposals' ||
        moduleKey === 'dsc' ||
        moduleKey === 'digital_signature' ||
        moduleKey === 'pdf-signer' ||
        moduleKey === 'pdf_signer'
      ) {
        return false;
      }
      // 2. Delete is strictly disallowed across all sections for employees
      if (action === 'delete') {
        return false;
      }
    }

    if (!permissions) return false;
    const normalizedKey =
      moduleKey === 'task' || moduleKey === 'tasks' ? 'task_manager' : moduleKey;
    const mod = permissions[normalizedKey] || permissions[moduleKey];
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
