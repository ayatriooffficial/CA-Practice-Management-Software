"use client";

import React from 'react';
import { Calendar, Clock, CheckSquare, BookOpen, FileText, GripVertical } from 'lucide-react';

interface HomeTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const HomeTabs: React.FC<HomeTabsProps> = ({
  activeTab = 'attendance',
  onTabChange,
}) => {
  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'timesheet', label: 'TimeSheet', icon: Clock },
    { id: 'task', label: 'Task', icon: CheckSquare },
    { id: 'sales', label: 'Sales', icon: BookOpen },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  return (
    <div className="w-full border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center" style={{ gap: '28px' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange && onTabChange(tab.id)}
              className="relative flex items-center transition-colors pb-3"
              style={{
                gap: '8px',
                color: isActive ? '#3D6A9E' : 'var(--text-muted, #64748b)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
              }}
            >
              {/* Drag Handle */}
              <GripVertical
                size={14}
                className="opacity-40 hover:opacity-80 transition-opacity"
              />

              {/* Tab Icon */}
              <Icon size={16} />

              {/* Tab Label */}
              <span>{tab.label}</span>

              {/* Active Indicator Underline */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: '#3D6A9E' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
