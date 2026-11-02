"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MoreHorizontal, RefreshCw, ArrowUpRight } from 'lucide-react';
import {
  dashboardSummaryApi,
  CompactTaskSummaryResponse,
} from '../../services/dashboardSummaryApi';

interface MetricItem {
  key: string;
  count: number;
  prefix: string;
  suffix: string;
  colorClass: string;
  hoverClass: string;
  filterParam: string;
}

export const TopTaskDueStrip: React.FC = () => {
  const [data, setData] = useState<CompactTaskSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchSummary = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      const res = await dashboardSummaryApi.getCompactTaskSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load task due metrics', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const dueStats = data?.dueStats;

  const metrics: MetricItem[] = [
    {
      key: 'dueToday',
      count: dueStats?.dueToday ?? 0,
      prefix: 'Due',
      suffix: 'Today',
      colorClass: 'text-amber-500 dark:text-amber-400',
      hoverClass: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
      filterParam: 'dueToday',
    },
    {
      key: 'dueTomorrow',
      count: dueStats?.dueTomorrow ?? 0,
      prefix: 'Due',
      suffix: 'Tomorrow',
      colorClass: 'text-indigo-600 dark:text-indigo-400',
      hoverClass: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
      filterParam: 'dueTomorrow',
    },
    {
      key: 'dueIn7Days',
      count: dueStats?.dueIn7Days ?? 0,
      prefix: 'Due',
      suffix: 'In 7 days',
      colorClass: 'text-emerald-500 dark:text-emerald-400',
      hoverClass: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
      filterParam: 'dueIn7Days',
    },
    {
      key: 'overdueUpTo7Days',
      count: dueStats?.overdueUpTo7Days ?? 0,
      prefix: 'Overdue',
      suffix: 'Up to 7 days',
      colorClass: 'text-orange-500 dark:text-orange-400',
      hoverClass: 'hover:bg-orange-50/50 dark:hover:bg-orange-950/20',
      filterParam: 'overdueUpTo7Days',
    },
    {
      key: 'overdueMoreThan7Days',
      count: dueStats?.overdueMoreThan7Days ?? 0,
      prefix: 'Overdue',
      suffix: '>7 days',
      colorClass: 'text-rose-600 dark:text-rose-400',
      hoverClass: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
      filterParam: 'overdueMoreThan7Days',
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-[#1e293b] rounded-none border border-gray-200 dark:border-[#334155] shadow-2xs transition-all relative">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center">
        {/* Metric Items Grid / Flex */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-[#334155]/60">
          {metrics.map((item) => (
            <Link
              key={item.key}
              href="/task"
              className={`group flex items-center gap-3.5 px-5 py-3.5 sm:px-6 sm:py-4 transition-colors cursor-pointer ${item.hoverClass}`}
            >
              {isLoading ? (
                <div className="h-9 w-12 bg-gray-200 dark:bg-slate-700 animate-pulse rounded-none" />
              ) : (
                <span
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-sans transition-transform duration-150 group-hover:scale-105 ${item.colorClass}`}
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

        {/* Action Menu (...) */}
        <div
          ref={menuRef}
          className="relative hidden lg:flex items-center justify-center px-4 border-l border-gray-100 dark:border-[#334155]/60 shrink-0"
        >
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            aria-label="More options"
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-none hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <MoreHorizontal
              size={18}
              className={isRefreshing ? 'animate-spin text-[#31719B]' : ''}
            />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-3 top-full mt-1.5 w-48 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] shadow-lg z-30 py-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  fetchSummary(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing ? 'animate-spin text-[#31719B]' : ''}
                />
                <span>Refresh Counts</span>
              </button>

              <Link
                href="/task"
                onClick={() => setShowMenu(false)}
                className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-700 dark:text-slate-300 transition-colors"
              >
                <span>Open Task Module</span>
                <ArrowUpRight size={13} className="text-gray-400" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
