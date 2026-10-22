"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RotateCw,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Building,
  Check,
  X,
  FileCheck,
} from "lucide-react";
import type { Client } from "@/types/notices";
import { useNoticeClients, type ClientWithStats } from "@/hooks/useNoticeClients";
import { SyncDrawer } from "./SyncDrawer";
import { ColumnResizer } from "@/components/ui/ColumnResizer";
import { useResizableColumns } from "@/hooks/useResizableColumns";

export interface ClientsTabProps {
  onSync?: (clientIds: string[]) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  initialSelectedIds?: string[];
}

type ChipFilter = "all" | "notices" | "issues";
type PortalFilter = "ALL" | "GST" | "IT" | "TDS";
type GroupByOption = "none" | "state" | "status";
type SortByOption = "client_asc" | "client_desc" | "notices_desc" | "overdue_desc";

function formatLastSyncDate(dateStr?: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getIdentifier(client: Client): string {
  return (
    client.identifiers.gstin ||
    client.identifiers.pan ||
    client.identifiers.tan ||
    "—"
  );
}

const CLIENT_COLUMNS = [
  { id: "client", label: "Client Name", defaultWidth: 260 },
  { id: "identifiers", label: "GSTIN / PAN / TAN", defaultWidth: 180 },
  { id: "portals", label: "Connected Portals", defaultWidth: 180 },
  { id: "syncStatus", label: "Sync Status", defaultWidth: 150 },
  { id: "notices", label: "Active Notices", defaultWidth: 130 },
  { id: "lastSync", label: "Last Sync", defaultWidth: 140 },
  { id: "actions", label: "Actions", defaultWidth: 110 },
];

export const ClientsTab: React.FC<ClientsTabProps> = ({
  onSync,
  onSelectionChange,
  initialSelectedIds = [],
}) => {
  const router = useRouter();
  const { clients, counts, loading } = useNoticeClients();

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    CLIENT_COLUMNS.forEach((col) => {
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
    storageKey: "notice_clients_tab_cols",
    initialWidths,
    minWidth: 80,
    maxWidth: 500,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<ChipFilter>("all");
  const [portalFilter, setPortalFilter] = useState<PortalFilter>("ALL");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [sortBy, setSortBy] = useState<SortByOption>("client_asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  );

  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [syncTargetIds, setSyncTargetIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  const toggleSelectAll = (filteredClients: ClientWithStats[]) => {
    if (selectedIds.size === filteredClients.length && filteredClients.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredClients = useMemo(() => {
    let result = [...clients];

    if (activeChip === "notices") {
      result = result.filter((c) => (c.totalNotices ?? 0) > 0);
    } else if (activeChip === "issues") {
      result = result.filter(
        (c) => c.sync.status === "error" || (c.overdueNotices ?? 0) > 0
      );
    }

    if (portalFilter !== "ALL") {
      result = result.filter((c) => c.portals.includes(portalFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const identMatch = getIdentifier(c).toLowerCase().includes(q);
        const stateMatch = c.state?.toLowerCase().includes(q) ?? false;
        return nameMatch || identMatch || stateMatch;
      });
    }

    result.sort((a, b) => {
      if (sortBy === "client_asc") return a.name.localeCompare(b.name);
      if (sortBy === "client_desc") return b.name.localeCompare(a.name);
      if (sortBy === "notices_desc") return (b.totalNotices ?? 0) - (a.totalNotices ?? 0);
      if (sortBy === "overdue_desc") return (b.overdueNotices ?? 0) - (a.overdueNotices ?? 0);
      return 0;
    });

    return result;
  }, [clients, activeChip, portalFilter, searchQuery, sortBy]);

  const clientGroups = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "All Clients", clients: filteredClients }];
    }

    const groups: Record<string, ClientWithStats[]> = {};
    for (const c of filteredClients) {
      const key =
        groupBy === "state"
          ? c.state || "Unknown State"
          : c.sync.status || "never_synced";
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }

    return Object.entries(groups).map(([key, list]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace("_", " "),
      clients: list,
    }));
  }, [filteredClients, groupBy]);

  const handleOpenSync = (ids: string[]) => {
    setSyncTargetIds(ids);
    setIsSyncDrawerOpen(true);
    onSync?.(ids);
  };

  const isAllSelected =
    filteredClients.length > 0 && selectedIds.size === filteredClients.length;

  return (
    <div className="flex flex-col gap-4 p-6 w-full flex-1" style={{ backgroundColor: "var(--bg-app)" }}>
      {/* 1. Metric Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveChip("all")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
          style={{
            backgroundColor: activeChip === "all" ? "var(--bg-active)" : "var(--bg-surface)",
            borderColor: activeChip === "all" ? "var(--primary)" : "var(--border-main)",
            color: activeChip === "all" ? "var(--primary)" : "var(--text-main)",
          }}
        >
          <span>All Clients</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px]" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-subtle)" }}>
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChip("notices")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
          style={{
            backgroundColor: activeChip === "notices" ? "var(--bg-active)" : "var(--bg-surface)",
            borderColor: activeChip === "notices" ? "var(--primary)" : "var(--border-main)",
            color: activeChip === "notices" ? "var(--primary)" : "var(--text-main)",
          }}
        >
          <span>With Notices</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px]" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-subtle)" }}>
            {counts.notices}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChip("issues")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
          style={{
            backgroundColor: activeChip === "issues" ? "var(--credits-bg)" : "var(--bg-surface)",
            borderColor: activeChip === "issues" ? "var(--danger)" : "var(--border-main)",
            color: activeChip === "issues" ? "var(--danger)" : "var(--text-main)",
          }}
        >
          <span>Issues / Errors</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px]" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--danger)" }}>
            {counts.issues}
          </span>
        </button>
      </div>

      {/* 2. Control & Search Toolbar */}
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
            placeholder="Search by client name, GSTIN, PAN..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md border outline-none transition-colors"
            style={{
              backgroundColor: "var(--bg-app)",
              borderColor: "var(--border-main)",
              color: "var(--text-main)",
            }}
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Portal Selector */}
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

          {/* Group By Selector */}
          <div className="relative inline-block text-xs">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
              className="appearance-none px-3 py-1.5 pr-7 text-xs font-medium rounded-md border transition-colors cursor-pointer outline-none"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <option value="none">No Grouping</option>
              <option value="state">Group by State</option>
              <option value="status">Group by Status</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-subtle)" }} />
          </div>

          {/* Sort Selector */}
          <div className="relative inline-block text-xs">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortByOption)}
              className="appearance-none px-3 py-1.5 pr-7 text-xs font-medium rounded-md border transition-colors cursor-pointer outline-none"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <option value="client_asc">Name (A-Z)</option>
              <option value="client_desc">Name (Z-A)</option>
              <option value="notices_desc">Most Notices</option>
              <option value="overdue_desc">Most Overdue</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-subtle)" }} />
          </div>

          {/* Primary Action Button: Sync Selected or All */}
          <button
            type="button"
            onClick={() => handleOpenSync(Array.from(selectedIds))}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer shadow-xs"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--text-inverse)",
            }}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>
              {selectedIds.size > 0
                ? `Sync Selected (${selectedIds.size})`
                : "Sync All Clients"}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Clients Data Table */}
      <div
        className="w-full rounded-lg border overflow-hidden shadow-xs"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr
                className="border-b text-[11px] font-semibold tracking-wider select-none uppercase"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-muted)",
                }}
              >
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => toggleSelectAll(filteredClients)}
                    className="rounded cursor-pointer"
                  />
                </th>
                {CLIENT_COLUMNS.map((col) => {
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
              {loading && filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={CLIENT_COLUMNS.length + 1} className="px-6 py-12 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
                    Loading clients…
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={CLIENT_COLUMNS.length + 1} className="px-6 py-12 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
                    No clients match the selected criteria.
                  </td>
                </tr>
              ) : (
                clientGroups.map((group) => {
                  const isExpanded = expandedGroups[group.key] ?? true;
                  return (
                    <React.Fragment key={group.key}>
                      {groupBy !== "none" && (
                        <tr
                          onClick={() =>
                            setExpandedGroups((prev) => ({
                              ...prev,
                              [group.key]: !prev[group.key],
                            }))
                          }
                          className="cursor-pointer border-b transition-colors select-none"
                          style={{
                            backgroundColor: "var(--bg-subtle)",
                            borderColor: "var(--border-main)",
                          }}
                        >
                          <td colSpan={CLIENT_COLUMNS.length + 1} className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span style={{ color: "var(--text-subtle)" }}>
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                              </span>
                              <span className="font-bold text-xs" style={{ color: "var(--text-main)" }}>
                                {group.label}
                              </span>
                              <span className="text-[11px] font-medium" style={{ color: "var(--text-subtle)" }}>
                                ({group.clients.length} {group.clients.length === 1 ? "client" : "clients"})
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}

                      {isExpanded &&
                        group.clients.map((client) => {
                          const isSelected = selectedIds.has(client.id);
                          return (
                            <tr
                              key={client.id}
                              className="border-b transition-colors"
                              style={{
                                borderColor: "var(--border-main)",
                                backgroundColor: isSelected ? "var(--bg-active)" : "var(--bg-surface)",
                              }}
                            >
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectOne(client.id)}
                                  className="rounded cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold truncate max-w-[240px]" style={{ color: "var(--text-main)" }}>
                                    {client.name}
                                  </span>
                                  {client.state && (
                                    <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
                                      {client.state}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs font-mono font-medium" style={{ color: "var(--text-main)" }}>
                                {getIdentifier(client)}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {client.portals.map((p) => (
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
                              <td className="px-4 py-3 text-xs">
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                                  style={{
                                    backgroundColor:
                                      client.sync.status === "ready"
                                        ? "var(--badge-new-bg)"
                                        : client.sync.status === "error"
                                        ? "var(--credits-bg)"
                                        : "var(--bg-subtle)",
                                    color:
                                      client.sync.status === "ready"
                                        ? "var(--badge-new-text)"
                                        : client.sync.status === "error"
                                        ? "var(--danger)"
                                        : "var(--text-muted)",
                                  }}
                                >
                                  {client.sync.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-main)" }}>
                                {client.totalNotices ?? 0}
                              </td>
                              <td className="px-4 py-3 text-xs" style={{ color: "var(--text-subtle)" }}>
                                {formatLastSyncDate(client.sync.lastSyncAt)}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSync([client.id])}
                                  className="text-xs font-semibold cursor-pointer hover:underline flex items-center gap-1"
                                  style={{ color: "var(--primary)" }}
                                >
                                  <RotateCw className="w-3 h-3" />
                                  <span>Sync</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync Drawer Modal */}
      <SyncDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        selectedClientIds={syncTargetIds}
        clients={clients}
      />
    </div>
  );
};
