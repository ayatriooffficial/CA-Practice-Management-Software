'use client';

import React, { useState, useEffect } from 'react';
import { TeamTabsHeader, TeamTab } from './TeamTabsHeader';
import { TeamSummaryCards } from './TeamSummaryCards';
import { TeamListView } from './TeamListView';
import { AttendanceView } from './AttendanceView';
import { LeaveView } from './LeaveView';
import { ReimbursementView } from './ReimbursementView';
import { teamStore } from './teamStore';
import { EmployeeRecord } from './types';

import { useAuth } from '../auth/AuthContext';

export const TeamModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TeamTab>('team');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || '').toLowerCase() === 'employee';

  const loadData = async () => {
    setEmployees(teamStore.getEmployees());
    setIsLoaded(true);
    try {
      const fresh = await teamStore.loadEmployeesFromBackend();
      if (fresh && fresh.length > 0) {
        setEmployees(fresh);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const currentTab: TeamTab = isEmployee ? 'team' : activeTab;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#3D6A9E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const deactivatedCount = employees.filter((e) => e.status === 'Deactivated').length;
  const resignedCount = employees.filter((e) => e.status === 'Resigned').length;

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] pb-12 transition-colors">
      {/* Top Level Tabs Header */}
      <TeamTabsHeader
        activeTab={currentTab}
        onTabChange={(tab) => {
          if (!isEmployee) setActiveTab(tab);
        }}
      />

      {/* Tab Content */}
      {currentTab === 'team' && (
        <div className="space-y-2">
          {!isEmployee && (
            <TeamSummaryCards
              activeCount={activeCount}
              deactivatedCount={deactivatedCount}
              resignedCount={resignedCount}
            />
          )}
          <TeamListView employees={employees} onRefresh={loadData} />
        </div>
      )}

      {currentTab === 'attendance' && !isEmployee && <AttendanceView />}

      {currentTab === 'leave' && !isEmployee && <LeaveView />}

      {currentTab === 'reimbursement' && !isEmployee && <ReimbursementView />}
    </div>
  );
};
