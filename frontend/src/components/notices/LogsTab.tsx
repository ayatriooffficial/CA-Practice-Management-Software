"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { SyncJob, ActivityLog, Portal } from "@/types/notices";
import { getSyncJobs, getActivityLogs, getClients } from "@/services/noticeApi";
import { onSyncCompleted } from "@/lib/syncEvents";
import { SummaryCards, type SummaryCardItem } from "@/components/common/SummaryCards";
import { ColumnResizer } from "@/components/ui/ColumnResizer";
import { useResizableColumns } from "@/hooks/useResizableColumns";

export interface LogsTabProps {
  module?: "notices" | "compliance";
}

type FilterChip = "all" | "syncs" | "activity";
type StatusFilter = "all" | "success" | "partial" | "failed";
type PortalFilter = "ALL" | Portal;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

const SYNC_COLUMNS = [
  { id: "time", label: "Date & Time", defaultWidth: 170 },
  { id: "status", label: "Status", defaultWidth: 120 },
  { id: "portals", label: "Portals", defaultWidth: 140 },
  { id: "clientsCount", label: "Clients Synced", defaultWidth: 140 },
  { id: "newItems", label: "New Items", defaultWidth: 120 },
  { id: "credits", label: "Credits Used", defaultWidth: 130 },
  { id: "triggeredBy", label: "Triggered By", defaultWidth: 160 },
];

export const LogsTab: React.FC<LogsTabProps> = ({ module = "notices" }) => {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [activeChip, setActiveChip] = useState<FilterChip>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [portalFilter, setPortalFilter] = useState<PortalFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    SYNC_COLUMNS.forEach((col) => {
      widths[col.id] = col.defaultWidth;
    });
    return widths;
  }, []);

  const {
    getColumnWidth,
    handleResizeStart,
    resizingKey,
    resetColumnWidth,
  } = useResizableColumns({
    storageKey: `notice_logs_cols_${module}`,
    initialWidths,
    minWidth: 80,
    maxWidth: 500,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobs, activity] = await Promise.all([
        getSyncJobs({ module }),
        getActivityLogs(),
      ]);
      setSyncJobs(jobs || []);
      setActivityLogs(activity || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => {
    void loadData();
    const unsub = onSyncCompleted(() => {
      void loadData();
    });
    return unsub;
  }, [loadData]);

  const summary = useMemo(() => {
    const total = syncJobs.length;
    const success = syncJobs.filter((j) => j.status === "success").length;
    const partial = syncJobs.filter((j) => j.status === "partial").length;
    const failed = syncJobs.filter((j) => j.status === "failed").length;
    const newItems = syncJobs.reduce((acc, j) => acc + (j.newItems || 0), 0);
    const credits = syncJobs.reduce((acc, j) => acc + (j.creditsUsed || 0), 0);
    return { total, success, partial, failed, newItems, credits };
  }, [syncJobs]);

  const summaryItems: SummaryCardItem[] = useMemo(() => [
    { label: "Total Syncs", count: summary.total, colorToken: "--primary", icon: "Clock" },
    { label: "Successful", count: summary.success, colorToken: "--badge-new-text", icon: "CheckCircle" },
    { label: "Partial", count: summary.partial, colorToken: "--banner-text", icon: "AlertTriangle" },
    { label: "Failed", count: summary.failed, colorToken: "--danger", icon: "AlertCircle" },
    { label: "New Items", count: summary.newItems, colorToken: "--primary-hover", icon: "Inbox" },
    { label: "Credits Used", count: summary.credits, colorToken: "--credits-text", icon: "Receipt" },
  ], [summary]);

  const filteredJobs = useMemo(() => {
    let result = [...syncJobs];

    if (statusFilter !== "all") {
      result = result.filter((j) => j.status === statusFilter);
    }

    if (portalFilter !== "ALL") {
      result = result.filter((j) => j.portals.includes(portalFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (j) =>
          j.triggeredBy.toLowerCase().includes(q) ||
          j.portals.some((p) => p.toLowerCase().includes(q))
      );
    }

    return result;
  }, [syncJobs, statusFilter, portalFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-4 p-6 w-full flex-1" style={{ backgroundColor: "var(--bg-app)" }}>
      {/* 1. Summary Cards */}
      <SummaryCards items={summaryItems} className="w-full" />

      {/* 2. Control Toolbar */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--text-subtle)" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sync logs by trigger or portal..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md border outline-none transition-colors"
            style={{
              backgroundColor: "var(--bg-app)",
              borderColor: "var(--border-main)",
              color: "var(--text-main)",
            }}
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter */}
          <div className="relative inline-block text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="appearance-none px-3 py-1.5 pr-7 text-xs font-medium rounded-md border transition-colors cursor-pointer outline-none"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-subtle)" }} />
          </div>

          {/* Portal Filter */}
          <div className="relative inline-block text-xs">
            <select
              value={portalFilter}
              onChange={(e) => setPortalFilter(e.target.value as PortalFilter)}
              className="appearance-none px-3 py-1.5 pr-7 text-xs font-medium rounded-md border transition-colors cursor-pointer outline-none"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <option value="ALL">All Portals</option>
              <option value="GST">GST</option>
              <option value="IT">Income Tax</option>
              <option value="TDS">TDS</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-subtle)" }} />
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
              color: "var(--text-main)",
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "var(--text-subtle)" }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3. Table */}
      <div
        className="w-full rounded-lg border overflow-hidden shadow-xs"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr
                className="border-b text-[11px] font-semibold tracking-wider select-none uppercase"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-muted)",
                }}
              >
                {SYNC_COLUMNS.map((col) => {
                  const width = getColumnWidth(col.id);
                  return (
                    <th
                      key={col.id}
                      className="relative px-4 py-3 whitespace-nowrap"
                      style={{ width, minWidth: width }}
                    >
                      <span className="pr-3">{col.label}</span>
                      <ColumnResizer
                        onMouseDown={(e) => handleResizeStart(col.id, e)}
                        onDoubleClick={() => resetColumnWidth(col.id)}
                        isResizing={resizingKey === col.id}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {loading && filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={SYNC_COLUMNS.length} className="px-6 py-12 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
                    Loading sync logs…
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={SYNC_COLUMNS.length} className="px-6 py-12 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
                    No sync logs match the criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b transition-colors"
                    style={{
                      borderColor: "var(--border-main)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-main)" }}>
                      {formatDateTime(job.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                        style={{
                          backgroundColor:
                            job.status === "success"
                              ? "var(--badge-new-bg)"
                              : job.status === "partial"
                              ? "var(--banner-bg)"
                              : "var(--credits-bg)",
                          color:
                            job.status === "success"
                              ? "var(--badge-new-text)"
                              : job.status === "partial"
                              ? "var(--banner-text)"
                              : "var(--danger)",
                        }}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1 flex-wrap">
                        {job.portals.map((p) => (
                          <span
                            key={p}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold border"
                            style={{
                              backgroundColor: "var(--bg-subtle)",
                              borderColor: "var(--border-main)",
                              color: "var(--text-main)",
                            }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-main)" }}>
                      {job.clientIds.length}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-main)" }}>
                      {job.newItems}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--credits-text)" }}>
                      {job.creditsUsed}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-subtle)" }}>
                      {job.triggeredBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
