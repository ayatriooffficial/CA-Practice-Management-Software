import React from "react";

export const TaskSummarySkeleton: React.FC = () => (
  <div className="w-full space-y-4 animate-in fade-in duration-100 p-3">
    {/* Controls Row */}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
        <div className="h-9 w-44 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
      </div>
      <div className="h-9 w-28 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
    </div>

    {/* Summary Matrix Table */}
    <div className="bg-white dark:bg-[#1e293b] shadow-card overflow-hidden border border-[#dde2e8] dark:border-[#334155] rounded-md">
      <div className="overflow-x-auto scrollbar-slim">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs select-none">
          <thead>
            <tr style={{ backgroundColor: "var(--orange-havy-light)" }}>
              {["Category / Assignee", "Total", "Not Started", "In Progress", "In Review", "Completed", "Overdue"].map(
                (col, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155]"
                  >
                    <div className="h-3.5 w-16 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, rIdx) => (
              <tr
                key={rIdx}
                className={`border-b border-[#dde2e8] dark:border-[#334155] ${
                  rIdx % 2 === 0 ? "bg-white dark:bg-[#1e293b]" : "bg-[#fafafa] dark:bg-[#192437]"
                }`}
              >
                <td className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                </td>
                {Array.from({ length: 6 }).map((_, cIdx) => (
                  <td key={cIdx} className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700/60 rounded-full animate-pulse mx-auto" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export const TaskListSkeleton: React.FC = () => (
  <div className="w-full space-y-4 animate-in fade-in duration-100 p-3">
    {/* Stats Cards */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="p-3 bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-lg space-y-2 animate-pulse"
        >
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-6 w-10 bg-gray-300 dark:bg-gray-600 rounded" />
        </div>
      ))}
    </div>

    {/* Filter Bar */}
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-md">
      <div className="h-9 w-60 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
      <div className="flex items-center gap-2">
        <div className="h-9 w-28 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
        <div className="h-9 w-28 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
      </div>
    </div>

    {/* Task List Table */}
    <div className="bg-white dark:bg-[#1e293b] shadow-card overflow-hidden border border-[#dde2e8] dark:border-[#334155] rounded-md">
      <div className="overflow-x-auto scrollbar-slim">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs select-none">
          <thead>
            <tr style={{ backgroundColor: "var(--orange-havy-light)" }}>
              {["Task Title", "Client", "Service", "Priority", "Due Date", "Status", "Assignee", "Actions"].map(
                (col, i) => (
                  <th
                    key={i}
                    className="px-3.5 py-3 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155]"
                  >
                    <div className="h-3.5 w-16 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, rIdx) => (
              <tr
                key={rIdx}
                className={`border-b border-[#dde2e8] dark:border-[#334155] ${
                  rIdx % 2 === 0 ? "bg-white dark:bg-[#1e293b]" : "bg-[#fafafa] dark:bg-[#192437]"
                }`}
              >
                <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  <div className="h-3.5 w-40 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                </td>
                <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                </td>
                <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                </td>
                <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700/60 rounded-full animate-pulse" />
                </td>
                <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                </td>
                <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700/60 rounded-full animate-pulse" />
                </td>
                <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700/60 animate-pulse" />
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700/60 rounded animate-pulse" />
                  </div>
                </td>
                <td className="px-3.5 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                  <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700/60 animate-pulse mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export const TaskDetailSkeleton: React.FC = () => (
  <div className="w-full space-y-4 animate-in fade-in duration-100 p-4">
    {/* Detail Header */}
    <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
      <div className="flex items-center gap-3">
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-6 w-52 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    </div>

    {/* Detail Info Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    </div>
  </div>
);

export const TasksSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col space-y-3 animate-in fade-in duration-100">
      {/* Top Main Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between items-center border-b border-[var(--border-main)] p-2">
        {/* Left Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {["Task Summary", "Task List", "Sub Tasks", "Recurring Schedule", "Analytics"].map((tab, i) => (
            <div key={i} className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
        {/* Right Actions */}
        <div className="flex items-center space-x-2.5 shrink-0 pt-2 sm:pt-0">
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Main Tab Content Skeleton */}
      <TaskSummarySkeleton />
    </div>
  );
};
