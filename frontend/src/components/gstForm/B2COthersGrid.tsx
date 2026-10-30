"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  formatIndianCurrency,
  STATE_OPTIONS,
  TAX_RATES,
} from "./gstFormUtils";
import { ImportBar } from "./ImportBar";

export interface B2CSRow {
  sply_ty: "INTRA" | "INTER";
  pos: string;
  rt: number;
  diff_percent?: boolean;
  txval: number | "";
  iamt?: number | "";
  camt?: number | "";
  samt?: number | "";
  csamt?: number | "";
}

interface B2COthersGridProps {
  token: string;
  supplierStateCode: string;
  rows: B2CSRow[];
  onChange: (rows: B2CSRow[]) => void;
}

export const B2COthersGrid: React.FC<B2COthersGridProps> = ({
  token,
  supplierStateCode,
  rows,
  onChange,
}) => {
  const recalculateTaxes = (row: B2CSRow) => {
    const isInterState = row.pos ? row.pos.substring(0, 2) !== supplierStateCode : false;
    row.sply_ty = isInterState ? "INTER" : "INTRA";
    const tx = typeof row.txval === "number" ? row.txval : 0;
    const rt = Number(row.rt) || 0;
    const expectedTax = Math.round(((tx * rt) / 100) * 100) / 100;

    if (isInterState) {
      row.iamt = expectedTax;
      row.camt = 0;
      row.samt = 0;
    } else {
      row.iamt = 0;
      row.camt = Math.round((expectedTax / 2) * 100) / 100;
      row.samt = Math.round((expectedTax / 2) * 100) / 100;
    }
  };

  const handleUpdate = (idx: number, field: keyof B2CSRow, value: any) => {
    const updated = [...rows];
    const row = { ...updated[idx], [field]: value };
    if (field === "pos" || field === "rt" || field === "txval" || field === "diff_percent") {
      recalculateTaxes(row);
    }
    updated[idx] = row;
    onChange(updated);
  };

  const handleAddRow = () => {
    const supplierState = STATE_OPTIONS.find((s) => s.code === supplierStateCode);
    const newRow: B2CSRow = {
      sply_ty: "INTRA",
      pos: supplierState ? `${supplierState.code}-${supplierState.name}` : "27-Maharashtra",
      rt: 18,
      diff_percent: false,
      txval: "",
      iamt: 0,
      camt: 0,
      samt: 0,
      csamt: 0,
    };
    onChange([...rows, newRow]);
  };

  const handleDelete = (idx: number) => {
    const updated = [...rows];
    updated.splice(idx, 1);
    onChange(updated);
  };

  const handleImport = (importedRows: any[], mode: "add" | "replace") => {
    const formatted: B2CSRow[] = importedRows.map((r) => {
      const row: B2CSRow = {
        sply_ty: "INTRA",
        pos: r.pos || "27-Maharashtra",
        rt: Number(r.rate) || 18,
        diff_percent: r.differential_rate === "Y",
        txval: Number(r.taxable_value) || 0,
        iamt: Number(r.igst) || 0,
        camt: Number(r.cgst) || 0,
        samt: Number(r.sgst) || 0,
        csamt: Number(r.cess) || 0,
      };
      recalculateTaxes(row);
      return row;
    });

    if (mode === "replace") onChange(formatted);
    else onChange([...rows, ...formatted]);
  };

  return (
    <div className="space-y-4">
      {/* Import Bar */}
      <ImportBar
        token={token}
        section="b2cs"
        sectionTitle="B2C (Others)"
        onImportComplete={handleImport}
        canonicalColumns={[
          { key: "pos", label: "Place of Supply", required: true },
          { key: "rate", label: "GST Rate (%)", required: true },
          { key: "taxable_value", label: "Taxable Value", required: true },
          { key: "cess", label: "Cess Amount" },
        ]}
      />

      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#dde2e8] dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold border-b">
              <tr>
                <th className="p-3">Place of Supply</th>
                <th className="p-3">Rate</th>
                <th className="p-3">Taxable Value</th>
                <th className="p-3">Diff Rate (65%)</th>
                <th className="p-3 text-right">Tax (Auto)</th>
                <th className="p-3">Cess</th>
                <th className="p-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
              {rows.map((row, idx) => {
                const tax = (Number(row.iamt) || 0) + (Number(row.camt) || 0) + (Number(row.samt) || 0);

                return (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="p-2.5">
                      <select
                        value={row.pos}
                        onChange={(e) => handleUpdate(idx, "pos", e.target.value)}
                        className="w-48 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent font-sans"
                      >
                        {STATE_OPTIONS.map((st) => (
                          <option key={st.code} value={`${st.code}-${st.name}`}>
                            {st.code}-{st.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2.5">
                      <select
                        value={row.rt}
                        onChange={(e) => handleUpdate(idx, "rt", Number(e.target.value))}
                        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-bold bg-transparent"
                      >
                        {TAX_RATES.map((rt) => (
                          <option key={rt} value={rt}>
                            {rt}%
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2.5">
                      <input
                        type="number"
                        placeholder="Taxable Value"
                        value={row.txval}
                        onChange={(e) =>
                          handleUpdate(
                            idx,
                            "txval",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="w-32 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-mono text-right bg-transparent font-bold"
                      />
                    </td>

                    <td className="p-2.5">
                      <label className="flex items-center gap-1.5 cursor-pointer font-sans text-[11px]">
                        <input
                          type="checkbox"
                          checked={Boolean(row.diff_percent)}
                          onChange={(e) => handleUpdate(idx, "diff_percent", e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-[#31719B]"
                        />
                        65% Rate
                      </label>
                    </td>

                    <td className="p-2.5 text-right font-bold text-gray-800 dark:text-gray-200">
                      ₹{formatIndianCurrency(tax)}
                    </td>

                    <td className="p-2.5">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={row.csamt || ""}
                        onChange={(e) =>
                          handleUpdate(
                            idx,
                            "csamt",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="w-20 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-mono bg-transparent"
                      />
                    </td>

                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(idx)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-xs text-gray-500 font-sans">
                    No state/rate records yet. Click "+ Add state/rate" below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 flex justify-between items-center">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#31719B] text-white hover:bg-[#275a7c] transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add state/rate row
          </button>
        </div>
      </div>
    </div>
  );
};

