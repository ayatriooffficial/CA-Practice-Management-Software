"use client";

import React, { useRef } from "react";
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

  const handlePrint = () => {
    window.print();
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

  const handleEmail = () => {
    const mail = quotation.quotationTo?.email || lead?.email;
    if (!mail) {
      alert("No email address found.");
      return;
    }
    window.location.href = `mailto:${mail}?subject=Quotation%20${quotation.quotationNo}%20from%20${quotation.billingOrg?.name}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/40">
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
              onClick={handleEmail}
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
        <div ref={printRef} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-slim bg-white dark:bg-[#0f172a]">
          {/* Main Printable Card */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-card space-y-8">
            {/* Top Organization and Quotation Number Info */}
            <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
              {/* Left: Firm / Organization Info */}
              <div className="flex items-start gap-4 max-w-md">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shrink-0"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                >
                  {quotation.billingOrg?.name?.slice(0, 2).toUpperCase() || "TA"}
                </div>
                <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {quotation.billingOrg?.name || "Turia Associates Demo"}
                  </h2>
                  <p>{quotation.billingOrg?.address}</p>
                  <p>Email: {quotation.billingOrg?.email || "kavinraj@turia.in"}</p>
                  <p>Mobile: {quotation.billingOrg?.mobile || "8722750204"}</p>
                  <p>Website: {quotation.billingOrg?.website || "https://turia.in/"}</p>
                  <div className="pt-1 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                    GSTIN: {quotation.billingOrg?.gstin || "29AARCS3638L2ZH"}
                  </div>
                  <div className="font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                    PAN: {quotation.billingOrg?.pan || "KKXPS8986J"}
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
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        quotation.status === "Accepted"
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
                    {quotation.bankDetails?.accountName || "Turia Books Technologies Private Limited"}
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
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 space-y-2">
              <div className="font-semibold text-gray-700 dark:text-gray-300">
                Terms & Conditions:
              </div>
              <p>
                1. Quotation valid for 30 days from date of issue.
                2. Taxes applicable as per prevailing GST statutory laws.
                3. Payment due within specified due date.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
