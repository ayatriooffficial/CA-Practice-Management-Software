"use client";

import React from "react";
import { RotateCcw, Upload, Plus, Trash2, GripVertical } from "lucide-react";
import { ServiceSubTask } from "@/data/serviceData";
import { usePermission } from "../../team/usePermission";

interface ServiceSubTasksTabProps {
  subTasks: ServiceSubTask[];
  handleSyncToTasks: () => Promise<void>;
  isSyncing: boolean;
  setIsAddSubTaskOpen: (open: boolean) => void;
  handleDeleteSubTask: (id: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export const ServiceSubTasksTab: React.FC<ServiceSubTasksTabProps> = ({
  subTasks,
  handleSyncToTasks,
  isSyncing,
  setIsAddSubTaskOpen,
  handleDeleteSubTask,
  showToast,
}) => {
  const { canDelete } = usePermission();
  return (
    <div className="gap-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--text-main)]">
            Sub Tasks ({subTasks.length})
          </h3>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5">
            Items auto-populate every task created from this service.
          </p>
        </div>

        <div className="flex items-center gap-x-2">
          <button
            type="button"
            onClick={handleSyncToTasks}
            disabled={isSyncing}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer disabled:opacity-50"
            title="Push changes to all active tasks linked to this service"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => showToast("Subtasks imported from standard template")}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddSubTaskOpen(true)}
            style={{ backgroundColor: "var(--primary)" }}
            className="h-8 px-3.5 text-xs font-semibold rounded-lg text-white hover:opacity-95 transition-all flex items-center gap-x-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add</span>
          </button>
        </div>
      </div>

      {/* Sub Tasks Table matching Screenshot 4 */}
      <div className="rounded-xl border border-[var(--border-main)] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className="border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 font-semibold"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <th className="py-2.5 px-3 w-12 text-center">Drag</th>
              <th className="py-2.5 px-3 w-16">Index</th>
              <th className="py-2.5 px-4">Name</th>
              <th className="py-2.5 px-4">Description</th>
              <th className="py-2.5 px-3">Total Hours</th>
              <th className="py-2.5 px-3 text-center">Percentage</th>
              <th className="py-2.5 px-3 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-main)]">
            {subTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No sub tasks defined for this service. Click "+ Add" to create one.
                </td>
              </tr>
            ) : (
              subTasks.map((st, idx) => (
                <tr key={st.id || idx} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-2.5 px-3 text-center text-[var(--text-subtle)] cursor-grab">
                    <GripVertical className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[var(--text-subtle)]">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-[var(--text-main)]">
                    {st.name}
                  </td>
                  <td className="py-2.5 px-4 text-[var(--text-subtle)]">
                    {st.description || "-"}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[var(--text-subtle)]">
                    {st.totalHours || "0 Hrs"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                      {st.percentage || 0}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {canDelete("services") ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteSubTask(st.id)}
                        className="text-[var(--text-subtle)] hover:text-[var(--danger)] p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
