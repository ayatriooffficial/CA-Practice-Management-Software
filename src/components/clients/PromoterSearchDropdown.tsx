"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check, User } from "lucide-react";

export interface PromoterItem {
  id?: string;
  name: string;
  pan: string;
  mcaId?: string;
  mcaPassword?: string;
  din?: string;
  mobile?: string;
}

interface PromoterSearchDropdownProps {
  id?: string;
  name?: string;
  value: string;
  promoters: PromoterItem[];
  onSelect: (promoter: PromoterItem) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export const PromoterSearchDropdown: React.FC<PromoterSearchDropdownProps> = ({
  id,
  name,
  value,
  promoters,
  onSelect,
  onClear,
  placeholder = "Select",
  disabled = false,
  "aria-label": ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    placement: "top" | "bottom";
  }>({
    left: 0,
    width: 280,
    placement: "top",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position: Opens ON TOP (above trigger) as requested
  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 280;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Prefer placing on top (above trigger) to keep UI clean and avoid clipping
    let placement: "top" | "bottom" = "top";
    if (spaceAbove < dropdownHeight && spaceBelow > spaceAbove) {
      placement = "bottom";
    }

    const width = Math.max(rect.width, 280);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    if (placement === "top") {
      setCoords({
        bottom: window.innerHeight - rect.top + 4,
        left,
        width,
        placement: "top",
      });
    } else {
      setCoords({
        top: rect.bottom + 4,
        left,
        width,
        placement: "bottom",
      });
    }
  }, []);

  // Update coordinates on scroll and resize
  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filtered promoters logic:
  // Initially show top 5 promoters when no search query is typed.
  // When user types in search query, search across all promoters.
  const { visibleList, isLimited } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      const top5 = promoters.slice(0, 5);
      if (value && !top5.some((p) => p.name.toLowerCase() === value.toLowerCase())) {
        const current = promoters.find((p) => p.name.toLowerCase() === value.toLowerCase());
        if (current) {
          top5.push(current);
        }
      }
      return {
        visibleList: top5,
        isLimited: promoters.length > 5,
      };
    }

    const filtered = promoters.filter((p) => {
      const matchName = p.name.toLowerCase().includes(query);
      const matchPan = p.pan ? p.pan.toLowerCase().includes(query) : false;
      const matchMca = p.mcaId ? p.mcaId.toLowerCase().includes(query) : false;
      return matchName || matchPan || matchMca;
    });

    return {
      visibleList: filtered,
      isLimited: false,
    };
  }, [promoters, searchQuery, value]);

  const handleSelectOption = (promoter: PromoterItem) => {
    onSelect(promoter);
    setIsOpen(false);
    setSearchQuery("");
    setActiveIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onSelect({ name: "", pan: "", mcaId: "", mcaPassword: "" });
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        updateCoords();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
      setActiveIndex(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < visibleList.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : visibleList.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < visibleList.length) {
        handleSelectOption(visibleList[activeIndex]);
      } else if (searchQuery.trim() && visibleList.length === 0) {
        handleSelectOption({
          name: searchQuery.trim().toUpperCase(),
          pan: "",
          mcaId: "",
          mcaPassword: "",
        });
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full text-xs" onKeyDown={handleKeyDown}>
      {/* Trigger Button fitting table cell */}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || "Select Promoter Name"}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            updateCoords();
            setIsOpen((prev) => !prev);
            if (!isOpen) {
              setSearchQuery("");
              setActiveIndex(-1);
            }
          }
        }}
        className={`flex h-9 w-full items-center justify-between rounded border bg-white dark:bg-[#0f172a] px-2 text-xs outline-none transition-colors cursor-pointer select-none ${
          disabled
            ? "bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed"
            : isOpen
            ? "border-[#31719B] ring-1 ring-[#31719B]"
            : "border-[#dde2e8] dark:border-[#475569] hover:border-gray-400 focus:border-[#31719B]"
        }`}
      >
        <span
          className={`truncate font-medium ${
            value
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-400 dark:text-gray-500 font-normal"
          }`}
        >
          {value || placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-[#31719B]" : ""
            }`}
          />
        </div>
      </div>

      {/* Floating Popover rendered through React Portal ON TOP of all DOM elements */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className={`rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xl overflow-hidden ${
              coords.placement === "top"
                ? "animate-in fade-in slide-in-from-bottom-2 duration-150"
                : "animate-in fade-in slide-in-from-top-2 duration-150"
            }`}
          >
            {/* Search Box Header */}
            <div className="p-2 border-b border-[#dde2e8] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  aria-label="Search promoter name"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  placeholder="Search promoter or PAN..."
                  className="w-full pl-8 pr-7 py-1.5 rounded text-xs outline-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 focus:border-[#31719B]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Promoters List */}
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-56 overflow-y-auto py-1 divide-y divide-gray-50 dark:divide-gray-800/60"
            >
              {visibleList.length === 0 ? (
                <li className="p-3 text-center text-xs text-gray-400">
                  <p>No matching promoters found</p>
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectOption({
                          name: searchQuery.trim().toUpperCase(),
                          pan: "",
                          mcaId: "",
                          mcaPassword: "",
                        })
                      }
                      className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#31719B] bg-[#31719B]/10 hover:bg-[#31719B]/20 rounded transition-colors"
                    >
                      <span>Use &quot;{searchQuery.trim().toUpperCase()}&quot;</span>
                    </button>
                  )}
                </li>
              ) : (
                visibleList.map((p, idx) => {
                  const isSelected = value && p.name.toLowerCase() === value.toLowerCase();
                  const isHovered = idx === activeIndex;

                  return (
                    <li
                      key={`${p.name}-${idx}`}
                      role="option"
                      aria-selected={Boolean(isSelected)}
                      onClick={() => handleSelectOption(p)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#31719B]/10 text-[#31719B] font-semibold"
                          : isHovered
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate font-medium">{p.name}</span>
                        </div>
                        {p.pan && (
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 font-mono">
                            <span>PAN: {p.pan}</span>
                            {p.mcaId && <span>• MCA: {p.mcaId}</span>}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-[#31719B] shrink-0 ml-2" />
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            {/* Footer note: When not searching, shows initial 5 info */}
            {isLimited && !searchQuery.trim() && (
              <div className="px-3 py-1.5 text-[10.5px] text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-[#0f172a] border-t border-gray-100 dark:border-gray-800 text-center flex items-center justify-center gap-1">
                <span>Showing 5 of {promoters.length} promoters from Leads</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-[#31719B] font-medium">Type to search</span>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
