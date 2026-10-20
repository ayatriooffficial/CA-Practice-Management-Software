"use client";

import React, { useState } from 'react';
import { InvoiceProvider, useInvoice } from './InvoiceContext';
import { InvoiceTabsHeader } from './InvoiceTabsHeader';
import { SummaryCards } from './SummaryCards';
import { InvoiceToolbar } from './InvoiceToolbar';
import { InvoiceTable } from './InvoiceTable';
import { AddInvoiceForm } from './AddInvoiceForm';
import { AddReimbursementForm } from './AddReimbursementForm';
import { RecordPaymentModal } from './RecordPaymentModal';
import { AnalyticsView } from './AnalyticsView';

const InvoiceContent: React.FC = () => {
  const { activeTab } = useInvoice();

  const [viewMode, setViewMode] = useState<'list' | 'add-invoice' | 'add-proforma' | 'add-reimbursement'>('list');
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  const handleAddNew = () => {
    if (activeTab === 'invoice') {
      setViewMode('add-invoice');
    } else if (activeTab === 'proforma') {
      setViewMode('add-proforma');
    } else if (activeTab === 'reimbursement') {
      setViewMode('add-reimbursement');
    } else if (activeTab === 'receipts') {
      setIsRecordPaymentOpen(true);
    }
  };

  // If in Add Mode, render the corresponding full-page form
  if (viewMode === 'add-invoice') {
    return <AddInvoiceForm type="invoice" onBack={() => setViewMode('list')} />;
  }

  if (viewMode === 'add-proforma') {
    return <AddInvoiceForm type="proforma" onBack={() => setViewMode('list')} />;
  }

  if (viewMode === 'add-reimbursement') {
    return <AddReimbursementForm onBack={() => setViewMode('list')} />;
  }

  // Standard List / Analytics View
  return (
    <div className="w-full flex-1 flex flex-col min-h-[calc(100vh-var(--header-height))] bg-white dark:bg-[#0f172a] select-none transition-colors">
      {/* Top 5 Tabs Header */}
      <InvoiceTabsHeader />

      {activeTab === 'analytics' ? (
        <AnalyticsView />
      ) : (
        <>
          {/* Summary Stat Cards */}
          <SummaryCards />

          {/* Action Toolbar */}
          <InvoiceToolbar onAddNew={handleAddNew} />

          {/* Data Table */}
          <InvoiceTable />
        </>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
      />
    </div>
  );
};

export const InvoiceModule: React.FC = () => {
  return (
    <InvoiceProvider>
      <InvoiceContent />
    </InvoiceProvider>
  );
};
