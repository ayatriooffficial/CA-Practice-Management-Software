"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  name?: string;
  options: SelectOption[] | string[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  separator?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export const Select: React.FC<SelectProps> = memo(function Select({
  id,
  name,
  options,
  value = "",
  onChange,
  placeholder = "Select...",
  searchable = false,
  separator = true,
  disabled = false,
  className = "",
  error,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to { value, label }
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((o) => o.value === value);
  }, [normalizedOptions, value]);

  // Filtered options for search
  const visibleOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalizedOptions, searchQuery]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
        setActiveIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      setIsOpen(false);
      setSearchQuery("");
      setActiveIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < visibleOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : visibleOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < visibleOptions.length) {
        handleSelect(visibleOptions[activeIndex].value);
      }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`relative w-full select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Control */}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || placeholder || "Select option"}
        aria-labelledby={ariaLabelledBy}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setSearchQuery("");
              setActiveIndex(-1);
            }
          }
        }}
        className={`flex h-11 w-full items-center justify-between rounded-md border bg-white dark:bg-[#0f172a] text-sm text-[#000000] dark:text-white transition-all cursor-pointer ${
          disabled
            ? "bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed"
            : error
            ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
            : isOpen
            ? "border-[#31719B] ring-1 ring-[#31719B]"
            : "border-[#dde2e8] dark:border-[#475569] hover:border-gray-400 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
        }`}
      >
        {/* Label / Placeholder */}
        <div className="flex-1 min-w-0 px-3.5 truncate">
          {selectedOption && selectedOption.label ? (
            <span className="font-normal text-gray-900 dark:text-gray-100">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 font-normal">
              {placeholder}
            </span>
          )}
        </div>

        {/* Right Indicator with Separator Line matching user screenshot: `|  v` */}
        <div className="flex items-center self-stretch shrink-0 pr-2.5">
          {separator && (
            <span
              aria-hidden="true"
              className="h-5 w-[1px] bg-[#cccccc] dark:bg-[#475569] my-auto mr-2"
            />
          )}
          <span
            className={`transition-transform duration-150 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            <ChevronDown className="w-4 h-4 text-[#888888] dark:text-gray-400" />
          </span>
        </div>
      </div>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[160px] rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box if searchable */}
          {searchable && (
            <div className="p-2 border-b border-[#dde2e8] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  aria-label="Filter options"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  placeholder="Search..."
                  className="w-full pl-8 pr-7 py-1.5 rounded text-xs outline-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1 scrollbar-slim divide-y divide-gray-50 dark:divide-gray-800"
          >
            {visibleOptions.length === 0 ? (
              <li className="px-3.5 py-3 text-center text-xs text-gray-400">
                No matching options
              </li>
            ) : (
              visibleOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHovered = index === activeIndex;

                return (
                  <li
                    key={`${opt.value || 'empty'}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#31719B]/10 text-[#31719B] font-semibold"
                        : isHovered
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="truncate">{opt.label || placeholder}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#31719B] shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
});
