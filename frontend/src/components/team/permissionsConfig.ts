import { RolePermissionsMap, TeamRole } from './types';

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
  { key: 'digital_signature', label: 'Digital Signature', canView: true, canAddEdit: true, canDelete: true, canImport: false, canExport: false },
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

export function getPresetPermissions(role: TeamRole): RolePermissionsMap {
  const map = createEmptyPermissions();

  if (role === 'Admin') {
    MODULE_CONFIGS.forEach((mod) => {
      map[mod.key] = {
        view: mod.canView,
        addEdit: mod.canAddEdit,
        delete: mod.canDelete,
        import: mod.canImport,
        export: mod.canExport,
      };
    });
    return map;
  }

  if (role === 'Partner') {
    MODULE_CONFIGS.forEach((mod) => {
      if (mod.key === 'settings') {
        map[mod.key] = { view: false, addEdit: false, delete: false, import: false, export: false };
      } else if (mod.key === 'team') {
        map[mod.key] = { view: true, addEdit: true, delete: false, import: false, export: false };
      } else {
        map[mod.key] = {
          view: mod.canView,
          addEdit: mod.canAddEdit,
          delete: mod.canDelete,
          import: mod.canImport,
          export: mod.canExport,
        };
      }
    });
    return map;
  }

  if (role === 'Manager') {
    // Operational modules full access
    const operationalFull = ['leads', 'clients', 'services', 'task_manager', 'groups', 'invoice', 'payments', 'udin', 'licenses'];
    operationalFull.forEach((k) => {
      const cfg = MODULE_CONFIGS.find((m) => m.key === k);
      if (cfg) {
        map[k] = {
          view: true,
          addEdit: true,
          delete: true,
          import: cfg.canImport,
          export: cfg.canExport,
        };
      }
    });

    const standardViewAdd = [
      'time_sheet', 'attendance_leave', 'calendar', 'document_in_out', 'compliance_tracker',
      'chat', 'sprint_planner', 'action_center', 'todo', 'notice_management', 'email', 'agents',
      'whatsapp_business', 'appointment', 'file_manager', 'proposals'
    ];
    standardViewAdd.forEach((k) => {
      map[k] = { view: true, addEdit: true, delete: false, import: false, export: false };
    });

    map['team'] = { view: true, addEdit: false, delete: false, import: false, export: false };
    map['reports'] = { view: true, addEdit: false, delete: false, import: false, export: true };
    map['sales_dashboard'] = { view: true, addEdit: false, delete: false, import: false, export: false };
    map['settings'] = { view: false, addEdit: false, delete: false, import: false, export: false };
    return map;
  }

  // Employee preset
  // View & Add/Edit on Leads, Clients, Services, Task Manager
  ['leads', 'clients', 'services', 'task_manager'].forEach((k) => {
    map[k] = { view: true, addEdit: true, delete: false, import: false, export: false };
  });

  // View only on Groups, Invoice, Payments, Notice Management, Team
  ['groups', 'invoice', 'payments', 'notice_management', 'team'].forEach((k) => {
    map[k] = { view: true, addEdit: false, delete: false, import: false, export: false };
  });

  // Daily tools
  ['time_sheet', 'attendance_leave', 'calendar', 'chat', 'todo', 'action_center', 'appointment', 'file_manager'].forEach((k) => {
    map[k] = { view: true, addEdit: true, delete: false, import: false, export: false };
  });

  return map;
}

export function handlePermissionToggle(
  current: RolePermissionsMap,
  moduleKey: string,
  field: 'view' | 'addEdit' | 'delete' | 'import' | 'export',
  checked: boolean
): RolePermissionsMap {
  const currentMod = current[moduleKey] || { view: false, addEdit: false, delete: false, import: false, export: false };
  const updatedMod = { ...currentMod, [field]: checked };

  // Rule 1: If non-view field is checked, auto-check view
  if (field !== 'view' && checked) {
    updatedMod.view = true;
  }

  // Rule 2: If view is un-checked, auto-uncheck all others
  if (field === 'view' && !checked) {
    updatedMod.addEdit = false;
    updatedMod.delete = false;
    updatedMod.import = false;
    updatedMod.export = false;
  }

  return {
    ...current,
    [moduleKey]: updatedMod,
  };
}
