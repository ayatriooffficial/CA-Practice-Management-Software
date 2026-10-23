"use client";

import React, { useState, useMemo } from 'react';
import {
  Repeat,
  LayoutGrid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MoreVertical,
  EyeOff,
  RotateCcw,
  SlidersHorizontal,
  Calendar,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { RecurringInvoiceRecord, RecurringFrequency } from './types';
import { useInvoice } from './InvoiceContext';

interface ColumnDef {
  key: keyof RecurringInvoiceRecord | 'actions';
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'billingOrg', label: 'Billing Org', sortable: true },
  { key: 'clientBusinessName', label: 'Business Name', sortable: true },
  { key: 'clientLegalName', label: 'Legal Name', sortable: true },
  { key: 'service', label: 'Service', sortable: true },
  { key: 'taxRate', label: 'Tax Rate', sortable: true },
  { key: 'frequency', label: 'Frequency', sortable: true },
  { key: 'createdOn', label: 'Created On', sortable: true },
  { key: 'startDate', label: 'Start Date', sortable: true },
  { key: 'totalAmount', label: 'Total Amount', sortable: true, align: 'right' },
];

const FY_OPTIONS = ['FY 2025-26', 'FY 2026-27', 'FY 2027-28'];

const formatCurrency = (val: number): string => {
  return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Normalize FY string between 'FY 2026-2027' and 'FY 2026-27'
const normalizeFy = (fy: string) => {
  return fy.replace('-20', '-');
};

export const RecurringInvoiceView: React.FC = () => {
  const { recurringInvoices, financialYear, setFinancialYear } = useInvoice();

  // Local state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected items & Sorting
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<keyof RecurringInvoiceRecord | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Columns visibility & Menu
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<string | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);

  // Active Financial Year in short form 'FY 2026-27'
  const activeFyShort = useMemo(() => {
    return normalizeFy(financialYear || 'FY 2026-2027');
  }, [financialYear]);

  const currentFyIndex = useMemo(() => {
    const idx = FY_OPTIONS.indexOf(activeFyShort);
    return idx >= 0 ? idx : 1;
  }, [activeFyShort]);

  const handlePrevFy = () => {
    if (currentFyIndex > 0) {
      const prev = FY_OPTIONS[currentFyIndex - 1];
      // Convert to full FY format for context
      const full = prev.replace('-', '-20');
      setFinancialYear(full);
      setCurrentPage(1);
    }
  };

  const handleNextFy = () => {
    if (currentFyIndex < FY_OPTIONS.length - 1) {
      const next = FY_OPTIONS[currentFyIndex + 1];
      const full = next.replace('-', '-20');
      setFinancialYear(full);
      setCurrentPage(1);
    }
  };

  // Base list filtered strictly by active financial year
  const fyInvoices = useMemo(() => {
    return (recurringInvoices || []).filter((item) => {
      const itemFy = normalizeFy(item.financialYear || '');
      return itemFy === activeFyShort;
    });
  }, [recurringInvoices, activeFyShort]);

  // Compute live counts for the 5 summary cards based on active FY
  const counts = useMemo(() => {
    const total = fyInvoices.length;
    const monthly = fyInvoices.filter((i) => i.frequency === 'Monthly').length;
    const quarterly = fyInvoices.filter((i) => i.frequency === 'Quarterly').length;
    const halfYearly = fyInvoices.filter((i) => i.frequency === 'Half-Yearly').length;
    const yearly = fyInvoices.filter((i) => i.frequency === 'Yearly').length;

    return { total, monthly, quarterly, halfYearly, yearly };
  }, [fyInvoices]);

  // Filtered dataset for content area (applying frequency and search)
  const filteredData = useMemo(() => {
    let result = [...fyInvoices];

    if (frequencyFilter !== 'All') {
      result = result.filter((item) => item.frequency === frequencyFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.clientBusinessName.toLowerCase().includes(q) ||
          item.clientLegalName.toLowerCase().includes(q) ||
          item.service.toLowerCase().includes(q) ||
          item.templateNo.toLowerCase().includes(q) ||
          item.billingOrg.toLowerCase().includes(q) ||
          (item.clientGroup && item.clientGroup.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [fyInvoices, frequencyFilter, searchQuery, sortKey, sortOrder]);

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Bulk selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(paginatedData.map((d) => d.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Sorting handler
  const handleSort = (key: keyof RecurringInvoiceRecord) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Visible columns
  const visibleColumns = useMemo(() => {
    return ALL_COLUMNS.filter((col) => !hiddenColumns.has(col.key));
  }, [hiddenColumns]);

  // Helper badge styles for frequency
  const getFrequencyBadgeClass = (freq: RecurringFrequency) => {
    switch (freq) {
      case 'Monthly':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'Quarterly':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'Half-Yearly':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800';
      case 'Yearly':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-white dark:bg-[#0f172a] select-none transition-colors">
      {/* 1. Five Summary Stat Cards in one row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 px-6 pt-6 pb-2">
        {/* Card 1: Total (Purple / Brand Logo Blue) */}
        <div
          onClick={() => {
            setFrequencyFilter('All');
            setCurrentPage(1);
          }}
          className={`flex items-center justify-between p-5 rounded-xl border transition-all cursor-pointer shadow-2xs ${frequencyFilter === 'All'
              ? 'bg-[#3D6A9E]/10 dark:bg-[#1e1e38] border-[#3D6A9E] dark:border-[#3D6A9E] shadow-xs'
              : 'bg-[#EAF0F7]/70 dark:bg-[#1e1e38]/50 border-[#DCE7F2] dark:border-[#334155] hover:border-[#3D6A9E]'
            }`}
        >
          <div>
            <div className="text-2xl font-bold text-[#3D6A9E] dark:text-[#3D6A9E] tracking-tight">
              {counts.total}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
              Total
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#DCE7F2] dark:bg-[#3D6A9E]/20 flex items-center justify-center text-[#3D6A9E] shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Monthly (Green) */}
        <div
          onClick={() => {
            setFrequencyFilter('Monthly');
            setCurrentPage(1);
          }}
          className={`flex items-center justify-between p-5 rounded-xl border transition-all cursor-pointer shadow-2xs ${frequencyFilter === 'Monthly'
              ? 'bg-[#ecfdf5] dark:bg-[#064e3b]/30 border-[#10b981] dark:border-[#10b981] shadow-xs'
              : 'bg-[#ecfdf5]/70 dark:bg-[#064e3b]/10 border-[#a7f3d0] dark:border-[#065f46] hover:border-[#10b981]'
            }`}
        >
          <div>
            <div className="text-2xl font-bold text-[#059669] dark:text-[#34d399] tracking-tight">
              {counts.monthly}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
              Monthly
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#d1fae5] dark:bg-[#059669]/20 flex items-center justify-center text-[#059669] dark:text-[#34d399] shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Quarterly (Orange) */}
        <div
          onClick={() => {
            setFrequencyFilter('Quarterly');
            setCurrentPage(1);
          }}
          className={`flex items-center justify-between p-5 rounded-xl border transition-all cursor-pointer shadow-2xs ${frequencyFilter === 'Quarterly'
              ? 'bg-[#fff7ed] dark:bg-[#2c1d11] border-[#f97316] dark:border-[#f97316] shadow-xs'
              : 'bg-[#fff7ed]/70 dark:bg-[#2c1d11]/50 border-[#fed7aa] dark:border-[#432818] hover:border-[#f97316]'
            }`}
        >
          <div>
            <div className="text-2xl font-bold text-[#ea580c] dark:text-[#fb923c] tracking-tight">
              {counts.quarterly}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
              Quarterly
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#ffedd5] dark:bg-[#ea580c]/20 flex items-center justify-center text-[#ea580c] dark:text-[#fb923c] shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Half-Yearly (Teal / Cyan) */}
        <div
          onClick={() => {
            setFrequencyFilter('Half-Yearly');
            setCurrentPage(1);
          }}
          className={`flex items-center justify-between p-5 rounded-xl border transition-all cursor-pointer shadow-2xs ${frequencyFilter === 'Half-Yearly'
              ? 'bg-[#ecfeff] dark:bg-[#083344]/30 border-[#06b6d4] dark:border-[#06b6d4] shadow-xs'
              : 'bg-[#ecfeff]/70 dark:bg-[#083344]/10 border-[#a5f3fc] dark:border-[#164e63] hover:border-[#06b6d4]'
            }`}
        >
          <div>
            <div className="text-2xl font-bold text-[#0891b2] dark:text-[#22d3ee] tracking-tight">
              {counts.halfYearly}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
              Half-Yearly
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#cffafe] dark:bg-[#0891b2]/20 flex items-center justify-center text-[#0891b2] dark:text-[#22d3ee] shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Yearly (Grey / Slate) */}
        <div
          onClick={() => {
            setFrequencyFilter('Yearly');
            setCurrentPage(1);
          }}
          className={`flex items-center justify-between p-5 rounded-xl border transition-all cursor-pointer shadow-2xs ${frequencyFilter === 'Yearly'
              ? 'bg-[#f8fafc] dark:bg-[#1e293b] border-[#64748b] dark:border-[#64748b] shadow-xs'
              : 'bg-[#f8fafc]/70 dark:bg-[#1e293b]/50 border-[#e2e8f0] dark:border-[#334155] hover:border-[#64748b]'
            }`}
        >
          <div>
            <div className="text-2xl font-bold text-[#475569] dark:text-[#94a3b8] tracking-tight">
              {counts.yearly}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
              Yearly
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#e2e8f0] dark:bg-[#64748b]/20 flex items-center justify-center text-[#475569] dark:text-[#94a3b8] shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 px-6 py-3.5 bg-white dark:bg-[#1e293b] border-y border-[#e5e7eb] dark:border-[#334155] select-none transition-colors">
        {/* Left Toolbar: Grid/List Segmented Toggle + Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Grid | List Segmented Toggle */}
          <div className="flex items-center p-0.5 bg-gray-100 dark:bg-[#0f172a] rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${viewMode === 'grid'
                  ? 'bg-[#3D6A9E] text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${viewMode === 'list'
                  ? 'bg-[#3D6A9E] text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search"
              className="h-10 pl-9 pr-3.5 w-60 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-medium text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#3D6A9E] focus:border-[#3D6A9E] shadow-2xs"
            />
          </div>
        </div>

        {/* Right Toolbar: Frequency Segmented Filter + FY Switcher */}
        <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
          {/* Frequency Segmented Filter: All | Monthly | Quarterly | Half-Yearly | Yearly */}
          <div className="flex items-center p-0.5 bg-gray-100 dark:bg-[#0f172a] rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar">
            {(['All', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'] as const).map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => {
                  setFrequencyFilter(freq);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${frequencyFilter === freq
                    ? 'bg-[#3D6A9E] text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {freq}
              </button>
            ))}
          </div>

          {/* Financial Year Switcher */}
          <div className="flex items-center rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] h-10 px-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevFy}
              disabled={currentFyIndex === 0}
              title="Previous Financial Year"
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 select-none whitespace-nowrap">
              {activeFyShort}
            </span>
            <button
              type="button"
              onClick={handleNextFy}
              disabled={currentFyIndex === FY_OPTIONS.length - 1}
              title="Next Financial Year"
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Content Area */}
      {fyInvoices.length === 0 ? (
        // Empty State when current Financial Year has no recurring invoices
        <div className="flex-1 flex flex-col items-center justify-center min-h-[380px] p-8 text-center">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            No recurring invoices for this financial year.
          </p>
        </div>
      ) : filteredData.length === 0 ? (
        // Empty State when search or filter returns no results
        <div className="flex-1 flex flex-col items-center justify-center min-h-[380px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
            <Repeat className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            No recurring invoices matching your search.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFrequencyFilter('All');
            }}
            className="mt-3 text-xs font-semibold text-[#3D6A9E] hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        // 3A. Grid View: Responsive cards
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paginatedData.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between p-5 rounded-xl border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-[#3D6A9E]/60 dark:hover:border-[#3D6A9E]/60 shadow-2xs hover:shadow-md transition-all group"
              >
                <div>
                  {/* Card Header: Template ID & Frequency Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-[#3D6A9E] dark:text-[#3D6A9E] tracking-wide">
                      {item.templateNo}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getFrequencyBadgeClass(
                        item.frequency
                      )}`}
                    >
                      {item.frequency}
                    </span>
                  </div>

                  {/* Business Name & Legal Name */}
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#3D6A9E] transition-colors line-clamp-1">
                    {item.clientBusinessName}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {item.clientLegalName}
                  </p>

                  {/* Service */}
                  <div className="mt-3 py-2 px-2.5 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800">
                    <div className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">
                      Service
                    </div>
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5 line-clamp-1">
                      {item.service}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-medium">
                        Tax Rate
                      </span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {item.taxRate}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-medium">
                        Start Date
                      </span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {item.startDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-medium">
                        Created On
                      </span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {item.createdOn}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-medium">
                        Status
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Billing Org & Total Amount */}
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[130px]">
                    {item.billingOrg}
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(item.totalAmount)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer for Grid */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4 mt-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#334155]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
                  className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 cursor-pointer"
                >
                  <span>{pageSize}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {isPageSizeOpen && (
                  <div className="absolute bottom-full left-0 mb-1 w-18 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-md shadow-lg py-1 z-30">
                    {[10, 25, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                          setIsPageSizeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${pageSize === size ? 'font-bold text-[#3D6A9E]' : ''
                          }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span>
                {totalItems === 0
                  ? '0-0 of 0'
                  : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                    currentPage * pageSize,
                    totalItems
                  )} of ${totalItems}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 3B. List View: Data Table matching build's table
        <div className="flex-1 flex flex-col justify-between">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50/70 dark:bg-[#1e293b]/70 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {/* Checkbox column */}
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((d) => selectedIds.has(d.id))
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-[#3D6A9E] focus:ring-[#3D6A9E] cursor-pointer"
                    />
                  </th>

                  {/* Dynamic Columns */}
                  {visibleColumns.map((col) => {
                    const isSorted = sortKey === col.key;
                    const isMenuOpen = activeHeaderMenu === col.key;

                    return (
                      <th
                        key={col.key}
                        className={`py-3 px-4 relative ${col.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                      >
                        <div
                          className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : 'justify-between'
                            } group`}
                        >
                          <div
                            onClick={() => col.sortable && handleSort(col.key as keyof RecurringInvoiceRecord)}
                            className="flex items-center gap-1.5 cursor-pointer select-none hover:text-gray-900 dark:hover:text-white"
                          >
                            <span>{col.label}</span>
                            {col.sortable && (
                              <span className="text-gray-400">
                                {isSorted ? (
                                  sortOrder === 'asc' ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-[#3D6A9E]" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5 text-[#3D6A9E]" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </span>
                            )}
                          </div>

                          {/* Column Menu Trigger */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveHeaderMenu(isMenuOpen ? null : (col.key as string));
                              }}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Column Header Dropdown Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-44 rounded-lg shadow-lg bg-white dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155] py-1 z-40 text-xs font-normal normal-case animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSortKey(col.key as keyof RecurringInvoiceRecord);
                                    setSortOrder('asc');
                                    setActiveHeaderMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                  <span>Sort Asc</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSortKey(col.key as keyof RecurringInvoiceRecord);
                                    setSortOrder('desc');
                                    setActiveHeaderMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                  <span>Sort Desc</span>
                                </button>
                                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHiddenColumns((prev) => new Set([...prev, col.key as string]));
                                    setActiveHeaderMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Hide Column</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHiddenColumns(new Set());
                                    setActiveHeaderMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Show All Columns</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155] text-xs text-gray-700 dark:text-gray-300">
                {paginatedData.map((item) => {
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#f9fafb] dark:hover:bg-[#1e293b]/50 transition-colors ${isSelected ? 'bg-[#3D6A9E]/5 dark:bg-[#3D6A9E]/10' : ''
                        }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          className="rounded border-gray-300 text-[#3D6A9E] focus:ring-[#3D6A9E] cursor-pointer"
                        />
                      </td>

                      {/* Billing Org */}
                      {!hiddenColumns.has('billingOrg') && (
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {item.billingOrg}
                        </td>
                      )}

                      {/* Business Name */}
                      {!hiddenColumns.has('clientBusinessName') && (
                        <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {item.clientBusinessName}
                        </td>
                      )}

                      {/* Legal Name */}
                      {!hiddenColumns.has('clientLegalName') && (
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                          {item.clientLegalName}
                        </td>
                      )}

                      {/* Service */}
                      {!hiddenColumns.has('service') && (
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-800 dark:text-gray-200">
                          {item.service}
                        </td>
                      )}

                      {/* Tax Rate */}
                      {!hiddenColumns.has('taxRate') && (
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {item.taxRate}
                        </td>
                      )}

                      {/* Frequency */}
                      {!hiddenColumns.has('frequency') && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getFrequencyBadgeClass(
                              item.frequency
                            )}`}
                          >
                            {item.frequency}
                          </span>
                        </td>
                      )}

                      {/* Created On */}
                      {!hiddenColumns.has('createdOn') && (
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {item.createdOn}
                        </td>
                      )}

                      {/* Start Date */}
                      {!hiddenColumns.has('startDate') && (
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {item.startDate}
                        </td>
                      )}

                      {/* Total Amount */}
                      {!hiddenColumns.has('totalAmount') && (
                        <td className="py-3 px-4 whitespace-nowrap text-right font-bold text-gray-900 dark:text-white">
                          {formatCurrency(item.totalAmount)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1e293b]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
                  className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 cursor-pointer"
                >
                  <span>{pageSize}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {isPageSizeOpen && (
                  <div className="absolute bottom-full left-0 mb-1 w-18 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-md shadow-lg py-1 z-30">
                    {[10, 25, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                          setIsPageSizeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${pageSize === size ? 'font-bold text-[#3D6A9E]' : ''
                          }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span>
                {totalItems === 0
                  ? '0-0 of 0'
                  : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                    currentPage * pageSize,
                    totalItems
                  )} of ${totalItems}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
