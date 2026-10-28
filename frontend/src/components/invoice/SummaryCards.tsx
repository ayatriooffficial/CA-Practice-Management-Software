"use client";

import React from 'react';
import {
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Receipt,
  Layers,
} from 'lucide-react';
import { useInvoice } from './InvoiceContext';

const formatCurrency = (val: number): string => {
  return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const SummaryCards: React.FC = () => {
  const { activeTab, summaryStats, statusFilter, setStatusFilter } = useInvoice();

  if (activeTab === 'analytics') {
    return null;
  }

  if (activeTab === 'receipts') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 px-6 pt-6 pb-2">
        {/* Total Receipts Count */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'All' ? 'All' : 'All')}
          className={`flex items-center justify-between p-5 rounded-none border transition-all cursor-pointer shadow-2xs ${statusFilter === 'All'
              ? 'bg-[#3D6A9E]/10 dark:bg-[#1e293b] border-[#3D6A9E] dark:border-[#3D6A9E] shadow-xs'
              : 'bg-white dark:bg-[#1e293b] border-[#e5e7eb] dark:border-[#334155] hover:border-[#3D6A9E]/40'
            }`}
        >
          <div>
            <div className="text-2xl font-bold text-[#3D6A9E] dark:text-[#93c5fd] tracking-tight">
              {summaryStats.totalReceiptsCount}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
              Total Receipts
            </div>
          </div>
          <div className="w-11 h-11 rounded-none bg-[#3D6A9E]/15 dark:bg-[#3D6A9E]/20 flex items-center justify-center text-[#3D6A9E] shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Receipts Value */}
        <div
          className="flex items-center justify-between p-5 rounded-none border bg-[#3D6A9E]/5 dark:bg-[#1e293b] border-[#3D6A9E]/20 dark:border-[#334155] transition-all cursor-pointer shadow-2xs"
        >
          <div>
            <div className="text-2xl font-bold text-[#3D6A9E] dark:text-[#93c5fd] tracking-tight">
              {summaryStats.totalReceiptsCount}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
              Receipts
            </div>
          </div>
          <div className="w-11 h-11 rounded-none bg-[#3D6A9E]/15 dark:bg-[#3D6A9E]/20 flex items-center justify-center text-[#3D6A9E] shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Advance Amount */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Advance' ? 'All' : 'Advance')}
          className={`flex items-center justify-between p-5 rounded-none border transition-all cursor-pointer shadow-2xs ${statusFilter === 'Advance'
              ? 'bg-[#fff7ed] dark:bg-[#2c1d11] border-[#fb923c] shadow-xs'
              : 'bg-[#fff7ed] dark:bg-[#2c1d11] border-[#ffedd5] dark:border-[#432818] hover:border-orange-300'
            }`}
        >
          <div>
            <div className="text-2xl font-bold text-[#ea580c] dark:text-[#fb923c] tracking-tight">
              {formatCurrency(summaryStats.advanceReceiptsAmount)}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
              Advance Amount
            </div>
          </div>
          <div className="w-11 h-11 rounded-none bg-[#ffedd5] dark:bg-[#ea580c]/20 flex items-center justify-center text-[#ea580c] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  }

  // Common 4-card pattern for Proforma, Invoice, Reimbursement
  const allLabel =
    activeTab === 'proforma'
      ? `All Proforma (${summaryStats.allCount})`
      : activeTab === 'reimbursement'
        ? `All Reimbursements (${summaryStats.allCount})`
        : `All Invoices (${summaryStats.allCount})`;

  const fourthCardLabel =
    activeTab === 'proforma'
      ? `Advance Paid (${summaryStats.advancePaidCount})`
      : `Paid (${summaryStats.paidCount})`;

  const fourthCardAmount =
    activeTab === 'proforma' ? summaryStats.advancePaidAmount : summaryStats.paidAmount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 px-6 pt-6 pb-2">
      {/* 1. All Items (Brand Blue) */}
      <div
        onClick={() => setStatusFilter('All')}
        className={`flex items-center justify-between p-5 rounded-none border transition-all cursor-pointer select-none shadow-2xs ${statusFilter === 'All'
            ? 'bg-[#3D6A9E]/10 dark:bg-[#1e293b] border-[#3D6A9E] dark:border-[#3D6A9E] shadow-xs'
            : 'bg-[#3D6A9E]/5 dark:bg-[#1e293b]/50 border-[#3D6A9E]/20 dark:border-[#334155] hover:border-[#3D6A9E]/50'
          }`}
      >
        <div>
          <div className="text-2xl font-bold text-[#3D6A9E] dark:text-[#93c5fd] tracking-tight">
            {formatCurrency(summaryStats.allAmount)}
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
            {allLabel}
          </div>
        </div>
        <div className="w-11 h-11 rounded-none bg-[#3D6A9E]/15 dark:bg-[#3D6A9E]/20 flex items-center justify-center text-[#3D6A9E] shrink-0">
          <FileText className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Receivable (Pink / Red) */}
      <div
        onClick={() => setStatusFilter(statusFilter === 'Receivable' ? 'All' : 'Receivable')}
        className={`flex items-center justify-between p-5 rounded-none border transition-all cursor-pointer select-none shadow-2xs ${statusFilter === 'Receivable'
            ? 'bg-[#fef2f2] dark:bg-[#2b1616] border-[#f87171] shadow-xs'
            : 'bg-[#fef2f2]/70 dark:bg-[#2b1616]/50 border-[#fee2e2] dark:border-[#4c1d1d] hover:border-[#f87171]'
          }`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-bold text-[#dc2626] dark:text-[#f87171] tracking-tight">
              {formatCurrency(summaryStats.receivableAmount)}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
              TDS excluded
            </span>
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
            Receivable ({summaryStats.receivableCount})
          </div>
        </div>
        <div className="w-11 h-11 rounded-none bg-[#fee2e2] dark:bg-[#dc2626]/20 flex items-center justify-center text-[#dc2626] shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Partially Paid (Orange) */}
      <div
        onClick={() => setStatusFilter(statusFilter === 'Partially Paid' ? 'All' : 'Partially Paid')}
        className={`flex items-center justify-between p-5 rounded-none border transition-all cursor-pointer select-none shadow-2xs ${statusFilter === 'Partially Paid'
            ? 'bg-[#fff7ed] dark:bg-[#2c1d11] border-[#fb923c] shadow-xs'
            : 'bg-[#fff7ed]/70 dark:bg-[#2c1d11]/50 border-[#ffedd5] dark:border-[#432818] hover:border-[#fb923c]'
          }`}
      >
        <div>
          <div className="text-2xl font-bold text-[#ea580c] dark:text-[#fb923c] tracking-tight">
            {formatCurrency(summaryStats.partiallyPaidAmount)}
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
            Partially Paid ({summaryStats.partiallyPaidCount})
          </div>
        </div>
        <div className="w-11 h-11 rounded-none bg-[#ffedd5] dark:bg-[#ea580c]/20 flex items-center justify-center text-[#ea580c] shrink-0">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Paid / Advance Paid (Green) */}
      <div
        onClick={() => {
          const target = activeTab === 'proforma' ? 'Advance Paid' : 'Paid';
          setStatusFilter(statusFilter === target ? 'All' : target);
        }}
        className={`flex items-center justify-between p-5 rounded-none border transition-all cursor-pointer select-none shadow-2xs ${statusFilter === (activeTab === 'proforma' ? 'Advance Paid' : 'Paid')
            ? 'bg-[#f0fdf4] dark:bg-[#13281c] border-[#4ade80] shadow-xs'
            : 'bg-[#f0fdf4]/70 dark:bg-[#13281c]/50 border-[#dcfce7] dark:border-[#14532d] hover:border-[#4ade80]'
          }`}
      >
        <div>
          <div className="text-2xl font-bold text-[#16a34a] dark:text-[#4ade80] tracking-tight">
            {formatCurrency(fourthCardAmount)}
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
            {fourthCardLabel}
          </div>
        </div>
        <div className="w-11 h-11 rounded-none bg-[#dcfce7] dark:bg-[#16a34a]/20 flex items-center justify-center text-[#16a34a] shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
