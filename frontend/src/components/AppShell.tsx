"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";

import { PendingApprovalCard } from "./auth/PendingApprovalCard";

const AppShellContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPublicForm = pathname?.startsWith("/gst-form");
  const isPublicPage = isAuthPage || isPublicForm;

  useEffect(() => {
    if (!isLoading && !currentUser && !isPublicPage) {
      router.replace("/login");
    }
  }, [isLoading, currentUser, isPublicPage, router]);

  if (isPublicPage) {
    return (
      <main className="min-h-screen w-full bg-[var(--bg-app)] text-[var(--text-main)]">
        {children}
      </main>
    );
  }

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-app)] text-[var(--text-muted)] text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading practice portal...</span>
        </div>
      </div>
    );
  }

  const isPending =
    (currentUser?.role || "").toLowerCase() === "pending" ||
    (currentUser?.status || "").toLowerCase() === "pending";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-main)]">
      {/* Persistent Top Header */}
      <Header onOpenMobileMenu={() => setIsMobileNavOpen(true)} />

      {/* Layout Body with Sidebar + Main Content */}
      <div className="flex-1 flex w-full relative">
        {/* Left Navigation Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Main Workspace Content Area */}
        <main
          className="flex-1 min-w-0 transition-all"
          style={{
            backgroundColor: "var(--bg-app)",
          }}
        >
          {isPending ? <PendingApprovalCard /> : children}
        </main>
      </div>
    </div>
  );
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShellContent>{children}</AppShellContent>
      </AuthProvider>
    </ThemeProvider>
  );
};
