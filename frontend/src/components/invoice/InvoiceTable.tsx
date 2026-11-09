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
  Eye,
  Pencil,
  Trash2,
  Ban,
  FileSpreadsheet,
  PenTool,
  Loader2,
  CreditCard,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InvoiceRecord, ReceiptRecord } from './types';
import { useInvoice } from './InvoiceContext';
import { useAuth } from '../auth/AuthContext';
import { usePermission } from '../team/usePermission';
import { pdfSignerApi } from '@/services/pdfSignerApi';
import { TaskAllocationInput } from '@/services/financialApi';
import { Pagination } from '../ui/Pagination';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { DropdownActionItem } from '@/components/ui/TableActionDropdown';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ColumnHeaderMenu } from '@/components/ui/ColumnHeaderMenu';
import { DiscardConfirmationModal } from '@/components/ui/DiscardConfirmationModal';
import { InvoiceLivePreview, generateInvoicePdfBlob } from '@/components/onboarding/tabs/InvoiceLivePreview';

interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
}

interface InvoiceTableProps {
  onView?: (item: InvoiceRecord | ReceiptRecord) => void;
  onEdit?: (item: InvoiceRecord | ReceiptRecord) => void;
  onViewDetail?: (item: InvoiceRecord | ReceiptRecord) => void;
  onRecordPayment?: (item: InvoiceRecord) => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ onView, onEdit, onViewDetail, onRecordPayment }) => {
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
    bankAccounts,
  } = useInvoice();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { canAddEdit, canDelete } = usePermission();
  const isEmployee = (currentUser?.role || '').toLowerCase() === 'employee';
  const [signingInvoiceId, setSigningInvoiceId] = useState<string | null>(null);
  const [signingTargetRow, setSigningTargetRow] = useState<any | null>(null);
  const [creditNoteTarget, setCreditNoteTarget] = useState<InvoiceRecord | null>(null);
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [financialActionError, setFinancialActionError] = useState('');
  const [financialActionBusy, setFinancialActionBusy] = useState(false);

  const handleSignInvoiceWithDsc = async (row: any) => {
    setSigningInvoiceId(row.id);
    setSigningTargetRow(row);
    try {
      const bank = (bankAccounts || []).find((b) => b.id === row.bankAccountId) || (bankAccounts || []).find((b) => b.isPrimary) || (bankAccounts || [])[0];

      // Allow DOM to mount offscreen preview
      await new Promise((r) => setTimeout(r, 120));

      let pdfBase64: string | undefined;
      try {
        const blob = await generateInvoicePdfBlob('invoice-table-stage-capture');
        if (blob) {
          const arrayBuf = await blob.arrayBuffer();
          let binary = '';
          const bytes = new Uint8Array(arrayBuf);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          pdfBase64 = btoa(binary);
        }
      } catch (e) {
        console.warn('Could not generate direct invoice PDF blob in table:', e);
      }

      const res = await pdfSignerApi.stageInvoice({
        invoiceNumber: row.number || `INV-${row.id}`,
        clientName: row.clientBusinessName || row.clientLegalName || 'Valued Client',
        clientId: row.clientId,
        date: row.date,
        dueDate: row.dueDate,
        totalAmount: row.totalPayable || row.amount || 0,
        subTotal: row.subTotal || 0,
        billingOrg: row.billingOrg || 'Ayatrio',
        billingAddress: row.billingAddress || 'Gonde Dumala, gonde dd, Nashik, Maharashtra, 476001',
        firmGstin: (row as any).firmGstin || '07DDIPA9391G1ZC',
        firmPan: (row as any).firmPan || 'AAAAA9999A',
        clientAddress: row.clientAddress || (row as any).address || '',
        clientGstin: row.clientGstin || '',
        clientPan: row.clientPan || '',
        clientTan: (row as any).clientTan || (row as any).tan || '',
        clientContact: (row as any).clientContact || row.clientBusinessName || row.clientLegalName,
        clientEmail: (row as any).clientEmail || (row as any).email || '',
        clientPhone: (row as any).clientPhone || (row as any).phone || '',
        placeOfSupply: row.placeOfSupply || '27-Maharashtra',
        services: row.services?.map((s: any) => ({
          serviceName: s.serviceName || 'CA Professional Services',
          amount: s.amount || s.total || 0,
          description: s.description || '',
          hsnSac: s.hsnSac || s.periodLabel || '998211',
          quantity: s.quantity || 1,
          rate: s.price || s.amount || 0,
          taxRate: s.tax || '18%',
          taxable: s.amount || s.price || 0,
        })),
        notes: row.notes || 'Thank you for your business. Please make payment within the due date.',
        bankDetails: bank ? {
          accountHolderName: bank.accountBusinessName || 'Krishna Associates',
          accountNumber: bank.accountNumber || '50200012345678',
          ifscCode: bank.ifscCode || 'HDFC0000214',
          branchName: bank.branchAddress || 'Shop 4, Manpada Road, Dombivli West, Thane, Maharashtra 421202',
          bankName: bank.bankName || 'HDFC Bank Ltd',
          upiId: bank.upi || 'krishnaassociates@okhdfcbank',
        } : undefined,
        pdfBase64,
      });
      const stagedId = res?.data?.id || (res?.data as any)?._id;
      if (stagedId) {
        router.push(`/pdf-signer?stagedId=${encodeURIComponent(stagedId)}`);
      } else {
        router.push('/pdf-signer');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to prepare invoice for DSC signing');
    } finally {
      setSigningInvoiceId(null);
      setSigningTargetRow(null);
    }
  };

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
  const [itemToDelete, setItemToDelete] = useState<InvoiceRecord | ReceiptRecord | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
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
    if (financialYear && financialYear !== 'All') {
      list = list.filter((item) => !(item as any).financialYear || (item as any).financialYear === financialYear);
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
          // Enhanced Columns for Reusable DataTable
  const dataTableColumns = useMemo<DataTableColumn<any>[]>(() => {
    return columns.map((col) => ({
      id: col.key,
      header: col.label,
      sortable: col.sortable !== false,
      align: (col.key === "totalPayable" || col.key === "amount" || col.key === "balanceAmount" ? "right" : col.key === "status" ? "center" : "left"),
      minWidth: col.key === "clientBusinessName" || col.key === "businessName" ? 180 : col.key === "service" ? 160 : 120,
      cell: (row: any) => {
        if (col.key === "number" || col.key === "receiptNo") {
          return (
            <button
              type="button"
              onClick={() => {
                if (onViewDetail) onViewDetail(row);
                else onView?.(row);
              }}
              className="font-semibold text-[#31719B] dark:text-[#60a5fa] hover:underline text-left cursor-pointer"
            >
              {row[col.key] || "#" + row.id.slice(0, 8)}
            </button>
          );
        }

        if (col.key === "clientBusinessName" || col.key === "businessName") {
          return <span className="font-semibold text-gray-900 dark:text-white truncate block">{row[col.key] || "—"}</span>;
        }

        if (col.key === "totalPayable" || col.key === "amount" || col.key === "balanceAmount") {
          const val = row[col.key] ?? 0;
          return (
            <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              {typeof val === "number" ? "₹" + val.toLocaleString("en-IN") : String(val)}
            </span>
          );
        }

        if (col.key === "status") {
          const s = row.status || "Draft";
          const isPaid = s === "Paid" || s === "Recorded";
          const isOverdue = s === "Overdue";
          const isVoid = s === "Void" || s === "Cancelled";
          return (
            <span
              className={
                "inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold " +
                (isPaid
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                  : isOverdue || isVoid
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200")
              }
            >
              {s}
            </span>
          );
        }

        if (col.key === "date" || col.key === "dueDate" || col.key === "paymentDate") {
          const dateVal = row[col.key];
          return <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{dateVal || "—"}</span>;
        }

        return <span className="text-gray-700 dark:text-gray-300 truncate block">{row[col.key] || "—"}</span>;
      },
    }));
  }, [columns, onViewDetail, onView]);

  const getInvoiceActions = (row: any): DropdownActionItem[] => {
    const actions: DropdownActionItem[] = [
      {
        label: "View",
        icon: Eye,
        onClick: () => {
          if (onViewDetail) onViewDetail(row);
          else onView?.(row);
        },
      },
    ];

    if (canAddEdit("invoice")) {
      actions.push({
        label: "Edit",
        icon: Pencil,
        onClick: () => onEdit?.(row),
      });
    }

    if (canAddEdit("invoice") && (activeTab === "invoice" || activeTab === "proforma") && row.status !== "Cancelled") {
      actions.push({
        label: "Sign with DSC",
        icon: PenTool,
        onClick: () => handleSignInvoiceWithDsc(row),
      });
    }

    if (activeTab === "invoice" && row.type === "invoice" && row.status !== "Paid" && row.status !== "Cancelled") {
      actions.push({
        label: "Record Payment",
        icon: CreditCard,
        onClick: () => onRecordPayment?.(row),
      });
    }

    if (canAddEdit("invoice") && activeTab === "invoice" && row.type === "invoice" && row.status !== "Cancelled") {
      if (row.taskAllocations?.length > 0) {
        actions.push({
          label: "Issue Credit Note",
          icon: FileSpreadsheet,
          onClick: () => {
            setCreditNoteTarget(row);
            setCreditAmounts({});
            setFinancialActionError("");
          },
        });
      }
      actions.push({
        label: "Void Invoice",
        icon: Ban,
        onClick: () => {
          const reason = window.prompt("Reason for voiding this issued invoice:");
          if (reason?.trim()) {
            void voidInvoice(row, reason.trim()).catch((error) =>
              setFinancialActionError(error instanceof Error ? error.message : "Invoice could not be voided.")
            );
          }
        },
      });
    }

    if (canDelete("invoice")) {
      actions.push({
        label: "Delete",
        icon: Trash2,
        variant: "danger",
        onClick: () => {
          if (window.confirm("Are you sure you want to delete this record?")) {
            if (activeTab === "receipts") {
              const res = deleteReceipt(row.id);
              if (!res.success && res.message) alert(res.message);
            } else {
              const res = deleteInvoice(row.id);
              if (!res.success && res.message) alert(res.message);
            }
          }
        },
      });
    }

    return actions;
  };
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
    <div className="w-full flex-1 flex flex-col  border-[#dde2e8] dark:border-[#334155] rounded-none overflow-hidden bg-white dark:bg-[#1e293b] select-none transition-colors">
      {/* Table Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto min-h-[350px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead style={{ backgroundColor: "var(--orange-havy-light)" }}>
            <tr>
              {/* Checkbox column */}
              <th className="py-3 px-3.5 w-10 text-center border-r border-b border-[#dde2e8] dark:border-[#334155]">
                <input
                  type="checkbox"
                  checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600 accent-[#31719B] cursor-pointer"
                />
              </th>

              {visibleColumns.map((col) => {
                const isSorted = sortKey === col.key;
                const isMenuOpen = activeHeaderMenu === col.key;

                return (
                  <th
                    key={col.key}
                    className="py-3 px-3.5 whitespace-nowrap tracking-wider uppercase relative group group/th font-semibold text-xs text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        onClick={() => col.sortable && handleSort(col.key)}
                        className={`cursor-pointer flex items-center gap-1 ${col.sortable ? 'hover:text-[#31719B]' : ''
                          }`}
                      >
                        {col.label}
                        {isSorted && (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#31719B]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#31719B]" />
                          )
                        )}
                      </span>

                      <ColumnHeaderMenu
                        columnId={col.key}
                        columnHeader={col.label}
                        isSortedAsc={isSorted && sortOrder === 'asc'}
                        isSortedDesc={isSorted && sortOrder === 'desc'}
                        onSortAsc={() => handleSort(col.key, 'asc')}
                        onSortDesc={() => handleSort(col.key, 'desc')}
                        onHideColumn={() => handleHideColumn(col.key)}
                        onClearAll={handleClearAll}
                      />
                    </div>
                  </th>
                );
              })}
              <th className="py-3 px-3.5 text-center whitespace-nowrap tracking-wider uppercase font-semibold text-xs text-gray-700 dark:text-gray-300 border-b border-[#dde2e8] dark:border-[#334155]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="h-72 text-center text-sm font-normal text-gray-400 dark:text-gray-500"
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
                    className={`hover:bg-gray-50/60 dark:hover:bg-[#162032]/40 transition-colors ${isSelected ? 'bg-[#EEF2FF]/40 dark:bg-[#31719B]/10' : ''
                      }`}
                  >
                    <td className="py-2.5 px-3.5 text-center border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(row.id)}
                        className="rounded border-gray-300 dark:border-gray-600 accent-[#31719B] cursor-pointer"
                      />
                    </td>

                    {visibleColumns.map((col) => {
                      let cellContent: React.ReactNode = null;

                      if (col.key === 'number' || col.key === 'receiptNo') {
                        cellContent = (
                          <button
                            type="button"
                            onClick={() => {
                              if (onViewDetail) {
                                onViewDetail(row);
                              } else {
                                onView?.(row);
                              }
                            }}
                            className="font-semibold text-[#31719B] dark:text-[#60a5fa] hover:underline text-left cursor-pointer"
                          >
                            {row[col.key]}
                          </button>
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
                          className="py-2.5 px-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs border-r border-b border-[#dde2e8] dark:border-[#334155]"
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-center border-b border-[#dde2e8] dark:border-[#334155]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewDetail) {
                              onViewDetail(row);
                            } else {
                              onView?.(row);
                            }
                          }}
                          className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#31719B] transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canAddEdit('invoice') && (
                          <button
                            type="button"
                            onClick={() => onEdit?.(row)}
                            className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#31719B] transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quick Record Payment on Invoice */}
                        {canAddEdit('invoice') && activeTab === 'invoice' && row.type === 'invoice' && row.status !== 'Paid' && row.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => onRecordPayment?.(row)}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Sign Invoice with DSC */}
                        {canAddEdit('invoice') && !isEmployee &&
                          (activeTab === 'invoice' || activeTab === 'proforma') &&
                          row.status !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleSignInvoiceWithDsc(row)}
                              disabled={signingInvoiceId === row.id}
                              className="p-1 rounded-none text-[#31719B] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                              title="Sign with DSC (PAdES)"
                            >
                              {signingInvoiceId === row.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#31719B]" />
                              ) : (
                                <PenTool className="w-3.5 h-3.5 text-[#31719B]" />
                              )}
                            </button>
                          )}
                        {canAddEdit('invoice') && activeTab === 'invoice' && row.type === 'invoice' && row.status !== 'Cancelled' && (
                          <>
                            {row.taskAllocations?.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCreditNoteTarget(row);
                                  setCreditAmounts({});
                                  setFinancialActionError('');
                                }}
                                className="p-1 rounded text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-[#31719B] transition-colors"
                                title="Issue Credit Note"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
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
                              className="p-1 rounded text-gray-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 transition-colors"
                              title="Void Invoice"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {canDelete('invoice') && (
                          <button
                            type="button"
                            onClick={() => setItemToDelete(row)}
                            className="p-1 rounded text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
        <section role="dialog" aria-modal="true" aria-labelledby="credit-note-heading" className="w-full max-w-xl rounded-none border border-[var(--border-main)] bg-[var(--bg-surface)] p-5 text-[var(--text-main)] shadow-xl">
          <h2 id="credit-note-heading" className="text-base font-semibold">Issue credit note for {creditNoteTarget.number}</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Allocate each credit explicitly to the original task. Allocations cannot exceed the uncredited original amount.</p>
          <div className="mt-4 space-y-3">{(creditNoteTarget.taskAllocations || []).map((allocation) => {
            const remaining = Math.max(0, allocation.amountPaise - (allocation.creditedPaise || 0));
            return <label key={allocation.taskId} className="grid grid-cols-[1fr_160px] items-center gap-3 text-xs"><span>{allocation.taskId} · remaining ₹{(remaining / 100).toFixed(2)}</span><input aria-label={`Credit amount for task ${allocation.taskId}`} type="number" min="0" max={remaining / 100} step="0.01" value={creditAmounts[allocation.taskId] || ''} onChange={(event) => setCreditAmounts((current) => ({ ...current, [allocation.taskId]: event.target.value }))} className="h-9 rounded border border-[var(--border-main)] bg-[var(--bg-app)] px-2" /></label>;
          })}</div>
          {financialActionError && <p role="alert" className="mt-3 text-xs text-red-600">{financialActionError}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCreditNoteTarget(null)} className="rounded border border-[var(--border-main)] px-3 py-2 text-xs">Cancel</button><button type="button" disabled={financialActionBusy} onClick={() => void submitCreditNote()} style={{ backgroundColor: 'var(--premium-blue-dark)' }} className="rounded px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{financialActionBusy ? 'Issuing…' : 'Issue credit note'}</button></div>
        </section>
      </div>}

      {/* Pagination Footer */}
      <Pagination
        currentPage={safePage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        showPageSize={true}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[15, 25, 50, 100]}
      />

      {/* Delete Record Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={Boolean(itemToDelete)}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          if (!itemToDelete) return;
          if (activeTab === 'receipts') {
            const res = deleteReceipt(itemToDelete.id);
            if (!res.success && res.message) alert(res.message);
          } else {
            const res = deleteInvoice(itemToDelete.id);
            if (!res.success && res.message) alert(res.message);
          }
          setItemToDelete(null);
        }}
        onCancel={() => setItemToDelete(null)}
      />
      {/* Hidden offscreen container for direct pixel-perfect PDF capture during DSC signing */}
      {signingTargetRow && (
        <div style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '794px', pointerEvents: 'none' }}>
          <InvoiceLivePreview
            id="invoice-table-stage-capture"
            template="modern"
            accentColor="#29A9E1"
            firmName={signingTargetRow.billingOrg || 'Ayatrio'}
            firmAddress={signingTargetRow.billingAddress || 'Gonde Dumala, gonde dd, Nashik, Maharashtra, 476001'}
            firmGstin={(signingTargetRow as any).firmGstin || '07DDIPA9391G1ZC'}
            firmPan={(signingTargetRow as any).firmPan || 'AAAAA9999A'}
            showCaLogo={true}
            invoiceType="invoice"
            title="Tax Invoice"
            invoiceNumber={signingTargetRow.number || `INV-${signingTargetRow.id}`}
            invoiceDate={signingTargetRow.date || new Date().toLocaleDateString('en-GB')}
            dueDate={signingTargetRow.dueDate || new Date().toLocaleDateString('en-GB')}
            clientName={signingTargetRow.clientBusinessName || signingTargetRow.clientLegalName || 'Valued Client'}
            clientLegalName={signingTargetRow.clientLegalName || signingTargetRow.clientBusinessName || 'Valued Client'}
            clientAddress={signingTargetRow.clientAddress || (signingTargetRow as any).address || ''}
            clientGstin={signingTargetRow.clientGstin || ''}
            clientPan={signingTargetRow.clientPan || ''}
            clientTan={(signingTargetRow as any).clientTan || ''}
            clientEmail={(signingTargetRow as any).clientEmail || ''}
            clientPhone={(signingTargetRow as any).clientPhone || ''}
            clientPos={signingTargetRow.placeOfSupply || '27-Maharashtra'}
            items={signingTargetRow.services && signingTargetRow.services.length > 0
              ? signingTargetRow.services.map((s: any, idx: number) => {
                  const taxable = s.amount !== undefined ? s.amount : ((s.price || 0) * (s.quantity || 1));
                  const itemCgst = Math.round((taxable * 0.09) * 100) / 100;
                  const itemSgst = Math.round((taxable * 0.09) * 100) / 100;
                  return {
                    id: s.id || String(idx + 1),
                    name: s.serviceName || 'CA Professional Services',
                    description: s.description || '',
                    hsnSac: s.hsnSac || '998211',
                    qty: s.quantity || 1,
                    rate: s.price || s.amount || 0,
                    taxable,
                    gstRate: 18,
                    cgst: itemCgst,
                    sgst: itemSgst,
                    total: s.total || (taxable + itemCgst + itemSgst),
                  };
                })
              : undefined}
            subtotal={signingTargetRow.subTotal || 6000}
            totalAmount={signingTargetRow.totalPayable || signingTargetRow.amount || 7080}
            accountHolderName="Krishna Associates"
            accountNumber="50200012345678"
            ifscCode="HDFC0000214"
            branchName="Shop 4, Manpada Road, Dombivli West, Thane, Maharashtra 421202"
            bankName="HDFC Bank Ltd"
            upiId="krishnaassociates@okhdfcbank"
            notes={signingTargetRow.notes || 'Thank you for your business. Please make payment within the due date.'}
          />
        </div>
      )}
    </div>
  );
};
