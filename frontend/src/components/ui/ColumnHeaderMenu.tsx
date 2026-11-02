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

  // Position calculation with window boundary checks
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 180;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = window.innerWidth - dropdownWidth - 12;
    }
    setCoords({
      top: rect.bottom + 4,
      left: Math.max(12, left),
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Close on outside click
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
      updatePosition();
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
        className={`p-1 rounded-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity cursor-pointer ${
          isOpen ? "opacity-100 bg-black/5 dark:bg-white/10" : "opacity-0 group-hover/th:opacity-100"
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
            className="w-48 bg-white dark:bg-[#1e293b] rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
          >
            {/* Sort Ascending */}
            <button
              type="button"
              onClick={() => {
                onSortAsc();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
                isSortedAsc
                  ? "bg-[#31719B]/10 text-[#31719B] dark:text-[#3D88BF]"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>Sort Ascending</span>
            </button>

            {/* Sort Descending */}
            <button
              type="button"
              onClick={() => {
                onSortDesc();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
                isSortedDesc
                  ? "bg-[#31719B]/10 text-[#31719B] dark:text-[#3D88BF]"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <ArrowDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>Sort Descending</span>
            </button>

            {/* Hide Column */}
            <button
              type="button"
              onClick={() => {
                onHideColumn();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-left cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>Hide Column</span>
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

            {/* Clear All */}
            <button
              type="button"
              onClick={() => {
                onClearAll();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors text-left cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Clear All</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
};

