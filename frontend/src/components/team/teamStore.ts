import {
  EmployeeRecord,
  TodayAttendanceRecord,
  RegularizationRecord,
  LeaveApplication,
  LeaveSummaryRecord,
  ReimbursementClaim,
  RolePermissionsMap,
  TeamRole,
  getRoleRank,
} from './types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_TODAY_ATTENDANCE,
  INITIAL_REGULARIZATIONS,
  INITIAL_LEAVE_APPLICATIONS,
  INITIAL_LEAVE_SUMMARY,
  INITIAL_REIMBURSEMENTS,
} from './mockData';
import { getPresetPermissions } from './permissionsConfig';
import { request } from '../../services/apiClient';
import { financialApi } from '../../services/financialApi';

const EMPLOYEES_KEY = 'turia_team_employees';
const ATTENDANCE_KEY = 'turia_team_attendance_today';
const REGULARIZATIONS_KEY = 'turia_team_regularizations';
const LEAVES_KEY = 'turia_team_leave_applications';
const LEAVE_SUMMARY_KEY = 'turia_team_leave_summary';
const REIMBURSEMENTS_KEY = 'turia_team_reimbursements';
const REGISTERED_USERS_KEY = 'turia_demo_registered_users';

export const TOTAL_SEATS = 999999; // Unlimited & 100% Free

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function safeGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export const teamStore = {
  getEmployees(): EmployeeRecord[] {
    const list = safeGet<EmployeeRecord[]>(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
    // Purge any legacy demo employees with demo IDs or demo email domains
    const cleaned = list.filter((e) => {
      const isDemoId = e.id?.startsWith('emp_ka_') || e.id?.startsWith('emp_demo_');
      const isDemoEmail =
        e.email?.includes('@krishnaassociates.example') ||
        e.email?.includes('@example.com') ||
        e.email?.includes('@ayatrio.example');
      return !isDemoId && !isDemoEmail;
    });

    if (cleaned.length !== list.length) {
      safeSet(EMPLOYEES_KEY, cleaned);
    }

    return [...cleaned].sort((a, b) => {
      const rankDiff = getRoleRank(a.role) - getRoleRank(b.role);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name);
    });
  },

  saveEmployees(employees: EmployeeRecord[]): void {
    const cleaned = employees.filter((e) => {
      const isDemoId = e.id?.startsWith('emp_ka_') || e.id?.startsWith('emp_demo_');
      const isDemoEmail =
        e.email?.includes('@krishnaassociates.example') ||
        e.email?.includes('@example.com') ||
        e.email?.includes('@ayatrio.example');
      return !isDemoId && !isDemoEmail;
    });
    safeSet(EMPLOYEES_KEY, cleaned);
    this.syncWithAuthUsers(cleaned);
  },

  getActiveCount(): number {
    return this.getEmployees().filter((e) => e.status === 'Active').length;
  },

  getDeactivatedCount(): number {
    return this.getEmployees().filter((e) => e.status === 'Deactivated').length;
  },

  getResignedCount(): number {
    return this.getEmployees().filter((e) => e.status === 'Resigned').length;
  },

  isSeatLimitReached(): boolean {
    return false; // Unlimited free seats
  },

  addEmployee(employee: Omit<EmployeeRecord, 'id' | 'createdAt' | 'initials' | 'clientsCount' | 'tasksCount' | 'recurringCount'>): { success: boolean; message?: string; employee?: EmployeeRecord } {
    const employees = this.getEmployees();

    // Check duplicate email or mobile
    const exists = employees.some(
      (e) => e.email.toLowerCase() === employee.email.trim().toLowerCase() ||
             e.mobile.replace(/\D/g, '').slice(-10) === employee.mobile.replace(/\D/g, '').slice(-10)
    );
    if (exists) {
      return { success: false, message: 'An employee with this email or mobile number already exists.' };
    }

    const nameParts = employee.name.trim().split(/\s+/);
    const initials = nameParts.length === 1
      ? nameParts[0].slice(0, 2).toUpperCase()
      : (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();

    const newEmp: EmployeeRecord = {
      ...employee,
      id: `emp_${Date.now()}`,
      initials,
      clientsCount: 0,
      tasksCount: 0,
      recurringCount: 0,
      createdAt: new Date().toISOString(),
      permissions: employee.permissions || getPresetPermissions(employee.role),
    };

    employees.unshift(newEmp);
    this.saveEmployees(employees);

    // Sync with backend API
    if (isBrowser()) {
      request('/auth/team', {
        method: 'POST',
        body: JSON.stringify({
          name: newEmp.name,
          email: newEmp.email,
          mobile: newEmp.mobile,
          role: newEmp.role,
          department: newEmp.department,
          designation: newEmp.designation,
          permissions: newEmp.permissions,
        }),
      }).then((res: any) => {
        if (res?.data?.id) {
          // Update local id to backend MongoDB _id
          this.updateEmployee(newEmp.id, { id: res.data.id });
          if (employee.costPerHour !== undefined && employee.costPerHour !== '') {
            void financialApi.setInternalCostRate(res.data.id, Number(employee.costPerHour));
          }
        }
      }).catch(() => {
        // Continue with local storage if offline
      });
    }

    return { success: true, employee: newEmp };
  },

  updateEmployee(id: string, updates: Partial<EmployeeRecord>): void {
    const employees = this.getEmployees().map((e) => {
      if (e.id === id) {
        return { ...e, ...updates };
      }
      return e;
    });
    this.saveEmployees(employees);

    if (isBrowser() && id && !id.startsWith('emp_')) {
      request(`/auth/team/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }).catch(() => {});
      if (Object.prototype.hasOwnProperty.call(updates, 'costPerHour')) {
        void financialApi.setInternalCostRate(id, updates.costPerHour == null || updates.costPerHour === '' ? null : Number(updates.costPerHour));
      }
    }
  },

  toggleEmployeeStatus(id: string, targetStatus: 'Active' | 'Deactivated' | 'Resigned'): { success: boolean; message?: string } {
    const employees = this.getEmployees();
    const target = employees.find((e) => e.id === id);
    if (!target) return { success: false, message: 'Employee not found.' };

    target.status = targetStatus;
    if (targetStatus === 'Resigned') {
      target.resignationDate = new Date().toISOString().split('T')[0];
    }
    this.saveEmployees(employees);

    if (isBrowser() && id && !id.startsWith('emp_')) {
      request(`/auth/team/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus.toLowerCase() }),
      }).catch(() => {});
    }
    return { success: true };
  },

  async loadEmployeesFromBackend(): Promise<EmployeeRecord[]> {
    if (!isBrowser()) return this.getEmployees();
    try {
      const res = await request<any[]>('/auth/team');
      if (res?.data && Array.isArray(res.data)) {
        const backendEmps: EmployeeRecord[] = res.data.map((u: any) => ({
          id: u.id || u._id,
          name: u.name,
          firstName: u.name?.split(' ')[0] || '',
          lastName: u.name?.split(' ').slice(1).join(' ') || '',
          email: u.email,
          mobile: u.mobile,
          role: (u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Employee') as TeamRole,
          department: u.department || 'Audit & Taxation',
          designation: u.designation || 'Staff',
          shift: u.shift || 'General (09:30 AM - 06:30 PM)',
          initials: u.initials || 'U',
          status: (u.status === 'suspended' ? 'Deactivated' : 'Active') as any,
          permissions: u.permissions || getPresetPermissions(u.role || 'Employee'),
          clientsCount: 0,
          tasksCount: 0,
          recurringCount: 0,
          createdAt: u.createdAt || new Date().toISOString(),
          costPerHour: u.internalCostRatePaisePerHour == null ? undefined : Number(u.internalCostRatePaisePerHour) / 100,
        }));
        if (backendEmps.length > 0) {
          this.saveEmployees(backendEmps);
          return backendEmps;
        }
      }
    } catch {
      // fallback to local storage
    }
    return this.getEmployees();
  },

  // Attendance
  getTodayAttendance(): TodayAttendanceRecord[] {
    const list = safeGet<TodayAttendanceRecord[]>(ATTENDANCE_KEY, INITIAL_TODAY_ATTENDANCE);
    const cleaned = list.filter((a) => !a.employeeId?.startsWith('emp_ka_'));
    if (cleaned.length !== list.length) safeSet(ATTENDANCE_KEY, cleaned);
    const employees = this.getEmployees();
    const empRoleMap = new Map(employees.map((e) => [e.id, e.role]));
    return [...cleaned].sort((a, b) => {
      const roleA = empRoleMap.get(a.employeeId);
      const roleB = empRoleMap.get(b.employeeId);
      const diff = getRoleRank(roleA) - getRoleRank(roleB);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  },

  saveTodayAttendance(records: TodayAttendanceRecord[]): void {
    safeSet(ATTENDANCE_KEY, records);
  },

  // Regularization
  getRegularizations(): RegularizationRecord[] {
    const list = safeGet<RegularizationRecord[]>(REGULARIZATIONS_KEY, INITIAL_REGULARIZATIONS);
    const cleaned = list.filter((r) => !r.employeeId?.startsWith('emp_ka_'));
    if (cleaned.length !== list.length) safeSet(REGULARIZATIONS_KEY, cleaned);
    return cleaned;
  },

  updateRegularizationStatus(id: string, status: 'Approved' | 'Rejected'): void {
    const regs = this.getRegularizations().map((r) => {
      if (r.id === id) {
        return { ...r, status, approvalStatus: status };
      }
      return r;
    });
    safeSet(REGULARIZATIONS_KEY, regs);
  },

  // Leaves
  getLeaveApplications(): LeaveApplication[] {
    const list = safeGet<LeaveApplication[]>(LEAVES_KEY, INITIAL_LEAVE_APPLICATIONS);
    const cleaned = list.filter((l) => !l.employeeId?.startsWith('emp_ka_'));
    if (cleaned.length !== list.length) safeSet(LEAVES_KEY, cleaned);
    const employees = this.getEmployees();
    const empRoleMap = new Map(employees.map((e) => [e.id, e.role]));
    return [...cleaned].sort((a, b) => {
      const roleA = empRoleMap.get(a.employeeId);
      const roleB = empRoleMap.get(b.employeeId);
      const diff = getRoleRank(roleA) - getRoleRank(roleB);
      if (diff !== 0) return diff;
      return a.applicant.localeCompare(b.applicant);
    });
  },

  saveLeaveApplications(records: LeaveApplication[]): void {
    safeSet(LEAVES_KEY, records);
  },

  updateLeaveStatus(id: string, status: 'Approved' | 'Rejected', remarks?: string): void {
    const leaves = this.getLeaveApplications().map((l) => {
      if (l.id === id) {
        return {
          ...l,
          status,
          rejectionRemarks: remarks,
          lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };
      }
      return l;
    });
    safeSet(LEAVES_KEY, leaves);
  },

  getLeaveSummary(): LeaveSummaryRecord[] {
    const list = safeGet<LeaveSummaryRecord[]>(LEAVE_SUMMARY_KEY, INITIAL_LEAVE_SUMMARY);
    const cleaned = list.filter((ls) => !ls.employeeId?.startsWith('emp_ka_'));
    if (cleaned.length !== list.length) safeSet(LEAVE_SUMMARY_KEY, cleaned);
    const employees = this.getEmployees();
    const empRoleMap = new Map(employees.map((e) => [e.id, e.role]));
    return [...cleaned].sort((a, b) => {
      const roleA = empRoleMap.get(a.employeeId);
      const roleB = empRoleMap.get(b.employeeId);
      const diff = getRoleRank(roleA) - getRoleRank(roleB);
      if (diff !== 0) return diff;
      return a.applicant.localeCompare(b.applicant);
    });
  },

  // Reimbursements
  getReimbursements(): ReimbursementClaim[] {
    const list = safeGet<ReimbursementClaim[]>(REIMBURSEMENTS_KEY, INITIAL_REIMBURSEMENTS);
    const cleaned = list.filter((rb) => !rb.employeeId?.startsWith('emp_ka_'));
    if (cleaned.length !== list.length) safeSet(REIMBURSEMENTS_KEY, cleaned);
    const employees = this.getEmployees();
    const empRoleMap = new Map(employees.map((e) => [e.id, e.role]));
    return [...cleaned].sort((a, b) => {
      const roleA = empRoleMap.get(a.employeeId);
      const roleB = empRoleMap.get(b.employeeId);
      const diff = getRoleRank(roleA) - getRoleRank(roleB);
      if (diff !== 0) return diff;
      return a.applicant.localeCompare(b.applicant);
    });
  },

  updateReimbursementStatus(id: string, status: 'Applied' | 'Approved' | 'Rejected', paid?: boolean): void {
    const list: ReimbursementClaim[] = this.getReimbursements().map((r) => {
      if (r.id === id) {
        return {
          ...r,
          status,
          paid: paid !== undefined ? paid : (status === 'Approved' ? true : r.paid),
        };
      }
      return r;
    });
    safeSet(REIMBURSEMENTS_KEY, list);
  },

  syncWithAuthUsers(employees: EmployeeRecord[]): void {
    if (!isBrowser()) return;
    try {
      const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
      let authUsers: Array<{
        id: string;
        name: string;
        email: string;
        mobile: string;
        firmName: string;
        role: string;
        initials: string;
        createdAt?: string;
        status?: 'Active' | 'Deactivated' | 'Resigned';
        permissions?: RolePermissionsMap;
      }> = rawUsers ? JSON.parse(rawUsers) : [];

      authUsers = authUsers.filter(
        (u) => !u.email?.includes('@krishnaassociates.example') && !u.id?.includes('emp_ka_')
      );

      employees.forEach((emp) => {
        const cleanEmail = emp.email.toLowerCase().trim();
        const existingIdx = authUsers.findIndex(
          (u) => u.email.toLowerCase().trim() === cleanEmail ||
                 u.mobile.replace(/\D/g, '').slice(-10) === emp.mobile.replace(/\D/g, '').slice(-10)
        );

        const authRole = emp.role.toLowerCase();
        if (existingIdx >= 0) {
          authUsers[existingIdx] = {
            ...authUsers[existingIdx],
            name: emp.name,
            role: authRole,
            initials: emp.initials,
            status: emp.status,
            permissions: emp.permissions,
          };
        } else {
          authUsers.push({
            id: `usr_${emp.id}`,
            name: emp.name,
            email: emp.email,
            mobile: emp.mobile,
            firmName: 'Krishna Associates',
            role: authRole,
            initials: emp.initials,
            status: emp.status,
            permissions: emp.permissions,
            createdAt: emp.createdAt,
          });
        }
      });

      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(authUsers));
    } catch {
      // ignore
    }
  },
};
