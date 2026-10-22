'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertCircle, Download, MoreVertical, Search } from 'lucide-react';
import { profitabilityReportApi, ProfitabilityReportResponse, ProfitabilityTaskRow } from '@/services/profitabilityReportApi';

type ReportView = 'list' | 'client' | 'employee';

interface ReportGroup {
  key: string;
  label: string;
  tasks: ProfitabilityTaskRow[];
  taskCount: number;
  revenue: number | null;
  manpowerCost: number | null;
  expense: number | null;
  profit: number | null;
}

const CURRENCY_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const now = new Date();
  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: ProfitabilityTaskRow[], view: ReportView, groups: ReportGroup[]) {
  const headers = view === 'list'
    ? ['Client Name', 'Task ID', 'Service', 'Revenue', 'Manpower Cost', 'Expense', 'Profit', 'Financial Data Status']
    : [view === 'client' ? 'Client Name' : 'Employee', 'Task Count', 'Revenue', 'Manpower Cost', 'Expense', 'Profit', 'Financial Data Status'];
  const body = view === 'list'
    ? rows.map((row) => [row.clientName, row.taskId, row.serviceName, row.revenue, row.manpowerCost, row.expense, row.profit, financialStatus(row)])
    : groups.map((group) => [group.label, group.taskCount, group.revenue, group.manpowerCost, group.expense, group.profit,
      group.profit === null ? 'Incomplete or not attributable' : 'Complete']);
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

function groupTasks(rows: ProfitabilityTaskRow[], view: Exclude<ReportView, 'list'>): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();
  rows.forEach((task) => {
    const label = view === 'client' ? task.clientName : task.assigneeName;
    const displayLabel = label.trim() || (view === 'client' ? 'Unknown client' : 'Unassigned');
    const key = view === 'client' ? task.clientId || displayLabel : displayLabel;
    const group = groups.get(key) || { key, label: displayLabel, tasks: [], taskCount: 0, revenue: null, manpowerCost: null, expense: null, profit: null };
    group.tasks.push(task);
    group.taskCount += 1;
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => ({
    ...group,
    revenue: sumMoney(group.tasks, 'revenue'),
    manpowerCost: sumMoney(group.tasks, 'manpowerCost'),
    expense: sumMoney(group.tasks, 'expense'),
    profit: sumMoney(group.tasks, 'profit'),
  })).sort((a, b) => a.label.localeCompare(b.label));
}

function groupEmployees(rows: ProfitabilityReportResponse['employeeRows'], tasks: ProfitabilityTaskRow[], search: string): ReportGroup[] {
  const term = search.trim().toLocaleLowerCase();
  const names = new Map(rows.map((row) => [row.employeeId, row.employeeName]));
  const grouped = new Map<string, { taskIds: Set<string>; costPaise: number }>();
  tasks.forEach((task) => task.employeeCosts.forEach((employee) => {
    const current = grouped.get(employee.employeeId) || { taskIds: new Set<string>(), costPaise: 0 };
    current.taskIds.add(task.taskId);
    current.costPaise += Math.round(employee.manpowerCost * 100);
    grouped.set(employee.employeeId, current);
  }));
  return [...grouped.entries()]
    .map(([employeeId, value]) => ({ employeeId, employeeName: names.get(employeeId) || 'Former employee', ...value }))
    .filter((employee) => !term || employee.employeeName.toLocaleLowerCase().includes(term))
    .map((employee) => ({
      key: employee.employeeId,
      label: employee.employeeName,
      tasks: [],
      taskCount: employee.taskIds.size,
      revenue: null,
      manpowerCost: employee.costPaise / 100,
      expense: null,
      profit: null,
    }));
}

function financialStatus(row: ProfitabilityTaskRow): string {
  const missing = Object.entries(row.completeness).filter(([, complete]) => !complete).map(([key]) => key);
  return missing.length ? `Incomplete: missing ${missing.join(', ')}` : 'Complete';
}

function sumMoney(rows: ProfitabilityTaskRow[], field: 'revenue' | 'manpowerCost' | 'expense' | 'profit'): number | null {
  if (rows.length === 0 || rows.some((row) => row[field] === null || !Number.isFinite(row[field]))) return null;
  const cents = rows.reduce((sum, row) => sum + Math.round((row[field] as number) * 100), 0);
  return cents / 100;
}

function formatAmount(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : CURRENCY_FORMAT.format(value);
}

function formatReportDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN');
}

function AmountCell({ value, profit = false, title }: { value: number | null; profit?: boolean; title?: string }) {
  const color = value === null ? 'var(--text-subtle)' : value < 0 ? undefined : profit ? undefined : 'var(--text-main)';
  const profitClass = value === null ? '' : value < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400';
  return <td title={title} aria-label={title} className={`whitespace-nowrap px-4 py-3 text-right text-sm ${profitClass}`} style={{ color }}>{formatAmount(value)}</td>;
}

export default function ProfitabilityReport() {
  const [initialRange] = useState(getCurrentMonthRange);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [view, setView] = useState<ReportView>('list');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

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
    return rows.filter((row) => [row.clientName, row.taskId, row.serviceName, row.assigneeName, ...row.employeeCosts.map((employee) => employee.employeeName)]
      .some((value) => value.toLocaleLowerCase().includes(term)));
  }, [query.data?.rows, search]);

  const groups = useMemo(() => {
    if (view === 'list') return [];
    if (view === 'client') return groupTasks(filteredRows, view);
    return groupEmployees(query.data?.employeeRows || [], filteredRows, search);
  }, [filteredRows, query.data?.employeeRows, search, view]);
  const resultCount = view === 'list' ? filteredRows.length : groups.length;
  const countText = rangeError ? '—' : query.data ? String(resultCount) : '—';

  const views: { id: ReportView; label: string }[] = [
    { id: 'list', label: 'List' },
    { id: 'client', label: 'Client' },
    { id: 'employee', label: 'Employee' },
  ];

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 lg:p-8" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
        <Link className="hover:underline" href="/reports">Reports</Link><span aria-hidden="true">&gt;</span><span>Others</span><span aria-hidden="true">&gt;</span><span aria-current="page" style={{ color: 'var(--text-main)' }}>Profitability Report</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Profitability Report ({countText})</h1><p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Financial activity by transaction date</p></div>
        <div className="relative">
          <button type="button" aria-label="More report actions" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', backgroundColor: 'var(--bg-surface)' }}><MoreVertical className="h-4 w-4" /></button>
          {menuOpen && <div role="menu" className="absolute right-0 z-20 mt-1 w-48 rounded-lg border py-1 shadow-[var(--shadow-dropdown)]" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}><button type="button" role="menuitem" onClick={() => { downloadCsv(filteredRows, view, groups); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px]"><Download className="h-4 w-4" /> Export CSV</button></div>}
        </div>
      </div>

      <section aria-label="Profitability report filters" className="mb-5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:flex-wrap sm:items-end" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}>
        <label className="flex min-w-[150px] flex-1 flex-col gap-1.5 text-xs font-medium sm:flex-none" htmlFor="profitability-from">Start Date<input id="profitability-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10 rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }} /></label>
        <label className="flex min-w-[150px] flex-1 flex-col gap-1.5 text-xs font-medium sm:flex-none" htmlFor="profitability-to">End Date<input id="profitability-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-10 rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }} /></label>
        <div className="flex rounded-lg border p-1" role="group" aria-label="Report view" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)' }}>
          {views.map((option) => <button key={option.id} type="button" aria-pressed={view === option.id} onClick={() => setView(option.id)} className="rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1" style={{ color: view === option.id ? 'var(--text-inverse)' : 'var(--text-muted)', backgroundColor: view === option.id ? 'var(--primary)' : 'transparent' }}>{option.label}</button>)}
        </div>
        <label className="relative min-w-[190px] flex-1 sm:ml-auto" htmlFor="profitability-search"><span className="sr-only">Search by client, task, service, or employee</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} /><input id="profitability-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search report" className="h-10 w-full rounded-md border py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }} /></label>
      </section>

      {rangeError && <div role="alert" className="mb-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--banner-border)', backgroundColor: 'var(--banner-bg)', color: 'var(--banner-text)' }}>{rangeError}</div>}

      {query.data && <div role="status" className="mb-4 flex gap-2 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--banner-border)', backgroundColor: 'var(--banner-bg)', color: 'var(--banner-text)' }}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Period basis: issued invoice date (credit notes reduce revenue), recorded time-entry work date, and approved expense incurred date. Payments do not count as revenue. Only records explicitly linked to a task are included; legacy financial records have not been imported. An em dash means required source data is unavailable, while ₹0.00 means a known zero. {query.data.historicalDataIncomplete && 'Profit remains incomplete wherever required financial history or expense/time completeness is unknown.'}</span></div>}

      {query.isLoading && <div role="status" className="rounded-xl border p-10 text-center text-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>Loading profitability report…</div>}
      {query.isError && !rangeError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5 text-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}><span>Could not load report data. Check the backend connection and try again.</span><button type="button" onClick={() => void query.refetch()} className="rounded-md border px-3 py-2 font-medium hover:bg-[var(--bg-hover)]" style={{ borderColor: 'var(--border-main)' }}>Retry</button></div>}

      {query.data && !rangeError && (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}>
          {resultCount === 0 ? <div className="p-10 text-center"><p className="text-sm font-medium">{search.trim() ? 'No results match your search.' : 'No linked financial activity found for this date range.'}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-subtle)' }}>{search.trim() ? 'Try another client, task ID, service, or employee.' : 'Only task-linked financial records dated in the selected period appear.'}</p></div> : view === 'list' ? (
            <div className="max-h-[calc(100vh-19rem)] overflow-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}><tr>{['Client Name', 'Task ID', 'Service', 'Revenue', 'Manpower Cost', 'Expense', 'Profit'].map((heading) => <th key={heading} scope="col" className={`whitespace-nowrap border-b px-4 py-3 text-xs font-semibold ${['Revenue', 'Manpower Cost', 'Expense', 'Profit'].includes(heading) ? 'text-right' : ''}`} style={{ borderColor: 'var(--border-main)' }}>{heading}</th>)}</tr></thead>
                <tbody>{filteredRows.map((row) => <tr key={row.taskId} className="border-b last:border-0 hover:bg-[var(--bg-hover)]" style={{ borderColor: 'var(--border-subtle)' }}><td className="max-w-64 break-words px-4 py-3 text-sm font-medium">{row.clientName}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-sm" style={{ color: 'var(--primary)' }}>{row.taskId}</td><td className="max-w-72 break-words px-4 py-3 text-sm">{row.serviceName}<span className="mt-0.5 block text-xs" style={{ color: 'var(--text-subtle)' }}>{row.assigneeName} · {formatReportDate(row.reportDate)}</span></td><AmountCell value={row.revenue} /><AmountCell value={row.manpowerCost} /><AmountCell value={row.expense} /><AmountCell value={row.profit} profit title={row.profit === null ? financialStatus(row) : undefined} /></tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-19rem)] overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}><tr>{[view === 'client' ? 'Client Name' : 'Employee', 'Task Count', 'Revenue', 'Manpower Cost', 'Expense', 'Profit'].map((heading) => <th key={heading} scope="col" className={`whitespace-nowrap border-b px-4 py-3 text-xs font-semibold ${heading !== (view === 'client' ? 'Client Name' : 'Employee') ? 'text-right' : ''}`} style={{ borderColor: 'var(--border-main)' }}>{heading}</th>)}</tr></thead>
                <tbody>{groups.map((group) => <tr key={group.key} className="border-b last:border-0 hover:bg-[var(--bg-hover)]" style={{ borderColor: 'var(--border-subtle)' }}><td className="max-w-80 break-words px-4 py-3 text-sm font-medium">{group.label}</td><td className="px-4 py-3 text-right text-sm">{group.taskCount}</td><AmountCell value={group.revenue} /><AmountCell value={group.manpowerCost} /><AmountCell value={group.expense} /><AmountCell value={group.profit} profit title={group.profit === null ? 'Incomplete or not attributable at employee level' : undefined} /></tr>)}</tbody>
              </table>
            </div>
          )}
          <div className="border-t px-4 py-3 text-xs" style={{ borderColor: 'var(--border-main)', color: 'var(--text-subtle)' }}>{resultCount} {view === 'list' ? 'task' : view === 'client' ? 'client' : 'employee'}{resultCount === 1 ? '' : 's'}{view === 'employee' && ' · employee view reports recorded labor cost; task revenue and expenses are not attributed to employees'}</div>
        </div>
      )}
    </div>
  );
}
