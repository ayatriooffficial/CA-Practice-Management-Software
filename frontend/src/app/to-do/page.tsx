"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { TuriaTodoWorkspace } from "@/components/todo/TuriaTodoWorkspace";
import { Loader2 } from "lucide-react";

export default function ToDoPage() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full h-[calc(100vh-var(--header-height))] flex items-center justify-center p-8 bg-surface">
        <div className="flex flex-col items-center gap-2 text-subtle text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading to-do manager...</span>
        </div>
      </div>
    );
  }

  return <TuriaTodoWorkspace userName={currentUser?.name || "User"} />;
}
