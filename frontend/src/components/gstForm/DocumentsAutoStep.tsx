"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { NATURE_OF_DOCUMENTS } from "./gstFormUtils";

export interface DocItem {
  num: number;
  from: string;
  to: string;
  totnum: number | "";
  cancld: number | "";
  net_issued: number | "";
  detectedTo?: string;
  missingCount?: number;
}

export interface NatureSection {
  doc_num: number;
  name: string;
  docs: DocItem[];
}

interface DocumentsAutoStepProps {
  docIssue: NatureSection[];
  onChange: (docIssue: NatureSection[]) => void;
  onAutoDerive?: () => Promise<void>;
  isDeriving?: boolean;
}

export const DocumentsAutoStep: React.FC<DocumentsAutoStepProps> = ({
  docIssue,
  onChange,
  onAutoDerive,
  isDeriving = false,
}) => {
  // Update a single document row
  const handleUpdateDoc = (
    natureIndex: number,
    docIndex: number,
    field: keyof DocItem,
    value: any
  ) => {
    const updated = [...docIssue];
    const nature = { ...updated[natureIndex] };
    const docs = [...nature.docs];
    const doc = { ...docs[docIndex], [field]: value };

    // Auto-compute Totnum and Net Issued
    if (field === "from" || field === "to" || field === "cancld") {
      const matchFrom = String(doc.from || "").match(/^(.*?)(\d+)$/);
      const matchTo = String(doc.to || "").match(/^(.*?)(\d+)$/);

      if (matchFrom && matchTo && matchFrom[1] === matchTo[1]) {
        const fromNum = parseInt(matchFrom[2], 10);
        const toNum = parseInt(matchTo[2], 10);
        if (toNum >= fromNum) {
          doc.totnum = toNum - fromNum + 1;
        }
      }

      const tot = typeof doc.totnum === "number" ? doc.totnum : 0;
      const canc = typeof doc.cancld === "number" ? doc.cancld : 0;
      doc.net_issued = Math.max(0, tot - canc);
    }

    docs[docIndex] = doc;
    nature.docs = docs;
    updated[natureIndex] = nature;
    onChange(updated);
  };

  // Add document row to nature
  const handleAddDoc = (natureIndex: number) => {
    const updated = [...docIssue];
    const nature = { ...updated[natureIndex] };
    const newDoc: DocItem = {
      num: nature.docs.length + 1,
      from: "",
      to: "",
      totnum: "",
      cancld: 0,
      net_issued: "",
    };
    nature.docs = [...nature.docs, newDoc];
    updated[natureIndex] = nature;
    onChange(updated);
  };

  // Delete document row
  const handleDeleteDoc = (natureIndex: number, docIndex: number) => {
    const updated = [...docIssue];
    const nature = { ...updated[natureIndex] };
    nature.docs = nature.docs.filter((_, idx) => idx !== docIndex);
    updated[natureIndex] = nature;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              Auto-Detected Document Series (Table 13)
            </h3>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              We detected your invoice series from what you entered. Please confirm:
            </p>
          </div>
        </div>

        {onAutoDerive && (
          <button
            type="button"
            onClick={onAutoDerive}
            disabled={isDeriving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isDeriving ? "Re-detecting..." : "Re-detect series"}
          </button>
        )}
      </div>

      {/* 12 Nature Blocks */}
      <div className="space-y-4">
        {docIssue.map((nature, natIdx) => {
          const isPrimary = nature.doc_num === 1 || nature.doc_num === 4 || nature.doc_num === 5;
          const hasDocs = nature.docs.length > 0;

          return (
            <div
              key={nature.doc_num}
              className={`rounded-2xl border p-4 transition-all ${
                isPrimary || hasDocs
                  ? "bg-white dark:bg-[#1e293b] border-[#dde2e8] dark:border-[#334155] shadow-sm"
                  : "bg-gray-50/50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 opacity-80"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#31719B]/10 text-[#31719B] dark:text-[#64B5D6] font-bold text-xs flex items-center justify-center">
                    {nature.doc_num}
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {nature.name}
                  </span>
                  {isPrimary && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                      Auto-detected
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddDoc(natIdx)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#31719B] dark:text-[#64B5D6] hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add series row
                </button>
              </div>

              {nature.docs.length === 0 ? (
                <div className="text-[11px] text-gray-400 italic py-2">
                  No series entered for this nature. Click "+ Add series row" if documents were issued.
                </div>
              ) : (
                <div className="space-y-3">
                  {nature.docs.map((doc, docIdx) => (
                    <div
                      key={docIdx}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 space-y-2"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono items-center">
                        <div>
                          <label className="text-[10px] font-sans text-gray-500 block">
                            From Serial
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. INV-001"
                            value={doc.from}
                            onChange={(e) =>
                              handleUpdateDoc(natIdx, docIdx, "from", e.target.value)
                            }
                            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-sans text-gray-500 block">
                            To Serial (Last)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. INV-050"
                            value={doc.to}
                            onChange={(e) =>
                              handleUpdateDoc(natIdx, docIdx, "to", e.target.value)
                            }
                            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-sans text-gray-500 block">
                            Total Issued
                          </label>
                          <input
                            type="number"
                            value={doc.totnum}
                            onChange={(e) =>
                              handleUpdateDoc(
                                natIdx,
                                docIdx,
                                "totnum",
                                e.target.value === "" ? "" : Number(e.target.value)
                              )
                            }
                            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-sans text-gray-500 block">
                            Cancelled
                          </label>
                          <input
                            type="number"
                            value={doc.cancld}
                            onChange={(e) =>
                              handleUpdateDoc(
                                natIdx,
                                docIdx,
                                "cancld",
                                e.target.value === "" ? "" : Number(e.target.value)
                              )
                            }
                            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-sans text-gray-500 block">
                            Net Issued
                          </label>
                          <input
                            type="number"
                            readOnly
                            value={doc.net_issued}
                            className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 font-bold text-gray-800 dark:text-gray-200"
                          />
                        </div>

                        <div className="flex justify-end pt-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(natIdx, docIdx)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Gap Hint (Section 6.6.4) */}
                      {doc.missingCount && doc.missingCount > 0 ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {doc.missingCount} numbers in this range were not found in the data you entered;
                            these may be retail/B2C bills or cancelled invoices.
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

