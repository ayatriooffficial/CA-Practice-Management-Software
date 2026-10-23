"use client";

import React from "react";
import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";
import { useAuth } from "@/components/auth/AuthContext";
import { AccessDenied } from "@/components/team/AccessDenied";

export default function ProposalPage() {
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || "").toLowerCase() === "employee";

  if (isEmployee) {
    return <AccessDenied moduleName="Proposals" actionName="view" />;
  }

  return (
    <EmptyPagePlaceholder
      title="Proposal"
      category="Sidebar"
      description="Draft and manage client engagement proposals, fee quotation letters, and contracts."
      iconName="FileText"
      actionText="Create Proposal"
    />
  );
}
