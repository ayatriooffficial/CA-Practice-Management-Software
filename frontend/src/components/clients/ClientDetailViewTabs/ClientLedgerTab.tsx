"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Download,
  Eye,
  Plus,
  Receipt,
  FileText,
  MoreVertical,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Building2,
  X,
  CreditCard,
  Hash,
} from "lucide-react";
import { Client } from "@/data/crmData";
import { InvoiceProvider, useInvoice } from "@/components/invoice/InvoiceContext";
import { InvoiceRecord, ReceiptRecord, PaymentMethod } from "@/components/invoice/types";
import { organizationApi, OrganizationDetails } from "@/services/organizationApi";
import { RecordPaymentModal } from "@/components/invoice/RecordPaymentModal";
import { DataTable, DataTableColumn } from "@/components/ui/dataTable/DataTable";
import { Button } from "@/components/ui/button/Button";
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

// Helper to format date matching screenshot (e.g., 01 Apr 2026)
const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return "01 Apr 2026";
  try {
    // If dd/mm/yyyy
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

// Helper to derive Sender short code from organization name
const getSenderCode = (orgName: string): string => {
  if (!orgName) return "AY";
  const words = orgName.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return orgName.slice(0, 2).toUpperCase();
};

// Formats invoice or receipt reference number according to Sender & Receiver
const formatReference = (
  rawRef: string,
  type: "invoice" | "receipt" | "proforma",
  senderOrg: string,
  fy: string = "26-27"
): string => {
  if (!rawRef) {
    return type === "receipt" ? `RCPT/${fy}/00001` : `INV/${fy}/001`;
  }
  // If already standard structured, retain clean format
  if (rawRef.startsWith("RCPT/") || rawRef.startsWith("INV/")) {
    return rawRef;
  }
  const cleanNum = rawRef.replace(/[^0-9]/g, "") || "001";
  const prefix = type === "receipt" ? "RCPT" : "INV";
  const code = getSenderCode(senderOrg);
  return `${prefix}/${fy}/${cleanNum.padStart(type === "receipt" ? 5 : 3, "0")}`;
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

  // Multi-Billing Org State
  const [availableOrgs, setAvailableOrgs] = useState<string[]>([
    "Consolidated",
    "Test",
    "India Startup",
    "CA Associates Demo",
    "Test Billing Org",
    "CA Test",
  ]);
  const [selectedOrg, setSelectedOrg] = useState<string>("Consolidated");

  // Filters matching screenshot
  const [primaryFilter, setPrimaryFilter] = useState<"all" | "invoices" | "payments">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "invoice" | "proforma">("all");
  const [selectedFy, setSelectedFy] = useState<string>("FY 2026-2027");
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerRowsPerPage, setLedgerRowsPerPage] = useState<number>(15);

  // Opening Balances per Billing Org (Stored in localStorage or state)
  const [openingBalances, setOpeningBalances] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`client_ledger_ob_${client.id}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch { }
      }
    }
    // Default matching screenshot opening balance of ₹909
    return {
      Consolidated: 909,
      "CA Associates Demo": 909,
      Test: 0,
      "India Startup": 0,
      "Test Billing Org": 0,
      "CA Test": 0,
    };
  });

  // Modals state
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Form state for Add Opening Balance
  const [obAmountInput, setObAmountInput] = useState<string>("909");
  const [obOrgInput, setObOrgInput] = useState<string>(selectedOrg);
  const [obDateInput, setObDateInput] = useState<string>("2026-04-01");

  // Form state for Record Payment
  const [payAmount, setPayAmount] = useState<string>("");
  const [payBillingOrg, setPayBillingOrg] = useState<string>(
    selectedOrg === "Consolidated" ? "CA Associates Demo" : selectedOrg
  );
  const [payDate, setPayDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Bank Transfer");
  const [payBankId, setPayBankId] = useState<string>(bankAccounts[0]?.id || "");
  const [payRefNo, setPayRefNo] = useState<string>("");
  const [payParticulars, setPayParticulars] = useState<string>("Payment received");
  const [payAllocInvoiceId, setPayAllocInvoiceId] = useState<string>("");

  // Fetch real organizations from backend to enrich the billing org list
  useEffect(() => {
    organizationApi
      .getOrganizations()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const names = res.data.map((o) => o.name).filter(Boolean);
          setAvailableOrgs((prev) => {
            const set = new Set([...prev, ...names]);
            return Array.from(set);
          });
        }
      })
      .catch(() => { });
  }, []);

  // Filter client's invoices and receipts
  const clientMatchingInvoices = useMemo(() => {
    const clientNameNorm = (client.name || "").trim().toLowerCase();
    const clientLegalNorm = (client.legalName || "").trim().toLowerCase();
    const clientIdNorm = (client.id || "").trim();

    const filterFn = (inv: InvoiceRecord) => {
      if (inv.clientId && clientIdNorm && inv.clientId === clientIdNorm) return true;
      const invClientName = (inv.clientBusinessName || "").trim().toLowerCase();
      const invLegalName = (inv.clientLegalName || "").trim().toLowerCase();
      if (clientNameNorm && (invClientName === clientNameNorm || invLegalName === clientNameNorm)) return true;
      if (clientLegalNorm && (invClientName === clientLegalNorm || invLegalName === clientLegalNorm)) return true;
      return false;
    };

    return {
      taxInvoices: invoices.filter(filterFn),
      proformaInvoices: proformas.filter(filterFn),
    };
  }, [invoices, proformas, client.id, client.name, client.legalName]);

  const clientMatchingReceipts = useMemo(() => {
    const clientNameNorm = (client.name || "").trim().toLowerCase();
    const clientLegalNorm = (client.legalName || "").trim().toLowerCase();
    const clientIdNorm = (client.id || "").trim();

    return receipts.filter((rcpt) => {
      if (rcpt.clientId && clientIdNorm && rcpt.clientId === clientIdNorm) return true;
      const rcptBusiness = (rcpt.businessName || "").trim().toLowerCase();
      const rcptLegal = (rcpt.legalName || "").trim().toLowerCase();
      if (clientNameNorm && (rcptBusiness === clientNameNorm || rcptLegal === clientNameNorm)) return true;
      if (clientLegalNorm && (rcptBusiness === clientLegalNorm || rcptLegal === clientLegalNorm)) return true;
      return false;
    });
  }, [receipts, client.id, client.name, client.legalName]);

  // If no transactions exist yet in live data, provide realistic CA seed entries matching the screenshot
  const seedTransactions: LedgerRow[] = useMemo(() => {
    return [
      {
        id: "seed-1",
        date: "01 Apr 2026",
        rawDate: "2026-04-01T09:00:00Z",
        particulars: "Payment received",
        reference: "RCPT/26-27/00012",
        billingOrg: "CA Associates Demo",
        debit: null,
        credit: 3540,
        balance: 0,
        type: "receipt",
      },
      {
        id: "seed-2",
        date: "01 Apr 2026",
        rawDate: "2026-04-01T10:00:00Z",
        particulars: "GSTR-1 (Monthly)",
        reference: "INV/26-27/123",
        billingOrg: "CA Associates Demo",
        debit: 3540,
        credit: null,
        balance: 0,
        type: "invoice",
      },
      {
        id: "seed-3",
        date: "06 Apr 2026",
        rawDate: "2026-04-06T09:00:00Z",
        particulars: "Payment received",
        reference: "RCPT/26-27/00018",
        billingOrg: "CA Associates Demo",
        debit: null,
        credit: 11800,
        balance: 0,
        type: "receipt",
      },
      {
        id: "seed-4",
        date: "06 Apr 2026",
        rawDate: "2026-04-06T11:00:00Z",
        particulars: "Appointment Director",
        reference: "INV/26-27/0135",
        billingOrg: "CA Associates Demo",
        debit: 11800,
        credit: null,
        balance: 0,
        type: "invoice",
      },
      {
        id: "seed-5",
        date: "07 Apr 2026",
        rawDate: "2026-04-07T09:00:00Z",
        particulars: "Payment received",
        reference: "RCPT/26-27/00021",
        billingOrg: "CA Associates Demo",
        debit: null,
        credit: 11800,
        balance: 0,
        type: "receipt",
      },
      {
        id: "seed-6",
        date: "07 Apr 2026",
        rawDate: "2026-04-07T09:30:00Z",
        particulars: "Payment received",
        reference: "RCPT/26-27/00019",
        billingOrg: "CA Associates Demo",
        debit: null,
        credit: 11800,
        balance: 0,
        type: "receipt",
      },
      {
        id: "seed-7",
        date: "07 Apr 2026",
        rawDate: "2026-04-07T11:00:00Z",
        particulars: "Allotment of Equity",
        reference: "INV/26-27/0136",
        billingOrg: "CA Associates Demo",
        debit: 11800,
        credit: null,
        balance: 0,
        type: "invoice",
      },
      {
        id: "seed-8",
        date: "07 Apr 2026",
        rawDate: "2026-04-07T11:30:00Z",
        particulars: "Allotment of Equity",
        reference: "INV/26-27/0137",
        billingOrg: "CA Associates Demo",
        debit: 11800,
        credit: null,
        balance: 0,
        type: "invoice",
      },
      {
        id: "seed-9",
        date: "13 Apr 2026",
        rawDate: "2026-04-13T09:00:00Z",
        particulars: "Payment received",
        reference: "RCPT/26-27/00026",
        billingOrg: "CA Associates Demo",
        debit: null,
        credit: 5900,
        balance: 0,
        type: "receipt",
      },
      {
        id: "seed-10",
        date: "13 Apr 2026",
        rawDate: "2026-04-13T10:00:00Z",
        particulars: "Monthly Accounting",
        reference: "INV/26-27/0152",
        billingOrg: "CA Associates Demo",
        debit: 5900,
        credit: null,
        balance: 0,
        type: "invoice",
      },
      {
        id: "seed-11",
        date: "14 Apr 2026",
        rawDate: "2026-04-14T09:00:00Z",
        particulars: "Payment received",
        reference: "RCPT/26-27/00028",
        billingOrg: "CA Associates Demo",
        debit: null,
        credit: 3540,
        balance: 0,
        type: "receipt",
      },
      {
        id: "seed-12",
        date: "14 Apr 2026",
        rawDate: "2026-04-14T09:15:00Z",
        particulars: "Payment received",
        reference: "RCPT/26-27/00027",
        billingOrg: "CA Associates Demo",
        debit: null,
        credit: 5900,
        balance: 0,
        type: "receipt",
      },
      {
        id: "seed-13",
        date: "14 Apr 2026",
        rawDate: "2026-04-14T10:00:00Z",
        particulars: "GST 3B - Monthly",
        reference: "INV/26-27/0153",
        billingOrg: "CA Associates Demo",
        debit: 3540,
        credit: null,
        balance: 0,
        type: "invoice",
      },
      {
        id: "seed-14",
        date: "14 Apr 2026",
        rawDate: "2026-04-14T11:00:00Z",
        particulars: "Accounting",
        reference: "INV/26-27/0155",
        billingOrg: "CA Associates Demo",
        debit: 5900,
        credit: null,
        balance: 0,
        type: "invoice",
      },
      {
        id: "seed-15",
        date: "15 Apr 2026",
        rawDate: "2026-04-15T09:00:00Z",
        particulars: "Payment received",
        reference: "RCPT/26-27/00032",
        billingOrg: "CA Associates Demo",
        debit: null,
        credit: 8260,
        balance: 0,
        type: "receipt",
      },
    ];
  }, []);

  // Consolidate live transactions into ledger format
  const rawTransactions: LedgerRow[] = useMemo(() => {
    const list: LedgerRow[] = [];

    // 1. Process Tax Invoices (Debit)
    clientMatchingInvoices.taxInvoices.forEach((inv) => {
      const org = inv.billingOrg || "CA Associates Demo";
      const serviceName =
        inv.services && inv.services.length > 0
          ? inv.services[0].serviceName
          : "Professional CA Services";
      list.push({
        id: `inv-${inv.id}`,
        date: formatDateDisplay(inv.date || inv.createdAt),
        rawDate: inv.date || inv.createdAt || new Date().toISOString(),
        particulars: serviceName,
        reference: formatReference(inv.number, "invoice", org),
        billingOrg: org,
        debit: inv.totalPayable || inv.subTotal || 0,
        credit: null,
        balance: 0,
        type: "invoice",
      });
    });

    // 2. Process Proforma Invoices (Informational or filtered)
    clientMatchingInvoices.proformaInvoices.forEach((pro) => {
      const org = pro.billingOrg || "CA Associates Demo";
      const serviceName =
        pro.services && pro.services.length > 0
          ? pro.services[0].serviceName
          : "Proforma Service Estimate";
      list.push({
        id: `pro-${pro.id}`,
        date: formatDateDisplay(pro.date || pro.createdAt),
        rawDate: pro.date || pro.createdAt || new Date().toISOString(),
        particulars: `${serviceName} (Proforma)`,
        reference: formatReference(pro.number, "proforma", org),
        billingOrg: org,
        debit: pro.totalPayable || pro.subTotal || 0,
        credit: null,
        balance: 0,
        type: "proforma",
      });
    });

    // 3. Process Receipts / Payments Received (Credit)
    clientMatchingReceipts.forEach((rcpt) => {
      const org = rcpt.billingOrg || "CA Associates Demo";
      list.push({
        id: `rcpt-${rcpt.id}`,
        date: formatDateDisplay(rcpt.paymentDate),
        rawDate: rcpt.paymentDate || new Date().toISOString(),
        particulars: rcpt.notes || "Payment received",
        reference: formatReference(rcpt.receiptNo || rcpt.referenceNumber, "receipt", org),
        billingOrg: org,
        debit: null,
        credit: rcpt.amount || 0,
        balance: 0,
        type: "receipt",
      });
    });

    // If no real transactions exist yet for this client, fall back to seed transactions so ledger isn't blank
    if (list.length === 0) {
      return seedTransactions;
    }

    return list;
  }, [clientMatchingInvoices, clientMatchingReceipts, seedTransactions]);

  // Current opening balance for selected tab
  const currentOpeningBalance = useMemo(() => {
    if (selectedOrg === "Consolidated") {
      return openingBalances["Consolidated"] ?? 909;
    }
    return openingBalances[selectedOrg] ?? 0;
  }, [selectedOrg, openingBalances]);

  // Filter transactions by Billing Org and UI secondary filters


  // Ledger Columns for reusable DataTable
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
        minWidth: 200,
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
        width: 150,
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
          <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
            {row.billingOrg}
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
            className={`font-bold whitespace-nowrap text-xs ${row.balance < 0
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

  const processedLedgerRows = useMemo(() => {
    // 1. Filter by Billing Org
    let rows = rawTransactions.filter((r) => {
      if (selectedOrg === "Consolidated") return true;
      return r.billingOrg.toLowerCase() === selectedOrg.toLowerCase();
    });

    // 2. Filter by Primary Filter (All vs Invoices vs Payments)
    if (primaryFilter === "invoices") {
      rows = rows.filter((r) => r.type === "invoice" || r.type === "proforma");
    } else if (primaryFilter === "payments") {
      rows = rows.filter((r) => r.type === "receipt");
    }

    // 3. Filter by Type Filter (All vs Invoice vs Proforma)
    if (typeFilter === "invoice") {
      rows = rows.filter((r) => r.type !== "proforma");
    } else if (typeFilter === "proforma") {
      rows = rows.filter((r) => r.type === "proforma");
    }

    // 4. Sort chronologically
    rows.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

    // 5. Calculate sequential running balance
    let running = currentOpeningBalance;
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
  }, [rawTransactions, selectedOrg, primaryFilter, typeFilter, currentOpeningBalance]);

  // Summary Totals
  const summaryStats = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    processedLedgerRows.forEach((r) => {
      if (r.debit) totalDebit += r.debit;
      if (r.credit) totalCredit += r.credit;
    });
    const closingBalance = currentOpeningBalance + totalDebit - totalCredit;
    return {
      openingBalance: currentOpeningBalance,
      totalDebit,
      totalCredit,
      closingBalance,
    };
  }, [processedLedgerRows, currentOpeningBalance]);

  // Paginated ledger rows
  const paginatedLedgerRows = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerRowsPerPage;
    return processedLedgerRows.slice(start, start + ledgerRowsPerPage);
  }, [processedLedgerRows, ledgerPage, ledgerRowsPerPage]);


  // Save Opening Balance Handler
  const handleSaveOpeningBalance = () => {
    const val = parseFloat(obAmountInput) || 0;
    const updated = {
      ...openingBalances,
      [obOrgInput]: val,
    };
    setOpeningBalances(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(`client_ledger_ob_${client.id}`, JSON.stringify(updated));
    }
    setIsOpeningBalanceModalOpen(false);
    if (showToast) {
      showToast(`Opening balance of ₹${val} set for ${obOrgInput}`);
    }
  };

  // Record Payment Received Handler
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) {
      if (showToast) showToast("Please enter a valid payment amount.");
      return;
    }

    const selectedBank = bankAccounts.find((b) => b.id === payBankId) || bankAccounts[0];
    const generatedRef =
      payRefNo.trim() || `RCPT/26-27/${Math.floor(10000 + Math.random() * 90000)}`;

    addReceipt(
      {
        billingOrg: payBillingOrg,
        clientId: client.id,
        businessName: client.name,
        legalName: client.legalName || client.name,
        group: client.group || "Client",
        amount: amountNum,
        paymentDate: payDate,
        method: payMethod,
        bankAccountId: selectedBank?.id || "bank-1",
        bankName: selectedBank?.bankName || "HDFC Bank Ltd",
        referenceNumber: generatedRef,
        notes: payParticulars || "Payment received",
        invoiceId: payAllocInvoiceId || undefined,
        isAdvance: !payAllocInvoiceId,
      },
      payAllocInvoiceId ? [{ id: payAllocInvoiceId, amount: amountNum, type: "invoice" }] : []
    );

    setIsRecordPaymentModalOpen(false);
    setPayAmount("");
    setPayRefNo("");
    if (showToast) {
      showToast(`Payment of ₹${amountNum.toLocaleString("en-IN")} recorded successfully.`);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["Date", "Particulars", "Reference", "Billing Org", "Debit (INR)", "Credit (INR)", "Balance (INR)"];
    const rows = processedLedgerRows.map((r) => [
      `"${r.date}"`,
      `"${r.particulars}"`,
      `"${r.reference}"`,
      `"${r.billingOrg}"`,
      r.debit ? `"${r.debit}"` : '""',
      r.credit ? `"${r.credit}"` : '""',
      `"${r.balance}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [`Client: ${client.name} - Ledger (${selectedOrg})`, `Opening Balance: ${currentOpeningBalance}`, headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_${client.name.replace(/\s+/g, "_")}_${selectedOrg}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP ROW: Billing Org Pills & Action Buttons (Exact UI from screenshot) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Org Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {availableOrgs.map((org) => {
            const isSelected = selectedOrg.toLowerCase() === org.toLowerCase();
            return (
              <button
                key={org}
                type="button"
                onClick={() => setSelectedOrg(org)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${isSelected
                  ? "bg-[#31719B] text-white shadow-sm ring-1 ring-[#31719B]"
                  : "bg-white dark:bg-[#1e293b] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
              >
                {org}
              </button>
            );
          })}
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

          {/* Add Opening Balance Button (Exact purple from screenshot) */}
          <button
            type="button"
            onClick={() => {
              setObOrgInput(selectedOrg === "Consolidated" ? "CA Associates Demo" : selectedOrg);
              setObAmountInput(String(currentOpeningBalance || 909));
              setIsOpeningBalanceModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#31719B] hover:bg-[#285d80] text-white shadow-sm transition-colors cursor-pointer"
          >
            <span>Add Opening Balance</span>
          </button>
        </div>
      </div>

      {/* 2. SECOND ROW: Secondary Filters & Date / Export Controls (Exact UI from screenshot) */}
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
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${primaryFilter === opt
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
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${typeFilter === opt
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
              className={`text-sm font-bold mt-0.5 ${summaryStats.closingBalance < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
                }`}
            >
              {formatCurrency(summaryStats.closingBalance)}{" "}
              <span className="text-[10px] font-normal">
                {summaryStats.closingBalance < 0 ? "(Advance Credit)" : "(Pending Receivable)"}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* 3. OPENING BALANCE CARD (Exact look from screenshot: soft mint background) */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#eaf5ec] dark:bg-emerald-950/30 border border-[#cbe8cf] dark:border-emerald-900/40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-[#c2e4c7] dark:bg-emerald-900/60 flex items-center justify-center text-emerald-800 dark:text-emerald-300">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              Opening Balance
            </h4>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">01 Apr 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(currentOpeningBalance)}
          </span>
          <button
            type="button"
            onClick={() => {
              setObOrgInput(selectedOrg === "Consolidated" ? "CA Associates Demo" : selectedOrg);
              setObAmountInput(String(currentOpeningBalance));
              setIsOpeningBalanceModalOpen(true);
            }}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
            title="Edit Opening Balance"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. MAIN LEDGER TABLE (Reusable DataTable with resizable columns, three-dot options, no border, no rounded corners) */}
      <DataTable<LedgerRow>
        columns={ledgerColumns}
        data={paginatedLedgerRows}
        actions={getLedgerActions}
        emptyMessage="No transactions found for the selected organization and period."
        getRowId={(row: LedgerRow) => row.id}
        pagination={{
          currentPage: ledgerPage,
          totalItems: processedLedgerRows.length,
          pageSize: ledgerRowsPerPage,
          onPageChange: (p) => setLedgerPage(p),
          rowsPerPageOptions: [10, 15, 25, 50],
          onRowsPerPageChange: (newSize) => {
            setLedgerRowsPerPage(newSize);
            setLedgerPage(1);
          },
        }}
      />

      {/* MODAL: ADD / EDIT OPENING BALANCE */}
      {isOpeningBalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Set Opening Balance
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
                  Billing Organization
                </label>
                <select
                  value={obOrgInput}
                  onChange={(e) => setObOrgInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-[#31719B]"
                >
                  {availableOrgs.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>

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
                  placeholder="e.g. 909"
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

      {/* MODAL: RECORD PAYMENT RECEIVED (Matching Image 2 & 3) */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        targetInvoice={clientMatchingInvoices.taxInvoices[0]}
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
