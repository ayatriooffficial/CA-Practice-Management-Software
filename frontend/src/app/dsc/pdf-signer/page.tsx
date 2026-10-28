"use client";

import React from "react";
import { PdfSignerPage } from "@/components/pdfSigner/PdfSignerPage";
import { useAuth } from "@/components/auth/AuthContext";
import { AccessDenied } from "@/components/team/AccessDenied";

export default function PdfSignerRoute() {
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || "").toLowerCase() === "employee";

  if (isEmployee) {
    return <AccessDenied moduleName="PDF Signer" actionName="view" />;
  }

  return (
    <div className="w-full p-2">
      <PdfSignerPage />
    </div>
  );
}
