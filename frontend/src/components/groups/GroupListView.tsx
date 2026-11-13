"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  Eye,
  Download,
  Check,
  Columns,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchGroupsRequest,
  createGroupRequest,
  updateGroupRequest,
  deleteGroupRequest,
  setGroupFilters,
} from "@/store/features/groups/groupSlice";
import {
  selectGroupsList,
  selectGroupPagination,
  selectGroupFilters,
  selectGroupLoading,
  selectGroupSubmitting,
} from "@/store/features/groups/groupSelectors";
import { GroupRecord, GroupEntity } from "@/services/groupApi";
import { AddEditGroupModal } from "./AddEditGroupModal";
import { navigateWithTransition } from "@/hooks/useSectionNavigation";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { usePermission } from "@/components/team/usePermission";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { TableActionDropdown } from "@/components/ui/TableActionDropdown";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { pageStateCache } from "@/services/pageStateCache";

const getInitials = (name?: string) => {
  if (!name) return "GP";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const GroupListView: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { canAddEdit, canDelete } = usePermission();

  const groups = useAppSelector(selectGroupsList);
  const pagination = useAppSelector(selectGroupPagination);
  const filters = useAppSelector(selectGroupFilters);
  const isLoading = useAppSelector(selectGroupLoading);
  const isSubmitting = useAppSelector(selectGroupSubmitting);

  useEffect(() => {
    pageStateCache.markLoaded('/groups');
  }, []);

  // Search input state
  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Expand rows state: set of expanded group IDs
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // Checkbox selection state
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  // Columns visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    groupId: true,
    entities: true,
    poc: true,
    contact: true,
    openTasks: true,
    readyToBill: true,
    invoices: true,
    proformas: true,
    outstanding: true,
  });
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupRecord | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<GroupRecord | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Fetch groups on mount & on filter change
  useEffect(() => {
    dispatch(fetchGroupsRequest());
  }, [dispatch]);

  // Handle Search submit / debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        dispatch(setGroupFilters({ search: searchInput, page: 1 }));
        dispatch(fetchGroupsRequest({ force: true, params: { search: searchInput, page: 1 } }));
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, dispatch]);

  // Toggle single row expansion
  const toggleRowExpansion = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Expand All toggle
  const isAllExpanded = useMemo(() => {
    if (groups.length === 0) return false;
    return groups.every((g) => expandedGroupIds.has(g.id));
  }, [groups, expandedGroupIds]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedGroupIds(new Set());
    } else {
      setExpandedGroupIds(new Set(groups.map((g) => g.id)));
    }
  };

  // Select all checkbox
  const isAllSelected = useMemo(() => {
    if (groups.length === 0) return false;
    return groups.every((g) => selectedGroupIds.has(g.id));
  }, [groups, selectedGroupIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(groups.map((g) => g.id)));
    }
  };

  const toggleSelectRow = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Pagination change
  const handlePageChange = (newPage: number) => {
    dispatch(setGroupFilters({ page: newPage }));
    dispatch(fetchGroupsRequest({ force: true, params: { page: newPage } }));
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setGroupFilters({ limit: newLimit, page: 1 }));
    dispatch(fetchGroupsRequest({ force: true, params: { limit: newLimit, page: 1 } }));
  };

  // Create / Edit save handler
  const handleSaveGroup = async (data: any) => {
    if (editingGroup?.id) {
      dispatch(
        updateGroupRequest({
          id: editingGroup.id,
          data,
          onSuccess: () => {
            dispatch(fetchGroupsRequest({ force: true }));
          },
        })
      );
    } else {
      dispatch(
        createGroupRequest({
          data,
          onSuccess: () => {
            dispatch(fetchGroupsRequest({ force: true }));
          },
        })
      );
    }
  };

  // Delete confirm handler
  const handleConfirmDelete = () => {
    if (!groupToDelete) return;
    dispatch(
      deleteGroupRequest({
        id: groupToDelete.id,
        onSuccess: () => {
          dispatch(fetchGroupsRequest({ force: true }));
        },
      })
    );
    setGroupToDelete(null);
  };

  // Bulk Delete confirm handler
  const handleConfirmBulkDelete = () => {
    selectedGroupIds.forEach((id) => {
      dispatch(deleteGroupRequest({ id }));
    });
    setSelectedGroupIds(new Set());
    setIsBulkDeleteConfirmOpen(false);
    setTimeout(() => {
      dispatch(fetchGroupsRequest({ force: true }));
    }, 400);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (groups.length === 0) return;
    const headers = [
      "Group Name",
      "Group ID",
      "Entities Count",
      "Point of Contact",
      "Contact Info",
      "Open Tasks",
      "Tasks Ready to Bill",
      "Invoices",
      "Proformas",
      "Invoice Outstanding",
    ];

    const rows = groups.map((g) => [
      `"${g.name.replace(/"/g, '""')}"`,
      `"${g.groupId || ""}"`,
      g.stats?.entitiesCount || 0,
      `"${(g.stats?.pocName || "No POC set").replace(/"/g, '""')}"`,
      `"${(g.stats?.pocMobile || "-").replace(/"/g, '""')}"`,
      g.stats?.openTasksCount || 0,
      g.stats?.readyToBillCount || 0,
      g.stats?.invoicesCount || 0,
      g.stats?.proformasCount || 0,
      (g.stats?.outstandingAmount || 0).toFixed(2),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `groups_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col gap-3 min-h-[calc(100vh-var(--header-height))] bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] p-2.5 sm:p-4">

      {/* Bulk Action Bar when items selected */}
      {selectedGroupIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedGroupIds.size}
          onClearSelection={() => setSelectedGroupIds(new Set())}
          onDelete={() => setIsBulkDeleteConfirmOpen(true)}
          itemLabel="groups"
          deleteLabel="Delete Selected"
        />
      )}

      {/* Toolbar (Image 1 Right-aligned items) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {pagination.totalDocs} {pagination.totalDocs === 1 ? "Group" : "Groups"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 justify-end">
          {/* Search Box */}
          <div className="min-w-[220px] sm:min-w-[280px]">
            <Input
              inputSize="sm"
              placeholder="Search group, entity, POC…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onClear={() => setSearchInput("")}
              leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
            />
          </div>

          {/* Expand All Toggle */}
          <Button
            type="button"
            variant={isAllExpanded ? "outline" : "secondary"}
            size="sm"
            onClick={toggleExpandAll}
            icon={
              <ChevronRight
                size={13}
                className={`transition-transform duration-150 ${isAllExpanded ? "rotate-90" : ""}`}
              />
            }
          >
            {isAllExpanded ? "Collapse all" : "Expand all"}
          </Button>

          {/* Columns Selector */}
          <div className="relative">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsColumnPickerOpen((prev) => !prev)}
              icon={<Columns size={13} className="text-gray-500" />}
            >
              Columns
            </Button>

            {isColumnPickerOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-lg shadow-xl p-2 z-30 space-y-1">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 block px-2 py-0.5">
                  Toggle Columns
                </span>
                {Object.keys(visibleColumns).map((colKey) => (
                  <label
                    key={colKey}
                    className="flex items-center gap-2 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[colKey]}
                      onChange={(e) =>
                        setVisibleColumns((prev) => ({ ...prev, [colKey]: e.target.checked }))
                      }
                      className="rounded text-[#31719B] focus:ring-0"
                    />
                    <span className="capitalize">{colKey.replace(/([A-Z])/g, " $1")}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* + Add Primary Button */}
          {canAddEdit("clients") && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {
                setEditingGroup(null);
                setIsAddEditModalOpen(true);
              }}
            >
              Add
            </Button>
          )}

          {/* Export Button */}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleExportCSV}
            title="Export to CSV"
            icon={<Download size={14} />}
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="w-full bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-none overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-slate-800/60 border-b border-[#dde2e8] dark:border-[#334155] text-gray-500 dark:text-gray-400 font-semibold select-none">
              <th className="py-2.5 px-3 w-8">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded text-[#31719B] focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-3 min-w-[200px]">Group</th>
              {visibleColumns.groupId && <th className="py-2.5 px-3 min-w-[80px]">Group ID</th>}
              {visibleColumns.entities && <th className="py-2.5 px-3 min-w-[100px]">Entities</th>}
              {visibleColumns.poc && <th className="py-2.5 px-3 min-w-[130px]">Point of Contact</th>}
              {visibleColumns.contact && <th className="py-2.5 px-3 min-w-[120px]">Contact</th>}
              {visibleColumns.openTasks && <th className="py-2.5 px-3 text-center min-w-[85px]">Open Tasks</th>}
              {visibleColumns.readyToBill && <th className="py-2.5 px-3 text-center min-w-[110px]">Tasks (Ready to Bill)</th>}
              {visibleColumns.invoices && <th className="py-2.5 px-3 text-center min-w-[75px]">Invoices</th>}
              {visibleColumns.proformas && <th className="py-2.5 px-3 text-center min-w-[80px]">Proformas</th>}
              {visibleColumns.outstanding && <th className="py-2.5 px-3 text-right min-w-[130px]">Invoice Outstanding (₹)</th>}
              <th className="py-2.5 px-3 text-center w-16">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#31719B]" />
                  <span>Loading groups...</span>
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300">No Groups Found</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Create a group to organize related clients and businesses under one umbrella.
                  </p>
                </td>
              </tr>
            ) : (
              groups.map((grp) => {
                const isExpanded = expandedGroupIds.has(grp.id);
                const isSelected = selectedGroupIds.has(grp.id);

                return (
                  <React.Fragment key={grp.id}>
                    {/* Primary Group Row */}
                    <tr
                      className={`transition-colors hover:bg-gray-50/60 dark:hover:bg-slate-800/40 ${
                        isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(grp.id)}
                          className="rounded text-[#31719B] focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Expand Arrow + Avatar + Group Name */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleRowExpansion(grp.id)}
                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse" : "Expand"}
                          >
                            <ChevronRight
                              size={14}
                              className={`transition-transform duration-150 ${
                                isExpanded ? "rotate-90 text-[#31719B]" : ""
                              }`}
                            />
                          </button>

                          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {getInitials(grp.name)}
                          </div>

                          <Link
                            href={`/groups/${grp.id}`}
                            className="font-semibold text-[#31719B] hover:underline truncate max-w-[180px] sm:max-w-[240px]"
                            title={grp.name}
                          >
                            {grp.name}
                          </Link>
                        </div>
                      </td>

                      {/* Group ID */}
                      {visibleColumns.groupId && (
                        <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400">
                          {grp.groupId || "-"}
                        </td>
                      )}

                      {/* Entities Badge */}
                      {visibleColumns.entities && (
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {grp.stats?.entitiesCount || 0}{" "}
                            {grp.stats?.entitiesCount === 1 ? "Entity" : "Entities"}
                          </span>
                        </td>
                      )}

                      {/* Point of Contact Badge */}
                      {visibleColumns.poc && (
                        <td className="py-2.5 px-3">
                          {grp.stats?.pocName && grp.stats.pocName !== "No POC set" ? (
                            <span className="font-medium text-gray-800 dark:text-slate-200 truncate block max-w-[130px]">
                              {grp.stats.pocName}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              No POC set
                            </span>
                          )}
                        </td>
                      )}

                      {/* Contact Info */}
                      {visibleColumns.contact && (
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                          {grp.stats?.pocMobile && grp.stats.pocMobile !== "-"
                            ? grp.stats.pocMobile
                            : grp.stats?.pocEmail && grp.stats.pocEmail !== "-"
                            ? grp.stats.pocEmail
                            : "-"}
                        </td>
                      )}

                      {/* Open Tasks */}
                      {visibleColumns.openTasks && (
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800 dark:text-slate-200">
                          {grp.stats?.openTasksCount || 0}
                        </td>
                      )}

                      {/* Tasks (Ready to Bill) */}
                      {visibleColumns.readyToBill && (
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800 dark:text-slate-200">
                          {grp.stats?.readyToBillCount || 0}
                        </td>
                      )}

                      {/* Invoices */}
                      {visibleColumns.invoices && (
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800 dark:text-slate-200">
                          {grp.stats?.invoicesCount || 0}
                        </td>
                      )}

                      {/* Proformas */}
                      {visibleColumns.proformas && (
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800 dark:text-slate-200">
                          {grp.stats?.proformasCount || 0}
                        </td>
                      )}

                      {/* Invoice Outstanding */}
                      {visibleColumns.outstanding && (
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-white">
                          ₹{(grp.stats?.outstandingAmount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      )}

                      {/* Actions Menu */}
                      <td className="py-2.5 px-3 text-center">
                        <TableActionDropdown
                          align="right"
                          actions={[
                            {
                              label: "View Cockpit",
                              icon: Eye,
                              onClick: () => router.push(`/groups/${grp.id}`),
                            },
                            ...(canAddEdit("clients")
                              ? [
                                  {
                                    label: "Edit Group",
                                    icon: Pencil,
                                    onClick: () => {
                                      setEditingGroup(grp);
                                      setIsAddEditModalOpen(true);
                                    },
                                  },
                                ]
                              : []),
                            {
                              label: "Generate Invoice",
                              icon: FileText,
                              onClick: () => {
                                const pocClientIdStr = typeof grp.pocClientId === "string"
                                  ? grp.pocClientId
                                  : (grp.pocClientId as any)?.id || (grp.pocClientId as any)?._id?.toString() || (grp.stats as any)?.pocClientId;

                                const pocClient = (grp.entities || []).find(
                                  (e: any) => e.id === pocClientIdStr
                                ) || grp.entities?.[0];

                                const draftData = {
                                  clientId: pocClient?.id || '',
                                  clientBusinessName: pocClient?.name || grp.name,
                                  clientLegalName: (pocClient as any)?.legalName || pocClient?.name || grp.name,
                                  clientGroup: grp.name,
                                  clientPan: pocClient?.pan || '',
                                  clientAddress: (pocClient as any)?.address || '',
                                  services: [],
                                  totalPayable: 0,
                                  subTotal: 0,
                                };

                                if (typeof window !== 'undefined') {
                                  sessionStorage.setItem('turia_draft_invoice_from_group', JSON.stringify(draftData));
                                }

                                void navigateWithTransition(`/invoice?tab=invoice&groupId=${grp.id}`, router);
                              },
                            },
                            ...(canDelete("clients")
                              ? [
                                  {
                                    label: "Delete Group",
                                    icon: Trash2,
                                    variant: "danger" as const,
                                    onClick: () => setGroupToDelete(grp),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>

                    {/* Expandable Sub-Rows: Member Entities (Image 1) */}
                    {isExpanded &&
                      (grp.entities || []).map((entity: GroupEntity) => (
                        <tr
                          key={entity.id}
                          className="bg-gray-50/40 dark:bg-slate-900/30 border-b border-gray-100 dark:border-slate-800/60 text-xs"
                        >
                          <td className="py-2 px-3"></td>
                          <td className="py-2 px-3 pl-8">
                            <div className="flex items-center gap-2">
                              <CornerDownRight size={13} className="text-gray-400 shrink-0" />
                              <Link
                                href={`/client/${entity.id}`}
                                className="font-semibold text-gray-800 dark:text-slate-200 hover:text-[#31719B] hover:underline truncate max-w-[180px]"
                              >
                                {entity.name}
                              </Link>
                              <span className="text-[10px] text-gray-400 font-mono">
                                ({entity.fileNo || "-"})
                              </span>
                            </div>
                          </td>

                          {visibleColumns.groupId && (
                            <td className="py-2 px-3 text-gray-400">-</td>
                          )}

                          {visibleColumns.entities && (
                            <td className="py-2 px-3">
                              <span className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                                {entity.type}
                              </span>
                            </td>
                          )}

                          {visibleColumns.poc && (
                            <td className="py-2 px-3 text-gray-500">{entity.pan || "-"}</td>
                          )}

                          {visibleColumns.contact && (
                            <td className="py-2 px-3 text-gray-500">{entity.mobile || "-"}</td>
                          )}

                          {visibleColumns.openTasks && (
                            <td className="py-2 px-3 text-center text-gray-500">
                              {entity.openTasksCount ?? "-"}
                            </td>
                          )}

                          {visibleColumns.readyToBill && (
                            <td className="py-2 px-3 text-center text-gray-500">
                              {entity.readyToBillCount ?? "-"}
                            </td>
                          )}

                          {visibleColumns.invoices && (
                            <td className="py-2 px-3 text-center text-gray-500">
                              {entity.invoicesCount ?? "-"}
                            </td>
                          )}

                          {visibleColumns.proformas && (
                            <td className="py-2 px-3 text-center text-gray-500">
                              {entity.proformasCount ?? "-"}
                            </td>
                          )}

                          {visibleColumns.outstanding && (
                            <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                              {entity.outstandingAmount !== undefined
                                ? `₹${entity.outstandingAmount.toFixed(2)}`
                                : "-"}
                            </td>
                          )}

                          <td className="py-2 px-3 text-center"></td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination Bar */}
      <Pagination
        currentPage={pagination.page}
        pageSize={pagination.limit}
        totalItems={pagination.totalDocs}
        onPageChange={handlePageChange}
        showPageSize
        pageSizeOptions={[10, 25, 50, 100]}
        onPageSizeChange={handleLimitChange}
        className="rounded-none border border-[#dde2e8] dark:border-[#334155]"
      />

      {/* Add / Edit Group Modal */}
      {isAddEditModalOpen && (
        <AddEditGroupModal
          isOpen={isAddEditModalOpen}
          onClose={() => {
            setIsAddEditModalOpen(false);
            setEditingGroup(null);
          }}
          onSave={handleSaveGroup}
          group={editingGroup}
          allGroups={groups}
        />
      )}

      {/* Delete Confirmation Modal */}
      {groupToDelete && (
        <DiscardConfirmationModal
          isOpen={Boolean(groupToDelete)}
          onCancel={() => setGroupToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Group"
          message={`Are you sure you want to delete group "${groupToDelete.name}"? Clients will be unlinked but will remain safe in your client directory.`}
          confirmText="Delete Group"
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteConfirmOpen && (
        <DiscardConfirmationModal
          isOpen={isBulkDeleteConfirmOpen}
          onCancel={() => setIsBulkDeleteConfirmOpen(false)}
          onConfirm={handleConfirmBulkDelete}
          title="Delete Selected Groups"
          message={`Are you sure you want to delete ${selectedGroupIds.size} selected group${
            selectedGroupIds.size > 1 ? "s" : ""
          }? Clients will be unlinked but will remain safe in your client directory.`}
          confirmText="Delete Selected"
        />
      )}
    </div>
  );
};
