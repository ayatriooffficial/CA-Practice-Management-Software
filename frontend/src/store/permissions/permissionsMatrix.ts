/**
 * Central Permission Matrix Configuration
 * Defines module keys and role presets.
 * Access for ADMIN is universal and bypasses all restrictions.
 */

export type PermissionAction = 'view' | 'addEdit' | 'delete' | 'import' | 'export';

export interface ModulePermission {
  view: boolean;
  addEdit: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
}

export type RolePermissionsMap = Record<string, ModulePermission>;

export interface ModuleConfig {
  key: string;
  label: string;
  canView: boolean;
  canAddEdit: boolean;
  canDelete: boolean;
  canImport: boolean;
  canExport: boolean;
}

export const MODULE_CONFIGS: ModuleConfig[] = [
  { key: 'leads', label: 'Leads', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: true },
  { key: 'clients', label: 'Clients', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: true },
  { key: 'groups', label: 'Groups', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: true },
  { key: 'services', label: 'Services', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: true },
  { key: 'task_manager', label: 'Task Manager', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: true },
  { key: 'invoice', label: 'Invoice', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: true },
  { key: 'payments', label: 'Payments', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: true },
  { key: 'udin', label: 'UDIN', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: true },
  { key: 'digital_signature', label: 'Digital Signature (DSC)', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'pdf_signer', label: 'PDF Signer', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'licenses', label: 'Licenses', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: true },
  { key: 'password', label: 'Password', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: false },
  { key: 'team', label: 'Team', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'time_sheet', label: 'Time Sheet', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'attendance_leave', label: 'Attendance & Leave', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'recurring', label: 'Recurring', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'settings', label: 'Settings', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'reports', label: 'Reports', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: true },
  { key: 'billing', label: 'Billing', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: true },
  { key: 'document_in_out', label: 'Document In-Out', canView: true, canAddEdit: true, canDelete: true, canImport: true, canExport: false },
  { key: 'calendar', label: 'Calendar', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'compliance_tracker', label: 'Compliance Tracker', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'chat', label: 'Chat', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'sprint_planner', label: 'Sprint Planner', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'action_center', label: 'Action Center', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'todo', label: 'To-Do', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'notice_management', label: 'Notice Management', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'email', label: 'Email', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'agents', label: 'Agents', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'whatsapp_business', label: 'WhatsApp Business', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'appointment', label: 'Appointment', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'file_manager', label: 'File Manager', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'proposals', label: 'Proposals', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
  { key: 'sales_dashboard', label: 'Sales Dashboard', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
];

export const normalizeModuleKey = (key: string): string => {
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
  if (k === 'ledger') return 'billing';
  if (k === 'invoices') return 'invoice';
  if (k === 'receipts' || k === 'receipt') return 'payments';
  return k;
};

export function createEmptyPermissions(): RolePermissionsMap {
  const map: RolePermissionsMap = {};
  MODULE_CONFIGS.forEach((mod) => {
    map[mod.key] = {
      view: false,
      addEdit: false,
      delete: false,
      import: false,
      export: false,
    };
  });
  return map;
}

export function getFullAdminPermissions(): RolePermissionsMap {
  const map = createEmptyPermissions();
  MODULE_CONFIGS.forEach((mod) => {
    map[mod.key] = {
      view: true,
      addEdit: true,
      delete: true,
      import: true,
      export: true,
    };
  });
  return map;
}

export function getPermissionsForRole(role: string): RolePermissionsMap {
  const r = (role || '').toLowerCase().trim();

  // Full administrative access
  if (r === 'admin' || r === 'partner' || r === 'owner' || r === 'superadmin') {
    return getFullAdminPermissions();
  }

  // Employee default preset: View & Add/Edit on core operational modules
  const map = createEmptyPermissions();
  const employeeOperationalModules = [
    'task_manager',
    'clients',
    'leads',
    'invoice',
    'compliance_tracker',
    'pdf_signer',
    'digital_signature',
    'document_in_out',
    'todo',
    'notice_management',
    'attendance_leave',
    'chat',
    'whatsapp_business',
    'email',
    'action_center',
    'sprint_planner',
    'calendar',
  ];

  employeeOperationalModules.forEach((key) => {
    if (map[key]) {
      map[key] = {
        view: true,
        addEdit: true,
        delete: false,
        import: false,
        export: false,
      };
    }
  });

  return map;
}

