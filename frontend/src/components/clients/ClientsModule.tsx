"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  RotateCcw,
  X,
  Check,
  Loader2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  Client,
  CLIENT_TYPES,
  CLIENT_GROUPS,
} from "@/data/crmData";
import {
  ClientTableRow,
  CLIENT_COLUMNS,
  ClientColumnDef,
  INITIAL_CLIENT_COLUMN_WIDTHS,
} from "./ClientTableRow";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { ColumnResizer } from "@/components/ui/ColumnResizer";
import { Select } from "@/components/ui/Select";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { BulkActionBar } from "@/components/ui/BulkActionBar";

// Dynamically split heavy form and detail drawer from the critical table route
const ClientForm = dynamic(
  () => import("./ClientForm").then((mod) => mod.ClientForm),
  { ssr: false }
);

const ClientDetailView = dynamic(
  () => import("./ClientDetailView").then((mod) => mod.ClientDetailView),
  { ssr: false }
);
import { Pagination } from "@/components/ui/Pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/components/team/usePermission";
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useRestoreClient,
} from "@/hooks/useClientsQuery";

export { CLIENT_COLUMNS };

interface ClientsModuleProps {
  initialMode?: "list" | "create" | "detail";
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({
  initialMode = "list",
}) => {
  const [viewMode, setViewMode] = useState<"list" | "create" | "detail">(initialMode);

  const { canDelete, canAddEdit } = usePermission();
  // Filters State
  const [draftSearch, setDraftSearch] = useState("");
  const debouncedSearch = useDebounce(draftSearch, 300);
  const [draftType, setDraftType] = useState("");
  const [draftGroup, setDraftGroup] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // Table State
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [hiddenColumns] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Modals & Drawers
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Column resizing state with persistent storage
  const {
    columnWidths,
    getColumnWidth,
    handleResizeStart,
    resizingKey,
    resetColumnWidth,
  } = useResizableColumns({
    storageKey: "ayatrio-clients-col-widths",
    initialWidths: INITIAL_CLIENT_COLUMN_WIDTHS,
    minWidth: 60,
  });

  // Query Parameters
  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      type: draftType || undefined,
      group: draftGroup || undefined,
      active: draftStatus === "active" ? true : draftStatus === "inactive" ? false : undefined,
      sortBy: sortKey || undefined,
      sortOrder: sortDirection,
      includeDeleted: showDeleted,
    }),
    [page, pageSize, debouncedSearch, draftType, draftGroup, draftStatus, sortKey, sortDirection, showDeleted]
  );

  // TanStack Query Hooks
  const { data, isLoading, isFetching } = useClients(queryParams);
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();
  const restoreMutation = useRestoreClient();

  const clients = useMemo(() => data?.clients || [], [data?.clients]);
  const pagination = data?.pagination;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const visibleColumns = useMemo(() => {
    return CLIENT_COLUMNS.filter((col: ClientColumnDef) => !hiddenColumns.has(col.id));
  }, [hiddenColumns]);

  const toggleSort = useCallback((key: string) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
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
    () => clients.length > 0 && clients.every((row) => selectedIds.has(row.id)),
    [clients, selectedIds]
  );

  const toggleSelectAllPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (clients.every((r) => next.has(r.id))) {
        clients.forEach((r) => next.delete(r.id));
      } else {
        clients.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [clients]);

  // Status toggle
  const handleToggleActive = useCallback(
    async (id: string) => {
      const target = clients.find((c) => c.id === id);
      if (!target) return;
      const nextActive = !target.active;
      try {
        await updateMutation.mutateAsync({
          id,
          data: { active: nextActive },
        });
        showToast(`Client "${target.name}" marked as ${nextActive ? "Active" : "Inactive"}.`);
        if (viewingClient?.id === id) {
          setViewingClient((prev) => (prev ? { ...prev, active: nextActive } : null));
        }
      } catch (err: any) {
        showToast(err.message || "Failed to update status.");
      }
    },
    [clients, updateMutation, showToast, viewingClient]
  );

  // In-App Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({
    isOpen: false,
    id: "",
    name: "",
  });

  // Soft Delete
  const handleDeleteClient = useCallback(
    (id: string, name: string) => {
      setDeleteConfirm({
        isOpen: true,
        id,
        name,
      });
    },
    []
  );

  const handleConfirmDelete = async () => {
    const { id, name } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, id: "", name: "" });
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (viewingClient?.id === id) setViewingClient(null);
      showToast(`Client "${name}" moved to trash.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete client.");
    }
  };

  // Bulk Delete State & Handler
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      await Promise.allSettled(
        idsToDelete.map((id) => deleteMutation.mutateAsync(id))
      );
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      showToast(`${idsToDelete.length} ${idsToDelete.length === 1 ? "client" : "clients"} moved to trash.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete selected clients.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Restore
  const handleRestoreClient = useCallback(
    async (id: string, name: string) => {
      try {
        await restoreMutation.mutateAsync(id);
        showToast(`Client "${name}" restored.`);
      } catch (err: any) {
        showToast(err.message || "Failed to restore client.");
      }
    },
    [restoreMutation, showToast]
  );

  // Save from ClientForm
  const handleSaveClientForm = useCallback(
    async (client: Client) => {
      try {
        if (client.id && clients.some((c) => c.id === client.id)) {
          await updateMutation.mutateAsync({ id: client.id, data: client });
          showToast(`Client "${client.name}" updated successfully.`);
        } else {
          const payload: any = { ...client };
          if (!payload.id || payload.id.startsWith("client-") || payload.id.startsWith("CL-")) {
            delete payload.id;
          }
          if (!payload.fileNo) {
            delete payload.fileNo;
          }
          await createMutation.mutateAsync(payload);
          showToast(`Client "${client.name}" registered successfully.`);
        }
        setViewMode("list");
        setEditingClient(null);
      } catch (err: any) {
        showToast(err.message || "Failed to save client.");
        throw err;
      }
    },
    [clients, updateMutation, createMutation, showToast]
  );

  const handleResetFilters = useCallback(() => {
    setDraftSearch("");
    setDraftType("");
    setDraftGroup("");
    setDraftStatus("");
    setPage(1);
  }, []);

  // Detail View Mode matching Screenshots 1-4
  if (viewMode === "detail" && viewingClient) {
    return (
      <ClientDetailView
        client={viewingClient}
        onClose={() => {
          setViewMode("list");
          setViewingClient(null);
        }}
        onEdit={(c) => {
          setEditingClient(c);
          setViewMode("create");
        }}
        onClientUpdated={(updated) => {
          setViewingClient(updated);
        }}
      />
    );
  }

  // Form View Mode
  if (viewMode === "create") {
    return (
      <ClientForm
        initialClient={editingClient}
        onSave={handleSaveClientForm}
        onCancel={() => {
          setViewMode("list");
          setEditingClient(null);
        }}
      />
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Toast Feedback */}
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

      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white py-2">
            Clients ({pagination?.totalDocs ?? clients.length})
          </h1>
          {isFetching && (
            <span title="Syncing...">
              <Loader2 className="w-4 h-4 animate-spin text-[#31719B]" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 py-2">
          {/* Toggle Trash / Active View */}
          {canDelete("clients") && (
            <button
              type="button"
              onClick={() => {
                setShowDeleted((prev) => !prev);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 h-10 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer ${showDeleted
                  ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300"
                  : "border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:border-gray-400"
                }`}
              title="Toggle deleted records"
            >
              {showDeleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showDeleted ? "Trash View" : "Active Only"}</span>
            </button>
          )}

          {/* New Client Button */}
          {canAddEdit("clients") && (
            <button
              type="button"
              onClick={() => {
                setEditingClient(null);
                setViewMode("create");
              }}
              className="flex items-center gap-1.5 h-10 px-4 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Client</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4  bg-white dark:bg-[#1e293b] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Debounced Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="clients-search-input"
              name="clientsSearch"
              aria-label="Search clients by name, file number, or mobile"
              type="text"
              value={draftSearch}
              onChange={(e) => {
                setDraftSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, file no, mobile..."
              className="h-10 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-9 pr-8 text-xs text-[#000000] dark:text-white outline-none focus:border-[#31719B]"
            />
            {draftSearch && (
              <button
                type="button"
                onClick={() => {
                  setDraftSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <Select
            aria-label="Filter by constitution type"
            value={draftType}
            onChange={(val) => {
              setDraftType(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Constitution Types" },
              ...CLIENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
            ]}
          />

          {/* Group Filter */}
          <Select
            aria-label="Filter by client group"
            value={draftGroup}
            onChange={(val) => {
              setDraftGroup(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Groups" },
              ...CLIENT_GROUPS.map((g) => ({ value: g, label: g })),
            ]}
          />

          {/* Status Filter */}
          <Select
            aria-label="Filter by client status"
            value={draftStatus}
            onChange={(val) => {
              setDraftStatus(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Status" },
              { value: "active", label: "Active Only" },
              { value: "inactive", label: "Inactive Only" },
            ]}
          />

          {/* Reset Filters */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 h-10 px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar on Selection */}
      {selectedIds.size > 0 && canDelete("clients") && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onDelete={() => setBulkDeleteConfirm(true)}
          isDeleting={isBulkDeleting}
          itemLabel="clients"
          deleteLabel="Delete Selected"
        />
      )}

      {/* Spreadsheet Table */}
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
                    id="clients-select-all-page"
                    name="selectAllClients"
                    aria-label="Select all clients on this page"
                    title="Select all clients on this page"
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                  />
                </th>

                {/* Dynamic Columns */}
                {visibleColumns.map((col: ClientColumnDef) => {
                  const colWidth = getColumnWidth(col.id);
                  return (
                    <th
                      key={col.id}
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
                          onClick={() => toggleSort(col.id)}
                          className="flex items-center gap-1.5 hover:text-[#31719B] transition-colors cursor-pointer select-none"
                        >
                          <span>{col.label}</span>
                          {sortKey === col.id ? (
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
                        onMouseDown={(e) => handleResizeStart(col.id, e)}
                        onDoubleClick={() => resetColumnWidth(col.id)}
                        isResizing={resizingKey === col.id}
                      />
                    </th>
                  );
                })}

                {/* Actions Column */}
                <th
                  scope="col"
                  className="sticky right-0 z-30 w-24 min-w-[96px] max-w-[96px] px-3 py-3 font-semibold text-[#000000] dark:text-white border-l border-b border-[#dde2e8] dark:border-[#334155] text-center"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading && clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="py-16 text-center text-gray-400 font-medium"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#31719B]" />
                      <span>Loading real-time clients from server...</span>
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="py-16 text-center text-gray-400 font-medium"
                  >
                    {showDeleted
                      ? "Trash is empty."
                      : "No clients found. Click '+ Add Client' to register a new client."}
                  </td>
                </tr>
              ) : (
                clients.map((client, index) => {
                  const uniqueKey = client.id || (client as any)._id || `client-${client.fileNo || index}`;
                  return (
                    <ClientTableRow
                      key={uniqueKey}
                      client={client}
                      isSelected={selectedIds.has(client.id)}
                      visibleColumns={visibleColumns}
                      columnWidths={columnWidths}
                      activeMenuId={activeMenuId}
                      onToggleSelect={toggleSelectRow}
                      onView={(c) => {
                        setViewingClient(c);
                        setViewMode("detail");
                      }}
                      onEdit={(c) => {
                        setEditingClient(c);
                        setViewMode("create");
                      }}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDeleteClient}
                      onRestore={handleRestoreClient}
                      onToggleMenu={setActiveMenuId}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b]">
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={pagination?.totalDocs || clients.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            showPageSize={true}
          />
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title="Move Client to Trash?"
        message={`Are you sure you want to move client "${deleteConfirm.name}" to trash?`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        confirmVariant="danger"
        onKeepEditing={() => setDeleteConfirm({ isOpen: false, id: "", name: "" })}
        onDiscard={handleConfirmDelete}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={bulkDeleteConfirm}
        title={`Delete ${selectedIds.size} Selected Clients?`}
        message={`Are you sure you want to delete ${selectedIds.size} selected ${selectedIds.size === 1 ? "client" : "clients"}? They will be moved to trash and can be restored if needed.`}
        confirmText="Delete Selected"
        cancelText="Cancel"
        confirmVariant="danger"
        onKeepEditing={() => setBulkDeleteConfirm(false)}
        onDiscard={handleBulkDelete}
      />
    </div>
  );
};
