"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  FileText,
  Search,
  FolderOpen,
  ExternalLink,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { ClientDocumentInOut } from "@/data/crmData";
import { TaskItem } from "@/data/taskData";
import { getAvatarBadge } from "./utils";
import { taskApi } from "@/services/taskApi";

export interface ClientDocumentsTabProps {
  documents: ClientDocumentInOut[];
  setIsAddDocInOutOpen: (open: boolean) => void;
  handleDeleteDocMovement: (docId: string, docName: string) => Promise<void>;
  clientTasks?: TaskItem[];
  clientName?: string;
  clientId?: string;
  onRefreshTasks?: () => void;
}

export const ClientDocumentsTab: React.FC<ClientDocumentsTabProps> = ({
  documents,
  setIsAddDocInOutOpen,
  handleDeleteDocMovement,
  clientTasks = [],
  clientName = "",
  clientId = "",
  onRefreshTasks,
}) => {
  const [activeSection, setActiveSection] = useState<"Movements" | "Required">("Required");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "In" | "Out">("All");
  const [reqStatusFilter, setReqStatusFilter] = useState<"All" | "Pending" | "Received">("All");

  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Flatten all required documents from client tasks
  const requiredDocuments = useMemo(() => {
    const list: Array<{
      taskId: string;
      taskDbId: string;
      taskName: string;
      serviceName: string;
      docId: string;
      title: string;
      isMandatory?: boolean;
      status: "Pending" | "Received" | "Requested";
      fileUrl?: string;
      receivedAt?: string;
    }> = [];

    clientTasks.forEach((task) => {
      (task.documentRequests || []).forEach((doc) => {
        list.push({
          taskId: task.taskId,
          taskDbId: task.id,
          taskName: task.taskName,
          serviceName: task.serviceName,
          docId: doc.id,
          title: doc.title,
          isMandatory: doc.isMandatory,
          status: doc.status,
          fileUrl: doc.fileUrl,
          receivedAt: doc.receivedAt,
        });
      });
    });

    return list;
  }, [clientTasks]);

  // Filter required documents
  const filteredRequiredDocs = useMemo(() => {
    return requiredDocuments.filter((doc) => {
      if (reqStatusFilter !== "All" && doc.status !== reqStatusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.serviceName.toLowerCase().includes(q) ||
          doc.taskName.toLowerCase().includes(q) ||
          doc.taskId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requiredDocuments, search, reqStatusFilter]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    return documents.filter((d) => {
      if (statusFilter !== "All" && d.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          d.documentName.toLowerCase().includes(q) ||
          (d.personName && d.personName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [documents, search, statusFilter]);

  const handleUploadReqDoc = async (taskDbId: string, docId: string, file: File, docTitle: string) => {
    setUploadingDocId(docId);
    setUploadError(null);
    try {
      await taskApi.uploadDocumentRequestFile(taskDbId, docId, file, docTitle);
      if (onRefreshTasks) {
        onRefreshTasks();
      }
    } catch (err: any) {
      console.error("Upload error in client documents tab:", err);
      setUploadError(err?.message || "Google Drive upload failed. File was not stored locally.");
    } finally {
      setUploadingDocId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
      {/* Top Section Switcher & Search Bar */}
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Main Subtab toggle: Required Documents vs Document Movements */}
          <div className="flex items-center rounded-lg border border-[#dde2e8] dark:border-[#334155] p-1 bg-gray-50 dark:bg-[#0f172a]">
            <button
              type="button"
              onClick={() => {
                setActiveSection("Required");
                setSearch("");
              }}
              className={`h-7 px-3 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 ${
                activeSection === "Required"
                  ? "bg-white dark:bg-[#1e293b] text-[#31719B] shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Required Documents ({requiredDocuments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection("Movements");
                setSearch("");
              }}
              className={`h-7 px-3 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 ${
                activeSection === "Movements"
                  ? "bg-white dark:bg-[#1e293b] text-[#31719B] shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Document Movements ({documents.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeSection === "Required"
                  ? "Search required docs..."
                  : "Search movements..."
              }
              className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Filter Pill */}
          {activeSection === "Required" ? (
            <div className="flex items-center rounded-md border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
              {(["All", "Pending", "Received"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setReqStatusFilter(filter)}
                  className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${
                    reqStatusFilter === filter
                      ? "bg-blue-100 text-[#31719B] dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center rounded-md border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
              {(["All", "In", "Out"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${
                    statusFilter === filter
                      ? "bg-purple-100 text-[#7c3aed] dark:bg-purple-950/60 dark:text-purple-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        {activeSection === "Movements" && (
          <button
            type="button"
            onClick={() => setIsAddDocInOutOpen(true)}
            className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Movement</span>
          </button>
        )}
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mx-4 mt-3 flex items-start space-x-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Google Drive Upload Failed</p>
            <p className="text-[11px] mt-0.5">{uploadError}</p>
            <p className="text-[10px] text-red-500 mt-0.5">Local storage fallback is disabled. File was not stored locally.</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: REQUIRED DOCUMENTS (From Client Tasks) */}
      {activeSection === "Required" && (
        <div className="overflow-x-auto scrollbar-slim">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Required Document
                </th>
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Task / Service
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Type
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Status
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Received Date
                </th>
                <th className="px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-center">
                  Google Drive Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRequiredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    {clientTasks.length === 0
                      ? "No tasks associated with this client. Create a task with document requests to track compliance documents."
                      : "No required documents match the filter criteria."}
                  </td>
                </tr>
              ) : (
                filteredRequiredDocs.map((doc, idx) => {
                  const isReceived = doc.status === "Received";
                  const isUploading = uploadingDocId === doc.docId;
                  const fileInputId = `client-req-doc-${doc.docId}-${idx}`;

                  return (
                    <tr
                      key={`${doc.taskDbId}-${doc.docId}-${idx}`}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                    >
                      {/* Document Name */}
                      <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="font-semibold">{doc.title}</span>
                        </div>
                      </td>

                      {/* Task / Service */}
                      <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300">
                        <div className="text-xs">
                          <p className="font-semibold text-gray-900 dark:text-white">{doc.serviceName}</p>
                          <span className="text-[10px] text-gray-500 font-mono">{doc.taskId}</span>
                        </div>
                      </td>

                      {/* Type: Mandatory or Optional */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            doc.isMandatory
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {doc.isMandatory ? "Mandatory" : "Optional"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                            isReceived
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {isReceived && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                          <span>{doc.status}</span>
                        </span>
                      </td>

                      {/* Received Date */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                        {doc.receivedAt
                          ? new Date(doc.receivedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Drive File</span>
                            </a>
                          )}

                          <input
                            id={fileInputId}
                            type="file"
                            className="hidden"
                            disabled={isUploading}
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                await handleUploadReqDoc(doc.taskDbId, doc.docId, file, doc.title);
                                e.target.value = "";
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => document.getElementById(fileInputId)?.click()}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 text-xs font-medium cursor-pointer transition-colors"
                            title={isReceived ? "Re-upload document to Google Drive" : "Upload file to Google Drive"}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                <span>Syncing...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3" />
                                <span>{isReceived ? "Replace" : "Upload"}</span>
                              </>
                            )}
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
      )}

      {/* SECTION 2: DOCUMENT MOVEMENTS (In - Out) */}
      {activeSection === "Movements" && (
        <div className="overflow-x-auto scrollbar-slim">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Document Name
                </th>
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Person Name
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Date
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Status
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Returnable
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Return Date
                </th>
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Remarks
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-center">
                  Files
                </th>
                <th className="w-12 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 font-medium">
                    No document movements logged. Click &quot;+ Add Movement&quot; to record a document movement.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((doc, idx) => (
                  <tr
                    key={doc.id || idx}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                  >
                    {/* Document Name + Avatar */}
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        {getAvatarBadge(doc.documentName, idx)}
                        <span>{doc.documentName}</span>
                      </div>
                    </td>

                    {/* Person Name + Avatar */}
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300">
                      {doc.personName && doc.personName !== "-" ? (
                        <div className="flex items-center gap-2">
                          {getAvatarBadge(doc.personName, idx + 3)}
                          <span>{doc.personName}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                      {doc.date || "-"}
                    </td>

                    {/* Status */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                          doc.status === "In"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>

                    {/* Returnable */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                      {doc.returnable || "No"}
                    </td>

                    {/* Return Date */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                      {doc.returnDate || "-"}
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {doc.remarks || "-"}
                    </td>

                    {/* Files */}
                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                      {doc.file ? (
                        <span
                          title={doc.file}
                          className="inline-flex items-center justify-center p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-[#31719B] cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Delete action */}
                    <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteDocMovement(doc.id || "", doc.documentName)}
                        title="Delete document record"
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
