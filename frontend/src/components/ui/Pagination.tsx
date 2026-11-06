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
  pageSizeOptions = [5, 10, 15, 25, 50],
  showPageSize = true,
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
      className={`flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-xs sm:text-sm rounded-none select-none ${className}`}
    >
      {/* Left: Rows per page + Showing 1–3 of 3 entries */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {showPageSize && (
          <div className="flex items-center gap-1.5">
            <label htmlFor="pagination-rows-select" className="cursor-pointer">
              Rows per page:
            </label>
            <select
              id="pagination-rows-select"
              name="rowsPerPage"
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              disabled={!onPageSizeChange}
              className="bg-transparent border border-[#dde2e8] dark:border-[#334155] rounded-none px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
        <span>
          Showing{" "}
          <strong className="text-gray-700 dark:text-gray-300 font-semibold">
            {fromIndex}
          </strong>
          –
          <strong className="text-gray-700 dark:text-gray-300 font-semibold">
            {toIndex}
          </strong>{" "}
          of <strong className="text-gray-700 dark:text-gray-300 font-semibold">{totalItems}</strong> entries
        </span>
      </div>

      {/* Right: Showing 1–3 of 3 + Previous & Next Buttons */}
      <div className="flex items-center gap-3">
        <div className="text-gray-500 dark:text-gray-400 text-xs font-normal">
          Showing{" "}
          <span className="font-normal text-gray-700 dark:text-gray-300">
            {totalItems === 0 ? "0" : `${fromIndex}–${toIndex}`}
          </span>{" "}
          of{" "}
          <span className="font-normal text-gray-700 dark:text-gray-300">
            {totalItems}
          </span>
        </div>

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
          className={`h-8 px-3 rounded-none border text-xs font-medium transition-colors select-none ${
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
          className={`h-8 px-3 rounded-none border text-xs font-medium transition-colors select-none ${
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
