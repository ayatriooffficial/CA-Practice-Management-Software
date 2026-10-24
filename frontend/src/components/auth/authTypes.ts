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
  orgId: string;
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
  password: string;
}

export type AuthMode = "email" | "mobile";

export interface VerificationState {
  isVerified: boolean;
  isVerifying: boolean;
  value: string;
}

export interface EmploymentRequestItem {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: string;
  statusChangedAt: string;
  decidedBy?: string;
  decidedByName?: string;
  reason?: string;
}

export interface EmploymentRequestsResponse {
  requests: EmploymentRequestItem[];
  counts: {
    accepted: number;
    rejected: number;
    pending: number;
    total: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
