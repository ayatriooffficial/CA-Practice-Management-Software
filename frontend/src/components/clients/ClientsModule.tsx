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
import Link from "next/link";
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
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { DropdownActionItem } from "@/components/ui/TableActionDropdown";
import { getDirectFilePreviewUrl } from "@/utils/filePreview";
import { Phone, Pencil, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  const reduxClientsList = useAppSelector((state) => state.clients.items);

  // Synchronize clients catalog with MCA Auto-Fill Extension
  useEffect(() => {
    if (reduxClientsList && reduxClientsList.length > 0 && typeof window !== "undefined") {
      window.postMessage(
        {
          type: "CA_PRACTICE_SYNC_CLIENTS",
          clients: reduxClientsList,
        },
        "*"
      );
    }
  }, [reduxClientsList]);
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

  // Synchronize client selection from Redux store or URL params (URL is single source of truth)
  useEffect(() => {
    // 1. If no paramClientId in URL, user is on client list view
    if (!paramClientId) {
      setViewingClient(null);
      setViewMode("list");
      return;
    }

    // 2. If paramClientId is given in URL, show detail view
    const foundInList = clients.find(
      (c) => c.id === paramClientId || (c as any)._id === paramClientId
    );
    if (foundInList) {
      setViewingClient(foundInList);
      setViewMode("detail");
      dispatch(setSelectedClient(foundInList));
      return;
    }

    // If reduxSelectedClient matches the requested ID, use it immediately
    if (reduxSelectedClient) {
      const rId = reduxSelectedClient.id || (reduxSelectedClient as any)._id;
      if (paramClientId === rId) {
        setViewingClient(reduxSelectedClient);
        setViewMode("detail");
        return;
      }
    }

    // If not yet in memory, fetch client from API
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
  }, [paramClientId, reduxSelectedClient, clients, dispatch]);

  // Handle fresh reload when clicking sidebar Client item
  useEffect(() => {
    const handleReset = () => {
      setViewingClient(null);
      setViewMode("list");
      dispatch(setSelectedClient(null));
      setActiveDetailTab("Master");
    };
    window.addEventListener("app:reset-view:client", handleReset);
    return () => {
      window.removeEventListener("app:reset-view:client", handleReset);
    };
  }, [dispatch]);

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
        const errorDetail = err.errors && Array.isArray(err.errors) && err.errors.length > 0
          ? err.errors.map((e: any) => (e.field ? `${e.field}: ${e.message}` : e.message)).join(", ")
          : (err.message || "Failed to save client.");
        showToast(errorDetail);
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

  const handleSelectClient = useCallback(
    async (client: Client, tab: ClientTabType = "Master") => {
      const cId = client.id || (client as any)._id;
      setViewingClient(client);
      dispatch(setSelectedClient(client));
      setActiveDetailTab(tab);
      setViewMode("detail");
      if (cId) {
        router.push(`/client?clientId=${encodeURIComponent(cId)}&tab=${encodeURIComponent(tab)}`);
        try {
          const res = await clientApi.getClientById(cId, { section: "master" });
          if (res && res.data) {
            setViewingClient((prev) => (prev ? { ...prev, ...res.data } : res.data));
            dispatch(setSelectedClient(res.data));
            dispatch(fetchClientByIdSuccess(res.data));
          }
        } catch (err) {
          console.error("Failed to load client master profile:", err);
        }
      }
    },
    [dispatch, router]
  );

  const handleTabChange = useCallback(
    (tab: ClientTabType) => {
      setActiveDetailTab(tab);
      if (viewingClient) {
        const cId = viewingClient.id || (viewingClient as any)._id;
        router.push(`/client?clientId=${encodeURIComponent(cId)}&tab=${encodeURIComponent(tab)}`);
      }
    },
    [router, viewingClient]
  );

  // DataTable columns adapter for Clients
  const clientDataTableColumns = useMemo<DataTableColumn<Client>[]>(() => {
    return [
      {
        id: "photo",
        header: "PHOTO",
        width: getColumnWidth("photo") || 70,
        align: "center",
        cell: (client: Client) => {
          return client.photo ? (
            <img
              src={getDirectFilePreviewUrl(client.photo)}
              alt=""
              className="w-7 h-7 rounded-full object-cover mx-auto border border-gray-200"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 mx-auto text-xs font-bold">
              {client.name.charAt(0).toUpperCase()}
            </div>
          );
        },
      },
      {
        id: "fileNo",
        header: "FILE NO.",
        accessorKey: "fileNo",
        sortable: true,
        width: getColumnWidth("fileNo") || 130,
        cell: (client: Client) => (
          <button
            type="button"
            onClick={() => handleSelectClient(client, "Master")}
            className="hover:text-[#31719B] hover:underline cursor-pointer truncate max-w-full font-mono text-xs text-gray-600 dark:text-gray-400"
          >
            {client.fileNo}
          </button>
        ),
      },
      {
        id: "name",
        header: "NAME",
        accessorKey: "name",
        sortable: true,
        width: getColumnWidth("name") || 220,
        cell: (client: Client) => {
          const isDeleted = Boolean((client as any).isDeleted);
          return (
            <button
              type="button"
              onClick={() => handleSelectClient(client, "Master")}
              className="hover:underline cursor-pointer text-left flex items-center gap-1.5 truncate max-w-full font-semibold text-[#31719B]"
            >
              <span className="truncate">{client.name}</span>
              {isDeleted && (
                <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                  Deleted
                </span>
              )}
            </button>
          );
        },
      },
      {
        id: "type",
        header: "TYPE",
        accessorKey: "type",
        sortable: true,
        width: getColumnWidth("type") || 140,
        cell: (client: Client) => (
          <span className="capitalize">{client.type?.replace("-", " ")}</span>
        ),
      },
      {
        id: "mobile",
        header: "MOBILE",
        width: getColumnWidth("mobile") || 150,
        cell: (client: Client) => (
          <a
            href={"tel:" + client.mobile}
            className="flex items-center gap-1 text-[#31719B] hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{client.mobile}</span>
          </a>
        ),
      },
      {
        id: "group",
        header: "GROUP",
        accessorKey: "group",
        sortable: true,
        width: getColumnWidth("group") || 150,
        cell: (client: Client) => (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs truncate max-w-full inline-block">
            {client.group}
          </span>
        ),
      },
      {
        id: "tags",
        header: "TAGS",
        width: getColumnWidth("tags") || 160,
        cell: (client: Client) => (
          <div className="flex flex-wrap gap-1 max-w-full">
            {client.tags?.slice(0, 2).map((t, idx) => (
              <span
                key={(client.id || "c") + "-tag-" + (t || "empty") + "-" + idx}
                className="px-1.5 py-0.5 text-[10px] rounded bg-[#31719B]/10 text-[#31719B] font-medium truncate"
              >
                {t}
              </span>
            ))}
            {(client.tags?.length || 0) > 2 && (
              <span className="text-[10px] text-gray-400">
                +{(client.tags?.length || 0) - 2}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "status",
        header: "STATUS",
        width: getColumnWidth("status") || 110,
        cell: (client: Client) => {
          const isActive = client.active !== false;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleActive(client.id);
              }}
              className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer " + (
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              )}
            >
              <span className={"w-1.5 h-1.5 rounded-full " + (isActive ? "bg-emerald-500" : "bg-gray-400")} />
              {isActive ? "Active" : "Inactive"}
            </button>
          );
        },
      },
      {
        id: "users",
        header: "USERS",
        width: getColumnWidth("users") || 140,
        cell: (client: Client) => (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center">
              {client.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">Self</span>
          </div>
        ),
      },
    ];
  }, [columnWidths, dispatch, handleToggleActive]);

  const getClientActions = useCallback((client: Client): DropdownActionItem[] => {
    const isDeleted = Boolean((client as any).isDeleted);
    const actionsList: DropdownActionItem[] = [
      {
        label: "View Master",
        icon: Eye,
        onClick: () => {
          handleSelectClient(client, "Master");
        },
      },
    ];

    if (!isDeleted) {
      if (canAddEdit("clients")) {
        actionsList.push({
          label: "Edit",
          icon: Pencil,
          onClick: () => {
            setEditingClient(client);
            setViewMode("create");
          },
        });
      }
      if (canDelete("clients")) {
        actionsList.push({
          label: "Delete",
          icon: Trash2,
          variant: "danger",
          onClick: () => handleDeleteClient(client.id, client.name),
        });
      }
    } else {
      if (canDelete("clients") && handleRestoreClient) {
        actionsList.push({
          label: "Restore",
          icon: RotateCcw,
          onClick: () => handleRestoreClient(client.id, client.name),
        });
      }
    }

    return actionsList;
  }, [canAddEdit, canDelete, dispatch, handleDeleteClient, handleRestoreClient]);

  // Detail View Mode matching Screenshots 1-4
  if (viewMode === "detail" && viewingClient) {
    return (
      <ClientDetailView
        client={viewingClient}
        initialTab={activeDetailTab}
        onTabChange={handleTabChange}
        onClose={() => {
          setViewMode("list");
          setViewingClient(null);
          dispatch(setSelectedClient(null));
          setActiveDetailTab("Master");
          if (paramClientId || paramTab) {
            router.push("/client");
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
    <div className="w-full flex flex-col space-y-4">
      {/* Toast Feedback */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header Row */}
      <div className="flex flex-wrap justify-between gap-4 px-1 min-h-[48px]">
        <div className="flex  gap-3  min-h-[40px]">
          <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white">
            Clients ({pagination?.totalDocs ?? clients.length})
          </h1>
          {isFetching && (
            <span title="Syncing...">
              <Loader2 className="w-4 h-4 animate-spin text-[#31719B] [will-change:transform]" />
            </span>
          )}
        </div>

        <div className="flex  gap-3 ">
          {/* Toggle Trash / Active View */}
          {canDelete("clients") && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowDeleted((prev) => !prev);
                setPage(1);
              }}
              title="Toggle deleted records"
            >
              {showDeleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showDeleted ? "Trash View" : "Active Only"}</span>
            </Button>
          )}

          {/* New Client Button */}
          {canAddEdit("clients") && (
            <Button
              type="button"
              onClick={() => {
                setEditingClient(null);
                setViewMode("create");
              }}

            >
              <Plus className="w-4 h-4" />
              <span>Add Client</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white dark:bg-[#1e293b] space-y-3 rounded-md border border-[#dde2e8] dark:border-[#334155]">
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

      {/* Spreadsheet Table using reusable DataTable */}
      <div className="bg-white dark:bg-[#1e293b] shadow-card overflow-hidden flex flex-col  rounded-none">
        <DataTable<Client>
          columns={clientDataTableColumns}
          data={clients}
          selectable={true}
          selectedIds={Array.from(selectedIds)}
          onSelectionChange={(ids) => setSelectedIds(new Set(ids))}
          actions={getClientActions}
          actionsHeaderLabel="ACTIONS"
          sortKey={sortKey || undefined}
          sortDirection={sortDirection}
          onSort={(key) => toggleSort(key)}
          loading={isLoading && clients.length === 0}
          emptyMessage={
            showDeleted
              ? "Trash is empty."
              : "No clients found. Click '+ Add Client' to register a new client."
          }
          onRowClick={(client) => handleSelectClient(client, "Master")}
          pagination={{
            currentPage: page,
            totalItems: pagination?.totalDocs || clients.length,
            pageSize: pageSize,
            onPageChange: setPage,
            rowsPerPageOptions: [10, 20, 50, 100],
            onRowsPerPageChange: (newLimit) => {
              setPageSize(newLimit);
              setPage(1);
            },
          }}
        />
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
