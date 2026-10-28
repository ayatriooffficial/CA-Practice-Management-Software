'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Trash2,
  PenTool,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';
import { SignedDocItem } from '@/services/pdfSignerApi';
import { Client } from '@/data/crmData';
import { DriveFilePickerModal } from './DriveFilePickerModal';

interface DocumentsToSignCardProps {
  documents: SignedDocItem[];
  clients: Client[];
  selectedIds: string[];
  activeDocumentId: string | null;
  isUploading: boolean;
  onSelectDocument: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onUploadFiles: (files: File[]) => void;
  onVerifyUploadFiles?: (files: File[]) => void;
  onVerifyStaged?: (id: string) => void;
  onUpdateClient: (docId: string, clientId: string, clientName: string) => void;
  onRemoveDocument?: (id: string) => void;
  onStageFromDrive?: (docIds: string[]) => Promise<void>;
}

export const DocumentsToSignCard: React.FC<DocumentsToSignCardProps> = ({
  documents,
  clients,
  selectedIds,
  activeDocumentId,
  isUploading,
  onSelectDocument,
  onToggleSelect,
  onToggleSelectAll,
  onUploadFiles,
  onVerifyUploadFiles,
  onVerifyStaged,
  onUpdateClient,
  onRemoveDocument,
  onStageFromDrive,
}) => {
  const [workflowMode, setWorkflowMode] = useState<'sign' | 'verify'>('sign');
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const pdfs = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (pdfs.length > 0) {
        if (workflowMode === 'sign') {
          onUploadFiles(pdfs);
        } else if (onVerifyUploadFiles) {
          onVerifyUploadFiles(pdfs);
        }
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const pdfs = Array.from(e.target.files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (pdfs.length > 0) {
        if (workflowMode === 'sign') {
          onUploadFiles(pdfs);
        } else if (onVerifyUploadFiles) {
          onVerifyUploadFiles(pdfs);
        }
      }
      e.target.value = ''; // Reset input
    }
  };

  const allSelected = documents.length > 0 && selectedIds.length === documents.length;

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-none border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden flex flex-col">
      {/* Smart Workflow Header */}
      <div className="px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-[#0f172a]/30">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {workflowMode === 'sign' ? 'Documents to sign' : 'Verify document signatures'}
            </h2>
            <span className="text-[10.5px] px-2 py-0.5 rounded-none font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {workflowMode === 'sign' ? `${selectedIds.length} selected` : 'Verification mode'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {workflowMode === 'sign'
              ? 'Stage files for cryptographic PAdES digital signing'
              : 'Directly verify cryptographic integrity, detect tampering, and view in verified table'}
          </p>
        </div>

        {/* Workflow Segmented Pill */}
        <div className="inline-flex items-center rounded-none border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a] shrink-0">
          <button
            type="button"
            onClick={() => setWorkflowMode('sign')}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-none text-xs font-semibold transition-all cursor-pointer ${
              workflowMode === 'sign'
                ? 'bg-[#31719B] text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PenTool className="w-3 h-3" />
            <span>Sign / Implement</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkflowMode('verify')}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-none text-xs font-semibold transition-all cursor-pointer ${
              workflowMode === 'verify'
                ? 'bg-[#31719B] text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Verify Signature</span>
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-none p-4 sm:p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
            isDragOver
              ? 'border-[#31719B] bg-blue-50/50 dark:bg-blue-950/30 scale-[0.99]'
              : 'border-[#dde2e8] dark:border-[#334155] hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50/50 dark:bg-gray-800/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div
            className="w-9 h-9 rounded-none flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: 'var(--premium-blue-dark, #31719B)' }}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : workflowMode === 'verify' ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>

          <div className="text-center">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">
              {workflowMode === 'sign' ? (
                <>
                  Drag and drop PDFs here to sign, or{' '}
                  <span className="text-[#31719B] dark:text-blue-400 underline">browse files</span>
                </>
              ) : (
                <>
                  Drag and drop signed PDF to verify cryptographic seal, or{' '}
                  <span className="text-[#31719B] dark:text-blue-400 underline">browse files</span>
                </>
              )}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {workflowMode === 'sign'
                ? 'PDF only · Up to 25MB per document'
                : 'Directly checks SHA-256 byte digest, RSA signature, and detects tampering'}
            </p>

            {workflowMode === 'sign' && onStageFromDrive && (
              <div
                className="mt-2.5 flex items-center justify-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setIsDrivePickerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-none border border-[#31719B] text-[#31719B] hover:bg-[#31719B] hover:text-white dark:hover:bg-[#31719B] transition cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Choose from Cloud Drive</span>
                </button>
              </div>
            )}
          </div>
        </div>


        {/* Staging Table */}
        <div className="overflow-x-auto rounded-none border border-[#dde2e8] dark:border-[#334155] scrollbar-slim">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300 font-semibold"
                style={{ backgroundColor: 'var(--orange-havy-light)' }}
              >
                <th className="w-10 px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    disabled={documents.length === 0}
                    className="w-4 h-4 rounded-none text-[#31719B] accent-[#31719B] cursor-pointer"
                  />
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  Document
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                  Client
                </th>
                <th className="w-16 px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                  Pages
                </th>
                <th className="w-20 px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-right">
                  Size
                </th>
                <th className="w-28 px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                  Status
                </th>
                <th className="w-12 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400 dark:text-gray-500">
                    No documents staged for signing. Drop a PDF above to begin.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isChecked = selectedIds.includes(doc.id || (doc as any)._id);
                  const isActive = activeDocumentId === doc.id || activeDocumentId === (doc as any)._id;

                  return (
                    <tr
                      key={doc.id || (doc as any)._id}
                      onClick={() => onSelectDocument(doc.id || (doc as any)._id)}
                      className={`cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-blue-50/60 dark:bg-blue-950/40'
                          : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/30'
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleSelect(doc.id || (doc as any)._id)}
                          disabled={doc.passwordProtected}
                          className="w-4 h-4 rounded-none text-[#31719B] accent-[#31719B] cursor-pointer"
                        />
                      </td>

                      {/* Document Name */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                          <span
                            className="font-medium text-gray-900 dark:text-white truncate"
                            title={doc.fileName}
                          >
                            {doc.fileName}
                          </span>
                        </div>
                      </td>

                      {/* Client Dropdown Select */}
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-2 border-r border-b border-[#dde2e8] dark:border-[#334155]"
                      >
                        <select
                          value={doc.clientId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = clients.find((c) => c.id === val || (c as any)._id === val);
                            onUpdateClient(
                              doc.id || (doc as any)._id,
                              val,
                              found ? found.name : ''
                            );
                          }}
                          className="w-full text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] focus:border-[#31719B] rounded-none px-2 py-1 text-gray-800 dark:text-gray-200 outline-none"
                        >
                          <option value="">Select client (optional)...</option>
                          {clients.map((c) => (
                            <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>
                              {c.name} {c.fileNo ? `(${c.fileNo})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Pages */}
                      <td className="px-3 py-2 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center text-gray-600 dark:text-gray-300 font-mono">
                        {doc.pageCount || '-'}
                      </td>

                      {/* Size */}
                      <td className="px-3 py-2 border-r border-b border-[#dde2e8] dark:border-[#334155] text-right text-gray-600 dark:text-gray-300 font-mono">
                        {formatFileSize(doc.fileSize)}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                        {doc.status === 'Ready' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ready</span>
                          </span>
                        )}
                        {doc.status === 'Password protected' && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10.5px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            title="Encrypted PDF: Excluded from signing"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Password protected</span>
                          </span>
                        )}
                        {doc.status === 'Failed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10.5px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            <XCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </span>
                        )}
                        {doc.status === 'Signed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10.5px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Signed</span>
                          </span>
                        )}
                      </td>

                      {/* Action: Verify & Delete */}
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-2 border-b border-[#dde2e8] dark:border-[#334155] text-center"
                      >
                        <div className="inline-flex items-center justify-center gap-1">
                          {onVerifyStaged && (
                            <button
                              type="button"
                              onClick={() => onVerifyStaged(doc.id || (doc as any)._id)}
                              className="p-1 rounded-none text-[#31719B] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                              title="Verify this file's signature & transfer to verified table"
                              aria-label="Verify signature"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onRemoveDocument && (
                            <button
                              type="button"
                              onClick={() => onRemoveDocument(doc.id || (doc as any)._id)}
                              className="p-1 rounded-none text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Remove document from staging"
                              aria-label="Remove document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {onStageFromDrive && (
        <DriveFilePickerModal
          isOpen={isDrivePickerOpen}
          onClose={() => setIsDrivePickerOpen(false)}
          onStageDocuments={onStageFromDrive}
        />
      )}
    </div>
  );
};
