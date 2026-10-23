import { User, RegisterOrgPayload } from "./authTypes";
import { teamStore } from "../team/teamStore";
import { request, ApiError } from "../../services/apiClient";

export const DEMO_OTP = "123456";
export const SHOW_DEMO_HINT = true;

// Real-data mode: No seeded demo users
const INITIAL_DEMO_USERS: User[] = [];

const STORAGE_USERS_KEY = "turia_demo_registered_users";

function getStoredUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([]));
      return [];
    }
    const list: User[] = JSON.parse(raw);
    const cleaned = list.filter((u) => {
      const isDemoId = u.id?.startsWith('usr_ka_') || u.id?.startsWith('emp_ka_') || u.id?.startsWith('usr_demo_');
      const isDemoEmail =
        u.email?.includes('@krishnaassociates.example') ||
        u.email?.includes('@example.com') ||
        u.email?.includes('john.deo@gmail.com');
      return !isDemoId && !isDemoEmail;
    });
    if (cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

function saveStoredUsers(users: User[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage errors in demo mode
  }
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Simulate network delay */
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export interface DuplicateConflictResult {
  hasConflict: boolean;
  conflictingFields: string[];
  message: string;
}

export const authService = {
  /**
   * Get all registered users and team members combined.
   */
  getAllUsers(): User[] {
    const stored = getStoredUsers();
    try {
      const employees = teamStore.getEmployees();
      const combined = [...stored];
      employees.forEach((emp) => {
        const cleanEmail = emp.email.toLowerCase().trim();
        const existingIdx = combined.findIndex((u) => u.email.toLowerCase().trim() === cleanEmail);
        if (existingIdx >= 0) {
          combined[existingIdx] = {
            ...combined[existingIdx],
            name: emp.name,
            role: emp.role.toLowerCase(),
            initials: emp.initials,
            orgId: combined[existingIdx].orgId || emp.orgId || "",
            department: emp.department,
            designation: emp.designation,
            status: emp.status,
            permissions: emp.permissions,
          };
        } else {
          combined.push({
            id: emp.id,
            name: emp.name,
            email: emp.email,
            mobile: emp.mobile,
            firmName: (emp as any).firmName || "Ayatrio Practice",
            role: emp.role.toLowerCase(),
            initials: emp.initials,
            orgId: emp.orgId || "",
            department: emp.department,
            designation: emp.designation,
            status: emp.status,
            permissions: emp.permissions,
            createdAt: emp.createdAt,
          });
        }
      });
      return combined;
    } catch {
      return stored;
    }
  },

  /**
   * Look up if a user exists by email or mobile (Calls Backend with local fallback).
   */
  async lookupUser(identifier: string, type: "email" | "mobile"): Promise<User | null> {
    try {
      const res = await request<{ exists: boolean; user: any }>("/auth/lookup", {
        method: "POST",
        body: JSON.stringify({ identifier, type }),
      });

      if (res.data?.user) {
        const u = res.data.user;
        return {
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          firmName: u.firmName || u.orgId?.name || "Practice Firm",
          role: u.role,
          initials: u.initials || computeInitials(u.name),
          orgId: String(u.orgId?._id || u.orgId || ""),
          createdAt: u.createdAt,
          department: u.department,
          designation: u.designation,
          status: u.status,
          employeeId: u.employeeId,
          permissions: u.permissions,
        };
      }
    } catch {
      // Backend offline or unreachable: fall back to local mock lookup
    }

    await delay(200);
    const users = this.getAllUsers();
    const cleanId = identifier.trim().toLowerCase();

    if (type === "email") {
      return users.find((u) => u.email.toLowerCase() === cleanId) || null;
    } else {
      const cleanNum = identifier.replace(/\D/g, "").slice(-10);
      return users.find((u) => u.mobile.replace(/\D/g, "").slice(-10) === cleanNum) || null;
    }
  },

  /**
   * Check whether any of the four organization/user fields conflict with an existing record.
   */
  checkOrganizationDuplicates(payload: RegisterOrgPayload): DuplicateConflictResult {
    const users = this.getAllUsers();
    const normName = payload.name.trim().toLowerCase().replace(/\s+/g, " ");
    const normFirm = payload.firmName.trim().toLowerCase().replace(/\s+/g, " ");
    const normEmail = payload.email.trim().toLowerCase();
    const normMobile = payload.mobile.replace(/\D/g, "").slice(-10);

    const conflicts: Set<string> = new Set();

    for (const u of users) {
      if (u.name && u.name.trim().toLowerCase().replace(/\s+/g, " ") === normName) {
        conflicts.add("Person's Name");
      }
      if (u.firmName && u.firmName.trim().toLowerCase().replace(/\s+/g, " ") === normFirm) {
        conflicts.add("Organization Name");
      }
      if (u.email && u.email.trim().toLowerCase() === normEmail) {
        conflicts.add("Email");
      }
      if (u.mobile && u.mobile.replace(/\D/g, "").slice(-10) === normMobile) {
        conflicts.add("Contact Number");
      }
    }

    const conflictingFields = Array.from(conflicts);
    if (conflictingFields.length > 0) {
      const fieldListStr = conflictingFields.join(" and ");
      return {
        hasConflict: true,
        conflictingFields,
        message: `The ${fieldListStr} you entered is already in use. Kindly log in if you are already a user.`,
      };
    }

    return {
      hasConflict: false,
      conflictingFields: [],
      message: "",
    };
  },

  /**
   * Send an OTP to email or mobile via Backend.
   */
  async sendOtp(target: string, type: "email" | "mobile"): Promise<{ success: boolean; message: string }> {
    try {
      const res = await request<{ success: boolean; message: string }>("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ target, type }),
      });
      return {
        success: true,
        message: res.message || `OTP sent to ${target}`,
      };
    } catch {
      await delay(200);
      return {
        success: true,
        message: `OTP sent to ${target}`,
      };
    }
  },

  /**
   * Verify an OTP code and receive JWT tokens.
   */
  async verifyOtp(
    target: string,
    code: string
  ): Promise<{ success: boolean; user?: User; message: string }> {
    try {
      const res = await request<{ user: any; accessToken: string }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ target, code }),
      });

      if (res.data?.user) {
        const u = res.data.user;
        const resolvedOrgId = String(u.orgId?._id || u.orgId || "");
        const verifiedUser: User = {
          id: String(u.id || u._id || ""),
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          firmName: u.firmName || u.orgId?.name || "Ayatrio Practice",
          role: u.role || "admin",
          initials: u.initials || computeInitials(u.name),
          orgId: resolvedOrgId,
          token: res.data.accessToken,
          createdAt: u.createdAt,
          department: u.department,
          designation: u.designation,
          status: u.status,
          employeeId: u.employeeId,
          permissions: u.permissions,
        };

        return {
          success: true,
          user: verifiedUser,
          message: "Code verified successfully.",
        };
      }

      return {
        success: false,
        message: res.message || "Invalid OTP code. Please enter the correct code.",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Invalid OTP code. Please enter the correct code.",
      };
    }
  },

  /**
   * Register a new organization and user with backend JWT issuance.
   */
  async registerOrganization(
    payload: RegisterOrgPayload
  ): Promise<{ success: boolean; user?: User; message: string; conflictingFields?: string[] }> {
    // 1. Enforce local 4-field duplicate check
    const dupCheck = this.checkOrganizationDuplicates(payload);
    if (dupCheck.hasConflict) {
      return {
        success: false,
        conflictingFields: dupCheck.conflictingFields,
        message: dupCheck.message,
      };
    }

    try {
      const res = await request<{ user: any; accessToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.data?.user) {
        const u = res.data.user;
        const resolvedOrgId = String(u.orgId?._id || u.orgId || "");
        const registeredUser: User = {
          id: String(u.id || u._id || ""),
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          firmName: payload.firmName.trim(),
          role: "admin",
          initials: computeInitials(payload.name),
          orgId: resolvedOrgId,
          token: res.data.accessToken,
          createdAt: u.createdAt || new Date().toISOString(),
        };

        const users = getStoredUsers();
        users.push(registeredUser);
        saveStoredUsers(users);

        return {
          success: true,
          user: registeredUser,
          message: "Organization registered successfully with JWT session.",
        };
      }

      return {
        success: false,
        message: res.message || "Failed to register organization.",
      };
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 409) {
        return {
          success: false,
          conflictingFields: ["Email or Mobile"],
          message: err.message,
        };
      }
      return {
        success: false,
        message: err.message || "Registration failed. Please try again.",
      };
    }
  },

  /**
   * Revoke session on backend
   */
  async logout(): Promise<void> {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
  },

  /**
   * Get all seeded demo accounts for quick reference/testing.
   */
  getDemoUsers(): User[] {
    return this.getAllUsers();
  },
};
