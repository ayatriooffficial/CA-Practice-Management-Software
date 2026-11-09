"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "./Header";
import { TopLoadingBar } from "./ui/TopLoadingBar";
import { Sidebar } from "./Sidebar";
import { useSectionNavigation } from "../hooks/useSectionNavigation";
import { navigationProgress } from "../services/navigationProgress";
import { pageStateCache } from "../services/pageStateCache";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { PendingApprovalCard } from "./auth/PendingApprovalCard";

const AppShellContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();
  useSectionNavigation();
  const isNavigating = useSyncExternalStore(
    navigationProgress.subscribe,
    navigationProgress.isNavigationActive,
    () => false
  );
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPublicForm = pathname?.startsWith("/gst-form");
  const isPublicPage = isAuthPage || isPublicForm;

  useEffect(() => {
    navigationProgress.setLoading("auth", isLoading);
    return () => {
      navigationProgress.setLoading("auth", false);
    };
  }, [isLoading]);

  useEffect(() => {
    if (pathname && !isAuthPage) {
      pageStateCache.markLoaded(pathname);
    }
  }, [pathname, isAuthPage]);

  useEffect(() => {
    if (!isLoading && !currentUser && !isPublicPage) {
      router.replace("/login");
    }
  }, [isLoading, currentUser, isPublicPage, router]);

  if (isPublicPage) {
    return (
      <>
        <TopLoadingBar />
        <main
          aria-busy={isNavigating}
          className="min-h-screen w-full bg-[var(--bg-app)] text-[var(--text-main)]"
        >
          {children}
        </main>
      </>
    );
  }

  // If client-side auth is finished checking and user is unauthenticated, redirecting
  if (!isLoading && !currentUser) {
    return null;
  }

  const isPending =
    (currentUser?.role || "").toLowerCase() === "pending" ||
    (currentUser?.status || "").toLowerCase() === "pending";

  return (
    <>
      <TopLoadingBar />
      <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-main)]">
        {/* Persistent Top Header (renders immediately in SSR & hydration) */}
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
            aria-busy={isNavigating}
            className="flex-1 min-w-0 transition-all"
            style={{
              backgroundColor: "var(--bg-app)",
            }}
          >
            {isPending ? <PendingApprovalCard /> : children}
          </main>
        </div>
      </div>
    </>
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
