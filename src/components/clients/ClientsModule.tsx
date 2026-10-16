"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  Settings,
  RotateCcw,
  ArrowRight,
  Phone,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Check,
  Trash2,
  Eye,
  SlidersHorizontal,
  X,
  Pencil,
} from "lucide-react";
import {
  Client,
  INITIAL_CLIENTS,
  CLIENT_TYPES,
  CLIENT_GROUPS,
  RECURRING_SERVICES,
  CLIENT_TAGS,
} from "@/data/crmData";
import { ClientForm } from "./ClientForm";
import { ClientViewDrawer } from "./ClientViewDrawer";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";

interface ClientColumnDef {
  id: string;
  label: string;
  sortable?: boolean;
}

export const CLIENT_COLUMNS: ClientColumnDef[] = [
  { id: "photo", label: "PHOTO" },
  { id: "fileNo", label: "FILE NO.", sortable: true },
  { id: "name", label: "NAME", sortable: true },
  { id: "type", label: "TYPE", sortable: true },
  { id: "mobile", label: "MOBILE" },
  { id: "group", label: "GROUP", sortable: true },
  { id: "tags", label: "TAGS" },
  { id: "status", label: "STATUS" },
  { id: "users", label: "USERS" },
];

const STORAGE_KEY = "crm.clients.v1";

interface ClientsModuleProps {
  initialMode?: "list" | "create";
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({
  initialMode = "list",
}) => {
  const [viewMode, setViewMode] = useState<"list" | "create">(initialMode);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filters State matching Screenshot 4
  const [draftSearch, setDraftSearch] = useState("");
  const [draftService, setDraftService] = useState("");
  const [draftType, setDraftType] = useState("");
  const [draftGroup, setDraftGroup] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    service: "",
    type: "",
    group: "",
    status: "",
  });

  // Table State
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Modals & Drawers
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Load clients
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClients(parsed);
          setIsLoaded(true);
          return;
        }
      }
    } catch {
      // Fallback
    }
    setClients(INITIAL_CLIENTS);
    setIsLoaded(true);
  }, []);

  const persistClients = useCallback((newClients: Client[]) => {
    setClients(newClients);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newClients));
    } catch {
      // storage error
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Filter application
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      search: draftSearch,
      service: draftService,
      type: draftType,
      group: draftGroup,
      status: draftStatus,
    });
    setPage(1);
  };

  const handleResetFilters = () => {
    setDraftSearch("");
    setDraftService("");
    setDraftType("");
    setDraftGroup("");
    setDraftStatus("");
    setAppliedFilters({
      search: "",
      service: "",
      type: "",
      group: "",
      status: "",
    });
    setPage(1);
  };

  // Performance-optimised memoized filtering and sorting
  const filteredAndSortedClients = useMemo(() => {
    let result = clients;

    if (appliedFilters.search.trim()) {
      const q = appliedFilters.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.fileNo.toLowerCase().includes(q) ||
          c.mobile.toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.pan && c.pan.toLowerCase().includes(q))
      );
    }

    if (appliedFilters.service) {
      result = result.filter((c) => c.services?.includes(appliedFilters.service));
    }

    if (appliedFilters.type) {
      result = result.filter((c) => c.type === appliedFilters.type);
    }

    if (appliedFilters.group) {
      result = result.filter(
        (c) => c.group.toLowerCase() === appliedFilters.group.toLowerCase()
      );
    }

    if (appliedFilters.status) {
      result = result.filter(
        (c) => c.active === (appliedFilters.status === "active")
      );
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const valA = (a as any)[sortKey] ?? "";
        const valB = (b as any)[sortKey] ?? "";
        return sortDirection === "asc"
          ? String(valA).localeCompare(String(valB), "en", { numeric: true })
          : String(valB).localeCompare(String(valA), "en", { numeric: true });
      });
    }

    return result;
  }, [clients, appliedFilters, sortKey, sortDirection]);

  // Pagination
  const totalRows = filteredAndSortedClients.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedClients.slice(start, start + pageSize);
  }, [filteredAndSortedClients, currentPage, pageSize]);

  const fromIndex = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = Math.min(currentPage * pageSize, totalRows);

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

  // Selection
  const allCurrentPageSelected =
    paginatedRows.length > 0 &&
    paginatedRows.every((row) => selectedIds.has(row.id));

  const toggleSelectAllPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (paginatedRows.every((r) => next.has(r.id))) {
        paginatedRows.forEach((r) => next.delete(r.id));
      } else {
        paginatedRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [paginatedRows]);

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Status toggle
  const handleToggleActive = useCallback(
    (id: string) => {
      persistClients(
        clients.map((c) => {
          if (c.id === id) {
            const nextActive = !c.active;
            showToast(
              `Client "${c.name}" marked as ${nextActive ? "Active" : "Inactive"}.`
            );
            return { ...c, active: nextActive };
          }
          return c;
        })
      );
      if (viewingClient?.id === id) {
        setViewingClient((prev) => (prev ? { ...prev, active: !prev.active } : null));
      }
    },
    [clients, persistClients, showToast, viewingClient]
  );

  // Delete
  const handleDeleteClient = useCallback(
    (id: string, name: string) => {
      if (window.confirm(`Are you sure you want to delete client "${name}"?`)) {
        persistClients(clients.filter((c) => c.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (viewingClient?.id === id) setViewingClient(null);
        showToast(`Client "${name}" deleted.`);
      }
    },
    [clients, persistClients, showToast, viewingClient]
  );

  // Save from ClientForm
  const handleSaveClientForm = (client: Client) => {
    const exists = clients.some((c) => c.id === client.id);
    let updated: Client[];
    if (exists) {
      updated = clients.map((c) => (c.id === client.id ? client : c));
      showToast(`Client "${client.name}" updated successfully.`);
    } else {
      updated = [client, ...clients];
      showToast(`Client "${client.name}" saved successfully.`);
    }
    persistClients(updated);
    setViewMode("list");
    setEditingClient(null);
  };

  const visibleColumns = useMemo(() => {
    return CLIENT_COLUMNS.filter((col) => !hiddenColumns.has(col.id));
  }, [hiddenColumns]);

  const toggleColumn = (id: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // If in create/edit mode, render the full ClientForm (Screenshot 1 & 5)
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

      {/* TOP HEADER ROW matching Screenshot 4: "Clients (20)" + "Import" + "Export" + "+ New" */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white">
          Clients ({filteredAndSortedClients.length})
        </h1>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => showToast("Import client records feature ready.")}
            className="px-4 py-2 rounded-sm text-sm font-semibold transition-colors cursor-pointer"
            style={{
              backgroundColor: "rgba(49, 113, 155, 0.12)",
              color: "var(--premium-blue-dark)",
            }}
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => showToast("Exported clients master list.")}
            className="px-4 py-2 rounded-sm text-sm font-semibold transition-colors cursor-pointer"
            style={{
              backgroundColor: "rgba(49, 113, 155, 0.12)",
              color: "var(--premium-blue-dark)",
            }}
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingClient(null);
              setViewMode("create");
            }}
            className="flex items-center gap-1.5 px-5 py-2 rounded-sm text-sm font-bold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
            }
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* FILTERS CARD matching Screenshot 4 */}
      <div className=" bg-white dark:bg-[#1e293b] p-4 shadow-card">
        <form onSubmit={handleApplyFilters} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_auto] gap-4 items-end">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 py-2">
                Search
              </label>
              <input
                type="text"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                placeholder="Client, File No., Contact Person, Mobile, Email, PAN, GSTIN"
                className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 text-sm text-[#000000] dark:text-white outline-none placeholder:text-gray-400 hover:border-gray-400 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
              />
            </div>

            {/* Recurring Service */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 py-2">
                Recurring Service
              </label>
              <Select
                value={draftService}
                onChange={(val) => setDraftService(val)}
                options={[
                  { value: "", label: "Select..." },
                  ...RECURRING_SERVICES.map((s) => ({ value: s.id, label: s.name })),
                ]}
                placeholder="Select..."
                separator={true}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 py-2">
                Type
              </label>
              <Select
                value={draftType}
                onChange={(val) => setDraftType(val)}
                options={[
                  { value: "", label: "Select..." },
                  ...CLIENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
                ]}
                placeholder="Select..."
                separator={true}
              />
            </div>

            {/* Buttons: + , Reset, Apply */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="h-11 w-11 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-xs cursor-pointer"
                title={showMoreFilters ? "Hide extra filters" : "More filters"}
              >
                <Plus className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                className="h-11 w-11 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-xs cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="submit"
                className="h-11 w-11 rounded-md flex items-center justify-center text-white shadow-xs transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
                }
                title="Apply filters"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* More Filters Row */}
          {showMoreFilters && (
            <div className="pt-3  grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 py-2">
                  Select Group
                </label>
                <Select
                  value={draftGroup}
                  onChange={(val) => setDraftGroup(val)}
                  options={[
                    { value: "", label: "All Groups" },
                    ...CLIENT_GROUPS.map((g) => ({ value: g, label: g })),
                  ]}
                  placeholder="All Groups"
                  separator={true}
                  searchable={true}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 py-2">
                  Status
                </label>
                <Select
                  value={draftStatus}
                  onChange={(val) => setDraftStatus(val)}
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  placeholder="All Statuses"
                  separator={true}
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex flex-wrap items-center justify-between px-4 py-2.5  shadow-xs animate-in fade-in duration-150 gap-2"
          style={{ backgroundColor: "#f0f7fb" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            />
            <span className="text-xs font-bold text-[#000000]">
              {selectedIds.size} {selectedIds.size === 1 ? "client" : "clients"} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-black hover:underline cursor-pointer"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() => {
                persistClients(
                  clients.map((c) =>
                    selectedIds.has(c.id) ? { ...c, active: true } : c
                  )
                );
                showToast(`${selectedIds.size} clients marked Active.`);
              }}
              className="px-3 py-1.5 rounded-sm text-xs font-bold bg-white text-[#1d8a4d] border border-gray-200 hover:bg-gray-50 cursor-pointer shadow-2xs"
            >
              Mark Active
            </button>
            <button
              type="button"
              onClick={() => {
                persistClients(
                  clients.map((c) =>
                    selectedIds.has(c.id) ? { ...c, active: false } : c
                  )
                );
                showToast(`${selectedIds.size} clients marked Inactive.`);
              }}
              className="px-3 py-1.5 rounded-sm text-xs font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer shadow-2xs"
            >
              Mark Inactive
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete ${selectedIds.size} selected clients?`
                  )
                ) {
                  persistClients(clients.filter((c) => !selectedIds.has(c.id)));
                  setSelectedIds(new Set());
                  showToast(`${selectedIds.size} clients deleted.`);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold text-white shadow-xs cursor-pointer"
              style={{ backgroundColor: "var(--premium-orange-dark)" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* TABLE matching Screenshot 4 */}
      <div className=" bg-white dark:bg-[#1e293b] shadow-card overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full border-collapse text-left text-xs select-none">
            <thead>
              <tr
                className="border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                {/* Select All */}
                <th className="w-12 px-3 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                  />
                </th>

                {visibleColumns.map((col) => (
                  <th
                    key={col.id}
                    scope="col"
                    className="px-3 py-3.5 font-bold tracking-wider text-[11px] text-gray-700 dark:text-gray-300 uppercase whitespace-nowrap"
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.id)}
                        className="flex items-center gap-1.5 hover:text-[#31719B] transition-colors cursor-pointer"
                      >
                        <span>{col.label}</span>
                        {sortKey === col.id ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-[#31719B]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#31719B]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </th>
                ))}

                {/* Settings Gear ⚙ icon at top right */}
                <th className="w-12 px-3 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => setIsColumnSettingsOpen(true)}
                    className="p-1 rounded text-gray-500 hover:text-[#31719B] transition-colors cursor-pointer"
                    title="Columns"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="py-16 text-center text-gray-400 font-medium"
                  >
                    {!isLoaded
                      ? "Loading clients..."
                      : "No clients match your filter criteria."}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((client) => {
                  const isSelected = selectedIds.has(client.id);
                  const typeObj = CLIENT_TYPES.find((t) => t.value === client.type);
                  const typeLabel = typeObj ? typeObj.label : client.type || "Other";
                  const digits = client.mobile.replace(/\D/g, "");

                  return (
                    <tr
                      key={client.id}
                      className={`group transition-colors ${isSelected
                        ? "bg-[#31719B]/5 dark:bg-[#31719B]/10"
                        : "hover:bg-[#F6F4F2]/60 dark:hover:bg-[#162032]"
                        }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(client.id)}
                          className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                        />
                      </td>

                      {/* Visible Columns */}
                      {visibleColumns.map((col) => {
                        if (col.id === "photo") {
                          return (
                            <td key={col.id} className="px-3 py-2 w-12">
                              {/* Avatar placeholder with silhouette icon matching screenshot */}
                              <div className="w-10 h-10 rounded-full bg-[#eef0f3] dark:bg-[#334155] flex items-center justify-center text-gray-400 overflow-hidden">
                                {client.photo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={client.photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                  </svg>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.id === "fileNo") {
                          return (
                            <td key={col.id} className="px-3 py-3 font-mono font-medium text-gray-700 dark:text-gray-300">
                              {client.fileNo || "—"}
                            </td>
                          );
                        }

                        if (col.id === "name") {
                          return (
                            <td key={col.id} className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => setViewingClient(client)}
                                className="font-semibold text-[#31719B] hover:underline text-left cursor-pointer transition-colors"
                              >
                                {client.name}
                              </button>
                            </td>
                          );
                        }

                        if (col.id === "type") {
                          return (
                            <td key={col.id} className="px-3 py-3 text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
                              {typeLabel}
                            </td>
                          );
                        }

                        if (col.id === "mobile") {
                          return (
                            <td key={col.id} className="px-3 py-3 whitespace-nowrap">
                              {client.mobile ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {client.mobile}
                                  </span>
                                  {/* Purple Phone Icon + Green WhatsApp Icon */}
                                  <a
                                    href={`tel:+91${digits}`}
                                    className="p-1 rounded text-[#31719B] hover:bg-[#31719B]/10"
                                    title="Call"
                                  >
                                    <Phone className="w-3.5 h-3.5 fill-[#31719B]" />
                                  </a>
                                  <a
                                    href={`https://wa.me/91${digits}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded text-[#25D366] hover:bg-emerald-50 transition-colors inline-flex items-center justify-center hover:scale-110"
                                    title="WhatsApp"
                                  >
                                    <svg className="w-4.5 h-4.5 fill-[#25D366]" viewBox="0 0 24 24">
                                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                    </svg>
                                  </a>
                                </div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                          );
                        }

                        if (col.id === "group") {
                          return (
                            <td key={col.id} className="px-3 py-3 text-gray-700 dark:text-gray-300 max-w-[150px] truncate" title={client.group}>
                              {client.group || "—"}
                            </td>
                          );
                        }

                        if (col.id === "tags") {
                          return (
                            <td key={col.id} className="px-3 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {client.tags && client.tags.length > 0 ? (
                                  client.tags.slice(0, 1).map((t) => {
                                    const info = CLIENT_TAGS[t];
                                    return (
                                      <span
                                        key={t}
                                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                        style={{
                                          backgroundColor: info?.bg || "#e7f1fb",
                                          color: info?.text || "#31719B",
                                        }}
                                      >
                                        {info?.label || t}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                                {client.tags && client.tags.length > 1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800">
                                    +{client.tags.length - 1}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.id === "status") {
                          return (
                            <td key={col.id} className="px-3 py-3">
                              {/* Green "Active" text matching Screenshot 4 */}
                              <button
                                type="button"
                                onClick={() => handleToggleActive(client.id)}
                                className={`font-semibold cursor-pointer text-xs ${client.active ? "text-[#1d8a4d]" : "text-gray-400"
                                  }`}
                              >
                                {client.active ? "Active" : "Inactive"}
                              </button>
                            </td>
                          );
                        }

                        if (col.id === "users") {
                          return (
                            <td key={col.id} className="px-3 py-3">
                              <div className="flex items-center -space-x-1.5">
                                {client.users && client.users.length > 0 ? (
                                  client.users.map((u) => (
                                    <div
                                      key={u}
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-[#1e293b]"
                                      style={{
                                        backgroundColor: "var(--premium-blue-dark)",
                                      }}
                                      title={u}
                                    >
                                      {u[0]}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        return null;
                      })}

                      {/* ⁝ Actions Kebab */}
                      <td className="px-3 py-3 text-center relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId(
                              activeMenuId === client.id ? null : client.id
                            )
                          }
                          className="p-1 rounded text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === client.id && (
                          <div className="absolute right-3 top-9 z-30 w-44 rounded-xl shadow-xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] py-1 text-left text-xs animate-in fade-in duration-100 font-semibold">
                            <button
                              type="button"
                              onClick={() => {
                                setViewingClient(client);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-200 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#31719B]" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingClient(client);
                                setViewMode("create");
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-200 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#31719B]" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleToggleActive(client.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-200 cursor-pointer"
                            >
                              <span>
                                Mark as {client.active ? "Inactive" : "Active"}
                              </span>
                            </button>
                            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteClient(client.id, client.name);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 text-[#e8655a] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION: "Showing 1–10 of 20" on left, [Previous] [Next] on right matching user screenshot */}
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalRows}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          showPageSize={false}
        />
      </div>

      {/* Column Visibility Popover/Modal */}
      {isColumnSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl shadow-2xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden flex flex-col">
            <div
              className="px-5 py-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <h3 className="text-base font-bold text-[#000000] dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#31719B]" />
                Show / Hide Columns
              </h3>
              <button
                type="button"
                onClick={() => setIsColumnSettingsOpen(false)}
                className="p-1 rounded-sm text-gray-500 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {CLIENT_COLUMNS.map((col) => {
                const isName = col.id === "name";
                const isChecked = !hiddenColumns.has(col.id);

                return (
                  <label
                    key={col.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${isName
                      ? "bg-gray-100 dark:bg-gray-800 opacity-70 cursor-not-allowed"
                      : "hover:bg-[#F6F4F2] dark:hover:bg-[#0f172a]"
                      }`}
                  >
                    <span className="text-[#000000] dark:text-white">{col.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isName}
                      onChange={() => toggleColumn(col.id)}
                      className="w-4 h-4 rounded text-[#31719B] accent-[#31719B]"
                    />
                  </label>
                );
              })}
            </div>

            <div
              className="px-5 py-3 border-t border-[#dde2e8] dark:border-[#334155] flex items-center justify-between"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <button
                type="button"
                onClick={() => setHiddenColumns(new Set())}
                className="text-xs font-bold text-[#31719B] hover:underline cursor-pointer"
              >
                Show All
              </button>
              <button
                type="button"
                onClick={() => setIsColumnSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client View Drawer */}
      {viewingClient && (
        <ClientViewDrawer
          client={viewingClient}
          onClose={() => setViewingClient(null)}
          onEdit={(c) => {
            setEditingClient(c);
            setViewMode("create");
            setViewingClient(null);
          }}
          onDelete={(id, name) => {
            handleDeleteClient(id, name);
          }}
          onToggleActive={(id) => {
            handleToggleActive(id);
          }}
        />
      )}
    </div>
  );
};
