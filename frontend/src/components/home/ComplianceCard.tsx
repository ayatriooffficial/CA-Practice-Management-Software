"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight, Loader2, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import {
  dashboardSummaryApi,
  ComplianceSummaryResponse,
  UpcomingComplianceItem,
} from '../../services/dashboardSummaryApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchDashboardRequest } from '@/store/features/dashboard/dashboardSlice';
import {
  selectDashboardComplianceSummary,
  selectDashboardLoading,
} from '@/store/features/dashboard/dashboardSelectors';
import { pageStateCache } from '@/services/pageStateCache';

export const ComplianceCard: React.FC = () => {
  const dispatch = useAppDispatch();
  const reduxComplianceData = useAppSelector(selectDashboardComplianceSummary);
  const isReduxLoading = useAppSelector(selectDashboardLoading);

  const [fallbackData, setFallbackData] = useState<ComplianceSummaryResponse | null>(() => {
    return pageStateCache.get<ComplianceSummaryResponse>('home_compliance_summary') || null;
  });
  const [error, setError] = useState<string | null>(null);

  const data = reduxComplianceData || fallbackData;
  const isLoading = isReduxLoading && !data;

  // Persist updated compliance data to session cache
  useEffect(() => {
    if (reduxComplianceData) {
      pageStateCache.set('home_compliance_summary', reduxComplianceData);
      setFallbackData(reduxComplianceData);
    }
  }, [reduxComplianceData]);

  useEffect(() => {
    if (!reduxComplianceData) {
      dispatch(fetchDashboardRequest());
    }
  }, [dispatch, reduxComplianceData]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.slice(0, 10).split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getPortalBadge = (portal: string) => {
    const p = (portal || '').toUpperCase();
    if (p.includes('GST')) {
      return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40';
    }
    if (p.includes('TDS') || p.includes('TAX')) {
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40';
    }
    if (p.includes('ROC') || p.includes('MCA')) {
      return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40';
    }
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40';
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'FILED') {
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40';
    }
    if (s === 'MISSED') {
      return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40';
    }
    return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40';
  };

  const upcomingList: UpcomingComplianceItem[] = data?.upcoming || [];

  return (
    <div className="w-full h-full bg-white dark:bg-[#1e293b] rounded-none border border-[#dde2e8] dark:border-[#334155] p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#31719B]" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>Compliance Deadlines</span>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/40">
              {data?.dueThisMonth ?? 0} Due This Month
            </span>
          </h3>
        </div>

        <Link
          href="/compliance"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#31719B] dark:text-[#93c5fd] hover:underline"
        >
          <span>View Calendar</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Main Content: Upcoming 5 Deadlines List */}
      <div className="flex-1 flex flex-col justify-between pt-2">
        {isLoading ? (
          <div className="h-44 flex items-center justify-center text-gray-400 gap-2">
            <Loader2 size={16} className="animate-spin text-[#31719B]" />
            <span className="text-xs">Loading compliance deadlines...</span>
          </div>
        ) : error ? (
          <div className="p-3 rounded-none bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        ) : upcomingList.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 gap-1.5 py-4">
            <CheckCircle2 size={24} className="text-emerald-500/80" />
            <span className="text-xs font-medium">All compliance filings are up to date</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
            {upcomingList.map((item) => (
              <Link
                key={item.id}
                href="/compliance"
                className="group py-2.5 px-2 -mx-2 flex items-center justify-between hover:bg-gray-50/70 dark:hover:bg-[#162032] transition-colors rounded-none"
              >
                {/* Left: Due Date */}
                <div className="flex items-center gap-2.5 min-w-[105px]">
                  <Calendar size={13} className="text-gray-400 dark:text-slate-500 shrink-0" />
                  <span className="text-xs font-bold font-mono text-gray-700 dark:text-slate-200">
                    {formatDate(item.date)}
                  </span>
                </div>

                {/* Middle: Title & Client */}
                <div className="flex-1 px-3 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#31719B] dark:group-hover:text-[#93c5fd] transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400 truncate">
                    {item.clientName || 'Practice Filing'}
                  </p>
                </div>

                {/* Right: Portal & Status */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold border ${getPortalBadge(
                      item.portal
                    )}`}
                  >
                    {item.portal || 'GST'}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold border ${getStatusBadge(
                      item.complianceStatus
                    )}`}
                  >
                    {item.complianceStatus || 'PENDING'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Bottom Quick Status Strip */}
        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
          <span>Pending: <strong className="text-amber-600 dark:text-amber-400">{data?.pending ?? 0}</strong></span>
          <span>Missed: <strong className="text-rose-600 dark:text-rose-400">{data?.missed ?? 0}</strong></span>
          <span>Filed: <strong className="text-emerald-600 dark:text-emerald-400">{data?.filed ?? 0}</strong></span>
          <span>Total Tracked: <strong className="text-gray-700 dark:text-slate-300">{data?.total ?? 0}</strong></span>
        </div>
      </div>
    </div>
  );
};

