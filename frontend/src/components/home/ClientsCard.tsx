"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Users, ArrowUpRight, Loader2, TrendingUp, UserPlus, CheckCircle2 } from 'lucide-react';
import { clientApi, ClientStats } from '../../services/clientApi';

export const ClientsCard: React.FC = () => {
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await clientApi.getClientStats();
        if (isMounted && res?.data) {
          setStats(res.data);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load client statistics');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // 7-month trend data
  const trend = useMemo(() => {
    if (stats?.registrationTrend && stats.registrationTrend.length > 0) {
      return stats.registrationTrend;
    }
    // Fallback default months if empty
    return [
      { month: 'May', count: 0 },
      { month: 'Jun', count: 0 },
      { month: 'Jul', count: 0 },
      { month: 'Aug', count: 0 },
      { month: 'Sep', count: 0 },
      { month: 'Oct', count: 0 },
      { month: 'Nov', count: stats?.newThisMonth ?? 0 },
    ];
  }, [stats]);

  // SVG Geometry Calculation
  const svgData = useMemo(() => {
    const width = 340;
    const height = 90;
    const padX = 20;
    const padTop = 15;
    const padBottom = 22;

    const counts = trend.map((t) => t.count);
    const maxVal = Math.max(...counts, 4); // minimum ceiling for aesthetic curve

    const points = trend.map((item, idx) => {
      const x = padX + (idx / (trend.length - 1)) * (width - 2 * padX);
      const ratio = item.count / maxVal;
      const y = height - padBottom - ratio * (height - padTop - padBottom);
      return { x, y, count: item.count, month: item.month };
    });

    // Build SVG path string with curved bezier or polyline
    const pathD = points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const prev = points[i - 1];
      const cx = ((prev.x + p.x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prev.y.toFixed(1)}, ${cx} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }, '');

    // Closed path for subtle gradient fill
    const firstP = points[0];
    const lastP = points[points.length - 1];
    const areaD = `${pathD} L ${lastP.x.toFixed(1)} ${height - padBottom} L ${firstP.x.toFixed(1)} ${height - padBottom} Z`;

    return { width, height, points, pathD, areaD, padBottom };
  }, [trend]);

  return (
    <div className="w-full h-full bg-white dark:bg-[#1e293b] rounded-none border border-[#dde2e8] dark:border-[#334155] p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#31719B]" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>New Clients Trend</span>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#31719B] dark:text-[#93c5fd] border border-blue-200/50 dark:border-blue-800/40">
              {stats?.totalClients ?? 0}
            </span>
          </h3>
        </div>

        <Link
          href="/client"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#31719B] dark:text-[#93c5fd] hover:underline"
        >
          <span>View All Clients</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Main Content: SVG Line Chart & Metric Summary */}
      <div className="flex-1 flex flex-col justify-between pt-3 gap-3">
        {isLoading ? (
          <div className="h-44 flex items-center justify-center text-gray-400 gap-2">
            <Loader2 size={16} className="animate-spin text-[#31719B]" />
            <span className="text-xs">Loading client trend...</span>
          </div>
        ) : error ? (
          <div className="p-3 rounded-none bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        ) : (
          <>
            {/* Simple Pure-SVG Line Graph */}
            <div className="w-full bg-[#f8fafc] dark:bg-[#0f172a] p-2 border border-[#dde2e8] dark:border-[#334155] rounded-none">
              <div className="flex items-center justify-between px-2 pt-1 pb-1">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                  <TrendingUp size={12} className="text-[#31719B] dark:text-[#93c5fd]" />
                  Monthly Registrations (Past 7 Months)
                </span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
                  Total: {stats?.totalClients ?? 0}
                </span>
              </div>

              <div className="w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgData.width} ${svgData.height}`}
                  className="w-full h-24 sm:h-28 overflow-visible"
                >
                  <defs>
                    <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#31719B" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#31719B" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid guide line */}
                  <line
                    x1="20"
                    y1={svgData.height - svgData.padBottom}
                    x2={svgData.width - 20}
                    y2={svgData.height - svgData.padBottom}
                    stroke="currentColor"
                    className="text-gray-200 dark:text-slate-800"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* Area fill */}
                  <path d={svgData.areaD} fill="url(#clientGrad)" />

                  {/* Stroke line */}
                  <path
                    d={svgData.pathD}
                    fill="none"
                    stroke="#31719B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="dark:stroke-[#60a5fa]"
                  />

                  {/* Data points & X labels */}
                  {svgData.points.map((p, i) => {
                    const isLast = i === svgData.points.length - 1;
                    return (
                      <g key={p.month} className="group/dot cursor-pointer">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isLast ? 4 : 3}
                          className={`${
                            isLast
                              ? 'fill-[#31719B] dark:fill-[#60a5fa] stroke-white dark:stroke-slate-900'
                              : 'fill-white dark:fill-slate-900 stroke-[#31719B] dark:stroke-[#60a5fa]'
                          } transition-all duration-150`}
                          strokeWidth="2"
                        />

                        {/* Value tooltip label over dot */}
                        {p.count > 0 && (
                          <text
                            x={p.x}
                            y={p.y - 7}
                            textAnchor="middle"
                            className="text-[9px] font-bold font-mono fill-gray-700 dark:fill-slate-300"
                          >
                            {p.count}
                          </text>
                        )}

                        {/* Month text */}
                        <text
                          x={p.x}
                          y={svgData.height - 5}
                          textAnchor="middle"
                          className={`text-[10px] font-medium ${
                            isLast
                              ? 'fill-[#31719B] dark:fill-[#93c5fd] font-bold'
                              : 'fill-gray-400 dark:fill-slate-500'
                          }`}
                        >
                          {p.month}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Stat Summary Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {/* New This Week */}
              <div className="p-2.5 rounded-none border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  New This Week
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-emerald-800 dark:text-emerald-200 mt-0.5">
                  {stats?.newThisWeek ?? 0}
                </span>
              </div>

              {/* New This Month */}
              <div className="p-2.5 rounded-none border border-sky-100 dark:border-sky-950/60 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-sky-700 dark:text-sky-400">
                  New This Month
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-sky-800 dark:text-sky-200 mt-0.5">
                  {stats?.newThisMonth ?? 0}
                </span>
              </div>

              {/* Active Clients */}
              <div className="p-2.5 rounded-none border border-blue-100 dark:border-blue-950/60 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">
                  Active Clients
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-blue-800 dark:text-blue-200 mt-0.5">
                  {stats?.activeClients ?? 0}
                </span>
              </div>

              {/* Leads to Convert */}
              <div className="p-2.5 rounded-none border border-amber-100 dark:border-amber-950/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  To Convert
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-amber-800 dark:text-amber-200 mt-0.5">
                  {stats?.clientsToConvert ?? 0}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

