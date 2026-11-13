"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { InvoiceProvider, useInvoice } from './InvoiceContext';
import { InvoiceTabsHeader } from './InvoiceTabsHeader';
import { InvoiceToolbar } from './InvoiceToolbar';
import { InvoiceTable } from './InvoiceTable';
import { AddInvoiceForm } from './AddInvoiceForm';
import { AddReimbursementForm } from './AddReimbursementForm';
import { RecordPaymentModal } from './RecordPaymentModal';
import { InvoiceReceiptDetailView } from './InvoiceReceiptDetailView';
import { AnalyticsView } from './AnalyticsView';
import { RecurringInvoiceView } from './RecurringInvoiceView';
import { useAuth } from '../auth/AuthContext';
import { usePermission } from '../team/usePermission';
import { AccessDenied } from '../team/AccessDenied';
import { pageStateCache } from '@/services/pageStateCache';
import { groupApi } from '@/services/groupApi';

const InvoiceContent: React.FC = () => {
  const { activeTab, setActiveTab, invoiceLoadError } = useInvoice();
  const { currentUser } = useAuth();
  const { canView } = usePermission();

  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdParam = searchParams?.get('groupId');

  const [viewMode, setViewMode] = useState<
    'list' | 'add-invoice' | 'add-proforma' | 'add-reimbursement' | 'view-receipt'
  >(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (
        sessionStorage.getItem('turia_draft_invoice_from_task') ||
        sessionStorage.getItem('turia_draft_invoice_from_group') ||
        urlParams.get('groupId')
      ) {
        return 'add-invoice';
      }
    }
    return 'list';
  });
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedRecord, setSelectedRecord] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const fromTask = sessionStorage.getItem('turia_draft_invoice_from_task');
      if (fromTask) {
        try {
          return JSON.parse(fromTask);
        } catch {}
      }
      const fromGroup = sessionStorage.getItem('turia_draft_invoice_from_group');
      if (fromGroup) {
        try {
          return JSON.parse(fromGroup);
        } catch {}
      }
    }
    return null;
  });
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Auto-detect incoming invoice draft from Task -> Invoice flow
  useEffect(() => {
    pageStateCache.markLoaded('/invoice');
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

  useEffect(() => {
    if (!groupIdParam) return;
    setActiveTab('invoice');
    let isMounted = true;
    groupApi
      .getGroupById(groupIdParam)
      .then((res) => {
        if (!isMounted || !res?.data) return;
        const grp = res.data;
        const pocClientIdStr =
          typeof grp.pocClientId === 'string'
            ? grp.pocClientId
            : (grp.pocClientId as any)?.id ||
              (grp.pocClientId as any)?._id?.toString() ||
              grp.poc?.clientId;

        const pocClient =
          (grp.entities || []).find(
            (e: any) =>
              e.id === pocClientIdStr ||
              (grp.poc?.clientId && e.id === grp.poc.clientId)
          ) || grp.entities?.[0];

        setSelectedRecord({
          clientId: pocClient?.id || '',
          clientBusinessName: pocClient?.name || grp.name,
          clientLegalName:
            (pocClient as any)?.legalName || pocClient?.name || grp.name,
          clientGroup: grp.name,
          clientPan: pocClient?.pan || '',
          clientAddress: (pocClient as any)?.address || '',
          services: [],
          totalPayable: 0,
          subTotal: 0,
        });
        setFormMode('create');
        setViewMode('add-invoice');
      })
      .catch((err) => {
        console.warn('Could not prefill invoice from groupId:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [groupIdParam, setActiveTab]);

  const viewParam = searchParams?.get('view') as any;

  useEffect(() => {
    if (!viewParam && viewMode !== 'list') {
      if (typeof window !== 'undefined') {
        if (
          sessionStorage.getItem('turia_draft_invoice_from_task') ||
          sessionStorage.getItem('turia_draft_invoice_from_group') ||
          groupIdParam
        ) {
          return;
        }
      }
      setViewMode('list');
      setSelectedRecord(null);
    }
  }, [viewParam, viewMode, groupIdParam]);

  // Permission guard: view according to admin assigned role permissions
  if (!canView('invoice')) {
    return <AccessDenied moduleName="Invoice Portal" actionName="view" />;
  }

  const handleAddNew = () => {
    setSelectedRecord(null);
    setFormMode('create');
    let targetMode: any = 'list';
    if (activeTab === 'invoice') {
      targetMode = 'add-invoice';
    } else if (activeTab === 'proforma') {
      targetMode = 'add-proforma';
    } else if (activeTab === 'reimbursement') {
      targetMode = 'add-reimbursement';
    } else if (activeTab === 'receipts') {
      setIsRecordPaymentOpen(true);
      return;
    }
    setViewMode(targetMode);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('view', targetMode);
    router.push(`/invoice?${params.toString()}`);
  };

  const handleView = (item: any) => {
    setSelectedRecord(item);
    setFormMode('view');
    const targetMode = (activeTab === 'invoice' || activeTab === 'proforma' || activeTab === 'receipts')
      ? 'view-receipt'
      : 'add-reimbursement';
    setViewMode(targetMode);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('view', targetMode);
    if (item?.id || item?._id) params.set('id', item.id || item._id);
    router.push(`/invoice?${params.toString()}`);
  };

  const handleViewDetail = (item: any) => {
    setSelectedRecord(item);
    setFormMode('view');
    setViewMode('view-receipt');
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('view', 'view-receipt');
    if (item?.id || item?._id) params.set('id', item.id || item._id);
    router.push(`/invoice?${params.toString()}`);
  };

  const handleEdit = (item: any) => {
    setSelectedRecord(item);
    setFormMode('edit');
    let targetMode: any = 'list';
    if (activeTab === 'invoice') {
      targetMode = 'add-invoice';
    } else if (activeTab === 'proforma') {
      targetMode = 'add-proforma';
    } else if (activeTab === 'reimbursement') {
      targetMode = 'add-reimbursement';
    } else if (activeTab === 'receipts') {
      setIsRecordPaymentOpen(true);
      return;
    }
    setViewMode(targetMode);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('view', targetMode);
    if (item?.id || item?._id) params.set('id', item.id || item._id);
    router.push(`/invoice?${params.toString()}`);
  };

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('turia_draft_invoice_from_group');
      sessionStorage.removeItem('turia_draft_invoice_from_task');
    }
    if (groupIdParam) {
      router.push(`/groups/${groupIdParam}?tab=invoice`);
      return;
    }
    setViewMode('list');
    setSelectedRecord(null);
    setFormMode('create');
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.delete('view');
    params.delete('id');
    params.set('tab', activeTab);
    router.push(`/invoice?${params.toString()}`);
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

  if (viewMode === 'view-receipt') {
    const isReceipt = Boolean(
      selectedRecord &&
        ('receiptNo' in selectedRecord ||
          ('amount' in selectedRecord && !('services' in selectedRecord) && !('totalPayable' in selectedRecord)))
    );

    return (
      <div className="w-full flex-1 flex flex-col space-y-4 animate-in fade-in duration-150">
        <InvoiceReceiptDetailView
          receipt={isReceipt ? selectedRecord : null}
          invoice={!isReceipt ? selectedRecord : null}
          onBack={handleBack}
          onRecordPayment={(targetInv, targetRcpt) => {
            setSelectedRecord(targetRcpt || targetInv || selectedRecord);
            setFormMode('create');
            setIsRecordPaymentOpen(true);
          }}
        />

        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          mode={formMode}
          targetInvoice={!isReceipt ? selectedRecord : undefined}
          initialData={isReceipt ? selectedRecord : undefined}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setFormMode('create');
          }}
          onPaymentSaved={() => {
            setIsRecordPaymentOpen(false);
            setFormMode('create');
            setSelectedRecord(null);
            setViewMode('list');
            setActiveTab('receipts');
          }}
        />
      </div>
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
          <InvoiceTable
            onView={handleView}
            onEdit={handleEdit}
            onViewDetail={handleViewDetail}
            onRecordPayment={(item) => {
              setSelectedRecord(item);
              setFormMode('create');
              setIsRecordPaymentOpen(true);
            }}
          />
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        mode={formMode}
        targetInvoice={selectedRecord && !('receiptNo' in selectedRecord) ? selectedRecord : undefined}
        initialData={selectedRecord && ('receiptNo' in selectedRecord) ? selectedRecord : undefined}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setSelectedRecord(null);
          setFormMode('create');
        }}
        onPaymentSaved={() => {
          setIsRecordPaymentOpen(false);
          setSelectedRecord(null);
          setFormMode('create');
          setActiveTab('receipts');
        }}
      />
    </div>
  );
};

export const InvoiceModule: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-gray-400">Loading billing modules...</div>}>
      <InvoiceProvider>
        <InvoiceContent />
      </InvoiceProvider>
    </Suspense>
  );
};
