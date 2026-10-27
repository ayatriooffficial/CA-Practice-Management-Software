import React from "react";

export const ServicesSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col space-y-4 animate-in fade-in duration-100">
      {/* Header Row Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
        </div>

        <div className="flex items-center gap-3 py-2">
          {/* Active / Trash toggle button skeleton */}
          <div className="h-10 w-28 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />

          {/* Add Service button skeleton */}
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Filters Bar Skeleton */}
      <div className="p-4 bg-white dark:bg-[#1e293b] space-y-3 rounded-md border border-[#dde2e8] dark:border-[#334155]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
          {/* Category Filter */}
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
          {/* Frequency Filter */}
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
          {/* Recurring Filter */}
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
          {/* Difficulty Filter */}
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
          {/* Reset */}
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Spreadsheet Table Skeleton */}
      <div className="bg-white dark:bg-[#1e293b] shadow-card overflow-hidden flex flex-col border border-[#dde2e8] dark:border-[#334155] rounded-md">
        <div className="overflow-x-auto scrollbar-slim">
          <table
            className="min-w-full border-separate border-spacing-0 text-left text-xs select-none"
            style={{ width: "max-content" }}
          >
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                {/* Checkbox Header */}
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-12 min-w-[48px] max-w-[48px] px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  <div className="w-4 h-4 mx-auto bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
                </th>

                {/* Service Name Header */}
                <th
                  scope="col"
                  className="sticky left-12 z-30 px-3.5 py-3 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]"
                  style={{
                    backgroundColor: "var(--orange-havy-light)",
                    width: "220px",
                    minWidth: "220px",
                  }}
                >
                  <div className="h-3.5 w-24 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
                </th>

                {/* Other Column Headers */}
                {[
                  { label: "Category", width: 120 },
                  { label: "Recurring", width: 110 },
                  { label: "Frequency", width: 110 },
                  { label: "Professional Fee", width: 130 },
                  { label: "SOP", width: 140 },
                  { label: "Sub Tasks", width: 110 },
                  { label: "Difficulty", width: 110 },
                  { label: "Status", width: 100 },
                ].map((col, idx) => (
                  <th
                    key={idx}
                    scope="col"
                    className="px-3.5 py-3 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap"
                    style={{
                      backgroundColor: "var(--orange-havy-light)",
                      width: `${col.width}px`,
                      minWidth: `${col.width}px`,
                    }}
                  >
                    <div className="h-3.5 w-16 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
                  </th>
                ))}

                {/* Actions Header */}
                <th
                  scope="col"
                  className="sticky right-0 z-30 px-3 py-3 font-semibold text-center text-gray-700 dark:text-gray-300 border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.06)]"
                  style={{
                    backgroundColor: "var(--orange-havy-light)",
                    width: "100px",
                    minWidth: "100px",
                  }}
                >
                  <div className="h-3.5 w-12 mx-auto bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
                </th>
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: 8 }).map((_, rIdx) => (
                <tr
                  key={rIdx}
                  className={`border-b border-[#dde2e8] dark:border-[#334155] ${
                    rIdx % 2 === 0
                      ? "bg-white dark:bg-[#1e293b]"
                      : "bg-[#fafafa] dark:bg-[#192437]"
                  }`}
                >
                  {/* Frozen Checkbox Cell */}
                  <td className="sticky left-0 z-20 w-12 min-w-[48px] max-w-[48px] px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                    <div className="w-4 h-4 mx-auto bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                  </td>

                  {/* Frozen Service Name Cell */}
                  <td
                    className="sticky left-12 z-20 px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]"
                    style={{
                      width: "220px",
                      minWidth: "220px",
                    }}
                  >
                    <div className="h-3.5 w-36 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                  </td>

                  {/* Category */}
                  <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700/60 rounded-full animate-pulse" />
                  </td>

                  {/* Recurring */}
                  <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700/60 rounded-full animate-pulse" />
                  </td>

                  {/* Frequency */}
                  <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                  </td>

                  {/* Professional Fee */}
                  <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="h-3.5 w-16 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                  </td>

                  {/* SOP */}
                  <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                  </td>

                  {/* Sub Tasks */}
                  <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700/60 rounded-full animate-pulse" />
                  </td>

                  {/* Difficulty */}
                  <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700/60 rounded-full animate-pulse" />
                  </td>

                  {/* Status */}
                  <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700/60 rounded-full animate-pulse" />
                  </td>

                  {/* Actions */}
                  <td className="sticky right-0 z-20 px-3 py-3 border-b border-[#dde2e8] dark:border-[#334155] shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.06)] text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700/60 animate-pulse" />
                      <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700/60 animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar Skeleton */}
        <div className="flex items-center justify-between p-3 border-t border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-[#1e293b]">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
