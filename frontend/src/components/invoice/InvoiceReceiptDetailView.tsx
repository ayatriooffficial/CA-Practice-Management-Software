"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Download,
  Plus,
  MoreVertical,
  X,
  Eye,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Check,
  Building2,
  ChevronDown,
  Printer,
  QrCode,
  FileCheck,
  PhoneCall,
  Layers,
  Loader2,
} from "lucide-react";
import { InvoiceRecord, ReceiptRecord } from "./types";
import { useInvoice } from "./InvoiceContext";
import { organizationApi, OrganizationDetails } from "@/services/organizationApi";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedClient, fetchClientByIdSuccess } from "@/store/features/clients/clientSlice";
import { clientApi } from "@/services/clientApi";

interface InvoiceReceiptDetailViewProps {
  receipt?: ReceiptRecord | null;
  invoice?: InvoiceRecord | null;
  onBack: () => void;
  onRecordPayment: (targetInvoice?: InvoiceRecord, targetReceipt?: ReceiptRecord) => void;
  onViewClientLedger?: (clientId: string) => void;
}

// Convert numbers to Indian Rupees words
const numberToWords = (num: number): string => {
  if (!num || isNaN(num) || num <= 0) return "N/A";
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const inWords = (n: number): string => {
    let str = "";
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + " Crore ";
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + " Lakh ";
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + " Thousand ";
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + " Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (str !== "") str += "and ";
      if (n < 20) str += a[n] + " ";
      else {
        str += b[Math.floor(n / 10)] + " ";
        if (n % 10 > 0) str += a[n % 10] + " ";
      }
    }
    return str.trim();
  };

  const integerPart = Math.floor(num);
  const words = inWords(integerPart);
  return `${words} Rupees Only`;
};

export const InvoiceReceiptDetailView: React.FC<InvoiceReceiptDetailViewProps> = ({
  receipt,
  invoice: propInvoice,
  onBack,
  onRecordPayment,
  onViewClientLedger,
}) => {
  const { invoices, bankAccounts, convertProformaToInvoice } = useInvoice();
  const router = useRouter();

  const [activeTemplate, setActiveTemplate] = useState<string>("Standard");
  const [activityFilter, setActivityFilter] = useState<string>("All");
  const [isFollowUpDone, setIsFollowUpDone] = useState(false);
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);

  // Proforma to Invoice conversion state
  const [convertedRecord, setConvertedRecord] = useState<InvoiceRecord | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Fetch real organization details from backend
  useEffect(() => {
    organizationApi
      .getOrganization()
      .then((res) => {
        if (res.data) setOrgDetails(res.data);
      })
      .catch(() => { });
  }, []);

  // Find linked invoice if a receipt was passed
  const linkedInvoice: InvoiceRecord | undefined = useMemo(() => {
    if (propInvoice) return propInvoice;
    if (receipt?.invoiceId) {
      const found = invoices.find((i) => i.id === receipt.invoiceId);
      if (found) return found;
    }
    if (receipt?.invoiceNumber) {
      const found = invoices.find((i) => i.number === receipt.invoiceNumber);
      if (found) return found;
    }
    if (receipt?.clientId) {
      const found = invoices.find((i) => i.clientId === receipt.clientId);
      if (found) return found;
    }
    return undefined;
  }, [propInvoice, receipt, invoices]);

  // Current active invoice record (could be newly converted)
  const activeInvoice: InvoiceRecord | undefined = convertedRecord || linkedInvoice;

  // Determine if viewing a Proforma or a Receipt
  const isReceiptView = Boolean(receipt && !propInvoice && !convertedRecord);
  const isProforma = Boolean(
    !isReceiptView &&
    ((activeInvoice && activeInvoice.type === "proforma") ||
      (propInvoice && propInvoice.type === "proforma" && !convertedRecord))
  );

  // Derive real display data - strictly real values or "N/A"
  const displayData = useMemo(() => {
    const invNo =
      activeInvoice?.number ||
      receipt?.invoiceNumber ||
      (receipt?.referenceNumber ? `REF-${receipt.referenceNumber}` : "N/A");

    const rcptNo = receipt?.receiptNo || receipt?.referenceNumber || "N/A";

    const clientName =
      activeInvoice?.clientBusinessName ||
      activeInvoice?.clientLegalName ||
      receipt?.legalName ||
      receipt?.businessName ||
      "N/A";

    const billingOrg =
      activeInvoice?.billingOrg ||
      receipt?.billingOrg ||
      orgDetails?.name ||
      "N/A";

    // For receipts, show the specific receipt amount
    const amount = isReceiptView
      ? receipt?.amount ?? 0
      : activeInvoice?.totalPayable ?? receipt?.amount ?? 0;

    const paid = isReceiptView
      ? receipt?.amount ?? 0
      : receipt?.amount ?? activeInvoice?.paidAmount ?? 0;

    const balance = isReceiptView ? 0 : Math.max(0, amount - paid);

    const date = isReceiptView
      ? receipt?.paymentDate || activeInvoice?.date || "N/A"
      : activeInvoice?.date || receipt?.paymentDate || "N/A";

    const dueDate = isReceiptView ? "N/A" : activeInvoice?.dueDate || "N/A";

    const status = isReceiptView
      ? "Paid"
      : activeInvoice?.status || (receipt ? "Paid" : "N/A");

    return {
      invNo,
      rcptNo,
      clientName,
      billingOrg,
      amount,
      paid,
      balance,
      clientId: activeInvoice?.clientId || receipt?.clientId || "",
      date,
      dueDate,
      filingPeriod: activeInvoice?.services?.[0]?.compliancePeriod || "N/A",
      status,
      clientAddress: activeInvoice?.clientAddress || "N/A",
      clientGstin: activeInvoice?.clientGstin || "N/A",
      clientPan: activeInvoice?.clientPan || "N/A",
      placeOfSupply: activeInvoice?.placeOfSupply || "N/A",
      notes: activeInvoice?.notes || receipt?.notes || "",
    };
  }, [activeInvoice, receipt, orgDetails, isReceiptView]);

  // Match actual bank account from system or receipt only (no arbitrary fallback)
  const bank = useMemo(() => {
    if (receipt?.bankAccountId) {
      const found = bankAccounts.find((b) => b.id === receipt.bankAccountId);
      if (found) return found;
    }
    if (activeInvoice?.bankAccountId) {
      const found = bankAccounts.find((b) => b.id === activeInvoice.bankAccountId);
      if (found) return found;
    }
    return null;
  }, [receipt, activeInvoice, bankAccounts]);

  const dispatch = useAppDispatch();
  const reduxClients = useAppSelector((state) => state.clients.items);
  const [isOpeningLedger, setIsOpeningLedger] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleOpenClientLedger = async () => {
    const rawClientId = displayData.clientId || activeInvoice?.clientId || receipt?.clientId;
    const clientName =
      displayData.clientName && displayData.clientName !== "N/A"
        ? displayData.clientName
        : "";
    const clientPan =
      displayData.clientPan && displayData.clientPan !== "N/A"
        ? displayData.clientPan
        : "";

    setIsOpeningLedger(true);
    try {
      // 1. Check if client is already available in Redux store
      let matchedClient = reduxClients.find((c) => {
        const cId = c.id || (c as any)._id;
        if (rawClientId && cId === rawClientId) return true;
        if (clientName) {
          const lowerName = clientName.toLowerCase().trim();
          if (c.name && c.name.toLowerCase().trim() === lowerName) return true;
          if (c.legalName && c.legalName.toLowerCase().trim() === lowerName) return true;
          if ((c as any).businessName && (c as any).businessName.toLowerCase().trim() === lowerName) return true;
        }
        if (clientPan && c.pan && c.pan.toLowerCase().trim() === clientPan.toLowerCase().trim()) return true;
        return false;
      });

      // 2. If not found in store, fetch from backend API
      if (!matchedClient) {
        if (rawClientId) {
          try {
            const res = await clientApi.getClientById(rawClientId);
            if (res && res.data) {
              matchedClient = res.data;
            }
          } catch (e) {
            console.warn("Could not find client by ID:", rawClientId, e);
          }
        }

        // If still not found, search by name
        if (!matchedClient && clientName) {
          try {
            const res = await clientApi.getClients({ search: clientName, limit: 10 });
            if (res && res.data && res.data.length > 0) {
              matchedClient =
                res.data.find((c) => {
                  const lower = clientName.toLowerCase().trim();
                  return (
                    c.name?.toLowerCase().trim() === lower ||
                    c.legalName?.toLowerCase().trim() === lower ||
                    (c as any).businessName?.toLowerCase().trim() === lower
                  );
                }) || res.data[0];
            }
          } catch (e) {
            console.warn("Could not find client by name:", clientName, e);
          }
        }
      }

      // 3. If target client found or fetched
      if (matchedClient) {
        dispatch(fetchClientByIdSuccess(matchedClient));
        dispatch(setSelectedClient(matchedClient));
        const finalId = matchedClient.id || (matchedClient as any)._id;
        if (onViewClientLedger) {
          onViewClientLedger(finalId);
        } else {
          router.push(`/client?clientId=${finalId}&tab=Ledger`);
        }
      } else {
        // Fallback: If no client object found, still navigate with ID or default to /client
        if (rawClientId) {
          router.push(`/client?clientId=${rawClientId}&tab=Ledger`);
        } else {
          router.push(`/client`);
        }
      }
    } catch (err) {
      console.error("Error navigating to client ledger:", err);
      router.push(`/client`);
    } finally {
      setIsOpeningLedger(false);
    }
  };

  // Convert Proforma to Invoice
  const handleConfirmConvert = async () => {
    if (!activeInvoice?.id) return;
    setIsConverting(true);
    try {
      const converted = await convertProformaToInvoice(activeInvoice.id);
      if (converted) {
        setConvertedRecord(converted);
      }
      setShowConvertModal(false);
    } finally {
      setIsConverting(false);
    }
  };

  // Sender Org Details derived strictly from database
  const senderDetails = useMemo(() => {
    const addressStr =
      orgDetails?.address ||
      (orgDetails?.addressDetails
        ? [
          orgDetails.addressDetails.addressLine1,
          orgDetails.addressDetails.addressLine2,
          orgDetails.addressDetails.city,
          orgDetails.addressDetails.state,
          orgDetails.addressDetails.pincode,
        ]
          .filter(Boolean)
          .join(", ")
        : "");

    const name = displayData.billingOrg !== "N/A" ? displayData.billingOrg : (orgDetails?.name || "");

    return {
      name: name || "N/A",
      initials: name
        ? name
          .split(" ")
          .map((w) => w[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase()
        : "",
      address: addressStr || "",
      email: orgDetails?.email || "",
      mobile: orgDetails?.mobile || "",
      website: orgDetails?.website || "",
      gstin: orgDetails?.gstin || "",
      pan: orgDetails?.pan || "",
    };
  }, [displayData.billingOrg, orgDetails]);

  return (
    <div className="w-full flex-1 flex flex-col space-y-3 pb-8 animate-in fade-in duration-150">
      {/* 1. TOP NAVBAR / BREADCRUMB HEADER (Using strictly global CSS tokens) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] p-2.5  border-b border-[var(--border-main)]">
        {/* Left: Breadcrumb + Template Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <span className="text-[var(--border-main)]">/</span>
          <span className="text-[var(--text-subtle)]">
            {isReceiptView ? "Receipt" : isProforma ? "Proforma" : "Invoice"}
          </span>
          <span className="font-semibold text-[var(--text-main)]">
            {isReceiptView ? displayData.rcptNo : displayData.invNo}
          </span>

          {/* Template label */}
          <div className="relative inline-block ml-2">
            <span className="px-2.5 py-1 rounded-sm text-xs font-semibold border border-[var(--border-main)] bg-[var(--bg-subtle)] text-[var(--text-muted)]">
              {activeTemplate}
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Email button */}
          <button
            type="button"
            title="Send Email"
            className="h-8 w-8 rounded-sm border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4" />
          </button>

          {/* Message button */}
          <button
            type="button"
            title="Send Message"
            className="h-8 w-8 rounded-sm border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Download / Print button */}
          <button
            type="button"
            onClick={handlePrint}
            title="Download / Print PDF"
            className="h-8 w-8 rounded-sm border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Action button: If Proforma -> 'Mark as Invoice'; If Invoice -> 'Record Payment' */}
          {isProforma ? (
            <button
              type="button"
              onClick={() => setShowConvertModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-xs transition-colors cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Mark as Invoice</span>
            </button>
          ) : !isReceiptView ? (
            <button
              type="button"
              onClick={() => onRecordPayment(activeInvoice, receipt || undefined)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-xs transition-colors cursor-pointer"
            >
              <span>₹</span>
              <span>Record Payment</span>
            </button>
          ) : null}

          {/* More options */}
          <button
            type="button"
            className="h-8 w-8 rounded-sm border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onBack}
            title="Close"
            className="h-8 w-8 rounded-sm border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN LAYOUT: Document Preview (Left) + Operations Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: The Document Sheet */}
        <div className="lg:col-span-8 xl:col-span-9 bg-[var(--bg-surface)] border border-[var(--border-main)] p-6 md:p-8 shadow-xs space-y-6">
          {/* Header Row: Sender Org & Document Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start border-b border-[var(--border-main)] pb-6">
            {/* Sender Info (Left) */}
            <div className="flex items-start gap-3.5">
              {senderDetails.initials ? (
                <div className="w-14 h-14 rounded-sm bg-[var(--primary-light)] flex items-center justify-center font-bold text-[var(--primary)] text-lg shrink-0 border border-[var(--primary-border)]">
                  {senderDetails.initials}
                </div>
              ) : (
                <div className="w-14 h-14 rounded-sm bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-subtle)] shrink-0 border border-[var(--border-main)]">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div className="space-y-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
                <h3 className="font-bold text-sm text-[var(--text-main)]">
                  {senderDetails.name}
                </h3>
                {senderDetails.address ? <p>{senderDetails.address}</p> : null}
                {senderDetails.email ? <p>Email: {senderDetails.email}</p> : null}
                {senderDetails.mobile ? <p>Mobile: {senderDetails.mobile}</p> : null}
                {senderDetails.website ? <p>Website: {senderDetails.website}</p> : null}
                <p className="font-medium text-[var(--text-main)]">
                  GSTIN: {senderDetails.gstin || "N/A"}
                </p>
                <p className="font-medium text-[var(--text-main)]">
                  PAN: {senderDetails.pan || "N/A"}
                </p>
              </div>
            </div>

            {/* Document Meta (Right) */}
            <div className="text-xs space-y-1 md:text-right">
              {isReceiptView ? (
                <>
                  <div className="flex md:justify-end items-center gap-2">
                    <span className="text-[var(--text-subtle)]">Receipt No</span>
                    <span className="font-bold text-sm text-[var(--text-main)]">
                      {displayData.rcptNo}
                    </span>
                  </div>
                  <div className="flex md:justify-end items-center gap-2">
                    <span className="text-[var(--text-subtle)]">Payment Date</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      {displayData.date}
                    </span>
                  </div>
                  <div className="flex md:justify-end items-center gap-2">
                    <span className="text-[var(--text-subtle)]">Linked Invoice</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      {displayData.invNo !== "N/A" ? displayData.invNo : "—"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex md:justify-end items-center gap-2">
                    <span className="text-[var(--text-subtle)]">
                      {isProforma ? "Proforma No" : "Invoice No"}
                    </span>
                    <span className="font-bold text-sm text-[var(--text-main)]">
                      {displayData.invNo}
                    </span>
                  </div>
                  <div className="flex md:justify-end items-center gap-2">
                    <span className="text-[var(--text-subtle)]">Date</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      {displayData.date}
                    </span>
                  </div>
                  <div className="flex md:justify-end items-center gap-2">
                    <span className="text-[var(--text-subtle)]">Due Date</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      {displayData.dueDate}
                    </span>
                  </div>
                  <div className="flex md:justify-end items-center gap-2">
                    <span className="text-[var(--text-subtle)]">Filing Period</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      {displayData.filingPeriod}
                    </span>
                  </div>
                </>
              )}

              <div className="flex md:justify-end items-center gap-2 pt-1">
                <span className="text-[var(--text-subtle)]">Status</span>
                <span
                  className={`px-2.5 py-0.5 rounded-sm text-[11px] font-semibold border ${displayData.status === "Paid"
                      ? "bg-[var(--badge-new-bg)] text-[var(--badge-new-text)] border-transparent"
                      : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-main)]"
                    }`}
                >
                  {displayData.status}
                </span>
              </div>
            </div>
          </div>

          {/* Client Details & Bank Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[var(--text-muted)]">
            {/* Client Details */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-[var(--primary)] uppercase tracking-wider text-[11px]">
                Client Details
              </h4>
              <p className="font-bold text-sm text-[var(--text-main)]">
                {displayData.clientName}
              </p>
              <p>Address: {displayData.clientAddress}</p>
              <p>GSTIN: {displayData.clientGstin}</p>
              <p>PAN: {displayData.clientPan}</p>
              <p>Place of Supply: {displayData.placeOfSupply}</p>
            </div>

            {/* Bank Details */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-[var(--primary)] uppercase tracking-wider text-[11px]">
                Bank Details
              </h4>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-[var(--text-subtle)]">Payment Type:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {receipt?.method || (isReceiptView ? "Bank Transfer" : "N/A")}
                </span>

                <span className="text-[var(--text-subtle)]">Bank Account:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {bank?.bankName || "N/A"}
                </span>

                <span className="text-[var(--text-subtle)]">Account Name:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {bank?.accountBusinessName || "N/A"}
                </span>

                <span className="text-[var(--text-subtle)]">Account Number:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {bank?.accountNumber || "N/A"}
                </span>

                <span className="text-[var(--text-subtle)]">IFSC:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {bank?.ifscCode || "N/A"}
                </span>

                <span className="text-[var(--text-subtle)]">Account Type:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {bank?.accountType || "N/A"}
                </span>

                <span className="text-[var(--text-subtle)]">Bank Branch:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {bank?.branchAddress || "N/A"}
                </span>

                <span className="text-[var(--text-subtle)]">UPI:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {bank?.upi || "N/A"}
                </span>

                <span className="text-[var(--text-subtle)]">Currency Code:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {bank?.currencyCode || "INR"}
                </span>
              </div>
            </div>
          </div>

          {/* Service Line Items Table */}
          <div className="rounded-sm overflow-hidden border border-[var(--border-main)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--primary)] text-white font-semibold">
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">HSN/SAC</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Tax</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)] font-medium text-[var(--text-main)]">
                {isReceiptView ? (
                  /* When viewing a receipt, display the exact receipt payment information */
                  <tr>
                    <td className="py-3 px-3">
                      <p className="font-bold text-[var(--text-main)]">
                        Payment Receipt Settlement
                      </p>
                      <p className="text-[11px] text-[var(--text-subtle)]">
                        {displayData.invNo !== "N/A"
                          ? `Payment received for Invoice ${displayData.invNo}`
                          : receipt?.notes || `Receipt Reference: ${displayData.rcptNo}`}
                      </p>
                    </td>
                    <td className="py-3 px-3">N/A</td>
                    <td className="py-3 px-3 text-center">1</td>
                    <td className="py-3 px-3 text-right">{displayData.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right">{displayData.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right">—</td>
                    <td className="py-3 px-3 text-right font-bold text-[var(--text-main)]">
                      {displayData.amount.toFixed(2)}
                    </td>
                  </tr>
                ) : activeInvoice?.services && activeInvoice.services.length > 0 ? (
                  activeInvoice.services.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-3 px-3">
                        <p className="font-bold text-[var(--text-main)]">
                          {item.serviceName || "N/A"}
                        </p>
                        {item.description ? (
                          <p className="text-[11px] text-[var(--text-subtle)]">
                            {item.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 px-3">{(item as any).hsnSac || (item as any).hsn || "N/A"}</td>
                      <td className="py-3 px-3 text-center">{item.quantity ?? "N/A"}</td>
                      <td className="py-3 px-3 text-right">
                        {item?.totalServiceFee !== undefined ? item.totalServiceFee?.toFixed(2) : "N/A"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.totalServiceFee !== undefined ? item.totalServiceFee.toFixed(2) : "N/A"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.tax ? item.tax : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[var(--text-main)]">
                        {item.totalServiceFee !== undefined
                          ? item.totalServiceFee.toFixed(2)
                          : item.amount !== undefined
                            ? item.amount.toFixed(2)
                            : "N/A"}
                      </td>
                    </tr>
                  ))
                ) : receipt ? (
                  <tr>
                    <td className="py-3 px-3">
                      <p className="font-bold text-[var(--text-main)]">
                        {receipt.notes || "Payment Receipt"}
                      </p>
                      <p className="text-[11px] text-[var(--text-subtle)]">
                        Reference: {displayData.rcptNo !== "N/A" ? displayData.rcptNo : "N/A"}
                      </p>
                    </td>
                    <td className="py-3 px-3">N/A</td>
                    <td className="py-3 px-3 text-center">1</td>
                    <td className="py-3 px-3 text-right">{displayData.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right">{displayData.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right">—</td>
                    <td className="py-3 px-3 text-right font-bold text-[var(--text-main)]">
                      {displayData.amount.toFixed(2)}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-[var(--text-subtle)]">
                      N/A
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Row: Dynamic Total in Words, Signatory, QR Code & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-end">
            {/* Left side: Words, Signatory */}
            <div className="md:col-span-5 space-y-4 text-xs">
              <div>
                <p className="text-[var(--text-subtle)] font-medium">Total in Words:</p>
                <p className="font-bold text-[var(--text-main)] text-xs mt-0.5">
                  {numberToWords(displayData.amount)}
                </p>
              </div>

              <div className="pt-2">
                <p className="text-xs font-semibold text-[var(--primary)]">
                  Authorized Signatory
                </p>
                <div className="mt-2 h-14 border border-dashed border-[var(--border-main)] rounded-sm flex items-end justify-start p-2 bg-[var(--bg-muted)]">
                  <span className="text-[11px] text-[var(--text-subtle)]">
                    {displayData.billingOrg !== "N/A" ? `For ${displayData.billingOrg}` : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle: Scan to Pay / Payment Status */}
            <div className="md:col-span-3 flex flex-col items-center justify-center text-center text-[10px] text-[var(--text-subtle)]">
              {isReceiptView ? (
                <div className="w-full h-28 border border-[var(--primary-border)] bg-[var(--primary-light)] rounded-sm flex flex-col items-center justify-center p-2 text-[var(--primary)]">
                  <CheckCircle2 className="w-8 h-8 text-[var(--primary)] mb-1" />
                  <span className="font-bold text-xs">Payment Received</span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                    ₹{displayData.amount.toFixed(2)}
                  </span>
                </div>
              ) : bank?.upi ? (
                <>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                    Scan to Pay
                  </span>
                  <div className="w-24 h-24 bg-[var(--bg-surface)] p-1 rounded-sm border border-[var(--border-main)] my-1 shadow-xs flex items-center justify-center">
                    <QrCode className="w-20 h-20 text-[var(--text-main)]" />
                  </div>
                  <p className="font-medium text-[var(--text-muted)]">UPI: {bank.upi}</p>
                  <p className="font-bold text-[var(--primary)]">
                    Amount Due: ₹{displayData.balance.toFixed(2)}
                  </p>
                </>
              ) : (
                <div className="w-full h-28 border border-dashed border-[var(--border-main)] rounded-sm flex flex-col items-center justify-center p-2 bg-[var(--bg-muted)] text-[var(--text-subtle)]">
                  <QrCode className="w-6 h-6 text-[var(--text-placeholder)] mb-1" />
                  <span className="font-semibold text-[11px] text-[var(--text-muted)]">Scan to Pay</span>
                  <span className="text-[10px]">N/A</span>
                </div>
              )}
            </div>

            {/* Right: Payment Summary Box */}
            <div className="md:col-span-4 bg-[var(--bg-muted)] p-4 rounded-sm border border-[var(--border-main)] text-xs space-y-1.5">
              <h5 className="font-bold text-[var(--primary)] mb-2">Payment Summary</h5>
              <div className="flex justify-between">
                <span className="text-[var(--text-subtle)]">Sub Total</span>
                <span className="font-medium text-[var(--text-main)]">
                  {displayData.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-subtle)]">Total</span>
                <span className="font-bold text-[var(--text-main)]">
                  {displayData.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[var(--badge-new-text)]">
                <span>Payment Made</span>
                <span className="font-medium">(-) {displayData.paid.toFixed(2)}</span>
              </div>
              <div className="border-t border-[var(--border-main)] pt-1 flex justify-between font-bold text-[var(--text-main)]">
                <span>Balance</span>
                <span>{displayData.balance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Note footer */}
          {displayData.notes ? (
            <div className="pt-2 border-t border-[var(--border-main)] text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-main)]">Note:</span>{" "}
              {displayData.notes}
            </div>
          ) : null}
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3">
          {/* Quick Integration Cards */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] p-3.5 shadow-xs space-y-3 text-xs">
            {/* Link Task */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h6 className="font-semibold text-[var(--text-main)]">Link Task</h6>
                  <p className="text-[10px] text-[var(--text-subtle)]">
                    {activeInvoice?.taskId ? `Task #${activeInvoice.taskId}` : "N/A"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-6 h-6 rounded-sm border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Link User */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h6 className="font-semibold text-[var(--text-main)]">Link User</h6>
                  <p className="text-[10px] text-[var(--text-subtle)]">
                    {activeInvoice?.assignee || "N/A"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-6 h-6 rounded-sm border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* E-Invoice */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h6 className="font-semibold text-[var(--text-main)]">E-Invoice</h6>
                  <p className="text-[10px] text-[var(--text-subtle)]">
                    {(activeInvoice as any)?.eInvoiceNo || "N/A"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-6 h-6 rounded-sm border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Follow-Up */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h6 className="font-semibold text-[var(--text-main)]">Follow-Up</h6>
                  <p className="text-[10px] text-[var(--text-subtle)]">
                    {isFollowUpDone ? "Completed" : "N/A"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFollowUpDone(!isFollowUpDone)}
                className={`w-6 h-6 rounded-sm border flex items-center justify-center cursor-pointer transition-colors ${isFollowUpDone
                    ? "border-[var(--primary-border)] bg-[var(--primary-light)] text-[var(--primary)]"
                    : "border-[var(--border-main)] text-[var(--text-subtle)] hover:bg-[var(--bg-hover)]"
                  }`}
              >
                <Check className="w-3 h-3" />
              </button>
            </div>

            {/* Receipts List */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-main)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Receipts</span>
                </div>
              </div>
              {displayData.rcptNo !== "N/A" ? (
                <button
                  type="button"
                  onClick={() => onRecordPayment(activeInvoice, receipt || undefined)}
                  className="w-full p-2 rounded-sm bg-[var(--primary-light)] border border-[var(--primary-border)] text-xs flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer text-left"
                  title="Click to view / edit payment details"
                >
                  <span className="font-semibold text-[var(--primary)]">
                    {displayData.rcptNo}
                  </span>
                  <span className="text-[11px] font-bold text-[var(--primary)]">
                    ₹{displayData.paid.toFixed(2)}
                  </span>
                </button>
              ) : (
                <p className="text-[11px] text-[var(--text-subtle)]">N/A</p>
              )}
            </div>
          </div>

          {/* VIEW CLIENT LEDGER BUTTON */}
          <button
            type="button"
            disabled={isOpeningLedger}
            onClick={handleOpenClientLedger}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-sm border border-[var(--primary-border)] bg-[var(--primary-light)] text-[var(--primary)] font-bold text-xs hover:opacity-90 transition-opacity shadow-xs cursor-pointer group disabled:opacity-50"
          >
            {isOpeningLedger ? (
              <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin" />
            ) : (
              <Eye className="w-4 h-4 text-[var(--primary)] group-hover:scale-110 transition-transform" />
            )}
            <span>{isOpeningLedger ? "Opening Ledger..." : "View Client Ledger"}</span>
          </button>

          {/* Activity Log */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] p-3.5 shadow-xs text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
              <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Activity Log</span>
              </div>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="text-[11px] border border-[var(--border-main)] rounded-sm px-1.5 py-0.5 bg-transparent text-[var(--text-main)]"
              >
                <option value="All">All</option>
                <option value="Payments">Payments</option>
              </select>
            </div>

            <div className="space-y-3">
              {receipt ? (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-bold text-[10px] flex items-center justify-center shrink-0">
                    RP
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[var(--text-main)] font-medium">
                      Payment recorded
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-semibold">
                      Receipt {displayData.rcptNo !== "N/A" ? displayData.rcptNo : "N/A"} (₹{displayData.paid.toFixed(2)})
                    </p>
                    <p className="text-[10px] text-[var(--text-subtle)]">{displayData.date !== "N/A" ? displayData.date : "N/A"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[var(--text-subtle)]">
                  N/A
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM CONVERT PROFORMA TO INVOICE MODAL */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-sm p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[var(--primary)]" />
                <span>Confirm Mark as Invoice</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to convert Proforma Invoice{" "}
              <span className="font-bold text-[var(--text-main)]">{displayData.invNo}</span> into a
              Tax Invoice? This will assign an official Invoice number and add it to your active
              Invoices ledger.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-3 py-1.5 rounded-sm text-xs font-medium border border-[var(--border-main)] bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConverting}
                onClick={handleConfirmConvert}
                className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isConverting ? "Converting..." : "Mark as Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
