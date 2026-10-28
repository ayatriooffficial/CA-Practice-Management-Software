"use client";

import React from "react";
import { GlobalDscPage } from "@/components/dsc/GlobalDscPage";
import { useAuth } from "@/components/auth/AuthContext";
import { AccessDenied } from "@/components/team/AccessDenied";

export default function DscRoute() {
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || "").toLowerCase() === "employee";

  if (isEmployee) {
    return <AccessDenied moduleName="DSC Management" actionName="view" />;
  }

  return <GlobalDscPage />;
}
