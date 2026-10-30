import React, { useState } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { gstFormApi } from "@/services/gstFormApi";

export interface CsvImportCardProps {
  token: string;
  sectionKey: string;
  sectionTitle: string;
  onImportComplete: (rows: any[], mode: "add" | "replace") => void;
  validatorFn: (row: any, index: number) => { valid: boolean; errors: string[] };
  templateFilename?: string;
}

export const CsvImportCard: React.FC<CsvImportCardProps> = ({
  token,
  sectionKey,
  sectionTitle,
  onImportComplete,
  validatorFn,
  templateFilename = "template.csv",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"add" | "replace">("add");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<Array<{ data: any; valid: boolean; errors: string[] }>>([]);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  // Download template directly
  const handleDownloadTemplate = () => {
    const url = gstFormApi.getCsvTemplateUrl(token, sectionKey);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sectionKey}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple CSV parser
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic quote-aware split
      const values: string[] = [];
      let inQuote = false;
      let cur = "";

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          inQuote = !inQuote;
        } else if (char === "," && !inQuote) {
          values.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      values.push(cur.trim());

      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        let val = values[idx] || "";
        val = val.replace(/^["']|["']$/g, "").trim();
        rowObj[h] = val;
      });
      rows.push(rowObj);
    }
    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5 MB limit.");
        return;
      }
      setFile(f);
      processFile(f);
    }
  };

  const processFile = (fileToProcess: File) => {
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rawRows = parseCSVText(text);

        const evaluated = rawRows.map((row, idx) => {
          const res = validatorFn(row, idx + 1);
          return {
            data: row,
            valid: res.valid,
            errors: res.errors,
          };
        });

        setParsedRows(evaluated);
        setHasPreviewed(true);
      } catch (err: any) {
        alert("Failed to parse CSV file: " + err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(fileToProcess);
  };

  const handleImportValid = () => {
    const validRows = parsedRows.filter((r) => r.valid).map((r) => r.data);
    if (validRows.length === 0) {
      alert("No valid rows to import.");
      return;
    }
    onImportComplete(validRows, importMode);
    // Reset state
    setFile(null);
    setParsedRows([]);
    setHasPreviewed(false);
    setIsExpanded(false);
  };

  const handleDownloadErrors = () => {
    const errorRows = parsedRows.filter((r) => !r.valid);
    if (errorRows.length === 0) return;

    const headers = Object.keys(errorRows[0].data).concat(["errors"]);
    let csvContent = headers.join(",") + "\n";

    errorRows.forEach((r) => {
      const values = Object.values(r.data).map((v) => `"${String(v).replace(/"/g, '""')}"`);
      values.push(`"${r.errors.join("; ").replace(/"/g, '""')}"`);
      csvContent += values.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sectionKey}_import_errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedRows.filter((r) => r.valid).length;
  const errorCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] overflow-hidden shadow-card mb-6">
      {/* Toggle Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3.5 bg-gray-50/80 dark:bg-gray-800/40 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 flex items-center justify-between text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <FileSpreadsheet className="w-4 h-4 text-[#31719B]" />
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
            Import CSV for {sectionTitle}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            (Quickly bulk load invoices or records via spreadsheet)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{isExpanded ? "Collapse" : "Expand"}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 border-t border-[#dde2e8] dark:border-[#334155] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#31719B]" />
              <span>Download CSV Template</span>
            </button>

            {/* Mode selection */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500 font-medium">Import Mode:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`mode_${sectionKey}`}
                  checked={importMode === "add"}
                  onChange={() => setImportMode("add")}
                  className="accent-[#31719B]"
                />
                <span className="text-gray-700 dark:text-gray-300">Add to existing records</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`mode_${sectionKey}`}
                  checked={importMode === "replace"}
                  onChange={() => setImportMode("replace")}
                  className="accent-[#31719B]"
                />
                <span className="text-gray-700 dark:text-gray-300 text-red-600 dark:text-red-400 font-medium">
                  Replace all records
                </span>
              </label>
            </div>
          </div>

          {/* Drag & Drop or Browse */}
          {!hasPreviewed ? (
            <div className="border-2 border-dashed border-[#dde2e8] dark:border-[#334155] rounded-xl p-6 text-center hover:border-[#31719B] transition-colors">
              <input
                type="file"
                accept=".csv"
                id={`csv-upload-${sectionKey}`}
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor={`csv-upload-${sectionKey}`}
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#31719B] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#31719B] hover:underline">
                    Click to browse
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400"> or drag and drop your .csv file</span>
                </div>
                <span className="text-[11px] text-gray-400">
                  Standard UTF-8 CSV only · Maximum 5 MB · Up to 10,000 rows
                </span>
              </label>
            </div>
          ) : (
            /* Preview Step */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">
                    File: <span className="font-mono text-gray-900 dark:text-white">{file?.name}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    Total: {parsedRows.length} rows
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Valid: {validCount}
                  </span>
                  {errorCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                      Errors: {errorCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {errorCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadErrors}
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Errors CSV</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setParsedRows([]);
                      setHasPreviewed(false);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
                  >
                    Cancel / Re-upload
                  </button>
                </div>
              </div>

              {/* Rows Preview Table */}
              <div className="max-h-60 overflow-y-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-[#dde2e8] dark:border-[#334155] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Row Data Preview</th>
                      <th className="py-2 px-3">Validation Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                    {parsedRows.slice(0, 15).map((row, idx) => (
                      <tr key={idx} className={row.valid ? "" : "bg-red-50/40 dark:bg-red-950/20"}>
                        <td className="py-2 px-3">
                          {row.valid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Error
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-gray-700 dark:text-gray-300 truncate max-w-xs">
                          {JSON.stringify(row.data).slice(0, 80)}...
                        </td>
                        <td className="py-2 px-3 text-[11px] text-red-600 dark:text-red-400">
                          {row.errors.join("; ") || "Ready to import"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 15 && (
                <p className="text-[11px] text-gray-400 text-center">
                  Showing first 15 of {parsedRows.length} rows...
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleImportValid}
                  disabled={validCount === 0}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: "var(--primary, #31719B)" }}
                >
                  Import {validCount} Valid Row{validCount === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

