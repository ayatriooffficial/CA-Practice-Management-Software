"use client";

import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  MoreVertical,
  SlidersHorizontal,
  Download,
  RotateCcw,
} from 'lucide-react';
import { useInvoice } from './InvoiceContext';

interface InvoiceToolbarProps {
  onAddNew: () => void;
  onOpenColumnMenu?: () => void;
}

const DATE_RANGES = [
  'Today',
  'This Month',
  'Last Month',
  'This Quarter',
  'This FY',
  'Last FY',
  'Custom Range',
];

const FINANCIAL_YEARS = ['FY 2025-2026', 'FY 2026-2027', 'FY 2027-2028'];

const CURRENCIES = ['All Currencies', 'INR (₹)', 'USD ($)', 'EUR (€)'];

export const InvoiceToolbar: React.FC<InvoiceToolbarProps> = ({
  onAddNew,
  onOpenColumnMenu,
}) => {
  const {
    activeTab,
    invoices,
    proformas,
    reimbursements,
    receipts,
    financialYear,
    setFinancialYear,
    dateRange,
    setDateRange,
    currencyFilter,
    setCurrencyFilter,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  } = useInvoice();

  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `turia_${activeTab}_export_${timestamp}.csv`;
    let csvContent = '';

    if (activeTab === 'invoice' || activeTab === 'proforma') {
      const records = activeTab === 'invoice' ? invoices : proformas;
      const headers = [
        'Document No',
        'Date',
        'Due Date',
        'Client Business Name',
        'Client Legal Name',
        'GSTIN',
        'PAN',
        'Services',
        'SubTotal (INR)',
        'Paid Amount (INR)',
        'Balance Due (INR)',
        'Status',
      ];
      const rows = records.map((r) => [
        `"${r.number || ''}"`,
        `"${r.date || ''}"`,
        `"${r.dueDate || ''}"`,
        `"${(r.clientBusinessName || '').replace(/"/g, '""')}"`,
        `"${(r.clientLegalName || '').replace(/"/g, '""')}"`,
        `"${r.clientGstin || ''}"`,
        `"${r.clientPan || ''}"`,
        `"${(r.services || []).map((s) => s.serviceName).join('; ').replace(/"/g, '""')}"`,
        r.subTotal || 0,
        r.paidAmount || 0,
        r.balanceAmount || 0,
        `"${r.status || ''}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    } else if (activeTab === 'reimbursement') {
      const headers = ['Ref No', 'Date', 'Client Business Name', 'Category / Details', 'Amount (INR)', 'Status'];
      const rows = reimbursements.map((r) => [
        `"${r.number || ''}"`,
        `"${r.date || ''}"`,
        `"${(r.clientBusinessName || '').replace(/"/g, '""')}"`,
        `"${(r.services?.[0]?.serviceName || r.notes || '').replace(/"/g, '""')}"`,
        r.totalPayable || r.subTotal || 0,
        `"${r.status || ''}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    } else if (activeTab === 'receipts') {
      const headers = ['Receipt No', 'Date', 'Client Business Name', 'Invoice No', 'Payment Method', 'Amount (INR)'];
      const rows = receipts.map((rc) => [
        `"${rc.receiptNo || ''}"`,
        `"${rc.paymentDate || ''}"`,
        `"${(rc.businessName || '').replace(/"/g, '""')}"`,
        `"${rc.invoiceNumber || ''}"`,
        `"${rc.method || ''}"`,
        rc.amount || 0,
      ]);
      csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    } else {
      csvContent = 'Document,Date,Amount\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsMoreMenuOpen(false);
  };

  // FY Stepper navigation
  const currentFyIndex = FINANCIAL_YEARS.indexOf(financialYear);
  const handlePrevFy = () => {
    if (currentFyIndex > 0) {
      setFinancialYear(FINANCIAL_YEARS[currentFyIndex - 1]);
    }
  };
  const handleNextFy = () => {
    if (currentFyIndex < FINANCIAL_YEARS.length - 1) {
      setFinancialYear(FINANCIAL_YEARS[currentFyIndex + 1]);
    }
  };

  const actionButtonText = activeTab === 'receipts' ? '+ Record Payment' : '+ Add';

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 px-6 py-3.5 bg-white dark:bg-[#1e293b] border-y border-[#e5e7eb] dark:border-[#334155] select-none transition-colors">
      {/* Left Toolbar Controls */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Date Range Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsDateRangeOpen(!isDateRangeOpen);
              setIsCurrencyOpen(false);
              setIsMoreMenuOpen(false);
            }}
            className="h-10 flex items-center gap-2 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1e293b] cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span>{dateRange}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {isDateRangeOpen && (
            <div className="absolute left-0 mt-1 w-44 rounded-lg shadow-lg bg-white dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155] py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
              {DATE_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => {
                    setDateRange(range);
                    setIsDateRangeOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer ${dateRange === range
                      ? 'bg-[#eeedfd] dark:bg-[#3D6A9E]/20 text-[#3D6A9E] font-semibold'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#334155]'
                    }`}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Financial Year Stepper */}
        <div className="h-10 flex items-center border border-[#dde2e8] dark:border-[#475569] rounded-lg bg-white dark:bg-[#0f172a] overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={handlePrevFy}
            disabled={currentFyIndex <= 0}
            className="h-full px-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
            title="Previous Financial Year"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-3 text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
            {financialYear}
          </span>
          <button
            type="button"
            onClick={handleNextFy}
            disabled={currentFyIndex >= FINANCIAL_YEARS.length - 1}
            className="h-full px-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
            title="Next Financial Year"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Currency Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsCurrencyOpen(!isCurrencyOpen);
              setIsDateRangeOpen(false);
              setIsMoreMenuOpen(false);
            }}
            className="h-10 flex items-center gap-2 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1e293b] cursor-pointer shadow-2xs"
          >
            <span>{currencyFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {isCurrencyOpen && (
            <div className="absolute left-0 mt-1 w-40 rounded-lg shadow-lg bg-white dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155] py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
              {CURRENCIES.map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => {
                    setCurrencyFilter(curr);
                    setIsCurrencyOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer ${currencyFilter === curr
                      ? 'bg-[#eeedfd] dark:bg-[#3D6A9E]/20 text-[#3D6A9E] font-semibold'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#334155]'
                    }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filter Indicator if active */}
        {statusFilter !== 'All' && (
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className="h-10 flex items-center gap-1.5 px-3 rounded-lg bg-[#fee2e2] dark:bg-[#451a1a] text-red-600 dark:text-red-300 text-xs font-semibold hover:bg-red-200 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear filter: {statusFilter}</span>
          </button>
        )}
      </div>

      {/* Right Toolbar Controls */}
      <div className="flex items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-[#3D6A9E] focus:ring-1 focus:ring-[#3D6A9E] shadow-2xs"
          />
        </div>

        {/* Primary Purple Action Button */}
        <button
          type="button"
          onClick={onAddNew}
          className="h-10 flex items-center gap-1 px-4 rounded-lg bg-[#3D6A9E] hover:bg-[#685dd8] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-98"
        >
          {actionButtonText}
        </button>

        {/* Three dots menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsMoreMenuOpen(!isMoreMenuOpen);
              setIsDateRangeOpen(false);
              setIsCurrencyOpen(false);
            }}
            className="w-10 h-10 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e293b] flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMoreMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg bg-white dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155] py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenColumnMenu?.();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#334155] text-left cursor-pointer font-medium"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Manage Columns</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#334155] text-left cursor-pointer font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to Excel / CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
