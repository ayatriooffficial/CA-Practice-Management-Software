"use client";

import React from "react";
import { RotateCcw, Upload, Plus, FileCheck, Trash2 } from "lucide-react";
import { ServiceDocumentRequestItem } from "@/data/serviceData";

interface ServiceDocumentRequestTabProps {
  documentRequests: ServiceDocumentRequestItem[];
  isAddDocInline: boolean;
  setIsAddDocInline: (open: boolean) => void;
  docTitle: string;
  setDocTitle: (val: string) => void;
  docDescription: string;
  setDocDescription: (val: string) => void;
  handleAddDocumentRequest: () => Promise<void>;
  handleDeleteDocumentRequest: (id: string) => Promise<void>;
  handleSyncToTasks: () => Promise<void>;
  isSyncing: boolean;
  showToast: (msg: string) => void;
}

export const ServiceDocumentRequestTab: React.FC<ServiceDocumentRequestTabProps> = ({
  documentRequests,
  isAddDocInline,
  setIsAddDocInline,
  docTitle,
  setDocTitle,
  docDescription,
  setDocDescription,
  handleAddDocumentRequest,
  handleDeleteDocumentRequest,
  handleSyncToTasks,
  isSyncing,
  showToast,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Cols: Document Requests management */}
      <div className="lg:col-span-2 gap-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-main)]">
              Document Requests ({documentRequests.length})
            </h3>
            <p className="text-xs text-[var(--text-subtle)] mt-0.5">
              Items auto-populate every task created from this service.
            </p>
          </div>

          <div className="flex items-center gap-x-2">
            <button
              type="button"
              onClick={handleSyncToTasks}
              disabled={isSyncing}
              className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>

            <button
              type="button"
              onClick={() => showToast("Document requests imported")}
              className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddDocInline(true)}
              style={{ backgroundColor: "var(--primary)" }}
              className="h-8 px-3.5 text-xs font-semibold rounded-lg text-white hover:opacity-95 transition-all flex items-center gap-x-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add</span>
            </button>
          </div>
        </div>

        {/* Inline Add Input Box matching Screenshot 2 */}
        {isAddDocInline && (
          <div className="p-3.5 rounded-xl border border-[var(--primary)] bg-[var(--brand-soft)] gap-y-2.5 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Document title (e.g. Sales Invoices)"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                autoFocus
                className="h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDocumentRequest()}
                className="h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="flex justify-end gap-x-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddDocInline(false);
                  setDocTitle("");
                  setDocDescription("");
                }}
                className="h-8 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDocumentRequest}
                style={{ backgroundColor: "var(--primary)" }}
                className="h-8 px-4 text-xs font-semibold text-white rounded-lg cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Document requests items list */}
        <div className="rounded-xl border border-[var(--border-main)] divide-y divide-[var(--border-subtle)] overflow-hidden">
          {documentRequests.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No document requests defined for this service. Click "+ Add" to create one.
            </div>
          ) : (
            documentRequests.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[var(--text-main)] block">
                      {item.title}
                    </span>
                    {item.description && (
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-x-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800">
                    Required
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocumentRequest(item.id)}
                    className="text-[var(--text-subtle)] hover:text-[var(--danger)] p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right 1 Col: About Document Requests card matching Screenshot 2 */}
      <div className="p-5 bg-[var(--bg-subtle)] gap-y-3 h-fit rounded-xl border border-[var(--border-main)]">
        <h4 className="text-sm font-bold text-[var(--text-main)]">
          About Document Requests
        </h4>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Document requests specify what files or information clients need to provide when completing a task.
        </p>
        <div className="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-[11px] text-cyan-800 dark:text-cyan-300 leading-relaxed mt-2">
          <span className="font-bold">Sync</span> pushes document request changes to all active tasks linked to this service.
        </div>
      </div>
    </div>
  );
};
