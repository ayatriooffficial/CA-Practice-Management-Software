"use client";

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  FileText,
  DollarSign,
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Printer,
  Eye,
  Paperclip,
  ArrowUpRight,
  Percent,
  Briefcase,
  Building,
} from 'lucide-react';
import {
  FIRM_DETAILS,
  MOCK_EMPLOYEE_CLAIMS,
  MOCK_PROFITABILITY,
  MOCK_GST_SUPPLIES,
  MOCK_SLA_RETAINERS,
  MOCK_USER_REVENUES,
  MOCK_CLIENTS_LIST,
} from './mockData';
import { useInvoice } from './InvoiceContext';

interface ReportMenuItem {
  id: string;
  title: string;
  description: string;
}

const REPORT_MENU: ReportMenuItem[] = [
  {
    id: 'dashboard',
    title: 'Analytics Dashboard',
    description: 'MoM charts, collection trends, service & client breakdown',
  },
  {
    id: 'master',
    title: 'Master Sales Report',
    description: 'All invoices with payment, task and assignee details',
  },
  {
    id: 'receipts',
    title: 'Payment Receipts',
    description: 'List of all payment receipts with method and reference',
  },
  {
    id: 'receivable',
    title: 'Receivable / Pending',
    description: 'All pending and partially paid invoices with aging',
  },
  {
    id: 'proforma',
    title: 'Proforma Invoice Report',
    description: 'List of proforma invoices',
  },
  {
    id: 'reimbursement',
    title: 'Reimbursement',
    description: 'Client-billed reimbursement invoices (pass-through expenses)',
  },
  {
    id: 'employeeReimb',
    title: 'Employee Reimbursement Claims',
    description: 'Employee expense-claim approval workflow — category, receipt, status',
  },
  {
    id: 'byclient',
    title: 'Sales by Client',
    description: 'Revenue grouped by client with collection rate',
  },
  {
    id: 'byuser',
    title: 'Revenue by User',
    description: 'Revenue grouped by assignee / team member',
  },
  {
    id: 'profit',
    title: 'Profitability Report',
    description: 'Revenue, manpower cost, expense and profit per task',
  },
  {
    id: 'sla',
    title: 'SLA Retainer Fee Report',
    description: 'Client-wise team hours, cost, revenue and margin',
  },
  {
    id: 'consolidate',
    title: 'Invoice Consolidate',
    description: 'Client & group wise invoice summary with drill-down',
  },
  {
    id: 'gst',
    title: 'GST Report',
    description: 'GSTR-1 outward supplies — B2B, B2C, HSN, documents (best-effort)',
  },
];

export const AnalyticsView: React.FC = () => {
  const { invoices, proformas, reimbursements, receipts } = useInvoice();

  const [activeReportId, setActiveReportId] = useState<string>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('This FY');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusChip, setStatusChip] = useState<string>('All');
  const [claimStatus, setClaimStatus] = useState<'All' | 'Applied' | 'Approved' | 'Rejected'>('All');
  const [profitView, setProfitView] = useState<'list' | 'client' | 'employee'>('list');
  const [gstTab, setGstTab] = useState<'B2B' | 'B2C' | 'Nil' | 'HSN' | 'Docs'>('B2B');
  const [consolidateTab, setConsolidateTab] = useState<'client' | 'group' | 'groupedInv' | 'nonGroupedInv'>('client');
  const [receivablesOnly, setReceivablesOnly] = useState<boolean>(false);
  const [userRoleTab, setUserRoleTab] = useState<'Assignee' | 'Reviewer' | 'Both'>('Assignee');
  const [slaFilter, setSlaFilter] = useState<'All' | 'SLA' | 'NoSLA'>('All');
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set(['client-1']));
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set(['user-1']));
  const [expandedConsolidateKeys, setExpandedConsolidateKeys] = useState<Set<string>>(new Set());

  const toggleClientExpand = (id: string) => {
    setExpandedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUserExpand = (id: string) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleConsolidateExpand = (key: string) => {
    setExpandedConsolidateKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Global Invoice Calculations
  const totalBilled = useMemo(() => invoices.reduce((sum, i) => sum + i.totalPayable, 0), [invoices]);
  const totalCollected = useMemo(() => invoices.reduce((sum, i) => sum + i.paidAmount, 0), [invoices]);
  const totalOutstanding = useMemo(() => invoices.reduce((sum, i) => sum + i.balanceAmount, 0), [invoices]);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
  const avgInvoice = invoices.length > 0 ? Math.round(totalBilled / invoices.length) : 0;

  // Active Report Item
  const activeReport = REPORT_MENU.find((r) => r.id === activeReportId) || REPORT_MENU[0];

  // Aggregated Client Data for "Sales by Client"
  const clientAggregates = useMemo(() => {
    const map = new Map<string, {
      clientId: string;
      businessName: string;
      legalName: string;
      group: string;
      invoicesCount: number;
      totalInvoiced: number;
      totalReceived: number;
      balance: number;
      collectionRate: number;
      invoices: typeof invoices;
    }>();

    invoices.forEach((inv) => {
      const existing = map.get(inv.clientId);
      if (!existing) {
        map.set(inv.clientId, {
          clientId: inv.clientId,
          businessName: inv.clientBusinessName,
          legalName: inv.clientLegalName,
          group: inv.clientGroup,
          invoicesCount: 1,
          totalInvoiced: inv.totalPayable,
          totalReceived: inv.paidAmount,
          balance: inv.balanceAmount,
          collectionRate: inv.totalPayable > 0 ? Math.round((inv.paidAmount / inv.totalPayable) * 100) : 0,
          invoices: [inv],
        });
      } else {
        existing.invoicesCount += 1;
        existing.totalInvoiced += inv.totalPayable;
        existing.totalReceived += inv.paidAmount;
        existing.balance += inv.balanceAmount;
        existing.collectionRate = existing.totalInvoiced > 0
          ? Math.round((existing.totalReceived / existing.totalInvoiced) * 100)
          : 0;
        existing.invoices.push(inv);
      }
    });

    return Array.from(map.values());
  }, [invoices]);

  // Aggregated Group Data for "Invoice Consolidate"
  const groupAggregates = useMemo(() => {
    const map = new Map<string, {
      groupName: string;
      clientsCount: Set<string>;
      invoicesCount: number;
      totalBilled: number;
      totalCollected: number;
      totalOutstanding: number;
      collectionRate: number;
      invoices: typeof invoices;
    }>();

    invoices.forEach((inv) => {
      const gName = inv.clientGroup || 'Un-grouped';
      const existing = map.get(gName);
      if (!existing) {
        map.set(gName, {
          groupName: gName,
          clientsCount: new Set([inv.clientId]),
          invoicesCount: 1,
          totalBilled: inv.totalPayable,
          totalCollected: inv.paidAmount,
          totalOutstanding: inv.balanceAmount,
          collectionRate: 0,
          invoices: [inv],
        });
      } else {
        existing.clientsCount.add(inv.clientId);
        existing.invoicesCount += 1;
        existing.totalBilled += inv.totalPayable;
        existing.totalCollected += inv.paidAmount;
        existing.totalOutstanding += inv.balanceAmount;
        existing.invoices.push(inv);
      }
    });

    map.forEach((item) => {
      item.collectionRate = item.totalBilled > 0
        ? Math.round((item.totalCollected / item.totalBilled) * 100)
        : 0;
    });

    return Array.from(map.values());
  }, [invoices]);

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row bg-[#f8fafc] dark:bg-[#0f172a] select-none text-gray-800 dark:text-gray-200 transition-colors">
      {/* Left Reports Menu Sidebar (~340px width with generous padding) */}
      <div className="w-full md:w-[340px] shrink-0 bg-white dark:bg-[#1e293b] border-r border-[#e5e7eb] dark:border-[#334155] p-3.5 space-y-1.5 overflow-y-auto max-h-[calc(100vh-100px)]">
        <div className="px-2 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Practice Reports ({REPORT_MENU.length})
        </div>
        {REPORT_MENU.map((item) => {
          const isActive = activeReportId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveReportId(item.id);
                setStatusChip('All');
                setSearchQuery('');
              }}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#eeedfd] dark:bg-[#7367F0]/20 border-l-4 border-[#7367F0] text-[#7367F0] font-semibold shadow-2xs'
                  : 'border-transparent hover:border-[#e5e7eb] dark:hover:border-[#334155] hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="text-xs font-bold leading-tight text-gray-900 dark:text-white">
                {item.title}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 font-normal leading-relaxed">
                {item.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Content Area */}
      <div className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-6">
        {/* Top Header of Right Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#334155]">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {activeReport.title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {activeReport.description}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7367F0] hover:bg-[#6357e8] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <span>{FIRM_DETAILS.name}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            1. ANALYTICS DASHBOARD
           ========================================================================= */}
        {activeReportId === 'dashboard' && (
          <div className="space-y-6">
            {/* 5 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Billed</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">
                  ₹{totalBilled.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">{invoices.length} invoices · Current FY</div>
              </div>

              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Collected</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">
                  ₹{totalCollected.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">{collectionRate}% collection rate</div>
              </div>

              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Outstanding</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">
                  ₹{totalOutstanding.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">across all 12 months</div>
              </div>

              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Active Clients</div>
                <div className="text-2xl font-bold text-orange-600 mt-1.5">
                  10
                </div>
                <div className="text-[11px] text-gray-500 mt-1">across 6 client groups</div>
              </div>

              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Avg Invoice</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">
                  ₹{avgInvoice.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">per invoice · Current FY</div>
              </div>
            </div>

            {/* Month-over-Month Trend SVG Chart */}
            <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  Month-over-Month Trend — Current FY 2026-27
                </span>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7367F0]" /> Billed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" /> Collected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" /> Outstanding
                  </span>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="w-full h-44 overflow-hidden pt-2">
                <svg className="w-full h-full" viewBox="0 0 600 150" preserveAspectRatio="none">
                  <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="75" x2="600" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="120" x2="600" y2="120" stroke="#f1f5f9" strokeWidth="1" />

                  <polyline
                    fill="none"
                    stroke="#7367F0"
                    strokeWidth="2.5"
                    points="25,120 75,100 125,110 175,85 225,95 275,60 325,40 375,120 425,120 475,120 525,120 575,120"
                  />
                  <polyline
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    points="25,120 75,115 125,115 175,100 225,105 275,80 325,70 375,120 425,120 475,120 525,120 575,120"
                  />
                  <polyline
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2.5"
                    strokeDasharray="4"
                    points="25,120 75,120 125,120 175,110 225,115 275,105 325,90 375,120 425,120 475,120 525,120 575,120"
                  />
                </svg>
              </div>

              {/* Month Pills Underneath */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 text-[11px] text-center text-gray-500 font-medium">
                {['Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27'].map((m) => (
                  <div key={m} className="p-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
                    {m}
                  </div>
                ))}
              </div>
            </div>

            {/* Service Revenue Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] space-y-3.5 shadow-2xs">
                <span className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                  Top Practice Services by Revenue
                </span>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold pb-1">
                      <span>GST Monthly & Annual Compliance</span>
                      <span>₹1,56,000 (37%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#7367F0] h-full rounded-full" style={{ width: '37%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold pb-1">
                      <span>Statutory & Tax Audit</span>
                      <span>₹1,26,000 (30%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold pb-1">
                      <span>Corporate ROC Retainer</span>
                      <span>₹67,000 (16%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '16%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold pb-1">
                      <span>International Taxation & 15CB</span>
                      <span>₹42,480 (10%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: '10%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] space-y-3.5 shadow-2xs">
                <span className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                  Recent Collection Receipts
                </span>
                <div className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {receipts.slice(0, 4).map((r) => (
                    <div key={r.id} className="py-2.5 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{r.businessName}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{r.receiptNo} · {r.method}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">₹{r.amount.toLocaleString('en-IN')}</div>
                        <div className="text-[10.5px] text-gray-400">{r.paymentDate}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            2. MASTER SALES REPORT
           ========================================================================= */}
        {activeReportId === 'master' && (
          <div className="space-y-5">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Invoices</div>
                <div className="text-2xl font-bold text-blue-600 mt-1.5">{invoices.length}</div>
                <div className="text-[11px] text-gray-500 mt-1">Generated this FY</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Invoice Value</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">₹{totalBilled.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">Gross billing</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Amount Collected</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">₹{totalCollected.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">{collectionRate}% collected</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Balance Pending</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">₹{totalOutstanding.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">Receivable balance</div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {['All', 'Pending', 'Partial', 'Paid', 'Write Off', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusChip(st)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      statusChip === st
                        ? 'bg-[#7367F0] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#475569] text-gray-700 dark:text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {st} ({st === 'All' ? invoices.length : invoices.filter(i => i.status.includes(st)).length})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                  />
                </div>
                <button
                  type="button"
                  className="h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">Invoice No</th>
                    <th className="py-3.5 px-4">Billing Org</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Service</th>
                    <th className="py-3.5 px-4">Assignee</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Paid</th>
                    <th className="py-3.5 px-4">Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {invoices
                    .filter(inv => statusChip === 'All' || inv.status.includes(statusChip))
                    .filter(inv => !searchQuery || inv.number.toLowerCase().includes(searchQuery.toLowerCase()) || inv.clientBusinessName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                        <td className="py-3.5 px-4 font-semibold text-[#7367F0]">{inv.number}</td>
                        <td className="py-3.5 px-4 text-gray-500">{inv.billingOrg}</td>
                        <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">{inv.clientBusinessName}</td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{inv.services[0]?.serviceName || '—'}</td>
                        <td className="py-3.5 px-4 text-gray-500">{inv.assignee || 'CA Krishna'}</td>
                        <td className="py-3.5 px-4 font-semibold">₹{inv.totalPayable.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-green-600 font-medium">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 font-bold text-red-600">₹{inv.balanceAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            inv.status === 'Paid'
                              ? 'bg-green-100 text-green-700'
                              : inv.status === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            3. PAYMENT RECEIPTS (Screenshot 1)
           ========================================================================= */}
        {activeReportId === 'receipts' && (
          <div className="space-y-5">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Receipts</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">{receipts.length}</div>
                <div className="text-[11px] text-gray-500 mt-1">Recorded this FY</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Amount Collected</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">₹{totalCollected.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">From all payment modes</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Bank Transfer / NEFT</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">
                  ₹{receipts.filter(r => r.method.includes('Transfer') || r.method.includes('NEFT')).reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Direct wire settlements</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">UPI & Others</div>
                <div className="text-2xl font-bold text-orange-600 mt-1.5">
                  ₹{receipts.filter(r => r.method === 'UPI' || r.method === 'Cheque').reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Instant settlements</div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {['All', 'Bank Transfer', 'NEFT', 'UPI', 'Cheque'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setStatusChip(m)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      statusChip === m
                        ? 'bg-[#7367F0] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#475569] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search receipt / client..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                  />
                </div>
                <button
                  type="button"
                  className="h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Receipts Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">Receipt No</th>
                    <th className="py-3.5 px-4">Payment Date</th>
                    <th className="py-3.5 px-4">Client Name</th>
                    <th className="py-3.5 px-4">Invoice Ref</th>
                    <th className="py-3.5 px-4">Payment Mode</th>
                    <th className="py-3.5 px-4">Bank Account</th>
                    <th className="py-3.5 px-4">Reference No</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {receipts
                    .filter(r => statusChip === 'All' || r.method === statusChip)
                    .filter(r => !searchQuery || r.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) || r.businessName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                        <td className="py-3.5 px-4 font-semibold text-[#7367F0] font-mono">{r.receiptNo}</td>
                        <td className="py-3.5 px-4 text-gray-500">{r.paymentDate}</td>
                        <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">{r.businessName}</td>
                        <td className="py-3.5 px-4 font-medium text-[#7367F0]">{r.invoiceNumber || 'Advance'}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-[#7367F0] border border-[#7367F0]/30">
                            {r.method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{r.bankName}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-500">{r.referenceNumber}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-green-600">₹{r.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            4. PROFORMA INVOICE REPORT (Screenshot 2)
           ========================================================================= */}
        {activeReportId === 'proforma' && (
          <div className="space-y-5">
            {/* 3 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Proforma Invoices</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">{proformas.length}</div>
                <div className="text-[11px] text-gray-500 mt-1">Quotations generated</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Estimated Amount</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">
                  ₹{proformas.reduce((s, p) => s + p.totalPayable, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Pre-billing estimates</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Converted to Tax Invoices</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">2 Converted</div>
                <div className="text-[11px] text-gray-500 mt-1">3 pending acceptance</div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search proformas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                  />
                </div>
              </div>
              <button
                type="button"
                className="h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            {/* Proforma Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">Proforma No</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4">Client Name</th>
                    <th className="py-3.5 px-4">Primary Service</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {proformas
                    .filter(p => !searchQuery || p.number.toLowerCase().includes(searchQuery.toLowerCase()) || p.clientBusinessName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                        <td className="py-3.5 px-4 font-semibold text-[#7367F0]">{p.number}</td>
                        <td className="py-3.5 px-4 text-gray-500">{p.date}</td>
                        <td className="py-3.5 px-4 text-gray-500">{p.dueDate}</td>
                        <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">{p.clientBusinessName}</td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{p.services[0]?.serviceName || '—'}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">₹{p.totalPayable.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            p.status === 'Converted'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-[#7367F0]'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            5. REIMBURSEMENT (Screenshot 3)
           ========================================================================= */}
        {activeReportId === 'reimbursement' && (
          <div className="space-y-5">
            {/* 5 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Reimbursements</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">{reimbursements.length}</div>
                <div className="text-[11px] text-gray-500 mt-1">Pass-through claims</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Billed Amount</div>
                <div className="text-2xl font-bold text-blue-600 mt-1.5">
                  ₹{reimbursements.reduce((s, r) => s + r.totalPayable, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Incurred & billed</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Collected Amount</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">
                  ₹{reimbursements.reduce((s, r) => s + r.paidAmount, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Recovered from clients</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Outstanding Amount</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">
                  ₹{reimbursements.reduce((s, r) => s + r.balanceAmount, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">To be recovered</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Recovery Rate</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1.5">32.8%</div>
                <div className="text-[11px] text-gray-500 mt-1">Target: 100% pass-thru</div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {['All', 'Paid', 'Partially Paid', 'Receivable', 'Overdue'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusChip(st)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      statusChip === st
                        ? 'bg-[#7367F0] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#475569] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search challan / client..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                  />
                </div>
                <button
                  type="button"
                  className="h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Reimbursement Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">Challan No</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Particulars</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Paid</th>
                    <th className="py-3.5 px-4">Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {reimbursements
                    .filter(r => statusChip === 'All' || r.status.includes(statusChip))
                    .filter(r => !searchQuery || r.number.toLowerCase().includes(searchQuery.toLowerCase()) || r.clientBusinessName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                        <td className="py-3.5 px-4 font-semibold text-[#7367F0]">{r.number}</td>
                        <td className="py-3.5 px-4 text-gray-500">{r.date}</td>
                        <td className="py-3.5 px-4 text-gray-500">{r.dueDate}</td>
                        <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">{r.clientBusinessName}</td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{r.services[0]?.serviceName}</td>
                        <td className="py-3.5 px-4 font-semibold">₹{r.totalPayable.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-green-600 font-medium">₹{r.paidAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 font-bold text-red-600">₹{r.balanceAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            r.status === 'Paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            6. SALES BY CLIENT (Screenshot 4 - Accordion expandable rows)
           ========================================================================= */}
        {activeReportId === 'byclient' && (
          <div className="space-y-5">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Clients Billed</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">{clientAggregates.length} Clients</div>
                <div className="text-[11px] text-gray-500 mt-1">With active practice billing</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Gross Billed</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">₹{totalBilled.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">Total across clients</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Collected</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">₹{totalCollected.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">{collectionRate}% collection rate</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Outstanding Receivables</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">₹{totalOutstanding.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">Pending payments</div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search client business name or group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#7367F0]"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none"
                >
                  <option value="This FY">This FY 2026-27</option>
                  <option value="Q3">Q3 (Oct-Dec 2026)</option>
                  <option value="Last FY">Last FY 2025-26</option>
                </select>
                <button
                  type="button"
                  className="h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Accordion Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4 w-10"></th>
                    <th className="py-3.5 px-4">Client Business Name</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4 text-center">Invoices Count</th>
                    <th className="py-3.5 px-4">Total Invoiced</th>
                    <th className="py-3.5 px-4">Total Received</th>
                    <th className="py-3.5 px-4">Balance</th>
                    <th className="py-3.5 px-4 text-center">Collection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {clientAggregates
                    .filter(c => !searchQuery || c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || c.group.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((c) => {
                      const isExpanded = expandedClientIds.has(c.clientId);

                      return (
                        <React.Fragment key={c.clientId}>
                          <tr
                            onClick={() => toggleClientExpand(c.clientId)}
                            className="hover:bg-gray-50/70 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4 text-gray-400">
                              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90 text-[#7367F0]' : ''}`} />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-gray-900 dark:text-white">{c.businessName}</div>
                              <div className="text-[10.5px] text-gray-400 font-normal">{c.legalName}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-[#7367F0] font-semibold text-[11px]">
                                {c.group}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-gray-700 dark:text-gray-300">
                              {c.invoicesCount}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                              ₹{c.totalInvoiced.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-green-600 font-semibold">
                              ₹{c.totalReceived.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-red-600">
                              ₹{c.balance.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold">
                              <span className={c.collectionRate >= 80 ? 'text-green-600' : c.collectionRate >= 40 ? 'text-amber-600' : 'text-red-500'}>
                                {c.collectionRate}%
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Invoices Drawer */}
                          {isExpanded && (
                            <tr className="bg-gray-50/60 dark:bg-[#0f172a]/60">
                              <td colSpan={8} className="p-4 pl-12 space-y-2">
                                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                  Invoices for {c.businessName} ({c.invoices.length})
                                </div>
                                <div className="rounded-lg border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-gray-100/70 dark:bg-[#1e293b] border-b border-[#e5e7eb] dark:border-[#334155] text-gray-600 dark:text-gray-400 font-semibold">
                                        <th className="py-2.5 px-3">Invoice No</th>
                                        <th className="py-2.5 px-3">Date</th>
                                        <th className="py-2.5 px-3">Service</th>
                                        <th className="py-2.5 px-3">Invoice Value</th>
                                        <th className="py-2.5 px-3">Paid</th>
                                        <th className="py-2.5 px-3">Balance</th>
                                        <th className="py-2.5 px-3">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                                      {c.invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-gray-50/50">
                                          <td className="py-2.5 px-3 font-semibold text-[#7367F0]">{inv.number}</td>
                                          <td className="py-2.5 px-3 text-gray-500">{inv.date}</td>
                                          <td className="py-2.5 px-3">{inv.services[0]?.serviceName}</td>
                                          <td className="py-2.5 px-3 font-semibold">₹{inv.totalPayable.toLocaleString('en-IN')}</td>
                                          <td className="py-2.5 px-3 text-green-600 font-medium">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                                          <td className="py-2.5 px-3 font-bold text-red-600">₹{inv.balanceAmount.toLocaleString('en-IN')}</td>
                                          <td className="py-2.5 px-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                                              inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                              {inv.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            7. REVENUE BY USER (Screenshot 21 - Segmented toggle & team rows)
           ========================================================================= */}
        {activeReportId === 'byuser' && (
          <div className="space-y-5">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Active Team Members</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">{MOCK_USER_REVENUES.length} Members</div>
                <div className="text-[11px] text-gray-500 mt-1">Handling billing portfolio</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Managed Revenue</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">
                  ₹{MOCK_USER_REVENUES.reduce((s, u) => s + u.totalRevenue, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Across all assignees</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Collected</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">
                  ₹{MOCK_USER_REVENUES.reduce((s, u) => s + u.collectedAmount, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Recovered by team</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Pending Collection</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">
                  ₹{MOCK_USER_REVENUES.reduce((s, u) => s + u.pendingAmount, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Outstanding recovery</div>
              </div>
            </div>

            {/* Segmented Controls & Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-[#e5e7eb] dark:border-[#334155]">
                {(['Assignee', 'Reviewer', 'Both'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setUserRoleTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      userRoleTab === tab
                        ? 'bg-white dark:bg-[#1e293b] text-[#7367F0] shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* User Revenue Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4 w-10"></th>
                    <th className="py-3.5 px-4">Team Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4 text-center">Invoices Count</th>
                    <th className="py-3.5 px-4">Total Revenue</th>
                    <th className="py-3.5 px-4">Collected Amount</th>
                    <th className="py-3.5 px-4">Pending Amount</th>
                    <th className="py-3.5 px-4">Avg Invoice</th>
                    <th className="py-3.5 px-4 text-center">Collection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {MOCK_USER_REVENUES
                    .filter(u => userRoleTab === 'Both' || u.role === userRoleTab || u.role === 'Both')
                    .map((u) => {
                      const isExpanded = expandedUserIds.has(u.id);

                      return (
                        <React.Fragment key={u.id}>
                          <tr
                            onClick={() => toggleUserExpand(u.id)}
                            className="hover:bg-gray-50/70 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4 text-gray-400">
                              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90 text-[#7367F0]' : ''}`} />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#eeedfd] text-[#7367F0] font-bold flex items-center justify-center text-xs">
                                  {u.member.split(' ').map(n => n[0]).join('')}
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white">{u.member}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-gray-700 dark:text-gray-300">
                              {u.invoicesCount}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                              ₹{u.totalRevenue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-green-600 font-semibold">
                              ₹{u.collectedAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-red-600">
                              ₹{u.pendingAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                              ₹{u.avgInvoiceValue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold">
                              <span className={u.collectionRate >= 70 ? 'text-green-600' : u.collectionRate >= 30 ? 'text-amber-600' : 'text-red-500'}>
                                {u.collectionRate}%
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Member's Invoices Drawer */}
                          {isExpanded && (
                            <tr className="bg-gray-50/60 dark:bg-[#0f172a]/60">
                              <td colSpan={9} className="p-4 pl-12 space-y-2">
                                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                  Invoices handled by {u.member}
                                </div>
                                <div className="rounded-lg border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-gray-100/70 dark:bg-[#1e293b] border-b border-[#e5e7eb] dark:border-[#334155] text-gray-600 dark:text-gray-400 font-semibold">
                                        <th className="py-2.5 px-3">Invoice No</th>
                                        <th className="py-2.5 px-3">Client</th>
                                        <th className="py-2.5 px-3">Service</th>
                                        <th className="py-2.5 px-3">Amount</th>
                                        <th className="py-2.5 px-3">Paid</th>
                                        <th className="py-2.5 px-3">Balance</th>
                                        <th className="py-2.5 px-3">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                                      {invoices.slice(0, 3).map((inv) => (
                                        <tr key={inv.id} className="hover:bg-gray-50/50">
                                          <td className="py-2.5 px-3 font-semibold text-[#7367F0]">{inv.number}</td>
                                          <td className="py-2.5 px-3 font-medium">{inv.clientBusinessName}</td>
                                          <td className="py-2.5 px-3">{inv.services[0]?.serviceName}</td>
                                          <td className="py-2.5 px-3 font-semibold">₹{inv.totalPayable.toLocaleString('en-IN')}</td>
                                          <td className="py-2.5 px-3 text-green-600">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                                          <td className="py-2.5 px-3 font-bold text-red-600">₹{inv.balanceAmount.toLocaleString('en-IN')}</td>
                                          <td className="py-2.5 px-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                                              inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                              {inv.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            8. INVOICE CONSOLIDATE (Screenshot 8 - Client/Group drill-down)
           ========================================================================= */}
        {activeReportId === 'consolidate' && (
          <div className="space-y-5">
            {/* 6 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Invoices</div>
                <div className="text-2xl font-bold text-blue-600 mt-1.5">{invoices.length}</div>
                <div className="text-[11px] text-gray-500 mt-1">Consolidated count</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Billed</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">₹{totalBilled.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">Gross billing</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Collected</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">₹{totalCollected.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">{collectionRate}% realized</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Outstanding</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">₹{totalOutstanding.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">Pending dues</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Grouped Clients</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1.5">6 Clients</div>
                <div className="text-[11px] text-gray-500 mt-1">Across 3 groups</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Un-grouped Clients</div>
                <div className="text-2xl font-bold text-amber-600 mt-1.5">4 Clients</div>
                <div className="text-[11px] text-gray-500 mt-1">Direct entities</div>
              </div>
            </div>

            {/* Filter Chips & Receivables > 0 Switch */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'client', label: 'Client Wise' },
                  { id: 'group', label: 'Group Wise' },
                  { id: 'groupedInv', label: 'Grouped Invoices' },
                  { id: 'nonGroupedInv', label: 'Non-Grouped Invoices' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setConsolidateTab(chip.id as any)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      consolidateTab === chip.id
                        ? 'bg-[#7367F0] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#475569] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                {/* Receivables > 0 Switch */}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={receivablesOnly}
                    onChange={(e) => setReceivablesOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-[#7367F0] accent-[#7367F0]"
                  />
                  <span>Receivables &gt; 0</span>
                </label>

                <button
                  type="button"
                  className="h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">{consolidateTab === 'group' ? 'Group Name' : 'Client Business Name'}</th>
                    <th className="py-3.5 px-4">{consolidateTab === 'group' ? 'Clients in Group' : 'Group'}</th>
                    <th className="py-3.5 px-4 text-center">Invoices Count</th>
                    <th className="py-3.5 px-4">Total Billed</th>
                    <th className="py-3.5 px-4">Total Collected</th>
                    <th className="py-3.5 px-4">Outstanding Balance</th>
                    <th className="py-3.5 px-4 text-center">Collection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {consolidateTab === 'group' ? (
                    groupAggregates
                      .filter(g => !receivablesOnly || g.totalOutstanding > 0)
                      .map((g) => (
                        <tr key={g.groupName} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">{g.groupName}</td>
                          <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{g.clientsCount.size} Clients</td>
                          <td className="py-3.5 px-4 text-center font-bold">{g.invoicesCount}</td>
                          <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">₹{g.totalBilled.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-4 text-green-600 font-semibold">₹{g.totalCollected.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-4 font-bold text-red-600">₹{g.totalOutstanding.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-[#7367F0]">{g.collectionRate}%</td>
                        </tr>
                      ))
                  ) : (
                    clientAggregates
                      .filter(c => !receivablesOnly || c.balance > 0)
                      .map((c) => (
                        <tr key={c.clientId} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">{c.businessName}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-[#7367F0] font-semibold text-[11px]">
                              {c.group}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">{c.invoicesCount}</td>
                          <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">₹{c.totalInvoiced.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-4 text-green-600 font-semibold">₹{c.totalReceived.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-4 font-bold text-red-600">₹{c.balance.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-[#7367F0]">{c.collectionRate}%</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            9. SLA RETAINER FEE REPORT (Screenshot 5 - Subtexts under cards & profit bars)
           ========================================================================= */}
        {activeReportId === 'sla' && (
          <div className="space-y-5">
            {/* 5 Stat Cards with Subtexts */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Retainer Clients</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">{MOCK_SLA_RETAINERS.length} Clients</div>
                <div className="text-[11px] text-gray-500 mt-1">Active Retainer Agreements</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Retainer Revenue</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">
                  ₹{MOCK_SLA_RETAINERS.reduce((s, r) => s + r.retainerRevenue, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Monthly Committed Revenue</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Team Cost</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">
                  ₹{MOCK_SLA_RETAINERS.reduce((s, r) => s + r.teamCost, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Direct Manpower Cost</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Net Retainer Profit</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">
                  ₹{MOCK_SLA_RETAINERS.reduce((s, r) => s + r.netProfit, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Revenue minus Team Cost</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Average Margin %</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1.5">57.3%</div>
                <div className="text-[11px] text-gray-500 mt-1">Target: &gt;50% gross margin</div>
              </div>
            </div>

            {/* Filter Chips & Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {[
                  { id: 'All', label: 'All Clients (5)' },
                  { id: 'SLA', label: 'With Active SLA (4)' },
                  { id: 'NoSLA', label: 'Ad-hoc / No SLA (1)' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSlaFilter(chip.id as any)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      slaFilter === chip.id
                        ? 'bg-[#7367F0] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#475569] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#1e293b] hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* SLA Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">Client Name</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4 text-center">SLA Status</th>
                    <th className="py-3.5 px-4 text-center">Monthly Hours</th>
                    <th className="py-3.5 px-4">Hourly Rate</th>
                    <th className="py-3.5 px-4">Team Cost</th>
                    <th className="py-3.5 px-4">Retainer Revenue</th>
                    <th className="py-3.5 px-4">Net Profit</th>
                    <th className="py-3.5 px-4 text-center">Margin %</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {MOCK_SLA_RETAINERS
                    .filter(s => slaFilter === 'All' || (slaFilter === 'SLA' && s.hasSla) || (slaFilter === 'NoSLA' && !s.hasSla))
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">{s.client}</td>
                        <td className="py-3.5 px-4 text-gray-500">{s.group}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            s.hasSla ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {s.hasSla ? 'Active SLA' : 'Ad-hoc'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-medium">{s.monthlyHours} hrs</td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">₹{s.hourlyRate}/hr</td>
                        <td className="py-3.5 px-4 text-red-500 font-medium">₹{s.teamCost.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">₹{s.retainerRevenue.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 font-bold text-green-600">₹{s.netProfit.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-cyan-600">{s.marginPercent}%</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            s.status === 'Profitable'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            10. EMPLOYEE REIMBURSEMENT CLAIMS
           ========================================================================= */}
        {activeReportId === 'employeeReimb' && (
          <div className="space-y-5">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Claims</div>
                <div className="text-2xl font-bold text-blue-600 mt-1.5">{MOCK_EMPLOYEE_CLAIMS.length}</div>
                <div className="text-[11px] text-gray-500 mt-1">Submitted claims</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Applied (Pending)</div>
                <div className="text-2xl font-bold text-amber-600 mt-1.5">
                  {MOCK_EMPLOYEE_CLAIMS.filter(c => c.status === 'Applied').length}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Awaiting partner approval</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Approved Claims</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">
                  {MOCK_EMPLOYEE_CLAIMS.filter(c => c.status === 'Approved').length}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Ready for settlement</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Claimed Value</div>
                <div className="text-2xl font-bold text-purple-600 mt-1.5">
                  ₹{MOCK_EMPLOYEE_CLAIMS.reduce((s, c) => s + c.amount, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Reimbursable expenses</div>
              </div>
            </div>

            {/* Status Chips Toolbar */}
            <div className="flex items-center gap-2">
              {(['All', 'Applied', 'Approved', 'Rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setClaimStatus(st)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                    claimStatus === st
                      ? 'bg-[#7367F0] text-white shadow-2xs'
                      : 'bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#475569] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {st} ({st === 'All' ? MOCK_EMPLOYEE_CLAIMS.length : MOCK_EMPLOYEE_CLAIMS.filter(c => c.status === st).length})
                </button>
              ))}
            </div>

            {/* Claims Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">Task ID</th>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Particulars</th>
                    <th className="py-3.5 px-4">Claim Date</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4 text-center">Receipts</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {MOCK_EMPLOYEE_CLAIMS
                    .filter(c => claimStatus === 'All' || c.status === claimStatus)
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#7367F0]">{c.taskId}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">{c.employee}</td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{c.client}</td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{c.particulars}</td>
                        <td className="py-3.5 px-4 text-gray-500">{c.date}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">₹{c.amount.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                            <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                            <span>{c.attachments}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            c.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            c.paymentStatus === 'Paid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {c.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            11. PROFITABILITY REPORT
           ========================================================================= */}
        {activeReportId === 'profit' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Revenue</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">₹2,18,000</div>
                <div className="text-[11px] text-gray-500 mt-1">Practice revenue</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Manpower Cost</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">₹87,000</div>
                <div className="text-[11px] text-gray-500 mt-1">Direct labor costs</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Net Profit</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">₹1,30,300</div>
                <div className="text-[11px] text-gray-500 mt-1">Gross earnings</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Avg Profit Margin</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">59.8%</div>
                <div className="text-[11px] text-gray-500 mt-1">Healthy CA margin</div>
              </div>
            </div>

            {/* Segmented Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProfitView('list')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  profitView === 'list' ? 'bg-[#7367F0] text-white shadow-2xs' : 'bg-white border text-gray-700'
                }`}
              >
                Task Wise
              </button>
              <button
                type="button"
                onClick={() => setProfitView('client')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  profitView === 'client' ? 'bg-[#7367F0] text-white shadow-2xs' : 'bg-white border text-gray-700'
                }`}
              >
                Group by Client
              </button>
              <button
                type="button"
                onClick={() => setProfitView('employee')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  profitView === 'employee' ? 'bg-[#7367F0] text-white shadow-2xs' : 'bg-white border text-gray-700'
                }`}
              >
                Group by Employee
              </button>
            </div>

            {/* Profitability Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Task ID</th>
                    <th className="py-3.5 px-4">Service</th>
                    <th className="py-3.5 px-4">Revenue</th>
                    <th className="py-3.5 px-4">Manpower Cost</th>
                    <th className="py-3.5 px-4">Expense</th>
                    <th className="py-3.5 px-4">Profit</th>
                    <th className="py-3.5 px-4 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {MOCK_PROFITABILITY.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">{p.client}</td>
                      <td className="py-3.5 px-4 text-[#7367F0] font-mono font-medium">{p.taskId}</td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{p.service}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">₹{p.revenue.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-red-500 font-medium">₹{p.manpowerCost.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-gray-500">₹{p.expense.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-bold text-green-600">₹{p.profit.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-cyan-600">{p.marginPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            12. RECEIVABLE / PENDING
           ========================================================================= */}
        {activeReportId === 'receivable' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Receivable</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">₹{totalOutstanding.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">Pending payments</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Value</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">₹{totalBilled.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">Gross billed</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Collected</div>
                <div className="text-2xl font-bold text-green-600 mt-1.5">₹{totalCollected.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mt-1">Settled payments</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Overdue</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">2 invoices</div>
                <div className="text-[11px] text-gray-500 mt-1">Past due date</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Partially Paid</div>
                <div className="text-2xl font-bold text-orange-600 mt-1.5">2 invoices</div>
                <div className="text-[11px] text-gray-500 mt-1">Installment balance</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Pending</div>
                <div className="text-2xl font-bold text-blue-600 mt-1.5">3 invoices</div>
                <div className="text-[11px] text-gray-500 mt-1">Within due date</div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">Invoice No</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4">Invoice Date</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-center">Days Past Due</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Paid</th>
                    <th className="py-3.5 px-4">Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {invoices.filter(i => i.balanceAmount > 0).map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4 font-semibold text-[#7367F0]">{inv.number}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">{inv.clientBusinessName}</td>
                      <td className="py-3.5 px-4 text-gray-500">{inv.clientGroup}</td>
                      <td className="py-3.5 px-4 text-gray-500">{inv.date}</td>
                      <td className="py-3.5 px-4 text-gray-500">{inv.dueDate}</td>
                      <td className={`py-3.5 px-4 text-center font-bold ${(inv.daysPastDue || 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {inv.daysPastDue || 0}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">₹{inv.totalPayable.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-green-600 font-medium">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-bold text-red-600">₹{inv.balanceAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            13. GST REPORT (GSTR-1 Outward Supplies)
           ========================================================================= */}
        {activeReportId === 'gst' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Taxable Value</div>
                <div className="text-2xl font-bold text-[#7367F0] mt-1.5">₹1,50,000</div>
                <div className="text-[11px] text-gray-500 mt-1">B2B Supplies</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">IGST Output</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1.5">₹10,800</div>
                <div className="text-[11px] text-gray-500 mt-1">Inter-state supply</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">CGST Output</div>
                <div className="text-2xl font-bold text-blue-600 mt-1.5">₹8,100</div>
                <div className="text-[11px] text-gray-500 mt-1">Intra-state central</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">SGST Output</div>
                <div className="text-2xl font-bold text-blue-600 mt-1.5">₹8,100</div>
                <div className="text-[11px] text-gray-500 mt-1">Intra-state state</div>
              </div>
              <div className="p-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xs">
                <div className="text-xs font-medium text-gray-500">Total Tax Liability</div>
                <div className="text-2xl font-bold text-red-600 mt-1.5">₹27,000</div>
                <div className="text-[11px] text-gray-500 mt-1">Payable in cash/ITC</div>
              </div>
            </div>

            {/* GST Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setGstTab('B2B')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                  gstTab === 'B2B' ? 'bg-[#7367F0] text-white shadow-2xs' : 'bg-white dark:bg-[#1e293b] border border-[#dde2e8] text-gray-700'
                }`}
              >
                B2B (4A,4B,6B,6C) ({MOCK_GST_SUPPLIES.length})
              </button>
              <button
                type="button"
                onClick={() => setGstTab('B2C')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#1e293b] border border-[#dde2e8] text-gray-700"
              >
                B2C Small (7) (0)
              </button>
              <button
                type="button"
                onClick={() => setGstTab('Nil')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#1e293b] border border-[#dde2e8] text-gray-700"
              >
                Nil rated/Exempt (8) (0)
              </button>
              <button
                type="button"
                onClick={() => setGstTab('HSN')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#1e293b] border border-[#dde2e8] text-gray-700"
              >
                HSN Summary (12) (0)
              </button>
              <button
                type="button"
                onClick={() => setGstTab('Docs')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#1e293b] border border-[#dde2e8] text-gray-700"
              >
                Documents Issued (13) (5)
              </button>
            </div>

            {/* GST Table */}
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 font-semibold">
                    <th className="py-3.5 px-4">GSTIN/UIN</th>
                    <th className="py-3.5 px-4">Receiver Name</th>
                    <th className="py-3.5 px-4">Invoice No</th>
                    <th className="py-3.5 px-4">Invoice Date</th>
                    <th className="py-3.5 px-4">Invoice Value</th>
                    <th className="py-3.5 px-4">Place of Supply</th>
                    <th className="py-3.5 px-4">Rate %</th>
                    <th className="py-3.5 px-4">Taxable Value</th>
                    <th className="py-3.5 px-4">Integrated Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#334155]">
                  {MOCK_GST_SUPPLIES.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4 font-mono font-medium">{row.gstin}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">{row.receiverName}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#7367F0]">{row.invoiceNo}</td>
                      <td className="py-3.5 px-4 text-gray-500">{row.invoiceDate}</td>
                      <td className="py-3.5 px-4 font-semibold">₹{row.invoiceValue.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4">{row.placeOfSupply}</td>
                      <td className="py-3.5 px-4 font-mono">{row.applicableRate}%</td>
                      <td className="py-3.5 px-4">₹{row.taxableValue.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-bold text-cyan-600">₹{row.integratedTax.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
