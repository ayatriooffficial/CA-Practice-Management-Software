"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RotateCw,
  ChevronDown,
} from "lucide-react";
import type { Client } from "@/types/notices";
import { useNoticeClients, type ClientWithStats } from "@/hooks/useNoticeClients";
import { SyncDrawer } from "./SyncDrawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { BulkActionBar } from "@/components/ui/BulkActionBar";

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

export const ClientsTab: React.FC<ClientsTabProps> = ({
  onSync,
  onSelectionChange,
  initialSelectedIds = [],
}) => {
  const router = useRouter();
  const { clients, counts, loading } = useNoticeClients();

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

  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

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

    if (groupBy === "state") {
      result.sort((a, b) => (a.state || "").localeCompare(b.state || ""));
    } else if (groupBy === "status") {
      result.sort((a, b) => (a.sync.status || "").localeCompare(b.sync.status || ""));
    } else {
      result.sort((a, b) => {
        if (sortBy === "client_asc") return a.name.localeCompare(b.name);
        if (sortBy === "client_desc") return b.name.localeCompare(a.name);
        if (sortBy === "notices_desc") return (b.totalNotices ?? 0) - (a.totalNotices ?? 0);
        if (sortBy === "overdue_desc") return (b.overdueNotices ?? 0) - (a.overdueNotices ?? 0);
        return 0;
      });
    }

    return result;
  }, [clients, activeChip, portalFilter, searchQuery, sortBy, groupBy]);

  const handleOpenSync = (ids: string[]) => {
    setSyncTargetIds(ids);
    setIsSyncDrawerOpen(true);
    onSync?.(ids);
  };

  const columns: DataTableColumn<ClientWithStats>[] = useMemo(
    () => [
      {
        id: "client",
        header: "Client Name",
        width: 260,
        sortable: true,
        cell: (client) => (
          <div className="flex flex-col min-w-0">
            <span
              className="font-bold truncate max-w-[240px]"
              style={{ color: "var(--text-main)" }}
              title={client.name}
            >
              {client.name}
            </span>
            {client.state && (
              <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
                {client.state}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "identifiers",
        header: "GSTIN / PAN / TAN",
        width: 180,
        cell: (client) => (
          <span
            className="font-mono font-medium text-xs"
            style={{ color: "var(--text-main)" }}
          >
            {getIdentifier(client)}
          </span>
        ),
      },
      {
        id: "portals",
        header: "Connected Portals",
        width: 180,
        cell: (client) => (
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
        ),
      },
      {
        id: "syncStatus",
        header: "Sync Status",
        width: 150,
        cell: (client) => (
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
        ),
      },
      {
        id: "notices",
        header: "Active Notices",
        width: 130,
        sortable: true,
        cell: (client) => (
          <span
            className="font-semibold text-xs"
            style={{ color: "var(--text-main)" }}
          >
            {client.totalNotices ?? 0}
          </span>
        ),
      },
      {
        id: "lastSync",
        header: "Last Sync",
        width: 140,
        cell: (client) => (
          <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
            {formatLastSyncDate(client.sync.lastSyncAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        width: 110,
        cell: (client) => (
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCw className="w-3 h-3" />}
            onClick={() => handleOpenSync([client.id])}
          >
            Sync
          </Button>
        ),
      },
    ],
    []
  );

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
        <Input
          leftIcon={<Search className="w-4 h-4" />}
          inputSize="sm"
          placeholder="Search by client name, GSTIN, PAN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          containerClassName="flex-1 max-w-md"
        />

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
          <Button
            variant="primary"
            size="sm"
            icon={<RotateCw className="w-3.5 h-3.5" />}
            onClick={() => handleOpenSync(Array.from(selectedIds))}
          >
            {selectedIds.size > 0
              ? `Sync Selected (${selectedIds.size})`
              : "Sync All Clients"}
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        itemLabel="clients"
        deleteLabel="Sync Selected"
        onClearSelection={() => setSelectedIds(new Set())}
        onDelete={() => handleOpenSync(Array.from(selectedIds))}
      />

      {/* 3. Clients Data Table */}
      <div
        className="w-full rounded-lg border overflow-hidden shadow-xs"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <DataTable
          columns={columns}
          data={filteredClients}
          getRowId={(client) => client.id}
          selectable={true}
          selectedIds={Array.from(selectedIds)}
          onSelectionChange={(ids) => setSelectedIds(new Set(ids))}
          loading={loading && filteredClients.length === 0}
          emptyMessage="No clients match the selected criteria."
        />
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
