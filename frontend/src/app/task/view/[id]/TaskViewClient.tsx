"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { TaskDetailView } from "@/components/tasks/TaskDetailView";

export function TaskViewClient({ taskId }: { taskId: string }) {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <TaskDetailView
        taskId={taskId}
        onBack={() => router.push("/task")}
      />
    </div>
  );
}
