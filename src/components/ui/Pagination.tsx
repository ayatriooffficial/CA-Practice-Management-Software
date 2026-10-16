"use client";

import React, { memo } from "react";

export interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = memo(function Pagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50],
  showPageSize = false,
  className = "",
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const fromIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const toIndex = totalItems === 0 ? 0 : Math.min(safePage * pageSize, totalItems);

  const canGoPrevious = safePage > 1;
  const canGoNext = safePage < totalPages;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 border-t border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-sm ${className}`}
    >
      {/* Left: Showing 1–10 of 20 */}
      <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-normal">
        Showing{" "}
        <span className="font-normal text-gray-700 dark:text-gray-300">
          {totalItems === 0 ? "0" : `${fromIndex}–${toIndex}`}
        </span>{" "}
        of{" "}
        <span className="font-normal text-gray-700 dark:text-gray-300">
          {totalItems}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Optional Page Size selector */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mr-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 px-2 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 text-xs outline-none cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Previous Button */}
        <button
          type="button"
          onClick={() => {
            if (canGoPrevious) {
              onPageChange(safePage - 1);
            }
          }}
          disabled={!canGoPrevious}
          aria-label="Previous Page"
          className={`h-8 px-3 rounded-md border text-xs sm:text-sm font-medium transition-colors select-none ${
            canGoPrevious
              ? "border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1e293b] active:bg-gray-100 cursor-pointer shadow-2xs"
              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-80"
          }`}
        >
          Previous
        </button>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => {
            if (canGoNext) {
              onPageChange(safePage + 1);
            }
          }}
          disabled={!canGoNext}
          aria-label="Next Page"
          className={`h-8 px-3 rounded-md border text-xs sm:text-sm font-medium transition-colors select-none ${
            canGoNext
              ? "border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1e293b] active:bg-gray-100 cursor-pointer shadow-2xs"
              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-80"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
});
