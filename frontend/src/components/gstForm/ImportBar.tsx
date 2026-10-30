"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  ClipboardPaste,
  Check,
  AlertCircle,
  X,
  ArrowRight,
  Settings2,
  Loader2,
  Edit2,
  Trash2,
} from "lucide-react";
import { gstFormApi } from "@/services/gstFormApi";
import { formatIndianCurrency } from "./gstFormUtils";

interface ImportBarProps {
  token: string;
  section: string;
  sectionTitle: string;
  onImportComplete: (rows: any[], mode: "add" | "replace") => void;
  canonicalColumns?: Array<{ key: string; label: string; required?: boolean }>;
}

export const ImportBar: React.FC<ImportBarProps> = ({
  token,
  section,
  sectionTitle,
  onImportComplete,
  canonicalColumns = [
    { key: "recipient_gstin", label: "Recipient GSTIN", required: true },
    { key: "recipient_name", label: "Recipient Name" },
    { key: "invoice_no", label: "Invoice Number", required: true },
    { key: "invoice_date", label: "Invoice Date (DD/MM/YYYY)", required: true },
    { key: "invoice_value", label: "Invoice Value", required: true },
    { key: "pos", label: "Place of Supply" },
    { key: "rate", label: "GST Rate (%)", required: true },
    { key: "taxable_value", label: "Taxable Value", required: true },
    { key: "igst", label: "IGST Amount" },
    { key: "cgst", label: "CGST Amount" },
    { key: "sgst", label: "SGST Amount" },
    { key: "cess", label: "Cess Amount" },
  ],
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [importMode, setImportMode] = useState<"add" | "replace">("add");

  // Modals & States
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const [showMappingModal, setShowMappingModal] = useState(false);
  const [uploadedHeaders, setUploadedHeaders] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [rawFileContent, setRawFileContent] = useState<string>("");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [rememberMapping, setRememberMapping] = useState(true);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<{
    batchId: string;
    totalRows: number;
    validCount: number;
    errorCount: number;
    rows: any[];
  } | null>(null);

  // 1. Download Canonical Template
  const handleDownloadTemplate = () => {
    const url = gstFormApi.getCsvTemplateUrl(token, section);
    window.open(url, "_blank");
  };

  // 2. File Upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File exceeds maximum allowed size of 5 MB");
      return;
    }

    setIsProcessing(true);
    setCurrentFile(file);

    try {
      // Read headers from file
      let headers: string[] = [];
      let fileContent = "";

      if (file.name.endsWith(".csv")) {
        fileContent = await file.text();
        setRawFileContent(fileContent);
        const firstLine = fileContent.split(/\r?\n/)[0];
        headers = firstLine.split(",").map((h) => h.replace(/["\r]/g, "").trim());
      } else {
        // XLSX headers
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (json.length > 0) {
          headers = (json[0] || []).map((h: any) => String(h || "").trim());
        }
      }

      setUploadedHeaders(headers);

      // Smart Mapping API
      const mapRes = await gstFormApi.smartMapHeaders(token, section, headers);
      setColumnMapping(mapRes.mapping || {});
      setDateFormat(mapRes.dateFormat || "DD/MM/YYYY");

      if (mapRes.isSaved) {
        // Mapping was saved previously: proceed directly to preview
        await executePreview(file, fileContent, mapRes.mapping, mapRes.dateFormat);
      } else {
        // Show mapping modal
        setShowMappingModal(true);
      }
    } catch (err: any) {
      alert(err.message || "Failed to process file");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 3. Paste from Excel handler
  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    setShowPasteModal(false);

    try {
      const lines = pastedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const firstLine = lines[0].split("\t");
      const headers = firstLine.map((h) => h.trim());

      setUploadedHeaders(headers);
      setRawFileContent(pastedText);

      const mapRes = await gstFormApi.smartMapHeaders(token, section, headers);
      setColumnMapping(mapRes.mapping || {});
      setDateFormat(mapRes.dateFormat || "DD/MM/YYYY");

      if (mapRes.isSaved) {
        await executePreview(null, pastedText, mapRes.mapping, mapRes.dateFormat, "paste");
      } else {
        setShowMappingModal(true);
      }
    } catch (err: any) {
      alert(err.message || "Failed to parse pasted data");
    } finally {
      setIsProcessing(false);
      setPastedText("");
    }
  };

  // 4. Execute Preview Call
  const executePreview = async (
    file: File | null,
    fileContent: string,
    mapping: Record<string, string>,
    df: string,
    forcedType?: string
  ) => {
    setIsProcessing(true);
    try {
      if (rememberMapping) {
        await gstFormApi.saveImportMapping(token, section, mapping, df);
      }

      const res = await gstFormApi.previewImport(token, section, {
        file: file || undefined,
        fileContent: fileContent || undefined,
        fileType: forcedType || (file?.name.endsWith(".xlsx") ? "xlsx" : "csv"),
        fileName: file?.name || "pasted_data",
        mapping,
        dateFormat: df,
      });

      setPreviewData(res);
      setShowMappingModal(false);
      setShowPreviewModal(true);
    } catch (err: any) {
      alert(err.message || "Failed to preview import");
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Commit Valid Rows
  const handleCommitImport = () => {
    if (!previewData) return;
    const validRows = previewData.rows.filter((r) => r._isValid);
    if (validRows.length === 0) {
      alert("No valid rows to import.");
      return;
    }

    onImportComplete(validRows, importMode);
    setShowPreviewModal(false);
    setPreviewData(null);
  };

  // Inline Cell Edit in Preview
  const handlePreviewCellChange = (rowIdx: number, field: string, value: any) => {
    if (!previewData) return;
    const newRows = [...previewData.rows];
    newRows[rowIdx] = {
      ...newRows[rowIdx],
      [field]: value,
      _isValid: true,
      _errors: [],
    };
    setPreviewData({
      ...previewData,
      rows: newRows,
      validCount: newRows.filter((r) => r._isValid).length,
      errorCount: newRows.filter((r) => !r._isValid).length,
    });
  };

  return (
    <>
      {/* Import Action Bar */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl p-3 border border-[#dde2e8] dark:border-[#334155] shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-[#31719B] dark:text-[#64B5D6]" />
            Bulk Import:
          </span>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Upload CSV / Excel
          </button>

          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Paste from Excel
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Add / Replace Mode Toggle */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            <span>Mode:</span>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as any)}
              className="bg-transparent border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200"
            >
              <option value="add">Add to existing</option>
              <option value="replace">Replace table</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1 text-xs font-semibold text-[#31719B] dark:text-[#64B5D6] hover:underline"
          >
            <Download className="w-3 h-3" /> Template
          </button>
        </div>
      </div>

      {/* Paste from Excel Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-[#31719B]" /> Paste from Excel
              </h3>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Copy rows from your spreadsheet (including header row) and paste them below:
            </p>
            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste tab-separated cells from Excel here..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={!pastedText.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#31719B] hover:bg-[#275a7c] rounded-lg shadow-sm"
              >
                Next: Map Columns →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Column Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-[#31719B]" /> Smart Column Mapping
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Match your file columns to the official {sectionTitle} fields:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mapping Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
              <div className="grid grid-cols-2 p-3 bg-gray-50 dark:bg-gray-800/50 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                <span>Your File Column</span>
                <span>Our Canonical Field</span>
              </div>
              {uploadedHeaders.map((hdr) => {
                const mappedField = columnMapping[hdr] || "";
                return (
                  <div key={hdr} className="grid grid-cols-2 p-3 items-center gap-3">
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 font-mono truncate">
                      {hdr}
                    </span>
                    <select
                      value={mappedField}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [hdr]: e.target.value,
                        }))
                      }
                      className="text-xs rounded-lg border border-gray-300 dark:border-gray-700 px-2.5 py-1.5 bg-white dark:bg-gray-800 font-semibold"
                    >
                      <option value="">-- Ignore Column --</option>
                      {canonicalColumns.map((col) => (
                        <option key={col.key} value={col.key}>
                          {col.label} {col.required ? "*" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Date Format & Save Setting */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-600 dark:text-gray-400">Date Format:</span>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="rounded border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMapping}
                  onChange={(e) => setRememberMapping(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#31719B]"
                />
                Remember this mapping for next month
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  executePreview(currentFile, rawFileContent, columnMapping, dateFormat)
                }
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#31719B] hover:bg-[#275a7c] rounded-lg shadow-sm flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Preview Rows →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal with Inline Fix */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Import Preview: {sectionTitle}
                </h3>
                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className="font-semibold text-gray-600 dark:text-gray-400">
                    Total: {previewData.totalRows}
                  </span>
                  <span className="font-bold text-emerald-600">
                    Valid: {previewData.validCount}
                  </span>
                  {previewData.errorCount > 0 && (
                    <span className="font-bold text-red-600">
                      Errors: {previewData.errorCount}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editable Preview Table */}
            <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-[11px] font-bold text-gray-600 dark:text-gray-300 border-b">
                  <tr>
                    <th className="p-2.5 w-12">#</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Recipient / POS</th>
                    <th className="p-2.5">Invoice / Note No</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Rate</th>
                    <th className="p-2.5">Taxable Val</th>
                    <th className="p-2.5">Total Val</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                  {previewData.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row._isValid ? "hover:bg-gray-50/50" : "bg-red-50/30"}
                    >
                      <td className="p-2 text-gray-400 text-[10px]">{row._rowNum}</td>
                      <td className="p-2">
                        {row._isValid ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                            Valid
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-bold" title={row._errors?.join(", ")}>
                            Error
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.recipient_gstin || row.pos || ""}
                          onChange={(e) =>
                            handlePreviewCellChange(idx, "recipient_gstin", e.target.value)
                          }
                          className="w-32 px-1.5 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-transparent"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.invoice_no || row.note_no || ""}
                          onChange={(e) =>
                            handlePreviewCellChange(idx, "invoice_no", e.target.value)
                          }
                          className="w-28 px-1.5 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-transparent"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.invoice_date || row.note_date || ""}
                          onChange={(e) =>
                            handlePreviewCellChange(idx, "invoice_date", e.target.value)
                          }
                          className="w-24 px-1.5 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-transparent"
                        />
                      </td>
                      <td className="p-2">{row.rate}%</td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={row.taxable_value || ""}
                          onChange={(e) =>
                            handlePreviewCellChange(idx, "taxable_value", e.target.value)
                          }
                          className="w-24 px-1.5 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-transparent"
                        />
                      </td>
                      <td className="p-2 font-bold text-gray-900 dark:text-white">
                        ₹{formatIndianCurrency(row.invoice_value || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500">
                Mode: <strong className="capitalize">{importMode}</strong> (
                {importMode === "add" ? "append to table" : "replace entire table"})
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={previewData.validCount === 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#31719B] hover:bg-[#275a7c] rounded-lg shadow-sm disabled:opacity-50"
                >
                  Import {previewData.validCount} Valid Rows →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

