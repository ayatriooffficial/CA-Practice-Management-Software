"use client";

import React from "react";
import { useRouter } from "next/navigation";

export interface BankAccountTabProps {
  bankName: string;
  setBankName: (val: string) => void;
  accountBusinessName: string;
  setAccountBusinessName: (val: string) => void;
  ifscCode: string;
  setIfscCode: (val: string) => void;
  accountNumber: string;
  setAccountNumber: (val: string) => void;
  branchAddress: string;
  setBranchAddress: (val: string) => void;
  accountType: string;
  setAccountType: (val: string) => void;
  bankDescription: string;
  setBankDescription: (val: string) => void;
  upiId: string;
  setUpiId: (val: string) => void;
  isSaving: boolean;
  onPrevious: () => void;
  onSkip: () => void;
  onSave: () => void;
}

export const BankAccountTab: React.FC<BankAccountTabProps> = ({
  bankName,
  setBankName,
  accountBusinessName,
  setAccountBusinessName,
  ifscCode,
  setIfscCode,
  accountNumber,
  setAccountNumber,
  branchAddress,
  setBranchAddress,
  accountType,
  setAccountType,
  bankDescription,
  setBankDescription,
  upiId,
  setUpiId,
  isSaving,
  onPrevious,
  onSkip,
  onSave,
}) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Row 1 */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Bank Name"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Account Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={accountBusinessName}
            onChange={(e) => setAccountBusinessName(e.target.value)}
            placeholder="Account Business Name"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
            placeholder="IFSC Code"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        {/* Row 2 */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Account Number"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Branch Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={branchAddress}
            onChange={(e) => setBranchAddress(e.target.value)}
            placeholder="Branch Address"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Account Type <span className="text-red-500">*</span>
          </label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          >
            <option value="Savings">Savings</option>
            <option value="Current">Current</option>
            <option value="Cash Credit">Cash Credit</option>
            <option value="Overdraft">Overdraft</option>
          </select>
        </div>

        {/* Row 3 */}
        <div className="md:col-span-2">
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Description
          </label>
          <input
            type="text"
            value={bankDescription}
            onChange={(e) => setBankDescription(e.target.value)}
            placeholder="Description"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            UPI
          </label>
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="UPI"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>
      </div>

      {/* Step 2 Actions */}
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
            disabled={isSaving}
            onClick={onSave}
            className="px-6 py-2.5 rounded-lg bg-[#635BFF] hover:bg-[#5349e0] text-sm font-semibold text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>Save & Next</span>
          </button>
        </div>
      </div>
    </div>
  );
};
