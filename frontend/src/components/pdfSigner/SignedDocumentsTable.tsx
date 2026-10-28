"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  ShieldCheck,
  RotateCcw,
  Search,
  Archive,
  Loader2,
  Building2,
  User,
  Calendar,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { SignedDocItem } from "@/services/pdfSignerApi";
import { Pagination } from "@/components/ui/Pagination";

export interface SignedDocumentsTableProps {
  documents: SignedDocItem[];
  isLoading: boolean;
  onVerify: (doc: SignedDocItem) => void;
  onDownload: (doc: SignedDocItem) => void;
  onRetry: (doc: SignedDocItem) => Promise<void>;
  onDownloadZip: (selectedIds: string[]) => Promise<void>;
  retryingId?: string | null;
  downloadingZip?: boolean;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export const SignedDocumentsTable: React.FC<SignedDocumentsTableProps> = ({
  documents,
  isLoading,
  onVerify,
  onDownload,
  onRetry,
  onDownloadZip,
  retryingId,
  downloadingZip = false,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Signed / Verified" | "Tampered" | "Failed">("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter items
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Status filter
      if (
        statusFilter === "Signed / Verified" &&
        doc.status !== "Signed" &&
        doc.status !== "Verified"
      ) {
        return false;
      }
      if (statusFilter === "Tampered" && doc.status !== "Tampered") return false;
      if (statusFilter === "Failed" && doc.status !== "Failed") return false;

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchName = doc.fileName.toLowerCase().includes(query);
        const matchClient = doc.clientName?.toLowerCase().includes(query) ?? false;
        const matchSigner = doc.signedBy?.toLowerCase().includes(query) ?? false;
        if (!matchName && !matchClient && !matchSigner) return false;
      }

      return true;
    });
  }, [documents, statusFilter, search]);


  // Paginated slice
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocs.slice(start, start + pageSize);
  }, [filteredDocs, currentPage, pageSize]);

  // Checkbox helpers
  const allCurrentSelected =
    paginatedDocs.length > 0 && paginatedDocs.every((d) => selectedIds.has(d.id));
  const someCurrentSelected =
    paginatedDocs.some((d) => selectedIds.has(d.id)) && !allCurrentSelected;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allCurrentSelected) {
      paginatedDocs.forEach((d) => next.delete(d.id));
    } else {
      paginatedDocs.forEach((d) => next.add(d.id));
    }
    setSelectedIds(next);
  };

  const handleToggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleDownloadZipClick = async () => {
    if (selectedIds.size === 0) return;
    await onDownloadZip(Array.from(selectedIds));
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-[#dde2e8] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Signed documents
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {filteredDocs.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Cryptographically sealed files, audit logs, and verification reports
          </p>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download selected ZIP button */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDownloadZipClick}
              disabled={downloadingZip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#31719B] text-white hover:bg-[#275a7c] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {downloadingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>Download selected ({selectedIds.size}) ZIP</span>
            </button>
          )}

          {/* Search bar */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents or clients..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#31719B]"
            />
          </div>

          {/* Status filter pills */}
          <div className="inline-flex items-center rounded-lg border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
            {(["All", "Signed / Verified", "Tampered", "Failed"] as const).map((filter) => {
              const active = statusFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setStatusFilter(filter);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    active
                      ? "bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white shadow-xs font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
          <thead className="bg-[#f8fafc] dark:bg-[#0f172a]/60 text-gray-700 dark:text-gray-300 uppercase text-[11px] tracking-wider border-b border-[#dde2e8] dark:border-[#334155]">
            <tr>
              <th className="w-10 px-3 py-3 text-center">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  disabled={paginatedDocs.length === 0}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Select all"
                >
                  {allCurrentSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#31719B]" />
                  ) : someCurrentSelected ? (
                    <MinusSquare className="w-4 h-4 text-[#31719B]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-3.5 py-3 font-semibold">Document</th>
              <th className="px-3.5 py-3 font-semibold">Client</th>
              <th className="px-3.5 py-3 font-semibold">Signed by</th>
              <th className="px-3.5 py-3 font-semibold">Signed on</th>
              <th className="px-3.5 py-3 font-semibold">Status</th>
              <th className="px-3.5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
                    <span className="text-xs font-medium">Loading signed documents...</span>
                  </div>
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                      No documents found
                    </span>
                    <span className="text-xs text-gray-400 max-w-sm">
                      {search || statusFilter !== "All"
                        ? "No signed documents match your filter. Try adjusting your search query."
                        : "No documents have been signed yet. Upload PDF files above to begin signing."}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedDocs.map((doc) => {
                const isSelected = selectedIds.has(doc.id);
                const isFailed = doc.status === "Failed";
                const isSigned = doc.status === "Signed";
                const isRetrying = retryingId === doc.id;

                return (
                  <tr
                    key={doc.id}
                    className={`hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors ${
                      isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="w-10 px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleOne(doc.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label={`Select ${doc.fileName}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#31719B]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Document details */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-medium text-gray-900 dark:text-white truncate max-w-xs sm:max-w-md"
                            title={doc.fileName}
                          >
                            {doc.fileName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                            <span>{formatBytes(doc.fileSize)}</span>
                            <span>•</span>
                            <span>{doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}</span>
                            {doc.originalSha256 && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px]" title={`SHA-256: ${doc.originalSha256}`}>
                                  {doc.originalSha256.slice(0, 8)}...
                                </span>
                              </>
                            )}
                          </div>
                          {isFailed && doc.errorMessage && (
                            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-xs">{doc.errorMessage}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium truncate max-w-[140px]">
                          {doc.clientName || "Not assigned"}
                        </span>
                      </div>
                    </td>

                    {/* Signed by */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium truncate max-w-[140px]">
                          {doc.signedBy || "-"}
                        </span>
                      </div>
                    </td>

                    {/* Signed on */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{formatDate(doc.signedAt || doc.createdAt)}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {doc.status === "Signed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Signed</span>
                        </span>
                      )}
                      {doc.status === "Verified" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Valid</span>
                        </span>
                      )}
                      {doc.status === "Tampered" && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          title={doc.errorMessage || "Content or signature altered after signing"}
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>Tampered</span>
                        </span>
                      )}
                      {doc.status === "Unsigned" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          <FileText className="w-3 h-3" />
                          <span>Unsigned</span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                          <AlertCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                      {!isSigned && !isFailed && doc.status !== "Verified" && doc.status !== "Tampered" && doc.status !== "Unsigned" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Clock className="w-3 h-3" />
                          <span>{doc.status}</span>
                        </span>
                      )}
                    </td>

                    {/* Row Actions */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* Verify button (available for Signed, Verified, Tampered, and Unsigned) */}
                        {(isSigned || doc.status === "Verified" || doc.status === "Tampered" || doc.status === "Unsigned") && (
                          <button
                            type="button"
                            onClick={() => onVerify(doc)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors shadow-2xs ${
                              doc.status === "Tampered"
                                ? "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                                : "border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-[#31719B] dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                            title="Inspect cryptographic integrity report"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{doc.status === "Tampered" ? "Inspect Tamper" : "Verify"}</span>
                          </button>
                        )}

                        {/* Download button */}
                        {(isSigned || doc.status === "Verified" || doc.status === "Tampered" || doc.status === "Unsigned") && (
                          <button
                            type="button"
                            onClick={() => onDownload(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-2xs"
                            title="Download PDF file"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        )}

                        {/* Retry button (only for Failed files) */}
                        {isFailed && (
                          <button
                            type="button"
                            onClick={() => onRetry(doc)}
                            disabled={isRetrying}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 shadow-2xs"
                            title="Retry signing this document"
                          >
                            {isRetrying ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredDocs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredDocs.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          showPageSize={true}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
};
