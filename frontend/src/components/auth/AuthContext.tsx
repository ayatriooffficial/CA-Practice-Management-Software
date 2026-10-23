"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "./authTypes";
import { authService } from "./authService";
import { request } from "../../services/apiClient";

export function computeInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const STORAGE_KEY = "turia_current_user";

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  login: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
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
          localStorage.removeItem(STORAGE_KEY);
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

        const updatedUser: User = {
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          firmName: u.firmName || u.orgId?.name || "Practice Firm",
          role: u.role,
          initials: u.initials || computeInitials(u.name),
          orgId: resolvedOrgId,
          createdAt: u.createdAt,
          department: u.department,
          designation: u.designation,
          status: u.status,
          employeeId: u.employeeId,
          permissions: u.permissions,
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
      // If /auth/me fails (e.g. offline or unauthenticated), retain existing or do not block
    }
  }, []);

  useEffect(() => {
    // 1. Initial hydration from storage
    try {
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
          parsed.initials = computeInitials(parsed.name);
          setCurrentUser(parsed);
          localStorage.setItem("x-org-id", parsed.orgId);

          // If token exists, verify with backend /auth/me in background
          if (parsed.token) {
            refreshProfile().catch(() => {});
          }
        }
      }
    } catch {
      // Ignore parse errors
    } finally {
      setIsLoading(false);
    }

    // 2. Listen for global session expiration events (dispatched by apiClient 401 handler)
    const handleSessionExpired = () => {
      logout();
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, [logout, refreshProfile]);

  const login = (user: User) => {
    const orgId = user.orgId || "";

    const enrichedUser: User = {
      id: user.id || "",
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      firmName: user.firmName || "Ayatrio Practice",
      role: user.role || "Admin",
      initials: user.initials || computeInitials(user.name),
      orgId: orgId,
      createdAt: user.createdAt || new Date().toISOString(),
      department: user.department || "General",
      designation: user.designation || "Staff",
      status: (user.status as any) || "Active",
      employeeId: user.employeeId || "",
      token: user.token,
      permissions: user.permissions || {},
    };

    setCurrentUser(enrichedUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enrichedUser));
      if (orgId) {
        localStorage.setItem("x-org-id", orgId);
      }
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
