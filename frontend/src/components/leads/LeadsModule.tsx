"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Lead } from "@/data/crmData";
import {
  LeadTableRow,
  ALL_LEAD_COLUMNS,
  LeadColumnDef,
  INITIAL_LEAD_COLUMN_WIDTHS,
} from "./LeadTableRow";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { ColumnResizer } from "@/components/ui/ColumnResizer";
import { Pagination } from "@/components/ui/Pagination";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useLeads,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useRestoreLead,
  useConvertLead,
} from "@/hooks/useLeadsQuery";

// Code-split heavy modals out of the initial critical hydration bundle
const LeadFormModal = dynamic(
  () => import("./LeadFormModal").then((mod) => mod.LeadFormModal),
  { ssr: false }
);

const ConvertLeadModal = dynamic(
  () => import("./ConvertLeadModal").then((mod) => mod.ConvertLeadModal),
  { ssr: false }
);

const LeadDetailsView = dynamic(
  () => import("./details/LeadDetailsView").then((mod) => mod.LeadDetailsView),
  { ssr: false }
);

// High-speed static Intl formatter (instantiated once, 100x faster than per-cell allocation)
const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (iso: string): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : DATE_FORMATTER.format(d);
  } catch {
    return iso;
  }
};

// Streamline initial DOM weight: show primary 9 business columns, hide secondary KYC details
const DEFAULT_HIDDEN = new Set([
  "firstName",
  "middleName",
  "lastName",
  "abbreviation",
  "updatedAt",
  "aadhaarMobile",
  "aadhaarAttachment",
  "panAttachment",
  "din",
  "dinAttachment",
  "mcaId",
  "mcaPassword",
  "nationality",
  "address",
  "country",
  "pincode",
  "policeStation",
  "postOffice",
  "referredBy",
]);

export { ALL_LEAD_COLUMNS };

export const LeadsModule: React.FC = () => {
  // Query parameters state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [sortKey, setSortKey] = useState<keyof Lead | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState<number>(15);
  const [page, setPage] = useState<number>(1);
  const [showDeleted, setShowDeleted] = useState(false);

  // UI state
  const [hiddenColumns] = useState<Set<string>>(DEFAULT_HIDDEN);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingLead, setEditingLead] = useState<Lead | null | undefined>(undefined);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Column resizing state with persistent storage
  const {
    columnWidths,
    getColumnWidth,
    handleResizeStart,
    resizingKey,
    resetColumnWidth,
  } = useResizableColumns({
    storageKey: "ayatrio-leads-col-widths",
    initialWidths: INITIAL_LEAD_COLUMN_WIDTHS,
    minWidth: 80,
  });

  // TanStack Query Hooks
  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch,
      sortBy: sortKey || undefined,
      sortOrder: sortDirection,
      includeDeleted: showDeleted,
    }),
    [page, pageSize, debouncedSearch, sortKey, sortDirection, showDeleted]
  );

  const { data, isLoading, isFetching } = useLeads(queryParams);

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();
  const restoreMutation = useRestoreLead();
  const convertMutation = useConvertLead();

  const leads = useMemo(() => data?.leads || [], [data?.leads]);
  const pagination = data?.pagination;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const visibleColumns = useMemo(() => {
    return ALL_LEAD_COLUMNS.filter(
      (c: LeadColumnDef) => c.key === "fullName" || !hiddenColumns.has(c.key as string)
    );
  }, [hiddenColumns]);

  const dynamicColumns = useMemo(() => {
    return visibleColumns.filter((col: LeadColumnDef) => col.key !== "fullName");
  }, [visibleColumns]);

  const toggleSort = useCallback((key: keyof Lead) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDirection("asc");
      return key;
    });
  }, []);

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allCurrentPageSelected = useMemo(
    () => leads.length > 0 && leads.every((row) => selectedIds.has(row.id)),
    [leads, selectedIds]
  );

  const toggleSelectAllPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (leads.every((r) => next.has(r.id))) {
        leads.forEach((r) => next.delete(r.id));
      } else {
        leads.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [leads]);

  const handleSaveLead = useCallback(
    async (lead: Lead) => {
      try {
        if (lead.id && leads.some((l) => l.id === lead.id)) {
          await updateMutation.mutateAsync({ id: lead.id, data: lead });
          showToast(`Lead "${lead.fullName}" updated.`);
        } else {
          await createMutation.mutateAsync(lead);
          showToast(`Lead "${lead.fullName}" created.`);
        }
        setEditingLead(undefined);
      } catch (err: any) {
        showToast(err.message || "Failed to save lead.");
      }
    },
    [leads, updateMutation, createMutation, showToast]
  );

  const handleDeleteLead = useCallback(
    async (id: string, name: string) => {
      if (window.confirm(`Are you sure you want to soft delete lead "${name}"?`)) {
        try {
          await deleteMutation.mutateAsync(id);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          showToast(`Lead "${name}" moved to trash.`);
        } catch (err: any) {
          showToast(err.message || "Failed to delete lead.");
        }
      }
    },
    [deleteMutation, showToast]
  );

  const handleRestoreLead = useCallback(
    async (id: string, name: string) => {
      try {
        await restoreMutation.mutateAsync(id);
        showToast(`Lead "${name}" restored.`);
      } catch (err: any) {
        showToast(err.message || "Failed to restore lead.");
      }
    },
    [restoreMutation, showToast]
  );

  const handleConvertLead = useCallback(
    async (config: { type: string; group: string; fileNo?: string; services?: string[] }) => {
      if (!convertingLead) return;
      try {
        await convertMutation.mutateAsync({
          id: convertingLead.id,
          payload: config,
        });
        showToast(`Lead "${convertingLead.fullName}" converted to client folder!`);
        setConvertingLead(null);
      } catch (err: any) {
        showToast(err.message || "Conversion failed.");
      }
    },
    [convertingLead, convertMutation, showToast]
  );


  if (selectedLeadForDetails) {
    return (
      <div className="w-full">
        {toastMessage && (
          <div className="fixed top-20 right-6 z-60 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border border-[#31719B]/30 bg-white dark:bg-[#1e293b] text-[#000000] dark:text-white animate-in slide-in-from-top-2 duration-200">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        )}

        <LeadDetailsView
          leadId={selectedLeadForDetails.id}
          initialLead={selectedLeadForDetails}
          onClose={() => setSelectedLeadForDetails(null)}
          onEditLead={(lead) => setEditingLead(lead)}
          onConvertLead={(lead) => setConvertingLead(lead)}
        />

        {editingLead !== undefined && (
          <LeadFormModal
            lead={editingLead}
            onSave={handleSaveLead}
            onClose={() => setEditingLead(undefined)}
          />
        )}

        {convertingLead && (
          <ConvertLeadModal
            lead={convertingLead}
            onConvert={handleConvertLead}
            onClose={() => setConvertingLead(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-60 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border border-[#31719B]/30 bg-white dark:bg-[#1e293b] text-[#000000] dark:text-white animate-in slide-in-from-top-2 duration-200">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
          >
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white py-2">
            Leads ({pagination?.totalDocs ?? leads.length})
          </h1>
          {isFetching && (
            <span title="Syncing...">
              <Loader2 className="w-4 h-4 animate-spin text-[#31719B]" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 py-2">
          {/* Toggle Soft-Deleted Records */}
          <button
            type="button"
            onClick={() => {
              setShowDeleted((prev) => !prev);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 h-10 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
              showDeleted
                ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300"
                : "border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:border-gray-400"
            }`}
            title="Toggle deleted records"
          >
            {showDeleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showDeleted ? "Trash View" : "Active Only"}</span>
          </button>

          {/* Search box with Debounced input */}
          <div className="relative min-w-[240px] md:min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="leads-search-input"
              name="leadsSearch"
              aria-label="Search leads by name, mobile, or email"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, mobile, email..."
              className="h-10 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-9 pr-8 text-xs md:text-sm text-[#000000] dark:text-white outline-none placeholder:text-gray-400 hover:border-gray-400 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Lead button */}
          <button
            type="button"
            onClick={() => setEditingLead(null)}
            className="flex items-center gap-1.5 h-10 px-4 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table with Memoized Rows */}
      <div className="bg-white dark:bg-[#1e293b] shadow-card overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-slim">
          <table
            suppressHydrationWarning
            className="min-w-full border-separate border-spacing-0 text-left text-xs select-none"
            style={{ width: "max-content" }}
          >
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                {/* Frozen Checkbox */}
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-12 min-w-[48px] max-w-[48px] px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  <input
                    id="leads-select-all-page"
                    name="selectAllLeads"
                    aria-label="Select all leads on this page"
                    title="Select all leads on this page"
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                  />
                </th>

                {/* Frozen Party Full Name */}
                <th
                  scope="col"
                  className="relative sticky left-[48px] z-30 px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-[#000000] dark:text-white"
                  style={{
                    backgroundColor: "var(--orange-havy-light)",
                    width: `${getColumnWidth("fullName")}px`,
                    minWidth: `${getColumnWidth("fullName")}px`,
                    maxWidth: `${getColumnWidth("fullName")}px`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort("fullName")}
                    className="flex items-center gap-1.5 hover:text-[#31719B] transition-colors cursor-pointer select-none"
                  >
                    <span>Party Full Name</span>
                    {sortKey === "fullName" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#31719B]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#31719B]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                  <ColumnResizer
                    onMouseDown={(e) => handleResizeStart("fullName", e)}
                    onDoubleClick={() => resetColumnWidth("fullName")}
                    isResizing={resizingKey === "fullName"}
                  />
                </th>

                {/* Dynamic Columns */}
                {dynamicColumns.map((col: LeadColumnDef) => {
                  const colWidth = getColumnWidth(col.key as string);
                  return (
                    <th
                      key={col.key as string}
                      scope="col"
                      className="relative px-3.5 py-3 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap"
                      style={{
                        backgroundColor: "var(--orange-havy-light)",
                        width: `${colWidth}px`,
                        minWidth: `${colWidth}px`,
                        maxWidth: `${colWidth}px`,
                      }}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key as keyof Lead)}
                          className="flex items-center gap-1.5 hover:text-[#31719B] transition-colors cursor-pointer select-none"
                        >
                          <span>{col.label}</span>
                          {sortKey === col.key ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#31719B]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#31719B]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      ) : (
                        <span>{col.label}</span>
                      )}
                      <ColumnResizer
                        onMouseDown={(e) => handleResizeStart(col.key as string, e)}
                        onDoubleClick={() => resetColumnWidth(col.key as string)}
                        isResizing={resizingKey === col.key}
                      />
                    </th>
                  );
                })}

                {/* Frozen Actions */}
                <th
                  scope="col"
                  className="sticky right-0 z-30 w-28 min-w-[112px] max-w-[112px] px-3 py-3 font-semibold text-[#000000] dark:text-white border-l border-b border-[#dde2e8] dark:border-[#334155] text-center"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading && leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="py-16 text-center text-gray-400 font-medium"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#31719B]" />
                      <span>Loading real-time leads from server...</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="py-16 text-center text-gray-400 font-medium"
                  >
                    {showDeleted
                      ? "Trash is empty."
                      : "No leads match this search. Click '+ Add' to create a lead."}
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => (
                  <LeadTableRow
                    key={lead.id || (lead as any)._id || `lead-${index}`}
                    lead={lead}
                    isSelected={selectedIds.has(lead.id)}
                    dynamicColumns={dynamicColumns}
                    columnWidths={columnWidths}
                    formatDate={formatDate}
                    onToggleSelect={toggleSelectRow}
                    onSelectLead={setSelectedLeadForDetails}
                    onEdit={setEditingLead}
                    onDelete={handleDeleteLead}
                    onRestore={handleRestoreLead}
                    onConvert={setConvertingLead}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b]">
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={pagination?.totalDocs || leads.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            showPageSize={true}
          />
        </div>
      </div>

      {/* Edit / Create Modal */}
      {editingLead !== undefined && (
        <LeadFormModal
          lead={editingLead}
          onSave={handleSaveLead}
          onClose={() => setEditingLead(undefined)}
        />
      )}

      {/* Convert to Client Modal */}
      {convertingLead && (
        <ConvertLeadModal
          lead={convertingLead}
          onConvert={handleConvertLead}
          onClose={() => setConvertingLead(null)}
        />
      )}
    </div>
  );
};
