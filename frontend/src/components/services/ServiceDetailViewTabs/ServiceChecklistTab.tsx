"use client";

import React from "react";
import { RotateCcw, Upload, Plus, Check, Trash2 } from "lucide-react";
import { ServiceChecklistItem } from "@/data/serviceData";

interface ServiceChecklistTabProps {
  checklist: ServiceChecklistItem[];
  isAddChecklistInline: boolean;
  setIsAddChecklistInline: (open: boolean) => void;
  checklistTitle: string;
  setChecklistTitle: (val: string) => void;
  handleAddChecklist: () => Promise<void>;
  handleDeleteChecklist: (id: string) => Promise<void>;
  handleSyncToTasks: () => Promise<void>;
  isSyncing: boolean;
  showToast: (msg: string) => void;
}

export const ServiceChecklistTab: React.FC<ServiceChecklistTabProps> = ({
  checklist,
  isAddChecklistInline,
  setIsAddChecklistInline,
  checklistTitle,
  setChecklistTitle,
  handleAddChecklist,
  handleDeleteChecklist,
  handleSyncToTasks,
  isSyncing,
  showToast,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Cols: Checklist items management */}
      <div className="lg:col-span-2 gap-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-main)]">
              Checklists ({checklist.length})
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
              onClick={() => showToast("Checklist imported from standard template")}
              className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddChecklistInline(true)}
              style={{ backgroundColor: "var(--primary)" }}
              className="h-8 px-3.5 text-xs font-semibold rounded-lg text-white hover:opacity-95 transition-all flex items-center gap-x-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add</span>
            </button>
          </div>
        </div>

        {/* Inline Add Input Box matching Screenshot 3 */}
        {isAddChecklistInline && (
          <div className="p-3.5 rounded-xl border border-[var(--primary)] bg-[var(--brand-soft)] gap-y-2.5 animate-in fade-in">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Verify PAN details for all deductees"
                value={checklistTitle}
                onChange={(e) => setChecklistTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChecklist()}
                autoFocus
                className="flex-1 h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
              <button
                type="button"
                onClick={handleAddChecklist}
                style={{ backgroundColor: "var(--primary)" }}
                className="h-9 px-4 text-xs font-semibold text-white rounded-lg cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddChecklistInline(false);
                  setChecklistTitle("");
                }}
                className="h-9 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Checklist items list */}
        <div className="rounded-xl border border-[var(--border-main)] divide-y divide-[var(--border-subtle)] overflow-hidden">
          {checklist.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No checklist items defined for this service. Click "+ Add" to create one.
            </div>
          ) : (
            checklist.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-x-3">
                  <div className="w-5 h-5 rounded border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-[var(--text-main)]">
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center gap-x-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                    Mandatory
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklist(item.id)}
                    className="text-[var(--text-subtle)] hover:text-[var(--danger)] p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right 1 Col: About Checklists card matching Screenshot 3 */}
      <div className="p-5 bg-[var(--bg-subtle)] gap-y-3 h-fit rounded-xl border border-[var(--border-main)]">
        <h4 className="text-sm font-bold text-[var(--text-main)]">
          About Checklists
        </h4>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          All checklist items are mandatory and cannot be skipped by the assignee when completing a task.
        </p>
        <div className="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-[11px] text-cyan-800 dark:text-cyan-300 leading-relaxed mt-2">
          <span className="font-bold">Sync</span> pushes checklist changes to all active tasks linked to this service.
        </div>
      </div>
    </div>
  );
};
