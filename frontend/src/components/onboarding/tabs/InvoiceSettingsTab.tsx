"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Info, MoreVertical, ChevronLeft, ChevronRight, Upload } from "lucide-react";

export interface InvoiceSettingsTabProps {
  accountBusinessName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  accountType: string;
  invoiceGenMode: "Automatically" | "Manually";
  setInvoiceGenMode: (val: "Automatically" | "Manually") => void;
  invoicePrefix: string;
  setInvoicePrefix: (val: string) => void;
  invoiceFY: string;
  setInvoiceFY: (val: string) => void;
  invoiceNextNum: string;
  setInvoiceNextNum: (val: string) => void;
  showQuantity: boolean;
  setShowQuantity: (val: boolean) => void;
  showHsnSac: boolean;
  setShowHsnSac: (val: boolean) => void;
  invoiceSignatureUrl: string | null;
  setInvoiceSignatureUrl: (val: string | null) => void;
  defaultInvoiceNote: string;
  setDefaultInvoiceNote: (val: string) => void;
  autoReminder: boolean;
  setAutoReminder: (val: boolean) => void;
  ccInvoiceMail: string;
  setCcInvoiceMail: (val: string) => void;
  onPrevious: () => void;
  onSkip: () => void;
  onNext: () => void;
}

export const InvoiceSettingsTab: React.FC<InvoiceSettingsTabProps> = ({
  accountBusinessName,
  bankName,
  accountNumber,
  ifscCode,
  upiId,
  accountType,
  invoiceGenMode,
  setInvoiceGenMode,
  invoicePrefix,
  setInvoicePrefix,
  invoiceFY,
  setInvoiceFY,
  invoiceNextNum,
  setInvoiceNextNum,
  showQuantity,
  setShowQuantity,
  showHsnSac,
  setShowHsnSac,
  invoiceSignatureUrl,
  setInvoiceSignatureUrl,
  defaultInvoiceNote,
  setDefaultInvoiceNote,
  autoReminder,
  setAutoReminder,
  ccInvoiceMail,
  setCcInvoiceMail,
  onPrevious,
  onSkip,
  onNext,
}) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-[var(--text-main)]">Invoice Settings</h3>
        <h4 className="text-xs font-semibold text-[var(--text-muted)] mt-1 uppercase tracking-wider">
          Bank Accounts
        </h4>
      </div>

      {/* Bank Accounts Table */}
      <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[var(--bg-hover)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-semibold">
            <tr>
              <th className="py-3 px-4">Account Business Name</th>
              <th className="py-3 px-4">Bank Name</th>
              <th className="py-3 px-4">Account No</th>
              <th className="py-3 px-4">IFSC Code</th>
              <th className="py-3 px-4">UPI</th>
              <th className="py-3 px-4">Account Type</th>
              <th className="py-3 px-4 text-center">Primary</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <tr>
              <td className="py-3.5 px-4 font-medium text-[var(--text-main)]">
                {accountBusinessName || "Primary Operating Account"}
              </td>
              <td className="py-3.5 px-4 text-[var(--text-main)]">
                {bankName || "ICICI Bank"}
              </td>
              <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                {accountNumber || "025201537599"}
              </td>
              <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                {ifscCode || "ICIC0000252"}
              </td>
              <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                {upiId || "kidmoras@okicici"}
              </td>
              <td className="py-3.5 px-4">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-[var(--primary)] dark:text-[#60a5fa] border border-blue-200 dark:border-blue-800">
                  {accountType}
                </span>
              </td>
              <td className="py-3.5 px-4 text-center">
                <input
                  type="radio"
                  name="primary_account"
                  defaultChecked
                  className="w-4 h-4 text-[var(--primary)] accent-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                />
              </td>
              <td className="py-3.5 px-4 text-right">
                <button
                  type="button"
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <MoreVertical className="w-4 h-4 inline" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Table Footer */}
        <div className="py-2.5 px-4 bg-[var(--bg-hover)] border-t border-[var(--border-subtle)] flex items-center justify-end gap-4 text-xs text-[var(--text-muted)]">
          <span>Rows per page: 50 ▾</span>
          <span>1-1 of 1</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled className="p-1 opacity-50 cursor-not-allowed">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button type="button" disabled className="p-1 opacity-50 cursor-not-allowed">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Number Generation */}
      <div className="space-y-4 pt-3">
        <div className="flex items-center gap-6">
          <span className="text-[13px] font-semibold text-[var(--text-main)]">
            Invoice Number Generated By
          </span>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--text-main)]">
            <input
              type="radio"
              name="inv_gen"
              checked={invoiceGenMode === "Automatically"}
              onChange={() => setInvoiceGenMode("Automatically")}
              className="text-[var(--primary)] accent-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span>Automatically</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--text-main)]">
            <input
              type="radio"
              name="inv_gen"
              checked={invoiceGenMode === "Manually"}
              onChange={() => setInvoiceGenMode("Manually")}
              className="text-[var(--primary)] accent-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span>Manually</span>
          </label>
          <Info className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        </div>

        {/* Invoice Format Inputs */}
        <div>
          <span className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
            Invoice Format
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Prefix <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="MA"
                className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Financial Year
              </label>
              <input
                type="text"
                value={invoiceFY}
                onChange={(e) => setInvoiceFY(e.target.value)}
                placeholder="25-26"
                className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Next Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNextNum}
                onChange={(e) => setInvoiceNextNum(e.target.value)}
                placeholder="001"
                className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Invoice number preview
              </label>
              <div className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] text-xs font-mono font-bold text-[var(--text-main)] flex items-center">
                {invoicePrefix}/{invoiceFY}/{invoiceNextNum}
              </div>
            </div>
          </div>
        </div>

        {/* Details to show in the invoice */}
        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
          <span className="block text-xs font-semibold text-[var(--text-muted)]">
            Details to show in the invoice
          </span>
          <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--text-main)]">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <span>Quantity</span>
              <button
                type="button"
                onClick={() => setShowQuantity(!showQuantity)}
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showQuantity ? "bg-[var(--primary)]" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showQuantity ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <span>HSN/SAC Code</span>
              <button
                type="button"
                onClick={() => setShowHsnSac(!showHsnSac)}
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showHsnSac ? "bg-[var(--primary)]" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showHsnSac ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Invoice Signature Upload */}
        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
          <span className="block text-xs font-semibold text-[var(--text-muted)]">
            Invoice Signature
          </span>
          <div className="flex items-start gap-4">
            <label className="px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[var(--primary)] dark:text-[#60a5fa] text-xs font-semibold flex items-center gap-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Signature</span>
              <input
                type="file"
                accept="image/png, image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setInvoiceSignatureUrl(url);
                  }
                }}
              />
            </label>

            <div className="w-20 h-16 rounded-lg border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-hover)] flex items-center justify-center overflow-hidden">
              {invoiceSignatureUrl ? (
                <img
                  src={invoiceSignatureUrl}
                  alt="Signature Preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-[var(--text-muted)] text-center px-1">
                  Preview
                </span>
              )}
            </div>
          </div>
          <span className="block text-[11px] text-[var(--text-muted)]">
            Max File Size: 1MB (JPG or PNG)
          </span>
        </div>

        {/* Default Invoice Note */}
        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
            Default Invoice Note
          </label>
          <textarea
            rows={3}
            value={defaultInvoiceNote}
            onChange={(e) => setDefaultInvoiceNote(e.target.value)}
            placeholder="Type Invoice Note"
            className="w-full p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
          />
        </div>

        {/* Set CC to Invoice Mail */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Set Automatic Reminder{" "}
              <Info className="w-3 h-3 inline text-[var(--text-muted)]" />
            </label>
            <select
              value={autoReminder ? "Yes" : "No"}
              onChange={(e) => setAutoReminder(e.target.value === "Yes")}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="No">Disabled</option>
              <option value="Yes">Send 3 days before due date</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Set CC to Invoice Mail
            </label>
            <input
              type="email"
              value={ccInvoiceMail}
              onChange={(e) => setCcInvoiceMail(e.target.value)}
              placeholder="accounts@firm.com"
              className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* Step 3 Actions */}
      <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          Previous
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-sm font-semibold text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Save & Next</span>
          </button>
        </div>
      </div>
    </div>
  );
};
