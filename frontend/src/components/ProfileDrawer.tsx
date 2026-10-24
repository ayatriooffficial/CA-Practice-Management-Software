"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth/AuthContext";
import {
  X,
  User,
  Settings,
  ChevronRight,
  Tv2,
  Gift,
  Palette,
  Bot,
  LogOut,
  Smartphone,
  Building2,
} from "lucide-react";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { currentUser, logout, switchToUser } = useAuth();
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          className="w-80 sm:w-84 md:w-88 flex flex-col shadow-2xl transition-transform animate-in slide-in-from-right duration-250 select-none overflow-hidden"
          style={{
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-main)",
          }}
          aria-label="User Profile Drawer"
        >
          {/* Top Banner (Purple Header with close button and centered avatar) */}
          <div
            className="relative h-28 shrink-0 flex items-start justify-between p-4"
            style={{
              background: "linear-gradient(135deg, #31719B 0%, #8f85f3 100%)",
            }}
          >
            {/* Close Button at top-left */}
            <button
              type="button"
              onClick={onClose}
              className="text-white/90 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close profile drawer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Overlapping Avatar Circle */}
            <div className="absolute -bottom-9 left-1/2 -translate-x-1/2">
              <div
                className="w-18 h-18 rounded-full flex items-center justify-center text-xl font-bold shadow-lg ring-4 ring-white dark:ring-gray-900 relative transition-transform hover:scale-105"
                style={{
                  backgroundColor: currentUser ? "#3D88BF" : "var(--bg-muted)",
                  color: currentUser ? "#ffffff" : "var(--text-muted)",
                }}
              >
                {currentUser ? (
                  <span suppressHydrationWarning>{currentUser.initials || currentUser.name.slice(0, 2).toUpperCase()}</span>
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
                {currentUser && (
                  <span
                    className="w-3.5 h-3.5 rounded-full absolute bottom-0.5 right-0.5 border-2 border-white dark:border-gray-900"
                    style={{ backgroundColor: "var(--status-online)" }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* User Name & Role Header */}
          {currentUser ? (
            <div className="pt-11 pb-3 px-6 text-center border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <h2
                suppressHydrationWarning
                className="text-base font-bold tracking-tight"
                style={{ color: "var(--text-main)" }}
              >
                {currentUser.name}
              </h2>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span
                  suppressHydrationWarning
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                    (currentUser.role || "").toLowerCase() === "employee"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300"
                      : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300"
                  }`}
                >
                  {(currentUser.role || "ADMIN").toUpperCase()}
                </span>
                {currentUser.firmName && (
                  <span className="text-[11px] font-medium text-gray-500">
                    · {currentUser.firmName}
                  </span>
                )}
              </div>
              <p suppressHydrationWarning className="text-xs text-gray-500 mt-1 font-normal">
                {currentUser.email || currentUser.mobile || "Logged In"}
              </p>

              {/* Quick One-Click Switcher for Instant Role Verification */}
              <div className="mt-3 p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-gray-500">Switch Session:</span>
                {(currentUser.role || "").toLowerCase() === "employee" ? (
                  <button
                    type="button"
                    onClick={() => {
                      switchToUser("admin");
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded bg-[#31719B] text-white font-semibold text-[11px] hover:bg-[#285c7d] transition-all cursor-pointer shadow-2xs"
                  >
                    Switch to Admin View
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      switchToUser("employee");
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded bg-amber-600 text-white font-semibold text-[11px] hover:bg-amber-700 transition-all cursor-pointer shadow-2xs"
                  >
                    Switch to Employee View
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-11 pb-2 px-6 text-center border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <h2 className="text-base font-bold tracking-tight text-gray-500 dark:text-gray-400">
                Not Logged In
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 font-normal">
                Sign in to access your organization workspace
              </p>
              <Link
                href="/login"
                onClick={onClose}
                className="inline-block mt-2.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--primary)" }}
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Scrollable Navigation Items */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {/* Group 1: My Profile & Settings */}
            <Link
              href="/onboarding"
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 hover:bg-purple-100 cursor-pointer group mb-1"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform" />
                <span className="font-semibold text-xs">Firm Profile Setup (Onboarding)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/team"
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] cursor-pointer group"
              style={{ color: "var(--text-main)" }}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500 group-hover:text-[var(--primary)] transition-colors" />
                <span>My Profile</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/services"
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] cursor-pointer group"
              style={{ color: "var(--text-main)" }}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-gray-500 group-hover:text-[var(--primary)] transition-colors" />
                <span>Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
            </Link>

            {/* Mobile Apps Card */}
            <div
              className="my-3 p-3.5 rounded-xl border shadow-2xs"
              style={{
                backgroundColor: "var(--bg-subtle)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-main)" }}
                  >
                    Mobile Apps
                  </span>
                </div>
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  iOS & Android
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Android / Google Play App Button */}
                <button
                  type="button"
                  onClick={() => alert("Redirecting to Google Play Store...")}
                  className="flex items-center gap-2 p-2 rounded-lg border transition-all duration-150 hover:border-[var(--primary)] hover:shadow-xs group cursor-pointer text-left"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-main)",
                  }}
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 transition-transform group-hover:scale-105">
                    {/* Official Google Play Logo */}
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                      <path
                        fill="#00C1A6"
                        d="M3.61 2.22c-.38.41-.61 1.01-.61 1.76v16.04c0 .75.23 1.35.61 1.76l.09.09 9.03-9.03v-.21L3.7 2.13l-.09.09z"
                      />
                      <path
                        fill="#0083D6"
                        d="M15.74 14.88l-3.01-3.01v-.21l3.01-3.01.07.04 3.56 2.02c1.02.58 1.02 1.52 0 2.1l-3.56 2.03-.07.04z"
                      />
                      <path
                        fill="#FFD400"
                        d="M15.81 14.84L12.73 11.76 3.61 20.88c.34.36.9.4 1.53.04l10.67-6.08"
                      />
                      <path
                        fill="#FF3A44"
                        d="M15.81 8.68L5.14 2.6c-.63-.36-1.19-.32-1.53.04l9.12 9.12 3.08-3.08z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[8px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500 leading-none">
                      GET IT ON
                    </div>
                    <div
                      className="text-[11px] font-bold truncate leading-tight mt-0.5 group-hover:text-[var(--primary)] transition-colors"
                      style={{ color: "var(--text-main)" }}
                    >
                      Google Play
                    </div>
                  </div>
                </button>

                {/* iOS App Store Button */}
                <button
                  type="button"
                  onClick={() => alert("Redirecting to Apple App Store...")}
                  className="flex items-center gap-2 p-2 rounded-lg border transition-all duration-150 hover:border-[var(--primary)] hover:shadow-xs group cursor-pointer text-left"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-main)",
                  }}
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 transition-transform group-hover:scale-105">
                    {/* Official Apple Logo */}
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4 shrink-0"
                      style={{ color: "var(--text-main)" }}
                    >
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.61 1.34-.55.63-1.03 1.67-.9 2.69.99.08 2-.45 2.59-1.18z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[8px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500 leading-none">
                      DOWNLOAD ON
                    </div>
                    <div
                      className="text-[11px] font-bold truncate leading-tight mt-0.5 group-hover:text-[var(--primary)] transition-colors"
                      style={{ color: "var(--text-main)" }}
                    >
                      App Store
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Group 2: Turia Demo Videos, Refer & Earn, App Customizer, Enroll Utility, Logout */}
            <Link
              href="/reports"
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] cursor-pointer group"
              style={{ color: "var(--text-main)" }}
            >
              <div className="flex items-center gap-3">
                <Tv2 className="w-4 h-4 text-gray-500 group-hover:text-[var(--primary)] transition-colors" />
                <span>Turia Demo Videos</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/leads"
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] cursor-pointer group"
              style={{ color: "var(--text-main)" }}
            >
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-gray-500 group-hover:text-[var(--primary)] transition-colors" />
                <span>Refer & Earn</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/services"
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] cursor-pointer group"
              style={{ color: "var(--text-main)" }}
            >
              <div className="flex items-center gap-3">
                <Palette className="w-4 h-4 text-gray-500 group-hover:text-[var(--primary)] transition-colors" />
                <span>App Customizer</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/registry"
              onClick={onClose}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] cursor-pointer group"
              style={{ color: "var(--text-main)" }}
            >
              <div className="flex items-center gap-3">
                <Bot className="w-4 h-4 text-gray-500 group-hover:text-[var(--primary)] transition-colors" />
                <span>Enroll Utility</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <div className="my-1 border-t" style={{ borderColor: "var(--border-subtle)" }} />

            {currentUser ? (
              <button
                type="button"
                onClick={async () => {
                  onClose();
                  await logout();
                  router.push("/login");
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-red-600 group-hover:scale-105 transition-transform" />
                  <span>Logout</span>
                </div>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-[#31719B] dark:text-[#60a5fa] cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[#31719B] dark:text-[#60a5fa] group-hover:scale-105 transition-transform" />
                  <span>Sign In</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
