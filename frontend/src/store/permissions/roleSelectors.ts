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
  permissions?: RolePermissionsMap | string[] | any | null,
  moduleKey?: string,
  action: PermissionAction = 'view'
): boolean {
  if (isRoleAdmin(role)) {
    return true;
  }

  if (!moduleKey) return false;
  if (!permissions) return false;

  const normKey = normalizeModuleKey(moduleKey);

  // If permissions is an array of section strings (e.g. from user store: ['clients', 'invoices', 'billing', 'ledger', ...])
  if (Array.isArray(permissions)) {
    const permList = permissions.map((p: any) =>
      typeof p === 'string' ? normalizeModuleKey(p) : typeof p?.key === 'string' ? normalizeModuleKey(p.key) : ''
    ).filter(Boolean);

    // Direct match with normalized key or raw moduleKey
    if (permList.includes(normKey) || permList.includes(moduleKey.toLowerCase().trim())) {
      return true;
    }

    // Common section aliases
    if (normKey === 'billing' && (permList.includes('ledger') || permList.includes('invoice') || permList.includes('invoices') || permList.includes('billing'))) return true;
    if (normKey === 'invoice' && (permList.includes('invoices') || permList.includes('billing') || permList.includes('ledger'))) return true;
    if (normKey === 'payments' && (permList.includes('receipts') || permList.includes('receipt') || permList.includes('billing') || permList.includes('ledger'))) return true;
    if (normKey === 'digital_signature' && (permList.includes('dsc') || permList.includes('pdf_signer'))) return true;
    if (normKey === 'pdf_signer' && (permList.includes('digital_signature') || permList.includes('dsc'))) return true;
    if (normKey === 'document_in_out' && (permList.includes('documents') || permList.includes('file_manager') || permList.includes('drive'))) return true;
    if (normKey === 'file_manager' && (permList.includes('drive') || permList.includes('documents') || permList.includes('document_in_out'))) return true;
    if (normKey === 'compliance_tracker' && (permList.includes('compliance') || permList.includes('tracker'))) return true;
    if (normKey === 'notice_management' && (permList.includes('notices') || permList.includes('notice'))) return true;
    if (normKey === 'task_manager' && (permList.includes('tasks') || permList.includes('task') || permList.includes('workdone'))) return true;
    if (normKey === 'groups' && (permList.includes('group') || permList.includes('groups'))) return true;
    if (normKey === 'services' && (permList.includes('service') || permList.includes('services'))) return true;
    if (normKey === 'leads' && (permList.includes('lead') || permList.includes('leads'))) return true;
    if (normKey === 'clients' && (permList.includes('client') || permList.includes('clients'))) return true;
    if (normKey === 'team' && (permList.includes('staff') || permList.includes('employees') || permList.includes('team'))) return true;

    return false;
  }

  // Employees have guaranteed default access to communication sections (WhatsApp & Email)
  if (normKey === 'whatsapp_business' || normKey === 'email') {
    if (action === 'view' || action === 'addEdit') {
      if (!permissions || !permissions[normKey]) return true;
      return permissions[normKey].view !== false;
    }
  }

  let mod = permissions[normKey] || permissions[moduleKey];

  // Fallback: pdf_signer falls back to digital_signature if unassigned
  if (!mod && normKey === 'pdf_signer' && permissions['digital_signature']) {
    mod = permissions['digital_signature'];
  }
  // Fallback: billing falls back to ledger or invoice
  if (!mod && normKey === 'billing' && (permissions['ledger'] || permissions['invoice'])) {
    mod = permissions['ledger'] || permissions['invoice'];
  }
  // Fallback: ledger falls back to billing
  if (!mod && normKey === 'ledger' && permissions['billing']) {
    mod = permissions['billing'];
  }
  if (!mod) return false;

  // Support boolean permission values: { billing: true }
  if (typeof mod === 'boolean') {
    return mod;
  }

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

export const selectUserPermissions = (state: RootState): RolePermissionsMap | string[] | any | null => {
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

