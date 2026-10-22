"use client";

import React, { useRef, useState } from "react";
import {
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { TaskDocumentRequestItem } from "@/data/taskData";

interface TaskDocumentRequestTabProps {
  documentRequests: TaskDocumentRequestItem[];
  isAddDocInline: boolean;
  setIsAddDocInline: (open: boolean) => void;
  docTitle: string;
  setDocTitle: (val: string) => void;
  handleAddDocRequest: () => Promise<void>;
  handleToggleDocRequest: (docId: string) => Promise<void>;
  handleDeleteDocRequest: (docId: string) => Promise<void>;
  handleUploadDocFile?: (docId: string, file: File, docTitle?: string) => Promise<void>;
  handleUploadGeneralFile?: (file: File, title: string) => Promise<void>;
  uploadingDocId?: string | null;
  uploadError?: string | null;
}

export const TaskDocumentRequestTab: React.FC<TaskDocumentRequestTabProps> = ({
  documentRequests,
  isAddDocInline,
  setIsAddDocInline,
  docTitle,
  setDocTitle,
  handleAddDocRequest,
  handleToggleDocRequest,
  handleDeleteDocRequest,
  handleUploadDocFile,
  handleUploadGeneralFile,
  uploadingDocId,
  uploadError,
}) => {
  const generalFileInputRef = useRef<HTMLInputElement>(null);
  const [generalFileTitle, setGeneralFileTitle] = useState("");
  const [isGeneralUploadOpen, setIsGeneralUploadOpen] = useState(false);
  const [selectedGeneralFile, setSelectedGeneralFile] = useState<File | null>(null);
  const [isUploadingGeneral, setIsUploadingGeneral] = useState(false);

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGeneralFile || !handleUploadGeneralFile) return;
    try {
      setIsUploadingGeneral(true);
      await handleUploadGeneralFile(
        selectedGeneralFile,
        generalFileTitle.trim() || selectedGeneralFile.name
      );
      setSelectedGeneralFile(null);
      setGeneralFileTitle("");
      setIsGeneralUploadOpen(false);
    } catch {
      // Handled by parent
    } finally {
      setIsUploadingGeneral(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
        <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center space-x-1.5">
          <FolderOpen className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <span>Required Documents ({documentRequests?.length || 0})</span>
        </h3>
        <div className="flex items-center space-x-2">
          {handleUploadGeneralFile && (
            <button
              type="button"
              onClick={() => setIsGeneralUploadOpen(!isGeneralUploadOpen)}
              className="text-xs font-semibold px-2 py-1 rounded bg-[var(--bg-subtle)] border border-[var(--border-main)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>Upload New File</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsAddDocInline(true)}
            style={{ color: "var(--primary)" }}
            className="text-xs font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Request</span>
          </button>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Google Drive Upload Failed</p>
            <p className="text-[11px] mt-0.5">{uploadError}</p>
            <p className="text-[10px] text-red-500 mt-1">Note: Local storage fallback is disabled. File was not stored locally.</p>
          </div>
        </div>
      )}

      {/* General file upload inline form */}
      {isGeneralUploadOpen && handleUploadGeneralFile && (
        <form
          onSubmit={handleGeneralSubmit}
          className="p-3 bg-[var(--bg-subtle)] border border-blue-200 dark:border-blue-800/50 rounded-lg space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-main)] flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>Upload Document to Google Drive</span>
            </span>
            <button
              type="button"
              onClick={() => setIsGeneralUploadOpen(false)}
              className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-subtle)] font-medium block mb-1">
                Document Title / Name
              </label>
              <input
                type="text"
                placeholder="e.g. Bank Statement Q3 / PAN Card"
                value={generalFileTitle}
                onChange={(e) => setGeneralFileTitle(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-subtle)] font-medium block mb-1">
                Select File
              </label>
              <input
                ref={generalFileInputRef}
                type="file"
                required
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedGeneralFile(e.target.files[0]);
                    if (!generalFileTitle) {
                      setGeneralFileTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }
                }}
                className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--primary)] file:text-white cursor-pointer"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!selectedGeneralFile || isUploadingGeneral}
              style={{ backgroundColor: "var(--primary)" }}
              className="px-3 py-1.5 text-xs font-semibold text-white rounded hover:opacity-90 disabled:opacity-50 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              {isUploadingGeneral ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading directly to Drive...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Sync to Drive</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Add Document Request inline form */}
      {isAddDocInline && (
        <div className="flex items-center space-x-2 p-2 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg">
          <input
            type="text"
            placeholder="Enter document title (e.g. Form 16, Bank Statement)..."
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddDocRequest()}
            autoFocus
            className="flex-1 text-xs px-2.5 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <button
            type="button"
            onClick={handleAddDocRequest}
            style={{ backgroundColor: "var(--primary)" }}
            className="px-3 py-1.5 text-xs font-medium text-white rounded hover:opacity-90 transition-opacity cursor-pointer"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddDocInline(false);
              setDocTitle("");
            }}
            className="px-2.5 py-1.5 text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Document Requests List */}
      <div className="space-y-2">
        {documentRequests?.map((doc) => {
          const isReceived = doc.status === "Received";
          const isUploadingThis = uploadingDocId === doc.id;
          const inputId = `file-input-${doc.id}`;

          return (
            <div
              key={doc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] hover:border-[var(--primary)] transition-all gap-2 group"
            >
              <div className="text-xs flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--text-subtle)] shrink-0" />
                  <p className="font-semibold text-[var(--text-main)] truncate">
                    {doc.title}
                  </p>
                  {doc.isMandatory && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-bold uppercase tracking-wider shrink-0">
                      Required
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 mt-1 text-[11px] text-[var(--text-subtle)]">
                  <span>
                    Status:{" "}
                    <strong
                      className={
                        isReceived ? "text-emerald-500" : "text-amber-500"
                      }
                    >
                      {doc.status}
                    </strong>
                  </span>

                  {doc.receivedAt && (
                    <span>
                      Received:{" "}
                      <strong>
                        {new Date(doc.receivedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </strong>
                    </span>
                  )}

                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 font-semibold text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View in Google Drive</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Upload File to Drive Button */}
                {handleUploadDocFile && (
                  <div>
                    <input
                      id={inputId}
                      type="file"
                      className="hidden"
                      disabled={isUploadingThis}
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          await handleUploadDocFile(doc.id, file, doc.title);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploadingThis}
                      onClick={() => document.getElementById(inputId)?.click()}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border flex items-center space-x-1 cursor-pointer transition-colors ${
                        isReceived
                          ? "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)]"
                          : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                      }`}
                      title={isReceived ? "Re-upload to Google Drive" : "Upload file to Google Drive"}
                    >
                      {isUploadingThis ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>{isReceived ? "Re-upload" : "Upload"}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Toggle status */}
                <button
                  type="button"
                  onClick={() => handleToggleDocRequest(doc.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer flex items-center space-x-1 ${
                    isReceived
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200"
                      : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-main)]"
                  }`}
                >
                  {isReceived && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  <span>{isReceived ? "Received" : "Mark Received"}</span>
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteDocRequest(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-subtle)] hover:text-red-500 transition-opacity cursor-pointer"
                  title="Delete document request"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {(!documentRequests || documentRequests.length === 0) && (
          <div className="text-center py-6 text-xs text-[var(--text-subtle)] bg-[var(--bg-subtle)] rounded-lg border border-dashed border-[var(--border-main)]">
            <FolderOpen className="w-6 h-6 mx-auto mb-1 text-[var(--text-placeholder)]" />
            <p className="font-semibold text-[var(--text-muted)]">No document requests yet</p>
            <p className="text-[11px] mt-0.5">Click &quot;Add Request&quot; or &quot;Upload New File&quot; to attach compliance files.</p>
          </div>
        )}
      </div>
    </div>
  );
};
