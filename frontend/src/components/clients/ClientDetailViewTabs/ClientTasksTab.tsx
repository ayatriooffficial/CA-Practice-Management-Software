import React from "react";
import { Loader2 } from "lucide-react";
import { TaskItem } from "@/data/taskData";

export interface ClientTasksTabProps {
  clientTasks: TaskItem[];
  isLoadingTasks: boolean;
}

export const ClientTasksTab: React.FC<ClientTasksTabProps> = ({
  clientTasks,
  isLoadingTasks,
}) => {
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          Client Tasks ({clientTasks.length})
        </h2>
      </div>
      {isLoadingTasks ? (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#31719B]" />
          <span className="text-xs text-gray-500 mt-2 block">Loading client tasks...</span>
        </div>
      ) : clientTasks.length === 0 ? (
        <div className="py-16 text-center text-gray-400 font-medium text-xs">
          No active tasks found for this client.
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-slim">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Task Name
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Service
                </th>
                <th className="px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Priority
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Status
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Due Date
                </th>
                <th className="px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Assignee
                </th>
              </tr>
            </thead>
            <tbody>
              {clientTasks.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                >
                  <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white">
                    {t.taskName}
                  </td>
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {t.serviceName}
                  </td>
                  <td className="px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === "Urgent"
                          ? "bg-rose-100 text-rose-700"
                          : t.priority === "High"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                        t.status === "Completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : t.status === "Overdue"
                          ? "bg-red-100 text-red-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {t.targetDueDate}
                  </td>
                  <td className="px-4 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300">
                    {t.assigneeName || "Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
