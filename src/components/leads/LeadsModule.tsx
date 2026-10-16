"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Phone,
  Mail,
  Check,
  X,
  FileText,
} from "lucide-react";
import { Lead, INITIAL_LEADS } from "@/data/crmData";
import { LeadFormModal } from "./LeadFormModal";
import { Pagination } from "@/components/ui/Pagination";

interface ColumnDef {
  key: keyof Lead | "actions" | "select";
  label: string;
  kind?: "text" | "date" | "timestamp" | "file" | "secret" | "phone" | "email";
  sortable?: boolean;
}

export const ALL_LEAD_COLUMNS: ColumnDef[] = [
  { key: "fullName", label: "Party Full Name", sortable: true },
  { key: "createdAt", label: "Created On", kind: "timestamp", sortable: true },
  { key: "updatedAt", label: "Updated On", kind: "timestamp", sortable: true },
  { key: "firstName", label: "First Name", sortable: true },
  { key: "middleName", label: "Middle Name", sortable: true },
  { key: "lastName", label: "Last Name", sortable: true },
  { key: "abbreviation", label: "Abbreviation" },
  { key: "dob", label: "Date of Birth", kind: "date", sortable: true },
  { key: "aadhaarMobile", label: "Mobile No Linked with Aadhaar" },
  { key: "mobile", label: "Communication Mobile", kind: "phone" },
  { key: "email", label: "Communication Mail ID", kind: "email" },
  { key: "pan", label: "PAN No", sortable: true },
  { key: "panAttachment", label: "PAN Attachment", kind: "file" },
  { key: "aadhaar", label: "Aadhaar No" },
  { key: "aadhaarAttachment", label: "Aadhaar Attachment", kind: "file" },
  { key: "gender", label: "Gender" },
  { key: "address", label: "Address" },
  { key: "country", label: "Country" },
  { key: "state", label: "State Name", sortable: true },
  { key: "pincode", label: "Pin Code" },
  { key: "nationality", label: "Nationality" },
  { key: "policeStation", label: "Police Station" },
  { key: "postOffice", label: "Post Office" },
  { key: "din", label: "DIN / DPIN No" },
  { key: "dinAttachment", label: "DIN Attachment", kind: "file" },
  { key: "mcaId", label: "MCA V3 ID" },
  { key: "mcaPassword", label: "MCA V3 PW", kind: "secret" },
  { key: "referredBy", label: "Referred By" },
];

const DEFAULT_HIDDEN = new Set([
  "middleName",
  "lastName",
  "abbreviation",
  "postOffice",
  "policeStation",
  "dinAttachment",
  "mcaPassword",
]);

const STORAGE_KEY = "crm.leads.v1";

export const LeadsModule: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Lead | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(DEFAULT_HIDDEN);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(15); // Default 15 as in screenshot 3
  const [page, setPage] = useState<number>(1);

  // Modals & Drawers
  const [editingLead, setEditingLead] = useState<Lead | null | undefined>(undefined);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLeads(parsed);
          setIsLoaded(true);
          return;
        }
      }
    } catch {
      // Fallback
    }
    setLeads(INITIAL_LEADS);
    setIsLoaded(true);
  }, []);

  const persistLeads = useCallback((newLeads: Lead[]) => {
    setLeads(newLeads);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLeads));
    } catch {
      // Ignore
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const visibleColumns = useMemo(() => {
    return ALL_LEAD_COLUMNS.filter(
      (c) => c.key === "fullName" || !hiddenColumns.has(c.key as string)
    );
  }, [hiddenColumns]);

  // Performance-optimised filtering and sorting
  const filteredAndSortedLeads = useMemo(() => {
    let result = leads;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((lead) => {
        return (
          lead.fullName.toLowerCase().includes(q) ||
          lead.mobile.toLowerCase().includes(q) ||
          lead.aadhaarMobile.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          lead.pan.toLowerCase().includes(q) ||
          lead.referredBy.toLowerCase().includes(q) ||
          lead.state.toLowerCase().includes(q)
        );
      });
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const valA = a[sortKey] || "";
        const valB = b[sortKey] || "";
        return sortDirection === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [leads, search, sortKey, sortDirection]);

  // Pagination
  const totalRows = filteredAndSortedLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedLeads.slice(start, start + pageSize);
  }, [filteredAndSortedLeads, currentPage, pageSize]);

  const fromIndex = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = Math.min(currentPage * pageSize, totalRows);

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

  const handleSaveLead = (lead: Lead) => {
    const exists = leads.some((l) => l.id === lead.id);
    let updated: Lead[];
    if (exists) {
      updated = leads.map((l) => (l.id === lead.id ? lead : l));
      showToast(`Lead "${lead.fullName}" updated.`);
    } else {
      updated = [lead, ...leads];
      showToast(`Lead "${lead.fullName}" created.`);
    }
    persistLeads(updated);
    setEditingLead(undefined);
  };

  const handleDeleteLead = useCallback(
    (id: string, name: string) => {
      if (window.confirm(`Delete lead "${name}"?`)) {
        persistLeads(leads.filter((l) => l.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast(`Lead "${name}" deleted.`);
      }
    },
    [leads, persistLeads, showToast]
  );

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Toast */}
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

      {/* TOP ROW matching Screenshot 3: "Leads (0)" on left, Search + "+ Add" on right */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white py-2">
          Leads ({filteredAndSortedLeads.length})
        </h1>

        <div className="flex items-center gap-3 py-2">
          {/* Search box with magnifying glass icon */}
          <div className="relative min-w-[240px] md:min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, mobile, email,"
              className="h-10 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-9 pr-3 text-xs md:text-sm text-[#000000] dark:text-white outline-none placeholder:text-gray-400 hover:border-gray-400 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Manage Columns button */}
          {/* <button
            type="button"
            onClick={() => setIsManageColumnsOpen(true)}
            className="h-10 px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] text-gray-600 dark:text-gray-300 hover:border-[#31719B] flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
            title="Columns"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#31719B]" />
            <span>Columns</span>
          </button> */}

          {/* + Add button matching Screenshot 3 */}
          <button
            type="button"
            onClick={() => setEditingLead(null)}
            className="flex items-center gap-1.5 h-10 px-4 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
            }
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* SPREADSHEET TABLE matching Screenshot 3 */}
      <div className=" bg-white dark:bg-[#1e293b] shadow-card overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full border-separate border-spacing-0 text-left text-xs select-none">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                {/* Frozen Checkbox */}
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-12 min-w-[48px] max-w-[48px] px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center bg-[#F6F4F2] dark:bg-[#1e293b]"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                  />
                </th>

                {/* Frozen Party Full Name - left-[48px] exactly matches Checkbox 48px width with 0 gap */}
                <th
                  scope="col"
                  className="sticky left-[48px] z-30 min-w-[200px] px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-[#000000] dark:text-white bg-[#F6F4F2] dark:bg-[#1e293b]"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort("fullName")}
                    className="flex items-center gap-1.5 hover:text-[#31719B] transition-colors cursor-pointer"
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
                </th>

                {/* Other columns - ALL columns have the header background color applied */}
                {visibleColumns
                  .filter((col) => col.key !== "fullName")
                  .map((col) => (
                    <th
                      key={col.key as string}
                      scope="col"
                      className="px-3.5 py-3 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap bg-[#F6F4F2] dark:bg-[#1e293b]"
                      style={{ backgroundColor: "var(--orange-havy-light)" }}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key as keyof Lead)}
                          className="flex items-center gap-1.5 hover:text-[#31719B] transition-colors cursor-pointer"
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
                    </th>
                  ))}

                {/* Frozen Actions Column */}
                <th
                  scope="col"
                  className="sticky right-0 z-30 w-24 min-w-[96px] max-w-[96px] px-3 py-3 font-semibold text-[#000000] dark:text-white border-l border-b border-[#dde2e8] dark:border-[#334155] text-center bg-[#F6F4F2] dark:bg-[#1e293b]"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="py-16 text-center text-gray-400 font-medium"
                  >
                    {!isLoaded
                      ? "Loading leads..."
                      : "No leads match this search. Click '+ Add' to create a lead."}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((lead) => {
                  const isSelected = selectedIds.has(lead.id);

                  // 100% Solid Full Opacity Backgrounds - NO transparency (/60) on hover
                  const stickyCellBg = isSelected
                    ? "bg-[#edf4f9] dark:bg-[#1c2c3e] group-hover:bg-[#e2edf5] dark:group-hover:bg-[#23374d]"
                    : "bg-white dark:bg-[#1e293b] group-hover:bg-[#F6F4F2] dark:group-hover:bg-[#162032]";

                  return (
                    <tr
                      key={lead.id}
                      className={`group transition-colors ${
                        isSelected
                          ? "bg-[#edf4f9] hover:bg-[#e2edf5] dark:bg-[#1c2c3e] dark:hover:bg-[#23374d]"
                          : "bg-white hover:bg-[#F6F4F2] dark:bg-[#1e293b] dark:hover:bg-[#162032]"
                      }`}
                    >
                      {/* Checkbox (Sticky Left: 0px, width: 48px, Full Opacity) */}
                      <td
                        className={`sticky left-0 z-20 w-12 min-w-[48px] max-w-[48px] px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center opacity-100 ${stickyCellBg}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(lead.id)}
                          className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                        />
                      </td>

                      {/* Party Full Name (Sticky Left: 48px, seamless 0-gap, Full Opacity) */}
                      <td
                        className={`sticky left-[48px] z-20 min-w-[200px] px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] opacity-100 ${stickyCellBg}`}
                      >
                        <button
                          type="button"
                          onClick={() => setEditingLead(lead)}
                          className="flex items-center gap-2.5 text-left cursor-pointer group/name"
                        >
                          {lead.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={lead.photo}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#eef0f3] dark:bg-[#334155] flex items-center justify-center text-gray-400 shrink-0">
                              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                            </div>
                          )}
                          <span className="font-semibold text-[#31719B] group-hover/name:underline truncate max-w-[170px]">
                            {lead.fullName}
                          </span>
                        </button>
                      </td>

                      {/* Dynamic Columns */}
                      {visibleColumns
                        .filter((col) => col.key !== "fullName")
                        .map((col) => {
                          const val = (lead as any)[col.key];

                          let cellContent: React.ReactNode = val || "—";

                          if (col.kind === "timestamp" || col.kind === "date") {
                            cellContent = formatDate(val);
                          } else if (col.kind === "secret") {
                            cellContent = (
                              <span className="font-mono text-gray-400">••••••••</span>
                            );
                          } else if (col.kind === "phone" && val) {
                            cellContent = (
                              <a
                                href={`tel:${val}`}
                                className="flex items-center gap-1 text-[#31719B] hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{val}</span>
                              </a>
                            );
                          } else if (col.kind === "email" && val) {
                            cellContent = (
                              <a
                                href={`mailto:${val}`}
                                className="flex items-center gap-1 text-[#31719B] hover:underline"
                              >
                                <Mail className="w-3 h-3" />
                                <span>{val}</span>
                              </a>
                            );
                          } else if (col.kind === "file") {
                            cellContent = val ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                <FileText className="w-3 h-3 text-[#31719B]" />
                                <span className="max-w-[100px] truncate">{val}</span>
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            );
                          }

                          return (
                            <td
                              key={col.key as string}
                              className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap text-gray-700 dark:text-gray-300 max-w-[200px] truncate"
                            >
                              {cellContent}
                            </td>
                          );
                        })}

                      {/* Actions (Sticky Right, Full Opacity on Hover) */}
                      <td
                        className={`sticky right-0 z-20 w-24 min-w-[96px] max-w-[96px] px-3 py-2 border-l border-b border-[#dde2e8] dark:border-[#334155] text-center opacity-100 ${stickyCellBg}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingLead(lead)}
                            className="p-1 rounded text-gray-400 hover:text-[#31719B] hover:bg-[#31719B]/10 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead.id, lead.fullName)}
                            className="p-1 rounded text-gray-400 hover:text-[#e8655a] hover:bg-red-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

      {/* Column Visibility Modal */}
      {isManageColumnsOpen && (
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
                onClick={() => setIsManageColumnsOpen(false)}
                className="p-1 rounded-lg text-gray-500 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {ALL_LEAD_COLUMNS.map((col) => {
                const isFullName = col.key === "fullName";
                const isChecked = !hiddenColumns.has(col.key as string);

                return (
                  <label
                    key={col.key as string}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${isFullName
                      ? "bg-gray-100 dark:bg-gray-800 opacity-70 cursor-not-allowed"
                      : "hover:bg-[#F6F4F2] dark:hover:bg-[#0f172a]"
                      }`}
                  >
                    <span className="text-[#000000] dark:text-white">{col.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isFullName}
                      onChange={() => {
                        setHiddenColumns((prev) => {
                          const next = new Set(prev);
                          if (next.has(col.key as string)) next.delete(col.key as string);
                          else next.add(col.key as string);
                          return next;
                        });
                      }}
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
                onClick={() => setIsManageColumnsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Lead Modal */}
      {editingLead !== undefined && (
        <LeadFormModal
          lead={editingLead}
          onSave={handleSaveLead}
          onClose={() => setEditingLead(undefined)}
        />
      )}
    </div>
  );
};
