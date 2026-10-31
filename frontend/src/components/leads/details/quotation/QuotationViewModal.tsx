"use client";

import React, { useRef, useState } from "react";
import {
  X,
  Mail,
  MessageCircle,
  Download,
  MoreVertical,
  Printer,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { Quotation } from "@/services/quotationApi";
import { Lead } from "@/data/crmData";
import { ComposeModal } from "@/components/email/ComposeModal";
import * as gmail from "@/lib/integrations/gmail";

interface QuotationViewModalProps {
  quotation: Quotation;
  lead?: Lead;
  onClose: () => void;
}

export const QuotationViewModal: React.FC<QuotationViewModalProps> = ({
  quotation,
  lead,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  const handlePrint = () => {
    // Remove any previous print frame if left over
    const oldFrame = document.getElementById("quotation-print-frame");
    if (oldFrame) {
      oldFrame.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "quotation-print-frame";
    // Real dimensions ensure Chromium layout engine accurately calculates page bounds and content
    iframe.setAttribute(
      "style",
      "position: fixed; left: -9999px; top: 0; width: 850px; height: 1200px; border: 0; opacity: 0; pointer-events: none;"
    );
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const orgInitials = (quotation.billingOrg?.name || "QT").slice(0, 2).toUpperCase();
    const statusColor =
      quotation.status === "Accepted"
        ? "background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;"
        : quotation.status === "Rejected"
        ? "background:#fff1f2;color:#be123c;border:1px solid #fecdd3;"
        : "background:#fffbeb;color:#b45309;border:1px solid #fde68a;";

    const itemsRows =
      quotation.items && quotation.items.length > 0
        ? quotation.items
            .map(
              (item) => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; vertical-align: top;">
                <div style="font-weight: 700; color: #111827; font-size: 13px;">${item.serviceName || "Service"}</div>
                ${item.description ? `<div style="color: #6b7280; font-size: 11px; margin-top: 2px;">${item.description}</div>` : ""}
              </td>
              <td style="padding: 10px 12px; font-family: monospace; font-size: 11px; color: #4b5563; vertical-align: top;">
                ${item.hsnSac || "—"}
              </td>
              <td style="padding: 10px 12px; text-align: center; color: #1f2937; vertical-align: top;">
                ${item.quantity ?? 1}
              </td>
              <td style="padding: 10px 12px; text-align: right; color: #1f2937; vertical-align: top;">
                ₹${(Number(item.price) || 0).toFixed(2)}
              </td>
              <td style="padding: 10px 12px; text-align: right; color: #1f2937; vertical-align: top;">
                ₹${(Number(item.amount) || 0).toFixed(2)}
              </td>
              <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #111827; vertical-align: top;">
                ₹${(Number(item.total) || 0).toFixed(2)}
              </td>
            </tr>`
            )
            .join("")
        : `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #9ca3af;">No services listed</td></tr>`;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Quotation - ${quotation.quotationNo || "Document"}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              font-size: 12px;
              line-height: 1.45;
            }
            .header-wrap {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
              margin-bottom: 24px;
            }
            .org-badge {
              width: 52px;
              height: 52px;
              border-radius: 12px;
              background-color: #31719B;
              color: #ffffff;
              font-weight: 900;
              font-size: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 14px;
              flex-shrink: 0;
            }
            .cards-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 24px;
            }
            .info-card {
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 14px 16px;
            }
            .card-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #31719B;
              margin-bottom: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            thead tr {
              background-color: #31719B !important;
              color: #ffffff !important;
            }
            thead th {
              color: #ffffff !important;
              padding: 10px 12px;
              font-size: 11px;
              font-weight: 700;
              text-align: left;
            }
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 30px;
            }
            .totals-table {
              width: 320px;
            }
            .totals-table td {
              padding: 6px 10px;
              font-size: 12px;
            }
            .grand-total-row {
              font-size: 15px;
              font-weight: 800;
              border-top: 2px solid #e5e7eb;
              color: #31719B;
            }
            .footer-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
              color: #6b7280;
              page-break-inside: avoid;
            }
            .status-pill {
              display: inline-block;
              padding: 3px 12px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 700;
              ${statusColor}
            }
          </style>
        </head>
        <body>
          <!-- Top Organization and Quotation Number Info -->
          <div class="header-wrap">
            <div style="display: flex; align-items: flex-start; max-width: 440px;">
              <div class="org-badge">${orgInitials}</div>
              <div>
                <div style="font-size: 17px; font-weight: 800; color: #111827; margin-bottom: 2px;">
                  ${quotation.billingOrg?.name || "Ayatrio"}
                </div>
                ${quotation.billingOrg?.address ? `<div style="color: #4b5563; font-size: 11px; margin-bottom: 2px;">${quotation.billingOrg.address}</div>` : ""}
                ${quotation.billingOrg?.email ? `<div style="color: #4b5563; font-size: 11px;">Email: ${quotation.billingOrg.email}</div>` : ""}
                ${quotation.billingOrg?.mobile ? `<div style="color: #4b5563; font-size: 11px;">Mobile: ${quotation.billingOrg.mobile}</div>` : ""}
                ${quotation.billingOrg?.website ? `<div style="color: #4b5563; font-size: 11px;">Website: ${quotation.billingOrg.website}</div>` : ""}
                ${quotation.billingOrg?.gstin ? `<div style="font-family: monospace; font-size: 11px; font-weight: 600; color: #374151; margin-top: 4px;">GSTIN: ${quotation.billingOrg.gstin}</div>` : ""}
                ${quotation.billingOrg?.pan ? `<div style="font-family: monospace; font-size: 11px; font-weight: 600; color: #374151;">PAN: ${quotation.billingOrg.pan}</div>` : ""}
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">
                Quotation No
              </div>
              <div style="font-size: 22px; font-weight: 900; color: #111827; margin: 2px 0 6px 0;">
                ${quotation.quotationNo || "QUO-001"}
              </div>
              <div style="font-size: 11px; color: #4b5563; margin-bottom: 3px;">
                <strong style="color: #374151;">Quotation Date:</strong> ${quotation.quotationDate || "—"}
              </div>
              <div style="font-size: 11px; color: #4b5563; margin-bottom: 8px;">
                <strong style="color: #374151;">Due Date:</strong> ${quotation.dueDate || "—"}
              </div>
              <div>
                <span class="status-pill">${quotation.status || "Pending"}</span>
              </div>
            </div>
          </div>

          <!-- Client Details & Bank Details Grid -->
          <div class="cards-grid">
            <div class="info-card">
              <div class="card-title">Client Details</div>
              <div style="font-size: 14px; font-weight: 800; color: #111827; margin-bottom: 3px;">
                ${quotation.quotationTo?.businessName || quotation.quotationTo?.name || "Client"}
              </div>
              ${quotation.quotationTo?.name ? `<div style="color: #4b5563; font-size: 11px;">Attn: ${quotation.quotationTo.name}</div>` : ""}
              ${quotation.quotationTo?.addressLine1 ? `<div style="color: #4b5563; font-size: 11px;">${quotation.quotationTo.addressLine1}</div>` : ""}
              <div style="color: #4b5563; font-size: 11px;">
                ${[quotation.quotationTo?.city, quotation.quotationTo?.state].filter(Boolean).join(", ")}
              </div>
              ${quotation.quotationTo?.gstin ? `<div style="font-family: monospace; font-size: 11px; color: #1f2937; margin-top: 4px;">GSTIN: ${quotation.quotationTo.gstin}</div>` : ""}
              <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">
                <span>Place of Supply: ${quotation.quotationTo?.placeOfSupply || "Karnataka"}</span>
                <span>State Code: ${quotation.quotationTo?.stateCode || "29"}</span>
              </div>
            </div>

            <div class="info-card">
              <div class="card-title">Bank Details</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #6b7280;">Payment Type:</span>
                <span style="font-weight: 600; color: #1f2937;">${quotation.bankDetails?.paymentType || "Bank"}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #6b7280;">Bank Account:</span>
                <span style="font-weight: 600; color: #1f2937;">${quotation.bankDetails?.bankName || "HDFC"}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #6b7280;">Account Name:</span>
                <span style="font-weight: 600; color: #1f2937;">${quotation.bankDetails?.accountName || "CA Books Technologies Private Limited"}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #6b7280;">Account Number:</span>
                <span style="font-family: monospace; font-weight: 700; color: #111827;">${quotation.bankDetails?.accountNumber || "8934784834990842"}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #6b7280;">IFSC:</span>
                <span style="font-family: monospace; font-weight: 700; color: #111827;">${quotation.bankDetails?.ifsc || "HDFC9003928"}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">UPI / QR:</span>
                <span style="font-family: monospace; color: #1f2937;">${quotation.bankDetails?.upi || "6363693138@ybl"}</span>
              </div>
            </div>
          </div>

          <!-- Services Table -->
          <table style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr>
                <th style="width: 40%;">Service</th>
                <th style="width: 14%;">HSN/SAC</th>
                <th style="width: 8%; text-align: center;">Qty</th>
                <th style="width: 12%; text-align: right;">Price</th>
                <th style="width: 12%; text-align: right;">Amount</th>
                <th style="width: 14%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Totals Summary -->
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td style="color: #6b7280;">Subtotal:</td>
                <td style="text-align: right; font-weight: 600; color: #374151;">₹${(Number(quotation.subtotal) || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #6b7280;">GST / Tax Total:</td>
                <td style="text-align: right; font-weight: 600; color: #374151;">₹${(Number(quotation.taxTotal) || 0).toFixed(2)}</td>
              </tr>
              <tr class="grand-total-row">
                <td style="padding-top: 8px;">Grand Total:</td>
                <td style="padding-top: 8px; text-align: right;">₹${(Number(quotation.totalAmount) || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Terms and Sign-off -->
          <div class="footer-section">
            <div style="max-width: 420px;">
              <div style="font-weight: 700; color: #374151; margin-bottom: 4px;">Terms & Conditions:</div>
              <div style="line-height: 1.5;">
                1. Quotation valid for 30 days from date of issue.<br />
                2. Taxes applicable as per prevailing GST statutory laws.<br />
                3. Payment due within specified due date.
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 700; color: #374151; margin-bottom: 45px;">
                For ${quotation.billingOrg?.name || "Authorized Organization"}
              </div>
              <div style="border-top: 1px solid #9ca3af; padding-top: 4px; font-size: 11px; min-width: 170px; text-align: center;">
                Authorized Signatory / Seal
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error:", err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  };

  const handleWhatsApp = () => {
    const rawNumber = (quotation.quotationTo?.mobile || lead?.mobile || "").replace(/[^0-9]/g, "");
    if (!rawNumber) {
      alert("No mobile number available for WhatsApp.");
      return;
    }
    const intlNumber = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
    const msg = encodeURIComponent(
      `Hello ${quotation.quotationTo?.name || "Client"},\nHere is your quotation ${quotation.quotationNo} for an amount of ₹${quotation.totalAmount}. Please review and let us know.`
    );
    window.open(`https://wa.me/${intlNumber}?text=${msg}`, "_blank");
  };

  const handleOpenEmailCompose = () => {
    const to = lead?.email || quotation.quotationTo?.email || "";
    const quotationId = quotation.quotationNo || quotation.id || "";
    const billingOrgName = quotation.billingOrg?.name || "Ayatrio Practice";
    const clientName =
      quotation.quotationTo?.name ||
      quotation.quotationTo?.businessName ||
      lead?.fullName ||
      "Client";
    const serviceName =
      quotation.items && quotation.items.length > 0
        ? quotation.items.map((item) => item.serviceName).filter(Boolean).join(", ")
        : "Services";
    const totalAmount = `₹${(quotation.totalAmount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const subject = `Quotation ${quotationId} from ${billingOrgName}`;
    const body = `Dear ${clientName},

Please find attached the details for Quotation ${quotationId} regarding ${serviceName}.

Total Amount: ${totalAmount}

If you have any questions, feel free to reply directly to this email.

Best regards,
Ayatrio Practice`;

    setComposeData({ to, subject, body });
    setIsComposeOpen(true);
  };

  const handleSendEmail = async (params: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
  }) => {
    setSendingEmail(true);
    try {
      await gmail.send(params);
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send email.",
      };
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      {/* Scoped CSS for browser direct print (Ctrl + P) */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm;
          }
          body * {
            visibility: hidden;
          }
          #quotation-modal-portal,
          #quotation-modal-portal * {
            visibility: visible;
          }
          #quotation-modal-portal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            z-index: 999999 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="quotation-modal-portal"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4 overflow-y-auto print:static print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible"
      >
        <div className="quotation-print-modal bg-white dark:bg-[#1e293b] w-full max-w-5xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-150 print:shadow-none print:m-0 print:p-0 print:max-h-none print:max-w-none print:border-none print:overflow-visible print:bg-white print:text-gray-900">
          {/* Top Header Bar */}
          <div className="px-6 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/40 print:hidden">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                onClick={onClose}
              >
                &lt; List
              </span>
              <span className="text-gray-300 dark:text-gray-600">&gt;</span>
              <span className="text-gray-900 dark:text-white font-bold">
                Quotation · {quotation.quotationNo}
              </span>

              {/* Template selector */}
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                Template: {quotation.template || "Aura"}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEmailCompose}
                title="Email Quotation"
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4 text-[#31719B]" />
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                title="Send via WhatsApp"
                className="p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handlePrint}
                title="Print / Save PDF"
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Document Area */}
          <div ref={printRef} className="quotation-print-body flex-1 overflow-y-auto p-8 space-y-6 scrollbar-slim bg-white dark:bg-[#0f172a] print:overflow-visible print:p-0 print:bg-white print:text-gray-900">
          {/* Main Printable Card */}
          <div className="bg-white dark:bg-[#1e293b]  p-8 shadow-card space-y-8">
            {/* Top Organization and Quotation Number Info */}
            <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
              {/* Left: Firm / Organization Info */}
              <div className="flex items-start gap-4 max-w-md">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shrink-0"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                >
                  {quotation.billingOrg?.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {quotation.billingOrg?.name}
                  </h2>
                  <p>{quotation.billingOrg?.address}</p>
                  <p>Email: {quotation.billingOrg?.email}</p>
                  <p>Mobile: {quotation.billingOrg?.mobile}</p>
                  <p>Website: {quotation.billingOrg?.website}</p>
                  <div className="pt-1 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                    GSTIN: {quotation.billingOrg?.gstin}
                  </div>
                  <div className="font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                    PAN: {quotation.billingOrg?.pan}
                  </div>
                </div>
              </div>

              {/* Right: Quotation No & Status */}
              <div className="text-right space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Quotation No
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {quotation.quotationNo}
                </div>

                <div className="text-xs space-y-1 pt-1 text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Quotation Date:
                    </span>{" "}
                    {quotation.quotationDate}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Due Date:
                    </span>{" "}
                    {quotation.dueDate}
                  </div>
                  <div className="pt-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${quotation.status === "Accepted"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : quotation.status === "Rejected"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                    >
                      {quotation.status || "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Details and Bank Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              {/* Client Details Box */}
              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 space-y-2">
                <div className="text-xs font-bold text-[#31719B] dark:text-[#60a5fa] uppercase tracking-wider">
                  Client Details
                </div>
                <div className="font-bold text-sm text-gray-900 dark:text-white">
                  {quotation.quotationTo?.businessName || quotation.quotationTo?.name}
                </div>
                {quotation.quotationTo?.name && (
                  <div className="text-gray-600 dark:text-gray-300">
                    Attn: {quotation.quotationTo?.name}
                  </div>
                )}
                {quotation.quotationTo?.addressLine1 && (
                  <div className="text-gray-600 dark:text-gray-300">
                    {quotation.quotationTo?.addressLine1}
                  </div>
                )}
                <div className="text-gray-600 dark:text-gray-300">
                  {[quotation.quotationTo?.city, quotation.quotationTo?.state]
                    .filter(Boolean)
                    .join(", ")}
                </div>
                {quotation.quotationTo?.gstin && (
                  <div className="font-mono text-gray-700 dark:text-gray-300 pt-1">
                    GSTIN: {quotation.quotationTo?.gstin}
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-gray-200/80 dark:border-gray-700 text-gray-500">
                  <span>Place of Supply: {quotation.quotationTo?.placeOfSupply || "Karnataka"}</span>
                  <span>State Code: {quotation.quotationTo?.stateCode || "29"}</span>
                </div>
              </div>

              {/* Bank Details Box */}
              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 space-y-2">
                <div className="text-xs font-bold text-[#31719B] dark:text-[#60a5fa] uppercase tracking-wider">
                  Bank Details
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Type:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {quotation.bankDetails?.paymentType || "Bank"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bank Account:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {quotation.bankDetails?.bankName || "HDFC"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Name:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {quotation.bankDetails?.accountName || "CA Books Technologies Private Limited"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Number:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {quotation.bankDetails?.accountNumber || "8934784834990842"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IFSC:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {quotation.bankDetails?.ifsc || "HDFC9003928"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">UPI / QR:</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">
                    {quotation.bankDetails?.upi || "6363693138@ybl"}
                  </span>
                </div>
              </div>
            </div>

            {/* Services Table */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr
                    className="text-white font-semibold"
                    style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  >
                    <th className="px-4 py-3">Service</th>
                    <th className="px-3 py-3">HSN/SAC</th>
                    <th className="px-3 py-3 text-center">Qty</th>
                    <th className="px-3 py-3 text-right">Price</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-[#1e293b]">
                  {quotation.items?.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {item.serviceName}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-gray-600 dark:text-gray-400">
                        {item.hsnSac || "—"}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-800 dark:text-gray-200">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-800 dark:text-gray-200">
                        ₹{(item.price || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-800 dark:text-gray-200">
                        ₹{(item.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        ₹{(item.total || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-80 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal:</span>
                  <span>₹{(quotation.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>GST / Tax Total:</span>
                  <span>₹{(quotation.taxTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>Grand Total:</span>
                  <span className="text-[#31719B] dark:text-[#60a5fa]">
                    ₹{(quotation.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms and Sign-off */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-end justify-between gap-6 text-[11px] text-gray-500">
              <div className="space-y-1.5 max-w-md">
                <div className="font-semibold text-gray-700 dark:text-gray-300">
                  Terms & Conditions:
                </div>
                <p className="leading-relaxed">
                  1. Quotation valid for 30 days from date of issue.<br />
                  2. Taxes applicable as per prevailing GST statutory laws.<br />
                  3. Payment due within specified due date.
                </p>
              </div>

              <div className="text-right space-y-12 pt-4 shrink-0">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  For {quotation.billingOrg?.name || "Authorized Organization"}
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-1 text-xs text-gray-500 dark:text-gray-400 min-w-[160px]">
                  Authorized Signatory / Seal
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {isComposeOpen && (
      <ComposeModal
        initialTo={composeData.to}
        initialSubject={composeData.subject}
        initialHtmlBody={composeData.body}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
        sending={sendingEmail}
        zIndex={60}
      />
    )}
  </>
);
};
