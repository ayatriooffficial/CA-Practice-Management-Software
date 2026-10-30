"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Search,
  MessageSquare,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";
import {
  formatIndianCurrency,
  STATE_OPTIONS,
  TAX_RATES,
  UQC_OPTIONS,
  validateGstin,
} from "./gstFormUtils";
import { gstFormApi } from "@/services/gstFormApi";
import { ImportBar } from "./ImportBar";

export interface RateLine {
  rt: number;
  txval: number | "";
  iamt?: number | "";
  camt?: number | "";
  samt?: number | "";
  csamt?: number | "";
  hsn?: string;
  uqc?: string;
  qty?: number | "";
  taxOverridden?: boolean;
}

export interface GridInvoiceRow {
  id: string;
  // B2B / CDN fields
  ctin?: string; // Recipient GSTIN
  cname?: string; // Recipient Name
  // B2CL / CDNUR fields
  type?: string; // B2CL / EXPWP / EXPWOP
  // Common
  inum: string;
  idt: string;
  val: number | "";
  pos: string;
  // CDN fields
  nt_ty?: "C" | "D";
  nt_num?: string;
  nt_dt?: string;
  against_invoice?: string;
  // Rare options (Detail Drawer)
  inv_type?: "R" | "DE" | "SEWP" | "SEWOP" | "CBW";
  rchrg?: boolean;
  diff_percent?: boolean;
  irn?: string;
  irngendate?: string;
  ca_note?: string;
  // Rates
  items: RateLine[];
  // Source
  source?: string;
}

interface OneLineInvoiceGridProps {
  token: string;
  section: "b2b" | "b2cl" | "cdnr" | "cdnur";
  sectionTitle: string;
  supplierStateCode: string;
  returnPeriod: string;
  turnoverSlab: string;
  invoices: GridInvoiceRow[];
  onChange: (invoices: GridInvoiceRow[]) => void;
  stickyDefaults?: {
    lastDate?: string;
    lastPos?: string;
    lastRate?: number;
  };
  onUpdateStickyDefaults?: (defs: any) => void;
}

export const OneLineInvoiceGrid: React.FC<OneLineInvoiceGridProps> = ({
  token,
  section,
  sectionTitle,
  supplierStateCode,
  returnPeriod,
  turnoverSlab,
  invoices,
  onChange,
  stickyDefaults,
  onUpdateStickyDefaults,
}) => {
  const isB2B = section === "b2b";
  const isB2CL = section === "b2cl";
  const isCdnr = section === "cdnr";
  const isCdnur = section === "cdnur";
  const isCdn = isCdnr || isCdnur;

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail Drawer state
  const [drawerRowIndex, setDrawerRowIndex] = useState<number | null>(null);

  // Recipient search autocomplete state per row
  const [activeSearchRow, setActiveSearchRow] = useState<number | null>(null);
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [isSearchingRecipient, setIsSearchingRecipient] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Default initial date from return period (e.g. "01/10/2026")
  const defaultDate = useMemo(() => {
    if (stickyDefaults?.lastDate) return stickyDefaults.lastDate;
    if (returnPeriod && returnPeriod.length === 6) {
      const mm = returnPeriod.substring(0, 2);
      const yyyy = returnPeriod.substring(2);
      return `01/${mm}/${yyyy}`;
    }
    return "01/10/2026";
  }, [returnPeriod, stickyDefaults]);

  // Default POS
  const defaultPos = useMemo(() => {
    if (isB2CL) {
      // Must differ from supplier state
      const otherState = STATE_OPTIONS.find((s) => s.code !== supplierStateCode);
      return otherState ? `${otherState.code}-${otherState.name}` : "29-Karnataka";
    }
    if (stickyDefaults?.lastPos) return stickyDefaults.lastPos;
    const st = STATE_OPTIONS.find((s) => s.code === supplierStateCode);
    return st ? `${st.code}-${st.name}` : "27-Maharashtra";
  }, [supplierStateCode, stickyDefaults, isB2CL]);

  // Handle Recipient Autocomplete Search
  const handleRecipientInput = (rowIdx: number, text: string) => {
    const updated = [...invoices];
    const upper = text.toUpperCase();
    const row = {
      ...updated[rowIdx],
      ctin: upper,
      cname: updated[rowIdx]?.cname?.trim() ? updated[rowIdx].cname : (upper.length >= 2 ? `Recipient (${upper})` : ""),
    };
    updated[rowIdx] = row;
    onChange(updated);
    setActiveSearchRow(rowIdx);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!text || text.trim().length < 2) {
      setRecipientResults([]);
      return;
    }

    setIsSearchingRecipient(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await gstFormApi.searchRecipients(token, text.trim());
        setRecipientResults(results);
      } catch (err) {
        console.error("Recipient search error:", err);
      } finally {
        setIsSearchingRecipient(false);
      }
    }, 200);
  };

  // Select Recipient from Autocomplete
  const handleSelectRecipient = (rowIdx: number, rec: any) => {
    const updated = [...invoices];
    const row = { ...updated[rowIdx] };
    row.ctin = rec.gstin;
    row.cname = rec.name;

    // Carry-Forward Rule 1: POS = Recipient State
    const stCode = rec.gstin.substring(0, 2);
    const stInfo = STATE_OPTIONS.find((s) => s.code === stCode);
    if (stInfo) {
      row.pos = `${stCode}-${stInfo.name}`;
    }

    // Auto calculate tax type
    recalculateRowTaxes(row);
    updated[rowIdx] = row;
    onChange(updated);
    setActiveSearchRow(null);
    setRecipientResults([]);
  };

  // Recalculate row taxes & invoice total
  const recalculateRowTaxes = (row: GridInvoiceRow) => {
    const isInterState = row.pos ? row.pos.substring(0, 2) !== supplierStateCode : false;
    let totalTaxable = 0;
    let totalTax = 0;

    row.items.forEach((it) => {
      const tx = typeof it.txval === "number" ? it.txval : 0;
      const rt = Number(it.rt) || 0;
      totalTaxable += tx;

      if (!it.taxOverridden) {
        const expectedTax = Math.round(((tx * rt) / 100) * 100) / 100;
        if (isInterState || row.inv_type === "DE" || row.inv_type === "SEWP" || row.inv_type === "SEWOP") {
          it.iamt = expectedTax;
          it.camt = 0;
          it.samt = 0;
        } else {
          it.iamt = 0;
          it.camt = Math.round((expectedTax / 2) * 100) / 100;
          it.samt = Math.round((expectedTax / 2) * 100) / 100;
        }
      }

      totalTax += (Number(it.iamt) || 0) + (Number(it.camt) || 0) + (Number(it.samt) || 0) + (Number(it.csamt) || 0);
    });

    row.val = Math.round((totalTaxable + totalTax) * 100) / 100;
  };

  // Update specific field on invoice
  const updateInvoiceField = (rowIdx: number, field: keyof GridInvoiceRow, value: any) => {
    const updated = [...invoices];
    const row = { ...updated[rowIdx], [field]: value };
    if (field === "pos" || field === "inv_type") {
      recalculateRowTaxes(row);
    }
    updated[rowIdx] = row;
    onChange(updated);

    // Save sticky defaults
    if (field === "idt" && onUpdateStickyDefaults) {
      onUpdateStickyDefaults({ lastDate: value });
    }
    if (field === "pos" && onUpdateStickyDefaults) {
      onUpdateStickyDefaults({ lastPos: value });
    }
  };

  // Update specific rate line item
  const updateRateItem = (rowIdx: number, itemIdx: number, field: keyof RateLine, value: any) => {
    const updated = [...invoices];
    const row = { ...updated[rowIdx] };
    const items = [...row.items];
    items[itemIdx] = { ...items[itemIdx], [field]: value };
    row.items = items;
    recalculateRowTaxes(row);
    updated[rowIdx] = row;
    onChange(updated);

    if (field === "rt" && onUpdateStickyDefaults) {
      onUpdateStickyDefaults({ lastRate: Number(value) });
    }
  };

  // Add extra rate line chip
  const handleAddRateLine = (rowIdx: number) => {
    const updated = [...invoices];
    const row = { ...updated[rowIdx] };
    row.items.push({
      rt: stickyDefaults?.lastRate || 18,
      txval: "",
      iamt: 0,
      camt: 0,
      samt: 0,
      csamt: 0,
      uqc: "NOS",
    });
    recalculateRowTaxes(row);
    updated[rowIdx] = row;
    onChange(updated);
  };

  // Remove rate line
  const handleRemoveRateLine = (rowIdx: number, itemIdx: number) => {
    const updated = [...invoices];
    const row = { ...updated[rowIdx] };
    if (row.items.length <= 1) return;
    row.items.splice(itemIdx, 1);
    recalculateRowTaxes(row);
    updated[rowIdx] = row;
    onChange(updated);
  };

  // Add new empty row with sticky defaults (Carry-Forward Rules 3, 4, 5)
  const handleAddNewRow = () => {
    const lastRow = invoices[invoices.length - 1];
    let nextInum = "";

    if (lastRow?.inum) {
      const match = String(lastRow.inum).match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const nextNum = parseInt(match[2], 10) + 1;
        nextInum = prefix + String(nextNum).padStart(match[2].length, "0");
      }
    }

    const newRow: GridInvoiceRow = {
      id: "inv-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      ctin: isB2B || isCdnr ? "" : undefined,
      cname: "",
      type: isB2CL || isCdnur ? "B2CL" : undefined,
      inum: nextInum || (isCdn ? "CN-001" : "INV-001"),
      idt: lastRow?.idt || defaultDate,
      val: "",
      pos: lastRow?.pos || defaultPos,
      nt_ty: isCdn ? "C" : undefined,
      nt_num: isCdn ? (nextInum || "CN-001") : undefined,
      nt_dt: isCdn ? (lastRow?.idt || defaultDate) : undefined,
      items: [
        {
          rt: stickyDefaults?.lastRate || 18,
          txval: "",
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
          uqc: "NOS",
        },
      ],
    };

    onChange([...invoices, newRow]);
  };

  // Delete Single Row
  const handleDeleteRow = (rowIdx: number) => {
    const updated = [...invoices];
    updated.splice(rowIdx, 1);
    onChange(updated);
  };

  // Bulk Actions
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected rows?`)) return;
    onChange(invoices.filter((inv) => !selectedIds.has(inv.id)));
    setSelectedIds(new Set());
  };

  const handleBulkChangePos = (newPos: string) => {
    if (!newPos || selectedIds.size === 0) return;
    const updated = invoices.map((inv) => {
      if (selectedIds.has(inv.id)) {
        const row = { ...inv, pos: newPos };
        recalculateRowTaxes(row);
        return row;
      }
      return inv;
    });
    onChange(updated);
  };

  // Bulk Import callback
  const handleBulkImportRows = (rows: any[], mode: "add" | "replace") => {
    const formattedRows: GridInvoiceRow[] = rows.map((r, idx) => ({
      id: "imp-" + Date.now() + "-" + idx,
      ctin: r.recipient_gstin || undefined,
      cname: r.recipient_name || "",
      inum: r.invoice_no || r.note_no || `INV-${idx + 1}`,
      idt: r.invoice_date || r.note_date || defaultDate,
      val: r.invoice_value || 0,
      pos: r.pos || defaultPos,
      nt_ty: isCdn ? (r.note_type || "C") : undefined,
      nt_num: isCdn ? (r.note_no || r.invoice_no) : undefined,
      nt_dt: isCdn ? (r.note_date || r.invoice_date) : undefined,
      items: [
        {
          rt: Number(r.rate) || 18,
          txval: Number(r.taxable_value) || 0,
          iamt: Number(r.igst) || 0,
          camt: Number(r.cgst) || 0,
          samt: Number(r.sgst) || 0,
          csamt: Number(r.cess) || 0,
          hsn: r.hsn,
          uqc: r.uqc || "NOS",
          qty: r.quantity,
        },
      ],
      source: "bulk",
    }));

    if (mode === "replace") {
      onChange(formattedRows);
    } else {
      onChange([...invoices, ...formattedRows]);
    }
  };

  // Check for duplicate invoice numbers in this section
  const duplicateNumbers = useMemo(() => {
    const counts = new Map<string, number>();
    invoices.forEach((inv) => {
      const num = String(inv.inum || "").trim().toUpperCase();
      if (num) counts.set(num, (counts.get(num) || 0) + 1);
    });
    return counts;
  }, [invoices]);

  // Running column totals
  const totals = useMemo(() => {
    let txval = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    let cess = 0;
    let val = 0;

    invoices.forEach((inv) => {
      val += Number(inv.val) || 0;
      inv.items.forEach((it) => {
        txval += Number(it.txval) || 0;
        igst += Number(it.iamt) || 0;
        cgst += Number(it.camt) || 0;
        sgst += Number(it.samt) || 0;
        cess += Number(it.csamt) || 0;
      });
    });

    return {
      txval: Math.round(txval * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      cess: Math.round(cess * 100) / 100,
      val: Math.round(val * 100) / 100,
    };
  }, [invoices]);

  return (
    <div className="space-y-4">
      {/* 1. Visible Import Bar (Section 8) */}
      <ImportBar
        token={token}
        section={section}
        sectionTitle={sectionTitle}
        onImportComplete={handleBulkImportRows}
      />

      {/* 2. Bulk Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-[#31719B]/10 border border-[#31719B]/30 rounded-xl p-2.5 flex items-center justify-between text-xs animate-in fade-in">
          <span className="font-semibold text-[#31719B] dark:text-[#64B5D6]">
            {selectedIds.size} invoices selected
          </span>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                handleBulkChangePos(e.target.value);
                e.target.value = "";
              }}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value="">Change POS for selected...</option>
              {STATE_OPTIONS.map((st) => (
                <option key={st.code} value={`${st.code}-${st.name}`}>
                  {st.code}-{st.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* 3. One-Line Invoice Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#dde2e8] dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 font-bold border-b border-[#dde2e8] dark:border-[#334155]">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={invoices.length > 0 && selectedIds.size === invoices.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(invoices.map((i) => i.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="w-3.5 h-3.5 rounded text-[#31719B]"
                  />
                </th>

                {(isB2B || isCdnr) && <th className="p-3 min-w-[200px]">Recipient (GSTIN / Name)</th>}
                <th className="p-3 min-w-[130px]">{isCdn ? "Note No" : "Invoice No"}</th>
                <th className="p-3 min-w-[110px]">Date</th>
                <th className="p-3 min-w-[150px]">Place of Supply</th>
                <th className="p-3 min-w-[280px]">Item Rates & Taxable Val</th>
                <th className="p-3 min-w-[100px]">Tax (Auto)</th>
                <th className="p-3 min-w-[110px]">Total Value</th>
                <th className="p-3 w-20 text-center">Options</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
              {invoices.map((inv, rowIdx) => {
                const isSelected = selectedIds.has(inv.id);
                const isDup = (duplicateNumbers.get(inv.inum.toUpperCase()) || 0) > 1;
                const hasSpecialOptions =
                  inv.inv_type && inv.inv_type !== "R" ||
                  inv.rchrg ||
                  inv.diff_percent ||
                  inv.irn ||
                  inv.ca_note;

                return (
                  <tr
                    key={inv.id}
                    className={`group hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors ${
                      isSelected ? "bg-[#31719B]/5" : ""
                    }`}
                  >
                    {/* Row Select Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(inv.id);
                          else next.delete(inv.id);
                          setSelectedIds(next);
                        }}
                        className="w-3.5 h-3.5 rounded text-[#31719B]"
                      />
                    </td>

                    {/* Recipient Column (B2B & CDNR) */}
                    {(isB2B || isCdnr) && (
                      <td className="p-3 relative">
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Type GSTIN or Name..."
                            value={inv.ctin || ""}
                            onChange={(e) => handleRecipientInput(rowIdx, e.target.value)}
                            onFocus={() => setActiveSearchRow(rowIdx)}
                            className="w-full px-2 py-1 text-xs uppercase font-mono rounded border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-1 focus:ring-[#31719B]"
                          />
                          {inv.cname && (
                            <div className="text-[10px] text-gray-500 truncate max-w-[180px]">
                              {inv.cname}
                            </div>
                          )}
                        </div>

                        {/* Autocomplete Dropdown */}
                        {activeSearchRow === rowIdx && recipientResults.length > 0 && (
                          <div className="absolute left-3 top-12 z-40 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-sm w-full divide-y divide-gray-100 dark:divide-gray-800 max-h-56 overflow-y-auto">
                            {recipientResults.map((r) => (
                              <div
                                key={r.gstin}
                                onClick={() => handleSelectRecipient(rowIdx, r)}
                                className="p-2.5 hover:bg-[#31719B]/5 cursor-pointer flex flex-col"
                              >
                                <span className="font-bold text-xs text-gray-900 dark:text-white font-mono">
                                  {r.gstin}
                                </span>
                                <span className="text-[11px] text-gray-500 truncate">
                                  {r.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Invoice / Note Number */}
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <input
                          type="text"
                          value={inv.inum}
                          onChange={(e) => updateInvoiceField(rowIdx, "inum", e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border font-mono bg-transparent ${
                            isDup
                              ? "border-amber-400 bg-amber-50/30 text-amber-900"
                              : "border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-[#31719B]"
                          }`}
                        />
                        {isDup && (
                          <span className="text-[10px] text-amber-600 block">
                            Duplicate number
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Invoice Date */}
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={inv.idt}
                        onChange={(e) => updateInvoiceField(rowIdx, "idt", e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-mono bg-transparent"
                      />
                    </td>

                    {/* POS Dropdown */}
                    <td className="p-3">
                      <select
                        value={inv.pos}
                        onChange={(e) => updateInvoiceField(rowIdx, "pos", e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent font-sans"
                      >
                        {STATE_OPTIONS.map((st) => (
                          <option key={st.code} value={`${st.code}-${st.name}`}>
                            {st.code}-{st.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Rate Lines Grid with "+ rate" chip */}
                    <td className="p-3">
                      <div className="space-y-1.5">
                        {inv.items.map((it, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-1.5">
                            {/* Rate Dropdown */}
                            <select
                              value={it.rt}
                              onChange={(e) =>
                                updateRateItem(rowIdx, itemIdx, "rt", Number(e.target.value))
                              }
                              className="px-1.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent w-20 font-bold"
                            >
                              {TAX_RATES.map((rt) => (
                                <option key={rt} value={rt}>
                                  {rt}%
                                </option>
                              ))}
                            </select>

                            {/* Taxable Value Input */}
                            <input
                              type="number"
                              placeholder="Taxable Value"
                              value={it.txval}
                              onChange={(e) =>
                                updateRateItem(
                                  rowIdx,
                                  itemIdx,
                                  "txval",
                                  e.target.value === "" ? "" : Number(e.target.value)
                                )
                              }
                              className="w-28 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent font-mono text-right"
                            />

                            {/* Remove rate line if multi */}
                            {inv.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRateLine(rowIdx, itemIdx)}
                                className="text-gray-400 hover:text-red-500 p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* "+ rate" chip */}
                        <button
                          type="button"
                          onClick={() => handleAddRateLine(rowIdx)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#31719B] dark:text-[#64B5D6] hover:underline"
                        >
                          <Plus className="w-2.5 h-2.5" /> add rate line
                        </button>
                      </div>
                    </td>

                    {/* Tax (Auto) */}
                    <td className="p-3 text-right">
                      {(() => {
                        const tax = inv.items.reduce(
                          (acc, it) =>
                            acc + (Number(it.iamt) || 0) + (Number(it.camt) || 0) + (Number(it.samt) || 0),
                          0
                        );
                        return (
                          <span className="font-bold text-gray-800 dark:text-gray-200">
                            ₹{formatIndianCurrency(tax)}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Total Invoice Value */}
                    <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                      ₹{formatIndianCurrency(inv.val || 0)}
                    </td>

                    {/* Row Menu & Detail Drawer Toggle */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDrawerRowIndex(rowIdx)}
                          title="More options & details"
                          className={`p-1.5 rounded-lg transition-all ${
                            hasSpecialOptions
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRow(rowIdx)}
                          title="Delete Row"
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Empty state */}
              {invoices.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-xs text-gray-500 font-sans"
                  >
                    No invoices added yet. Click <strong>"+ Add Invoice Row"</strong> or import via Excel/CSV above.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Live Totals Row */}
            {invoices.length > 0 && (
              <tfoot className="bg-gray-50/80 dark:bg-gray-800/80 border-t-2 border-[#dde2e8] dark:border-[#334155] font-mono font-bold text-xs">
                <tr>
                  <td colSpan={(isB2B || isCdnr) ? 4 : 3} className="p-3 text-right">
                    Total ({invoices.length} records):
                  </td>
                  <td className="p-3">
                    Taxable: ₹{formatIndianCurrency(totals.txval)}
                  </td>
                  <td className="p-3 text-right">
                    Tax: ₹{formatIndianCurrency(totals.igst + totals.cgst + totals.sgst)}
                  </td>
                  <td className="p-3 text-right text-gray-900 dark:text-white">
                    ₹{formatIndianCurrency(totals.val)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Add Row Button at Table Bottom */}
        <div className="p-3 border-t border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center">
          <button
            type="button"
            onClick={handleAddNewRow}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#31719B] text-white hover:bg-[#275a7c] transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Invoice Row
          </button>

          <span className="text-[11px] text-gray-400 font-sans">
            Tip: Press Tab to navigate cells, Enter on last cell adds next row
          </span>
        </div>
      </div>

      {/* 4. Detail Drawer (Modal / Side panel for rare options) */}
      {drawerRowIndex !== null && invoices[drawerRowIndex] && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Invoice Details: {invoices[drawerRowIndex].inum || "Untitled"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rare statutory options & HSN helpers for this invoice
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerRowIndex(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invoice Type (Mutually Exclusive) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                Invoice Supply Type:
              </label>
              <select
                value={invoices[drawerRowIndex].inv_type || "R"}
                onChange={(e) =>
                  updateInvoiceField(drawerRowIndex, "inv_type", e.target.value as any)
                }
                className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-transparent"
              >
                <option value="R">Regular B2B Supply</option>
                <option value="DE">Deemed Exports (Always IGST)</option>
                <option value="SEWP">SEZ Supplies with Payment (Always IGST)</option>
                <option value="SEWOP">SEZ Supplies without Payment (Zero-rated)</option>
                <option value="CBW">Intra-State supplies attracting IGST</option>
              </select>
            </div>

            {/* Checkboxes: Reverse Charge & Differential Rate */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-start gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(invoices[drawerRowIndex].rchrg)}
                  onChange={(e) =>
                    updateInvoiceField(drawerRowIndex, "rchrg", e.target.checked)
                  }
                  className="mt-0.5 w-3.5 h-3.5 rounded text-[#31719B]"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-900 dark:text-white block">
                    Reverse Charge
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Tax payable by recipient
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(invoices[drawerRowIndex].diff_percent)}
                  onChange={(e) =>
                    updateInvoiceField(drawerRowIndex, "diff_percent", e.target.checked)
                  }
                  className="mt-0.5 w-3.5 h-3.5 rounded text-[#31719B]"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-900 dark:text-white block">
                    Differential Rate (65%)
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Concessional rate notification
                  </span>
                </div>
              </label>
            </div>

            {/* E-Invoice IRN details */}
            <div className="space-y-3 pt-2 border-t">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                E-Invoice Details (Optional):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="64-character IRN"
                  value={invoices[drawerRowIndex].irn || ""}
                  onChange={(e) =>
                    updateInvoiceField(drawerRowIndex, "irn", e.target.value)
                  }
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                />
                <input
                  type="text"
                  placeholder="IRN Gen Date (DD/MM/YYYY)"
                  value={invoices[drawerRowIndex].irngendate || ""}
                  onChange={(e) =>
                    updateInvoiceField(drawerRowIndex, "irngendate", e.target.value)
                  }
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                />
              </div>
            </div>

            {/* HSN Helper per rate line */}
            <div className="space-y-3 pt-2 border-t">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                HSN / Item Helpers (Auto-fills Table 12):
              </span>
              {invoices[drawerRowIndex].items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-gray-500 w-12">{it.rt}%:</span>
                  <input
                    type="text"
                    placeholder="HSN/SAC"
                    value={it.hsn || ""}
                    onChange={(e) =>
                      updateRateItem(drawerRowIndex, idx, "hsn", e.target.value)
                    }
                    className="w-24 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-mono"
                  />
                  <select
                    value={it.uqc || "NOS"}
                    onChange={(e) =>
                      updateRateItem(drawerRowIndex, idx, "uqc", e.target.value)
                    }
                    className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700"
                  >
                    {UQC_OPTIONS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={it.qty || ""}
                    onChange={(e) =>
                      updateRateItem(
                        drawerRowIndex,
                        idx,
                        "qty",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-20 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-mono"
                  />
                </div>
              ))}
            </div>

            {/* Note to CA */}
            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                Note to CA regarding this invoice (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. party name recently amended in master..."
                value={invoices[drawerRowIndex].ca_note || ""}
                onChange={(e) =>
                  updateInvoiceField(drawerRowIndex, "ca_note", e.target.value)
                }
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
              />
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setDrawerRowIndex(null)}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#31719B] text-white hover:bg-[#275a7c]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

