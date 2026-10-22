"use client";

import React from "react";
import Link from "next/link";
import { Building } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  visualScene: React.ReactNode;
  variant?: "login" | "signup";
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  visualScene,
  variant = "login",
}) => {
  const isSignup = variant === "signup";

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row bg-white dark:bg-[#111827]">
      {/* Slim Brand Header for small viewports (<1024px / <900px) */}
      <header className="lg:hidden w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: "var(--primary, #3D6A9E)",
              color: "#ffffff",
            }}
          >
            <Building className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
            CA Practice
          </span>
        </Link>
      </header>

      {/* Left 50% Visual Panel (Hidden on screens < 1024px) */}
      <div className="hidden lg:block lg:w-1/2 relative min-h-screen">
        <div className="sticky top-0 h-screen w-full">
          {visualScene}
        </div>
      </div>

      {/* Right 50% Form Panel */}
      <div
        className={`w-full lg:w-1/2 min-h-[calc(100vh-64px)] lg:min-h-screen flex items-center bg-white dark:bg-[#0f172a] ${isSignup
            ? "justify-start py-8 px-6 lg:pl-[45px] lg:pr-[45px]"
            : "justify-center p-6 lg:p-0"
          }`}
      >
        <div
          className={`w-full flex flex-col justify-center ${isSignup ? "max-w-[570px]" : "max-w-[560px]"
            }`}
        >
          {/* Header Typography: exact 30px, weight 500, 12px gap to subtitle, 30px gap to form */}
          <div className="mb-[30px] flex flex-col gap-[12px]">
            <h1 className="text-[30px] font-medium tracking-tight text-[#1e293b] dark:text-white leading-[1.2]">
              Welcome to CA practice!
            </h1>
            <p className="text-[15.5px] sm:text-[16px] text-[#64748b] dark:text-gray-400 leading-[1.45] whitespace-nowrap">
              Access your practice dashboard to manage clients, filings, and compliance.
            </p>
          </div>

          {/* Form Content */}
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
