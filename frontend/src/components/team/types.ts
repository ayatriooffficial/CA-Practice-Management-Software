export type TeamRole = 'Admin' | 'Partner' | 'Manager' | 'Employee';

export const ROLE_HIERARCHY_RANK: Record<string, number> = {
  admin: 1,
  partner: 2,
  manager: 3,
  employee: 4,
};

export const getRoleRank = (role?: string): number => {
  if (!role) return 99;
  return ROLE_HIERARCHY_RANK[role.trim().toLowerCase()] ?? 99;
};

export type UserStatus = 'Active' | 'Deactivated' | 'Resigned';

export interface ModulePermission {
  module: string;
  moduleKey: string;
  view: boolean;
  addEdit: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
  canView?: boolean;
  canAddEdit?: boolean;
  canDelete?: boolean;
  canImport?: boolean;
  canExport?: boolean;
}

export type RolePermissionsMap = Record<string, {
  view: boolean;
  addEdit: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
}>;

export interface EmployeeAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface EmployeePersonalDetails {
  dob?: string;
  gender?: string;
  idProofType?: string;
  idNumber?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  education?: string;
  fatherName?: string;
  motherName?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
}

export interface EmployeeRecord {
  id: string;
  firstName: string;
  lastName?: string;
  name: string;
  email: string;
  mobile: string;
  designation: string;
  role: TeamRole;
  department: string;
  reportingTo?: string;
  shift: string;
  employeeId?: string;
  orgId?: string;
  joiningDate?: string;
  resignationDate?: string;
  salary?: number | string;
  costPerHour?: number | string;
  billingRate?: number | string;
  workExperience?: string;
  status: UserStatus;
  confirmationDate?: string;
  initials: string;
  clientsCount: number;
  tasksCount: number;
  recurringCount: number;
  lastPunchIn?: string;
  presentAddress?: EmployeeAddress;
  permanentAddress?: EmployeeAddress;
  sameAddress?: boolean;
  personalDetails?: EmployeePersonalDetails;
  permissions: RolePermissionsMap;
  createdAt: string;
}

export type AttendanceStatus = 'P' | 'A' | 'WK' | 'HLY' | '1st-half' | '2nd-half' | 'future';

export interface TodayAttendanceRecord {
  id: string;
  employeeId: string;
  name: string;
  initials: string;
  status: string;
  clockIn: string;
  clockOut: string;
  totalHours: string;
  workLocation: string;
  clientOrTaskName: string;
  inTime: string;
  outTime: string;
  officeLocation: string;
  distanceRadius: string;
}

export interface AttendanceGridCell {
  dateStr: string;
  dayNumber: number;
  dayOfWeek: string;
  status: AttendanceStatus;
}

export interface RegularizationRecord {
  id: string;
  actions?: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  employeeName: string;
  employeeId: string;
  date: string;
  punchIn: string;
  punchOut: string;
  totalHours: string;
  workLocation: string;
  punchInLocation: string;
  punchOutLocation: string;
  officeLocation: string;
  distanceRadius: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Earned Leave';

export interface LeaveApplication {
  id: string;
  applicant: string;
  employeeId: string;
  leaveType: LeaveType;
  dateOfApplication: string;
  dateOfLeave: string;
  daysApplied: number;
  leavesTaken: number;
  leaveBalance: number;
  reason: string;
  rejectionRemarks?: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  lastUpdated: string;
}

export interface LeaveSummaryRecord {
  id: string;
  applicant: string;
  employeeId: string;
  leaveType: LeaveType;
  totalAvailable: number;
  totalLeaveTaken: number;
  balanceAvailable: number;
  year: string;
}

export interface ReimbursementClaim {
  id: string;
  type: 'internal' | 'task';
  applicant: string;
  employeeId: string;
  reason?: string;
  particulars?: string;
  date: string;
  amount: number;
  paidBy: string;
  method?: string;
  client?: string;
  task?: string;
  status: 'Applied' | 'Approved' | 'Rejected';
  paid: boolean;
  remarks?: string;
  linkedTo?: string;
  attachments?: string;
}
