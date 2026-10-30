import React, { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Lock,
  CheckCircle2,
  Info,
  ShieldCheck,
  Calculator,
} from "lucide-react";
import { formatIndianCurrency, formatIndianNumber, round2 } from "./gstFormUtils";

export interface Gstr3BFormProps {
  payload: any;
  header: any;
  onUpdatePayload: (updated: any) => void;
  onBackToGstr1: () => void;
  onProceedToSummary: () => void;
}

export const Gstr3BForm: React.FC<Gstr3BFormProps> = ({
  payload,
  header,
  onUpdatePayload,
  onBackToGstr1,
  onProceedToSummary,
}) => {
  const gstr3b = payload.gstr3b || {};
  const isNil = gstr3b.is_nil || false;

  const handleUpdate = (path: string[], value: any) => {
    const updated = JSON.parse(JSON.stringify(gstr3b));
    let cur = updated;
    for (let i = 0; i < path.length - 1; i++) {
      if (!cur[path[i]]) cur[path[i]] = {};
      cur = cur[path[i]];
    }
    cur[path[path.length - 1]] = value;

    onUpdatePayload({
      ...payload,
      gstr3b: updated,
    });
  };

  // Table 4: Compute 4(A) Totals, 4(B) Totals, and 4(C) Net ITC
  const itcComputation = useMemo(() => {
    const itcAvl = gstr3b.table4?.itc_avl || {};
    const itcRev = gstr3b.table4?.itc_rev || {};

    const avlIgst =
      (itcAvl.impg?.iamt || 0) +
      (itcAvl.imps?.iamt || 0) +
      (itcAvl.isrc?.iamt || 0) +
      (itcAvl.isd?.iamt || 0) +
      (itcAvl.oth?.iamt || 0);
    const avlCgst =
      (itcAvl.isrc?.camt || 0) +
      (itcAvl.isd?.camt || 0) +
      (itcAvl.oth?.camt || 0);
    const avlSgst =
      (itcAvl.isrc?.samt || 0) +
      (itcAvl.isd?.samt || 0) +
      (itcAvl.oth?.samt || 0);
    const avlCess =
      (itcAvl.impg?.csamt || 0) +
      (itcAvl.imps?.csamt || 0) +
      (itcAvl.isrc?.csamt || 0) +
      (itcAvl.isd?.csamt || 0) +
      (itcAvl.oth?.csamt || 0);

    const revIgst = (itcRev.rul?.iamt || 0) + (itcRev.oth?.iamt || 0);
    const revCgst = (itcRev.rul?.camt || 0) + (itcRev.oth?.camt || 0);
    const revSgst = (itcRev.rul?.samt || 0) + (itcRev.oth?.samt || 0);
    const revCess = (itcRev.rul?.csamt || 0) + (itcRev.oth?.csamt || 0);

    const netIgst = Math.max(0, round2(avlIgst - revIgst));
    const netCgst = Math.max(0, round2(avlCgst - revCgst));
    const netSgst = Math.max(0, round2(avlSgst - revSgst));
    const netCess = Math.max(0, round2(avlCess - revCess));

    return {
      avl: { igst: round2(avlIgst), cgst: round2(avlCgst), sgst: round2(avlSgst), cess: round2(avlCess) },
      rev: { igst: round2(revIgst), cgst: round2(revCgst), sgst: round2(revSgst), cess: round2(revCess) },
      net: { igst: netIgst, cgst: netCgst, sgst: netSgst, cess: netCess },
    };
  }, [gstr3b.table4]);

  // Table 6.1 Payment of Tax (Statutory ITC Utilisation Order)
  const taxPaymentSuggestion = useMemo(() => {
    const t31 = gstr3b.table3_1 || {};
    const outwardIgst = (t31.osup_det?.iamt || 0) + (t31.osup_zero?.iamt || 0);
    const outwardCgst = t31.osup_det?.camt || 0;
    const outwardSgst = t31.osup_det?.samt || 0;
    const outwardCess = (t31.osup_det?.csamt || 0) + (t31.osup_zero?.csamt || 0);

    // Reverse charge liability (Must be paid in cash only)
    const rcIgst = t31.isup_rev?.iamt || 0;
    const rcCgst = t31.isup_rev?.camt || 0;
    const rcSgst = t31.isup_rev?.samt || 0;
    const rcCess = t31.isup_rev?.csamt || 0;

    let remIgstLiability = outwardIgst;
    let remCgstLiability = outwardCgst;
    let remSgstLiability = outwardSgst;
    let remCessLiability = outwardCess;

    let remIgstCredit = itcComputation.net.igst;
    let remCgstCredit = itcComputation.net.cgst;
    let remSgstCredit = itcComputation.net.sgst;
    let remCessCredit = itcComputation.net.cess;

    // 1. IGST Credit against IGST liability
    const igstToIgst = Math.min(remIgstCredit, remIgstLiability);
    remIgstCredit -= igstToIgst;
    remIgstLiability -= igstToIgst;

    // 2. IGST Credit against CGST liability
    const igstToCgst = Math.min(remIgstCredit, remCgstLiability);
    remIgstCredit -= igstToCgst;
    remCgstLiability -= igstToCgst;

    // 3. IGST Credit against SGST liability
    const igstToSgst = Math.min(remIgstCredit, remSgstLiability);
    remIgstCredit -= igstToSgst;
    remSgstLiability -= igstToSgst;

    // 4. CGST Credit against CGST liability
    const cgstToCgst = Math.min(remCgstCredit, remCgstLiability);
    remCgstCredit -= cgstToCgst;
    remCgstLiability -= cgstToCgst;

    // 5. CGST Credit against IGST liability
    const cgstToIgst = Math.min(remCgstCredit, remIgstLiability);
    remCgstCredit -= cgstToIgst;
    remIgstLiability -= cgstToIgst;

    // 6. SGST Credit against SGST liability
    const sgstToSgst = Math.min(remSgstCredit, remSgstLiability);
    remSgstCredit -= sgstToSgst;
    remSgstLiability -= sgstToSgst;

    // 7. SGST Credit against IGST liability
    const sgstToIgst = Math.min(remSgstCredit, remIgstLiability);
    remSgstCredit -= sgstToIgst;
    remIgstLiability -= sgstToIgst;

    // 8. Cess Credit against Cess
    const cessToCess = Math.min(remCessCredit, remCessLiability);
    remCessCredit -= cessToCess;
    remCessLiability -= cessToCess;

    // Cash Required
    const cashIgst = round2(remIgstLiability + rcIgst);
    const cashCgst = round2(remCgstLiability + rcCgst);
    const cashSgst = round2(remSgstLiability + rcSgst);
    const cashCess = round2(remCessLiability + rcCess);

    return {
      payable: {
        igst: round2(outwardIgst + rcIgst),
        cgst: round2(outwardCgst + rcCgst),
        sgst: round2(outwardSgst + rcSgst),
        cess: round2(outwardCess + rcCess),
      },
      itcPaid: {
        igst: round2(igstToIgst + cgstToIgst + sgstToIgst),
        cgst: round2(cgstToCgst + igstToCgst),
        sgst: round2(sgstToSgst + igstToSgst),
        cess: round2(cessToCess),
      },
      cashPaid: {
        igst: cashIgst,
        cgst: cashCgst,
        sgst: cashSgst,
        cess: cashCess,
        total: round2(cashIgst + cashCgst + cashSgst + cashCess),
      },
    };
  }, [gstr3b.table3_1, itcComputation.net]);

  const t31 = gstr3b.table3_1 || {};
  const t4 = gstr3b.table4 || {};
  const t5 = gstr3b.table5 || {};
  const t51 = gstr3b.table5_1 || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dde2e8] dark:border-[#334155] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToGstr1}
            className="p-1.5 rounded-lg border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>GSTR-3B Monthly / Quarterly Return</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tax on outward supplies is auto-populated from GSTR-1. Enter Eligible ITC from your GSTR-2B.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onProceedToSummary}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer flex items-center gap-2"
          style={{ backgroundColor: "var(--primary, #31719B)" }}
        >
          <span>Review Summary & Validate →</span>
        </button>
      </div>

      {/* Table 3.1: Outward supplies and inward supplies liable to reverse charge */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div>
            <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>3.1 Tax on Outward and Reverse Charge Inward Supplies</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#31719B] dark:bg-blue-900/60 dark:text-blue-300">
                Auto-filled from GSTR-1
              </span>
            </h2>
            <p className="text-[11px] text-gray-500">
              Outward liabilities (a, b, c, e) are non-editable per GSTN rules. To change them, edit your GSTR-1 data.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-1/3">Nature of Supplies</th>
                <th className="py-2.5 px-3 text-right">Total Taxable Value (₹)</th>
                <th className="py-2.5 px-3 text-right">Integrated Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Central Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">State/UT Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Cess (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
              {/* (a) Outward taxable supplies (other than zero-rated, nil-rated, exempted) */}
              <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                  (a) Outward taxable supplies (other than zero-rated, nil, exempt)
                </td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_det?.txval)}</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_det?.iamt)}</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_det?.camt)}</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_det?.samt)}</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_det?.csamt)}</td>
              </tr>

              {/* (b) Outward taxable supplies (zero-rated) */}
              <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                  (b) Outward taxable supplies (zero-rated exports/SEZ)
                </td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_zero?.txval)}</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_zero?.iamt)}</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_zero?.csamt)}</td>
              </tr>

              {/* (c) Other outward supplies (nil-rated, exempted) */}
              <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                  (c) Other outward supplies (nil-rated, exempted)
                </td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_nil_exmp?.txval)}</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
              </tr>

              {/* (d) Inward supplies (liable to reverse charge) - EDITABLE */}
              <tr className="bg-white dark:bg-[#1e293b]">
                <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span>(d) Inward supplies liable to reverse charge</span>
                  <span className="text-[10px] text-[#31719B] font-bold">(Editable)</span>
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t31.isup_rev?.txval ?? ""}
                    onChange={(e) => handleUpdate(["table3_1", "isup_rev", "txval"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-28 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t31.isup_rev?.iamt ?? ""}
                    onChange={(e) => handleUpdate(["table3_1", "isup_rev", "iamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t31.isup_rev?.camt ?? ""}
                    onChange={(e) => handleUpdate(["table3_1", "isup_rev", "camt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t31.isup_rev?.samt ?? ""}
                    onChange={(e) => handleUpdate(["table3_1", "isup_rev", "samt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t31.isup_rev?.csamt ?? ""}
                    onChange={(e) => handleUpdate(["table3_1", "isup_rev", "csamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>

              {/* (e) Non-GST outward supplies */}
              <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                  (e) Non-GST outward supplies
                </td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(t31.osup_nongst?.txval)}</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                <td className="py-2.5 px-3 text-right text-gray-400">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 4: Eligible ITC */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
          <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            4. Eligible ITC (Input Tax Credit)
          </h2>
          <p className="text-[11px] text-gray-500">
            Enter as per GSTR-2B or your purchase books.
          </p>
        </div>

        <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-1/3">Details</th>
                <th className="py-2.5 px-3 text-right">Integrated Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Central Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">State/UT Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Cess (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
              {/* 4(A) Header */}
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                <td colSpan={5} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                  (A) ITC Available (whether in full or part)
                </td>
              </tr>
              {/* (1) Import of goods */}
              <tr>
                <td className="py-2 px-3 pl-6">(1) Import of goods</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.impg?.iamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "impg", "iamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-28 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right text-gray-400">-</td>
                <td className="py-2 px-3 text-right text-gray-400">-</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.impg?.csamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "impg", "csamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>
              {/* (2) Import of services */}
              <tr>
                <td className="py-2 px-3 pl-6">(2) Import of services</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.imps?.iamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "imps", "iamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-28 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right text-gray-400">-</td>
                <td className="py-2 px-3 text-right text-gray-400">-</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.imps?.csamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "imps", "csamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>
              {/* (3) Inward supplies liable to reverse charge */}
              <tr>
                <td className="py-2 px-3 pl-6">(3) Inward supplies liable to reverse charge (other than 1 & 2)</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.isrc?.iamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "isrc", "iamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-28 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.isrc?.camt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "isrc", "camt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.isrc?.samt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "isrc", "samt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.isrc?.csamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "isrc", "csamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>
              {/* (4) Inward supplies from ISD */}
              <tr>
                <td className="py-2 px-3 pl-6">(4) Inward supplies from ISD</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.isd?.iamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "isd", "iamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-28 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.isd?.camt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "isd", "camt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.isd?.samt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "isd", "samt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.isd?.csamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "isd", "csamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>
              {/* (5) All other ITC */}
              <tr>
                <td className="py-2 px-3 pl-6 font-semibold">(5) All other ITC (General purchases)</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.oth?.iamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "oth", "iamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-28 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.oth?.camt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "oth", "camt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.oth?.samt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "oth", "samt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_avl?.oth?.csamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_avl", "oth", "csamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>

              {/* 4(B) Header: ITC Reversed */}
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                <td colSpan={5} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                  (B) ITC Reversed
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 pl-6">(1) As per rules 38, 42 & 43 and section 17(5)</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_rev?.rul?.iamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_rev", "rul", "iamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-28 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_rev?.rul?.camt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_rev", "rul", "camt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_rev?.rul?.samt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_rev", "rul", "samt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_rev?.rul?.csamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_rev", "rul", "csamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 pl-6">(2) Others</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_rev?.oth?.iamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_rev", "oth", "iamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-28 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_rev?.oth?.camt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_rev", "oth", "camt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_rev?.oth?.samt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_rev", "oth", "samt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t4.itc_rev?.oth?.csamt ?? ""}
                    onChange={(e) => handleUpdate(["table4", "itc_rev", "oth", "csamt"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-24 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>

              {/* 4(C) Net ITC Available */}
              <tr className="bg-emerald-50/60 dark:bg-emerald-950/20 font-bold border-t-2 border-[#dde2e8] dark:border-[#334155]">
                <td className="py-3 px-3 text-emerald-800 dark:text-emerald-300">
                  (C) Net ITC Available (A) – (B)
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-800 dark:text-emerald-300">
                  {formatIndianCurrency(itcComputation.net.igst)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-800 dark:text-emerald-300">
                  {formatIndianCurrency(itcComputation.net.cgst)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-800 dark:text-emerald-300">
                  {formatIndianCurrency(itcComputation.net.sgst)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-800 dark:text-emerald-300">
                  {formatIndianCurrency(itcComputation.net.cess)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 5: Inward supplies (exempt, nil, non-GST) */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          5. Values of exempt, nil-rated and non-GST inward supplies
        </h2>
        <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-1/2">Nature of supplies</th>
                <th className="py-2.5 px-3 text-right">Inter-State supplies (₹)</th>
                <th className="py-2.5 px-3 text-right">Intra-State supplies (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
              <tr>
                <td className="py-2 px-3">From a supplier under composition scheme, exempt and nil rated supply</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t5.comp_nil?.inter ?? ""}
                    onChange={(e) => handleUpdate(["table5", "comp_nil", "inter"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-32 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t5.comp_nil?.intra ?? ""}
                    onChange={(e) => handleUpdate(["table5", "comp_nil", "intra"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-32 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3">Non-GST supply</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t5.non_gst?.inter ?? ""}
                    onChange={(e) => handleUpdate(["table5", "non_gst", "inter"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-32 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={t5.non_gst?.intra ?? ""}
                    onChange={(e) => handleUpdate(["table5", "non_gst", "intra"], Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-7 w-32 rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right text-xs"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 5.1: Interest & Late Fee */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          5.1 Interest and Late Fee (if applicable)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-gray-500 mb-1">Interest (IGST)</label>
            <input
              type="number"
              step="0.01"
              value={t51.interest?.iamt ?? ""}
              onChange={(e) => handleUpdate(["table5_1", "interest", "iamt"], Number(e.target.value) || 0)}
              placeholder="0.00"
              className="h-8 w-full rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right"
            />
          </div>
          <div>
            <label className="block text-gray-500 mb-1">Interest (CGST)</label>
            <input
              type="number"
              step="0.01"
              value={t51.interest?.camt ?? ""}
              onChange={(e) => handleUpdate(["table5_1", "interest", "camt"], Number(e.target.value) || 0)}
              placeholder="0.00"
              className="h-8 w-full rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right"
            />
          </div>
          <div>
            <label className="block text-gray-500 mb-1">Interest (SGST)</label>
            <input
              type="number"
              step="0.01"
              value={t51.interest?.samt ?? ""}
              onChange={(e) => handleUpdate(["table5_1", "interest", "samt"], Number(e.target.value) || 0)}
              placeholder="0.00"
              className="h-8 w-full rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right"
            />
          </div>
          <div>
            <label className="block text-gray-500 mb-1">Interest (Cess)</label>
            <input
              type="number"
              step="0.01"
              value={t51.interest?.csamt ?? ""}
              onChange={(e) => handleUpdate(["table5_1", "interest", "csamt"], Number(e.target.value) || 0)}
              placeholder="0.00"
              className="h-8 w-full rounded border border-gray-300 dark:border-gray-700 px-2 font-mono text-right"
            />
          </div>
        </div>
      </div>

      {/* Table 6.1: Suggested Payment of Tax (Read-only suggestion following statutory order) */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <div className="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#31719B]" />
              <span>6.1 Payment of Tax (Suggested System Computation)</span>
            </h2>
            <p className="text-[11px] text-gray-500">
              Computed strictly per the GST statutory ITC utilisation order. Clearly informational: final ledger payment is performed on the GST portal.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-semibold">
              <tr>
                <th className="py-2.5 px-3">Tax Head</th>
                <th className="py-2.5 px-3 text-right">Tax Payable (₹)</th>
                <th className="py-2.5 px-3 text-right">Paid Through ITC (₹)</th>
                <th className="py-2.5 px-3 text-right text-red-200">Tax Paid in Cash (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">Integrated Tax (IGST)</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(taxPaymentSuggestion.payable.igst)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatIndianNumber(taxPaymentSuggestion.itcPaid.igst)}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">{formatIndianNumber(taxPaymentSuggestion.cashPaid.igst)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">Central Tax (CGST)</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(taxPaymentSuggestion.payable.cgst)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatIndianNumber(taxPaymentSuggestion.itcPaid.cgst)}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">{formatIndianNumber(taxPaymentSuggestion.cashPaid.cgst)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">State/UT Tax (SGST)</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(taxPaymentSuggestion.payable.sgst)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatIndianNumber(taxPaymentSuggestion.itcPaid.sgst)}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">{formatIndianNumber(taxPaymentSuggestion.cashPaid.sgst)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">Cess</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(taxPaymentSuggestion.payable.cess)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatIndianNumber(taxPaymentSuggestion.itcPaid.cess)}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">{formatIndianNumber(taxPaymentSuggestion.cashPaid.cess)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-[#dde2e8] dark:border-[#334155]">
              <tr>
                <td className="py-2.5 px-3">Total Estimated Cash Outflow:</td>
                <td colSpan={2}></td>
                <td className="py-2.5 px-3 text-right font-mono text-red-600 text-sm">
                  {formatIndianCurrency(taxPaymentSuggestion.cashPaid.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Verification Card (Section 7.8) */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Verification & Signatory Details
        </h2>

        <div className="space-y-3 text-xs">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(gstr3b.verification?.declared)}
              onChange={(e) => handleUpdate(["verification", "declared"], e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-[#31719B] accent-[#31719B]"
            />
            <span className="text-gray-700 dark:text-gray-300">
              I hereby solemnly affirm and declare that the information given herein above is true and correct to the best of my knowledge and belief and nothing has been concealed therefrom.
            </span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-gray-500 mb-1">
                Name of Authorized Signatory <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={gstr3b.verification?.signatory_name || ""}
                onChange={(e) => handleUpdate(["verification", "signatory_name"], e.target.value)}
                placeholder="Full Name"
                className="w-full h-8 rounded border border-gray-300 dark:border-gray-700 px-3 outline-none focus:border-[#31719B]"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Place</label>
              <input
                type="text"
                readOnly
                value={header.stateCode || "Place"}
                className="w-full h-8 rounded border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 px-3 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Date</label>
              <input
                type="text"
                readOnly
                value={new Date().toLocaleDateString("en-IN")}
                className="w-full h-8 rounded border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 px-3 text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
        <button
          type="button"
          onClick={onBackToGstr1}
          className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-50 cursor-pointer"
        >
          ← Back to GSTR-1
        </button>

        <button
          type="button"
          onClick={onProceedToSummary}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer flex items-center gap-2"
          style={{ backgroundColor: "var(--primary, #31719B)" }}
        >
          <span>Review Summary & Validate →</span>
        </button>
      </div>
    </div>
  );
};

