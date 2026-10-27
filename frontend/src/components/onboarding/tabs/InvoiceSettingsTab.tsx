"use client";

import React from "react";
import {
  FileText,
  Info,
  ChevronLeft,
  ChevronRight,
  Hash,
  Sliders,
  FileCheck2,
  Calendar,
} from "lucide-react";

export interface InvoiceSettingsTabProps {
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
  defaultInvoiceNote: string;
  setDefaultInvoiceNote: (val: string) => void;
  termsAndConditions?: string;
  setTermsAndConditions?: (val: string) => void;
  defaultDueDays?: string;
  setDefaultDueDays?: (val: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const InvoiceSettingsTab: React.FC<InvoiceSettingsTabProps> = ({
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
  defaultInvoiceNote,
  setDefaultInvoiceNote,
  termsAndConditions = "1. Interest @ 18% p.a. will be levied on overdue payments.\n2. All disputes are subject to local jurisdiction.\n3. Payment should be made in favor of our primary bank account or via UPI.",
  setTermsAndConditions,
  defaultDueDays = "15",
  setDefaultDueDays,
  onPrevious,
  onNext,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--primary)]" />
          <span>Document & Invoice Settings</span>
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Configure automated numbering sequences, table column visibility, and legal terms on invoices.
        </p>
      </div>

      {/* 1. Invoice Number Generation Mode */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-xs font-bold text-[var(--text-main)]">
              Invoice Number Generation
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
              <input
                type="radio"
                name="inv_gen_mode"
                checked={invoiceGenMode === "Automatically"}
                onChange={() => setInvoiceGenMode("Automatically")}
                className="text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
              />
              <span>Automatically</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
              <input
                type="radio"
                name="inv_gen_mode"
                checked={invoiceGenMode === "Manually"}
                onChange={() => setInvoiceGenMode("Manually")}
                className="text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
              />
              <span>Manually</span>
            </label>
          </div>
        </div>

        {/* Invoice Format Inputs */}
        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <span className="block text-[11px] font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
            Sequential Numbering Format
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Prefix <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="MA"
                className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] uppercase"
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
                placeholder="2024-25"
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
                Next Invoice Preview
              </label>
              <div className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-blue-50/60 dark:bg-blue-950/20 text-xs font-mono font-bold text-[var(--primary)] dark:text-blue-300 flex items-center justify-between">
                <span>
                  {invoicePrefix}/{invoiceFY}/{invoiceNextNum}
                </span>
                <span className="text-[10px] uppercase font-sans font-semibold opacity-70">
                  Sample
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Details to show on the invoice */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-xs font-bold text-[var(--text-main)]">
            Invoice Table Column Visibility
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Quantity Toggle */}
          <div className="p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--text-main)] block">
                Item Quantity Column
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Useful when billing hours, service units, or audit sessions.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuantity(!showQuantity)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showQuantity ? "bg-[var(--primary)]" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showQuantity ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* HSN/SAC Toggle */}
          <div className="p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--text-main)] block">
                HSN / SAC Code Column
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Required for statutory GST compliance (e.g. 998211, 998231).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowHsnSac(!showHsnSac)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showHsnSac ? "bg-[var(--primary)]" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showHsnSac ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Due Date & Payment Term */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-xs font-bold text-[var(--text-main)]">
            Default Payment Term
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Invoice Due Date Window
            </label>
            <select
              value={defaultDueDays}
              onChange={(e) => setDefaultDueDays?.(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="0">Due Upon Receipt (Immediate)</option>
              <option value="7">Net 7 Days</option>
              <option value="15">Net 15 Days (Recommended for CA Practices)</option>
              <option value="30">Net 30 Days</option>
              <option value="45">Net 45 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Default Invoice Note & Terms & Conditions */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <div>
          <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
            Default Invoice Note
          </label>
          <textarea
            rows={2}
            value={defaultInvoiceNote}
            onChange={(e) => setDefaultInvoiceNote(e.target.value)}
            placeholder="Type default note visible to client on the bottom of the invoice..."
            className="w-full p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
            Standard Terms & Conditions
          </label>
          <textarea
            rows={3}
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions?.(e.target.value)}
            placeholder="Legal terms, bank transfer conditions, jurisdiction..."
            className="w-full p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous: Branding</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>Next: Invoice Sharing</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
