"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Users,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import {
  dashboardSummaryApi,
  CompactTaskSummaryResponse,
  InvoicingSummaryResponse,
  ComplianceSummaryResponse,
} from '../../services/dashboardSummaryApi';
import { clientApi, ClientStats } from '../../services/clientApi';
import { usePermission } from '../team/usePermission';

type BannerTab = 'tasks' | 'invoices' | 'clients' | 'compliance';

interface MetricCellData {
  key: string;
  count: number;
  prefix: string;
  suffix: string;
  colorClass: string;
  hoverClass: string;
  link: string;
}

export const TopTaskDueStrip: React.FC = () => {
  const { canView } = usePermission();
  const canViewRef = useRef(canView);
  canViewRef.current = canView;

  // Restore saved tab if available on initialization
  const [activeTab, setActiveTab] = useState<BannerTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ca_home_banner_tab') as BannerTab;
        if (saved && ['tasks', 'invoices', 'clients', 'compliance'].includes(saved)) {
          return saved;
        }
      }
    } catch {
      // Ignore
    }
    return 'tasks';
  });

  const [taskData, setTaskData] = useState<CompactTaskSummaryResponse | null>(null);
  const [invoicingData, setInvoicingData] = useState<InvoicingSummaryResponse | null>(null);
  const [clientData, setClientData] = useState<ClientStats | null>(null);
  const [complianceData, setComplianceData] = useState<ComplianceSummaryResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tabConfigs = useMemo(() => {
    const list = [
      { id: 'tasks' as BannerTab, label: 'Tasks', icon: CheckSquare, targetUrl: '/task', perm: 'task_manager' },
      { id: 'invoices' as BannerTab, label: 'Invoice', icon: FileText, targetUrl: '/invoice', perm: 'invoice' },
      { id: 'clients' as BannerTab, label: 'Clients', icon: Users, targetUrl: '/client', perm: 'clients' },
      { id: 'compliance' as BannerTab, label: 'Compliance', icon: ShieldCheck, targetUrl: '/compliance', perm: 'compliance_tracker' },
    ];
    return list.filter((t) => canView(t.perm));
  }, [canView]);

  const permittedTabKeys = useMemo(() => tabConfigs.map((t) => t.id).join(','), [tabConfigs]);

  // Adjust activeTab if current is not in permitted tabs
  useEffect(() => {
    if (tabConfigs.length > 0 && !tabConfigs.some((t) => t.id === activeTab)) {
      setActiveTab(tabConfigs[0].id);
    }
  }, [permittedTabKeys]);

  const handleTabChange = (tab: BannerTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('ca_home_banner_tab', tab);
    } catch {
      // Ignore
    }
  };

  const fetchAllMetrics = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const cv = canViewRef.current;
      const promises: Promise<any>[] = [];
      if (cv('task_manager')) {
        promises.push(
          dashboardSummaryApi.getCompactTaskSummary()
            .then(setTaskData)
            .catch(() => {})
        );
      }
      if (cv('invoice')) {
        promises.push(
          dashboardSummaryApi.getInvoicingSummary()
            .then(setInvoicingData)
            .catch(() => {})
        );
      }
      if (cv('clients')) {
        promises.push(
          clientApi.getClientStats()
            .then((res) => {
              if (res?.data) setClientData(res.data);
            })
            .catch(() => {})
        );
      }
      if (cv('compliance_tracker')) {
        promises.push(
          dashboardSummaryApi.getComplianceSummary()
            .then(setComplianceData)
            .catch(() => {})
        );
      }

      await Promise.allSettled(promises);
    } catch (err) {
      console.error('Failed to load top banner metrics', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMetrics();
  }, [fetchAllMetrics]);

  // Tab 1: Tasks Metrics
  const taskMetrics: MetricCellData[] = useMemo(() => {
    const s = taskData?.dueStats;
    return [
      {
        key: 'dueToday',
        count: s?.dueToday ?? 0,
        prefix: 'Due',
        suffix: 'Today',
        colorClass: 'text-amber-500 dark:text-amber-400',
        hoverClass: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
        link: '/task',
      },
      {
        key: 'dueTomorrow',
        count: s?.dueTomorrow ?? 0,
        prefix: 'Due',
        suffix: 'Tomorrow',
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        hoverClass: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
        link: '/task',
      },
      {
        key: 'dueThisWeek',
        count: s?.dueIn7Days ?? 0,
        prefix: 'Due',
        suffix: 'This Week',
        colorClass: 'text-emerald-500 dark:text-emerald-400',
        hoverClass: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
        link: '/task',
      },
      {
        key: 'dueThisMonth',
        count: s?.dueThisMonth ?? 0,
        prefix: 'Due',
        suffix: 'This Month',
        colorClass: 'text-sky-500 dark:text-sky-400',
        hoverClass: 'hover:bg-sky-50/50 dark:hover:bg-sky-950/20',
        link: '/task',
      },
      {
        key: 'overdueTotal',
        count: s?.overdue ?? 0,
        prefix: 'Overdue',
        suffix: 'Total Tasks',
        colorClass: 'text-rose-600 dark:text-rose-400',
        hoverClass: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
        link: '/task',
      },
    ];
  }, [taskData]);

  // Tab 2: Invoice Metrics
  const invoiceMetrics: MetricCellData[] = useMemo(() => {
    const inv = invoicingData;
    return [
      {
        key: 'overdueInvoices',
        count: inv?.overdueInvoices?.count ?? 0,
        prefix: 'Overdue',
        suffix: 'Invoices',
        colorClass: 'text-rose-600 dark:text-rose-400',
        hoverClass: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
        link: inv?.overdueInvoices?.link || '/invoice',
      },
      {
        key: 'draftInvoices',
        count: inv?.draftInvoices?.count ?? 0,
        prefix: 'Draft',
        suffix: 'Invoices',
        colorClass: 'text-amber-500 dark:text-amber-400',
        hoverClass: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
        link: inv?.draftInvoices?.link || '/invoice',
      },
      {
        key: 'unbilledTasks',
        count: inv?.unbilledTasks?.count ?? 0,
        prefix: 'Unbilled',
        suffix: 'Tasks',
        colorClass: 'text-blue-600 dark:text-blue-400',
        hoverClass: 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
        link: inv?.unbilledTasks?.link || '/task',
      },
      {
        key: 'pendingRetainers',
        count: inv?.pendingRetainers?.count ?? 0,
        prefix: 'Pending',
        suffix: 'Retainers',
        colorClass: 'text-purple-600 dark:text-purple-400',
        hoverClass: 'hover:bg-purple-50/50 dark:hover:bg-purple-950/20',
        link: inv?.pendingRetainers?.link || '/invoice',
      },
      {
        key: 'totalReceivables',
        count: inv?.totalReceivables?.count ?? 0,
        prefix: 'Total',
        suffix: 'Receivables',
        colorClass: 'text-teal-600 dark:text-teal-400',
        hoverClass: 'hover:bg-teal-50/50 dark:hover:bg-teal-950/20',
        link: inv?.totalReceivables?.link || '/invoice',
      },
    ];
  }, [invoicingData]);

  // Tab 3: Clients Metrics
  const clientMetrics: MetricCellData[] = useMemo(() => {
    const c = clientData;
    return [
      {
        key: 'newThisWeek',
        count: c?.newThisWeek ?? 0,
        prefix: 'New',
        suffix: 'This Week',
        colorClass: 'text-emerald-500 dark:text-emerald-400',
        hoverClass: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
        link: '/client',
      },
      {
        key: 'newThisMonth',
        count: c?.newThisMonth ?? 0,
        prefix: 'New',
        suffix: 'This Month',
        colorClass: 'text-sky-500 dark:text-sky-400',
        hoverClass: 'hover:bg-sky-50/50 dark:hover:bg-sky-950/20',
        link: '/client',
      },
      {
        key: 'clientsToConvert',
        count: c?.clientsToConvert ?? 0,
        prefix: 'Leads',
        suffix: 'To Convert',
        colorClass: 'text-amber-500 dark:text-amber-400',
        hoverClass: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
        link: '/leads',
      },
      {
        key: 'activeClients',
        count: c?.activeClients ?? 0,
        prefix: 'Active',
        suffix: 'Clients',
        colorClass: 'text-blue-600 dark:text-blue-400',
        hoverClass: 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
        link: '/client',
      },
      {
        key: 'totalClients',
        count: c?.totalClients ?? 0,
        prefix: 'Total',
        suffix: 'Clients',
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        hoverClass: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
        link: '/client',
      },
    ];
  }, [clientData]);

  // Tab 4: Compliance Metrics
  const complianceMetrics: MetricCellData[] = useMemo(() => {
    const comp = complianceData;
    return [
      {
        key: 'dueThisMonth',
        count: comp?.dueThisMonth ?? 0,
        prefix: 'Due',
        suffix: 'This Month',
        colorClass: 'text-sky-500 dark:text-sky-400',
        hoverClass: 'hover:bg-sky-50/50 dark:hover:bg-sky-950/20',
        link: '/compliance',
      },
      {
        key: 'pendingFilings',
        count: comp?.pending ?? 0,
        prefix: 'Pending',
        suffix: 'Filings',
        colorClass: 'text-amber-500 dark:text-amber-400',
        hoverClass: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
        link: '/compliance',
      },
      {
        key: 'missedFilings',
        count: comp?.missed ?? 0,
        prefix: 'Missed',
        suffix: 'Filings',
        colorClass: 'text-rose-600 dark:text-rose-400',
        hoverClass: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
        link: '/compliance',
      },
      {
        key: 'filedCompleted',
        count: comp?.filed ?? 0,
        prefix: 'Filed',
        suffix: 'Completed',
        colorClass: 'text-emerald-500 dark:text-emerald-400',
        hoverClass: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
        link: '/compliance',
      },
      {
        key: 'totalTracked',
        count: comp?.total ?? 0,
        prefix: 'Total',
        suffix: 'Tracked',
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        hoverClass: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
        link: '/compliance',
      },
    ];
  }, [complianceData]);

  const currentMetrics = useMemo(() => {
    switch (activeTab) {
      case 'invoices':
        return invoiceMetrics;
      case 'clients':
        return clientMetrics;
      case 'compliance':
        return complianceMetrics;
      case 'tasks':
      default:
        return taskMetrics;
    }
  }, [activeTab, taskMetrics, invoiceMetrics, clientMetrics, complianceMetrics]);

  if (tabConfigs.length === 0) return null;

  const activeConfig = tabConfigs.find((t) => t.id === activeTab) || tabConfigs[0];

  return (
    <div className="w-full bg-white dark:bg-[#1e293b] rounded-none border border-[#dde2e8] dark:border-[#334155] shadow-xs transition-all flex flex-col">
      {/* Category Tab Bar Header */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#162032] gap-2">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          {tabConfigs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-none transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#93c5fd] border-[#dde2e8] dark:border-[#334155] shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 border-transparent hover:bg-gray-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-[#31719B] dark:text-[#93c5fd]' : 'opacity-70'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Refresh & Link to module */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchAllMetrics(true)}
            title="Refresh metric counts"
            aria-label="Refresh metric counts"
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-none hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'animate-spin text-[#31719B] dark:text-[#93c5fd]' : ''}
            />
          </button>

          <Link
            href={activeConfig.targetUrl}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#31719B] dark:text-[#93c5fd] hover:underline"
          >
            <span>View {activeConfig.label}</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* 5 Big Single Numbers Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#dde2e8] dark:divide-[#334155]">
        {currentMetrics.map((item) => (
          <Link
            key={item.key}
            href={item.link}
            className={`group flex items-center gap-2.5 sm:gap-3.5 px-3 py-2.5 sm:px-6 sm:py-4 transition-colors cursor-pointer min-w-0 ${item.hoverClass}`}
          >
            {isLoading ? (
              <div className="h-9 w-12 bg-gray-200 dark:bg-slate-700 animate-pulse rounded-none" />
            ) : (
              <span
                className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-sans transition-transform duration-150 group-hover:scale-105 ${item.colorClass}`}
              >
                {item.count}
              </span>
            )}

            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-slate-400">
                {item.prefix}
              </span>
              <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-slate-200 truncate">
                {item.suffix}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
