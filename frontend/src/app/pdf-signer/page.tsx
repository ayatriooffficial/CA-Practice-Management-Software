"use client";

import React from "react";
import { PdfSignerPage } from "@/components/pdfSigner/PdfSignerPage";
import { useAuth } from "@/components/auth/AuthContext";
import { AccessDenied } from "@/components/team/AccessDenied";

export default function StandalonePdfSignerRoute() {
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || "").toLowerCase() === "employee";

  if (isEmployee) {
    return <AccessDenied moduleName="PDF Signer" actionName="view" />;
  }

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors flex flex-col">
      <div className="w-full p-2">
        <PdfSignerPage />
      </div>
    </div>
  );
}
