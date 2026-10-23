"use client";

import React, { useState, useMemo, useCallback } from "react";
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
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/components/team/usePermission";
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

interface ServicesModuleProps {
  initialMode?: "list" | "create";
}

export const ServicesModule: React.FC<ServicesModuleProps> = ({
  initialMode = "list",
}) => {
  const { canDelete, canAddEdit } = usePermission();
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

  const handleDeleteService = useCallback(
    async (id: string, name: string) => {
      if (window.confirm(`Are you sure you want to soft delete "${name}"?`)) {
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
      }
    },
    [deleteMutation, showToast]
  );

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

  // Dedicated detail view matching Screenshot 1-5
  if (viewMode === "detail" && selectedService) {
    return (
      <ServiceDetailView
        service={selectedService}
        onClose={() => {
          setViewMode("list");
          setSelectedService(null);
        }}
        onEdit={(srv) => {
          setEditingService(srv);
          setViewMode("create");
        }}
        onServiceUpdated={(updated) => {
          setSelectedService(updated);
        }}
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
      {toastMessage && (
        <div className="fixed top-20 right-6 z-60 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border border-[#31719B]/30 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white animate-in slide-in-from-top-2 duration-200">
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
      <div className="flex flex-wrap items-center justify-between px-1">
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
            <button
              type="button"
              onClick={() => {
                setEditingService(null);
                setViewMode("create");
              }}
              className="flex items-center gap-1.5 h-10 px-4 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar (Clean, no unnecessary border) */}
      <div className="p-4 bg-white dark:bg-[#1e293b] gap-y-3">
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

      {/* Spreadsheet / Table (Clean shadow-card, no unnecessary outer border) */}
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
                {/* Frozen Checkbox (Sticky Left: 0px) */}
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-12 min-w-[48px] max-w-[48px] px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  <input
                    id="services-select-all"
                    name="selectAllServices"
                    aria-label="Select all services on this page"
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                  />
                </th>

                {/* All Service Columns in Clean 1:1 Flow (Service Name, Category, Recurring, ...) */}
                {ALL_SERVICE_COLUMNS.map((col) => {
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
                          onClick={() => toggleSort(col.key as keyof Service)}
                          className="flex items-center gap-1.5 hover:text-[#31719B] transition-colors cursor-pointer select-none"
                        >
                          <span>{col.label}</span>
                          {sortKey === col.key && (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#31719B]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#31719B]" />
                            )
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

                {/* Actions Header (Sticky Right: 0px) */}
                <th
                  scope="col"
                  className="sticky right-0 z-30 w-24 min-w-[96px] max-w-[96px] px-3 py-3 font-semibold text-center border-l border-b border-[#dde2e8] dark:border-[#334155] text-[#000000] dark:text-white"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={ALL_SERVICE_COLUMNS.length + 2} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-7 h-7 animate-spin text-[#31719B]" />
                      <span className="text-sm font-medium text-gray-500">
                        Loading service catalog...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={ALL_SERVICE_COLUMNS.length + 2} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Briefcase className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        No Services Found
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No services match your filters. Try clearing filters or create a new service.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingService(null);
                          setViewMode("create");
                        }}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-md text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                        style={{ backgroundColor: "var(--premium-blue-dark)" }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Service</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                services.map((service, index) => (
                  <ServiceTableRow
                    key={service.id || (service as any)._id || `srv-${index}`}
                    service={service}
                    isSelected={selectedIds.has(service.id)}
                    columnWidths={columnWidths}
                    onToggleSelect={toggleSelectRow}
                    onEdit={(s) => {
                      setSelectedService(s);
                      setViewMode("detail");
                    }}
                    onDelete={handleDeleteService}
                    onRestore={handleRestoreService}
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
            totalItems={pagination?.totalDocs || services.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            showPageSize={true}
          />
        </div>
      </div>
    </div>
  );
};
