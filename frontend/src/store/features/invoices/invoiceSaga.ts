import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import {
  financialApi,
  FinancialInvoiceRecord,
  TaskAllocationInput,
} from '@/services/financialApi';
import { InvoiceRecord } from '@/components/invoice/types';
import {
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
} from './invoiceSlice';
import { showToast } from '../ui/uiSlice';
import { RootState } from '../../rootReducer';

export function toIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function mapPersistedInvoice(record: FinancialInvoiceRecord): InvoiceRecord {
  const details = (record.details || {}) as Partial<InvoiceRecord>;
  return {
    id: record._id,
    type: record.kind === 'credit_note' ? 'credit_note' : record.state === 'draft' ? 'proforma' : 'invoice',
    number: record.number,
    date: details.date || (record.issueDate ? new Date(record.issueDate).toLocaleDateString('en-GB') : ''),
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
    status: (details.status as any) || (record.kind === 'credit_note' ? 'Credit Note' : record.state === 'void' ? 'Cancelled' : record.state === 'draft' ? 'Pending' : 'Receivable'),
    bankAccountId: details.bankAccountId || '',
    notes: details.notes,
    paidAmount: Number(details.paidAmount || 0),
    balanceAmount: details.balanceAmount !== undefined ? Number(details.balanceAmount) : (record.kind === 'credit_note' ? -Math.abs(details.totalPayable || 0) : details.totalPayable || 0),
    financialYear: details.financialYear || '',
    createdAt: String(details.createdAt || record.issueDate || ''),
    taskAllocations: record.allocations,
  };
}

function* handleFetchInvoices(): Generator<any, void, any> {
  try {
    const [records, receiptsData]: [FinancialInvoiceRecord[], any[]] = yield all([
      call(financialApi.listInvoices),
      call(financialApi.listReceipts),
    ]);
    const mapped = records.map(mapPersistedInvoice);
    const invoices = mapped.filter((inv) => inv.type === 'invoice' || inv.type === 'credit_note');
    const proformas = mapped.filter((inv) => inv.type === 'proforma');
    const receipts = (receiptsData || []).map((r: any) => ({
      id: r._id || r.id,
      receiptNo: r.receiptNo,
      billingOrg: r.billingOrg || '',
      clientId: r.clientId || '',
      businessName: r.businessName || '',
      legalName: r.legalName || '',
      group: r.group || '',
      amount: Number(r.amount || 0),
      paymentDate: r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('en-GB') : '',
      method: r.method || 'Bank Transfer',
      bankAccountId: r.bankAccountId || '',
      bankName: r.bankName || '',
      referenceNumber: r.referenceNumber || '',
      notes: r.notes || '',
      financialYear: r.financialYear || '',
      isAdvance: Boolean(r.isAdvance),
      invoiceId: r.invoiceId,
      invoiceNumber: r.invoiceNumber,
    }));
    yield put(fetchInvoicesSuccess({ invoices, proformas, receipts }));
  } catch (error: any) {
    const errorMsg = error?.message || 'Could not load saved invoices from server.';
    yield put(fetchInvoicesFailure(errorMsg));
    yield put(showToast({ type: 'error', message: errorMsg }));
  }
}

function* handleCreateInvoice(
  action: PayloadAction<{
    data: Partial<InvoiceRecord>;
    allocations: TaskAllocationInput[];
    onSuccess?: (record: InvoiceRecord) => void;
  }>
): Generator<any, void, any> {
  const { data, allocations, onSuccess } = action.payload;
  const state: RootState = yield select();
  const currentInvoices = state.invoices.invoices;
  const currentYear = new Date().getFullYear();

  const maxNum = currentInvoices.reduce((max, inv) => {
    const match = inv.number?.match(/INV-\d{4}-(\d+)/i) || inv.number?.match(/(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  const nextNumber = data.number || `INV-${currentYear}-${String(Math.max(currentInvoices.length + 1, maxNum + 1)).padStart(3, '0')}`;

  const draftRecord: InvoiceRecord = {
    id: `inv-${Date.now()}`,
    type: 'invoice',
    number: nextNumber,
    date: data.date || new Date().toLocaleDateString('en-GB'),
    dueDate: data.dueDate || new Date().toLocaleDateString('en-GB'),
    billingOrg: data.billingOrg || 'Krishna Associates',
    billingAddress: data.billingAddress || '',
    clientId: data.clientId || '',
    clientBusinessName: data.clientBusinessName || '',
    clientLegalName: data.clientLegalName || '',
    clientGroup: data.clientGroup || '',
    clientGstin: data.clientGstin || '',
    clientAddress: data.clientAddress || '',
    clientPan: data.clientPan || '',
    services: data.services || [],
    subTotal: data.subTotal || 0,
    totalPayable: data.totalPayable || 0,
    tdsExcludedAmount: data.tdsExcludedAmount || data.subTotal || 0,
    currency: data.currency || 'INR',
    status: 'Receivable',
    bankAccountId: data.bankAccountId || '',
    notes: data.notes || '',
    paidAmount: 0,
    balanceAmount: data.totalPayable || 0,
    financialYear: state.invoices.financialYear,
    createdAt: new Date().toISOString(),
    daysPastDue: 0,
  };

  try {
    const issueDateStr = toIsoDate(data.date) || new Date().toISOString().slice(0, 10);
    const saved: FinancialInvoiceRecord = yield call(financialApi.createInvoice, {
      kind: 'invoice',
      state: 'issued',
      number: nextNumber,
      issueDate: issueDateStr,
      allocations,
      details: draftRecord as unknown as Record<string, unknown>,
      idempotencyKey: crypto.randomUUID(),
    });
    const newRecord = mapPersistedInvoice(saved);
    yield put(createInvoiceSuccess(newRecord));
    yield put(showToast({ type: 'success', message: `Invoice ${newRecord.number} created successfully` }));
    if (onSuccess) onSuccess(newRecord);
  } catch (error: any) {
    console.warn('Backend invoice save failed, storing locally:', error);
    yield put(createInvoiceSuccess(draftRecord));
    yield put(showToast({ type: 'info', message: `Invoice ${draftRecord.number} saved locally` }));
    if (onSuccess) onSuccess(draftRecord);
  }
}

function* handleCreateProforma(
  action: PayloadAction<{
    data: Partial<InvoiceRecord>;
    allocations: TaskAllocationInput[];
    onSuccess?: (record: InvoiceRecord) => void;
  }>
): Generator<any, void, any> {
  const { data, allocations, onSuccess } = action.payload;
  const state: RootState = yield select();
  const currentProformas = state.invoices.proformas;
  const currentYear = new Date().getFullYear();

  const maxNum = currentProformas.reduce((max, inv) => {
    const match = inv.number?.match(/PI-\d{4}-(\d+)/i) || inv.number?.match(/(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  const nextNumber = data.number || `PI-${currentYear}-${String(Math.max(currentProformas.length + 1, maxNum + 1)).padStart(3, '0')}`;

  const draftRecord: InvoiceRecord = {
    id: `prof-${Date.now()}`,
    type: 'proforma',
    number: nextNumber,
    date: data.date || new Date().toLocaleDateString('en-GB'),
    dueDate: data.dueDate || new Date().toLocaleDateString('en-GB'),
    billingOrg: data.billingOrg || 'Krishna Associates',
    billingAddress: data.billingAddress || '',
    clientId: data.clientId || '',
    clientBusinessName: data.clientBusinessName || '',
    clientLegalName: data.clientLegalName || '',
    clientGroup: data.clientGroup || '',
    clientGstin: data.clientGstin || '',
    clientAddress: data.clientAddress || '',
    clientPan: data.clientPan || '',
    services: data.services || [],
    subTotal: data.subTotal || 0,
    totalPayable: data.totalPayable || 0,
    tdsExcludedAmount: data.tdsExcludedAmount || data.subTotal || 0,
    currency: data.currency || 'INR',
    status: 'Receivable',
    bankAccountId: data.bankAccountId || '',
    notes: data.notes || '',
    paidAmount: 0,
    balanceAmount: data.totalPayable || 0,
    financialYear: state.invoices.financialYear,
    createdAt: new Date().toISOString(),
    daysPastDue: 0,
  };

  try {
    const saved: FinancialInvoiceRecord = yield call(financialApi.createInvoice, {
      kind: 'invoice',
      state: 'draft',
      number: nextNumber,
      issueDate: null,
      allocations,
      details: draftRecord as unknown as Record<string, unknown>,
      idempotencyKey: crypto.randomUUID(),
    });
    const newRecord = mapPersistedInvoice(saved);
    yield put(createProformaSuccess(newRecord));
    yield put(showToast({ type: 'success', message: `Proforma ${newRecord.number} created successfully` }));
    if (onSuccess) onSuccess(newRecord);
  } catch (error: any) {
    console.warn('Backend proforma save failed, storing locally:', error);
    yield put(createProformaSuccess(draftRecord));
    yield put(showToast({ type: 'info', message: `Proforma ${draftRecord.number} saved locally` }));
    if (onSuccess) onSuccess(draftRecord);
  }
}

function* handleCreateCreditNote(
  action: PayloadAction<{
    original: InvoiceRecord;
    allocations: TaskAllocationInput[];
    onSuccess?: () => void;
  }>
): Generator<any, void, any> {
  const { original, allocations, onSuccess } = action.payload;
  const state: RootState = yield select();
  const currentInvoices = state.invoices.invoices;
  const cnCount = currentInvoices.filter((inv) => inv.type === 'credit_note').length;
  const number = `CN-2026-${String(cnCount + 1).padStart(3, '0')}`;
  const amount = allocations.reduce((sum, allocation) => sum + allocation.amountPaise, 0) / 100;

  try {
    const saved: FinancialInvoiceRecord = yield call(financialApi.createInvoice, {
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
    const newRecord = mapPersistedInvoice(saved);
    yield put(createCreditNoteSuccess(newRecord));
    yield put(showToast({ type: 'success', message: `Credit Note ${number} issued successfully` }));
    if (onSuccess) onSuccess();
  } catch (error: any) {
    yield put(createCreditNoteFailure(error?.message || 'Failed to issue credit note'));
    yield put(showToast({ type: 'error', message: error?.message || 'Failed to issue credit note' }));
  }
}

function* handleUpdateInvoice(
  action: PayloadAction<{
    id: string;
    updated: Partial<InvoiceRecord>;
    onSuccess?: () => void;
  }>
): Generator<any, void, any> {
  const { id, updated, onSuccess } = action.payload;
  try {
    if (/^[a-f\d]{24}$/i.test(id)) {
      yield call(financialApi.updateInvoice, id, {
        details: updated as Record<string, unknown>,
        number: updated.number,
        issueDate: toIsoDate(updated.date),
      });
    }
    yield put(updateInvoiceSuccess({ id, updated }));
    yield put(showToast({ type: 'success', message: 'Invoice updated successfully' }));
    if (onSuccess) onSuccess();
  } catch (error: any) {
    console.warn('Backend updateInvoice failed, applying locally:', error);
    yield put(updateInvoiceSuccess({ id, updated }));
    if (onSuccess) onSuccess();
  }
}

function* handleVoidInvoice(
  action: PayloadAction<{
    id: string;
    reason: string;
    onSuccess?: () => void;
  }>
): Generator<any, void, any> {
  const { id, reason, onSuccess } = action.payload;
  try {
    if (/^[a-f\d]{24}$/i.test(id)) {
      yield call(financialApi.voidInvoice, id, reason);
    }
    yield put(voidInvoiceSuccess(id));
    yield put(showToast({ type: 'success', message: 'Invoice cancelled successfully' }));
    if (onSuccess) onSuccess();
  } catch (error: any) {
    yield put(voidInvoiceFailure(error?.message || 'Failed to cancel invoice'));
    yield put(showToast({ type: 'error', message: error?.message || 'Failed to cancel invoice' }));
  }
}

export function* invoiceSaga() {
  yield all([
    takeLatest(fetchInvoicesRequest.type, handleFetchInvoices),
    takeLatest(createInvoiceRequest.type, handleCreateInvoice),
    takeLatest(createProformaRequest.type, handleCreateProforma),
    takeLatest(createCreditNoteRequest.type, handleCreateCreditNote),
    takeLatest(updateInvoiceRequest.type, handleUpdateInvoice),
    takeLatest(voidInvoiceRequest.type, handleVoidInvoice),
  ]);
}
