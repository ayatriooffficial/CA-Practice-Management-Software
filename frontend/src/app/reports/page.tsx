'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowRight,
  Search,
  FileText,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

interface ActiveReport {
  id: string;
  name: string;
  description: string;
  href: string;
  category: string;
  icon: typeof TrendingUp;
  iconBg: string;
  iconColor: string;
  features: string[];
  capabilities: {
    pdfExport: boolean;
    csvExport: boolean;
    multiView: boolean;
  };
}

const ACTIVE_REPORTS: ActiveReport[] = [
  {
    id: 'profitability',
    name: 'Profitability Report',
    description:
      'Comprehensive financial profitability performance across practice clients, tasks, and employees with revenue, labor costs, and operational expenses.',
    href: '/reports/others/profitability',
    category: 'Financial & Operational',
    icon: TrendingUp,
    iconBg: '#eeedfd',
    iconColor: '#31719B',
    features: [
      '3 Analytical Views (List, Client-Grouped, Employee-Grouped)',
      'Vector PDF Report Generation with Running Headers',
      'Client-Wise Statement Export with Single-Click PDF',
      'Raw Data CSV Export for Spreadsheets',
    ],
    capabilities: {
      pdfExport: true,
      csvExport: true,
      multiView: true,
    },
  },
];

export default function ReportsDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ACTIVE_REPORTS;
    return ACTIVE_REPORTS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.features.some((f) => f.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors select-none">
      {/* Breadcrumb matching Global UI */}
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        <span aria-current="page" className="font-semibold text-gray-800 dark:text-gray-200">
          Reports
        </span>
      </nav>

      {/* Header Row */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white">
            Reports
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Standard practice reports, operational audits, and financial summaries
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            id="reports-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by name or keyword..."
            className="h-9 w-full rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Overview Metric Bar */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 rounded-none shadow-2xs">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {ACTIVE_REPORTS.length}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
              Active Reports
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-none bg-[#eeedfd] dark:bg-[#31719B]/20 text-[#31719B] dark:text-[#60a5fa] shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 rounded-none shadow-2xs">
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
              100%
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
              Live Data Sync
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-none bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 rounded-none shadow-2xs">
          <div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 leading-tight">
              PDF & CSV
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
              Export Formats
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-none bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Reports Column (2/3 width on desktop) */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#dde2e8] dark:border-[#334155] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Available Reports ({filteredReports.length})
            </h2>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Filtered & Ready for Production
            </span>
          </div>

          {filteredReports.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-8 text-center rounded-none shadow-2xs">
              <Search className="mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                No matching reports found
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Try searching with a different term such as &ldquo;profitability&rdquo; or &ldquo;financial&rdquo;.
              </p>
            </div>
          ) : (
            filteredReports.map((report) => {
              const ReportIcon = report.icon;
              return (
                <div
                  key={report.id}
                  className="group relative flex flex-col justify-between border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 rounded-none shadow-2xs transition-all hover:border-[#31719B] dark:hover:border-[#31719B]"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none shadow-2xs"
                          style={{ backgroundColor: report.iconBg, color: report.iconColor }}
                        >
                          <ReportIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                              {report.name}
                            </h3>
                            <span className="rounded-none border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Active
                            </span>
                          </div>
                          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                            Category: {report.category}
                          </p>
                        </div>
                      </div>

                      {/* Open Action Button */}
                      <Link
                        href={report.href}
                        className="inline-flex items-center gap-1.5 rounded-none bg-[#31719B] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-[#3D88BF] cursor-pointer"
                      >
                        <span>Open Report</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>

                    {/* Description */}
                    <p className="mt-3.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                      {report.description}
                    </p>

                    {/* Features List */}
                    <div className="mt-4 border-t border-[#dde2e8] dark:border-[#334155] pt-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                        Included Features & Export Formats
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {report.features.map((feature, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
                          >
                            <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#31719B]" />
                            <span className="line-clamp-1">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Bar */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#dde2e8] dark:border-[#334155] pt-3 text-[11px] text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Vector PDF Statements
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        CSV Export
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#31719B] dark:text-[#60a5fa]" />
                        Client-Wise Breakdown
                      </span>
                    </div>

                    <Link
                      href={report.href}
                      className="text-xs font-semibold text-[#31719B] dark:text-[#60a5fa] hover:underline"
                    >
                      View Report Details →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Practice Overview & Methodology Column (1/3 width on desktop) */}
        <div className="space-y-4">
          <div className="border-b border-[#dde2e8] dark:border-[#334155] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Practice Analytics Insights
            </h2>
          </div>

          {/* Practice Info Card */}
          <div className="border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 rounded-none shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-none bg-[#eeedfd] dark:bg-[#31719B]/20 text-[#31719B] dark:text-[#60a5fa]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Audited Practice Metrics
                </h3>
                <p className="text-[11px] text-gray-400">Multi-tenant Data Isolation</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              All report calculations are strictly derived from your organization&apos;s verified task time records, approved employee disbursements, and issued invoices.
            </p>

            <div className="border-t border-[#dde2e8] dark:border-[#334155] pt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Revenue Attribution:</span>
                <span className="font-semibold text-gray-900 dark:text-white">Issued Invoices</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Manpower Rates:</span>
                <span className="font-semibold text-gray-900 dark:text-white">Internal Cost / Hr</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Direct Expenses:</span>
                <span className="font-semibold text-gray-900 dark:text-white">Approved Out-of-Pocket</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Net Profit:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Revenue - Cost - Exp</span>
              </div>
            </div>
          </div>

          {/* Quick Access Card */}
          <div className="border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 rounded-none shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Direct Quick Links
            </h3>
            <div className="space-y-1.5">
              <Link
                href="/reports/others/profitability"
                className="flex items-center justify-between p-2 rounded-none hover:bg-gray-50 dark:hover:bg-gray-800/40 text-xs font-medium text-[#31719B] dark:text-[#60a5fa] transition-colors"
              >
                <span>Profitability Report (Primary)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/reports/profitability"
                className="flex items-center justify-between p-2 rounded-none hover:bg-gray-50 dark:hover:bg-gray-800/40 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <span>Profitability Report (Direct URL)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/invoice"
                className="flex items-center justify-between p-2 rounded-none hover:bg-gray-50 dark:hover:bg-gray-800/40 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <span>Billing & Invoice Management</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
