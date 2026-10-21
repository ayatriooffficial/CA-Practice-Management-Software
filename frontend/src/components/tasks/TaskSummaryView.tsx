"use client";

import React, { useState, useEffect } from "react";
import { Search, Download } from "lucide-react";
import { taskApi } from "@/services/taskApi";
import { TaskSummaryRow } from "@/data/taskData";

interface TaskSummaryViewProps {
  onSelectGroupFilter?: (groupKey: string, status?: string) => void;
}

export const TaskSummaryView: React.FC<TaskSummaryViewProps> = ({
  onSelectGroupFilter,
}) => {
  const [groupBy, setGroupBy] = useState<string>("Assigned To");
  const [search, setSearch] = useState<string>("");
  const [isHeatMap, setIsHeatMap] = useState<boolean>(false);
  const [rows, setRows] = useState<TaskSummaryRow[]>([]);
  const [grandTotal, setGrandTotal] = useState<TaskSummaryRow | null>(null);

  const GROUP_OPTIONS = [
    "Assigned To",
    "Category",
    "Client",
    "Service",
    "Priority",
    "Task Type",
    "Month",
    "Financial Year",
  ];

  const fetchMatrix = async () => {
    try {
      const res = await taskApi.getTaskSummaryMatrix(groupBy, search);
      if (res.data) {
        setRows(res.data.rows);
        setGrandTotal(res.data.grandTotal);
      }
    } catch {
      // Handled in api
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [groupBy, search]);

  const handleExportCSV = () => {
    if (!rows.length) return;
    const headers = [
      groupBy,
      "Pending",
      "In Progress",
      "Sent for Review",
      "Request Changes",
      "WIP Sub Total",
      "Overdue",
      "Due Today",
      "Completed",
      "Ready to Bill",
      "On Hold",
      "Total",
      "Done %",
    ];
    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.groupLabel}"`,
          r.pending,
          r.inProgress,
          r.sentForReview,
          r.requestChanges,
          r.wipSubTotal,
          r.overdue,
          r.dueToday,
          r.completed,
          r.readyToBill,
          r.onHold,
          r.total,
          `"${r.donePercentage}%"`,
        ].join(",")
      ),
    ];
    if (grandTotal) {
      csvRows.push(
        [
          '"Grand Total"',
          grandTotal.pending,
          grandTotal.inProgress,
          grandTotal.sentForReview,
          grandTotal.requestChanges,
          grandTotal.wipSubTotal,
          grandTotal.overdue,
          grandTotal.dueToday,
          grandTotal.completed,
          grandTotal.readyToBill,
          grandTotal.onHold,
          grandTotal.total,
          `"${grandTotal.donePercentage}%"`,
        ].join(",")
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `task_summary_${groupBy.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-2">
      {/* Group By Filter Bar matching Image 3 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[var(--bg-surface)] p-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-subtle)] mr-1.5">
            Group by:
          </span>
          {GROUP_OPTIONS.map((opt) => {
            const isActive = groupBy === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setGroupBy(opt)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${isActive
                  ? "text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                  }`}
                style={{
                  backgroundColor: isActive ? "var(--primary)" : "transparent",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] w-36 sm:w-44 transition-all"
            />
          </div>

          {/* Heat Map Toggle */}
          <button
            type="button"
            onClick={() => setIsHeatMap(!isHeatMap)}
            className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors flex items-center space-x-1 ${isHeatMap
              ? "bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]"
              : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-main)] hover:bg-[var(--bg-hover)]"
              }`}
          >
            <span>Heat Map</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1 text-xs font-medium text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-hover)] transition-colors flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Pivot Data Table */}
      <div className="bg-[var(--bg-surface)]  overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300 font-semibold border-b border-[#dde2e8] dark:border-[#334155]"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="py-2.5 px-4 font-semibold text-[var(--text-main)] min-w-[180px]">
                  {groupBy} ({rows.length})
                </th>
                <th className="py-2.5 px-3 text-center">Pending</th>
                <th className="py-2.5 px-3 text-center">In Progress</th>
                <th className="py-2.5 px-3 text-center">Sent for Review</th>
                <th className="py-2.5 px-3 text-center">Request Changes</th>
                {/* WIP Sub Total: Shaded column in screenshot */}
                <th
                  className="py-2.5 px-3 text-center font-semibold"
                  style={{
                    backgroundColor: "var(--brand-soft)",
                    color: "var(--primary)",
                  }}
                >
                  WIP Sub Total
                </th>
                {/* Overdue: Red text in screenshot */}
                <th
                  className="py-2.5 px-3 text-center font-semibold"
                  style={{ color: "var(--danger)" }}
                >
                  Overdue
                </th>
                <th className="py-2.5 px-3 text-center">Due Today</th>
                <th className="py-2.5 px-3 text-center">Completed</th>
                <th className="py-2.5 px-3 text-center">Ready to Bill</th>
                <th className="py-2.5 px-3 text-center">On Hold</th>
                <th className="py-2.5 px-3 text-center font-semibold text-[var(--text-main)]">
                  Total
                </th>
                <th className="py-2.5 px-4 text-right font-semibold">Done %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-xs text-[var(--text-muted)]">
                    No task summary data found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                <tr
                  key={row.groupKey}
                  onClick={() => onSelectGroupFilter?.(row.groupLabel)}
                  className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                >
                  {/* Member / Group Column with Initials Bubble */}
                  <td className="py-2.5 px-4 flex items-center gap-2.5">
                    <span
                      style={{
                        backgroundColor: row.avatarColor ? `${row.avatarColor}18` : "var(--brand-soft)",
                        color: row.avatarColor || "var(--primary)",
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 uppercase border border-current/20"
                    >
                      {row.initials || row.groupLabel.substring(0, 2).toUpperCase()}
                    </span>
                    <span className="font-medium text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors truncate">
                      {row.groupLabel}
                    </span>
                  </td>

                  {/* Pending */}
                  <td
                    className={`py-2.5 px-3 text-center font-medium ${isHeatMap && row.pending > 0
                      ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300"
                      : "text-[var(--text-main)]"
                      }`}
                  >
                    {row.pending}
                  </td>

                  {/* In Progress */}
                  <td
                    className={`py-2.5 px-3 text-center font-medium ${isHeatMap && row.inProgress > 0
                      ? "bg-cyan-50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-300"
                      : "text-[var(--text-main)]"
                      }`}
                  >
                    {row.inProgress}
                  </td>

                  {/* Sent for Review */}
                  <td className="py-2.5 px-3 text-center text-[var(--text-muted)]">
                    {row.sentForReview}
                  </td>

                  {/* Request Changes */}
                  <td className="py-2.5 px-3 text-center text-[var(--text-muted)]">
                    {row.requestChanges}
                  </td>

                  {/* WIP Sub Total (Shaded cell) */}
                  <td
                    className="py-2.5 px-3 text-center font-semibold"
                    style={{
                      backgroundColor: "var(--brand-soft)",
                      color: "var(--primary)",
                    }}
                  >
                    {row.wipSubTotal}
                  </td>

                  {/* Overdue (Red text highlight) */}
                  <td
                    className="py-2.5 px-3 text-center font-semibold"
                    style={{
                      color: row.overdue > 0 ? "var(--danger)" : "var(--text-placeholder)",
                    }}
                  >
                    {row.overdue}
                  </td>

                  {/* Due Today */}
                  <td className="py-2.5 px-3 text-center text-[var(--text-subtle)]">
                    {row.dueToday}
                  </td>

                  {/* Completed (Green highlight) */}
                  <td
                    className={`py-2.5 px-3 text-center font-medium ${row.completed > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-placeholder)]"
                      }`}
                  >
                    {row.completed}
                  </td>

                  {/* Ready to Bill */}
                  <td className="py-2.5 px-3 text-center text-[var(--text-muted)]">
                    {row.readyToBill}
                  </td>

                  {/* On Hold */}
                  <td className="py-2.5 px-3 text-center text-[var(--text-placeholder)]">
                    {row.onHold}
                  </td>

                  {/* Total */}
                  <td className="py-2.5 px-3 text-center font-bold text-[var(--text-main)]">
                    {row.total}
                  </td>

                  {/* Done % Badge */}
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${row.donePercentage >= 80
                        ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                        : row.donePercentage >= 40
                          ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                          : "text-[var(--danger)] bg-red-50 dark:bg-red-950/40"
                        }`}
                    >
                      {row.donePercentage}%
                    </span>
                  </td>
                </tr>
              )))}

              {/* Grand Total Row matching Image 3 Footer */}
              {grandTotal && (
                <tr className="bg-[var(--bg-subtle)] font-bold text-[var(--text-main)] border-t-2 border-[var(--border-strong)]">
                  <td className="py-3 px-4 uppercase text-xs tracking-wider">
                    Grand Total
                  </td>
                  <td className="py-3 px-3 text-center">{grandTotal.pending}</td>
                  <td className="py-3 px-3 text-center">{grandTotal.inProgress}</td>
                  <td className="py-3 px-3 text-center">{grandTotal.sentForReview}</td>
                  <td className="py-3 px-3 text-center">{grandTotal.requestChanges}</td>
                  <td
                    className="py-3 px-3 text-center font-bold"
                    style={{
                      backgroundColor: "var(--brand-soft)",
                      color: "var(--primary)",
                    }}
                  >
                    {grandTotal.wipSubTotal}
                  </td>
                  <td
                    className="py-3 px-3 text-center font-bold"
                    style={{ color: "var(--danger)" }}
                  >
                    {grandTotal.overdue}
                  </td>
                  <td className="py-3 px-3 text-center">{grandTotal.dueToday}</td>
                  <td className="py-3 px-3 text-center text-emerald-600 dark:text-emerald-400">
                    {grandTotal.completed}
                  </td>
                  <td className="py-3 px-3 text-center">{grandTotal.readyToBill}</td>
                  <td className="py-3 px-3 text-center">{grandTotal.onHold}</td>
                  <td className="py-3 px-3 text-center text-sm">{grandTotal.total}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {grandTotal.donePercentage}%
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
