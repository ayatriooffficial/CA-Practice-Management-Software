"use client";

import React, { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "../context/ThemeContext";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
};
