"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Check,
  AlertCircle,
  FileText,
  Percent,
  Ban,
  RotateCcw,
  Edit3,
  DollarSign,
  ChevronDown,
} from "lucide-react";
import { PaymentMethod, ReceiptRecord, InvoiceRecord, ServiceItem } from "./types";
import { FIRM_DETAILS, MOCK_CLIENTS_LIST } from "./mockData";
import { useInvoice } from "./InvoiceContext";
import CustomSelect from "./selectOption/CustomeSelectOption";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "create" | "edit" | "view";
  initialData?: ReceiptRecord | null;
  targetInvoice?: InvoiceRecord | null;
  onPaymentSaved?: (receipt: ReceiptRecord) => void;
}

// Helper to ensure HTML date input format YYYY-MM-DD
const toInputDate = (dateStr?: string): string => {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed.includes("/")) {
    const [d, m, y] = trimmed.split("/");
    if (d && m && y) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) return trimmed; // YYYY-MM-DD
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  const dt = new Date(trimmed);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
};

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  mode = "create",
  initialData,
  targetInvoice,
  onPaymentSaved,
}) => {
  const { invoices, bankAccounts, addReceipt, updateReceipt, addInvoice, setActiveTab } = useInvoice();

  const isView = mode === "view" && Boolean(initialData);
  const isEdit = mode === "edit";

  // Modal Top Tabs: 'New Payment' | 'Payment History'
  const [modalTab, setModalTab] = useState<"new" | "history">("new");

  // Selection state for which invoice to record payment against (or standalone payment)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    targetInvoice?.id || initialData?.invoiceId || ""
  );
  const [standaloneClientName, setStandaloneClientName] = useState<string>("");

  // Matched / Target Invoice
  const activeInvoice: InvoiceRecord | undefined = useMemo(() => {
    if (targetInvoice) return targetInvoice;
    if (selectedInvoiceId && selectedInvoiceId !== "standalone") {
      const found = invoices.find((i) => i.id === selectedInvoiceId || i.number === selectedInvoiceId);
      if (found) return found;
    }
    if (initialData?.invoiceId) {
      const found = invoices.find((i) => i.id === initialData.invoiceId);
      if (found) return found;
    }
    if (initialData?.invoiceNumber) {
      const found = invoices.find((i) => i.number === initialData.invoiceNumber);
      if (found) return found;
    }
    // Fallback: search by client
    if (initialData?.clientId) {
      const found = invoices.find((i) => i.clientId === initialData.clientId);
      if (found) return found;
    }
    // If initialData exists, synthesize linked invoice so all fields display accurately
    if (initialData) {
      return {
        id: initialData.invoiceId || "inv-linked",
        number: initialData.invoiceNumber || "N/A",
        type: "invoice" as const,
        date: initialData.paymentDate || new Date().toISOString().split("T")[0],
        dueDate: "N/A",
        billingOrg: initialData.billingOrg || FIRM_DETAILS.name || "Krishna Associates",
        billingAddress: "",
        clientId: initialData.clientId || "",
        clientBusinessName: initialData.businessName || initialData.legalName || "N/A",
        clientLegalName: initialData.legalName || initialData.businessName || "N/A",
        clientGroup: initialData.group || "N/A",
        clientGstin: "",
        clientAddress: "",
        clientPan: "",
        services: [
          {
            id: "srv-1",
            serviceName: initialData.notes || "Professional Services",
            description: "",
            compliancePeriod: "N/A",
            frequency: "Monthly",
            periodLabel: "N/A",
            quantity: 1,
            price: initialData.amountForService?.totalServiceFee|| initialData.invoiceAmount || initialData.amount || 0,
            amount: initialData.amountForService?.totalServiceFee||initialData.invoiceAmount || initialData.amount || 0,
            total: initialData.amountForService?.totalServiceFee||initialData.invoiceAmount || initialData.amount || 0,
          },
        ],
        subTotal:initialData.invoiceAmount || initialData.amount || 0,
        totalPayable: initialData.invoiceAmount || initialData.amount || 0,
        tdsExcludedAmount: 0,
        currency: "INR",
        status: "Pending" as const,
        paidAmount: 0,
        balanceAmount: initialData.invoiceAmount || initialData.amount || 0,
        financialYear: initialData.financialYear || "N/A",
        createdAt: new Date().toISOString(),
      };
    }
    if (selectedInvoiceId === "standalone") return undefined;
    return invoices.find((i) => (i.balanceAmount || 0) > 0) || invoices[0];
  }, [targetInvoice, selectedInvoiceId, initialData, invoices]);

  // Client Details & Standalone Mode
  const isStandalone = selectedInvoiceId === "standalone" || (!activeInvoice && !targetInvoice && !initialData);
  const invoiceTotal = activeInvoice?.totalPayable ?? (initialData?.invoiceAmount ?? initialData?.amount ?? 0);
  const alreadyPaid = activeInvoice?.paidAmount || 0;
  const balanceDue = isStandalone
    ? 0
    : Math.max(0, (activeInvoice?.balanceAmount !== undefined ? activeInvoice.balanceAmount : (invoiceTotal - alreadyPaid)));
  const clientName =
    activeInvoice?.clientBusinessName ||
    standaloneClientName ||
    initialData?.businessName ||
    initialData?.legalName ||
    (isStandalone ? "Advance / Direct Client" : "N/A");
  const invoiceNumber = isStandalone ? "Advance Payment" : (activeInvoice?.number || initialData?.invoiceNumber || "N/A");

  // Deduction Toggles & Amounts
  const [hasTds, setHasTds] = useState(false);
  const [tdsSection, setTdsSection] = useState("194J");
  const [tdsAmount, setTdsAmount] = useState<number>(0);

  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const [hasBadDebt, setHasBadDebt] = useState(false);
  const [badDebtAmount, setBadDebtAmount] = useState<number>(0);

  // Payment Amount Mode: 'remaining' | 'custom'
  const [amountMode, setAmountMode] = useState<"remaining" | "custom">("remaining");
  const [customAmount, setCustomAmount] = useState<number>(1000);
  const [amountForService, setAmountForService] = useState<ServiceItem>(
  targetInvoice?.services && targetInvoice.services.length > 0 
    ? targetInvoice.services[0] 
    : {
        id: "",
        serviceName: "",
        description: "",
        compliancePeriod: "",
        frequency: "Monthly", // or your default frequency
        periodLabel: "",
        quantity: 1,
        price: 0,
        amount: 0,
        governmentFee: 0,
        professionalFee: 0,
        totalServiceFee: 0,
        tax: "18%",
        total: 0,
        isReimbursement: false,
      }
);


  // Form Fields
  const [paymentDate, setPaymentDate] = useState<string>("2026-07-27");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Bank Transfer");
  const [bankAccountId, setBankAccountId] = useState<string>(
    bankAccounts[0]?.id || FIRM_DETAILS.name || "Krishna Associates"
  );
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [emailConfirmation, setEmailConfirmation] = useState<boolean>(false);

  // Synchronize on modal open with complete auto-fill
  useEffect(() => {
    if (isOpen) {
      setModalTab("new");
      const defaultInv = targetInvoice || invoices.find((i) => (i.balanceAmount || 0) > 0) || invoices[0];
      if (targetInvoice?.id) {
        setSelectedInvoiceId(targetInvoice.id);
      } else if (!selectedInvoiceId) {
        setSelectedInvoiceId(defaultInv?.id || "standalone");
      }

      if (initialData) {
        setPaymentMethod(initialData.method || "Cash");
        setReferenceNumber(
          initialData.referenceNumber || initialData.receiptNo || `RCPT/26-27/${Math.floor(10000 + Math.random() * 90000)}`
        );
        setPaymentNote(initialData.notes || "Payment received");
        setPaymentDate(toInputDate(initialData.paymentDate || new Date().toISOString().split("T")[0]));
        setBankAccountId(
          initialData.bankAccountId ||
          initialData.bankName ||
          bankAccounts[0]?.id ||
          FIRM_DETAILS.name ||
          "Krishna Associates"
        );
        setAmountMode("custom");
        setCustomAmount(initialData.amount || 1000);
      } else {
        const due = defaultInv ? (defaultInv.balanceAmount ?? defaultInv.totalPayable ?? 0) : 0;
        if (due > 0) {
          setAmountMode("remaining");
          setCustomAmount(due);
        } else {
          setAmountMode("custom");
          setCustomAmount(1000);
        }
        setPaymentMethod("Bank Transfer");
        setReferenceNumber("");
        setPaymentNote("");
        setPaymentDate(toInputDate(new Date().toISOString().split("T")[0]));
        setHasTds(false);
        setHasDiscount(false);
        setHasBadDebt(false);
      }
    }
  }, [isOpen, initialData, targetInvoice, invoices, bankAccounts]);

  // Compute total deductions
  const totalDeductions = useMemo(() => {
    let sum = 0;
    if (hasTds) sum += Number(tdsAmount) || 0;
    if (hasDiscount) sum += Number(discountAmount) || 0;
    if (hasBadDebt) sum += Number(badDebtAmount) || 0;
    return sum;
  }, [hasTds, tdsAmount, hasDiscount, discountAmount, hasBadDebt, badDebtAmount]);

  // Remaining payable after deductions
  const remainingAfterDeductions = Math.max(0, balanceDue - totalDeductions);

  // Current amount being paid now
  const payingNow = amountMode === "remaining" && balanceDue > 0 ? remainingAfterDeductions : customAmount;

  // Balance after this payment
  const balanceAfterThisPayment = Math.max(0, balanceDue - payingNow - totalDeductions);

  if (!isOpen) return null;

const calculateServiceWithGST = (
  service?: ServiceItem
): ServiceItem | undefined => {
  if (!service) return undefined;

  const gstRate = Number.parseFloat(service.tax || "0") || 0;

  const total =
    service.totalServiceFee ?? service.amount;

  const governmentFee = service.governmentFee ?? 0;

  const gstAmount = (total * gstRate) / 100;

  const totalServiceFee = total + gstAmount;

  return {
    ...service,
    governmentFee,
    totalServiceFee,
    total: totalServiceFee,
  };
};


// Calculate without changing React state
const calculatedService = calculateServiceWithGST(amountForService);


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isView && initialData) {
      onClose();
      return;
    }

    if (payingNow <= 0 && totalDeductions <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const selectedBank =
      bankAccounts.find((b) => b.id === bankAccountId) || bankAccounts[0];
    const generatedRef =
      referenceNumber.trim() ||
      `RCPT/26-27/${Math.floor(10000 + Math.random() * 90000)}`;

    if (isEdit && initialData) {
      updateReceipt(initialData.id, {
        amount: payingNow,
        paymentDate,
        amountForService:calculatedService,
        method: paymentMethod,
        referenceNumber: generatedRef,
        notes: paymentNote || undefined,
        bankAccountId: selectedBank?.id || "",
        bankName: selectedBank?.bankName || "HDFC Bank Ltd",
      });
    } else {
      const isAdv = isStandalone || payingNow > (balanceDue > 0 ? balanceDue : 0);
      let linkedInvId = !isStandalone ? activeInvoice?.id : undefined;
      let linkedInvNumber = !isStandalone && invoiceNumber !== "N/A" ? invoiceNumber : undefined;

      const finalBillingOrg =
        activeInvoice?.billingOrg || initialData?.billingOrg || FIRM_DETAILS.name || "Krishna Associates";
      const finalClientId =
        activeInvoice?.clientId || initialData?.clientId || "client-1";
      const finalClientName =
        clientName && clientName !== "N/A" ? clientName : standaloneClientName.trim() || "Valued Client";

      const created = addReceipt(
  {
    billingOrg: finalBillingOrg,
    clientId: finalClientId,
    businessName: finalClientName,
    legalName: finalClientName,
    group: activeInvoice?.clientGroup || "Customer",
    amount: payingNow,
    paymentDate,
    amountForService: calculatedService,
    method: paymentMethod,
    bankAccountId: selectedBank?.id || "",
    bankName:
      selectedBank?.accountBusinessName ||
      selectedBank?.bankName ||
      "HDFC Bank Ltd",
    referenceNumber: generatedRef,
    notes: paymentNote || (hasTds ? `TDS: ₹${tdsAmount}` : undefined),
    invoiceId: linkedInvId,
    invoiceNumber: linkedInvNumber,
    isAdvance: isAdv,
  },
  linkedInvId
    ? [{ id: linkedInvId, amount: payingNow, type: "invoice" }]
    : []
);
      if (onPaymentSaved) {
        onPaymentSaved(created);
      } else {
        setActiveTab("receipts");
        onClose();
      }
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-4xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* MODAL TOP HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex-1 mr-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Recording Payment
            </p>
            {!targetInvoice && !initialData && invoices.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedInvoiceId(nextId);
                    if (nextId === "standalone") {
                      setAmountMode("custom");
                      setCustomAmount(1000);
                    } else {
                      const inv = invoices.find((i) => i.id === nextId);
                      const due = inv ? (inv.balanceAmount ?? inv.totalPayable ?? 0) : 0;
                      if (due > 0) {
                        setAmountMode("remaining");
                        setCustomAmount(due);
                      } else {
                        setAmountMode("custom");
                        setCustomAmount(1000);
                      }
                    }
                  }}
                  className="text-xs font-bold rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2.5 py-1.5 focus:ring-1 focus:ring-[#31719B] max-w-xs truncate"
                >
                  <option value="standalone">⭐ Advance / Standalone Payment (No Invoice)</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} - {inv.clientBusinessName || inv.clientLegalName || "Client"} (Due: ₹{(inv.balanceAmount ?? inv.totalPayable ?? 0).toLocaleString()})
                    </option>
                  ))}
                </select>
                {selectedInvoiceId === "standalone" && (
                  <input
                    type="text"
                    placeholder="Enter Client Name"
                    value={standaloneClientName}
                    onChange={(e) => setStandaloneClientName(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                )}
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {invoiceNumber}
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {clientName}
                  </span>{" "}
                  • <span className="text-gray-400">Customer</span>
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs: New Payment | Payment History */}
            <div className="inline-flex rounded-sm border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800/60">
              <button
                type="button"
                onClick={() => setModalTab("new")}
                className={`px-3 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer ${modalTab === "new"
                  ? "bg-[#31719B] text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                New Payment
              </button>
              <button
                type="button"
                onClick={() => setModalTab("history")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer ${modalTab === "history"
                  ? "bg-[#31719B] text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <span>Payment History</span>
                <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] flex items-center justify-center font-bold">
                  0
                </span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        {modalTab === "history" ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No previous payment history found for this invoice.
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
              {/* LEFT COLUMN: Donut Chart & Breakdown Summary (cols 4) */}
              <div className="md:col-span-4 p-6 flex flex-col items-center  space-y-6 bg-gray-50/40 dark:bg-gray-800/20">
                {/* Donut Chart with Red Ring (Matching Image 2 & 3) */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="10"
                        className="dark:stroke-gray-700"
                      />
                      {/* Active Red ring for pending balance */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#ef4444"
                        strokeWidth="10"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 * 0.15}
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Inside donut text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-medium text-gray-500">
                        Invoice Amount
                      </span>
                      <span className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                        ₹ {invoiceTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Pending Badge */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-xs font-semibold text-rose-500">Pending</span>
                  </div>
                  <div className="mt-1">
                    <span className="px-3 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100/70 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                      Pending
                    </span>
                  </div>
                </div>

                {/* Amount Breakdown Table (Matching Image 2 & 3) */}
                <div className="w-full space-y-2 text-xs pt-4 border-t border-gray-200/80 dark:border-gray-700/80">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Invoice Total</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₹ {invoiceTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Paying now</span>
                    <span>(-) ₹ {payingNow.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Balance Due</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₹ {balanceDue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span>Balance After This Payment</span>
                    <span>₹ {balanceAfterThisPayment.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Deductions, Payment Amount & Form Inputs (cols 8) */}
              <div className="md:col-span-8 p-6 space-y-5 text-xs">
                {/* 1. DEDUCTIONS SECTION (Matching Image 2 & 3) */}
                <div className="space-y-2.5">
                  {/* Tax Deducted at Source (TDS) */}
                  <div className="rounded-sm border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-[#1e293b]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-sm bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            Tax Deducted at Source
                          </h4>
                          <p className="text-[11px] text-gray-400">
                            TDS withheld by the client
                          </p>
                        </div>
                      </div>
                      {/* Toggle switch */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !hasTds;
                          setHasTds(next);
                          if (next && tdsAmount === 0) setTdsAmount(10);
                        }}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${hasTds ? "bg-[#31719B]" : "bg-gray-200 dark:bg-gray-700"
                          }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${hasTds ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    {hasTds && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div>
                          <label className="block text-gray-500 mb-1 text-[11px]">
                            TDS Section
                          </label>
                          <select
                            value={tdsSection}
                            onChange={(e) => setTdsSection(e.target.value)}
                            className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-100"
                          >
                            <option value="194J">194J - Professional (10%)</option>
                            <option value="194C">194C - Contractor (2%)</option>
                            <option value="194H">194H - Commission (5%)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1 text-[11px]">
                            TDS Amount *
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={tdsAmount}
                            onChange={(e) => setTdsAmount(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-100 font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Discount */}
                  <div className="rounded-sm border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-[#1e293b]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-sm bg-orange-50 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
                          <Percent className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            Discount
                          </h4>
                          <p className="text-[11px] text-gray-400">
                            Waive a portion of the balance (settlement-time only)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !hasDiscount;
                          setHasDiscount(next);
                          if (next && discountAmount === 0) setDiscountAmount(5);
                        }}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${hasDiscount ? "bg-[#31719B]" : "bg-gray-200 dark:bg-gray-700"
                          }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${hasDiscount ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    {hasDiscount && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <label className="block text-gray-500 mb-1 text-[11px]">
                          Discount Amount *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-100 font-semibold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bad Debt (Matching Image 2) */}
                  <div className="rounded-sm border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-[#1e293b]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                          <Ban className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            Bad Debt
                          </h4>
                          <p className="text-[11px] text-gray-400">
                            Write off as uncollectable (internal — not shown on the client receipt)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !hasBadDebt;
                          setHasBadDebt(next);
                          if (next && badDebtAmount === 0) setBadDebtAmount(0);
                        }}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${hasBadDebt ? "bg-[#31719B]" : "bg-gray-200 dark:bg-gray-700"
                          }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${hasBadDebt ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    {hasBadDebt && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <label className="block text-gray-500 mb-1 text-[11px]">
                          Bad Debt Amount *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={badDebtAmount}
                          onChange={(e) => setBadDebtAmount(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-100 font-semibold"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. PAYMENT AMOUNT SELECTION CARDS (Matching Image 2 & 3) */}
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Payment Amount
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Remaining Amount Card */}
                    <button
                      type="button"
                      onClick={() => setAmountMode("remaining")}
                      className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${amountMode === "remaining"
                        ? "border-[#31719B] bg-[#eaf2f8] dark:bg-[#31719B]/20 ring-1 ring-[#31719B]"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-center gap-1.5 text-[#31719B] font-semibold text-xs mb-1">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Remaining Amount</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ₹ {remainingAfterDeductions.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">After deductions</p>
                    </button>

                    {/* Custom Amount Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setAmountMode("custom");
                        if (customAmount === 0) setCustomAmount(remainingAfterDeductions);
                      }}
                      className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${amountMode === "custom"
                        ? "border-[#31719B] bg-[#eaf2f8] dark:bg-[#31719B]/20 ring-1 ring-[#31719B]"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-center gap-1.5 text-[#31719B] font-semibold text-xs mb-1">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Custom Amount</span>
                      </div>
                      <p className="text-[11px] text-gray-400">Enter any amount</p>
                    </button>
                  </div>

                  {amountMode === "custom" && (
                    <div className="mt-2.5">
                      <label className="block text-gray-500 text-[11px] mb-1">
                        Enter Custom Paying Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={customAmount}
                        onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-hidden focus:ring-2 focus:ring-[#31719B]"
                      />
                      <CustomSelect selectedServiceId={amountForService.id} items={targetInvoice?.services || []}  onSelect={(service)=>setAmountForService(service)} />
                    </div>
                  )}
                </div>

                {/* 3. PAYMENT DETAILS FORM INPUTS (Matching Image 2 & 3) */}
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Payment Date */}
                    <div>
                      <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                        Payment Date *
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-[#6366F1]"
                        />
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div>
                      <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                        Payment Mode *
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-[#6366F1]"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                        <option value="Cheque">Cheque</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Payment Received Account */}
                    <div>
                      <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                        Payment Received Account *
                      </label>
                      <select
                        value={bankAccountId}
                        onChange={(e) => setBankAccountId(e.target.value)}
                        className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-[#6366F1]"
                      >
                        <option value="CA Books Technologies Private Limited">
                          CA Books Technologies Private Limited
                        </option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.accountBusinessName || b.bankName} - {b.accountNumber.slice(-4)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reference Number */}
                    <div>
                      <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Reference"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-[#6366F1]"
                      />
                    </div>
                  </div>

                  {/* Payment Note (optional) */}
                  <div>
                    <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                      Payment Note (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Payment Note"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-[#31719B]"
                    />
                  </div>

                  {/* Email Confirmation Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white">
                        Email Confirmation
                      </h5>
                      <p className="text-[11px] text-gray-400">
                        Send a payment acknowledgement to the client
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailConfirmation(!emailConfirmation)}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${emailConfirmation ? "bg-[#31719B]" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${emailConfirmation ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER BUTTONS */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50/80 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-sm border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-sm bg-[#31719B] hover:bg-[#3D88BF] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
