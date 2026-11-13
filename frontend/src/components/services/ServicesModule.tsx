"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Briefcase,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Service,
  SERVICE_CATEGORIES,
  SERVICE_FREQUENCIES,
  SERVICE_DIFFICULTIES,
} from "@/data/serviceData";
import {
  ServiceTableRow,
  ALL_SERVICE_COLUMNS,
  INITIAL_SERVICE_COLUMN_WIDTHS,
} from "./ServiceTableRow";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { ColumnResizer } from "@/components/ui/ColumnResizer";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { DropdownActionItem } from "@/components/ui/TableActionDropdown";
import { Clock, BookOpen, Layers, Pencil, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/components/team/usePermission";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateServices } from "@/store/features/services/serviceSlice";
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useRestoreService,
} from "@/hooks/useServicesQuery";

// Dynamic import of full-page second screen form matching ClientForm
const ServiceForm = dynamic(
  () => import("./ServiceForm").then((mod) => mod.ServiceForm),
  { ssr: false }
);

const ServiceDetailView = dynamic(
  () => import("./ServiceDetailView").then((mod) => mod.ServiceDetailView),
  { ssr: false }
);

export interface ServicesInitialData {
  services: Service[];
  pagination?: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

interface ServicesModuleProps {
  initialMode?: "list" | "create";
  initialData?: ServicesInitialData;
}

export const ServicesModule: React.FC<ServicesModuleProps> = ({
  initialMode = "list",
  initialData,
}) => {
  const { canDelete, canAddEdit } = usePermission();
  const dispatch = useAppDispatch();
  const isLoaded = useAppSelector((state) => state.services.isLoaded);

  // If server passed pre-rendered data and store is not populated yet, prime the store immediately
  useEffect(() => {
    if (initialData && !isLoaded && initialData.services?.length > 0) {
      dispatch(
        hydrateServices({
          services: initialData.services,
          pagination: initialData.pagination as any,
          params: { page: 1, limit: initialData.pagination?.limit || 10 },
        })
      );
    }
  }, [dispatch, initialData, isLoaded]);
  // Page View Mode ("list", "detail", or full second page "create")
  const [viewMode, setViewMode] = useState<"list" | "create" | "detail">(initialMode);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Query & Filter State
  const [draftSearch, setDraftSearch] = useState("");
  const debouncedSearch = useDebounce(draftSearch, 300);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [recurringFilter, setRecurringFilter] = useState<string>("");
  const [showDeleted, setShowDeleted] = useState(false);

  // Table State
  const [sortKey, setSortKey] = useState<keyof Service | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Editing State
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Column resizing state with persistent storage
  const {
    columnWidths,
    getColumnWidth,
    handleResizeStart,
    resizingKey,
    resetColumnWidth,
  } = useResizableColumns({
    storageKey: "ayatrio-services-col-widths",
    initialWidths: INITIAL_SERVICE_COLUMN_WIDTHS,
    minWidth: 70,
  });

  // TanStack Query Hooks
  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch,
      sortBy: sortKey || undefined,
      sortOrder: sortDirection,
      category: categoryFilter || undefined,
      frequency: frequencyFilter || undefined,
      difficulty: difficultyFilter || undefined,
      isRecurring:
        recurringFilter === "recurring"
          ? true
          : recurringFilter === "one-time"
            ? false
            : undefined,
      includeDeleted: showDeleted,
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      sortKey,
      sortDirection,
      categoryFilter,
      frequencyFilter,
      difficultyFilter,
      recurringFilter,
      showDeleted,
    ]
  );

  const { data, isLoading, isFetching } = useServices(queryParams);

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();
  const restoreMutation = useRestoreService();

  const services = useMemo(() => data?.services || [], [data?.services]);
  const pagination = data?.pagination;

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleOpenDetail = useCallback((srv: Service) => {
    setSelectedService(srv);
    setViewMode("detail");
    const id = srv.id || (srv as any)._id || (srv as any).serviceId;
    if (id) {
      router.push(`/services?serviceId=${id}`);
    }
  }, [router]);

  useEffect(() => {
    if (!searchParams) return;
    const sId = searchParams.get("serviceId");
    if (sId) {
      const currentId = selectedService?.id || (selectedService as any)?._id || (selectedService as any)?.serviceId;
      if (!selectedService || currentId !== sId) {
        const found = services.find((s) => (s.id || (s as any)._id || (s as any).serviceId) === sId);
        if (found) {
          setSelectedService(found);
          setViewMode("detail");
        } else {
          import("@/services/serviceApi").then(({ serviceApi }) => {
            serviceApi.getServiceById(sId).then((res) => {
              if (res && res.data) {
                setSelectedService(res.data);
                setViewMode("detail");
              }
            }).catch(() => {});
          });
        }
      }
    } else {
      if (viewMode === "detail") {
        setSelectedService(null);
        setViewMode("list");
      }
    }
  }, [searchParams, services, selectedService, viewMode]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const toggleSort = useCallback((key: keyof Service) => {
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
    () => services.length > 0 && services.every((row) => selectedIds.has(row.id)),
    [services, selectedIds]
  );

  const toggleSelectAllPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (services.every((r) => next.has(r.id))) {
        services.forEach((r) => next.delete(r.id));
      } else {
        services.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [services]);

  // Save from ServiceForm second page view
  const handleSaveServiceForm = useCallback(
    async (serviceData: Partial<Service>) => {
      try {
        if (serviceData.id && services.some((s) => s.id === serviceData.id)) {
          await updateMutation.mutateAsync({ id: serviceData.id, data: serviceData });
          showToast(`Service "${serviceData.name}" updated successfully.`);
        } else {
          await createMutation.mutateAsync(serviceData);
          showToast(`Service "${serviceData.name}" added to catalog.`);
        }
        setViewMode("list");
        setEditingService(null);
      } catch (err: any) {
        showToast(err.message || "Failed to save service.");
        throw err;
      }
    },
    [services, updateMutation, createMutation, showToast]
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

  const handleDeleteService = useCallback(
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
      showToast(`Service "${name}" moved to trash.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete service.");
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
      showToast(`${idsToDelete.length} ${idsToDelete.length === 1 ? "service" : "services"} moved to trash.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete selected services.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleRestoreService = useCallback(
    async (id: string, name: string) => {
      try {
        await restoreMutation.mutateAsync(id);
        showToast(`Service "${name}" restored.`);
      } catch (err: any) {
        showToast(err.message || "Failed to restore service.");
      }
    },
    [restoreMutation, showToast]
  );

  const handleResetFilters = useCallback(() => {
    setDraftSearch("");
    setCategoryFilter("");
    setFrequencyFilter("");
    setDifficultyFilter("");
    setRecurringFilter("");
    setPage(1);
  }, []);

  const DATE_FORMATTER = useMemo(() => new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }), []);

  const CURRENCY_FORMATTER = useMemo(() => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }), []);

  const formatServiceDate = useCallback((iso?: string): string => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? iso : DATE_FORMATTER.format(d);
    } catch {
      return iso;
    }
  }, [DATE_FORMATTER]);

  // DataTable columns adapter for Services
  const serviceDataTableColumns = useMemo<DataTableColumn<Service>[]>(() => {
    return [
      {
        id: "name",
        header: "Service Name",
        accessorKey: "name",
        sortable: true,
        width: getColumnWidth("name") || 220,
        cell: (service: Service) => {
          const isDeleted = Boolean(service.isDeleted);
          return (
            <div className="flex items-center gap-2 truncate">
              <button
                type="button"
                onClick={() => handleOpenDetail(service)}
                className="text-left font-semibold text-[#000000] dark:text-white hover:text-[#31719B] hover:underline cursor-pointer transition-colors truncate max-w-full"
              >
                {service.name}
              </button>
              {isDeleted && (
                <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                  Deleted
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Category",
        accessorKey: "category",
        sortable: true,
        width: getColumnWidth("category") || 120,
        cell: (service: Service) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 truncate max-w-full">
            {service.category}
          </span>
        ),
      },
      {
        id: "isRecurring",
        header: "Recurring",
        accessorKey: "isRecurring",
        sortable: true,
        width: getColumnWidth("isRecurring") || 110,
        cell: (service: Service) => (
          <span
            className={"inline-flex items-center px-2 py-0.5 rounded text-xs " + (
              service.isRecurring
                ? "font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                : "font-normal text-gray-500 dark:text-gray-400"
            )}
          >
            {service.isRecurring ? "Recurring" : "One-Time"}
          </span>
        ),
      },
      {
        id: "frequency",
        header: "Frequency",
        accessorKey: "frequency",
        sortable: true,
        width: getColumnWidth("frequency") || 110,
        cell: (service: Service) => (
          <div className="flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{service.frequency}</span>
          </div>
        ),
      },
      {
        id: "professionalFee",
        header: "Professional Fee",
        accessorKey: "professionalFee",
        sortable: true,
        width: getColumnWidth("professionalFee") || 130,
        cell: (service: Service) => (
          <span className="font-semibold text-gray-900 dark:text-white font-mono text-xs">
            {CURRENCY_FORMATTER.format(service.professionalFee)}
          </span>
        ),
      },
      {
        id: "sop",
        header: "SOP",
        width: getColumnWidth("sop") || 140,
        cell: (service: Service) => (
          <div className="flex items-center gap-1.5 truncate">
            <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{service.sop || "Standard SOP v1.0"}</span>
          </div>
        ),
      },
      {
        id: "subTasks",
        header: "Sub Tasks",
        width: getColumnWidth("subTasks") || 110,
        cell: (service: Service) => (
          <div className="flex items-center gap-1.5 truncate">
            <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">
              {service.subTasks && service.subTasks.length > 0
                ? String(service.subTasks.length) + " Tasks"
                : "—"}
            </span>
          </div>
        ),
      },
      {
        id: "difficulty",
        header: "Difficulty",
        accessorKey: "difficulty",
        sortable: true,
        width: getColumnWidth("difficulty") || 110,
        cell: (service: Service) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 truncate max-w-full">
            {service.difficulty}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        sortable: true,
        width: getColumnWidth("status") || 100,
        align: "center",
        cell: (service: Service) => (
          <span
            className={"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " + (
              service.status === "Active"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            {service.status}
          </span>
        ),
      },
      {
        id: "createdAt",
        header: "Created On",
        sortable: true,
        width: getColumnWidth("createdAt") || 120,
        cell: (service: Service) => (
          <span className="text-gray-600 dark:text-gray-400">{formatServiceDate(service.createdAt)}</span>
        ),
      },
      {
        id: "updatedAt",
        header: "Updated On",
        sortable: true,
        width: getColumnWidth("updatedAt") || 120,
        cell: (service: Service) => (
          <span className="text-gray-600 dark:text-gray-400">{formatServiceDate(service.updatedAt)}</span>
        ),
      },
    ];
  }, [columnWidths, CURRENCY_FORMATTER, formatServiceDate]);

  const getServiceActions = useCallback((service: Service): DropdownActionItem[] => {
    const isDeleted = Boolean(service.isDeleted);
    const actionsList: DropdownActionItem[] = [
      {
        label: "View Details",
        icon: Eye,
        onClick: () => handleOpenDetail(service),
      },
    ];

    if (!isDeleted) {
      if (canAddEdit("services")) {
        actionsList.push({
          label: "Edit Service",
          icon: Pencil,
          onClick: () => handleOpenDetail(service),
        });
      }
      if (canDelete("services")) {
        actionsList.push({
          label: "Delete",
          icon: Trash2,
          variant: "danger",
          onClick: () => handleDeleteService(service.id, service.name),
        });
      }
    } else {
      if (canDelete("services")) {
        actionsList.push({
          label: "Restore",
          icon: RotateCcw,
          onClick: () => handleRestoreService(service.id, service.name),
        });
      }
    }

    return actionsList;
  }, [canAddEdit, canDelete, handleDeleteService, handleRestoreService]);

  const handleCloseDetail = useCallback(() => {
    setViewMode("list");
    setSelectedService(null);
    router.push('/services');
  }, [router]);

  const handleEditFromDetail = useCallback((srv: Service) => {
    setEditingService(srv);
    setViewMode("create");
  }, []);

  const handleServiceUpdated = useCallback((updated: Service) => {
    setSelectedService(updated);
  }, []);

  // Dedicated detail view matching Screenshot 1-5
  if (viewMode === "detail" && selectedService) {
    return (
      <ServiceDetailView
        service={selectedService}
        onClose={handleCloseDetail}
        onEdit={handleEditFromDetail}
        onServiceUpdated={handleServiceUpdated}
      />
    );
  }

  // Dedicated second page view for Add / Edit Service (Identical to ClientForm pattern)
  if (viewMode === "create") {
    return (
      <ServiceForm
        initialService={editingService}
        onSave={handleSaveServiceForm}
        onCancel={() => {
          setViewMode("list");
          setEditingService(null);
        }}
      />
    );
  }




  return (
    <div className="w-full flex flex-col gap-y-4 animate-in fade-in duration-150">
      {/* Toast Notification */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white py-2">
            Services ({pagination?.totalDocs ?? services.length})
          </h1>
          {isFetching && (
            <span title="Syncing...">
              <Loader2 className="w-4 h-4 animate-spin text-[#31719B]" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 py-2">
          {/* Toggle Deleted */}
          {/* Toggle Soft-Deleted Records */}
          {canDelete("services") && (
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
              <span>Trash ({showDeleted ? "Active" : "Hidden"})</span>
            </button>
          )}

          {/* Add New Service Button */}
          {canAddEdit("services") && (
            <Button
              type="button"
              onClick={() => {
                setEditingService(null);
                setViewMode("create");
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters Bar (Clean, no unnecessary border) */}
      <div className="px-4 bg-white dark:bg-[#1e293b] gap-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              aria-label="Search services"
              value={draftSearch}
              onChange={(e) => {
                setDraftSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search services, SAC..."
              className="h-10 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-9 pr-3 text-xs text-gray-900 dark:text-white outline-none hover:border-gray-400 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
            />
          </div>

          {/* Category Filter */}
          <Select
            aria-label="Filter by service category"
            value={categoryFilter}
            onChange={(val) => {
              setCategoryFilter(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Categories" },
              ...SERVICE_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
            placeholder="All Categories"
            searchable={true}
          />

          {/* Frequency Filter */}
          <Select
            aria-label="Filter by frequency"
            value={frequencyFilter}
            onChange={(val) => {
              setFrequencyFilter(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Frequencies" },
              ...SERVICE_FREQUENCIES.map((f) => ({ value: f, label: f })),
            ]}
            placeholder="All Frequencies"
          />

          {/* Recurring Filter */}
          <Select
            aria-label="Filter by recurring type"
            value={recurringFilter}
            onChange={(val) => {
              setRecurringFilter(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Types" },
              { value: "recurring", label: "Recurring Only" },
              { value: "one-time", label: "One-Time Only" },
            ]}
            placeholder="All Types"
          />

          {/* Difficulty Filter */}
          <Select
            aria-label="Filter by difficulty"
            value={difficultyFilter}
            onChange={(val) => {
              setDifficultyFilter(val);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Difficulties" },
              ...SERVICE_DIFFICULTIES.map((d) => ({ value: d, label: d })),
            ]}
            placeholder="All Difficulties"
          />

          {/* Reset Filters */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 h-10 w-full px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar on Selection */}
      {selectedIds.size > 0 && canDelete("services") && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onDelete={() => setBulkDeleteConfirm(true)}
          isDeleting={isBulkDeleting}
          itemLabel="services"
          deleteLabel="Delete Selected"
        />
      )}

      {/* Spreadsheet Table using reusable DataTable */}
      <div className="bg-white dark:bg-[#1e293b] shadow-card overflow-hidden flex flex-col border border-[#dde2e8] dark:border-[#334155] rounded-none">
        <DataTable<Service>
          columns={serviceDataTableColumns}
          data={services}
          selectable={true}
          selectedIds={Array.from(selectedIds)}
          onSelectionChange={(ids) => setSelectedIds(new Set(ids))}
          actions={getServiceActions}
          actionsHeaderLabel="ACTIONS"
          sortKey={sortKey || undefined}
          sortDirection={sortDirection}
          onSort={(key) => toggleSort(key as keyof Service)}
          loading={isLoading && services.length === 0}
          emptyMessage={
            showDeleted
              ? "Trash is empty."
              : "No services found matching your filters."
          }
          onRowClick={(service) => handleOpenDetail(service)}
          pagination={{
            currentPage: page,
            totalItems: pagination?.totalDocs || services.length,
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
        title="Move Service to Trash?"
        message={`Are you sure you want to move service "${deleteConfirm.name}" to trash?`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        confirmVariant="danger"
        onKeepEditing={() => setDeleteConfirm({ isOpen: false, id: "", name: "" })}
        onDiscard={handleConfirmDelete}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={bulkDeleteConfirm}
        title={`Delete ${selectedIds.size} Selected Services?`}
        message={`Are you sure you want to delete ${selectedIds.size} selected ${selectedIds.size === 1 ? "service" : "services"}? They will be moved to trash and can be restored if needed.`}
        confirmText="Delete Selected"
        cancelText="Cancel"
        confirmVariant="danger"
        onKeepEditing={() => setBulkDeleteConfirm(false)}
        onDiscard={handleBulkDelete}
      />
    </div>
  );
};
