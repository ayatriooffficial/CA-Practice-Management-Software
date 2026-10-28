"use client";

import React from 'react';
import { SummaryCardData } from '../../services/attendanceApi';

interface SummaryCardsProps {
  cards: SummaryCardData[];
  mode: 'admin' | 'employee';
  period?: 'month' | 'year';
  onPeriodChange?: (period: 'month' | 'year') => void;
  isLoading?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  cards,
  mode,
  period = 'month',
  onPeriodChange,
  isLoading = false,
}) => {
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null);
  const activeId = selectedCardId ?? (cards[0]?.id || null);

  return (
    <div className="w-full flex flex-col" style={{ gap: '12px' }}>
      {/* Month / Year Toggle for Employee View */}
      {mode === 'employee' && (
        <div className="flex items-center justify-end" style={{ gap: '8px' }}>
          <div
            className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-1"
            style={{ gap: '4px' }}
          >
            <button
              type="button"
              onClick={() => onPeriodChange && onPeriodChange('month')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                period === 'month'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => onPeriodChange && onPeriodChange('year')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                period === 'year'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Year
            </button>
          </div>
        </div>
      )}

      {/* Grid of Cards */}
      <div
        className={`w-full grid ${
          mode === 'admin'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-3'
        }`}
        style={{ gap: '16px' }}
      >
        {cards.map((c, index) => {
          const isSelected = c.id === activeId || (activeId === null && index === 0);

          return (
            <div
              key={c.id}
              onClick={() => setSelectedCardId(c.id)}
              className={`bg-white dark:bg-[#1e293b] rounded-xl transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-2xs ${
                isSelected
                  ? 'border-2 border-emerald-400 dark:border-emerald-500 ring-1 ring-emerald-400/30'
                  : 'border border-gray-200 dark:border-[#334155] hover:border-emerald-300 dark:hover:border-emerald-600'
              }`}
              style={{
                padding: '20px 24px',
                minHeight: '140px',
              }}
            >
            {/* Title */}
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {c.title}
            </span>

            {/* Value & Badge */}
            <div className="flex items-center my-3" style={{ gap: '10px' }}>
              <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {isLoading ? '--' : c.value}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ecfdf5] dark:bg-emerald-950/50 text-[#10b981] dark:text-emerald-400 border border-transparent dark:border-emerald-800/40"
              >
                {c.badge}
              </span>
            </div>

            {/* Full-width Metric Bar */}
            <div
              className="w-full rounded-lg text-center font-medium text-xs truncate py-1.5 px-3 bg-[#ecfdf5] dark:bg-emerald-950/40 text-[#059669] dark:text-emerald-400 border border-transparent dark:border-emerald-800/40"
            >
              {isLoading ? 'Loading...' : c.bar}
            </div>
          </div>
        );
      })}
    </div>
  </div>
  );
};
