"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Check, AlertCircle } from 'lucide-react';
import { PaymentMethod, ReceiptRecord } from './types';
import { FIRM_DETAILS, MOCK_CLIENTS_LIST } from './mockData';
import { useInvoice } from './InvoiceContext';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit' | 'view';
  initialData?: ReceiptRecord;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  mode = 'create',
  initialData,
}) => {
  const { invoices, reimbursements, bankAccounts, addReceipt, updateReceipt } = useInvoice();

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const [activeModalTab, setActiveModalTab] = useState<'invoice' | 'reimbursement' | 'opening'>(
    'invoice'
  );

  // Form Fields
  const [clientId, setClientId] = useState<string>(initialData?.clientId || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(initialData?.amount || 0);
  const [billingOrg, setBillingOrg] = useState<string>(initialData?.billingOrg || FIRM_DETAILS.name);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.method || 'Bank Transfer');
  const [bankAccountId, setBankAccountId] = useState<string>(initialData?.bankAccountId || bankAccounts[0]?.id || '');
  const [paymentDate, setPaymentDate] = useState<string>(initialData?.paymentDate || '19/10/2026');
  const [referenceNumber, setReferenceNumber] = useState<string>(initialData?.referenceNumber || '');
  const [notes, setNotes] = useState<string>(initialData?.notes || '');

  // Allocation mapping: { [invoiceId]: number }
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (initialData && isOpen) {
      setClientId(initialData.clientId);
      setPaymentAmount(initialData.amount);
      setBillingOrg(initialData.billingOrg || FIRM_DETAILS.name);
      setPaymentMethod(initialData.method || 'Bank Transfer');
      setBankAccountId(initialData.bankAccountId || bankAccounts[0]?.id || '');
      setPaymentDate(initialData.paymentDate || '19/10/2026');
      setReferenceNumber(initialData.referenceNumber || '');
      setNotes(initialData.notes || '');
      if (initialData.invoiceId) {
        setAllocations({ [initialData.invoiceId]: initialData.amount });
      }
    } else if (!isOpen) {
      setAllocations({});
    }
  }, [initialData, isOpen, bankAccounts]);

  const selectedClient =
    MOCK_CLIENTS_LIST.find((c) => c.id === clientId) ||
    (initialData
      ? {
          id: initialData.clientId,
          businessName: initialData.businessName,
          legalName: initialData.legalName || initialData.businessName,
          group: initialData.group || 'Clients',
          pan: '',
          gstin: '',
          address: '',
          placeOfSupply: '27-Maharashtra',
        }
      : undefined);
  const selectedBank = bankAccounts.find((b) => b.id === bankAccountId) || bankAccounts[0];

  // Pending documents for the selected client
  const pendingInvoices = useMemo(() => {
    if (!clientId) return [];
    if (activeModalTab === 'invoice') {
      return invoices.filter(
        (i) => i.clientId === clientId && (i.status === 'Receivable' || i.status === 'Partially Paid' || i.status === 'Overdue' || i.status === 'Pending')
      );
    }
    if (activeModalTab === 'reimbursement') {
      return reimbursements.filter(
        (r) => r.clientId === clientId && (r.status === 'Receivable' || r.status === 'Partially Paid')
      );
    }
    return [];
  }, [clientId, activeModalTab, invoices, reimbursements]);

  // Compute allocated sum & advance
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [allocations]);

  const advanceRemainder = Math.max(0, paymentAmount - totalAllocated);

  const handleAllocationChange = (docId: string, maxAmount: number, valueStr: string) => {
    const val = Number(valueStr) || 0;
    const clamped = Math.min(val, maxAmount);
    setAllocations((prev) => ({
      ...prev,
      [docId]: clamped,
    }));
  };

  const handleAutoAllocate = () => {
    let remaining = paymentAmount;
    const newAlloc: Record<string, number> = {};

    for (const doc of pendingInvoices) {
      if (remaining <= 0) break;
      const allocAmount = Math.min(doc.balanceAmount, remaining);
      newAlloc[doc.id] = allocAmount;
      remaining -= allocAmount;
    }
    setAllocations(newAlloc);
  };

  const isValid = clientId && paymentAmount > 0 && bankAccountId;

  const handleSave = () => {
    if (!isValid || !selectedClient) return;

    const allocationList: { id: string; amount: number; type: 'invoice' | 'reimbursement' }[] = [];
    Object.entries(allocations).forEach(([id, amt]) => {
      if (amt > 0) {
        allocationList.push({
          id,
          amount: amt,
          type: activeModalTab === 'reimbursement' ? 'reimbursement' : 'invoice',
        });
      }
    });

    if (isView) return;
    if (isEdit && initialData) {
      updateReceipt(initialData.id, {
        billingOrg,
        amount: paymentAmount,
        paymentDate,
        method: paymentMethod,
        bankAccountId: selectedBank?.id || '',
        bankName: selectedBank?.bankName || 'HDFC Bank Ltd',
        referenceNumber: referenceNumber || initialData.referenceNumber,
        notes: notes || undefined,
      });
      onClose();
      return;
    }

    const firstAllocDocId = allocationList[0]?.id;
    const firstAllocDoc = pendingInvoices.find((d) => d.id === firstAllocDocId);

    addReceipt(
      {
        billingOrg,
        clientId: selectedClient.id,
        businessName: selectedClient.businessName,
        legalName: selectedClient.legalName,
        group: selectedClient.group,
        amount: paymentAmount,
        paymentDate,
        method: paymentMethod,
        bankAccountId: selectedBank?.id || '',
        bankName: selectedBank?.bankName || 'HDFC Bank Ltd',
        referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
        notes: notes || undefined,
        isAdvance: advanceRemainder > 0,
        invoiceId: firstAllocDoc?.id,
        invoiceNumber: firstAllocDoc?.number,
      },
      allocationList
    );

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl rounded-xl bg-white dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {isView
                ? `Receipt Details (${initialData?.receiptNo || ''})`
                : isEdit
                ? `Edit Receipt (${initialData?.receiptNo || ''})`
                : 'Record Payment'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Select a client, enter the amount, and allocate across pending invoices — or leave unallocated to record as Advance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Tabs */}
        <div className="px-6 border-b border-[#e5e7eb] dark:border-[#334155]">
          <div className="flex items-center gap-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveModalTab('invoice');
                setAllocations({});
              }}
              className={`py-2 relative cursor-pointer ${activeModalTab === 'invoice'
                  ? 'text-[#3D6A9E] font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <span>Proforma / Invoice</span>
              {activeModalTab === 'invoice' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3D6A9E]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModalTab('reimbursement');
                setAllocations({});
              }}
              className={`py-2 relative cursor-pointer ${activeModalTab === 'reimbursement'
                  ? 'text-[#3D6A9E] font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <span>Reimbursement</span>
              {activeModalTab === 'reimbursement' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3D6A9E]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModalTab('opening');
                setAllocations({});
              }}
              className={`py-2 relative cursor-pointer ${activeModalTab === 'opening'
                  ? 'text-[#3D6A9E] font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <span>Opening Balance</span>
              {activeModalTab === 'opening' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3D6A9E]" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Section: Payment Information */}
          <div className="space-y-3">
            <div className="font-semibold text-gray-800 dark:text-gray-200">
              Payment Information
            </div>

            {/* Row 1: Client, Amount, Billing Org, Method, Bank Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Client */}
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setAllocations({});
                  }}
                  className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E] cursor-pointer"
                >
                  <option value="">Select Client</option>
                  {MOCK_CLIENTS_LIST.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={paymentAmount === 0 ? '' : paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-semibold outline-none focus:border-[#3D6A9E]"
                />
              </div>

              {/* Billing Org */}
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">
                  Billing Org <span className="text-red-500">*</span>
                </label>
                <select
                  value={billingOrg}
                  onChange={(e) => setBillingOrg(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none"
                >
                  <option value={FIRM_DETAILS.name}>{FIRM_DETAILS.name}</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">
                  Bank Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} ({b.accountNumber.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Date, Ref, Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                  />
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  placeholder="REF-123456"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                />
              </div>
            </div>
          </div>

          {/* Section: Payment Allocation Panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {activeModalTab === 'reimbursement'
                  ? 'Reimbursement Allocation'
                  : 'Payment Allocation'}{' '}
                <span className="font-normal text-gray-500">
                  (Allocate the amount across pending {activeModalTab === 'reimbursement' ? 'reimbursements' : 'invoices'})
                </span>
              </span>

              {pendingInvoices.length > 0 && paymentAmount > 0 && (
                <button
                  type="button"
                  onClick={handleAutoAllocate}
                  className="text-xs text-[#3D6A9E] font-semibold hover:underline cursor-pointer"
                >
                  Auto-Allocate
                </button>
              )}
            </div>

            {/* Invoices list or Empty State */}
            {!clientId ? (
              <div className="rounded-lg border border-dashed border-[#dde2e8] dark:border-[#334155] py-12 text-center text-gray-400 dark:text-gray-500">
                Select a client to load their pending {activeModalTab === 'reimbursement' ? 'reimbursements' : 'invoices'}
              </div>
            ) : pendingInvoices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#dde2e8] dark:border-[#334155] py-8 text-center text-gray-500">
                No pending {activeModalTab === 'reimbursement' ? 'reimbursements' : 'invoices'} found for {selectedClient?.businessName}. Full payment will be recorded as Advance.
              </div>
            ) : (
              <div className="rounded-lg border border-[#dde2e8] dark:border-[#334155] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead style={{ backgroundColor: "var(--orange-havy-light)" }}>
                    <tr className="border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 font-semibold">
                      <th className="py-2.5 px-3 border-r border-[#dde2e8] dark:border-[#334155]">Doc #</th>
                      <th className="py-2.5 px-3 border-r border-[#dde2e8] dark:border-[#334155]">Date</th>
                      <th className="py-2.5 px-3 border-r border-[#dde2e8] dark:border-[#334155]">Total Value</th>
                      <th className="py-2.5 px-3 border-r border-[#dde2e8] dark:border-[#334155]">Balance Due</th>
                      <th className="py-2.5 px-3 w-36">Allocate Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                    {pendingInvoices.map((doc) => {
                      const currentAlloc = allocations[doc.id] || 0;

                      return (
                        <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0f172a]/50">
                          <td className="py-2 px-3 font-semibold text-[#31719B] dark:text-[#60a5fa] border-r border-[#dde2e8] dark:border-[#334155]">{doc.number}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-300 border-r border-[#dde2e8] dark:border-[#334155]">{doc.date}</td>
                          <td className="py-2 px-3 border-r border-[#dde2e8] dark:border-[#334155]">₹{doc.totalPayable.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 font-medium text-red-600 border-r border-[#dde2e8] dark:border-[#334155]">₹{doc.balanceAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min={0}
                              max={doc.balanceAmount}
                              value={currentAlloc === 0 ? '' : currentAlloc}
                              onChange={(e) => handleAllocationChange(doc.id, doc.balanceAmount, e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-semibold outline-none focus:border-[#31719B]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Allocation Totals Summary */}
            {clientId && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] text-xs">
                <div>
                  <span className="text-gray-500">Allocated: </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    ₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Advance Balance: </span>
                  <span className={`font-bold ${advanceRemainder > 0 ? 'text-[#ea580c]' : 'text-green-600'}`}>
                    ₹{advanceRemainder.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#dde2e8] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            {isView ? 'Close' : 'Back'}
          </button>

          {!isView && (
            <button
              type="button"
              disabled={!isValid}
              onClick={handleSave}
              style={{ backgroundColor: 'var(--premium-blue-dark)' }}
              className="px-5 py-1.5 rounded-md text-white text-xs font-semibold shadow-xs hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {isEdit ? 'Update Receipt' : 'Save Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
