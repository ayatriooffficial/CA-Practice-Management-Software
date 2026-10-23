"use client";

import React from 'react';
import {
  FileText,
  ReceiptText,
  IndianRupee,
  Receipt,
  Repeat,
  BarChart3,
  LucideIcon,
} from 'lucide-react';
import { InvoiceTab } from './types';
import { useInvoice } from './InvoiceContext';

interface TabConfig {
  id: InvoiceTab;
  label: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { id: 'proforma', label: 'Proforma Invoice', icon: FileText },
  { id: 'invoice', label: 'Invoice', icon: ReceiptText },
  { id: 'reimbursement', label: 'Reimbursement', icon: IndianRupee },
  { id: 'receipts', label: 'Receipts', icon: Receipt },
  { id: 'recurring', label: 'Recurring Invoice', icon: Repeat },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const InvoiceTabsHeader: React.FC = () => {
  const { activeTab, setActiveTab } = useInvoice();

  return (
    <div className="w-full bg-white dark:bg-[#1e293b] border-b border-[#e5e7eb] dark:border-[#334155] px-6 select-none transition-colors">
      <nav className="flex items-center gap-2 md:gap-6 overflow-x-auto no-scrollbar h-12" aria-label="Invoice Modules">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 h-full px-3.5 text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${isActive
                  ? 'text-[#3D6A9E] dark:text-[#8276f2]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>

              {/* Active Tab Underline */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t bg-[#3D6A9E] dark:bg-[#8276f2]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
