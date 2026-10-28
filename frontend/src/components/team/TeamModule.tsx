'use client';

import React, { useState, useEffect } from 'react';
import { TeamTabsHeader, TeamTab } from './TeamTabsHeader';
import { TeamListView } from './TeamListView';
import { AttendanceView } from './AttendanceView';
import { LeaveView } from './LeaveView';
import { ReimbursementView } from './ReimbursementView';
import { EmploymentRequestView } from './EmploymentRequestView';
import { teamStore } from './teamStore';
import { EmployeeRecord } from './types';

import { useAuth } from '../auth/AuthContext';

export const TeamModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TeamTab>('team');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentUser } = useAuth();
  const roleLower = (currentUser?.role || '').toLowerCase();
  const isEmployee = roleLower === 'employee';
  const isAdmin = roleLower === 'admin';

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
        <div className="w-8 h-8 border-2 border-[#31719B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Top Level Tabs Header */}
      <TeamTabsHeader
        activeTab={currentTab}
        onTabChange={(tab) => {
          if (!isEmployee) setActiveTab(tab);
        }}
      />

      {/* Tab Content */}
      {currentTab === 'team' && (
        <TeamListView employees={employees} onRefresh={loadData} />
      )}

      {currentTab === 'attendance' && !isEmployee && <AttendanceView />}

      {currentTab === 'leave' && !isEmployee && <LeaveView />}

      {currentTab === 'reimbursement' && !isEmployee && <ReimbursementView />}

      {currentTab === 'employment-requests' && isAdmin && <EmploymentRequestView />}
    </div>
  );
};
