"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Download,
  Eye,
  Plus,
  Receipt,
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
  X,
} from "lucide-react";
import { Client } from "@/data/crmData";
import { InvoiceProvider, useInvoice } from "@/components/invoice/InvoiceContext";
import { InvoiceRecord, ReceiptRecord, PaymentMethod } from "@/components/invoice/types";
import { RecordPaymentModal } from "@/components/invoice/RecordPaymentModal";
import { DataTable, DataTableColumn } from "@/components/ui/dataTable/DataTable";
import { DropdownActionItem } from "@/components/ui/TableActionDropdown";

interface ClientLedgerTabProps {
  client: Client;
  showToast?: (msg: string) => void;
}

// Helper to format currency
const formatCurrency = (val: number): string => {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(absVal);
  return `${isNegative ? "₹-" : "₹"}${formatted}`;
};

// Helper to format date matching display (e.g., 01 Apr 2026)
const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return "01 Apr 2026";
  try {
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) {
          return dt.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }
      }
    }
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
};

// Formats invoice or receipt reference cleanly without mangling
const formatReference = (
  rawRef: string,
  type: "invoice" | "receipt" | "proforma"
): string => {
  if (!rawRef) {
    return type === "receipt" ? "REC-2026-001" : "INV-2026-001";
  }
  return rawRef;
};

interface LedgerRow {
  id: string;
  date: string;
  rawDate: string;
  particulars: string;
  reference: string;
  billingOrg: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  type: "invoice" | "receipt" | "proforma";
}

const ClientLedgerInner: React.FC<ClientLedgerTabProps> = ({ client, showToast }) => {
  const { invoices, proformas, receipts, bankAccounts, addReceipt } = useInvoice();

  // Primary filters: all / invoices / payments
  const [primaryFilter, setPrimaryFilter] = useState<"all" | "invoices" | "payments">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "invoice" | "proforma">("all");
  const [selectedFy, setSelectedFy] = useState<string>("FY 2026-2027");
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerRowsPerPage, setLedgerRowsPerPage] = useState<number>(15);

  // Single organization opening balance for this client
  const [openingBalance, setOpeningBalance] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`client_ledger_ob_${client.id}`);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) return parsed;
        try {
          const obj = JSON.parse(saved);
          if (typeof obj === "number") return obj;
          if (obj && typeof obj.Consolidated === "number") return obj.Consolidated;
          if (obj && typeof obj.amount === "number") return obj.amount;
        } catch {}
      }
    }
    return 0;
  });

  // Modals state
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Form state for Add Opening Balance
  const [obAmountInput, setObAmountInput] = useState<string>("0");
  const [obDateInput, setObDateInput] = useState<string>("2026-04-01");

  // Form state for Record Payment
  const [payAmount, setPayAmount] = useState<string>("");
  const [payDate, setPayDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Bank Transfer");
  const [payBankId, setPayBankId] = useState<string>(bankAccounts[0]?.id || "");
  const [payRefNo, setPayRefNo] = useState<string>("");
  const [payParticulars, setPayParticulars] = useState<string>("Payment received");
  const [payAllocInvoiceId, setPayAllocInvoiceId] = useState<string>("");

  // Filter client's invoices
  const clientMatchingInvoices = useMemo(() => {
    const clientNameNorm = (client.name || "").trim().toLowerCase();
    const clientLegalNorm = (client.legalName || "").trim().toLowerCase();
    const clientIdNorm = (client.id || (client as any)._id || "").trim();
    const clientFileNo = (client.fileNo || "").trim().toLowerCase();

    const filterFn = (inv: InvoiceRecord) => {
      const invClientId = (inv.clientId || "").trim();
      if (invClientId && clientIdNorm && invClientId === clientIdNorm) return true;
      if (invClientId && (client as any)._id && invClientId === String((client as any)._id).trim()) return true;
      const invClientName = (inv.clientBusinessName || "").trim().toLowerCase();
      const invLegalName = (inv.clientLegalName || "").trim().toLowerCase();
      if (clientNameNorm && (invClientName === clientNameNorm || invLegalName === clientNameNorm)) return true;
      if (clientLegalNorm && (invClientName === clientLegalNorm || invLegalName === clientLegalNorm)) return true;
      if (clientFileNo && (invClientName.includes(clientFileNo) || invLegalName.includes(clientFileNo))) return true;
      return false;
    };

    return {
      taxInvoices: invoices.filter(filterFn),
      proformaInvoices: proformas.filter(filterFn),
    };
  }, [invoices, proformas, client.id, (client as any)._id, client.name, client.legalName, client.fileNo]);

  // Robust matching for client's receipts & recorded payments
  const clientMatchingReceipts = useMemo(() => {
    const clientNameNorm = (client.name || "").trim().toLowerCase();
    const clientLegalNorm = (client.legalName || "").trim().toLowerCase();
    const clientIdNorm = (client.id || (client as any)._id || "").trim();
    const clientFileNo = (client.fileNo || "").trim().toLowerCase();

    const invoiceIds = new Set(clientMatchingInvoices.taxInvoices.map((inv) => inv.id));
    const invoiceNumbers = new Set(
      clientMatchingInvoices.taxInvoices.map((inv) => inv.number?.trim().toLowerCase()).filter(Boolean)
    );

    const matchedMap = new Map<string, any>();

    // 1. Direct receipts matching client or invoice
    (receipts || []).forEach((rcpt) => {
      const rcptClientId = (rcpt.clientId || "").trim();
      let isMatch = false;

      if (rcptClientId && clientIdNorm && rcptClientId === clientIdNorm) isMatch = true;
      if (rcptClientId && (client as any)._id && rcptClientId === String((client as any)._id).trim()) isMatch = true;

      const rcptBusiness = (rcpt.businessName || "").trim().toLowerCase();
      const rcptLegal = (rcpt.legalName || "").trim().toLowerCase();
      if (clientNameNorm && (rcptBusiness === clientNameNorm || rcptLegal === clientNameNorm)) isMatch = true;
      if (clientLegalNorm && (rcptBusiness === clientLegalNorm || rcptLegal === clientLegalNorm)) isMatch = true;
      if (clientFileNo && (rcptBusiness.includes(clientFileNo) || rcptLegal.includes(clientFileNo))) isMatch = true;

      if (rcpt.invoiceId && invoiceIds.has(rcpt.invoiceId)) isMatch = true;
      if (rcpt.invoiceNumber && invoiceNumbers.has(rcpt.invoiceNumber.trim().toLowerCase())) isMatch = true;

      if (isMatch) {
        const key = rcpt.id || rcpt.receiptNo;
        matchedMap.set(key, rcpt);
      }
    });

    // 2. Payments recorded directly inside client's invoices
    clientMatchingInvoices.taxInvoices.forEach((inv) => {
      const invPayments = ((inv as any).payments || (inv as any).details?.payments || []) as any[];
      invPayments.forEach((p, idx) => {
        const payId = p.receiptId || p.id || `inv-pay-${inv.id}-${idx}`;
        if (!matchedMap.has(payId)) {
          matchedMap.set(payId, {
            id: payId,
            receiptNo: p.receiptNo || p.referenceNumber || `RCPT-INV-${inv.number || idx}`,
            billingOrg: inv.billingOrg,
            clientId: client.id,
            businessName: client.name,
            legalName: client.legalName || client.name,
            amount: Number(p.amount || 0),
            paymentDate: p.paymentDate || inv.date,
            method: p.method || "Bank Transfer",
            referenceNumber: p.referenceNumber || p.receiptNo || "",
            notes: p.notes || `Payment for invoice ${inv.number}`,
            invoiceId: inv.id,
            invoiceNumber: inv.number,
          });
        }
      });

      // 3. Fallback: If inv.paidAmount > 0 and no receipts matched this invoice yet
      if ((inv.paidAmount || 0) > 0) {
        const hasReceiptForInv = Array.from(matchedMap.values()).some(
          (r) => r.invoiceId === inv.id || (r.invoiceNumber && r.invoiceNumber === inv.number)
        );
        if (!hasReceiptForInv) {
          const autoKey = `auto-paid-${inv.id}`;
          matchedMap.set(autoKey, {
            id: autoKey,
            receiptNo: `RCPT-${inv.number || inv.id.slice(-4)}`,
            billingOrg: inv.billingOrg,
            clientId: client.id,
            businessName: client.name,
            legalName: client.legalName || client.name,
            amount: Number(inv.paidAmount),
            paymentDate: inv.date || new Date().toISOString(),
            method: "Bank Transfer",
            referenceNumber: `Payment for ${inv.number}`,
            notes: `Recorded payment on ${inv.number}`,
            invoiceId: inv.id,
            invoiceNumber: inv.number,
          });
        }
      }
    });

    return Array.from(matchedMap.values());
  }, [receipts, client, clientMatchingInvoices.taxInvoices]);

  // Consolidate live transactions into ledger format
  const rawTransactions: LedgerRow[] = useMemo(() => {
    const list: LedgerRow[] = [];

    // 1. Process Tax Invoices (Debit)
    clientMatchingInvoices.taxInvoices.forEach((inv) => {
      const org = inv.billingOrg || "Ayatrio Practice";
      const serviceName =
        inv.services && inv.services.length > 0
          ? inv.services[0].serviceName
          : "Professional CA Services";
      list.push({
        id: `inv-${inv.id}`,
        date: formatDateDisplay(inv.date || inv.createdAt),
        rawDate: inv.date || inv.createdAt || new Date().toISOString(),
        particulars: serviceName,
        reference: formatReference(inv.number, "invoice"),
        billingOrg: org,
        debit: inv.totalPayable || inv.subTotal || 0,
        credit: null,
        balance: 0,
        type: "invoice",
      });
    });

    // 2. Process Proforma Invoices (Informational or filtered)
    clientMatchingInvoices.proformaInvoices.forEach((pro) => {
      const org = pro.billingOrg || "Ayatrio Practice";
      const serviceName =
        pro.services && pro.services.length > 0
          ? pro.services[0].serviceName
          : "Proforma Service Estimate";
      list.push({
        id: `pro-${pro.id}`,
        date: formatDateDisplay(pro.date || pro.createdAt),
        rawDate: pro.date || pro.createdAt || new Date().toISOString(),
        particulars: `${serviceName} (Proforma)`,
        reference: formatReference(pro.number, "proforma"),
        billingOrg: org,
        debit: pro.totalPayable || pro.subTotal || 0,
        credit: null,
        balance: 0,
        type: "proforma",
      });
    });

    // 3. Process Receipts / Payments Received (Credit)
    clientMatchingReceipts.forEach((rcpt) => {
      const org = rcpt.billingOrg || "Ayatrio Practice";
      const amt = Number(rcpt.amount || 0);
      if (amt <= 0) return;
      list.push({
        id: `rcpt-${rcpt.id}`,
        date: formatDateDisplay(rcpt.paymentDate),
        rawDate: rcpt.paymentDate || new Date().toISOString(),
        particulars: rcpt.notes || "Payment received",
        reference: formatReference(rcpt.receiptNo || rcpt.referenceNumber, "receipt"),
        billingOrg: org,
        debit: null,
        credit: amt,
        balance: 0,
        type: "receipt",
      });
    });

    return list;
  }, [clientMatchingInvoices, clientMatchingReceipts]);

  // Ledger Columns for reusable DataTable (clean, no org column needed for single firm)
  const ledgerColumns: DataTableColumn<LedgerRow>[] = useMemo(
    () => [
      {
        id: "date",
        header: "Date",
        width: 120,
        sortable: true,
        cell: (row: LedgerRow) => (
          <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
            {row.date}
          </span>
        ),
      },
      {
        id: "particulars",
        header: "Particulars",
        minWidth: 220,
        sortable: true,
        cell: (row: LedgerRow) => {
          const isReceipt = row.type === "receipt";
          return (
            <div className="flex items-center gap-2 text-xs">
              {isReceipt ? (
                <div className="w-5 h-5 rounded-xs flex items-center justify-center bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Receipt className="w-3 h-3" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-xs flex items-center justify-center bg-[#31719B]/10 dark:bg-[#31719B]/20 text-[#31719B] dark:text-[#3D88BF] shrink-0">
                  <FileText className="w-3 h-3" />
                </div>
              )}
              <span className="font-semibold text-gray-900 dark:text-white">
                {row.particulars}
              </span>
            </div>
          );
        },
      },
      {
        id: "reference",
        header: "Reference",
        width: 160,
        sortable: true,
        cell: (row: LedgerRow) => (
          <span className="font-medium text-[#31719B] dark:text-[#3D88BF] hover:underline cursor-pointer whitespace-nowrap text-xs">
            {row.reference}
          </span>
        ),
      },
      {
        id: "billingOrg",
        header: "Billing Org",
        width: 170,
        sortable: true,
        cell: (row: LedgerRow) => (
          <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs font-medium">
            {row.billingOrg || "—"}
          </span>
        ),
      },
      {
        id: "debit",
        header: "Debit (₹)",
        width: 130,
        align: "right",
        sortable: true,
        cell: (row: LedgerRow) => (
          <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap text-xs">
            {row.debit ? `₹${row.debit.toLocaleString("en-IN")}` : "—"}
          </span>
        ),
      },
      {
        id: "credit",
        header: "Credit (₹)",
        width: 130,
        align: "right",
        sortable: true,
        cell: (row: LedgerRow) => (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-xs">
            {row.credit ? `₹${row.credit.toLocaleString("en-IN")}` : "—"}
          </span>
        ),
      },
      {
        id: "balance",
        header: "Balance (₹)",
        width: 140,
        align: "right",
        sortable: true,
        cell: (row: LedgerRow) => (
          <span
            className={`font-bold whitespace-nowrap text-xs ${
              row.balance < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(row.balance)}
          </span>
        ),
      },
    ],
    []
  );

  const getLedgerActions = (row: LedgerRow): DropdownActionItem[] => [
    {
      label: "View Reference",
      icon: Eye,
      onClick: () => {
        showToast?.(`Viewing ${row.reference}`);
      },
    },
    {
      label: "Download Voucher",
      icon: Download,
      onClick: () => {
        showToast?.(`Downloading voucher for ${row.reference}`);
      },
    },
  ];

  // Process rows: filters, chronological sort, and running balance calculation
  const processedLedgerRows = useMemo(() => {
    let rows = [...rawTransactions];

    // Filter by Primary Filter (All vs Invoices vs Payments)
    if (primaryFilter === "invoices") {
      rows = rows.filter((r) => r.type === "invoice" || r.type === "proforma");
    } else if (primaryFilter === "payments") {
      rows = rows.filter((r) => r.type === "receipt");
    }

    // Filter by Type Filter (All vs Invoice vs Proforma)
    if (typeFilter === "invoice") {
      rows = rows.filter((r) => r.type !== "proforma");
    } else if (typeFilter === "proforma") {
      rows = rows.filter((r) => r.type === "proforma");
    }

    // Sort chronologically
    rows.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

    // Calculate sequential running balance: Invoices (Debit) increase balance, Receipts (Credit) deduct balance
    let running = openingBalance;
    return rows.map((row) => {
      if (row.type !== "proforma") {
        if (row.debit) running += row.debit;
        if (row.credit) running -= row.credit;
      }
      return {
        ...row,
        balance: running,
      };
    });
  }, [rawTransactions, primaryFilter, typeFilter, openingBalance]);

  // Summary Totals
  const summaryStats = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    processedLedgerRows.forEach((r) => {
      if (r.debit) totalDebit += r.debit;
      if (r.credit) totalCredit += r.credit;
    });
    const closingBalance = openingBalance + totalDebit - totalCredit;
    return {
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
    };
  }, [processedLedgerRows, openingBalance]);

  // Paginated ledger rows
  const paginatedLedgerRows = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerRowsPerPage;
    return processedLedgerRows.slice(start, start + ledgerRowsPerPage);
  }, [processedLedgerRows, ledgerPage, ledgerRowsPerPage]);

  // Save Opening Balance Handler
  const handleSaveOpeningBalance = () => {
    const val = parseFloat(obAmountInput) || 0;
    setOpeningBalance(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(`client_ledger_ob_${client.id}`, String(val));
    }
    setIsOpeningBalanceModalOpen(false);
    if (showToast) {
      showToast(`Opening balance of ₹${val.toLocaleString("en-IN")} set successfully.`);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["Date", "Particulars", "Reference", "Billing Org", "Debit (INR)", "Credit (INR)", "Balance (INR)"];
    const rows = processedLedgerRows.map((r) => [
      `"${r.date}"`,
      `"${r.particulars}"`,
      `"${r.reference}"`,
      `"${r.billingOrg || ""}"`,
      r.debit ? `"${r.debit}"` : '""',
      r.credit ? `"${r.credit}"` : '""',
      `"${r.balance}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [`Client: ${client.name} - Ledger`, `Opening Balance: ${openingBalance}`, headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_${client.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP ROW: Ledger Header & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
            <Building2 className="w-4 h-4 text-[#31719B]" />
            <span>Client Ledger Account</span>
            <span className="text-gray-400 dark:text-gray-500 font-normal">|</span>
            <span className="text-gray-500 dark:text-gray-400 font-normal">
              {client.name || "Client"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Record Payment Button */}
          <button
            type="button"
            onClick={() => setIsRecordPaymentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>

          {/* Add Opening Balance Button */}
          <button
            type="button"
            onClick={() => {
              setObAmountInput(String(openingBalance || 0));
              setIsOpeningBalanceModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#31719B] hover:bg-[#285d80] text-white shadow-sm transition-colors cursor-pointer"
          >
            <span>Add Opening Balance</span>
          </button>
        </div>
      </div>

      {/* 2. SECOND ROW: Secondary Filters & Date / Export Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1 border-b border-gray-100 dark:border-gray-800 pb-3">
        {/* Left Filter Groups */}
        <div className="flex items-center gap-3">
          {/* Filter 1: All / Invoices / Payments */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800/60">
            {(["all", "invoices", "payments"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPrimaryFilter(opt)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${
                  primaryFilter === opt
                    ? "bg-[#31719B] text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Filter 2: All / Invoice / Proforma */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800/60">
            {(["all", "invoice", "proforma"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setTypeFilter(opt)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${
                  typeFilter === opt
                    ? "bg-[#31719B] text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Right Controls: Date Range, FY Selector, Download, Summary */}
        <div className="flex items-center gap-2">
          {/* Date Range Button */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span>Date Range</span>
          </button>

          {/* FY Range Switcher (< FY 2026-2027 >) */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200">
            <button
              type="button"
              onClick={() => setSelectedFy("FY 2025-2026")}
              className="p-0.5 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-semibold">{selectedFy}</span>
            <button
              type="button"
              onClick={() => setSelectedFy("FY 2026-2027")}
              className="p-0.5 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Download</span>
          </button>

          {/* Summary Button */}
          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(!isSummaryModalOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            <span>Summary</span>
          </button>
        </div>
      </div>

      {/* Summary Drawer / Bar when toggled */}
      {isSummaryModalOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Opening Balance</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {formatCurrency(summaryStats.openingBalance)}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Total Invoiced (Debit)</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {formatCurrency(summaryStats.totalDebit)}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Total Received (Credit)</span>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(summaryStats.totalCredit)}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Net Closing Balance</span>
            <p
              className={`text-sm font-bold mt-0.5 ${
                summaryStats.closingBalance < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(summaryStats.closingBalance)}
            </p>
          </div>
        </div>
      )}

      {/* 3. MAIN LEDGER TABLE */}
      <DataTable<LedgerRow>
        columns={ledgerColumns}
        data={paginatedLedgerRows}
        actions={getLedgerActions}
        getRowId={(row: LedgerRow) => row.id}
        emptyMessage="No ledger transactions found for this client."
        pagination={{
          currentPage: ledgerPage,
          totalItems: processedLedgerRows.length,
          pageSize: ledgerRowsPerPage,
          onPageChange: (p) => setLedgerPage(p),
          onRowsPerPageChange: (newSize: number) => {
            setLedgerRowsPerPage(newSize);
            setLedgerPage(1);
          },
        }}
      />

      {/* MODAL: ADD OPENING BALANCE */}
      {isOpeningBalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#31719B]" />
                <span>Client Opening Balance</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOpeningBalanceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                  Financial Year
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedFy}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={obDateInput}
                  onChange={(e) => setObDateInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-[#31719B]"
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                  Opening Balance Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 0"
                  value={obAmountInput}
                  onChange={(e) => setObAmountInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-[#31719B]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Positive number represents pending receivable from client.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsOpeningBalanceModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOpeningBalance}
                className="px-4 py-1.5 rounded-lg bg-[#31719B] hover:bg-[#285d80] text-white text-xs font-semibold shadow-sm cursor-pointer"
              >
                Save Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT RECEIVED */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        targetInvoice={
          clientMatchingInvoices.taxInvoices.find(
            (i) => (i.balanceAmount ?? (i.totalPayable - (i.paidAmount || 0))) > 0
          ) || clientMatchingInvoices.taxInvoices[0]
        }
        targetClient={{
          id: client.id || (client as any)._id,
          name: client.name,
          legalName: client.legalName || client.name,
          group: client.group,
        }}
        onPaymentSaved={() => {
          setIsRecordPaymentModalOpen(false);
          showToast?.("Payment receipt recorded successfully.");
        }}
      />
    </div>
  );
};

export const ClientLedgerTab: React.FC<ClientLedgerTabProps> = (props) => {
  return (
    <InvoiceProvider>
      <ClientLedgerInner {...props} />
    </InvoiceProvider>
  );
};
