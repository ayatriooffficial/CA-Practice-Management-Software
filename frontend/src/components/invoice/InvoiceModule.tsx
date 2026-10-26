"use client";

import React, { useState, useEffect } from 'react';
import { InvoiceProvider, useInvoice } from './InvoiceContext';
import { InvoiceTabsHeader } from './InvoiceTabsHeader';
import { InvoiceToolbar } from './InvoiceToolbar';
import { InvoiceTable } from './InvoiceTable';
import { AddInvoiceForm } from './AddInvoiceForm';
import { AddReimbursementForm } from './AddReimbursementForm';
import { RecordPaymentModal } from './RecordPaymentModal';
import { AnalyticsView } from './AnalyticsView';
import { RecurringInvoiceView } from './RecurringInvoiceView';
import { useAuth } from '../auth/AuthContext';
import { AccessDenied } from '../team/AccessDenied';

const InvoiceContent: React.FC = () => {
  const { activeTab, invoiceLoadError } = useInvoice();
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || '').toLowerCase() === 'employee';

  const [viewMode, setViewMode] = useState<'list' | 'add-invoice' | 'add-proforma' | 'add-reimbursement'>('list');
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Auto-detect incoming invoice draft from Task -> Invoice flow
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem('turia_draft_invoice_from_task') : null;
      if (stored) {
        const draft = JSON.parse(stored);
        sessionStorage.removeItem('turia_draft_invoice_from_task');
        setSelectedRecord(draft);
        setFormMode('create');
        setViewMode('add-invoice');
      }
    } catch {
      // Ignore
    }
  }, []);

  // Strict guard: employees cannot view invoice portal
  if (isEmployee) {
    return <AccessDenied moduleName="Invoice Portal" actionName="view" />;
  }

  const handleAddNew = () => {
    setSelectedRecord(null);
    setFormMode('create');
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

  const handleView = (item: any) => {
    setSelectedRecord(item);
    setFormMode('view');
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

  const handleEdit = (item: any) => {
    setSelectedRecord(item);
    setFormMode('edit');
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

  const handleBack = () => {
    setViewMode('list');
    setSelectedRecord(null);
    setFormMode('create');
  };

  // If in Add / Edit / View Mode, render the corresponding full-page form
  if (viewMode === 'add-invoice') {
    return (
      <AddInvoiceForm
        type="invoice"
        mode={formMode}
        initialData={selectedRecord}
        onBack={handleBack}
      />
    );
  }

  if (viewMode === 'add-proforma') {
    return (
      <AddInvoiceForm
        type="proforma"
        mode={formMode}
        initialData={selectedRecord}
        onBack={handleBack}
      />
    );
  }

  if (viewMode === 'add-reimbursement') {
    return (
      <AddReimbursementForm
        mode={formMode}
        initialData={selectedRecord}
        onBack={handleBack}
      />
    );
  }

  // Standard List / Analytics View
  return (
    <div className="w-full flex-1 flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Top 5 Tabs Header */}
      <InvoiceTabsHeader />
      {invoiceLoadError && activeTab !== 'analytics' && <div role="alert" className="mx-4 mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">{invoiceLoadError}</div>}

      {activeTab === 'analytics' ? (
        <AnalyticsView />
      ) : activeTab === 'recurring' ? (
        <RecurringInvoiceView />
      ) : (
        <div className="w-full flex flex-col space-y-4 px-2">
          {/* Action Toolbar */}
          <InvoiceToolbar onAddNew={handleAddNew} />

          {/* Data Table */}
          <InvoiceTable onView={handleView} onEdit={handleEdit} />
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        mode={formMode}
        initialData={selectedRecord}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setSelectedRecord(null);
          setFormMode('create');
        }}
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
