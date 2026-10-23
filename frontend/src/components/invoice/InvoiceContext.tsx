"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import {
  InvoiceTab,
  InvoiceStatus,
  InvoiceRecord,
  ReceiptRecord,
  BankAccount,
  RecurringInvoiceRecord,
} from './types';
import {
  MOCK_RECEIPTS,
  MOCK_BANK_ACCOUNTS,
  MOCK_RECURRING_INVOICES,
} from './mockData';
import { financialApi, FinancialInvoiceRecord, TaskAllocationInput } from '@/services/financialApi';

interface InvoiceContextType {
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
  updateInvoice: (id: string, updated: Partial<InvoiceRecord>) => void;
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
  summaryStats: {
    allCount: number;
    allAmount: number;
    receivableAmount: number;
    receivableCount: number;
    partiallyPaidAmount: number;
    partiallyPaidCount: number;
    paidAmount: number;
    paidCount: number;
    advancePaidAmount: number;
    advancePaidCount: number;
    totalReceiptsCount: number;
    totalReceiptsAmount: number;
    advanceReceiptsAmount: number;
  };
  invoiceLoadError: string | null;
}

function mapPersistedInvoice(record: FinancialInvoiceRecord): InvoiceRecord {
  const details = record.details as Partial<InvoiceRecord>;
  return {
    id: record._id,
    type: record.kind === 'credit_note' ? 'credit_note' : record.state === 'draft' ? 'proforma' : 'invoice',
    number: record.number,
    date: details.date || record.issueDate || '',
    dueDate: details.dueDate || '',
    billingOrg: details.billingOrg || '',
    billingAddress: details.billingAddress || '',
    clientId: details.clientId || '',
    clientBusinessName: details.clientBusinessName || '',
    clientLegalName: details.clientLegalName || '',
    clientGroup: details.clientGroup || '',
    clientGstin: details.clientGstin || '',
    clientAddress: details.clientAddress || '',
    clientPan: details.clientPan || '',
    services: details.services || [],
    subTotal: record.kind === 'credit_note' ? -Math.abs(details.subTotal || 0) : details.subTotal || 0,
    totalPayable: record.kind === 'credit_note' ? -Math.abs(details.totalPayable || 0) : details.totalPayable || 0,
    tdsExcludedAmount: details.tdsExcludedAmount || 0,
    currency: details.currency || 'INR',
    status: record.kind === 'credit_note' ? 'Credit Note' : record.state === 'void' ? 'Cancelled' : record.state === 'draft' ? 'Pending' : 'Receivable',
    bankAccountId: details.bankAccountId || '',
    notes: details.notes,
    paidAmount: 0,
    balanceAmount: record.kind === 'credit_note' ? -Math.abs(details.totalPayable || 0) : details.totalPayable || 0,
    financialYear: details.financialYear || '',
    createdAt: String(details.createdAt || record.issueDate || ''),
    taskAllocations: record.allocations,
  };
}

function toIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<InvoiceTab>('invoice');
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [proformas, setProformas] = useState<InvoiceRecord[]>([]);
  const [reimbursements, setReimbursements] = useState<InvoiceRecord[]>([]);
  const [invoiceLoadError, setInvoiceLoadError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(MOCK_RECEIPTS);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(MOCK_BANK_ACCOUNTS);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoiceRecord[]>(MOCK_RECURRING_INVOICES);

  const [financialYear, setFinancialYear] = useState<string>('FY 2026-2027');
  const [dateRange, setDateRange] = useState<string>('This Month');
  const [currencyFilter, setCurrencyFilter] = useState<string>('All Currencies');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [activeReport, setActiveReport] = useState<string>('dashboard');

  const loadInvoices = useCallback(async () => {
    try {
      const records = await financialApi.listInvoices();
      const mapped = records.map(mapPersistedInvoice);
      setInvoices(mapped.filter((invoice) => invoice.type === 'invoice' || invoice.type === 'credit_note'));
      setProformas(mapped.filter((invoice) => invoice.type === 'proforma'));
      setInvoiceLoadError(null);
    } catch {
      setInvoiceLoadError('Could not load saved invoices. Check the backend connection.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadInvoices(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInvoices]);

  const addInvoice = useCallback(async (item: Partial<InvoiceRecord>, allocations: TaskAllocationInput[]): Promise<InvoiceRecord> => {
    const nextNumber = `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`;
    const draftRecord: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      type: 'invoice',
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
      financialYear: financialYear,
      createdAt: new Date().toISOString(),
      daysPastDue: 0,
    };
    try {
      const saved = await financialApi.createInvoice({
        kind: 'invoice', state: 'issued', number: nextNumber,
        issueDate: toIsoDate(item.date), allocations, details: draftRecord as unknown as Record<string, unknown>, idempotencyKey: crypto.randomUUID(),
      });
      const newRecord = mapPersistedInvoice(saved);
      setInvoices((prev) => [newRecord, ...prev]);
      return newRecord;
    } catch (err: any) {
      console.warn('Backend invoice save failed, storing locally:', err);
      setInvoices((prev) => [draftRecord, ...prev]);
      return draftRecord;
    }
  }, [invoices.length, financialYear]);

  const addProforma = useCallback(async (item: Partial<InvoiceRecord>, allocations: TaskAllocationInput[]): Promise<InvoiceRecord> => {
    const nextNumber = `PI-2026-${String(proformas.length + 1).padStart(3, '0')}`;
    const draftRecord: InvoiceRecord = {
      id: `prof-${Date.now()}`,
      type: 'proforma',
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
      financialYear: financialYear,
      createdAt: new Date().toISOString(),
      daysPastDue: 0,
    };
    try {
      const saved = await financialApi.createInvoice({
        kind: 'invoice', state: 'draft', number: nextNumber,
        issueDate: null, allocations, details: draftRecord as unknown as Record<string, unknown>, idempotencyKey: crypto.randomUUID(),
      });
      const newRecord = mapPersistedInvoice(saved);
      setProformas((prev) => [newRecord, ...prev]);
      return newRecord;
    } catch (err: any) {
      console.warn('Backend proforma save failed, storing locally:', err);
      setProformas((prev) => [draftRecord, ...prev]);
      return draftRecord;
    }
  }, [proformas.length, financialYear]);

  const addCreditNote = useCallback(async (original: InvoiceRecord, allocations: TaskAllocationInput[]): Promise<void> => {
    const number = `CN-2026-${String(invoices.filter((invoice) => invoice.type === 'credit_note').length + 1).padStart(3, '0')}`;
    const amount = allocations.reduce((sum, allocation) => sum + allocation.amountPaise, 0) / 100;
    await financialApi.createInvoice({
      kind: 'credit_note',
      state: 'issued',
      number,
      issueDate: new Date().toISOString().slice(0, 10),
      originalInvoiceId: original.id,
      allocations,
      details: {
        clientId: original.clientId,
        clientBusinessName: original.clientBusinessName,
        clientLegalName: original.clientLegalName,
        clientGroup: original.clientGroup,
        type: 'credit_note',
        subTotal: amount,
        totalPayable: amount,
        currency: original.currency,
      },
      idempotencyKey: crypto.randomUUID(),
    });
    await loadInvoices();
  }, [invoices, loadInvoices]);

  const voidInvoice = useCallback(async (invoice: InvoiceRecord, reason: string): Promise<void> => {
    await financialApi.voidInvoice(invoice.id, reason);
    await loadInvoices();
  }, [loadInvoices]);

  const addReimbursement = useCallback((item: Partial<InvoiceRecord>): InvoiceRecord => {
    const nextNumber = `CH-2026-${String(reimbursements.length + 1).padStart(3, '0')}`;
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
      financialYear: financialYear,
      createdAt: new Date().toISOString(),
    };
    setReimbursements((prev) => [newRecord, ...prev]);
    return newRecord;
  }, [reimbursements.length, financialYear]);

  const addReceipt = useCallback(
    (
      item: Partial<ReceiptRecord>,
      allocations?: { id: string; amount: number; type: 'invoice' | 'reimbursement' }[]
    ): ReceiptRecord => {
      const nextNumber = `REC-2026-${String(receipts.length + 1).padStart(3, '0')}`;
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
        financialYear: financialYear,
        isAdvance: item.isAdvance || false,
        invoiceId: item.invoiceId,
        invoiceNumber: item.invoiceNumber,
      };

      if (allocations && allocations.length > 0) {
        allocations.forEach((alloc) => {
          if (alloc.type === 'invoice') {
            setInvoices((prev) =>
              prev.map((inv) => {
                if (inv.id === alloc.id) {
                  const updatedPaid = inv.paidAmount + alloc.amount;
                  const updatedBalance = Math.max(0, inv.totalPayable - updatedPaid);
                  const updatedStatus: InvoiceStatus =
                    updatedBalance === 0 ? 'Paid' : updatedPaid > 0 ? 'Partially Paid' : inv.status;
                  return {
                    ...inv,
                    paidAmount: updatedPaid,
                    balanceAmount: updatedBalance,
                    status: updatedStatus,
                  };
                }
                return inv;
              })
            );
          } else if (alloc.type === 'reimbursement') {
            setReimbursements((prev) =>
              prev.map((r) => {
                if (r.id === alloc.id) {
                  const updatedPaid = r.paidAmount + alloc.amount;
                  const updatedBalance = Math.max(0, r.totalPayable - updatedPaid);
                  const updatedStatus: InvoiceStatus =
                    updatedBalance === 0 ? 'Paid' : updatedPaid > 0 ? 'Partially Paid' : r.status;
                  return {
                    ...r,
                    paidAmount: updatedPaid,
                    balanceAmount: updatedBalance,
                    status: updatedStatus,
                  };
                }
                return r;
              })
            );
          }
        });
      }

      setReceipts((prev) => [newRecord, ...prev]);
      return newRecord;
    },
    [receipts.length, financialYear]
  );

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'>): BankAccount => {
    const newAcc: BankAccount = {
      ...account,
      id: `bank-${Date.now()}`,
    };
    if (newAcc.isPrimary) {
      setBankAccounts((prev) => prev.map((a) => ({ ...a, isPrimary: false })).concat(newAcc));
    } else {
      setBankAccounts((prev) => [...prev, newAcc]);
    }
    return newAcc;
  }, []);

  const updateInvoice = useCallback((id: string, updated: Partial<InvoiceRecord>) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)));
    setProformas((prev) => prev.map((prof) => (prof.id === id ? { ...prof, ...updated } : prof)));
    setReimbursements((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
  }, []);

  const updateReceipt = useCallback((id: string, updated: Partial<ReceiptRecord>) => {
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
  }, []);

  const deleteInvoice = useCallback(
    (id: string): { success: boolean; message?: string } => {
      const inv = invoices.find((i) => i.id === id);
      if (inv) {
        const hasReceipts = receipts.some(
          (r) => r.invoiceId === id || r.invoiceNumber === inv.number || (r as any).proformaOrInvoice === inv.number
        );
        if (hasReceipts) {
          return { success: false, message: 'Delete its receipts first' };
        }
        setInvoices((prev) => prev.filter((i) => i.id !== id));
        return { success: true };
      }

      const prof = proformas.find((p) => p.id === id);
      if (prof) {
        const hasReceipts = receipts.some(
          (r) => r.proformaId === id || r.proformaNumber === prof.number || (r as any).proformaOrInvoice === prof.number
        );
        if (hasReceipts) {
          return { success: false, message: 'Delete its receipts first' };
        }
        setProformas((prev) => prev.filter((p) => p.id !== id));
        return { success: true };
      }

      const reimb = reimbursements.find((r) => r.id === id);
      if (reimb) {
        const hasReceipts = receipts.some(
          (r) => r.reimbursementId === id || r.reimbursementNumber === reimb.number || (r as any).proformaOrInvoice === reimb.number
        );
        if (hasReceipts) {
          return { success: false, message: 'Delete its receipts first' };
        }
        setReimbursements((prev) => prev.filter((r) => r.id !== id));
        return { success: true };
      }

      return { success: false, message: 'Record not found' };
    },
    [invoices, proformas, reimbursements, receipts]
  );

  const deleteReceipt = useCallback(
    (id: string): { success: boolean; message?: string } => {
      const target = receipts.find((r) => r.id === id);
      if (!target) return { success: false, message: 'Receipt not found' };

      setReceipts((prev) => prev.filter((r) => r.id !== id));

      if (target.invoiceId) {
        setInvoices((prev) =>
          prev.map((inv) => {
            if (inv.id === target.invoiceId) {
              const newPaid = Math.max(0, inv.paidAmount - target.amount);
              const newBal = inv.totalPayable - newPaid;
              return {
                ...inv,
                paidAmount: newPaid,
                balanceAmount: newBal,
                status: (newBal <= 0 ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Receivable') as InvoiceStatus,
              };
            }
            return inv;
          })
        );
      }
      return { success: true };
    },
    [receipts]
  );

  // Compute live summary statistics dynamically based on current list state
  const summaryStats = useMemo(() => {
    let currentList: InvoiceRecord[] = [];
    if (activeTab === 'invoice') currentList = invoices;
    else if (activeTab === 'proforma') currentList = proformas;
    else if (activeTab === 'reimbursement') currentList = reimbursements;

    const allCount = currentList.length;
    const allAmount = currentList.reduce((acc, curr) => acc + curr.totalPayable, 0);

    const receivableItems = currentList.filter(
      (i) => i.status === 'Receivable' || i.status === 'Pending' || i.status === 'Overdue'
    );
    const receivableAmount = receivableItems.reduce((acc, curr) => acc + curr.balanceAmount, 0);
    const receivableCount = receivableItems.length;

    const partialItems = currentList.filter((i) => i.status === 'Partially Paid');
    const partiallyPaidAmount = partialItems.reduce((acc, curr) => acc + curr.balanceAmount, 0);
    const partiallyPaidCount = partialItems.length;

    const paidItems = currentList.filter((i) => i.status === 'Paid');
    const paidAmount = paidItems.reduce((acc, curr) => acc + curr.totalPayable, 0);
    const paidCount = paidItems.length;

    const advanceItems = currentList.filter((i) => i.status === 'Advance Paid');
    const advancePaidAmount = advanceItems.reduce((acc, curr) => acc + curr.paidAmount, 0);
    const advancePaidCount = advanceItems.length;

    const totalReceiptsCount = receipts.length;
    const totalReceiptsAmount = receipts.reduce((acc, curr) => acc + curr.amount, 0);
    const advanceReceiptsAmount = receipts
      .filter((r) => r.isAdvance)
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      allCount,
      allAmount,
      receivableAmount,
      receivableCount,
      partiallyPaidAmount,
      partiallyPaidCount,
      paidAmount,
      paidCount,
      advancePaidAmount,
      advancePaidCount,
      totalReceiptsCount,
      totalReceiptsAmount,
      advanceReceiptsAmount,
    };
  }, [activeTab, invoices, proformas, reimbursements, receipts]);

  return (
    <InvoiceContext.Provider
      value={{
        activeTab,
        setActiveTab,
        invoices,
        proformas,
        reimbursements,
        receipts,
        recurringInvoices,
        bankAccounts,
        financialYear,
        setFinancialYear,
        dateRange,
        setDateRange,
        currencyFilter,
        setCurrencyFilter,
        searchQuery,
        setSearchQuery,
        statusFilter,
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
        activeReport,
        setActiveReport,
        summaryStats,
        invoiceLoadError,
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
