import React, { useState } from "react";
import {
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ClipboardList,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { formatIndianCurrency } from "./gstFormUtils";

export interface Gstr1DashboardProps {
  payload: any;
  onUpdatePayload: (updated: any) => void;
  onOpenSection: (sectionKey: string) => void;
  onProceedToGstr3B: () => void;
  onReviewSummary: () => void;
}

export const Gstr1Dashboard: React.FC<Gstr1DashboardProps> = ({
  payload,
  onUpdatePayload,
  onOpenSection,
  onProceedToGstr3B,
  onReviewSummary,
}) => {
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(true);

  const isNil = payload.is_nil || false;

  const handleToggleNil = (checked: boolean) => {
    onUpdatePayload({
      ...payload,
      is_nil: checked,
    });
  };

  // Calculate Tile Counts & Totals
  // Tile 1: 4A B2B
  const b2bInvoices = payload.b2b || [];
  const b2bCount = b2bInvoices.length;
  const b2bTotalVal = b2bInvoices.reduce((sum: number, inv: any) => sum + (inv.val || 0), 0);

  // Tile 2: 5 B2CL
  const b2clInvoices = payload.b2cl || [];
  const b2clCount = b2clInvoices.length;
  const b2clTotalVal = b2clInvoices.reduce((sum: number, inv: any) => sum + (inv.val || 0), 0);

  // Tile 3: 7 B2CS
  const b2csRows = payload.b2cs || [];
  const b2csCount = b2csRows.length;
  const b2csTotalVal = b2csRows.reduce((sum: number, r: any) => sum + (r.txval || 0), 0);

  // Tile 4: 8 Nil
  const nilRows = payload.nil || [];
  let nilCount = 0;
  let nilTotalVal = 0;
  nilRows.forEach((r: any) => {
    if (r.nil_amt > 0) nilCount++;
    if (r.expt_amt > 0) nilCount++;
    if (r.ngsup_amt > 0) nilCount++;
    nilTotalVal += (r.nil_amt || 0) + (r.expt_amt || 0) + (r.ngsup_amt || 0);
  });

  // Tile 5: 9B CDNR
  const cdnrNotes = payload.cdnr || [];
  const cdnrCount = cdnrNotes.length;
  const cdnrTotalVal = cdnrNotes.reduce((sum: number, n: any) => sum + (n.val || 0), 0);

  // Tile 6: 9B CDNUR
  const cdnurNotes = payload.cdnur || [];
  const cdnurCount = cdnurNotes.length;
  const cdnurTotalVal = cdnurNotes.reduce((sum: number, n: any) => sum + (n.val || 0), 0);

  // Tile 7: 12 HSN
  const hsnRows = [...(payload.hsn_b2b || []), ...(payload.hsn_b2c || [])];
  const hsnCount = hsnRows.length;
  const hsnTotalVal = hsnRows.reduce((sum: number, h: any) => sum + (h.txval || 0), 0);

  // Tile 8: 13 Documents
  const docSections = payload.doc_issue || [];
  let docCount = 0;
  docSections.forEach((sec: any) => {
    docCount += (sec.docs || []).length;
  });

  const tiles = [
    {
      key: "4a",
      title: "4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices",
      count: b2bCount,
      countLabel: b2bCount === 1 ? "1 Invoice" : `${b2bCount} Invoices`,
      totalVal: b2bTotalVal,
      hasRecords: b2bCount > 0,
      description: "Tax invoices issued to registered taxpayers, SEZ units & deemed exports",
    },
    {
      key: "5",
      title: "5 - B2C (Large) Invoices",
      count: b2clCount,
      countLabel: b2clCount === 1 ? "1 Invoice" : `${b2clCount} Invoices`,
      totalVal: b2clTotalVal,
      hasRecords: b2clCount > 0,
      description: "Inter-State supplies to unregistered persons exceeding ₹1 Lakh",
    },
    {
      key: "7",
      title: "7 - B2C (Others)",
      count: b2csCount,
      countLabel: b2csCount === 1 ? "1 Row" : `${b2csCount} Rows`,
      totalVal: b2csTotalVal,
      hasRecords: b2csCount > 0,
      description: "Intra-State sales to unregistered & Inter-State up to ₹1 Lakh",
    },
    {
      key: "8",
      title: "8A, 8B, 8C, 8D - Nil Rated Supplies",
      count: nilCount,
      countLabel: `${nilCount} Entries`,
      totalVal: nilTotalVal,
      hasRecords: nilCount > 0,
      description: "Nil rated, exempted and non-GST outward supplies",
    },
    {
      key: "9b_reg",
      title: "9B - Credit / Debit Notes (Registered)",
      count: cdnrCount,
      countLabel: cdnrCount === 1 ? "1 Note" : `${cdnrCount} Notes`,
      totalVal: cdnrTotalVal,
      hasRecords: cdnrCount > 0,
      description: "Credit/Debit notes issued to registered recipients",
    },
    {
      key: "9b_unreg",
      title: "9B - Credit / Debit Notes (Unregistered)",
      count: cdnurCount,
      countLabel: cdnurCount === 1 ? "1 Note" : `${cdnurCount} Notes`,
      totalVal: cdnurTotalVal,
      hasRecords: cdnurCount > 0,
      description: "Credit/Debit notes for B2C Large and export supplies",
    },
    {
      key: "12",
      title: "12 - HSN-wise summary of outward supplies",
      count: hsnCount,
      countLabel: `${hsnCount} HSN Rows`,
      totalVal: hsnTotalVal,
      hasRecords: hsnCount > 0,
      description: "Mandatory HSN/SAC summary segregated into B2B & B2C tabs",
    },
    {
      key: "13",
      title: "13 - Documents Issued",
      count: docCount,
      countLabel: `${docCount} Series`,
      totalVal: null,
      hasRecords: docCount > 0,
      description: "Series-wise summary of invoices, challans and vouchers issued",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: File Nil GSTR-1 checkbox */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-4 shadow-card flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isNil}
            onChange={(e) => handleToggleNil(e.target.checked)}
            className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
          />
          <div>
            <span className="text-sm font-bold text-gray-900 dark:text-white block">
              File Nil GSTR-1
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Check this box only if you have zero sales, zero credit notes, zero advances, and zero outward transactions for this tax period.
            </span>
          </div>
        </label>

        {isNil && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Nil Return Mode Active (All sections skipped)
          </span>
        )}
      </div>

      {/* Nil Mode Notice */}
      {isNil ? (
        <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-8 text-center space-y-4 shadow-card">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-[#31719B] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Nil GSTR-1 Selected
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto mt-1">
              You have indicated that there are no outward supply records for this return period. You can proceed directly to GSTR-3B.
            </p>
          </div>
          <button
            type="button"
            onClick={onProceedToGstr3B}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
            style={{ backgroundColor: "var(--primary, #31719B)" }}
          >
            <span>Proceed to GSTR-3B →</span>
          </button>
        </div>
      ) : (
        /* ADD RECORD DETAILS Grid */
        <div className="space-y-4">
          {/* Collapsible Blue Header Bar */}
          <button
            type="button"
            onClick={() => setIsAddRecordOpen(!isAddRecordOpen)}
            className="w-full px-5 py-3 rounded-xl bg-[#31719B] text-white flex items-center justify-between shadow-xs font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span>ADD RECORD DETAILS (8 Core Tables)</span>
            </div>
            {isAddRecordOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isAddRecordOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tiles.map((tile) => (
                <div
                  key={tile.key}
                  onClick={() => onOpenSection(tile.key)}
                  className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] overflow-hidden shadow-card hover:shadow-md hover:border-[#31719B] transition-all cursor-pointer flex flex-col group"
                >
                  {/* Dark-Blue Title Bar (Matching portal structure) */}
                  <div className="bg-[#1e3a5f] text-white px-3.5 py-2.5 text-xs font-bold line-clamp-1 border-b border-[#2d5282]">
                    {tile.title}
                  </div>

                  {/* Body with Count and Values */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            tile.hasRecords
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white block">
                            {tile.countLabel}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {tile.hasRecords ? "Filled & Validated" : "No records yet"}
                          </span>
                        </div>
                      </div>

                      <span className="text-[#31719B] group-hover:translate-x-1 transition-transform">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>

                    {tile.totalVal !== null && (
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400 text-[11px]">Total Value:</span>
                        <span className="font-bold text-gray-900 dark:text-white font-mono">
                          {formatIndianCurrency(tile.totalVal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
        <button
          type="button"
          onClick={onReviewSummary}
          className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-xs cursor-pointer"
        >
          Review summary
        </button>

        <button
          type="button"
          onClick={onProceedToGstr3B}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          style={{ backgroundColor: "var(--primary, #31719B)" }}
        >
          <span>Fill GSTR-3B form →</span>
        </button>
      </div>
    </div>
  );
};

