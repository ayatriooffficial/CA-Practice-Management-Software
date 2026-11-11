"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { useSearchParams } from "next/navigation";
import { leadApi } from "@/services/leadApi";
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
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { DropdownActionItem } from "@/components/ui/TableActionDropdown";
import { getDirectFilePreviewUrl } from "@/utils/filePreview";
import { Phone, Pencil, Trash2, RotateCcw } from "lucide-react";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/components/team/usePermission";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateLeads } from "@/store/features/leads/leadSlice";
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

export interface LeadsInitialData {
  leads: Lead[];
  pagination?: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

interface LeadsModuleProps {
  initialData?: LeadsInitialData;
}

export const LeadsModule: React.FC<LeadsModuleProps> = ({ initialData }) => {
  const { canDelete, canAddEdit } = usePermission();
  const dispatch = useAppDispatch();
  const isLoaded = useAppSelector((state) => state.leads.isLoaded);

  // If server passed pre-rendered data and store is not populated yet, prime the store immediately
  useEffect(() => {
    if (initialData && !isLoaded && initialData.leads?.length > 0) {
      dispatch(
        hydrateLeads({
          leads: initialData.leads,
          pagination: initialData.pagination as any,
          params: { page: 1, limit: initialData.pagination?.limit || 10 },
        })
      );
    }
  }, [dispatch, initialData, isLoaded]);

  // Query parameters state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [sortKey, setSortKey] = useState<keyof Lead | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState<number>(initialData?.pagination?.limit || 10);
  const [page, setPage] = useState<number>(1);
  const [showDeleted, setShowDeleted] = useState(false);

  // UI state
  const [hiddenColumns] = useState<Set<string>>(DEFAULT_HIDDEN);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingLead, setEditingLead] = useState<Lead | null | undefined>(undefined);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    const qSearch = searchParams.get("search");
    const qLeadId = searchParams.get("leadId");
    if (qSearch) {
      setSearch(qSearch);
    }
    if (qLeadId) {
      leadApi
        .getLeadById(qLeadId)
        .then((res) => {
          if (res.data) {
            setSelectedLeadForDetails(res.data);
          }
        })
        .catch(() => { });
    }
  }, [searchParams]);
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

  // Query Hooks
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
          // For create, strip client-generated dummy ID so MongoDB generates ObjectId
          const { id, ...createData } = lead as any;
          await createMutation.mutateAsync(createData);
          showToast(`Lead "${lead.fullName}" created.`);
        }
        setEditingLead(undefined);
      } catch (err: any) {
        if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
          const detailMsg = err.errors.map((e: any) => `${e.field ? `${e.field}: ` : ''}${e.message}`).join(', ');
          showToast(`Validation error: ${detailMsg}`);
        } else {
          showToast(err.message || "Failed to save lead.");
        }
        throw err;
      }
    },
    [leads, updateMutation, createMutation, showToast]
  );

  // In-App Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    isSoleDirector?: boolean;
    affectedClients?: Array<{ id: string; name: string; fileNo?: string }>;
  }>({
    isOpen: false,
    id: "",
    name: "",
    isSoleDirector: false,
    affectedClients: [],
  });

  const handleDeleteLead = useCallback(
    async (id: string, name: string) => {
      let isSole = false;
      let affected: Array<{ id: string; name: string; fileNo?: string }> = [];
      try {
        const impactRes = await leadApi.checkLeadDeletionImpact(id);
        if (impactRes.data) {
          isSole = impactRes.data.isSoleDirector;
          affected = impactRes.data.affectedClients || [];
        }
      } catch (err) {
        console.error("Failed to check lead deletion impact:", err);
      }

      setDeleteConfirm({
        isOpen: true,
        id,
        name,
        isSoleDirector: isSole,
        affectedClients: affected,
      });
    },
    []
  );

  const handleConfirmDelete = async () => {
    const { id, name } = deleteConfirm;
    setDeleteConfirm({
      isOpen: false,
      id: "",
      name: "",
      isSoleDirector: false,
      affectedClients: [],
    });
    if (!id) return;
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
      showToast(`${idsToDelete.length} ${idsToDelete.length === 1 ? "lead" : "leads"} moved to trash.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete selected leads.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

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
    async (config: { companyName: string; type: string; group: string; fileNo?: string; services?: string[] }) => {
      if (!convertingLead) return;
      try {
        await convertMutation.mutateAsync({
          id: convertingLead.id,
          payload: config,
        });
        showToast(`Company "${config.companyName}" successfully registered for promoter ${convertingLead.fullName}!`);
        setConvertingLead(null);
      } catch (err: any) {
        showToast(err.message || "Conversion failed.");
      }
    },
    [convertingLead, convertMutation, showToast]
  );


  // DataTable columns adapter
  const dataTableColumns = useMemo<DataTableColumn<Lead>[]>(() => {
    const cols: DataTableColumn<Lead>[] = [
      {
        id: "fullName",
        header: "Party Full Name",
        accessorKey: "fullName",
        sortable: true,
        width: getColumnWidth("fullName") || 220,
        cell: (lead: Lead) => (
          <div className="flex items-center gap-2.5 text-left truncate">
            <button
              type="button"
              onClick={() => setSelectedLeadForDetails(lead)}
              className="flex items-center gap-2.5 text-left cursor-pointer group/name hover:opacity-80 transition-opacity truncate max-w-full"
            >
              {lead.photo ? (
                <img
                  src={getDirectFilePreviewUrl(lead.photo)}
                  alt=""
                  width={28}
                  height={28}
                  loading="lazy"
                  decoding="async"
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#eef0f3] dark:bg-[#334155] flex items-center justify-center text-gray-400 shrink-0">
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
              <span className="font-semibold text-[#31719B] group-hover/name:underline truncate">
                {lead.fullName}
              </span>
            </button>
          </div>
        ),
      },
    ];

    dynamicColumns.forEach((col: LeadColumnDef) => {
      cols.push({
        id: col.key as string,
        header: col.label,
        accessorKey: col.key as keyof Lead,
        sortable: Boolean(col.sortable),
        width: getColumnWidth(col.key as string) || (INITIAL_LEAD_COLUMN_WIDTHS[col.key as string] || 140),
        cell: (lead: Lead) => {
          const val = (lead as any)[col.key];
          if (col.key === "status") {
            const isConverted =
              val === "converted" ||
              Boolean(lead.convertedToClientId) ||
              (Array.isArray(lead.associatedClientIds) && lead.associatedClientIds.length > 0);
            return isConverted ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Converted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Lead
              </span>
            );
          }
          if (col.kind === "timestamp" || col.kind === "date") {
            return <span>{formatDate(val)}</span>;
          }
          if (col.kind === "secret") {
            return <span className="font-mono text-gray-400">••••••••</span>;
          }
          if (col.kind === "phone" && val) {
            return (
              <a
                href={"tel:" + val}
                className="flex items-center gap-1 text-[#31719B] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{val}</span>
              </a>
            );
          }
          if (col.kind === "email" && val) {
            return (
              <a
                href={"mailto:" + val}
                className="flex items-center gap-1 text-[#31719B] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{val}</span>
              </a>
            );
          }
          if (col.kind === "file") {
            return val ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                Attached
              </span>
            ) : (
              <span className="text-gray-300">—</span>
            );
          }
          return <span className="truncate">{val || "—"}</span>;
        },
      });
    });

    return cols;
  }, [dynamicColumns, columnWidths, formatDate]);

  const getLeadActions = useCallback((lead: Lead): DropdownActionItem[] => {
    const isDeleted = Boolean((lead as any).isDeleted);
    const actionsList: DropdownActionItem[] = [];

    if (!isDeleted) {
      if (canAddEdit("leads")) {
        actionsList.push({
          label: "Edit",
          icon: Pencil,
          onClick: () => setEditingLead(lead),
        });
      }
      if (canDelete("leads")) {
        actionsList.push({
          label: "Delete",
          icon: Trash2,
          variant: "danger",
          onClick: () => handleDeleteLead(lead.id, lead.fullName),
        });
      }
    } else {
      if (canDelete("leads")) {
        actionsList.push({
          label: "Restore",
          icon: RotateCcw,
          onClick: () => handleRestoreLead(lead.id, lead.fullName),
        });
      }
    }

    return actionsList;
  }, [canAddEdit, canDelete, handleDeleteLead, handleRestoreLead]);

  if (selectedLeadForDetails) {
    return (
      <div className="w-full">
        <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

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
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Top Header Row */}
      <div className="flex flex-wrap justify-between gap-4 px-1">
        <div className="flex gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white ">
            Leads ({pagination?.totalDocs ?? leads.length})
          </h1>
          {isFetching && (
            <span title="Syncing...">
              <Loader2 className="w-4 h-4 animate-spin text-[#31719B]" />
            </span>
          )}
        </div>

        <div className="flex gap-3">
          {/* Toggle Soft-Deleted Records */}
          {canDelete("leads") && (
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
              className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-9 pr-8 text-xs md:text-sm text-[#000000] dark:text-white outline-none placeholder:text-gray-400 hover:border-gray-400 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
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
          {canAddEdit("leads") && (
            <Button
              type="button"
              onClick={() => setEditingLead(null)}
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar on Selection */}
      {selectedIds.size > 0 && canDelete("leads") && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onDelete={() => setBulkDeleteConfirm(true)}
          isDeleting={isBulkDeleting}
          itemLabel="leads"
          deleteLabel="Delete Selected"
        />
      )}

      {/* Spreadsheet Table using reusable DataTable */}
      <div className="bg-white dark:bg-[#1e293b] shadow-card overflow-hidden flex flex-col rounded-none">
        <DataTable<Lead>
          columns={dataTableColumns}
          data={leads}
          selectable={true}
          selectedIds={Array.from(selectedIds)}
          onSelectionChange={(ids) => setSelectedIds(new Set(ids))}
          actions={getLeadActions}
          actionsHeaderLabel="Actions"
          sortKey={sortKey || undefined}
          sortDirection={sortDirection}
          onSort={(key) => toggleSort(key as keyof Lead)}
          loading={isLoading && leads.length === 0}
          emptyMessage={
            showDeleted
              ? "Trash is empty."
              : "No leads match this search. Click '+ Add' to create a lead."
          }
          onRowClick={(lead) => setSelectedLeadForDetails(lead)}
          pagination={{
            currentPage: page,
            totalItems: pagination?.totalDocs || leads.length,
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

      {/* In-App Delete Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title={
          deleteConfirm.isSoleDirector
            ? "⚠️ Warning: Sole Director for Company"
            : "Move Lead to Trash?"
        }
        message={
          deleteConfirm.isSoleDirector
            ? `Warning: "${deleteConfirm.name}" is the LAST remaining director for: ${deleteConfirm.affectedClients?.map((c) => c.name).join(", ")}.\n\nIf this lead is deleted, those clients will have no director, and associated director details will also be removed.\n\nAre you sure you want to proceed? (This lead will be moved to trash via soft-delete)`
            : `Are you sure you want to move lead "${deleteConfirm.name}" to trash?`
        }
        confirmText={deleteConfirm.isSoleDirector ? "Yes, Delete Lead" : "Move to Trash"}
        cancelText="Cancel"
        confirmVariant="danger"
        onKeepEditing={() =>
          setDeleteConfirm({
            isOpen: false,
            id: "",
            name: "",
            isSoleDirector: false,
            affectedClients: [],
          })
        }
        onDiscard={handleConfirmDelete}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={bulkDeleteConfirm}
        title={`Delete ${selectedIds.size} Selected Leads?`}
        message={`Are you sure you want to delete ${selectedIds.size} selected ${selectedIds.size === 1 ? "lead" : "leads"}? They will be moved to trash and can be restored if needed.`}
        confirmText="Delete Selected"
        cancelText="Cancel"
        confirmVariant="danger"
        onKeepEditing={() => setBulkDeleteConfirm(false)}
        onDiscard={handleBulkDelete}
      />
    </div>
  );
};
