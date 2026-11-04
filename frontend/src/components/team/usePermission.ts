import React, { useMemo, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { teamStore } from './teamStore';
import { getPresetPermissions } from './permissionsConfig';
import { RolePermissionsMap, TeamRole } from './types';

export type PermissionAction = 'view' | 'addEdit' | 'delete' | 'import' | 'export';

const normalizeKey = (key: string): string => {
  const k = key.toLowerCase().trim();
  if (k === 'task' || k === 'tasks') return 'task_manager';
  if (k === 'client') return 'clients';
  if (k === 'lead') return 'leads';
  if (k === 'group') return 'groups';
  if (k === 'service') return 'services';
  if (k === 'dsc' || k === 'digital-signature') return 'digital_signature';
  if (k === 'pdf-signer' || k === 'pdfsigner') return 'pdf_signer';
  if (k === 'documents' || k === 'document') return 'document_in_out';
  if (k === 'drive') return 'file_manager';
  if (k === 'compliance') return 'compliance_tracker';
  if (k === 'notices' || k === 'notice') return 'notice_management';
  if (k === 'attendance') return 'attendance_leave';
  if (k === 'to-do') return 'todo';
  if (k === 'whatsapp') return 'whatsapp_business';
  return k;
};

export function usePermission() {
  const { currentUser } = useAuth();
  const user = currentUser;

  const permissions = useMemo((): RolePermissionsMap | null => {
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
  }, [user]);

  const can = useCallback((moduleKey: string, action: PermissionAction = 'view'): boolean => {
    if (!user) return true;
    const roleLower = (user.role || '').toLowerCase();

    // Full administrative access
    if (roleLower === 'admin' || roleLower === 'partner' || roleLower === 'manager' || roleLower === 'owner') {
      return true;
    }

    if (!permissions) return false;

    const normKey = normalizeKey(moduleKey);
    let mod = permissions[normKey] || permissions[moduleKey];

    // Fallback: if checking pdf_signer and not explicitly set, check digital_signature
    if (!mod && normKey === 'pdf_signer' && permissions['digital_signature']) {
      mod = permissions['digital_signature'];
    }

    if (!mod) return false;

    // View is allowed if 'view' is checked OR if any operational capability is checked
    if (action === 'view') {
      return Boolean(mod.view || mod.addEdit || mod.delete || mod.import || mod.export);
    }

    // Specific action is permitted strictly according to the tick mark set by admin
    return Boolean(mod[action]);
  }, [user, permissions]);

  const canView = useCallback((modKey: string) => can(modKey, 'view'), [can]);
  const canAddEdit = useCallback((modKey: string) => can(modKey, 'addEdit'), [can]);
  const canDelete = useCallback((modKey: string) => can(modKey, 'delete'), [can]);
  const canImport = useCallback((modKey: string) => can(modKey, 'import'), [can]);
  const canExport = useCallback((modKey: string) => can(modKey, 'export'), [can]);

  return useMemo(() => ({
    user,
    permissions,
    can,
    canView,
    canAddEdit,
    canDelete,
    canImport,
    canExport,
  }), [user, permissions, can, canView, canAddEdit, canDelete, canImport, canExport]);
}
