"use client";

import React, { useState, useMemo } from 'react';
import {
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { InvoiceRecord, ReceiptRecord } from './types';
import { useInvoice } from './InvoiceContext';
import { TaskAllocationInput } from '@/services/financialApi';

interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
}

interface InvoiceTableProps {
  onView?: (item: InvoiceRecord | ReceiptRecord) => void;
  onEdit?: (item: InvoiceRecord | ReceiptRecord) => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ onView, onEdit }) => {
  const {
    activeTab,
    invoices,
    proformas,
    reimbursements,
    receipts,
    financialYear,
    searchQuery,
    statusFilter,
    currencyFilter,
    addCreditNote,
    voidInvoice,
    deleteInvoice,
    deleteReceipt,
  } = useInvoice();
  const [creditNoteTarget, setCreditNoteTarget] = useState<InvoiceRecord | null>(null);
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [financialActionError, setFinancialActionError] = useState('');
  const [financialActionBusy, setFinancialActionBusy] = useState(false);

  // Column definitions per tab
  const columns: ColumnDef[] = useMemo(() => {
    if (activeTab === 'receipts') {
      return [
        { key: 'receiptNo', label: 'ID', sortable: true },
        { key: 'billingOrg', label: 'Billing Org', sortable: true },
        { key: 'businessName', label: 'Business Name', sortable: true },
        { key: 'group', label: 'Group', sortable: true },
        { key: 'amount', label: 'Amount', sortable: true },
        { key: 'paymentDate', label: 'Payment Date', sortable: true },
        { key: 'method', label: 'Method', sortable: true },
        { key: 'invoiceNumber', label: 'Invoice #', sortable: true },
        { key: 'proformaNumber', label: 'Proforma #', sortable: true },
      ];
    }

    if (activeTab === 'reimbursement') {
      return [
        { key: 'number', label: 'ID', sortable: true },
        { key: 'billingOrg', label: 'Billing Org', sortable: true },
        { key: 'clientBusinessName', label: 'Client', sortable: true },
        { key: 'clientGroup', label: 'Group', sortable: true },
        { key: 'type', label: 'Type', sortable: true },
        { key: 'taskId', label: 'Task ID', sortable: true },
        { key: 'particulars', label: 'Reimbursement...', sortable: true },
        { key: 'balanceAmount', label: 'Payment Due', sortable: true },
        { key: 'date', label: 'Invoice Date', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
      ];
    }

    // Default: Proforma or Invoice
    return [
      { key: 'number', label: 'ID', sortable: true },
      { key: 'clientBusinessName', label: 'Business Name', sortable: true },
      { key: 'clientGroup', label: 'Group', sortable: true },
      { key: 'type', label: 'Type', sortable: true },
      { key: 'billingOrg', label: 'Billing Org', sortable: true },
      { key: 'clientLegalName', label: 'Legal Name', sortable: true },
      { key: 'clientGstin', label: 'GSTIN', sortable: true },
      { key: 'service', label: 'Service', sortable: true },
      { key: 'frequency', label: 'Frequency', sortable: true },
      { key: 'totalPayable', label: 'Amount', sortable: true },
      { key: 'date', label: 'Date', sortable: true },
      { key: 'dueDate', label: 'Due Date', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
    ];
  }, [activeTab]);

  // State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<string | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Raw dataset based on active tab
  const rawData: (InvoiceRecord | ReceiptRecord)[] = useMemo(() => {
    if (activeTab === 'invoice') return invoices;
    if (activeTab === 'proforma') return proformas;
    if (activeTab === 'reimbursement') return reimbursements;
    if (activeTab === 'receipts') return receipts;
    return [];
  }, [activeTab, invoices, proformas, reimbursements, receipts]);

  // Filtered & sorted data
  const processedData = useMemo(() => {
    let list = [...rawData];

    // Filter by financial year
    if (financialYear) {
      list = list.filter((item) => (item as any).financialYear === financialYear);
    }

    // Filter by status if not All
    if (statusFilter !== 'All') {
      if (activeTab === 'receipts') {
        if (statusFilter === 'Advance') {
          list = list.filter((item) => (item as ReceiptRecord).isAdvance);
        }
      } else {
        list = list.filter((item) => (item as InvoiceRecord).status === statusFilter);
      }
    }

    // Filter by currency
    if (currencyFilter !== 'All Currencies') {
      const code = currencyFilter.split(' ')[0];
      list = list.filter((item) => ((item as any).currency || 'INR') === code);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        const itemStr = JSON.stringify(item).toLowerCase();
        return itemStr.includes(q);
      });
    }

    // Sorting
    if (sortKey) {
      list.sort((a: any, b: any) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        // Custom mappings
        if (sortKey === 'service') {
          valA = a.services?.[0]?.serviceName || '';
          valB = b.services?.[0]?.serviceName || '';
        } else if (sortKey === 'frequency') {
          valA = a.services?.[0]?.frequency || '';
          valB = b.services?.[0]?.frequency || '';
        } else if (sortKey === 'particulars') {
          valA = a.services?.[0]?.serviceName || '';
          valB = b.services?.[0]?.serviceName || '';
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return list;
  }, [rawData, financialYear, statusFilter, currencyFilter, searchQuery, sortKey, sortOrder, activeTab]);

  // Pagination calculation
  const totalItems = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  const fromIndex = totalItems === 0 ? 0 : startIndex + 1;
  const toIndex = Math.min(startIndex + pageSize, totalItems);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedData.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key: string, order?: 'asc' | 'desc') => {
    if (order) {
      setSortKey(key);
      setSortOrder(order);
    } else {
      if (sortKey === key) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortOrder('asc');
      }
    }
    setActiveHeaderMenu(null);
  };

  const handleHideColumn = (colKey: string) => {
    setHiddenColumns((prev) => new Set([...prev, colKey]));
    setActiveHeaderMenu(null);
  };

  const handleClearAll = () => {
    setHiddenColumns(new Set());
    setSortKey(null);
    setSelectedIds(new Set());
    setActiveHeaderMenu(null);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Advance Paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d] dark:bg-[#14532d]/40 dark:text-[#86efac]">
            {status}
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffedd5] text-[#c2410c] dark:bg-[#432818] dark:text-[#fdba74]">
            Partially Paid
          </span>
        );
      case 'Receivable':
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fee2e2] text-[#b91c1c] dark:bg-[#4c1d1d] dark:text-[#fca5a5]">
            {status}
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fee2e2] text-[#991b1b] dark:bg-[#4c1d1d] dark:text-[#fca5a5]">
            Overdue
          </span>
        );
      case 'Cancelled':
      case 'Write-Off':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  const visibleColumns = columns.filter((col) => !hiddenColumns.has(col.key));

  const submitCreditNote = async () => {
    if (!creditNoteTarget) return;
    const allocations: TaskAllocationInput[] = (creditNoteTarget.taskAllocations || []).flatMap((allocation) => {
      const amountPaise = Math.round(Number(creditAmounts[allocation.taskId] || 0) * 100);
      const remainingPaise = allocation.amountPaise - (allocation.creditedPaise || 0);
      return amountPaise > 0 && amountPaise <= remainingPaise ? [{ taskId: allocation.taskId, amountPaise }] : [];
    });
    if (!allocations.length) {
      setFinancialActionError('Enter a positive amount within the remaining balance for at least one task.');
      return;
    }
    setFinancialActionBusy(true);
    setFinancialActionError('');
    try {
      await addCreditNote(creditNoteTarget, allocations);
      setCreditNoteTarget(null);
      setCreditAmounts({});
    } catch (error) {
      setFinancialActionError(error instanceof Error ? error.message : 'Credit note could not be issued.');
    } finally {
      setFinancialActionBusy(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-white dark:bg-[#1e293b] select-none transition-colors">
      {/* Table Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto min-h-[350px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#e5e7eb] dark:border-[#334155] bg-gray-50/70 dark:bg-[#0f172a]/60 text-gray-600 dark:text-gray-300 font-semibold text-[11px]">
              {/* Checkbox column */}
              <th className="py-3 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                  onChange={handleSelectAll}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-[#3D6A9E] focus:ring-[#3D6A9E] cursor-pointer"
                />
              </th>

              {visibleColumns.map((col) => {
                const isSorted = sortKey === col.key;
                const isMenuOpen = activeHeaderMenu === col.key;

                return (
                  <th
                    key={col.key}
                    className="py-3 px-4 whitespace-nowrap tracking-tight uppercase relative group font-semibold"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        onClick={() => col.sortable && handleSort(col.key)}
                        className={`cursor-pointer flex items-center gap-1 ${col.sortable ? 'hover:text-[#3D6A9E]' : ''
                          }`}
                      >
                        {col.label}
                        {isSorted && (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#3D6A9E]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#3D6A9E]" />
                          )
                        )}
                      </span>

                      {/* Three-dot menu button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHeaderMenu(isMenuOpen ? null : col.key);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity cursor-pointer"
                      >
                        <MoreVertical className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>

                    {/* Column Dropdown Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 rounded-md shadow-lg bg-white dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155] py-1 z-40 normal-case font-normal text-xs animate-in fade-in duration-100">
                        <button
                          type="button"
                          onClick={() => handleSort(col.key, 'asc')}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#334155] text-gray-700 dark:text-gray-200 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3 text-gray-500" />
                          <span>Sort Ascending</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSort(col.key, 'desc')}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#334155] text-gray-700 dark:text-gray-200 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3 text-gray-500" />
                          <span>Sort Descending</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHideColumn(col.key)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#334155] text-gray-700 dark:text-gray-200 cursor-pointer"
                        >
                          <EyeOff className="w-3 h-3 text-gray-500" />
                          <span>Hide Column</span>
                        </button>
                        <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#334155] text-red-600 dark:text-red-400 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear All</span>
                        </button>
                      </div>
                    )}
                  </th>
                );
              })}
              <th className="py-3 px-4 text-center whitespace-nowrap tracking-tight uppercase">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="py-16 text-center text-sm font-normal text-gray-500 dark:text-gray-400"
                >
                  No rows
                </td>
              </tr>
            ) : (
              paginatedData.map((row: any) => {
                const isSelected = selectedIds.has(row.id);

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-[#e5e7eb] dark:border-[#334155] hover:bg-gray-50/80 dark:hover:bg-[#0f172a]/40 transition-colors ${isSelected ? 'bg-[#eeedfd]/40 dark:bg-[#3D6A9E]/10' : ''
                      }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(row.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[#3D6A9E] focus:ring-[#3D6A9E] cursor-pointer"
                      />
                    </td>

                    {visibleColumns.map((col) => {
                      let cellContent: React.ReactNode = null;

                      if (col.key === 'number' || col.key === 'receiptNo') {
                        cellContent = (
                          <span className="font-semibold text-[#3D6A9E] dark:text-[#a59df7]">
                            {row[col.key]}
                          </span>
                        );
                      } else if (col.key === 'totalPayable' || col.key === 'amount' || col.key === 'balanceAmount') {
                        cellContent = (
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            ₹{(row[col.key] || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        );
                      } else if (col.key === 'service' || col.key === 'particulars') {
                        cellContent = row.services?.[0]?.serviceName || '—';
                      } else if (col.key === 'frequency') {
                        cellContent = row.services?.[0]?.frequency || 'One-Time';
                      } else if (col.key === 'status') {
                        cellContent = renderStatusBadge(row.status);
                      } else {
                        cellContent = row[col.key] || '—';
                      }

                      return (
                        <td
                          key={col.key}
                          className="py-3.5 px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs"
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onView?.(row)}
                          className="text-[11px] font-semibold text-[#3D6A9E] hover:underline cursor-pointer"
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit?.(row)}
                          className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          title="Edit"
                        >
                          Edit
                        </button>
                        {activeTab === 'invoice' && row.type === 'invoice' && row.status !== 'Cancelled' && (
                          <>
                            {row.taskAllocations?.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCreditNoteTarget(row);
                                  setCreditAmounts({});
                                  setFinancialActionError('');
                                }}
                                className="text-[11px] font-semibold text-[#3D6A9E] hover:underline cursor-pointer"
                              >
                                Credit note
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const reason = window.prompt('Reason for voiding this issued invoice:');
                                if (reason?.trim()) {
                                  void voidInvoice(row, reason.trim()).catch((error) =>
                                    setFinancialActionError(error instanceof Error ? error.message : 'Invoice could not be voided.')
                                  );
                                }
                              }}
                              className="text-[11px] font-semibold text-amber-600 hover:underline cursor-pointer"
                            >
                              Void
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this record?')) {
                              if (activeTab === 'receipts') {
                                const res = deleteReceipt(row.id);
                                if (!res.success && res.message) alert(res.message);
                              } else {
                                const res = deleteInvoice(row.id);
                                if (!res.success && res.message) alert(res.message);
                              }
                            }
                          }}
                          className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {creditNoteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreditNoteTarget(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="credit-note-heading" className="w-full max-w-xl rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-5 text-[var(--text-main)] shadow-xl">
          <h2 id="credit-note-heading" className="text-base font-semibold">Issue credit note for {creditNoteTarget.number}</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Allocate each credit explicitly to the original task. Allocations cannot exceed the uncredited original amount.</p>
          <div className="mt-4 space-y-3">{(creditNoteTarget.taskAllocations || []).map((allocation) => {
            const remaining = Math.max(0, allocation.amountPaise - (allocation.creditedPaise || 0));
            return <label key={allocation.taskId} className="grid grid-cols-[1fr_160px] items-center gap-3 text-xs"><span>{allocation.taskId} · remaining ₹{(remaining / 100).toFixed(2)}</span><input aria-label={`Credit amount for task ${allocation.taskId}`} type="number" min="0" max={remaining / 100} step="0.01" value={creditAmounts[allocation.taskId] || ''} onChange={(event) => setCreditAmounts((current) => ({ ...current, [allocation.taskId]: event.target.value }))} className="h-9 rounded border border-[var(--border-main)] bg-[var(--bg-app)] px-2" /></label>;
          })}</div>
          {financialActionError && <p role="alert" className="mt-3 text-xs text-red-600">{financialActionError}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCreditNoteTarget(null)} className="rounded border border-[var(--border-main)] px-3 py-2 text-xs">Cancel</button><button type="button" disabled={financialActionBusy} onClick={() => void submitCreditNote()} className="rounded bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{financialActionBusy ? 'Issuing…' : 'Issue credit note'}</button></div>
        </section>
      </div>}

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-xs text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-7 px-2 rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span>
            {fromIndex}–{toIndex} of {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded border border-[#dde2e8] dark:border-[#475569] text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#0f172a] cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded border border-[#dde2e8] dark:border-[#475569] text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#0f172a] cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
