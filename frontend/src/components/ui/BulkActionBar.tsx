"use client";

import React from "react";
import { Trash2, X, CheckSquare, Loader2 } from "lucide-react";

export interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  itemLabel?: string;
  deleteLabel?: string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onDelete,
  isDeleting = false,
  itemLabel = "items",
  deleteLabel = "Delete Selected",
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions toolbar"
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/90 dark:bg-blue-950/40 text-gray-900 dark:text-gray-100 shadow-xs transition-all animate-in fade-in slide-in-from-top-1 duration-200"
    >
      {/* Left: Selection Counter & Clear Button */}
      <div className="flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {selectedCount} {selectedCount === 1 ? itemLabel.replace(/s$/, "") : itemLabel} selected
          </span>
          <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isDeleting}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
          >
            <X className="w-3 h-3" />
            <span>Deselect All</span>
          </button>
        </div>
      </div>

      {/* Right: Delete Action Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-[#e8655a] hover:bg-[#d85247] shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          <span>{isDeleting ? "Deleting..." : deleteLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
