"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "./auth/AuthContext";

const AppShellContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isAuthPage) {
    return (
      <main className="min-h-screen w-full bg-[var(--bg-app)] text-[var(--text-main)]">
        {children}
      </main>
    );
  }

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
          {children}
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
