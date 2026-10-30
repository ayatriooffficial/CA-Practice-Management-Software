"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { ToastNotification } from "@/components/ui/ToastNotification";

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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateClients, setSelectedClient, fetchClientByIdSuccess } from "@/store/features/clients/clientSlice";
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useRestoreClient,
} from "@/hooks/useClientsQuery";
import { useSearchParams, useRouter } from "next/navigation";
import { ClientTabType } from "./ClientDetailView";
import { clientApi } from "@/services/clientApi";

export { CLIENT_COLUMNS };

export interface ClientsInitialData {
  clients: Client[];
  pagination?: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

interface ClientsModuleProps {
  initialMode?: "list" | "create" | "detail";
  initialData?: ClientsInitialData;
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({
  initialMode = "list",
  initialData,
}) => {
  const [viewMode, setViewMode] = useState<"list" | "create" | "detail">(initialMode);

  const { canDelete, canAddEdit } = usePermission();
  const dispatch = useAppDispatch();
  const isLoaded = useAppSelector((state) => state.clients.isLoaded);

  // If server passed pre-rendered data and store is not populated yet, prime the store immediately
  useEffect(() => {
    if (initialData && !isLoaded && initialData.clients?.length > 0) {
      dispatch(
        hydrateClients({
          clients: initialData.clients,
          pagination: initialData.pagination as any,
          params: { page: 1, limit: initialData.pagination?.limit || 10 },
        })
      );
    }
  }, [dispatch, initialData, isLoaded]);
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

  // Router, searchParams and Redux selected client synchronization
  const searchParams = useSearchParams();
  const router = useRouter();
  const paramClientId = searchParams?.get("clientId") || searchParams?.get("id");
  const paramTab = (searchParams?.get("tab") as ClientTabType) || undefined;
  const reduxSelectedClient = useAppSelector((state) => state.clients.selectedClient);
  const [activeDetailTab, setActiveDetailTab] = useState<ClientTabType>("Master");

  // Keep detail tab synchronized with URL param
  useEffect(() => {
    if (paramTab) {
      setActiveDetailTab(paramTab);
    }
  }, [paramTab]);

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

  // Synchronize client selection from Redux store or URL params
  useEffect(() => {
    // 1. If Redux already has selectedClient matching URL param (or if no URL param given)
    if (reduxSelectedClient) {
      const rId = reduxSelectedClient.id || (reduxSelectedClient as any)._id;
      if (!paramClientId || paramClientId === rId) {
        setViewingClient(reduxSelectedClient);
        setViewMode("detail");
        return;
      }
    }

    // 2. If paramClientId is given in URL
    if (paramClientId) {
      const foundInList = clients.find(
        (c) => c.id === paramClientId || (c as any)._id === paramClientId
      );
      if (foundInList) {
        setViewingClient(foundInList);
        setViewMode("detail");
        dispatch(setSelectedClient(foundInList));
        return;
      }

      // If not yet in loaded clients list, fetch client from API
      let isMounted = true;
      clientApi
        .getClientById(paramClientId)
        .then((res) => {
          if (!isMounted) return;
          if (res && res.data) {
            setViewingClient(res.data);
            setViewMode("detail");
            dispatch(fetchClientByIdSuccess(res.data));
            dispatch(setSelectedClient(res.data));
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch client for detail view:", err);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [paramClientId, reduxSelectedClient, clients, dispatch]);

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
        initialTab={activeDetailTab}
        onClose={() => {
          setViewMode("list");
          setViewingClient(null);
          dispatch(setSelectedClient(null));
          setActiveDetailTab("Master");
          if (paramClientId || paramTab) {
            router.replace("/client");
          }
        }}
        onEdit={(c) => {
          setEditingClient(c);
          setViewMode("create");
        }}
        onClientUpdated={(updated) => {
          setViewingClient(updated);
          dispatch(setSelectedClient(updated));
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
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

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
                Array.from({ length: 6 }).map((_, rIdx) => (
                  <tr
                    key={`client-shimmer-${rIdx}`}
                    className={`border-b border-[#dde2e8] dark:border-[#334155] ${rIdx % 2 === 0
                      ? "bg-white dark:bg-[#1e293b]"
                      : "bg-[#fafafa] dark:bg-[#192437]"
                      }`}
                  >
                    {/* Frozen Checkbox Cell */}
                    <td className="sticky left-0 z-20 w-12 min-w-[48px] max-w-[48px] px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center bg-white dark:bg-[#1e293b]">
                      <div className="w-4 h-4 mx-auto rounded bg-gray-200 dark:bg-gray-700/60 animate-shimmer" />
                    </td>

                    {/* Columns */}
                    {visibleColumns.map((col: ClientColumnDef) => {
                      const colWidth = getColumnWidth(col.id);
                      return (
                        <td
                          key={col.id}
                          className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]"
                          style={{
                            width: `${colWidth}px`,
                            minWidth: `${colWidth}px`,
                            maxWidth: `${colWidth}px`,
                          }}
                        >
                          <div
                            className="rounded bg-gray-200 dark:bg-gray-700/60 animate-shimmer"
                            style={{
                              width:
                                col.id === "photo"
                                  ? "26px"
                                  : col.id === "name"
                                    ? "75%"
                                    : col.id === "fileNo"
                                      ? "55%"
                                      : col.id === "tags"
                                        ? "65%"
                                        : "50%",
                              height: col.id === "photo" ? "26px" : "13px",
                              borderRadius: col.id === "photo" ? "9999px" : "4px",
                              margin: col.id === "photo" ? "0 auto" : undefined,
                            }}
                          />
                        </td>
                      );
                    })}

                    {/* Actions Cell */}
                    <td className="sticky right-0 z-20 px-3 py-3 border-b border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-center shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700/60 animate-shimmer" />
                        <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700/60 animate-shimmer" />
                      </div>
                    </td>
                  </tr>
                ))
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
                        dispatch(setSelectedClient(c));
                        setActiveDetailTab("Master");
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
