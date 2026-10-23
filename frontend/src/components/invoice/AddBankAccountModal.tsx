"use client";

import React, { useState } from 'react';
import { X, Building } from 'lucide-react';
import { BankAccount, PaymentMethod, AccountType } from './types';
import { useInvoice } from './InvoiceContext';

interface AddBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (account: BankAccount) => void;
}

export const AddBankAccountModal: React.FC<AddBankAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addBankAccount } = useInvoice();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [bankName, setBankName] = useState('');
  const [accountBusinessName, setAccountBusinessName] = useState('Krishna Associates');
  const [ifscCode, setIfscCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Current');
  const [upi, setUpi] = useState('');
  const [description, setDescription] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountBusinessName.trim() || !ifscCode.trim() || !accountNumber.trim()) {
      setError('Please fill in all required fields marked with *');
      return;
    }

    const created = addBankAccount({
      bankName: bankName.trim(),
      accountBusinessName: accountBusinessName.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      accountNumber: accountNumber.trim(),
      branchAddress: branchAddress.trim(),
      accountType,
      paymentMethod,
      upi: upi.trim() || undefined,
      description: description.trim() || undefined,
      isPrimary,
      currencyCode: 'INR',
    });

    onSuccess?.(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e5e7eb] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-[#3D6A9E]" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Add Bank Account
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Payment Method */}
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            {/* Account Type */}
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Type *
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
              >
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
                <option value="Over Draft">Over Draft</option>
              </select>
            </div>

            {/* Bank Name */}
            <div className="sm:col-span-2">
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
              />
            </div>

            {/* Account Business Name */}
            <div className="sm:col-span-2">
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Business Name *
              </label>
              <input
                type="text"
                value={accountBusinessName}
                onChange={(e) => setAccountBusinessName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Number *
              </label>
              <input
                type="text"
                placeholder="Enter account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                IFSC Code *
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0000214"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
              />
            </div>

            {/* Branch Address */}
            <div className="sm:col-span-2">
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Branch Address *
              </label>
              <input
                type="text"
                placeholder="Branch address / locality"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
              />
            </div>

            {/* UPI ID */}
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                UPI ID (Optional)
              </label>
              <input
                type="text"
                placeholder="username@bank"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
              />
            </div>

            {/* Primary Checkbox */}
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4 rounded text-[#3D6A9E] focus:ring-[#3D6A9E] cursor-pointer"
              />
              <label htmlFor="isPrimary" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                Mark as Primary Account
              </label>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Additional account details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e7eb] dark:border-[#334155]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#0f172a] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#3D6A9E] hover:bg-[#685dd8] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
