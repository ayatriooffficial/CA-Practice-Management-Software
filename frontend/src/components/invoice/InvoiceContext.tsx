"use client";

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import {
  InvoiceTab,
  InvoiceRecord,
  ReceiptRecord,
  BankAccount,
  RecurringInvoiceRecord,
} from './types';
import { TaskAllocationInput } from '@/services/financialApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchInvoicesRequest,
  createInvoiceRequest,
  createProformaRequest,
  createCreditNoteRequest,
  updateInvoiceRequest,
  voidInvoiceRequest,
  addReimbursement as sliceAddReimbursement,
  addReceipt as sliceAddReceipt,
  updateReceipt as sliceUpdateReceipt,
  deleteReceipt as sliceDeleteReceipt,
  deleteInvoice as sliceDeleteInvoice,
  addBankAccount as sliceAddBankAccount,
  setActiveTab as sliceSetActiveTab,
  setFinancialYear as sliceSetFinancialYear,
  setDateRange as sliceSetDateRange,
  setCurrencyFilter as sliceSetCurrencyFilter,
  setSearchQuery as sliceSetSearchQuery,
  setStatusFilter as sliceSetStatusFilter,
  setActiveReport as sliceSetActiveReport,
  InvoiceSummaryStats,
} from '@/store/features/invoices';

export interface InvoiceContextType {
  activeTab: InvoiceTab;
  setActiveTab: (tab: InvoiceTab) => void;
  invoices: InvoiceRecord[];
  proformas: InvoiceRecord[];
  reimbursements: InvoiceRecord[];
  receipts: ReceiptRecord[];
  recurringInvoices: RecurringInvoiceRecord[];
  bankAccounts: BankAccount[];
  financialYear: string;
  setFinancialYear: (fy: string) => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  currencyFilter: string;
  setCurrencyFilter: (curr: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  addInvoice: (item: Partial<InvoiceRecord>, allocations: TaskAllocationInput[]) => Promise<InvoiceRecord>;
  addProforma: (item: Partial<InvoiceRecord>, allocations: TaskAllocationInput[]) => Promise<InvoiceRecord>;
  addCreditNote: (original: InvoiceRecord, allocations: TaskAllocationInput[]) => Promise<void>;
  voidInvoice: (invoice: InvoiceRecord, reason: string) => Promise<void>;
  updateInvoice: (id: string, updated: Partial<InvoiceRecord>) => Promise<void> | void;
  updateReceipt: (id: string, updated: Partial<ReceiptRecord>) => void;
  deleteInvoice: (id: string) => { success: boolean; message?: string };
  deleteReceipt: (id: string) => { success: boolean; message?: string };
  addReimbursement: (item: Partial<InvoiceRecord>) => InvoiceRecord;
  addReceipt: (
    item: Partial<ReceiptRecord>,
    allocations?: { id: string; amount: number; type: 'invoice' | 'reimbursement' }[]
  ) => ReceiptRecord;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => BankAccount;
  activeReport: string;
  setActiveReport: (rep: string) => void;
  summaryStats: InvoiceSummaryStats;
  invoiceLoadError: string | null;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const invoiceState = useAppSelector((state) => state.invoices);

  // Automatically fetch persisted invoices from MongoDB backend on mount via Redux Saga
  useEffect(() => {
    if (!invoiceState.isLoaded) {
      dispatch(fetchInvoicesRequest());
    }
  }, [dispatch, invoiceState.isLoaded]);

  const setActiveTab = useCallback(
    (tab: InvoiceTab) => {
      dispatch(sliceSetActiveTab(tab));
    },
    [dispatch]
  );

  const setFinancialYear = useCallback(
    (fy: string) => {
      dispatch(sliceSetFinancialYear(fy));
    },
    [dispatch]
  );

  const setDateRange = useCallback(
    (range: string) => {
      dispatch(sliceSetDateRange(range));
    },
    [dispatch]
  );

  const setCurrencyFilter = useCallback(
    (curr: string) => {
      dispatch(sliceSetCurrencyFilter(curr));
    },
    [dispatch]
  );

  const setSearchQuery = useCallback(
    (query: string) => {
      dispatch(sliceSetSearchQuery(query));
    },
    [dispatch]
  );

  const setStatusFilter = useCallback(
    (status: string) => {
      dispatch(sliceSetStatusFilter(status));
    },
    [dispatch]
  );

  const setActiveReport = useCallback(
    (report: string) => {
      dispatch(sliceSetActiveReport(report));
    },
    [dispatch]
  );

  const addInvoice = useCallback(
    (item: Partial<InvoiceRecord>, allocations: TaskAllocationInput[]): Promise<InvoiceRecord> => {
      return new Promise((resolve) => {
        dispatch(
          createInvoiceRequest({
            data: item,
            allocations,
            onSuccess: (saved) => resolve(saved),
          })
        );
      });
    },
    [dispatch]
  );

  const addProforma = useCallback(
    (item: Partial<InvoiceRecord>, allocations: TaskAllocationInput[]): Promise<InvoiceRecord> => {
      return new Promise((resolve) => {
        dispatch(
          createProformaRequest({
            data: item,
            allocations,
            onSuccess: (saved) => resolve(saved),
          })
        );
      });
    },
    [dispatch]
  );

  const addCreditNote = useCallback(
    (original: InvoiceRecord, allocations: TaskAllocationInput[]): Promise<void> => {
      return new Promise((resolve) => {
        dispatch(
          createCreditNoteRequest({
            original,
            allocations,
            onSuccess: () => resolve(),
          })
        );
      });
    },
    [dispatch]
  );

  const updateInvoice = useCallback(
    (id: string, updated: Partial<InvoiceRecord>): Promise<void> => {
      return new Promise((resolve) => {
        dispatch(
          updateInvoiceRequest({
            id,
            updated,
            onSuccess: () => resolve(),
          })
        );
      });
    },
    [dispatch]
  );

  const voidInvoice = useCallback(
    (invoice: InvoiceRecord, reason: string): Promise<void> => {
      return new Promise((resolve) => {
        dispatch(
          voidInvoiceRequest({
            id: invoice.id,
            reason,
            onSuccess: () => resolve(),
          })
        );
      });
    },
    [dispatch]
  );

  const addReimbursement = useCallback(
    (item: Partial<InvoiceRecord>): InvoiceRecord => {
      const nextNumber = `CH-2026-${String(invoiceState.reimbursements.length + 1).padStart(3, '0')}`;
      const newRecord: InvoiceRecord = {
        id: `reimb-${Date.now()}`,
        type: 'reimbursement',
        number: nextNumber,
        date: item.date || new Date().toLocaleDateString('en-GB'),
        dueDate: item.dueDate || new Date().toLocaleDateString('en-GB'),
        billingOrg: item.billingOrg || 'Krishna Associates',
        billingAddress: item.billingAddress || '',
        clientId: item.clientId || '',
        clientBusinessName: item.clientBusinessName || '',
        clientLegalName: item.clientLegalName || '',
        clientGroup: item.clientGroup || '',
        clientGstin: item.clientGstin || '',
        clientAddress: item.clientAddress || '',
        clientPan: item.clientPan || '',
        services: item.services || [],
        subTotal: item.subTotal || 0,
        totalPayable: item.totalPayable || 0,
        tdsExcludedAmount: item.tdsExcludedAmount || item.subTotal || 0,
        currency: item.currency || 'INR',
        status: 'Receivable',
        bankAccountId: item.bankAccountId || '',
        notes: item.notes || '',
        paidAmount: 0,
        balanceAmount: item.totalPayable || 0,
        financialYear: invoiceState.financialYear,
        createdAt: new Date().toISOString(),
      };
      dispatch(sliceAddReimbursement(newRecord));
      return newRecord;
    },
    [dispatch, invoiceState.reimbursements.length, invoiceState.financialYear]
  );

  const addReceipt = useCallback(
    (
      item: Partial<ReceiptRecord>,
      allocations?: { id: string; amount: number; type: 'invoice' | 'reimbursement' }[]
    ): ReceiptRecord => {
      const nextNumber = `REC-2026-${String(invoiceState.receipts.length + 1).padStart(3, '0')}`;
      const newRecord: ReceiptRecord = {
        id: `rec-${Date.now()}`,
        receiptNo: nextNumber,
        billingOrg: item.billingOrg || 'Krishna Associates',
        clientId: item.clientId || '',
        businessName: item.businessName || '',
        legalName: item.legalName || '',
        group: item.group || '',
        amount: item.amount || 0,
        paymentDate: item.paymentDate || new Date().toLocaleDateString('en-GB'),
        method: item.method || 'Bank Transfer',
        bankAccountId: item.bankAccountId || '',
        bankName: item.bankName || 'HDFC Bank Ltd',
        referenceNumber: item.referenceNumber || '',
        notes: item.notes || '',
        financialYear: invoiceState.financialYear,
        isAdvance: item.isAdvance || false,
        invoiceId: item.invoiceId,
        invoiceNumber: item.invoiceNumber,
      };
      dispatch(sliceAddReceipt({ receipt: newRecord, allocations }));
      return newRecord;
    },
    [dispatch, invoiceState.receipts.length, invoiceState.financialYear]
  );

  const updateReceipt = useCallback(
    (id: string, updated: Partial<ReceiptRecord>) => {
      dispatch(sliceUpdateReceipt({ id, updated }));
    },
    [dispatch]
  );

  const deleteReceipt = useCallback(
    (id: string): { success: boolean; message?: string } => {
      dispatch(sliceDeleteReceipt(id));
      return { success: true };
    },
    [dispatch]
  );

  const deleteInvoice = useCallback(
    (id: string): { success: boolean; message?: string } => {
      const inv = invoiceState.invoices.find((i) => i.id === id);
      if (inv) {
        const hasReceipts = invoiceState.receipts.some(
          (r) =>
            r.invoiceId === id ||
            r.invoiceNumber === inv.number ||
            (r as any).proformaOrInvoice === inv.number
        );
        if (hasReceipts) {
          return {
            success: false,
            message: `Cannot delete invoice ${inv.number} because it has associated payment receipts. Please delete the receipts first.`,
          };
        }
      }
      dispatch(sliceDeleteInvoice(id));
      return { success: true };
    },
    [dispatch, invoiceState.invoices, invoiceState.receipts]
  );

  const addBankAccount = useCallback(
    (account: Omit<BankAccount, 'id'>): BankAccount => {
      const newAcc: BankAccount = {
        ...account,
        id: `bank-${Date.now()}`,
      };
      dispatch(sliceAddBankAccount(newAcc));
      return newAcc;
    },
    [dispatch]
  );

  return (
    <InvoiceContext.Provider
      value={{
        activeTab: invoiceState.activeTab,
        setActiveTab,
        invoices: invoiceState.invoices,
        proformas: invoiceState.proformas,
        reimbursements: invoiceState.reimbursements,
        receipts: invoiceState.receipts,
        recurringInvoices: invoiceState.recurringInvoices,
        bankAccounts: invoiceState.bankAccounts,
        financialYear: invoiceState.financialYear,
        setFinancialYear,
        dateRange: invoiceState.dateRange,
        setDateRange,
        currencyFilter: invoiceState.currencyFilter,
        setCurrencyFilter,
        searchQuery: invoiceState.searchQuery,
        setSearchQuery,
        statusFilter: invoiceState.statusFilter,
        setStatusFilter,
        addInvoice,
        addProforma,
        addCreditNote,
        voidInvoice,
        updateInvoice,
        updateReceipt,
        deleteInvoice,
        deleteReceipt,
        addReimbursement,
        addReceipt,
        addBankAccount,
        activeReport: invoiceState.activeReport,
        setActiveReport,
        summaryStats: invoiceState.summaryStats,
        invoiceLoadError: invoiceState.error,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoice = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
};
