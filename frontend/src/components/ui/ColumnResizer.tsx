"use client";

import React from "react";

interface ColumnResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  isResizing?: boolean;
}

export const ColumnResizer: React.FC<ColumnResizerProps> = ({
  onMouseDown,
  onDoubleClick,
  isResizing = false,
}) => {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize column (Double-click to reset)"
      onMouseDown={onMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      onClick={(e) => e.stopPropagation()}
      className={`group/resizer absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center z-40 transition-colors ${
        isResizing ? "bg-blue-600/20 dark:bg-blue-400/20" : "hover:bg-blue-500/10"
      }`}
    >
      <div
        className={`h-4/5 w-[2px] rounded-full transition-all ${
          isResizing
            ? "bg-blue-600 dark:bg-blue-400 opacity-100 scale-y-100"
            : "bg-transparent group-hover/resizer:bg-blue-500/70 opacity-0 group-hover/resizer:opacity-100"
        }`}
      />
    </div>
  );
};
