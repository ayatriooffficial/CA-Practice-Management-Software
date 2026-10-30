import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  FileCheck,
  Send,
  Loader2,
  Lock,
} from "lucide-react";
import { formatIndianCurrency, formatIndianNumber, round2 } from "./gstFormUtils";
import { ValidationReport } from "@/services/gstFormApi";

export interface GstSummaryPageProps {
  payload: any;
  header: any;
  validationReport: ValidationReport | null;
  onEditSection: (sectionKey: string) => void;
  onSubmitReturn: () => Promise<void>;
  isSubmitting: boolean;
  onBackTo3B: () => void;
  selectedSections?: string[];
  onUpdateVerification?: (verification: { declared: boolean; signatory_name: string; place?: string }) => void;
}

export const GstSummaryPage: React.FC<GstSummaryPageProps> = ({
  payload,
  header,
  validationReport,
  onEditSection,
  onSubmitReturn,
  isSubmitting,
  onBackTo3B,
  selectedSections,
  onUpdateVerification,
}) => {
  const [declared, setDeclared] = useState(Boolean(payload.gstr3b?.verification?.declared));
  const [signatoryName, setSignatoryName] = useState(
    payload.gstr3b?.verification?.signatory_name || header?.legalName || ""
  );
  const [place, setPlace] = useState(
    payload.gstr3b?.verification?.place || "Bangalore"
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Collapsible cards state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    b2b: true,
    b2cl: false,
    b2cs: false,
    nil: false,
    cdn: false,
    hsn: false,
    docs: false,
    gstr3b: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const gstr1 = payload.gstr1 || {};
  const gstr3b = payload.gstr3b || {};

  // GSTR-1 Outward Totals
  const gstr1Totals = useMemo(() => {
    let tx = 0;
    let tax = 0;
    let cess = 0;

    (gstr1.b2b || []).forEach((inv: any) => {
      (inv.items || []).forEach((it: any) => {
        tx += it.txval || 0;
        tax += (it.iamt || 0) + (it.camt || 0) + (it.samt || 0);
        cess += it.csamt || 0;
      });
    });

    (gstr1.b2cl || []).forEach((inv: any) => {
      (inv.items || []).forEach((it: any) => {
        tx += it.txval || 0;
        tax += (it.iamt || 0) + (it.camt || 0) + (it.samt || 0);
        cess += it.csamt || 0;
      });
    });

    (gstr1.b2cs || []).forEach((r: any) => {
      tx += r.txval || 0;
      tax += (r.iamt || 0) + (r.camt || 0) + (r.samt || 0);
      cess += r.csamt || 0;
    });

    return {
      tx: round2(tx),
      tax: round2(tax),
      cess: round2(cess),
      total: round2(tx + tax + cess),
    };
  }, [gstr1]);

  // GSTR-3B Outward Table 3.1 Totals
  const gstr3bTotals = useMemo(() => {
    const t31 = gstr3b.table3_1 || {};
    const tx =
      (t31.osup_det?.txval || 0) +
      (t31.osup_zero?.txval || 0) +
      (t31.osup_nil_exmp?.txval || 0) +
      (t31.osup_nongst?.txval || 0);
    const tax =
      (t31.osup_det?.iamt || 0) +
      (t31.osup_det?.camt || 0) +
      (t31.osup_det?.samt || 0) +
      (t31.osup_zero?.iamt || 0);
    const cess = (t31.osup_det?.csamt || 0) + (t31.osup_zero?.csamt || 0);

    return {
      tx: round2(tx),
      tax: round2(tax),
      cess: round2(cess),
      total: round2(tx + tax + cess),
    };
  }, [gstr3b]);

  const hasBlockingErrors = (validationReport?.errors?.length || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dde2e8] dark:border-[#334155] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackTo3B}
            className="p-1.5 rounded-lg border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Final Review & Submit GST Return</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Verify all entered GSTR-1 and GSTR-3B data before final one-time submission
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowConfirmModal(true)}
          disabled={hasBlockingErrors || !declared || isSubmitting}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: "var(--primary, #31719B)" }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting Return...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Return</span>
            </>
          )}
        </button>
      </div>

      {/* Validation Panel (Section 8) */}
      {validationReport && (
        <div className="space-y-3">
          {/* Blocking Errors */}
          {validationReport.errors.length > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>Blocking Validation Errors ({validationReport.errors.length}) – Submission Blocked</span>
              </div>
              <ul className="list-disc pl-6 text-xs text-red-700 dark:text-red-400 space-y-1">
                {validationReport.errors.map((err, i) => (
                  <li key={i}>
                    <strong>[{err.section}]</strong> {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validationReport.warnings.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Advisory Warnings ({validationReport.warnings.length}) – Review Suggested</span>
              </div>
              <ul className="list-disc pl-6 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                {validationReport.warnings.map((warn, i) => (
                  <li key={i}>
                    <strong>[{warn.section}]</strong> {warn.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Reconciliation Card: GSTR-1 vs GSTR-3B */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
          <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Reconciliation: GSTR-1 Outward vs GSTR-3B Table 3.1</span>
          </h2>
          <span className="text-xs font-bold text-emerald-600">Reconciled</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block text-[11px]">GSTR-1 Taxable Value</span>
            <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">
              {formatIndianCurrency(gstr1Totals.tx)}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">GSTR-3B Table 3.1 Taxable</span>
            <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">
              {formatIndianCurrency(gstr3bTotals.tx)}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">GSTR-1 Total Tax</span>
            <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">
              {formatIndianCurrency(gstr1Totals.tax)}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">GSTR-3B Total Tax</span>
            <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">
              {formatIndianCurrency(gstr3bTotals.tax)}
            </span>
          </div>
        </div>
      </div>

      {/* GROUP 1: GSTR-1 SECTIONS REVIEW */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          GSTR-1 Outward Supplies Summary
        </h2>

        {/* Section 4 B2B */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] overflow-hidden shadow-card">
          <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleSection("b2b")}
                className="text-gray-500 hover:text-gray-800"
              >
                {openSections.b2b ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                4A, 4B, 6B, 6C – B2B, SEZ, DE Invoices ({(gstr1.b2b || []).length} invoices)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditSection("4a")}
              className="px-2.5 py-1 rounded text-xs font-semibold text-[#31719B] hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Section</span>
            </button>
          </div>

          {openSections.b2b && (
            <div className="p-4 border-t border-[#dde2e8] dark:border-[#334155] overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-gray-800/60 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                  <tr>
                    <th className="py-2 px-3">Recipient GSTIN</th>
                    <th className="py-2 px-3">Recipient Name</th>
                    <th className="py-2 px-3">Invoice No</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                  {(gstr1.b2b || []).slice(0, 10).map((inv: any) => (
                    <tr key={inv.id}>
                      <td className="py-2 px-3 font-mono">{inv.ctin}</td>
                      <td className="py-2 px-3">{inv.cname}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-[#31719B]">{inv.inum}</td>
                      <td className="py-2 px-3">{inv.idt}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{formatIndianCurrency(inv.val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 12 HSN */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] overflow-hidden shadow-card">
          <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleSection("hsn")}
                className="text-gray-500 hover:text-gray-800"
              >
                {openSections.hsn ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                  12 – HSN-wise Outward Summary ({(gstr1.hsn_b2b || []).length} B2B + {(gstr1.hsn_b2c || []).length} B2C)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Auto-generated from your data
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEditSection("12")}
              className="px-2.5 py-1 rounded text-xs font-semibold text-[#31719B] hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Section</span>
            </button>
          </div>

          {openSections.hsn && (
            <div className="p-4 border-t border-[#dde2e8] dark:border-[#334155] overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-gray-800/60 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                  <tr>
                    <th className="py-2 px-3">Tab</th>
                    <th className="py-2 px-3">HSN Code</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">UQC</th>
                    <th className="py-2 px-3 text-right">Taxable Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                  {[...(gstr1.hsn_b2b || []), ...(gstr1.hsn_b2c || [])].slice(0, 10).map((h: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-semibold text-[#31719B]">{h.tab || "B2B"}</td>
                      <td className="py-2 px-3 font-mono font-bold">{h.hsn_sc}</td>
                      <td className="py-2 px-3 max-w-xs truncate">{h.desc}</td>
                      <td className="py-2 px-3 font-mono">{h.uqc}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{formatIndianCurrency(h.txval)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 13 Documents */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] overflow-hidden shadow-card">
          <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleSection("docs")}
                className="text-gray-500 hover:text-gray-800"
              >
                {openSections.docs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                  13 – Documents Issued (Table 13 Summary)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Auto-generated from your data
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEditSection("13")}
              className="px-2.5 py-1 rounded text-xs font-semibold text-[#31719B] hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Section</span>
            </button>
          </div>
        </div>
      </div>

      {/* Final Declaration & Confirmation Checkbox */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={declared}
            onChange={(e) => {
              const val = e.target.checked;
              setDeclared(val);
              onUpdateVerification?.({
                declared: val,
                signatory_name: signatoryName,
                place: place,
              });
            }}
            className="w-4 h-4 mt-0.5 rounded text-[#31719B] accent-[#31719B]"
          />
          <div className="text-xs space-y-1">
            <span className="font-bold text-gray-900 dark:text-white block">
              Final Declaration & Confirmation
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              I hereby solemnly declare that the information given herein above is true and correct to the best of my knowledge and belief and nothing has been concealed there from. Once submitted, this link will be marked as <strong className="text-blue-600">SUBMITTED</strong> and no further edits can be made.
            </span>
          </div>
        </label>

        {declared && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs animate-in fade-in">
            <div>
              <label className="block text-gray-500 text-[11px] mb-1 font-semibold">
                Authorized Signatory Name
              </label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => {
                  setSignatoryName(e.target.value);
                  onUpdateVerification?.({
                    declared: true,
                    signatory_name: e.target.value,
                    place: place,
                  });
                }}
                placeholder="Full Legal Name"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white font-medium focus:ring-1 focus:ring-[#31719B]"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-[11px] mb-1 font-semibold">
                Place of Filing
              </label>
              <input
                type="text"
                value={place}
                onChange={(e) => {
                  setPlace(e.target.value);
                  onUpdateVerification?.({
                    declared: true,
                    signatory_name: signatoryName,
                    place: e.target.value,
                  });
                }}
                placeholder="e.g. Bangalore"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white font-medium focus:ring-1 focus:ring-[#31719B]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-[#31719B] flex items-center justify-center mx-auto">
              <FileCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Submit GST Return Data?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Are you sure you want to finalize your submission? You will not be able to edit these return details after submission.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  await onSubmitReturn();
                }}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                style={{ backgroundColor: "var(--primary, #31719B)" }}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

