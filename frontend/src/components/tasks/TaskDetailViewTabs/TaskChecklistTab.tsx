"use client";

import React from "react";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { TaskChecklistItem } from "@/data/taskData";
import { usePermission } from "../../team/usePermission";

interface TaskChecklistTabProps {
  checklist: TaskChecklistItem[];
  isAddChecklistInline: boolean;
  setIsAddChecklistInline: (open: boolean) => void;
  checklistTitle: string;
  setChecklistTitle: (val: string) => void;
  handleAddChecklist: () => Promise<void>;
  handleToggleChecklist: (itemId: string) => Promise<void>;
  handleDeleteChecklist: (itemId: string) => Promise<void>;
}

export const TaskChecklistTab: React.FC<TaskChecklistTabProps> = ({
  checklist,
  isAddChecklistInline,
  setIsAddChecklistInline,
  checklistTitle,
  setChecklistTitle,
  handleAddChecklist,
  handleToggleChecklist,
  handleDeleteChecklist,
}) => {
  const { canDelete } = usePermission();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
        <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center space-x-1.5">
          <CheckSquare className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <span>Checklists ({checklist?.length || 0})</span>
        </h3>
        <button
          type="button"
          onClick={() => setIsAddChecklistInline(true)}
          style={{ color: "var(--primary)" }}
          className="text-xs font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {isAddChecklistInline && (
        <div className="flex items-center space-x-2 p-2 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg">
          <input
            type="text"
            placeholder="Enter checklist item title..."
            value={checklistTitle}
            onChange={(e) => setChecklistTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddChecklist()}
            autoFocus
            className="flex-1 text-xs px-2.5 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <button
            type="button"
            onClick={handleAddChecklist}
            style={{ backgroundColor: "var(--primary)" }}
            className="px-3 py-1.5 text-xs font-medium text-white rounded hover:opacity-90 transition-opacity cursor-pointer"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddChecklistInline(false);
              setChecklistTitle("");
            }}
            className="px-2.5 py-1.5 text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-2">
        {checklist?.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between p-2.5 rounded-lg border border-[var(--border-main)] hover:bg-[var(--bg-hover)] transition-colors group"
          >
            <div
              onClick={() => handleToggleChecklist(item.id)}
              className="flex items-start space-x-2.5 cursor-pointer flex-1"
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => { }}
                className="w-4 h-4 mt-0.5 rounded text-[var(--primary)] border-[var(--border-main)] pointer-events-none"
              />
              <div className="text-xs">
                <p
                  className={`font-medium ${
                    item.completed
                      ? "line-through text-[var(--text-placeholder)]"
                      : "text-[var(--text-main)]"
                  }`}
                >
                  {item.title}
                </p>
                <span className="text-[10px] text-[var(--text-subtle)]">
                  {item.isMandatory ? "Mandatory for compliance" : "Optional"}
                </span>
              </div>
            </div>
              {canDelete("task_manager") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChecklist(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-subtle)] hover:text-red-500 transition-opacity cursor-pointer"
                  title="Delete checklist item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
          </div>
        ))}
        {(!checklist || checklist.length === 0) && (
          <div className="text-center py-6 text-xs text-[var(--text-subtle)]">
            No checklist items yet. Click &quot;Add Item&quot; to create one.
          </div>
        )}
      </div>
    </div>
  );
};
