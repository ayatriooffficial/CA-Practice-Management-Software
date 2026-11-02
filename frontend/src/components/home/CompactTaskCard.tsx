"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Loader2, CheckCircle2 } from 'lucide-react';
import {
  dashboardSummaryApi,
  CompactTaskSummaryResponse,
  TaskGroupItem,
} from '../../services/dashboardSummaryApi';

type StatusTab = 'pending' | 'hold' | 'inProgress' | 'completed';

export const CompactTaskCard: React.FC = () => {
  const [data, setData] = useState<CompactTaskSummaryResponse | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await dashboardSummaryApi.getCompactTaskSummary();
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load task summary');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentGroups: TaskGroupItem[] = useMemo(() => {
    if (!data?.groups) return [];
    return data.groups[activeTab] || [];
  }, [data, activeTab]);

  const maxGroupCount = useMemo(() => {
    if (!currentGroups.length) return 1;
    return Math.max(...currentGroups.map((g) => g.count), 1);
  }, [currentGroups]);

  // Donut geometry for mini status chart
  const donutSummary = useMemo(() => {
    const summary = data?.statusSummary || {
      pending: 0,
      hold: 0,
      inProgress: 0,
      completed: 0,
      total: 0,
    };
    const total = summary.total || 1;
    const r = 24;
    const c = 2 * Math.PI * r;

    const pRatio = summary.pending / total;
    const hRatio = summary.hold / total;
    const ipRatio = summary.inProgress / total;
    const cRatio = summary.completed / total;

    return {
      total: summary.total,
      r,
      c,
      pendingOffset: 0,
      pendingLength: pRatio * c,
      holdOffset: -(pRatio * c),
      holdLength: hRatio * c,
      ipOffset: -((pRatio + hRatio) * c),
      ipLength: ipRatio * c,
      completedOffset: -((pRatio + hRatio + ipRatio) * c),
      completedLength: cRatio * c,
    };
  }, [data]);

  return (
    <div className="w-full h-full bg-white dark:bg-[#1e293b] rounded-none border border-gray-200 dark:border-[#334155] p-5 sm:p-6 flex flex-col justify-between shadow-2xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#31719B]" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Tasks Overview
          </h3>
        </div>

        <Link
          href="/task"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#31719B] dark:text-[#93c5fd] hover:underline"
        >
          <span>View All Tasks</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Due Counts Strip (Chips) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
        {/* Due Today */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-full border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20">
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
            Due Today
          </span>
          <span className="text-xs font-bold font-mono text-amber-800 dark:text-amber-200">
            {data?.dueStats?.dueToday ?? 0}
          </span>
        </div>

        {/* Due Tomorrow */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-full border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/60 dark:bg-purple-950/20">
          <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300">
            Due Tomorrow
          </span>
          <span className="text-xs font-bold font-mono text-purple-800 dark:text-purple-200">
            {data?.dueStats?.dueTomorrow ?? 0}
          </span>
        </div>

        {/* In 7 Days */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20">
          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            In 7 Days
          </span>
          <span className="text-xs font-bold font-mono text-emerald-800 dark:text-emerald-200">
            {data?.dueStats?.dueIn7Days ?? 0}
          </span>
        </div>

        {/* Overdue */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-full border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20">
          <span className="text-[10px] font-medium text-rose-700 dark:text-rose-300">
            Overdue
          </span>
          <span className="text-xs font-bold font-mono text-rose-800 dark:text-rose-200">
            {data?.dueStats?.overdue ?? 0}
          </span>
        </div>
      </div>

      {/* Segmented Control for Status Tabs */}
      <div className="flex items-center p-1 rounded-full bg-gray-100/80 dark:bg-[#0f172a] mt-3">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#93c5fd] shadow-xs'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Pending ({data?.statusSummary?.pending ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hold')}
          className={`flex-1 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
            activeTab === 'hold'
              ? 'bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#93c5fd] shadow-xs'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Hold ({data?.statusSummary?.hold ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inProgress')}
          className={`flex-1 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
            activeTab === 'inProgress'
              ? 'bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#93c5fd] shadow-xs'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          In Progress ({data?.statusSummary?.inProgress ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#93c5fd] shadow-xs'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Completed ({data?.statusSummary?.completed ?? 0})
        </button>
      </div>

      {/* Main Content Area: Groups + Mini Donut */}
      <div className="flex-1 flex flex-col md:flex-row items-center gap-4 mt-3 pt-1">
        {/* Left: Top groups list */}
        <div className="flex-1 w-full min-h-[160px] max-h-[190px] overflow-y-auto scrollbar-slim pr-1 space-y-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400 gap-2 py-8">
              <Loader2 size={16} className="animate-spin text-[#31719B]" />
              <span className="text-xs">Loading tasks...</span>
            </div>
          ) : error ? (
            <div className="p-3 rounded-none bg-red-50 text-red-600 text-xs">
              {error}
            </div>
          ) : currentGroups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-6 text-gray-400 dark:text-slate-500 gap-1">
              <CheckCircle2 size={16} />
              <span className="text-xs">No tasks in {activeTab} status</span>
            </div>
          ) : (
            currentGroups.slice(0, 6).map((group, idx) => {
              const barPercent = Math.min(100, Math.round((group.count / maxGroupCount) * 100));

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={group.name}>
                      {group.name}
                    </span>
                    <span className="font-bold font-mono text-gray-900 dark:text-white shrink-0 ml-2">
                      {group.count}
                    </span>
                  </div>

                  {/* Thin progress bar */}
                  <div className="w-full h-1.5 rounded-none bg-gray-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-none bg-[#31719B] dark:bg-[#3D88BF] transition-all duration-300"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Mini Donut Chart */}
        {!isLoading && (data?.statusSummary?.total || 0) > 0 && (
          <div className="flex flex-col items-center justify-center shrink-0 px-2 py-1">
            <div className="relative flex items-center justify-center w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r={donutSummary.r}
                  stroke="#f1f5f9"
                  strokeWidth="6"
                  fill="transparent"
                  className="dark:stroke-slate-800"
                />
                {/* Pending: Blue */}
                <circle
                  cx="30"
                  cy="30"
                  r={donutSummary.r}
                  stroke="#31719B"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${donutSummary.pendingLength} ${donutSummary.c}`}
                  strokeDashoffset={donutSummary.pendingOffset}
                />
                {/* Hold: Slate */}
                <circle
                  cx="30"
                  cy="30"
                  r={donutSummary.r}
                  stroke="#94a3b8"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${donutSummary.holdLength} ${donutSummary.c}`}
                  strokeDashoffset={donutSummary.holdOffset}
                />
                {/* In Progress: Amber */}
                <circle
                  cx="30"
                  cy="30"
                  r={donutSummary.r}
                  stroke="#f59e0b"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${donutSummary.ipLength} ${donutSummary.c}`}
                  strokeDashoffset={donutSummary.ipOffset}
                />
                {/* Completed: Emerald */}
                <circle
                  cx="30"
                  cy="30"
                  r={donutSummary.r}
                  stroke="#10b981"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${donutSummary.completedLength} ${donutSummary.c}`}
                  strokeDashoffset={donutSummary.completedOffset}
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold font-mono text-gray-900 dark:text-white leading-none">
                  {donutSummary.total}
                </span>
                <span className="text-[9px] text-gray-400 dark:text-slate-400 mt-0.5">
                  Tasks
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

