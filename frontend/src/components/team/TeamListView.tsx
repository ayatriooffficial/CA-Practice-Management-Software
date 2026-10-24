'use client';

import React, { useState, useEffect } from 'react';
import { EmployeeRecord, TeamRole, UserStatus, getRoleRank } from './types';
import { teamStore } from './teamStore';
import { AddEmployeeWizard } from './AddEmployeeWizard';
import { useAuth } from '../auth/AuthContext';
import { Pagination } from '../ui/Pagination';

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
    <div className="p-6 space-y-4">
      {/* Filter and Action Bar */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-bold text-gray-900 dark:text-white pr-2">
            Users List <span className="text-gray-400 font-normal">({filtered.length})</span>
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs px-3 py-1.5 border border-gray-300 dark:border-[#475569] rounded-lg bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#3D6A9E]"
          >
            <option value="All Dept">All Dept</option>
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
              className="text-xs px-3 py-1.5 border border-gray-300 dark:border-[#475569] rounded-lg bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#3D6A9E]"
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
              className="text-xs px-3 py-1.5 border border-gray-300 dark:border-[#475569] rounded-lg bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#3D6A9E]"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
              <option value="Resigned">Resigned</option>
            </select>
          )}
        </div>

        {/* Right side search + Add Button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search name, email, phone..."
              className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 dark:border-[#475569] rounded-lg bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {!isEmployee && (
            <button
              onClick={handleOpenAddUser}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all bg-[#3D6A9E] text-white hover:bg-[#315782] shadow-[#3D6A9E]/20 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Users</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] overflow-hidden shadow-2xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#162032] text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-[#334155] select-none">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] cursor-pointer" />
                </th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-3 text-center">Clients</th>
                <th className="py-3 px-3 text-center">Tasks</th>
                <th className="py-3 px-3 text-center">Recurring</th>
                <th className="py-3 px-4">Phone No</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Last Punch-In</th>
                <th className="py-3 px-3">Status</th>
                {!isEmployee && <th className="py-3 px-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isEmployee ? 12 : 13} className="py-12 text-center text-gray-400">
                    No team members found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/70 dark:hover:bg-[#131d30] transition-colors">
                    <td className="py-3 px-3">
                      <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] cursor-pointer" />
                    </td>

                    {/* Name + Initials */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#EEF2FF] dark:bg-[#1e293b] text-[#3D6A9E] dark:text-[#60a5fa] font-bold text-[11px] flex items-center justify-center border border-[#3D6A9E]/20">
                          {emp.initials}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{emp.name}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-medium text-[11px] border ${getRoleBadgeStyle(emp.role)}`}>
                        {emp.role}
                      </span>
                    </td>

                    {/* Designation */}
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{emp.designation || '-'}</td>

                    {/* Department */}
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{emp.department || '-'}</td>

                    {/* Clients */}
                    <td className="py-3 px-3 text-center text-gray-700 dark:text-gray-300">{emp.clientsCount || '-'}</td>

                    {/* Tasks */}
                    <td className="py-3 px-3 text-center text-gray-700 dark:text-gray-300">{emp.tasksCount || '-'}</td>

                    {/* Recurring */}
                    <td className="py-3 px-3 text-center text-gray-700 dark:text-gray-300">{emp.recurringCount || '-'}</td>

                    {/* Phone */}
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{emp.mobile}</td>

                    {/* Email */}
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{emp.email}</td>

                    {/* Last Punch In */}
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{emp.lastPunchIn || 'Never'}</td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-medium text-[11px] border ${getStatusBadgeStyle(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>

                    {/* Actions - completely hidden for Employee */}
                    {!isEmployee && (
                      <td className="py-3 px-3 text-center relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === emp.id ? null : emp.id)}
                          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#334155] transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === emp.id && (
                        <div className="absolute right-4 mt-1 w-44 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-gray-200 dark:border-[#334155] py-1.5 z-20 text-left animate-fadeIn">
                          <button
                            onClick={() => handleEdit(emp)}
                            className="w-full px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#334155] flex items-center gap-2 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Employee
                          </button>

                          {emp.status === 'Active' ? (
                            <button
                              onClick={() => handleToggleStatus(emp, 'Deactivated')}
                              className="w-full px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#334155] flex items-center gap-2 cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              Deactivate User
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(emp, 'Active')}
                              className="w-full px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Reactivate User
                            </button>
                          )}

                          {emp.status !== 'Resigned' && (
                            <button
                              onClick={() => handleToggleStatus(emp, 'Resigned')}
                              className="w-full px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 border-t border-gray-100 dark:border-[#334155] cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Mark as Resigned
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setEmployeeToDelete(emp);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 border-t border-gray-100 dark:border-[#334155] cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove Employee
                          </button>
                        </div>
                      )}
                    </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer matching Clients table */}
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
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-md w-full border border-gray-200 dark:border-[#334155] shadow-2xl p-6 flex flex-col gap-4 text-left">
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
