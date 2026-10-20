"use client";

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Building,
  FileText,
  FileEdit,
} from 'lucide-react';
import { ServiceItem } from './types';
import { FIRM_DETAILS, MOCK_CLIENTS_LIST, MOCK_SERVICES_CATALOG } from './mockData';
import { useInvoice } from './InvoiceContext';
import { AddBankAccountModal } from './AddBankAccountModal';

interface AddInvoiceFormProps {
  type: 'invoice' | 'proforma';
  onBack: () => void;
}

export const AddInvoiceForm: React.FC<AddInvoiceFormProps> = ({ type, onBack }) => {
  const { addInvoice, addProforma, bankAccounts } = useInvoice();

  const isProforma = type === 'proforma';
  const titlePrefix = isProforma ? 'Proforma' : 'Invoice';

  // Dates
  const todayFormatted = '19/10/2026';
  const [invoiceDate, setInvoiceDate] = useState(todayFormatted);
  const [dueDate, setDueDate] = useState(todayFormatted);

  // Client Selection (starts BLANK like real app)
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const selectedClient = MOCK_CLIENTS_LIST.find((c) => c.id === selectedClientId);

  // Bank Selection (starts UNSELECTED with placeholder like real app)
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

  // Services list (starts with 1 blank row)
  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'srv-1',
      serviceName: '',
      description: '',
      compliancePeriod: 'FY 2026-27',
      frequency: 'One-Time',
      periodLabel: 'N/A - One-Time',
      quantity: 1,
      price: 0,
      amount: 0,
      total: 0,
    },
  ]);

  // Note
  const [note, setNote] = useState('');

  // Calculations
  const subTotal = services.reduce((sum, s) => sum + s.amount, 0);
  const totalPayable = subTotal;

  // Handlers for Services
  const handleServiceChange = (id: string, field: keyof ServiceItem, value: any) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === 'quantity' || field === 'price') {
          const qty = field === 'quantity' ? Number(value) : s.quantity;
          const prc = field === 'price' ? Number(value) : s.price;
          updated.amount = (qty || 0) * (prc || 0);
          updated.total = updated.amount;
        }
        return updated;
      })
    );
  };

  const handleAddService = () => {
    setServices((prev) => [
      ...prev,
      {
        id: `srv-${Date.now()}`,
        serviceName: '',
        description: '',
        compliancePeriod: 'FY 2026-27',
        frequency: 'One-Time',
        periodLabel: 'N/A - One-Time',
        quantity: 1,
        price: 0,
        amount: 0,
        total: 0,
      },
    ]);
  };

  const handleAddReimbursementItem = () => {
    setServices((prev) => [
      ...prev,
      {
        id: `srv-${Date.now()}`,
        serviceName: 'Government ROC MCA Fees',
        description: '',
        compliancePeriod: 'FY 2026-27',
        frequency: 'One-Time',
        periodLabel: 'N/A - One-Time',
        quantity: 1,
        price: 0,
        amount: 0,
        total: 0,
        isReimbursement: true,
      },
    ]);
  };

  const handleRemoveService = (id: string) => {
    if (services.length > 1) {
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleSave = () => {
    if (!selectedClient) {
      alert('Please select a client to proceed.');
      return;
    }

    const payload = {
      date: invoiceDate,
      dueDate: dueDate,
      billingOrg: FIRM_DETAILS.name,
      billingAddress: FIRM_DETAILS.address,
      clientId: selectedClient.id,
      clientBusinessName: selectedClient.businessName,
      clientLegalName: selectedClient.legalName,
      clientGroup: selectedClient.group,
      clientGstin: selectedClient.gstin,
      clientAddress: selectedClient.address,
      clientPan: selectedClient.pan,
      services,
      subTotal,
      totalPayable,
      tdsExcludedAmount: subTotal,
      currency: 'INR',
      bankAccountId: selectedBankId,
      notes: note || undefined,
      placeOfSupply: selectedClient.placeOfSupply,
    };

    if (isProforma) {
      addProforma(payload);
    } else {
      addInvoice(payload);
    }

    onBack();
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] p-4 sm:p-6 lg:p-8 select-none text-gray-800 dark:text-gray-200 transition-colors">
      {/* Outer Single White Card Shell as an explicit flex column with 32px gap */}
      <div className="w-full bg-white dark:bg-[#1e293b] rounded-xl border border-[#e5e7eb] dark:border-[#334155] shadow-xs p-7 sm:p-9 flex flex-col gap-8">
        
        {/* Section 1: Top Breadcrumb & Square Bordered Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-[#f1f5f9] dark:border-[#334155]/60">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <button
              type="button"
              onClick={onBack}
              className="text-[#7367F0] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>‹ {titlePrefix} List</span>
            </button>
            <span className="text-gray-400">›</span>
            <span className="text-gray-900 dark:text-white font-bold">Add {titlePrefix}</span>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded border border-[#dde2e8] dark:border-[#475569] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#0f172a] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 2: Header Block: Left Avatar & Right Vertically Stacked Number & Dates */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 sm:gap-8">
          {/* Large KA Circular Avatar */}
          <div className="w-20 h-20 rounded-full bg-[#eeedfd] dark:bg-[#7367F0]/20 flex items-center justify-center text-[#7367F0] text-3xl font-bold tracking-tight shadow-xs shrink-0">
            KA
          </div>

          {/* Dedicated Right Column: Vertically Stacked No, Date, Due Date with 20px gap */}
          <div className="w-full sm:w-72 md:w-80 flex flex-col gap-5">
            {/* Number (Read-only grey input box) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {titlePrefix} No
              </label>
              <input
                type="text"
                disabled
                placeholder="Auto-generated"
                className="w-full h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-gray-100 dark:bg-gray-800/60 text-xs text-gray-500 cursor-not-allowed outline-none"
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {titlePrefix} Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full h-10 pl-3.5 pr-9 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Due Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 pl-3.5 pr-9 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Two Roomy Cards: Billing Organization vs Proforma/Invoice To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: Billing Organization */}
          <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-6 sm:p-7 flex flex-col gap-4 shadow-2xs">
            <div className="flex flex-col gap-3.5">
              <label className="text-sm font-semibold text-gray-900 dark:text-white">
                Billing Organization <span className="font-normal text-gray-500 text-xs">(Your details)</span>
              </label>

              <select
                disabled
                value={FIRM_DETAILS.name}
                className="w-full h-11 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-gray-50 dark:bg-[#0f172a] text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value={FIRM_DETAILS.name}>{FIRM_DETAILS.name}</option>
              </select>
            </div>

            {/* Business Details Panel */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] p-6 text-xs flex flex-col gap-3.5 bg-[#f9fafb] dark:bg-[#0f172a]/50">
              <div className="font-bold text-gray-900 dark:text-white text-xs">
                Business Details
              </div>
              <div className="flex items-start">
                <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Business Name</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{FIRM_DETAILS.name}</span>
              </div>
              <div className="flex items-start">
                <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Address</span>
                <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{FIRM_DETAILS.address}</span>
              </div>
              <div className="flex items-center pt-2 border-b border-dotted border-gray-300 dark:border-gray-700 pb-3">
                <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Priority</span>
                <span className="px-2.5 py-0.5 rounded border border-[#7367F0] text-[#7367F0] bg-white dark:bg-[#1e293b] text-xs font-semibold">
                  {FIRM_DETAILS.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Client Organization */}
          <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-6 sm:p-7 flex flex-col gap-4 shadow-2xs">
            <div className="flex flex-col gap-3.5">
              <label className="text-sm font-semibold text-gray-900 dark:text-white">
                {titlePrefix} To <span className="font-normal text-gray-500 text-xs">(Client's details)</span>
              </label>

              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#7367F0] cursor-pointer"
              >
                <option value="">Select Client/Business from list</option>
                {MOCK_CLIENTS_LIST.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.businessName} ({client.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Client Details Panel or Centered Placeholder */}
            {selectedClient ? (
              <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] p-6 text-xs flex flex-col gap-3.5 bg-[#f9fafb] dark:bg-[#0f172a]/50 animate-in fade-in duration-100">
                <div className="flex justify-between items-center pb-1">
                  <span className="font-bold text-gray-900 dark:text-white">Client Details</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-[#7367F0] font-semibold">
                    {selectedClient.group}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Legal Name</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedClient.legalName}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">GSTIN</span>
                  <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{selectedClient.gstin}</span>
                </div>
                <div className="flex items-start border-b border-dotted border-gray-300 dark:border-gray-700 pb-3">
                  <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Address</span>
                  <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedClient.address}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#dde2e8] dark:border-[#334155] py-14 px-6 text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center min-h-[160px]">
                Select Client/Business from list
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Services Table Section with Taller Purple Header */}
        <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden shadow-xs flex flex-col">
          {/* Taller Purple Header Bar */}
          <div className="bg-[#6366f1] text-white px-6 py-3.5 grid grid-cols-12 gap-3 text-xs font-semibold tracking-tight items-center">
            <div className="col-span-5">Services</div>
            <div className="col-span-2 text-center">Quantity</div>
            <div className="col-span-2 text-center">Price</div>
            <div className="col-span-2 text-center">Amount</div>
            <div className="col-span-1 text-right">Total</div>
          </div>

          {/* Service Rows (20px top padding from purple header, 20px gap between rows) */}
          <div className="flex flex-col divide-y divide-[#e5e7eb] dark:divide-[#334155] p-6 gap-5">
            {services.map((srv) => (
              <div key={srv.id} className="pt-5 first:pt-0 flex flex-col gap-4">
                {/* Main Row */}
                <div className="grid grid-cols-12 gap-3 items-center text-xs">
                  {/* Service Name Dropdown */}
                  <div className="col-span-5">
                    <select
                      value={srv.serviceName}
                      onChange={(e) => handleServiceChange(srv.id, 'serviceName', e.target.value)}
                      className="w-full h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#7367F0]"
                    >
                      <option value="">Service Name</option>
                      {MOCK_SERVICES_CATALOG.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={srv.quantity}
                      onChange={(e) => handleServiceChange(srv.id, 'quantity', e.target.value)}
                      className="w-full h-10 text-center px-2 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                    />
                  </div>

                  {/* Price (Empty by default) */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      placeholder=""
                      value={srv.price === 0 ? '' : srv.price}
                      onChange={(e) => handleServiceChange(srv.id, 'price', e.target.value)}
                      className="w-full h-10 text-center px-2 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                    />
                  </div>

                  {/* Amount (read-only) */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      disabled
                      value={srv.amount === 0 ? '0' : srv.amount}
                      className="w-full h-10 text-center px-2 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 outline-none"
                    />
                  </div>

                  {/* Total & Trash */}
                  <div className="col-span-1 flex items-center justify-end gap-2 font-bold text-gray-900 dark:text-white">
                    <span>₹{srv.total.toFixed(2)}</span>
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveService(srv.id)}
                        className="text-red-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="Delete Service Row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-Row: Description (with 0/300 counter) + Compliance Period */}
                <div className="grid grid-cols-12 gap-4 items-start text-xs pt-1">
                  {/* Description Input with 8px label gap and 6px counter gap */}
                  <div className="col-span-5 flex flex-col gap-2">
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                      Description
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="text"
                        maxLength={300}
                        placeholder="Description"
                        value={srv.description}
                        onChange={(e) => handleServiceChange(srv.id, 'description', e.target.value)}
                        className="w-full h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                      />
                      <span className="text-[10px] text-gray-400 text-right">
                        {srv.description.length}/300
                      </span>
                    </div>
                  </div>

                  {/* Compliance Period Selects */}
                  <div className="col-span-7 flex flex-col gap-2">
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                      Compliance Period
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <select
                        value={srv.compliancePeriod}
                        onChange={(e) => handleServiceChange(srv.id, 'compliancePeriod', e.target.value)}
                        className="w-full h-10 px-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none"
                      >
                        <option value="FY 2026-27">FY 2026-27</option>
                        <option value="FY 2025-26">FY 2025-26</option>
                      </select>

                      <select
                        value={srv.frequency}
                        onChange={(e) => handleServiceChange(srv.id, 'frequency', e.target.value)}
                        className="w-full h-10 px-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none"
                      >
                        <option value="One-Time">One-Time</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half Yearly">Half Yearly</option>
                        <option value="Annual">Annual</option>
                      </select>

                      <select
                        value={srv.periodLabel}
                        onChange={(e) => handleServiceChange(srv.id, 'periodLabel', e.target.value)}
                        className="w-full h-10 px-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none"
                      >
                        <option value="N/A - One-Time">N/A - One-Time</option>
                        <option value="Q1 (Apr-Jun)">Q1 (Apr-Jun)</option>
                        <option value="Q2 (Jul-Sep)">Q2 (Jul-Sep)</option>
                        <option value="Q3 (Oct-Dec)">Q3 (Oct-Dec)</option>
                        <option value="Q4 (Jan-Mar)">Q4 (Jan-Mar)</option>
                        <option value="Annual">Annual</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Outlined Purple Add Service Buttons (20px top, 20px bottom, 12px gap) */}
          <div className="p-5 border-t border-[#e5e7eb] dark:border-[#334155] flex items-center gap-3 bg-gray-50/50 dark:bg-[#0f172a]/20">
            <button
              type="button"
              onClick={handleAddService}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#7367F0] text-[#7367F0] hover:bg-[#eeedfd] dark:hover:bg-[#7367F0]/20 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
            <button
              type="button"
              onClick={handleAddReimbursementItem}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#7367F0] text-[#7367F0] hover:bg-[#eeedfd] dark:hover:bg-[#7367F0]/20 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Reimbursement</span>
            </button>
          </div>
        </div>

        {/* Section 5: Bank Account Section & Totals Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Bank Account Card (Left 7 Cols) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Bank Account
              </label>

              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#7367F0] cursor-pointer"
              >
                <option value="">No bank accounts - Add Bank Account in Settings</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - {b.accountNumber} ({b.accountType}) {b.isPrimary ? '• Primary' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Empty State Card or Selected Bank Card (24px-28px padding) */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] p-6 sm:p-7 text-xs flex flex-col gap-4 bg-[#f9fafb] dark:bg-[#0f172a]/40 shadow-2xs">
              {selectedBank ? (
                <div className="flex flex-col gap-2 pb-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{selectedBank.bankName}</span>
                    {selectedBank.isPrimary && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    A/C: <span className="font-mono font-medium">{selectedBank.accountNumber}</span> | IFSC: <span className="font-mono font-medium">{selectedBank.ifscCode}</span>
                  </div>
                  <div className="text-gray-500 text-[11px]">{selectedBank.branchAddress}</div>
                </div>
              ) : (
                <div className="text-center py-6 flex flex-col items-center justify-center gap-2">
                  <p className="text-xs text-gray-500">No Bank Account Added click below to add</p>
                  <button
                    type="button"
                    onClick={() => setIsAddBankModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[#7367F0] hover:underline font-semibold text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Bank Account</span>
                  </button>
                </div>
              )}

              {/* Dotted Divider & Currency Code */}
              <div className="pt-3 border-t border-dotted border-gray-300 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Currency Code</span>
                <span className="font-semibold text-gray-900 dark:text-white">INR</span>
              </div>
            </div>
          </div>

          {/* Totals Card (Right 5 Cols) (24px-28px padding) */}
          <div className="md:col-span-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-6 sm:p-7 flex flex-col gap-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Sub Total</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                ₹{subTotal.toFixed(2)}
              </span>
            </div>

            <div className="pt-4 border-t border-dotted border-gray-300 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                Total Payable
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                ₹{totalPayable.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 6: Note Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <FileEdit className="w-4 h-4 text-gray-500" />
            <span>Note</span>
          </div>
          <textarea
            rows={2}
            placeholder="No note added"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#7367F0]"
          />
        </div>

        {/* Section 7: Footer Actions (28px padding below buttons) */}
        <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-gray-100 dark:border-gray-800 pb-7">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 rounded-lg border border-[#7367F0] text-[#7367F0] hover:bg-[#eeedfd]/50 text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-7 py-2.5 rounded-lg bg-[#7367F0] hover:bg-[#6357e8] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-98"
          >
            Save
          </button>
        </div>
      </div>

      {/* Add Bank Account Modal */}
      <AddBankAccountModal
        isOpen={isAddBankModalOpen}
        onClose={() => setIsAddBankModalOpen(false)}
        onSuccess={(acc) => setSelectedBankId(acc.id)}
      />
    </div>
  );
};
