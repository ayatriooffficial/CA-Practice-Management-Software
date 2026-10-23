"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "./authTypes";
import { authService } from "./authService";
import { request } from "../../services/apiClient";

import { getPresetPermissions } from "../team/permissionsConfig";

export function computeInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchToUser: (target: 'employee' | 'admin' | 'vikram') => void;
}

const STORAGE_KEY = "turia_current_user";

export const DEMO_EMPLOYEE_USER: User = {
  id: "6ad9f7c459ba9327d3d347ae",
  orgId: "6ad9e0000000000000000001",
  name: "Vikram Singhania",
  email: "vikram@ayatrio.com",
  mobile: "8080014896",
  role: "employee",
  firmName: "Ayatrio Practice",
  initials: "VS",
  department: "Audit & Taxation",
  designation: "Staff",
  status: "Active",
  permissions: getPresetPermissions("Employee"),
};

export const DEFAULT_USER: User = {
  id: "6ad9e23bf460aa2e6102c0c8",
  orgId: "6ad9e0000000000000000001",
  name: "Deepak Sahani",
  email: "deepak.sahani@krishnaassociates.example",
  mobile: "9876543210",
  firmName: "Ayatrio Practice",
  role: "admin",
  initials: "DS",
  createdAt: "2026-01-15T09:00:00Z",
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  login: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  switchToUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors
    } finally {
      setCurrentUser(null);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("turia_user_logged_out", "true");
          localStorage.removeItem(STORAGE_KEY);
          document.cookie = "token=; Max-Age=0; path=/;";
          document.cookie = "refreshToken=; Max-Age=0; path=/;";
          document.cookie = "turia_access_token=; Max-Age=0; path=/;";
          document.cookie = "turia_refresh_token=; Max-Age=0; path=/;";
        } catch {}
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await request<any>("/auth/me");
      if (res.data) {
        const u = res.data;
        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        const existingToken = stored ? JSON.parse(stored).token : undefined;
        const resolvedOrgId = String(
          u.orgId?._id || u.orgId || (stored ? JSON.parse(stored).orgId : "") || ""
        );

        const roleLower = (u.role || "employee").toLowerCase();
        let resolvedPerms = u.permissions;
        if (!resolvedPerms || Object.keys(resolvedPerms).length === 0) {
          resolvedPerms = getPresetPermissions(roleLower === "admin" ? "Admin" : "Employee");
        }

        const updatedUser: User = {
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          firmName: u.firmName || u.orgId?.name || "Ayatrio Practice",
          role: roleLower,
          initials: u.initials || computeInitials(u.name),
          orgId: resolvedOrgId,
          createdAt: u.createdAt,
          department: u.department,
          designation: u.designation,
          status: u.status,
          employeeId: u.employeeId,
          permissions: resolvedPerms || u.permissions || {},
          token: existingToken,
        };

        setCurrentUser(updatedUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
          if (resolvedOrgId) {
            localStorage.setItem("x-org-id", resolvedOrgId);
          }
        }
      }
    } catch {
      // Retain existing state if offline
    }
  }, []);

  const login = useCallback((user: User) => {
    const roleLower = (user.role || "employee").toLowerCase();
    let resolvedPerms = user.permissions;
    if (!resolvedPerms || Object.keys(resolvedPerms).length === 0) {
      resolvedPerms = getPresetPermissions(roleLower === "admin" ? "Admin" : "Employee");
    }

    const enrichedUser: User = {
      ...user,
      role: roleLower,
      permissions: resolvedPerms,
      initials: computeInitials(user.name),
    };
    setCurrentUser(enrichedUser);
    try {
      localStorage.removeItem("turia_user_logged_out");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enrichedUser));
      if (enrichedUser.orgId) localStorage.setItem("x-org-id", enrichedUser.orgId);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const switchToUser = useCallback((target: 'employee' | 'admin' | 'vikram') => {
    const selected = (target === 'employee' || target === 'vikram') ? DEMO_EMPLOYEE_USER : DEFAULT_USER;
    setCurrentUser(selected);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("turia_user_logged_out");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      } catch {}
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem("turia_user_logged_out") === "true") {
        setCurrentUser(null);
        return;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: User = JSON.parse(stored);
        const isLegacyFake =
          parsed.id?.startsWith("usr_") ||
          parsed.orgId === "org_ayatrio_practice" ||
          parsed.token === "demo_access_token_verified";

        if (isLegacyFake) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem("x-org-id");
          setCurrentUser(null);
        } else if (parsed && parsed.name && parsed.orgId) {
          const roleLower = (parsed.role || "employee").toLowerCase();
          if (!parsed.permissions || Object.keys(parsed.permissions).length === 0) {
            parsed.permissions = getPresetPermissions(roleLower === "admin" ? "Admin" : "Employee");
          }
          parsed.initials = computeInitials(parsed.name);
          setCurrentUser(parsed);
          localStorage.setItem("x-org-id", parsed.orgId);

          if (parsed.token) {
            refreshProfile().catch(() => {});
          }
          return;
        }
      }
      setCurrentUser(null);
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }

    const handleSessionExpired = () => {
      logout();
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, [logout, refreshProfile]);
  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, refreshProfile, switchToUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
