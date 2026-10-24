'use client';

import React from 'react';

import { useAuth } from '../auth/AuthContext';

export type TeamTab = 'team' | 'attendance' | 'leave' | 'reimbursement';

interface TeamTabsHeaderProps {
  activeTab: TeamTab;
  onTabChange: (tab: TeamTab) => void;
}

export const TeamTabsHeader: React.FC<TeamTabsHeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || '').toLowerCase() === 'employee';

  const allTabs: Array<{ id: TeamTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'team',
      label: 'Team',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'leave',
      label: 'Leave',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'reimbursement',
      label: 'Reimbursement',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
  ];

  // Employee role sees ONLY the 'Team' subsection
  const visibleTabs = isEmployee ? allTabs.filter((t) => t.id === 'team') : allTabs;

  return (
    <div className="border-b border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] px-6 transition-colors">
      <div className="flex items-center gap-8">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-all cursor-pointer ${isActive
                  ? 'border-[#3D6A9E] text-[#3D6A9E]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <span className={isActive ? 'text-[#3D6A9E]' : 'text-gray-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
