"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  RotateCw,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Loader2,
  DollarSign,
} from 'lucide-react';
import {
  dashboardSummaryApi,
  InvoicingSummaryResponse,
} from '../../services/dashboardSummaryApi';

export const PendingInvoicingCard: React.FC = () => {
  const [data, setData] = useState<InvoicingSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await dashboardSummaryApi.getInvoicingSummary();
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load invoicing metrics');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatCurrency = (amt?: number) => {
    if (amt === undefined || amt === null) return '';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '0';
    return Number(num).toLocaleString('en-IN');
  };

  return (
    <div className="w-full h-full bg-white dark:bg-[#1e293b] rounded-none border border-gray-200 dark:border-[#334155] p-5 sm:p-6 flex flex-col justify-between shadow-2xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#31719B]" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Pending Invoicing
          </h3>
        </div>

        <Link
          href="/invoice"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#31719B] dark:text-[#93c5fd] hover:underline"
        >
          <span>View Invoices</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-around py-2 space-y-3">
        {isLoading ? (
          <div className="h-full min-h-[180px] flex items-center justify-center text-gray-400 gap-2">
            <Loader2 size={16} className="animate-spin text-[#31719B]" />
            <span className="text-xs">Loading invoicing metrics...</span>
          </div>
        ) : error ? (
          <div className="p-3 rounded-none bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        ) : (
          <>
            {/* Metric 1: Unbilled Tasks */}
            <Link
              href={data?.unbilledTasks?.link || '/task'}
              className="group p-3 rounded-none border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/60 bg-gray-50/50 dark:bg-[#0f172a]/60 hover:bg-blue-50/30 dark:hover:bg-[#131f38] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none flex items-center justify-center bg-blue-50 dark:bg-blue-950/60 text-[#31719B] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#31719B] transition-colors">
                    {data?.unbilledTasks?.label || 'Unbilled Tasks'}
                  </h4>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">
                    {data?.unbilledTasks?.description || 'Tasks not yet billed'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl sm:text-2xl font-bold font-mono text-[#31719B] dark:text-[#93c5fd]">
                  {formatNumber(data?.unbilledTasks?.count)}
                </span>
              </div>
            </Link>

            {/* Metric 2: Pending Retainer Invoices */}
            <Link
              href={data?.pendingRetainers?.link || '/invoice'}
              className="group p-3 rounded-none border border-gray-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/60 bg-gray-50/50 dark:bg-[#0f172a]/60 hover:bg-emerald-50/30 dark:hover:bg-[#10242a] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shrink-0">
                  <RotateCw size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 transition-colors">
                    {data?.pendingRetainers?.label || 'Pending Retainer Invoices'}
                  </h4>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">
                    {data?.pendingRetainers?.description || 'Retainer invoices not up to date'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatNumber(data?.pendingRetainers?.count)}
                </span>
              </div>
            </Link>

            {/* Metric 3: Overdue Invoices */}
            <Link
              href={data?.overdueInvoices?.link || '/invoice'}
              className="group p-3 rounded-none border border-gray-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/60 bg-gray-50/50 dark:bg-[#0f172a]/60 hover:bg-rose-50/30 dark:hover:bg-[#2b1520] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none flex items-center justify-center bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-rose-600 transition-colors">
                    {data?.overdueInvoices?.label || 'Overdue Invoices'}
                  </h4>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">
                    {data?.overdueInvoices?.description || 'Invoices past due date'}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  {formatNumber(data?.overdueInvoices?.count)}
                </span>
                {(data?.overdueInvoices?.amount || 0) > 0 && (
                  <span className="text-[10px] font-semibold text-rose-500 mt-0.5">
                    {formatCurrency(data?.overdueInvoices?.amount)}
                  </span>
                )}
              </div>
            </Link>

            {/* Metric 4: Draft Invoices */}
            <Link
              href={data?.draftInvoices?.link || '/invoice'}
              className="group p-3 rounded-none border border-gray-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/60 bg-gray-50/50 dark:bg-[#0f172a]/60 hover:bg-amber-50/30 dark:hover:bg-[#2a2215] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none flex items-center justify-center bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-amber-600 transition-colors">
                    {data?.draftInvoices?.label || 'Draft Invoices'}
                  </h4>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">
                    {data?.draftInvoices?.description || 'Awaiting issuance'}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {formatNumber(data?.draftInvoices?.count)}
                </span>
                {(data?.draftInvoices?.amount || 0) > 0 && (
                  <span className="text-[10px] font-semibold text-amber-500 mt-0.5">
                    {formatCurrency(data?.draftInvoices?.amount)}
                  </span>
                )}
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

