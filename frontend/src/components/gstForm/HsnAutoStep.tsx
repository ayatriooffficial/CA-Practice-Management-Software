"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  Package,
  Layers,
  HelpCircle,
  Check,
} from "lucide-react";
import {
  formatIndianCurrency,
  TAX_RATES,
  UQC_OPTIONS,
} from "./gstFormUtils";
import { gstFormApi } from "@/services/gstFormApi";

export interface HsnItem {
  id?: string;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number | "";
  txval: number | "";
  rt: number;
  iamt: number | "";
  camt: number | "";
  samt: number | "";
  csamt: number | "";
}

interface HsnAutoStepProps {
  token: string;
  supplierStateCode: string;
  turnoverSlab: string;
  hsnB2b: HsnItem[];
  hsnB2c: HsnItem[];
  onChangeHsnB2b: (items: HsnItem[]) => void;
  onChangeHsnB2c: (items: HsnItem[]) => void;
  targetB2bTotal: number;
  targetB2cTotal: number;
  onAutoDerive?: () => Promise<void>;
  isDeriving?: boolean;
}

export const HsnAutoStep: React.FC<HsnAutoStepProps> = ({
  token,
  supplierStateCode,
  turnoverSlab,
  hsnB2b,
  hsnB2c,
  onChangeHsnB2b,
  onChangeHsnB2c,
  targetB2bTotal,
  targetB2cTotal,
  onAutoDerive,
  isDeriving = false,
}) => {
  const [activeTab, setActiveTab] = useState<"B2B" | "B2C">("B2B");
  const isAbove5Cr = turnoverSlab.includes("Above");
  const minDigits = isAbove5Cr ? 6 : 4;

  // Search items autocomplete state
  const [itemQuery, setItemQuery] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState<any[]>([]);
  const [isSearchingItem, setIsSearchingItem] = useState(false);

  // Active items list based on tab
  const currentList = activeTab === "B2B" ? hsnB2b : hsnB2c;
  const updateCurrentList = activeTab === "B2B" ? onChangeHsnB2b : onChangeHsnB2c;
  const currentTarget = activeTab === "B2B" ? targetB2bTotal : targetB2cTotal;

  // Calculate current sum
  const currentSum = useMemo(() => {
    return currentList.reduce((acc, it) => acc + (Number(it.txval) || 0), 0);
  }, [currentList]);

  // Remaining unallocated
  const unallocatedAmount = Math.max(0, Math.round((currentTarget - currentSum) * 100) / 100);
  const diff = Math.round((currentSum - currentTarget) * 100) / 100;
  const isBalanced = Math.abs(diff) <= 1.0;

  // Search Autocomplete
  useEffect(() => {
    if (!itemQuery || itemQuery.trim().length < 2) {
      setItemSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingItem(true);
      try {
        const results = await gstFormApi.searchItems(token, itemQuery.trim());
        setItemSuggestions(results);
      } catch (err) {
        console.error("Item search failed:", err);
      } finally {
        setIsSearchingItem(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [token, itemQuery]);

  // One-Click Shortcut: "Put all remaining in one HSN"
  const handleAllocateAllRemaining = (selectedHsn: string, desc: string, uqc: string, rt: number) => {
    if (unallocatedAmount <= 0) return;

    const newItem: HsnItem = {
      id: "hsn-" + Date.now(),
      hsn_sc: selectedHsn,
      desc,
      uqc: uqc || "NOS",
      qty: 1,
      txval: unallocatedAmount,
      rt,
      iamt: 0,
      camt: 0,
      samt: 0,
      csamt: 0,
    };

    updateCurrentList([...currentList, newItem]);
    setItemQuery("");
    setItemSuggestions([]);
  };

  // Add new empty manual row
  const handleAddRow = (hsnCode = "998314", desc = "Services", uqc = "NOS", rt = 18) => {
    const newItem: HsnItem = {
      id: "hsn-" + Date.now(),
      hsn_sc: hsnCode,
      desc,
      uqc,
      qty: 1,
      txval: unallocatedAmount > 0 ? unallocatedAmount : "",
      rt,
      iamt: 0,
      camt: 0,
      samt: 0,
      csamt: 0,
    };
    updateCurrentList([...currentList, newItem]);
  };

  const handleUpdateItem = (idx: number, field: keyof HsnItem, val: any) => {
    const updated = [...currentList];
    updated[idx] = { ...updated[idx], [field]: val };
    updateCurrentList(updated);
  };

  const handleDeleteItem = (idx: number) => {
    const updated = [...currentList];
    updated.splice(idx, 1);
    updateCurrentList(updated);
  };

  return (
    <div className="space-y-4">
      {/* Banner / Explanation */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              Auto-Generated HSN Summary (Table 12)
            </h3>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              We automatically grouped items from your invoices. Confirm your summary below:
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
            {isDeriving ? "Rebuilding..." : "Re-generate from invoices"}
          </button>
        )}
      </div>

      {/* Tabs: B2B vs B2C */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("B2B")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "B2B"
              ? "bg-[#31719B] text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          <span>B2B Supplies Tab</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20">
            {hsnB2b.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("B2C")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "B2C"
              ? "bg-[#31719B] text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          <span>B2C Supplies Tab</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20">
            {hsnB2c.length}
          </span>
        </button>
      </div>

      {/* Allocation & Reconciliation Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Target from Invoices */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
            {activeTab} Outward Turnover
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
            ₹{formatIndianCurrency(currentTarget)}
          </span>
        </div>

        {/* Allocated in Table */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
            Allocated in Table
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
            ₹{formatIndianCurrency(currentSum)}
          </span>
        </div>

        {/* Reconciliation Status */}
        <div
          className={`rounded-xl p-3 border flex items-center justify-between ${
            isBalanced
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/20 border-red-200 text-red-800 dark:text-red-300"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              Reconciliation
            </span>
            <span className="text-xs font-bold font-mono">
              {isBalanced ? "Balanced (Matches)" : `Difference: ₹${formatIndianCurrency(Math.abs(diff))}`}
            </span>
          </div>
          {isBalanced ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
        </div>
      </div>

      {/* "Still to allocate" Panel & One-Click Shortcut (Section 6.5) */}
      {unallocatedAmount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Still to allocate: ₹{formatIndianCurrency(unallocatedAmount)}
              </span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400">
              Taxable value not yet mapped to an HSN code
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
            <span className="text-xs text-amber-800 font-semibold">One-click shortcut:</span>
            <button
              type="button"
              onClick={() => handleAllocateAllRemaining("998314", "IT Design & Development", "NA", 18)}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-200/80 hover:bg-amber-300 text-amber-900 transition-all"
            >
              Put remaining in IT Services (998314 - 18%)
            </button>
            <button
              type="button"
              onClick={() => handleAllocateAllRemaining("998221", "Financial & Advisory", "NA", 18)}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-200/80 hover:bg-amber-300 text-amber-900 transition-all"
            >
              Put remaining in Advisory (998221 - 18%)
            </button>
            <button
              type="button"
              onClick={() => handleAllocateAllRemaining("84713010", "Laptops / Computers", "NOS", 18)}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-200/80 hover:bg-amber-300 text-amber-900 transition-all"
            >
              Put remaining in Laptops (84713010 - 18%)
            </button>
          </div>
        </div>
      )}

      {/* HSN Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold border-b font-sans">
              <tr>
                <th className="p-3">HSN/SAC</th>
                <th className="p-3">Description</th>
                <th className="p-3">UQC</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Taxable Value</th>
                <th className="p-3">Rate</th>
                <th className="p-3 text-right">Tax (Auto)</th>
                <th className="p-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {currentList.map((item, idx) => {
                const tax = Math.round((((Number(item.txval) || 0) * (Number(item.rt) || 0)) / 100) * 100) / 100;
                const isShortHsn = String(item.hsn_sc || "").length < minDigits;

                return (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="p-2.5">
                      <div className="space-y-0.5">
                        <input
                          type="text"
                          value={item.hsn_sc}
                          onChange={(e) => handleUpdateItem(idx, "hsn_sc", e.target.value)}
                          className={`w-28 px-2 py-1 text-xs rounded border font-mono bg-transparent ${
                            isShortHsn
                              ? "border-red-400 bg-red-50/30 text-red-900"
                              : "border-gray-300 dark:border-gray-700"
                          }`}
                        />
                        {isShortHsn && (
                          <span className="text-[10px] text-red-600 font-sans block">
                            Min {minDigits} digits
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.desc}
                        onChange={(e) => handleUpdateItem(idx, "desc", e.target.value)}
                        className="w-48 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-sans bg-transparent truncate"
                      />
                    </td>

                    <td className="p-2.5">
                      <select
                        value={item.uqc}
                        onChange={(e) => handleUpdateItem(idx, "uqc", e.target.value)}
                        className="px-1.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent font-sans"
                      >
                        {UQC_OPTIONS.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.code}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2.5">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) =>
                          handleUpdateItem(
                            idx,
                            "qty",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="w-20 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-mono bg-transparent"
                      />
                    </td>

                    <td className="p-2.5">
                      <input
                        type="number"
                        value={item.txval}
                        onChange={(e) =>
                          handleUpdateItem(
                            idx,
                            "txval",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="w-28 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-mono text-right bg-transparent font-bold"
                      />
                    </td>

                    <td className="p-2.5">
                      <select
                        value={item.rt}
                        onChange={(e) =>
                          handleUpdateItem(idx, "rt", Number(e.target.value))
                        }
                        className="px-1.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 font-bold bg-transparent"
                      >
                        {TAX_RATES.map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2.5 text-right font-bold text-gray-800 dark:text-gray-200">
                      ₹{formatIndianCurrency(tax)}
                    </td>

                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {currentList.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-xs text-gray-500 font-sans">
                    No HSN items in this tab. Click "+ Add HSN Row" or use the one-click shortcut above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 flex justify-between items-center">
          <button
            type="button"
            onClick={() => handleAddRow()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#31719B] text-white hover:bg-[#275a7c] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add HSN Row
          </button>
          <span className="text-[11px] text-gray-400 font-sans">
            Digit Rule: {minDigits} digits mandatory for {turnoverSlab}
          </span>
        </div>
      </div>
    </div>
  );
};

