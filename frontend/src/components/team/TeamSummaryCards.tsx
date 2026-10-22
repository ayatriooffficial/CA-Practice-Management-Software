'use client';

import React from 'react';

interface TeamSummaryCardsProps {
  activeCount: number;
  deactivatedCount: number;
  resignedCount: number;
}

export const TeamSummaryCards: React.FC<TeamSummaryCardsProps> = ({
  activeCount,
  deactivatedCount,
  resignedCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
      {/* Active Users */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <div className="text-2xl font-bold text-emerald-600 leading-tight">
            {activeCount}
          </div>
          <div className="text-xs font-semibold text-emerald-600 mt-1">
            Active Users
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>

      {/* Deactivated Users */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <div className="text-2xl font-bold text-gray-500 leading-tight">
            {deactivatedCount}
          </div>
          <div className="text-xs font-semibold text-gray-500 mt-1">
            Deactivated Users
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
      </div>

      {/* Resigned Users */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <div className="text-2xl font-bold text-amber-600 leading-tight">
            {resignedCount}
          </div>
          <div className="text-xs font-semibold text-amber-600 mt-1">
            Resigned Users
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
      </div>
    </div>
  );
};
