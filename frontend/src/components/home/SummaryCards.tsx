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
        {cards.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 transition-all duration-200 hover:border-emerald-500 dark:hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500/50 flex flex-col justify-between"
            style={{
              padding: '20px 24px',
              minHeight: '140px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
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
                className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: '#ecfdf5',
                  color: '#10b981',
                }}
              >
                {c.badge}
              </span>
            </div>

            {/* Full-width Light Green Bar */}
            <div
              className="w-full rounded-lg text-center font-medium text-xs truncate"
              style={{
                backgroundColor: '#ecfdf5',
                color: '#10b981',
                padding: '6px 12px',
              }}
            >
              {isLoading ? 'Loading...' : c.bar}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
