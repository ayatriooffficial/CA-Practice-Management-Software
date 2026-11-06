"use client";

import React, { Suspense } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { TuriaTodoWorkspace } from "@/components/todo/TuriaTodoWorkspace";
import { Loader2 } from "lucide-react";

export default function ToDoPage() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex items-center justify-center p-8 bg-white dark:bg-[#0f172a]">
        <div className="flex flex-col items-center gap-2 text-subtle text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
          <span>Loading to-do manager...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-2 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <Suspense
        fallback={
          <div className="w-full h-96 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2 text-subtle text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
              <span>Loading workspace...</span>
            </div>
          </div>
        }
      >
        <TuriaTodoWorkspace userName={currentUser?.name || "User"} />
      </Suspense>
    </div>
  );
}
