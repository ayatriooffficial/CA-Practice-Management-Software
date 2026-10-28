'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FileText,
  List,
  Loader2,
  MoreVertical,
  Search,
  User,
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
} from 'lucide-react';
import {
  profitabilityReportApi,
  ProfitabilityReportResponse,
  ProfitabilityTaskRow,
} from '@/services/profitabilityReportApi';

type ReportView = 'list' | 'client' | 'employee';

interface ReportGroup {
  key: string;
  label: string;
  clientId?: string;
  tasks: ProfitabilityTaskRow[];
  taskCount: number;
  revenue: number;
  manpowerCost: number;
  expense: number;
  profit: number;
}

const CURRENCY_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '₹0.00';
  return CURRENCY_FORMAT.format(value);
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: ProfitabilityTaskRow[], view: ReportView, groups: ReportGroup[]) {
  const headers =
    view === 'list'
      ? ['Client Name', 'Task ID', 'Service', 'Revenue', 'Manpower Cost', 'Expense', 'Profit']
      : [view === 'client' ? 'Client Name' : 'Employee', 'Task Count', 'Revenue', 'Manpower Cost', 'Expense', 'Profit'];
  const body =
    view === 'list'
      ? rows.map((row) => [
          row.clientName,
          row.taskId,
          row.serviceName,
          row.revenue ?? 0,
          row.manpowerCost ?? 0,
          row.expense ?? 0,
          row.profit ?? 0,
        ])
      : groups.map((group) => [
          group.label,
          group.taskCount,
          group.revenue,
          group.manpowerCost,
          group.expense,
          group.profit,
        ]);
  const content = [headers, ...body].map((line) => line.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `profitability-report-${view}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function groupTasks(rows: ProfitabilityTaskRow[]): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();
  rows.forEach((task) => {
    const displayLabel = task.clientName.trim() || 'Unknown client';
    const key = task.clientId || displayLabel;
    const group = groups.get(key) || {
      key,
      label: displayLabel,
      clientId: task.clientId || undefined,
      tasks: [],
      taskCount: 0,
      revenue: 0,
      manpowerCost: 0,
      expense: 0,
      profit: 0,
    };
    group.tasks.push(task);
    group.taskCount += 1;
    group.revenue += task.revenue ?? 0;
    group.manpowerCost += task.manpowerCost ?? 0;
    group.expense += task.expense ?? 0;
    group.profit += task.profit ?? 0;
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function groupEmployees(
  rows: ProfitabilityReportResponse['employeeRows'],
  tasks: ProfitabilityTaskRow[],
  search: string
): ReportGroup[] {
  const term = search.trim().toLocaleLowerCase();
  const names = new Map(rows.map((row) => [row.employeeId, row.employeeName]));
  const grouped = new Map<string, { taskIds: Set<string>; costPaise: number }>();
  tasks.forEach((task) =>
    task.employeeCosts.forEach((employee) => {
      const current = grouped.get(employee.employeeId) || { taskIds: new Set<string>(), costPaise: 0 };
      current.taskIds.add(task.taskId);
      current.costPaise += Math.round(employee.manpowerCost * 100);
      grouped.set(employee.employeeId, current);
    })
  );
  return [...grouped.entries()]
    .map(([employeeId, value]) => ({
      employeeId,
      employeeName: names.get(employeeId) || 'Former employee',
      ...value,
    }))
    .filter((employee) => !term || employee.employeeName.toLocaleLowerCase().includes(term))
    .map((employee) => ({
      key: employee.employeeId,
      label: employee.employeeName,
      tasks: [],
      taskCount: employee.taskIds.size,
      revenue: 0,
      manpowerCost: employee.costPaise / 100,
      expense: 0,
      profit: 0,
    }));
}

/**
 * Profit badge styled with sharp corners matching the global UI design system:
 * Soft green background (#e8f8ee) with dark green text (#188a42) for >= 0
 * Soft red background (#fde8e8) with dark red text (#e02424) for < 0
 */
function ProfitBadge({ value }: { value: number | null | undefined }) {
  const numeric = value ?? 0;
  const isPositive = numeric >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-none px-2 py-0.5 text-xs font-semibold ${
        isPositive
          ? 'bg-[#e8f8ee] text-[#188a42] dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'bg-[#fde8e8] text-[#e02424] dark:bg-red-950/60 dark:text-red-300'
      }`}
    >
      {formatAmount(numeric)}
    </span>
  );
}

export default function ProfitabilityReport() {
  // Default to July 2026 to mirror practice data
  const [from, setFrom] = useState('2026-07-01');
  const [to, setTo] = useState('2026-07-31');
  const [view, setView] = useState<ReportView>('list');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloadingClient, setDownloadingClient] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rangeError = from && to && from > to ? 'Start Date must be on or before End Date.' : '';

  const [reportData, setReportData] = useState<ProfitabilityReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState<any>(null);

  useEffect(() => {
    if (!from || !to || rangeError) return;
    let active = true;
    const controller = new AbortController();
    setIsLoading(true);
    profitabilityReportApi.getRows(from, to, controller.signal)
      .then((data) => {
        if (active) {
          setReportData(data);
          setQueryError(null);
        }
      })
      .catch((err) => {
        if (active && err.name !== 'AbortError') {
          setQueryError(err);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [from, to, rangeError]);

  const query = {
    data: reportData,
    isLoading,
    error: queryError,
    isError: Boolean(queryError),
    refetch: () => {
      if (from && to && !rangeError) {
        setIsLoading(true);
        profitabilityReportApi.getRows(from, to)
          .then((data) => setReportData(data))
          .catch(setQueryError)
          .finally(() => setIsLoading(false));
      }
    },
  };

  const filteredRows = useMemo(() => {
    const rows = query.data?.rows || [];
    const term = search.trim().toLocaleLowerCase();
    if (!term) return rows;
    return rows.filter((row: ProfitabilityTaskRow) =>
      [
        row.clientName,
        row.taskId,
        row.serviceName,
        row.assigneeName,
        ...row.employeeCosts.map((employee: any) => employee.employeeName),
      ].some((value) => value.toLocaleLowerCase().includes(term))
    );
  }, [query.data?.rows, search]);

  const groups = useMemo(() => {
    if (view === 'list') return [];
    if (view === 'client') return groupTasks(filteredRows);
    return groupEmployees(query.data?.employeeRows || [], filteredRows, search);
  }, [filteredRows, query.data?.employeeRows, search, view]);

  // Aggregate KPI summary metrics from filtered rows
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalExpense = 0;
    let totalProfit = 0;

    filteredRows.forEach((row) => {
      totalRevenue += row.revenue ?? 0;
      totalCost += row.manpowerCost ?? 0;
      totalExpense += row.expense ?? 0;
      totalProfit += row.profit ?? 0;
    });

    return {
      revenue: totalRevenue,
      manpowerCost: totalCost,
      expense: totalExpense,
      profit: totalProfit,
    };
  }, [filteredRows]);

  const totalResults = view === 'list' ? filteredRows.length : groups.length;
  const countText = rangeError ? '—' : query.data ? String(totalResults) : '—';

  // Paginated slices
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalResults);

  const paginatedRows = useMemo(() => {
    if (view !== 'list') return [];
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, view, startIndex, endIndex]);

  const paginatedGroups = useMemo(() => {
    if (view === 'list') return [];
    return groups.slice(startIndex, endIndex);
  }, [groups, view, startIndex, endIndex]);

  const handleDownloadReportPdf = async () => {
    try {
      setDownloadingReport(true);
      setDownloadError(null);
      await profitabilityReportApi.downloadPdf({
        from,
        to,
        view,
        search: search.trim() || undefined,
      });
    } catch (err: any) {
      setDownloadError(err?.message || 'Failed to download report PDF');
    } finally {
      setDownloadingReport(false);
      setMenuOpen(false);
    }
  };

  const handleDownloadClientPdf = async (clientId: string, clientName: string) => {
    try {
      setDownloadingClient(clientId || clientName);
      setDownloadError(null);
      await profitabilityReportApi.downloadPdf({
        from,
        to,
        clientId: clientId || clientName,
        clientName,
        view: 'list',
      });
    } catch (err: any) {
      setDownloadError(err?.message || `Failed to download report for ${clientName}`);
    } finally {
      setDownloadingClient(null);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors select-none">
      {/* Breadcrumb matching Global UI */}
      <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <Link
          className="flex items-center gap-1 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
          href="/reports"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Reports
        </Link>
        <span aria-hidden="true">&gt;</span>
        <span>Others</span>
        <span aria-hidden="true">&gt;</span>
        <span aria-current="page" className="font-semibold text-gray-800 dark:text-gray-200">
          Profitability Report
        </span>
      </nav>

      {/* Main Title Row */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white">
            Profitability Report ({countText})
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Financial profitability performance across clients, tasks, and employees
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="flex items-center justify-between border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 rounded-none shadow-2xs">
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatAmount(summaryMetrics.revenue)}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
              Total Revenue
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-none bg-[#eeedfd] dark:bg-[#31719B]/20 text-[#31719B] dark:text-[#60a5fa] shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Manpower Cost */}
        <div className="flex items-center justify-between border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 rounded-none shadow-2xs">
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatAmount(summaryMetrics.manpowerCost)}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
              Labor Costs
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-none bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Direct Expenses */}
        <div className="flex items-center justify-between border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 rounded-none shadow-2xs">
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatAmount(summaryMetrics.expense)}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
              Direct Expenses
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-none bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        {/* Net Profit */}
        <div className="flex items-center justify-between border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 rounded-none shadow-2xs">
          <div>
            <div
              className={`text-xl font-bold leading-tight ${
                summaryMetrics.profit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatAmount(summaryMetrics.profit)}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
              Net Profit
            </div>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-none shrink-0 ${
              summaryMetrics.profit >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Top Filter and Controls Toolbar */}
      <section
        aria-label="Profitability report filters"
        className="mb-5 flex flex-col gap-3 border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-3.5 rounded-none shadow-2xs sm:flex-row sm:flex-wrap sm:items-center"
      >
        {/* Start Date */}
        <label
          className="flex flex-col gap-1 text-xs font-medium sm:flex-row sm:items-center sm:gap-2"
          htmlFor="profitability-from"
        >
          <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
          <input
            id="profitability-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 text-xs text-gray-900 dark:text-white focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B] outline-none transition-colors"
          />
        </label>

        {/* End Date */}
        <label
          className="flex flex-col gap-1 text-xs font-medium sm:flex-row sm:items-center sm:gap-2"
          htmlFor="profitability-to"
        >
          <span className="text-gray-500 dark:text-gray-400">End Date:</span>
          <input
            id="profitability-to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 text-xs text-gray-900 dark:text-white focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B] outline-none transition-colors"
          />
        </label>

        {/* Segmented View Switcher: [≡ List] [👥 Client] [👤 Employee] */}
        <div
          className="inline-flex rounded-none border border-[#dde2e8] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] p-0.5"
          role="group"
          aria-label="Report view"
        >
          <button
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => {
              setView('list');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs transition-colors cursor-pointer ${
              view === 'list'
                ? 'bg-[#31719B] text-white font-semibold shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            aria-pressed={view === 'client'}
            onClick={() => {
              setView('client');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs transition-colors cursor-pointer ${
              view === 'client'
                ? 'bg-[#31719B] text-white font-semibold shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Client</span>
          </button>
          <button
            type="button"
            aria-pressed={view === 'employee'}
            onClick={() => {
              setView('employee');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs transition-colors cursor-pointer ${
              view === 'employee'
                ? 'bg-[#31719B] text-white font-semibold shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Employee</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 sm:ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            id="profitability-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by client, task ID, service..."
            className="h-9 w-full rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B] outline-none transition-colors"
          />
        </div>

        {/* Action Menu (⋮) */}
        <div className="relative">
          <button
            type="button"
            aria-label="More report actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-2xs cursor-pointer"
          >
            {downloadingReport ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#31719B]" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-1 w-52 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                disabled={downloadingReport}
                onClick={handleDownloadReportPdf}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
              >
                {downloadingReport ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#31719B]" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-[#31719B]" />
                )}
                <span>Download PDF Report</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  downloadCsv(filteredRows, view, groups);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Error & Notifications */}
      {rangeError && (
        <div
          role="alert"
          className="mb-4 rounded-none border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-800 dark:text-amber-300"
        >
          {rangeError}
        </div>
      )}

      {downloadError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-none border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300"
        >
          <span>{downloadError}</span>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="font-medium underline hover:no-underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading & Network Error States */}
      {query.isLoading && (
        <div
          role="status"
          className="flex h-72 flex-col items-center justify-center border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-12 text-center text-xs text-gray-500 dark:text-gray-400 rounded-none shadow-2xs"
        >
          <Loader2 className="mb-2 h-5 w-5 animate-spin text-[#31719B]" />
          <span>Loading profitability report from MongoDB Atlas…</span>
        </div>
      )}

      {query.isError && !rangeError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 text-xs rounded-none shadow-2xs"
        >
          <span className="text-gray-700 dark:text-gray-300">
            Could not load report data from the server. Check your connection.
          </span>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="rounded-none border border-[#dde2e8] dark:border-[#334155] px-3 py-1.5 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Report Table Card */}
      {query.data && !rangeError && (
        <div className="w-full flex-1 flex flex-col border border-[#dde2e8] dark:border-[#334155] rounded-none overflow-hidden bg-white dark:bg-[#1e293b] shadow-2xs select-none">
          {totalResults === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center p-12 text-center">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {search.trim()
                  ? 'No records match your search criteria.'
                  : 'No tasks or transactions found for this date period.'}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {search.trim()
                  ? 'Try clearing the search box or searching by a different client name.'
                  : 'Adjust the Start Date and End Date filters to view records from another period.'}
              </p>
            </div>
          ) : view === 'list' ? (
            /* 1. LIST VIEW */
            <div className="overflow-x-auto min-h-[350px]">
              <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/75 dark:bg-[#1e293b] border-b border-[#dde2e8] dark:border-[#334155] text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Client Name</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Task ID</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Service</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Revenue</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Labor Cost</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Expense</th>
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">Profit</th>
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                  {paginatedRows.map((row: ProfitabilityTaskRow) => {
                    const isRowDownloading = downloadingClient === (row.clientId || row.clientName);
                    return (
                      <tr
                        key={row.taskId}
                        className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        {/* Client Name */}
                        <td className="max-w-[200px] px-4 py-3 font-medium text-gray-900 dark:text-white">
                          <span className="line-clamp-2" title={row.clientName}>
                            {row.clientName}
                          </span>
                        </td>

                        {/* Task ID with Primary Blue accent */}
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-[#31719B] dark:text-[#60a5fa]">
                          {row.taskId}
                        </td>

                        {/* Service Name */}
                        <td className="max-w-[220px] px-4 py-3 text-gray-600 dark:text-gray-300">
                          <span className="line-clamp-2" title={row.serviceName}>
                            {row.serviceName}
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatAmount(row.revenue)}
                        </td>

                        {/* Labor Cost */}
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatAmount(row.manpowerCost)}
                        </td>

                        {/* Expense */}
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatAmount(row.expense)}
                        </td>

                        {/* Profit Badge */}
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <ProfitBadge value={row.profit} />
                        </td>

                        {/* Client PDF Download Action */}
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <button
                            type="button"
                            title={`Download PDF Report for ${row.clientName}`}
                            aria-label={`Download PDF Report for ${row.clientName}`}
                            disabled={isRowDownloading}
                            onClick={() => handleDownloadClientPdf(row.clientId, row.clientName)}
                            className="inline-flex items-center gap-1 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2 py-1 text-[11px] font-medium text-[#31719B] dark:text-[#60a5fa] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isRowDownloading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileDown className="h-3 w-3" />
                            )}
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : view === 'client' ? (
            /* 2. CLIENT VIEW */
            <div className="overflow-x-auto min-h-[350px]">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/75 dark:bg-[#1e293b] border-b border-[#dde2e8] dark:border-[#334155] text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Client Name</th>
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">Task Count</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Revenue</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Labor Cost</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Expense</th>
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">Profit</th>
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                  {paginatedGroups.map((group) => {
                    const isClientDownloading = downloadingClient === (group.clientId || group.label);
                    return (
                      <tr
                        key={group.key}
                        className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="max-w-[240px] px-4 py-3 font-medium text-gray-900 dark:text-white">
                          <span className="line-clamp-2" title={group.label}>
                            {group.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-mono font-medium">
                          {group.taskCount}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatAmount(group.revenue)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatAmount(group.manpowerCost)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatAmount(group.expense)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <ProfitBadge value={group.profit} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <button
                            type="button"
                            title={`Download PDF Report for ${group.label}`}
                            aria-label={`Download PDF Report for ${group.label}`}
                            disabled={isClientDownloading}
                            onClick={() => handleDownloadClientPdf(group.clientId || group.label, group.label)}
                            className="inline-flex items-center gap-1.5 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 py-1 text-xs font-medium text-[#31719B] dark:text-[#60a5fa] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isClientDownloading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileDown className="h-3 w-3" />
                            )}
                            <span>Client PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* 3. EMPLOYEE VIEW */
            <div className="overflow-x-auto min-h-[350px]">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/75 dark:bg-[#1e293b] border-b border-[#dde2e8] dark:border-[#334155] text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Employee</th>
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">Task Count</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Revenue</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Labor Cost</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Expense</th>
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                  {paginatedGroups.map((group) => (
                    <tr
                      key={group.key}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="max-w-[240px] px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {group.label}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center font-mono font-medium">
                        {group.taskCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-400">
                        —
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {formatAmount(group.manpowerCost)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-400">
                        —
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-gray-400">
                        —
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer with Pagination matching Global UI */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2 py-1 text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination Range & Controls */}
            <div className="flex items-center gap-3">
              <span>
                {totalResults === 0 ? '0-0 of 0' : `${startIndex + 1}-${endIndex} of ${totalResults}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] p-1 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] p-1 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
