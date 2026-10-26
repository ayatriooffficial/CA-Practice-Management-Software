"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, LucideIcon } from "lucide-react";

export interface DropdownActionItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface TableActionDropdownProps {
  actions: DropdownActionItem[];
  buttonAriaLabel?: string;
  align?: "right" | "left";
}

export const TableActionDropdown: React.FC<TableActionDropdownProps> = ({
  actions,
  buttonAriaLabel = "Row actions",
  align = "right",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const calculatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = actions.length * 36 + 12;

    // Check vertical space
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;
    const top = showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4;

    // Check horizontal space
    let left = align === "right" ? rect.right - menuWidth : rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (left < 8) left = 8;

    setCoords({ top, left });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={buttonAriaLabel}
        title={buttonAriaLabel}
        className={`p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer inline-flex items-center justify-center ${
          isOpen ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200" : ""
        }`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
              minWidth: "160px",
            }}
            className="w-44 rounded-lg bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] shadow-xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
          >
            {actions.map((action, idx) => {
              const Icon = action.icon;
              const isDanger = action.variant === "danger";

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={action.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    action.onClick();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDanger
                      ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isDanger ? "text-red-500" : "text-gray-400 dark:text-gray-400"
                      }`}
                    />
                  )}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
