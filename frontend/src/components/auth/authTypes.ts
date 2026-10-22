export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  firmName: string;
  role: "admin" | "partner" | "associate" | "staff" | "manager" | "employee" | string;
  initials: string;
  createdAt?: string;
  department?: string;
  designation?: string;
  status?: 'Active' | 'Deactivated' | 'Resigned';
  employeeId?: string;
  orgId?: string;
  token?: string;
  permissions?: Record<string, {
    view: boolean;
    addEdit: boolean;
    delete: boolean;
    import: boolean;
    export: boolean;
  }>;
}

export interface RegisterOrgPayload {
  firmName: string;
  name: string;
  email: string;
  mobile: string;
}

export type AuthMode = "email" | "mobile";

export interface VerificationState {
  isVerified: boolean;
  isVerifying: boolean;
  value: string;
}
