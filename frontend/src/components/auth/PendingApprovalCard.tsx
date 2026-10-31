"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, RefreshCw, Mail, User, ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "./AuthContext";
import { authService } from "./authService";

export const PendingApprovalCard: React.FC = () => {
  const { currentUser, refreshProfile, logout } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>("");

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await authService.getEmploymentStatus();
      setLastChecked(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(new Date())
      );

      if (res.status === "accepted" || (res.role && res.role !== "pending")) {
        // Automatically reload and update user state
        await refreshProfile();
        window.location.reload();
      } else if (res.status === "rejected") {
        await logout();
        window.location.href = "/login";
      }
    } catch {
      // Ignore background errors
    } finally {
      setIsChecking(false);
    }
  }, [refreshProfile, logout]);

  // Polling every 45s and on window focus
  useEffect(() => {
    // Initial check
    checkStatus();

    const interval = setInterval(() => {
      checkStatus();
    }, 45000);

    const onFocus = () => {
      checkStatus();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkStatus]);

  const formattedDate = currentUser?.createdAt
    ? new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(currentUser.createdAt))
    : new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());

  return (
    <div className="w-full min-h-[calc(100vh-120px)] flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-6">
        {/* Amber Clock Icon Container */}
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        {/* Status Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Pending Verification
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Employment request pending
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
            Your request has been sent and its status is pending. You can access the other sections once the admin accepts your employment request.
          </p>
        </div>

        {/* Details Card */}
        <div className="w-full bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 border border-gray-200 dark:border-gray-700/60 text-left space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              Applicant Name
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {currentUser?.name || "Applicant"}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              Registered Email
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {currentUser?.email || ""}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Submitted At
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {formattedDate} (IST)
            </span>
          </div>
        </div>

        {/* Action Buttons & Status Polling Indicator */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={checkStatus}
            disabled={isChecking}
            className="w-full sm:flex-1 h-11 rounded-lg text-xs font-semibold text-white bg-[#3D6A9E] hover:bg-[#3D6A9E] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
            <span>{isChecking ? "Checking Status..." : "Refresh Status"}</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full sm:w-auto px-4 h-11 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>

        {lastChecked && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Last checked at {lastChecked} IST • Auto-refreshes every 45s
          </p>
        )}
      </div>
    </div>
  );
};
