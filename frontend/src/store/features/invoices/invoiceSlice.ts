import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  InvoiceRecord,
  ReceiptRecord,
  BankAccount,
  RecurringInvoiceRecord,
  InvoiceTab,
  InvoiceStatus,
} from '@/components/invoice/types';
import {
  MOCK_RECEIPTS,
  MOCK_BANK_ACCOUNTS,
  MOCK_RECURRING_INVOICES,
} from '@/components/invoice/mockData';
import { TaskAllocationInput } from '@/services/financialApi';

export interface InvoiceSummaryStats {
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
}

export interface InvoiceState {
  invoices: InvoiceRecord[];
  proformas: InvoiceRecord[];
  reimbursements: InvoiceRecord[];
  receipts: ReceiptRecord[];
  recurringInvoices: RecurringInvoiceRecord[];
  bankAccounts: BankAccount[];
  activeTab: InvoiceTab;
  financialYear: string;
  dateRange: string;
  currencyFilter: string;
  searchQuery: string;
  statusFilter: string;
  activeReport: string;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  isLoaded: boolean;
  summaryStats: InvoiceSummaryStats;
}

const defaultStats: InvoiceSummaryStats = {
  allCount: 0,
  allAmount: 0,
  receivableAmount: 0,
  receivableCount: 0,
  partiallyPaidAmount: 0,
  partiallyPaidCount: 0,
  paidAmount: 0,
  paidCount: 0,
  advancePaidAmount: 0,
  advancePaidCount: 0,
  totalReceiptsCount: 0,
  totalReceiptsAmount: 0,
  advanceReceiptsAmount: 0,
};

function calculateStats(
  activeTab: InvoiceTab,
  invoices: InvoiceRecord[],
  proformas: InvoiceRecord[],
  reimbursements: InvoiceRecord[],
  receipts: ReceiptRecord[]
): InvoiceSummaryStats {
  const currentList =
    activeTab === 'proforma'
      ? proformas
      : activeTab === 'reimbursement'
      ? reimbursements
      : invoices;

  const allCount = currentList.length;
  const allAmount = currentList.reduce((acc, curr) => acc + (curr.totalPayable || 0), 0);

  const receivableItems = currentList.filter(
    (i) => i.status === 'Receivable' || i.status === 'Pending' || i.status === 'Overdue'
  );
  const receivableAmount = receivableItems.reduce((acc, curr) => acc + (curr.balanceAmount || 0), 0);
  const receivableCount = receivableItems.length;

  const partialItems = currentList.filter((i) => i.status === 'Partially Paid');
  const partiallyPaidAmount = partialItems.reduce((acc, curr) => acc + (curr.balanceAmount || 0), 0);
  const partiallyPaidCount = partialItems.length;

  const paidItems = currentList.filter((i) => i.status === 'Paid');
  const paidAmount = paidItems.reduce((acc, curr) => acc + (curr.totalPayable || 0), 0);
  const paidCount = paidItems.length;

  const advanceItems = currentList.filter((i) => i.status === 'Advance Paid');
  const advancePaidAmount = advanceItems.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
  const advancePaidCount = advanceItems.length;

  const totalReceiptsCount = receipts.length;
  const totalReceiptsAmount = receipts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const advanceReceiptsAmount = receipts
    .filter((r) => r.isAdvance)
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

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
}

const initialState: InvoiceState = {
  invoices: [],
  proformas: [],
  reimbursements: [],
  receipts: MOCK_RECEIPTS,
  recurringInvoices: MOCK_RECURRING_INVOICES,
  bankAccounts: MOCK_BANK_ACCOUNTS,
  activeTab: 'invoice',
  financialYear: 'FY 2026-2027',
  dateRange: 'This Month',
  currencyFilter: 'All Currencies',
  searchQuery: '',
  statusFilter: 'All',
  activeReport: 'dashboard',
  loading: false,
  mutating: false,
  error: null,
  isLoaded: false,
  summaryStats: defaultStats,
};

export const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    hydrateInvoices: (
      state,
      action: PayloadAction<{
        invoices: InvoiceRecord[];
        proformas?: InvoiceRecord[];
        reimbursements?: InvoiceRecord[];
        receipts?: ReceiptRecord[];
        bankAccounts?: BankAccount[];
      }>
    ) => {
      state.invoices = action.payload.invoices;
      if (action.payload.proformas) state.proformas = action.payload.proformas;
      if (action.payload.reimbursements) state.reimbursements = action.payload.reimbursements;
      if (action.payload.receipts) state.receipts = action.payload.receipts;
      if (action.payload.bankAccounts) state.bankAccounts = action.payload.bankAccounts;
      state.isLoaded = true;
      state.loading = false;
      state.error = null;
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },

    // Fetch Invoices (Saga triggers)
    fetchInvoicesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchInvoicesSuccess: (
      state,
      action: PayloadAction<{
        invoices: InvoiceRecord[];
        proformas: InvoiceRecord[];
      }>
    ) => {
      state.loading = false;
      state.invoices = action.payload.invoices;
      state.proformas = action.payload.proformas;
      state.isLoaded = true;
      state.error = null;
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },
    fetchInvoicesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Create Invoice (Saga trigger)
    createInvoiceRequest: (
      state,
      _action: PayloadAction<{
        data: Partial<InvoiceRecord>;
        allocations: TaskAllocationInput[];
        onSuccess?: (record: InvoiceRecord) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    createInvoiceSuccess: (state, action: PayloadAction<InvoiceRecord>) => {
      state.mutating = false;
      state.invoices = [action.payload, ...state.invoices.filter((i) => i.id !== action.payload.id)];
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },
    createInvoiceFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Create Proforma (Saga trigger)
    createProformaRequest: (
      state,
      _action: PayloadAction<{
        data: Partial<InvoiceRecord>;
        allocations: TaskAllocationInput[];
        onSuccess?: (record: InvoiceRecord) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    createProformaSuccess: (state, action: PayloadAction<InvoiceRecord>) => {
      state.mutating = false;
      state.proformas = [action.payload, ...state.proformas.filter((p) => p.id !== action.payload.id)];
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },
    createProformaFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Create Credit Note (Saga trigger)
    createCreditNoteRequest: (
      state,
      _action: PayloadAction<{
        original: InvoiceRecord;
        allocations: TaskAllocationInput[];
        onSuccess?: () => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    createCreditNoteSuccess: (state, action: PayloadAction<InvoiceRecord>) => {
      state.mutating = false;
      state.invoices = [action.payload, ...state.invoices.filter((i) => i.id !== action.payload.id)];
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },
    createCreditNoteFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Update Invoice (Saga trigger)
    updateInvoiceRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        updated: Partial<InvoiceRecord>;
        onSuccess?: () => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    updateInvoiceSuccess: (
      state,
      action: PayloadAction<{ id: string; updated: Partial<InvoiceRecord> }>
    ) => {
      state.mutating = false;
      const { id, updated } = action.payload;
      state.invoices = state.invoices.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv));
      state.proformas = state.proformas.map((prof) => (prof.id === id ? { ...prof, ...updated } : prof));
      state.reimbursements = state.reimbursements.map((r) => (r.id === id ? { ...r, ...updated } : r));
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },
    updateInvoiceFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Void Invoice (Saga trigger)
    voidInvoiceRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        reason: string;
        onSuccess?: () => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    voidInvoiceSuccess: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      const id = action.payload;
      state.invoices = state.invoices.map((inv) =>
        inv.id === id ? { ...inv, status: 'Cancelled' as InvoiceStatus } : inv
      );
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },
    voidInvoiceFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Local operations for Reimbursements, Receipts, Bank Accounts
    addReimbursement: (state, action: PayloadAction<InvoiceRecord>) => {
      state.reimbursements = [action.payload, ...state.reimbursements];
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },

    addReceipt: (
      state,
      action: PayloadAction<{
        receipt: ReceiptRecord;
        allocations?: { id: string; amount: number; type: 'invoice' | 'reimbursement' }[];
      }>
    ) => {
      const { receipt, allocations } = action.payload;
      state.receipts = [receipt, ...state.receipts];

      if (allocations && allocations.length > 0) {
        allocations.forEach((alloc) => {
          if (alloc.type === 'invoice') {
            state.invoices = state.invoices.map((inv) => {
              if (inv.id === alloc.id) {
                const updatedPaid = (inv.paidAmount || 0) + alloc.amount;
                const updatedBalance = Math.max(0, (inv.totalPayable || 0) - updatedPaid);
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
            });
          } else if (alloc.type === 'reimbursement') {
            state.reimbursements = state.reimbursements.map((r) => {
              if (r.id === alloc.id) {
                const updatedPaid = (r.paidAmount || 0) + alloc.amount;
                const updatedBalance = Math.max(0, (r.totalPayable || 0) - updatedPaid);
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
            });
          }
        });
      }

      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },

    updateReceipt: (state, action: PayloadAction<{ id: string; updated: Partial<ReceiptRecord> }>) => {
      const { id, updated } = action.payload;
      state.receipts = state.receipts.map((r) => (r.id === id ? { ...r, ...updated } : r));
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },

    deleteReceipt: (state, action: PayloadAction<string>) => {
      state.receipts = state.receipts.filter((r) => r.id !== action.payload);
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },

    deleteInvoice: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.invoices = state.invoices.filter((i) => i.id !== id);
      state.proformas = state.proformas.filter((p) => p.id !== id);
      state.reimbursements = state.reimbursements.filter((r) => r.id !== id);
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },

    addBankAccount: (state, action: PayloadAction<BankAccount>) => {
      const newAcc = action.payload;
      if (newAcc.isPrimary) {
        state.bankAccounts = state.bankAccounts.map((a) => ({ ...a, isPrimary: false })).concat(newAcc);
      } else {
        state.bankAccounts = [...state.bankAccounts, newAcc];
      }
    },

    // UI and Filter state reducers
    setActiveTab: (state, action: PayloadAction<InvoiceTab>) => {
      state.activeTab = action.payload;
      state.summaryStats = calculateStats(
        state.activeTab,
        state.invoices,
        state.proformas,
        state.reimbursements,
        state.receipts
      );
    },
    setFinancialYear: (state, action: PayloadAction<string>) => {
      state.financialYear = action.payload;
    },
    setDateRange: (state, action: PayloadAction<string>) => {
      state.dateRange = action.payload;
    },
    setCurrencyFilter: (state, action: PayloadAction<string>) => {
      state.currencyFilter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.statusFilter = action.payload;
    },
    setActiveReport: (state, action: PayloadAction<string>) => {
      state.activeReport = action.payload;
    },
  },
});

export const {
  hydrateInvoices,
  fetchInvoicesRequest,
  fetchInvoicesSuccess,
  fetchInvoicesFailure,
  createInvoiceRequest,
  createInvoiceSuccess,
  createInvoiceFailure,
  createProformaRequest,
  createProformaSuccess,
  createProformaFailure,
  createCreditNoteRequest,
  createCreditNoteSuccess,
  createCreditNoteFailure,
  updateInvoiceRequest,
  updateInvoiceSuccess,
  updateInvoiceFailure,
  voidInvoiceRequest,
  voidInvoiceSuccess,
  voidInvoiceFailure,
  addReimbursement,
  addReceipt,
  updateReceipt,
  deleteReceipt,
  deleteInvoice,
  addBankAccount,
  setActiveTab,
  setFinancialYear,
  setDateRange,
  setCurrencyFilter,
  setSearchQuery,
  setStatusFilter,
  setActiveReport,
} = invoiceSlice.actions;

export default invoiceSlice.reducer;
