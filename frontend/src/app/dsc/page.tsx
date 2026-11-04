"use client";

import React from "react";
import { GlobalDscPage } from "@/components/dsc/GlobalDscPage";
import { useAuth } from "@/components/auth/AuthContext";
import { usePermission } from "@/components/team/usePermission";
import { AccessDenied } from "@/components/team/AccessDenied";

export default function DscRoute() {
  const { currentUser } = useAuth();
  const { canView } = usePermission();

  if (!canView("digital_signature")) {
    return <AccessDenied moduleName="DSC Management" actionName="view" />;
  }

  return <GlobalDscPage />;
}
