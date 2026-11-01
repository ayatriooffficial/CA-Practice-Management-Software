"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { AdminTodoView } from "@/components/todo/AdminTodoView";
import { EmployeeTodoView } from "@/components/todo/EmployeeTodoView";
import { Loader2 } from "lucide-react";

export default function ToDoPage() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex items-center justify-center p-8 bg-surface">
        <div className="flex flex-col items-center gap-2 text-subtle text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading to-do management...</span>
        </div>
      </div>
    );
  }

  const role = (currentUser?.role || "employee").toLowerCase().trim();
  const isAdmin = ["admin", "owner", "partner", "manager"].includes(role);

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] bg-surface p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {isAdmin ? (
          <AdminTodoView userName={currentUser?.name || "Admin"} />
        ) : (
          <EmployeeTodoView userName={currentUser?.name || "Employee"} />
        )}
      </div>
    </div>
  );
}
