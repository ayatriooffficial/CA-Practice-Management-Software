'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  RotateCcw,
  X,
  Pencil,
  Trash2,
  MoreVertical,
  UserX,
  UserCheck,
} from 'lucide-react';
import { EmployeeRecord, TeamRole, UserStatus, getRoleRank } from './types';
import { teamStore } from './teamStore';
import { AddEmployeeWizard } from './AddEmployeeWizard';
import { useAuth } from '../auth/AuthContext';
import { Pagination } from '../ui/Pagination';
import { TableActionDropdown } from '../ui/TableActionDropdown';

interface TeamListViewProps {
  employees: EmployeeRecord[];
  onRefresh: () => void;
}

export const TeamListView: React.FC<TeamListViewProps> = ({
  employees,
  onRefresh,
}) => {
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || '').toLowerCase() === 'employee';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Dept');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedStatus, setSelectedStatus] = useState<'All' | UserStatus>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeRecord | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    teamStore.loadEmployeesFromBackend().then(() => {
      onRefresh();
    });
  }, []);

  const activeCount = employees.filter((e) => e.status === 'Active').length;

  // Filter employees
  const filtered = employees.filter((emp) => {
    if (isEmployee && emp.status !== 'Active') return false;
    if (selectedDept !== 'All Dept' && emp.department !== selectedDept) return false;
    if (!isEmployee && selectedRole !== 'All Roles' && emp.role !== selectedRole) return false;
    if (!isEmployee && selectedStatus !== 'All' && emp.status !== selectedStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = emp.name.toLowerCase().includes(q);
      const matchEmail = emp.email.toLowerCase().includes(q);
      const matchPhone = emp.mobile.includes(q);
      const matchDesig = emp.designation.toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchDesig;
    }

    return true;
  }).sort((a, b) => {
    const rankDiff = getRoleRank(a.role) - getRoleRank(b.role);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });

  const paginatedEmployees = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenAddUser = () => {
    setEditingEmp(null);
    setIsWizardOpen(true);
  };

  const handleEdit = (emp: EmployeeRecord) => {
    const fresh = teamStore.getEmployees().find(
      (e) => e.id === emp.id || (e.email && emp.email && e.email.toLowerCase() === emp.email.toLowerCase())
    ) || emp;
    setEditingEmp({ ...emp, password: fresh.password || emp.password || '' });
    setIsWizardOpen(true);
    setActiveMenuId(null);
  };

  const handleToggleStatus = (emp: EmployeeRecord, target: UserStatus) => {
    setActiveMenuId(null);
    const res = teamStore.toggleEmployeeStatus(emp.id, target);
    if (!res.success) {
      alert(res.message);
    }
    onRefresh();
  };

  const handleSaveEmployee = (
    data: Omit<EmployeeRecord, 'id' | 'createdAt' | 'initials' | 'clientsCount' | 'tasksCount' | 'recurringCount'>
  ) => {
    if (editingEmp) {
      teamStore.updateEmployee(editingEmp.id, data);
    } else {
      const res = teamStore.addEmployee(data);
      if (!res.success) {
        alert(res.message);
        return;
      }
    }
    onRefresh();
  };

  const getRoleBadgeStyle = (r: TeamRole) => {
    switch (r) {
      case 'Admin':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40';
      case 'Partner':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40';
      case 'Manager':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusBadgeStyle = (s: UserStatus) => {
    switch (s) {
      case 'Active':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40';
      case 'Deactivated':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
      case 'Resigned':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40';
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4 px-1">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white py-2">
            Users ({filtered.length})
          </h1>
        </div>

        {!isEmployee && (
          <div className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={handleOpenAddUser}
              className="flex items-center gap-1.5 h-10 px-4 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Users</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white dark:bg-[#1e293b] rounded-none border border-[#dde2e8] dark:border-[#334155] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search name, email, phone..."
              className="h-10 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-9 pr-8 text-xs text-[#000000] dark:text-white outline-none focus:border-[#31719B]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-[#31719B]"
          >
            <option value="All Dept">All Departments</option>
            <option value="Audit & Taxation">Audit & Taxation</option>
            <option value="Audit">Audit</option>
            <option value="Taxation">Taxation</option>
            <option value="Accounts">Accounts</option>
            <option value="Corporate Law">Corporate Law</option>
          </select>

          {/* Role Filter - Hidden for Employee */}
          {!isEmployee && (
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-[#31719B]"
            >
              <option value="All Roles">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Partner">Partner</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
            </select>
          )}

          {/* Status Filter - Hidden for Employee */}
          {!isEmployee && (
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as 'All' | UserStatus);
                setCurrentPage(1);
              }}
              className="h-10 px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-[#31719B]"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
              <option value="Resigned">Resigned</option>
            </select>
          )}

          {/* Reset Filters */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('All Dept');
                setSelectedRole('All Roles');
                setSelectedStatus('All');
                setCurrentPage(1);
              }}
              className="flex items-center gap-1.5 h-10 px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-white dark:bg-[#1e293b] shadow-card rounded-none border border-[#dde2e8] dark:border-[#334155] overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs select-none">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="sticky left-0 z-30 w-12 min-w-[48px] max-w-[48px] px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center" style={{ backgroundColor: "var(--orange-havy-light)" }}>
                  <input type="checkbox" className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer" />
                </th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] uppercase whitespace-nowrap">Name</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] uppercase whitespace-nowrap">Role</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] uppercase whitespace-nowrap">Designation</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] uppercase whitespace-nowrap">Department</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] text-center uppercase whitespace-nowrap">Clients</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] text-center uppercase whitespace-nowrap">Tasks</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] text-center uppercase whitespace-nowrap">Recurring</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] uppercase whitespace-nowrap">Phone No</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] uppercase whitespace-nowrap">Email</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] uppercase whitespace-nowrap">Last Punch-In</th>
                <th className="px-3.5 py-3 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] uppercase whitespace-nowrap">Status</th>
                {!isEmployee && (
                  <th
                    scope="col"
                    className="sticky right-0 z-30 w-28 min-w-[112px] max-w-[112px] px-3 py-3 font-semibold text-[#000000] dark:text-white border-l border-b border-[#dde2e8] dark:border-[#334155] text-center uppercase whitespace-nowrap"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isEmployee ? 12 : 13} className="py-16 text-center text-gray-400 font-medium">
                    No team members found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/70 dark:hover:bg-[#131d30] transition-colors">
                    <td className="sticky left-0 z-20 px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center bg-white dark:bg-[#1e293b]">
                      <input type="checkbox" className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer" />
                    </td>

                    {/* Name + Initials */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-900 dark:text-white font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#EEF2FF] dark:bg-[#1e293b] text-[#31719B] dark:text-[#3D88BF] font-bold text-[11px] flex items-center justify-center border border-[#31719B]/20">
                          {emp.initials}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{emp.name}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-medium text-[11px] border ${getRoleBadgeStyle(emp.role)}`}>
                        {emp.role}
                      </span>
                    </td>

                    {/* Designation */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap">{emp.designation || '-'}</td>

                    {/* Department */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap">{emp.department || '-'}</td>

                    {/* Clients */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{emp.clientsCount || '-'}</td>

                    {/* Tasks */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{emp.tasksCount || '-'}</td>

                    {/* Recurring */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{emp.recurringCount || '-'}</td>

                    {/* Phone */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap">{emp.mobile}</td>

                    {/* Email */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-400 whitespace-nowrap">{emp.email}</td>

                    {/* Last Punch In */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-500 dark:text-gray-400 whitespace-nowrap">{emp.lastPunchIn || 'Never'}</td>

                    {/* Status */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-medium text-[11px] border ${getStatusBadgeStyle(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>

                    {/* Sticky Actions */}
                    {!isEmployee && (
                      <td className="sticky right-0 z-20 w-28 min-w-[112px] max-w-[112px] px-2 py-2 border-l border-b border-[#dde2e8] dark:border-[#334155] text-center bg-white dark:bg-[#1e293b]">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(emp)}
                            className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#31719B] dark:hover:text-[#3D88BF] transition-colors cursor-pointer"
                            title="Edit Employee"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <TableActionDropdown
                            align="right"
                            buttonAriaLabel="More Options"
                            actions={[
                              emp.status === 'Active'
                                ? {
                                    label: 'Deactivate User',
                                    icon: UserX,
                                    onClick: () => handleToggleStatus(emp, 'Deactivated'),
                                  }
                                : {
                                    label: 'Reactivate User',
                                    icon: UserCheck,
                                    onClick: () => handleToggleStatus(emp, 'Active'),
                                  },
                              ...(emp.status !== 'Resigned'
                                ? [
                                    {
                                      label: 'Mark as Resigned',
                                      icon: UserX,
                                      onClick: () => handleToggleStatus(emp, 'Resigned'),
                                    },
                                  ]
                                : []),
                              {
                                label: 'Remove Employee',
                                icon: Trash2,
                                variant: 'danger',
                                onClick: () => setEmployeeToDelete(emp),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b]">
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            showPageSize={true}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </div>

      {/* Add / Edit Wizard Modal */}
      <AddEmployeeWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSave={handleSaveEmployee}
        isEdit={Boolean(editingEmp)}
        initialData={editingEmp}
      />

      {/* Permanent Deletion Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#1e293b] rounded-none max-w-md w-full border border-gray-200 dark:border-[#334155] shadow-2xl p-6 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Remove Employee
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {employeeToDelete.name} ({employeeToDelete.email})
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
              <span className="font-semibold block mb-0.5">Warning:</span>
              This action will remove the employee permanently.
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!employeeToDelete) return;
                  setIsDeleting(true);
                  try {
                    teamStore.deleteEmployee(employeeToDelete.id, employeeToDelete.email);
                    setEmployeeToDelete(null);
                    onRefresh();
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
