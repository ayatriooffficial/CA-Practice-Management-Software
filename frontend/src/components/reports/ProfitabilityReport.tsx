'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  if (value == null || !Number.isFinite(value)) return '0.00';
  return CURRENCY_FORMAT.format(value);
}

function formatReportDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN');
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
 * Profit badge styled identically to the reference screenshot:
 * Soft green background (#e8f8ee) with dark green text (#188a42) for >= 0
 * Soft red background (#fde8e8) with dark red text (#e02424) for < 0
 */
function ProfitBadge({ value }: { value: number | null | undefined }) {
  const numeric = value ?? 0;
  const isPositive = numeric >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
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
  // Default to July 2026 to mirror the reference screenshot demo data
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

  const query = useQuery({
    queryKey: ['reports', 'profitability', from, to],
    queryFn: ({ signal }) => profitabilityReportApi.getRows(from, to, signal),
    enabled: Boolean(from && to && !rangeError),
    staleTime: 30_000,
  });

  const filteredRows = useMemo(() => {
    const rows = query.data?.rows || [];
    const term = search.trim().toLocaleLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [
        row.clientName,
        row.taskId,
        row.serviceName,
        row.assigneeName,
        ...row.employeeCosts.map((employee) => employee.employeeName),
      ].some((value) => value.toLocaleLowerCase().includes(term))
    );
  }, [query.data?.rows, search]);

  const groups = useMemo(() => {
    if (view === 'list') return [];
    if (view === 'client') return groupTasks(filteredRows);
    return groupEmployees(query.data?.employeeRows || [], filteredRows, search);
  }, [filteredRows, query.data?.employeeRows, search, view]);

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
    <div
      className="min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 lg:p-8"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
    >
      {/* Breadcrumb matching Turia screenshot: < Reports > Others > Profitability Report */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
        <Link
          className="flex items-center gap-1 font-medium hover:underline"
          href="/reports"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Reports
        </Link>
        <span aria-hidden="true">&gt;</span>
        <span>Others</span>
        <span aria-hidden="true">&gt;</span>
        <span aria-current="page" className="font-medium" style={{ color: 'var(--text-main)' }}>
          Profitability Report
        </span>
      </nav>

      {/* Main Title Row */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Profitability Report ({countText})
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Financial profitability performance across clients, tasks, and employees
          </p>
        </div>
      </div>

      {/* Top Filter and Controls Toolbar */}
      <section
        aria-label="Profitability report filters"
        className="mb-5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:flex-wrap sm:items-center"
        style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Start Date */}
        <label className="flex flex-col gap-1 text-xs font-medium sm:flex-row sm:items-center sm:gap-2" htmlFor="profitability-from">
          <span style={{ color: 'var(--text-muted)' }}>Start Date:</span>
          <input
            id="profitability-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{
              borderColor: 'var(--border-main)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-main)',
            }}
          />
        </label>

        {/* End Date */}
        <label className="flex flex-col gap-1 text-xs font-medium sm:flex-row sm:items-center sm:gap-2" htmlFor="profitability-to">
          <span style={{ color: 'var(--text-muted)' }}>End Date:</span>
          <input
            id="profitability-to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{
              borderColor: 'var(--border-main)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-main)',
            }}
          />
        </label>

        {/* Segmented View Switcher: [≡ List] [👥 Client] [👤 Employee] */}
        <div
          className="flex items-center rounded-lg border p-0.5"
          role="group"
          aria-label="Report view"
          style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)' }}
        >
          <button
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => {
              setView('list');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'list'
                ? 'bg-white text-indigo-700 shadow-sm dark:bg-zinc-800 dark:text-indigo-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            type="button"
            aria-pressed={view === 'client'}
            onClick={() => {
              setView('client');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'client'
                ? 'bg-white text-indigo-700 shadow-sm dark:bg-zinc-800 dark:text-indigo-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Client
          </button>
          <button
            type="button"
            aria-pressed={view === 'employee'}
            onClick={() => {
              setView('employee');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'employee'
                ? 'bg-white text-indigo-700 shadow-sm dark:bg-zinc-800 dark:text-indigo-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Employee
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 sm:ml-auto">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: 'var(--text-subtle)' }}
          />
          <input
            id="profitability-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search"
            className="h-9 w-full rounded-md border py-1.5 pl-8 pr-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{
              borderColor: 'var(--border-main)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-main)',
            }}
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              borderColor: 'var(--border-main)',
              color: 'var(--text-main)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {downloadingReport ? <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> : <MoreVertical className="h-4 w-4" />}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-1 w-52 rounded-lg border py-1 shadow-lg"
              style={{
                borderColor: 'var(--border-main)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <button
                type="button"
                role="menuitem"
                disabled={downloadingReport}
                onClick={handleDownloadReportPdf}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {downloadingReport ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                )}
                Download PDF Report
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  downloadCsv(filteredRows, view, groups);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-[var(--bg-hover)]"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                Export CSV
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Error & Notifications */}
      {rangeError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border px-4 py-3 text-xs"
          style={{
            borderColor: 'var(--banner-border)',
            backgroundColor: 'var(--banner-bg)',
            color: 'var(--banner-text)',
          }}
        >
          {rangeError}
        </div>
      )}

      {downloadError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          <span>{downloadError}</span>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading & Network Error States */}
      {query.isLoading && (
        <div
          role="status"
          className="rounded-xl border p-12 text-center text-xs"
          style={{
            borderColor: 'var(--border-main)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-muted)',
          }}
        >
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-600" />
          Loading profitability report from MongoDB Atlas…
        </div>
      )}

      {query.isError && !rangeError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5 text-xs"
          style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}
        >
          <span>Could not load report data from the server. Check your connection.</span>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="rounded-md border px-3 py-1.5 font-medium hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border-main)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Report Table Card */}
      {query.data && !rangeError && (
        <div
          className="flex flex-col rounded-xl border shadow-sm"
          style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}
        >
          {totalResults === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium">
                {search.trim() ? 'No records match your search criteria.' : 'No tasks or transactions found for this date period.'}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-subtle)' }}>
                {search.trim()
                  ? 'Try clearing the search box or searching by a different client name.'
                  : 'Adjust the Start Date and End Date filters to view records from another period.'}
              </p>
            </div>
          ) : view === 'list' ? (
            /* 1. LIST VIEW */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      backgroundColor: 'var(--bg-muted)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <th scope="col" className="px-4 py-3 font-semibold">Client Name</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Task ID</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Service</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Revenue</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Manpower Cost</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Expense</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Profit</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {paginatedRows.map((row) => {
                    const isRowDownloading = downloadingClient === (row.clientId || row.clientName);
                    return (
                      <tr
                        key={row.taskId}
                        className="transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        {/* Client Name */}
                        <td className="max-w-[200px] px-4 py-3 font-medium text-[var(--text-main)]">
                          <span className="line-clamp-2" title={row.clientName}>
                            {row.clientName}
                          </span>
                        </td>

                        {/* Task ID with Purple accent */}
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                          {row.taskId}
                        </td>

                        {/* Service Name */}
                        <td className="max-w-[220px] px-4 py-3 text-[var(--text-muted)]">
                          <span className="line-clamp-2" title={row.serviceName}>
                            {row.serviceName}
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-main)]">
                          {formatAmount(row.revenue)}
                        </td>

                        {/* Manpower Cost */}
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-main)]">
                          {formatAmount(row.manpowerCost)}
                        </td>

                        {/* Expense */}
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-main)]">
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
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
                            style={{
                              borderColor: 'var(--border-main)',
                              color: 'var(--primary)',
                            }}
                          >
                            {isRowDownloading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileDown className="h-3 w-3" />
                            )}
                            PDF
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      backgroundColor: 'var(--bg-muted)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <th scope="col" className="px-4 py-3 font-semibold">Client Name</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Task Count</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Revenue</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Manpower Cost</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Expense</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Profit</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {paginatedGroups.map((group) => {
                    const isClientDownloading = downloadingClient === (group.clientId || group.label);
                    return (
                      <tr
                        key={group.key}
                        className="transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <td className="max-w-[240px] px-4 py-3 font-medium text-[var(--text-main)]">
                          <span className="line-clamp-2" title={group.label}>
                            {group.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center font-mono font-medium">
                          {group.taskCount}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-main)]">
                          {formatAmount(group.revenue)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-main)]">
                          {formatAmount(group.manpowerCost)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-main)]">
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
                            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 disabled:opacity-50"
                            style={{ borderColor: 'var(--border-main)' }}
                          >
                            {isClientDownloading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileDown className="h-3 w-3" />
                            )}
                            Client PDF
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      backgroundColor: 'var(--bg-muted)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <th scope="col" className="px-4 py-3 font-semibold">Employee</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Task Count</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Revenue</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Manpower Cost</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Expense</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {paginatedGroups.map((group) => (
                    <tr
                      key={group.key}
                      className="transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      <td className="max-w-[240px] px-4 py-3 font-medium text-[var(--text-main)]">
                        {group.label}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center font-mono font-medium">
                        {group.taskCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-muted)]">
                        —
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-main)]">
                        {formatAmount(group.manpowerCost)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-muted)]">
                        —
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer with Pagination matching Reference Screenshot */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 border-t px-4 py-3 text-xs"
            style={{
              borderColor: 'var(--border-main)',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border px-2 py-1 text-xs focus-visible:outline-2"
                style={{
                  borderColor: 'var(--border-main)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                }}
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
                  className="rounded border p-1 transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: 'var(--border-main)' }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border p-1 transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: 'var(--border-main)' }}
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
