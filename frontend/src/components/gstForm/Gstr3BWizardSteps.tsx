"use client";

import React from "react";
import {
  FileText,
  Calculator,
  CreditCard,
  RotateCcw,
  Ban,
  Percent,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatIndianCurrency } from "./gstFormUtils";
import { ImportBar } from "./ImportBar";

interface Gstr3BWizardStepsProps {
  token: string;
  activeSection: string; // "itc" | "rchrg_purchase" | "exempt_purchase" | "interest_late_fee" | "prev_period_liability"
  table3_1: any;
  table3_2: any[];
  table4: any;
  table5: any;
  table5_1: any;
  onChangeTable4: (table4: any) => void;
  onChangeTable3_1_d: (isup_rev: any) => void;
  onChangeTable5: (table5: any) => void;
  onChangeTable5_1: (table5_1: any) => void;
}

export const Gstr3BWizardSteps: React.FC<Gstr3BWizardStepsProps> = ({
  token,
  activeSection,
  table3_1,
  table3_2,
  table4,
  table5,
  table5_1,
  onChangeTable4,
  onChangeTable3_1_d,
  onChangeTable5,
  onChangeTable5_1,
}) => {
  // Helper for Table 4 input updates
  const handleUpdateItcCell = (group: "itc_avl" | "itc_rev" | "itc_inelg", key: string, field: string, val: any) => {
    const updated = { ...table4 };
    const num = val === "" ? 0 : Number(val);
    updated[group] = {
      ...updated[group],
      [key]: {
        ...updated[group]?.[key],
        [field]: num,
      },
    };

    // Auto compute 4(C) Net ITC
    const avl = updated.itc_avl || {};
    const rev = updated.itc_rev || {};

    const sumField = (g: any, f: string) =>
      Object.values(g).reduce((sum: number, row: any) => sum + (Number(row?.[f]) || 0), 0);

    const netIam = sumField(avl, "iamt") - sumField(rev, "iamt");
    const netCam = sumField(avl, "camt") - sumField(rev, "camt");
    const netSam = sumField(avl, "samt") - sumField(rev, "samt");
    const netCsa = sumField(avl, "csamt") - sumField(rev, "csamt");

    updated.itc_net = {
      iamt: Math.max(0, netIam),
      camt: Math.max(0, netCam),
      samt: Math.max(0, netSam),
      csamt: Math.max(0, netCsa),
    };

    onChangeTable4(updated);
  };

  // Import handler for ITC table
  const handleItcImport = (rows: any[], mode: "add" | "replace") => {
    const updated = { ...table4 };
    rows.forEach((r) => {
      const code = String(r.row_code || "").toUpperCase().trim();
      const igst = Number(r.igst) || 0;
      const cgst = Number(r.cgst) || 0;
      const sgst = Number(r.sgst) || 0;
      const cess = Number(r.cess) || 0;

      if (code === "4A1") updated.itc_avl.impg = { iamt: igst, csamt: cess };
      else if (code === "4A2") updated.itc_avl.imps = { iamt: igst, csamt: cess };
      else if (code === "4A3") updated.itc_avl.isrc = { iamt: igst, camt: cgst, samt: sgst, csamt: cess };
      else if (code === "4A4") updated.itc_avl.isd = { iamt: igst, camt: cgst, samt: sgst, csamt: cess };
      else if (code === "4A5") updated.itc_avl.oth = { iamt: igst, camt: cgst, samt: sgst, csamt: cess };
      else if (code === "4B1") updated.itc_rev.rul = { iamt: igst, camt: cgst, samt: sgst, csamt: cess };
      else if (code === "4B2") updated.itc_rev.oth = { iamt: igst, camt: cgst, samt: sgst, csamt: cess };
      else if (code === "4D1") updated.itc_inelg.rul = { iamt: igst, camt: cgst, samt: sgst, csamt: cess };
      else if (code === "4D2") updated.itc_inelg.oth = { iamt: igst, camt: cgst, samt: sgst, csamt: cess };
    });

    onChangeTable4(updated);
  };

  return (
    <div className="space-y-4">
      {/* 1. Read-Only "Calculated from your sales" Card (Section 6.7) */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#31719B] text-white flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
              Calculated from your sales (Table 3.1 & 3.2)
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold">
                Auto-Populated & Locked
              </span>
            </span>
            <p className="text-[11px] text-blue-700 dark:text-blue-300">
              Tax liabilities are derived automatically from your GSTR-1 entries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-blue-200/60 font-mono text-xs">
          <div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-sans">
              Outward Taxable
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              ₹{formatIndianCurrency(table3_1?.osup_det?.txval || 0)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-sans">
              IGST Liability
            </span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              ₹{formatIndianCurrency(table3_1?.osup_det?.iamt || 0)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-sans">
              CGST Liability
            </span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              ₹{formatIndianCurrency(table3_1?.osup_det?.camt || 0)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-sans">
              SGST Liability
            </span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              ₹{formatIndianCurrency(table3_1?.osup_det?.samt || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Step: Input Tax Credit (Table 4) */}
      {activeSection === "itc" && (
        <div className="space-y-4">
          <ImportBar
            token={token}
            section="itc"
            sectionTitle="Input Tax Credit (Table 4)"
            onImportComplete={handleItcImport}
            canonicalColumns={[
              { key: "row_code", label: "Row Code (e.g. 4A5, 4B2)", required: true },
              { key: "igst", label: "IGST Amount" },
              { key: "cgst", label: "CGST Amount" },
              { key: "sgst", label: "SGST Amount" },
              { key: "cess", label: "Cess Amount" },
            ]}
          />

          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#31719B]" /> Table 4: Eligible ITC
            </h3>

            {/* 4(A)(5) All other ITC (Most Common) */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 space-y-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white block">
                4(A)(5) All other ITC (Standard Purchases)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["iamt", "camt", "samt", "csamt"].map((f) => (
                  <div key={f}>
                    <label className="text-[10px] uppercase font-bold text-gray-500 block">
                      {f.toUpperCase()}
                    </label>
                    <input
                      type="number"
                      value={table4.itc_avl?.oth?.[f] || ""}
                      onChange={(e) => handleUpdateItcCell("itc_avl", "oth", f, e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-right"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 4(C) Net ITC Calculated */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                  4(C) Net ITC Available (4A − 4B)
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  Automatically computed and offset against tax liabilities
                </span>
              </div>
              <div className="flex gap-4 font-mono text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <span>IGST: ₹{formatIndianCurrency(table4.itc_net?.iamt || 0)}</span>
                <span>CGST: ₹{formatIndianCurrency(table4.itc_net?.camt || 0)}</span>
                <span>SGST: ₹{formatIndianCurrency(table4.itc_net?.samt || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Step: Reverse Charge Purchases (Table 3.1(d) & 4(A)(3)) */}
      {activeSection === "rchrg_purchase" && (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#31719B]" /> Inward Supplies Attracting Reverse Charge
          </h3>
          <p className="text-xs text-gray-500">
            Enter purchases subject to reverse charge. The tax will be reported under Table 3.1(d) and auto-credited to Table 4(A)(3).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 block font-sans">
                Taxable Value
              </label>
              <input
                type="number"
                value={table3_1?.isup_rev?.txval || ""}
                onChange={(e) =>
                  onChangeTable3_1_d({
                    ...table3_1.isup_rev,
                    txval: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-right font-bold"
              />
            </div>

            {["iamt", "camt", "samt", "csamt"].map((f) => (
              <div key={f}>
                <label className="text-[10px] uppercase font-bold text-gray-500 block font-sans">
                  {f.toUpperCase()}
                </label>
                <input
                  type="number"
                  value={table3_1?.isup_rev?.[f] || ""}
                  onChange={(e) =>
                    onChangeTable3_1_d({
                      ...table3_1.isup_rev,
                      [f]: e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-right"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Step: Exempt Purchases (Table 5) */}
      {activeSection === "exempt_purchase" && (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Ban className="w-4 h-4 text-[#31719B]" /> Table 5: Values of Inward Supplies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <span className="font-bold text-gray-800 dark:text-gray-200 block">
                From composition scheme, nil-rated & exempt
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Inter-state"
                  value={table5.comp_nil?.inter || ""}
                  onChange={(e) =>
                    onChangeTable5({
                      ...table5,
                      comp_nil: { ...table5.comp_nil, inter: Number(e.target.value) || 0 },
                    })
                  }
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 text-right font-mono"
                />
                <input
                  type="number"
                  placeholder="Intra-state"
                  value={table5.comp_nil?.intra || ""}
                  onChange={(e) =>
                    onChangeTable5({
                      ...table5,
                      comp_nil: { ...table5.comp_nil, intra: Number(e.target.value) || 0 },
                    })
                  }
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 text-right font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <span className="font-bold text-gray-800 dark:text-gray-200 block">
                Non-GST inward supplies
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Inter-state"
                  value={table5.non_gst?.inter || ""}
                  onChange={(e) =>
                    onChangeTable5({
                      ...table5,
                      non_gst: { ...table5.non_gst, inter: Number(e.target.value) || 0 },
                    })
                  }
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 text-right font-mono"
                />
                <input
                  type="number"
                  placeholder="Intra-state"
                  value={table5.non_gst?.intra || ""}
                  onChange={(e) =>
                    onChangeTable5({
                      ...table5,
                      non_gst: { ...table5.non_gst, intra: Number(e.target.value) || 0 },
                    })
                  }
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 text-right font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Step: Interest & Late Fee (Table 5.1) */}
      {activeSection === "interest_late_fee" && (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Percent className="w-4 h-4 text-[#31719B]" /> Table 5.1: Interest and Late Fee Payable
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <label className="text-[10px] text-gray-500 block font-sans">IGST Interest</label>
              <input
                type="number"
                value={table5_1.interest?.iamt || ""}
                onChange={(e) =>
                  onChangeTable5_1({
                    ...table5_1,
                    interest: { ...table5_1.interest, iamt: Number(e.target.value) || 0 },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-right"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block font-sans">CGST Interest</label>
              <input
                type="number"
                value={table5_1.interest?.camt || ""}
                onChange={(e) =>
                  onChangeTable5_1({
                    ...table5_1,
                    interest: { ...table5_1.interest, camt: Number(e.target.value) || 0 },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-right"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block font-sans">SGST Interest</label>
              <input
                type="number"
                value={table5_1.interest?.samt || ""}
                onChange={(e) =>
                  onChangeTable5_1({
                    ...table5_1,
                    interest: { ...table5_1.interest, samt: Number(e.target.value) || 0 },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-right"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block font-sans">Cess Interest</label>
              <input
                type="number"
                value={table5_1.interest?.csamt || ""}
                onChange={(e) =>
                  onChangeTable5_1({
                    ...table5_1,
                    interest: { ...table5_1.interest, csamt: Number(e.target.value) || 0 },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-right"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

