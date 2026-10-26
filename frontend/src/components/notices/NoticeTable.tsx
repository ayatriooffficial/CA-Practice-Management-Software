"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import type { Notice, Client, Portal, NoticeStatus } from "@/types/notices";
import { useNotices } from "@/hooks/useNotices";
import { SummaryCards, type SummaryCardItem } from "@/components/common/SummaryCards";
import { isNoticeClosed } from "@/lib/statusConfig";
import { ColumnResizer } from "@/components/ui/ColumnResizer";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { ToastNotification } from "@/components/ui/ToastNotification";

export interface ColumnDef {
  id: string;
  header: string;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  filterable?: boolean;
  defaultWidth?: number;
  render: (notice: Notice, client?: Client) => React.ReactNode;
}

export interface NoticeTableProps {
  portal: Portal;
  columns: ColumnDef[];
  searchPlaceholder?: string;
  defaultGroupBy?: "client" | "none";
}

export function getClientIdentifier(client?: Client, portal: Portal = "GST"): string {
  if (!client) return "";
  if (portal === "GST") {
    return client.identifiers.gstin || client.identifiers.tan || client.identifiers.pan || "";
  }
  if (portal === "TDS") {
    return client.identifiers.tan || client.identifiers.pan || client.identifiers.gstin || "";
  }
  return client.identifiers.pan || client.identifiers.tan || client.identifiers.gstin || "";
}

export function formatNoticeDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export const NoticeTable: React.FC<NoticeTableProps> = ({
  portal,
  columns,
  searchPlaceholder = "Search by client, notice number, description...",
  defaultGroupBy = "client",
}) => {
  const { notices, clients, summary, loading, error, refetch, changeStatus } = useNotices({ portal });

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    columns.forEach((col) => {
      widths[col.id] = col.defaultWidth || 160;
    });
    return widths;
  }, [columns]);

  const {
    getColumnWidth,
    handleResizeStart,
    resizingKey,
    resetColumnWidth,
  } = useResizableColumns({
    storageKey: `notice_table_cols_${portal}`,
    initialWidths,
    minWidth: 90,
    maxWidth: 500,
  });

  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || searchParams.get("q") || "";
  const [internalSearch, setInternalSearch] = useState<string | null>(null);
  const searchQuery = internalSearch !== null ? internalSearch : urlSearch;
  const setSearchQuery = (val: string) => setInternalSearch(val);

  const [selectedStatus, setSelectedStatus] = useState<NoticeStatus | "ALL">("ALL");
  const [groupBy, setGroupBy] = useState<"client" | "none">(defaultGroupBy);
  const [sortBy, setSortBy] = useState<"client_asc" | "client_desc" | "date_desc" | "date_asc">(
    "client_asc"
  );
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    for (const c of clients) {
      map.set(c.id, c);
    }
    return map;
  }, [clients]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const renderCell = (notice: Notice, client: Client | undefined, column: ColumnDef) => {
    if (column.id !== "status" && column.id !== "manualStatus") {
      return column.render(notice, client);
    }
    const status = notice.portal === "GST" ? notice.status : notice.manualStatus;
    return (
      <select
        value={status}
        onChange={(event) => {
          changeStatus(notice.id, event.target.value as NoticeStatus).catch((err: unknown) => {
            triggerToast(err instanceof Error ? err.message : "Unable to update status");
          });
        }}
        className="rounded border px-2 py-1 text-xs"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-main)", color: "var(--text-main)" }}
      >
        {["new", "response_preparing", "response_filed", "under_dept_review", "hearing_scheduled", "appeal_filed", "closed", "no_status"].map((value) => (
          <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
        ))}
      </select>
    );
  };

  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  const filteredNotices = useMemo(() => {
    let result = [...notices];

    if (selectedStatus !== "ALL") {
      result = result.filter((n) => {
        const s = n.portal === "GST" ? n.status : n.manualStatus;
        return s === selectedStatus;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((n) => {
        const client = clientMap.get(n.clientId);
        const clientName = client?.name?.toLowerCase() || "";
        const clientIdent = getClientIdentifier(client, portal).toLowerCase();
        const noticeNum = n.noticeNumber?.toLowerCase() || "";
        const desc = n.description?.toLowerCase() || "";

        let cat = "";
        let formType = "";
        if ("category" in n && typeof n.category === "string") cat = n.category.toLowerCase();
        if ("formType" in n && typeof n.formType === "string") formType = n.formType.toLowerCase();

        return (
          clientName.includes(q) ||
          clientIdent.includes(q) ||
          noticeNum.includes(q) ||
          desc.includes(q) ||
          cat.includes(q) ||
          formType.includes(q)
        );
      });
    }

    result.sort((a, b) => {
      const clientA = clientMap.get(a.clientId)?.name || "";
      const clientB = clientMap.get(b.clientId)?.name || "";

      if (sortBy === "client_asc") {
        const cComp = clientA.localeCompare(clientB);
        if (cComp !== 0) return cComp;
      } else if (sortBy === "client_desc") {
        const cComp = clientB.localeCompare(clientA);
        if (cComp !== 0) return cComp;
      }

      const dateA = a.portal === "IT" ? a.issuedOn : a.noticeDate;
      const dateB = b.portal === "IT" ? b.issuedOn : b.noticeDate;

      if (sortBy === "date_asc") {
        return (dateA || "").localeCompare(dateB || "");
      }
      return (dateB || "").localeCompare(dateA || "");
    });

    return result;
  }, [notices, selectedStatus, searchQuery, sortBy, clientMap, portal]);

  const clientGroups = useMemo(() => {
    const allPortalClientIds = Array.from(new Set(notices.map((n) => n.clientId)));
    const grouped = new Map<string, Notice[]>();
    for (const n of filteredNotices) {
      const list = grouped.get(n.clientId) || [];
      list.push(n);
      grouped.set(n.clientId, list);
    }

    const sortedClientIds = Array.from(grouped.keys()).sort((a, b) => {
      const nameA = clientMap.get(a)?.name || "";
      const nameB = clientMap.get(b)?.name || "";
      if (sortBy === "client_desc") {
        return nameB.localeCompare(nameA);
      }
      return nameA.localeCompare(nameB);
    });

    return {
      groups: sortedClientIds.map((clientId) => ({
        clientId,
        client: clientMap.get(clientId),
        notices: grouped.get(clientId) || [],
      })),
      totalClientsCount: allPortalClientIds.length,
    };
  }, [notices, filteredNotices, clientMap, sortBy]);

  const { openCount, closedCount } = useMemo(() => {
    let closed = 0;
    for (const n of filteredNotices) {
      const status = n.portal === "GST" ? n.status : n.manualStatus;
      if (isNoticeClosed(status)) {
        closed++;
      }
    }
    const open = filteredNotices.length - closed;
    return { openCount: open, closedCount: closed };
  }, [filteredNotices]);

  const summaryItems: SummaryCardItem[] = useMemo(() => {
    return [
      { label: "Total", count: summary.total, colorToken: "--primary", icon: "Inbox" },
      { label: "New", count: summary.new, colorToken: "--badge-addon-text", icon: "Sparkles" },
      { label: "Response Preparing", count: summary.response_preparing, colorToken: "--banner-text", icon: "Clock" },
      { label: "Response Filed", count: summary.response_filed, colorToken: "--badge-new-text", icon: "CheckCircle" },
      { label: "Under Dept Review", count: summary.under_dept_review, colorToken: "--primary", icon: "Eye" },
      { label: "Hearing Scheduled", count: summary.hearing_scheduled, colorToken: "--primary-hover", icon: "Calendar" },
      { label: "Appeal Filed", count: summary.appeal_filed, colorToken: "--text-main", icon: "FileText" },
      { label: "Closed", count: summary.closed, colorToken: "--text-muted", icon: "Archive" },
      { label: "No Status", count: summary.no_status, colorToken: "--text-subtle", icon: "MinusCircle" },
    ];
  }, [summary]);

  const handleCardClick = (item: SummaryCardItem) => {
    const map: Record<string, NoticeStatus | "ALL"> = {
      Total: "ALL",
      New: "new",
      "Response Preparing": "response_preparing",
      "Response Filed": "response_filed",
      "Under Dept Review": "under_dept_review",
      "Hearing Scheduled": "hearing_scheduled",
      "Appeal Filed": "appeal_filed",
      Closed: "closed",
      "No Status": "no_status",
    };
    setSelectedStatus(map[item.label] || "ALL");
  };

  const handleExportCsv = () => {
    const headers = columns.map((c) => c.header).join(",");
    const rows = filteredNotices.map((n) => {
      const client = clientMap.get(n.clientId);
      return columns
        .map((c) => {
          if (c.id === "client") return `"${client?.name || ""}"`;
          if (c.id === "noticeNumber") return `"${n.noticeNumber}"`;
          if (c.id === "status" || c.id === "manualStatus") {
            return `"${n.portal === "GST" ? n.status : n.manualStatus}"`;
          }
          return `""`;
        })
        .join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${portal.toLowerCase()}_notices.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4 p-6 w-full flex-1" style={{ backgroundColor: "var(--bg-app)" }}>
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Summary Cards */}
      <SummaryCards
        items={summaryItems}
        onItemClick={handleCardClick}
        className="w-full"
      />

      {/* Toolbar */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="relative flex-1 max-w-lg">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--text-subtle)" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md border outline-none transition-colors"
            style={{
              backgroundColor: "var(--bg-app)",
              borderColor: "var(--border-main)",
              color: "var(--text-main)",
            }}
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => triggerToast("Download utility initiated")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
              color: "var(--text-main)",
            }}
          >
            <Download className="w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} />
            <span>Download Utility</span>
          </button>

          <div className="relative inline-block text-xs">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "client" | "none")}
              className="appearance-none px-3 py-1.5 pr-7 text-xs font-medium rounded-md border transition-colors cursor-pointer outline-none"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <option value="client">Group by Client</option>
              <option value="none">No grouping</option>
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "var(--text-subtle)" }}
            />
          </div>

          <div className="relative inline-block text-xs">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "client_asc" | "client_desc" | "date_desc" | "date_asc"
                )
              }
              className="appearance-none px-3 py-1.5 pr-7 text-xs font-medium rounded-md border transition-colors cursor-pointer outline-none"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <option value="client_asc">Sort by Client (A-Z)</option>
              <option value="client_desc">Sort by Client (Z-A)</option>
              <option value="date_desc">Sort by Date (Newest)</option>
              <option value="date_asc">Sort by Date (Oldest)</option>
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "var(--text-subtle)" }}
            />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
              color: "var(--text-main)",
            }}
          >
            <Download className="w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} />
            <span>XLS</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
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
                {columns.map((col) => {
                  const width = getColumnWidth(col.id);
                  return (
                    <th
                      key={col.id}
                      className={`relative px-4 py-3 whitespace-nowrap ${col.headerClassName || ""}`}
                      style={{ width, minWidth: width }}
                    >
                      <div className="flex items-center gap-1.5 pr-3">
                        <span>{col.header}</span>
                        {col.sortable && (
                          <ArrowUpDown
                            className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100"
                            style={{ color: "var(--text-subtle)" }}
                          />
                        )}
                        {col.filterable && (
                          <Filter
                            className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100"
                            style={{ color: "var(--text-subtle)" }}
                          />
                        )}
                      </div>
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
              {loading && filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
                    Loading notices…
                  </td>
                </tr>
              ) : filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
                    No notices match the selected criteria.
                  </td>
                </tr>
              ) : groupBy === "client" ? (
                clientGroups.groups.map(({ clientId, client, notices: cNotices }) => {
                  const isExpanded = expandedClients[clientId] ?? true;
                  const ident = getClientIdentifier(client, portal);

                  return (
                    <React.Fragment key={clientId}>
                      <tr
                        onClick={() => toggleClient(clientId)}
                        className="cursor-pointer border-b transition-colors select-none"
                        style={{
                          backgroundColor: "var(--bg-subtle)",
                          borderColor: "var(--border-main)",
                        }}
                      >
                        <td colSpan={columns.length} className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span style={{ color: "var(--text-subtle)" }}>
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </span>
                            <span className="font-bold text-xs" style={{ color: "var(--text-main)" }}>
                              {client?.name || "Unknown Client"}
                            </span>
                            {ident && (
                              <span className="text-[11px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-active)", color: "var(--primary)" }}>
                                {ident}
                              </span>
                            )}
                            <span className="text-[11px] font-medium" style={{ color: "var(--text-subtle)" }}>
                              ({cNotices.length} {cNotices.length === 1 ? "notice" : "notices"})
                            </span>
                          </div>
                        </td>
                      </tr>

                      {isExpanded &&
                        cNotices.map((notice) => (
                          <tr
                            key={notice.id}
                            className="border-b transition-colors"
                            style={{
                              borderColor: "var(--border-main)",
                              backgroundColor: "var(--bg-surface)",
                            }}
                          >
                            {columns.map((col) => {
                              const width = getColumnWidth(col.id);
                              return (
                                <td
                                  key={col.id}
                                  className={`px-4 py-3 text-xs ${col.className || ""}`}
                                  style={{ width, minWidth: width }}
                                >
                                  {renderCell(notice, client, col)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              ) : (
                filteredNotices.map((notice) => {
                  const client = clientMap.get(notice.clientId);
                  return (
                    <tr
                      key={notice.id}
                      className="border-b transition-colors"
                      style={{
                        borderColor: "var(--border-main)",
                        backgroundColor: "var(--bg-surface)",
                      }}
                    >
                      {columns.map((col) => {
                        const width = getColumnWidth(col.id);
                        return (
                          <td
                            key={col.id}
                            className={`px-4 py-3 text-xs ${col.className || ""}`}
                            style={{ width, minWidth: width }}
                          >
                            {renderCell(notice, client, col)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t text-xs"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
            color: "var(--text-subtle)",
          }}
        >
          <div>
            Showing <span className="font-semibold" style={{ color: "var(--text-main)" }}>{filteredNotices.length}</span> of{" "}
            <span className="font-semibold" style={{ color: "var(--text-main)" }}>{notices.length}</span> notices (
            <span className="font-semibold" style={{ color: "var(--text-main)" }}>{openCount}</span> open,{" "}
            <span className="font-semibold" style={{ color: "var(--text-main)" }}>{closedCount}</span> closed)
          </div>
          <div>
            Total Clients with Notices:{" "}
            <span className="font-semibold" style={{ color: "var(--text-main)" }}>{clientGroups.totalClientsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
