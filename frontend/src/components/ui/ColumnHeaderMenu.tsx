"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  ArrowUp,
  ArrowDown,
  EyeOff,
  RotateCcw,
} from "lucide-react";

export interface ColumnHeaderMenuProps {
  columnId: string;
  columnHeader: string;
  isSortedAsc?: boolean;
  isSortedDesc?: boolean;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onHideColumn: () => void;
  onClearAll: () => void;
}

export const ColumnHeaderMenu: React.FC<ColumnHeaderMenuProps> = ({
  columnId,
  columnHeader,
  isSortedAsc = false,
  isSortedDesc = false,
  onSortAsc,
  onSortDesc,
  onHideColumn,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const calculatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 185;
    const dropdownHeight = 175;

    // Check vertical space (open below if space permits, else open above)
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    const top = showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4;

    // Align right edge of menu with button so it sits neatly under the column header
    let left = rect.right - dropdownWidth;
    if (left < 12) {
      left = Math.max(12, rect.left);
    }
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = window.innerWidth - dropdownWidth - 12;
    }

    setCoords({ top, left });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={`Column options for ${columnHeader}`}
        className={`column-header-trigger p-1 rounded-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity cursor-pointer ${
          isOpen
            ? "opacity-100 bg-black/5 dark:bg-white/10"
            : "opacity-0 group-hover:opacity-100 group-hover/th:opacity-100"
        }`}
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-[185px] bg-white dark:bg-[#1e293b] rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 p-2 text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
          >
            {/* Sort Ascending */}
            <button
              type="button"
              onClick={() => {
                onSortAsc();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-normal text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md transition-colors text-left cursor-pointer"
            >
              <ArrowUp className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <span>Sort Ascending</span>
            </button>

            {/* Sort Descending */}
            <button
              type="button"
              onClick={() => {
                onSortDesc();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-normal text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md transition-colors text-left cursor-pointer"
            >
              <ArrowDown className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <span>Sort Descending</span>
            </button>

            {/* Hide Column */}
            <button
              type="button"
              onClick={() => {
                onHideColumn();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-normal text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md transition-colors text-left cursor-pointer"
            >
              <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <span>Hide Column</span>
            </button>

            {/* Clear All (with red accent and spacing) */}
            <div className="pt-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-normal text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors text-left cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-red-500 shrink-0" />
                <span>Clear All</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
