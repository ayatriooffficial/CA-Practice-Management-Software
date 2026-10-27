"use client";

import React from "react";
import { CaIndiaLogo } from "@/components/ui/CaIndiaLogo";

export interface InvoiceLivePreviewProps {
  template: "classic" | "modern" | "minimal";
  accentColor: string; // e.g. '#4F46E5'
  firmName: string;
  firmLogoUrl?: string | null;
  digitalSignatureUrl?: string | null;
  showCaLogo: boolean;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  showQuantity?: boolean;
  showHsnSac?: boolean;
  notes?: string;
}

export const InvoiceLivePreview: React.FC<InvoiceLivePreviewProps> = ({
  template = "classic",
  accentColor = "#4F46E5",
  firmName = "Your Firm Name",
  firmLogoUrl = null,
  digitalSignatureUrl = null,
  showCaLogo = true,
  invoiceNumber = "INV/2024-001",
  invoiceDate = "01-Jun-2024",
  dueDate = "15-Jun-2024",
  bankName = "HDFC Bank",
  accountHolderName = "M/s Sharma & Associates",
  accountNumber = "50200012345678",
  ifscCode = "HDFC0001234",
  branchName = "Koramangala, Bengaluru",
  upiId = "sharma@hdfc",
  showQuantity = true,
  showHsnSac = true,
  notes = "Thank you for your business. Please make payment within the due date.",
}) => {
  const isMinimal = template === "minimal";
  const isModern = template === "modern";
  const isClassic = template === "classic";

  const effectiveColor = isMinimal ? "#111827" : accentColor;

  return (
    <div
      className={`w-full bg-white text-gray-900 shadow-xl rounded-xl overflow-hidden border transition-all text-xs select-none ${
        isMinimal
          ? "border-gray-300 font-sans"
          : "border-gray-200"
      }`}
      style={{
        boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Top Accent Bar for Classic */}
      {isClassic && (
        <div
          className="w-full h-2"
          style={{ backgroundColor: effectiveColor }}
        />
      )}

      <div className="p-6 sm:p-8 space-y-6">
        {/* Top Header Row */}
        <div
          className={`flex items-start justify-between gap-4 pb-4 ${
            isModern
              ? "p-4 rounded-xl bg-gray-50 border border-gray-100"
              : isMinimal
              ? "border-b border-gray-300 pb-5"
              : ""
          }`}
        >
          {/* Firm Logo & Name */}
          <div className="flex items-center gap-3">
            {firmLogoUrl ? (
              <img
                src={firmLogoUrl}
                alt={firmName}
                className="w-12 h-12 object-contain"
              />
            ) : showCaLogo ? (
              <CaIndiaLogo size={46} />
            ) : null}

            <div>
              <h2
                className={`text-lg sm:text-xl font-bold tracking-tight ${
                  isMinimal ? "text-black" : "text-gray-900"
                }`}
              >
                {firmName || "Your Firm Name"}
              </h2>
              <p className="text-[10px] text-gray-500 font-medium">
                Chartered Accountants & Tax Advisors
              </p>
            </div>
          </div>

          {/* Tax Invoice Badge & Number */}
          <div className="text-right">
            <h1
              className="text-lg sm:text-xl font-extrabold uppercase tracking-wide"
              style={{ color: effectiveColor }}
            >
              TAX INVOICE
            </h1>
            <p className="text-xs font-mono font-bold text-gray-700 mt-0.5">
              {invoiceNumber}
            </p>
            {isMinimal && (
              <div className="text-[11px] text-gray-500 mt-1">
                <span>Date: </span>
                <span className="font-semibold text-gray-800">{invoiceDate}</span>
                <span className="ml-2">Due: </span>
                <span className="font-semibold text-gray-800">{dueDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Client Details & Invoice Meta Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Bill To Card (Col Span 2) */}
          <div className="sm:col-span-2 p-4 rounded-xl bg-gray-50/70 border border-gray-200/80">
            <span
              className="text-[10px] font-bold uppercase tracking-wider block mb-1"
              style={{ color: effectiveColor }}
            >
              BILL TO
            </span>
            <h3 className="text-sm font-bold text-gray-900">
              Rajesh Exports Pvt. Ltd.
            </h3>
            <p className="text-[11px] text-gray-600 mt-0.5">
              B-12, Industrial Area Phase-II, Koramangala Bengaluru, Karnataka - 560058
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-gray-600">
              <div>
                <span className="font-semibold text-gray-700">GSTIN: </span>
                <span className="font-mono">29AABCU9603R1ZM</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">PAN: </span>
                <span className="font-mono">AABCU9603R</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Contact: </span>
                <span>Rajesh Kumar (9876543210)</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">POS: </span>
                <span>29 – Karnataka</span>
              </div>
            </div>
          </div>

          {/* Invoice Meta Box (Only for Classic & Modern) */}
          {!isMinimal && (
            <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-200/80 flex flex-col justify-between space-y-2 text-[11px]">
              <div>
                <span className="text-[9px] font-bold uppercase text-gray-400 block tracking-wider">
                  INVOICE NO.
                </span>
                <span className="font-mono font-bold text-gray-800">
                  {invoiceNumber}
                </span>
              </div>
              <div className="border-t border-gray-200/60 pt-1.5">
                <span className="text-[9px] font-bold uppercase text-gray-400 block tracking-wider">
                  INVOICE DATE
                </span>
                <span className="font-semibold text-gray-800">{invoiceDate}</span>
              </div>
              <div className="border-t border-gray-200/60 pt-1.5">
                <span className="text-[9px] font-bold uppercase text-gray-400 block tracking-wider">
                  DUE DATE
                </span>
                <span className="font-semibold text-gray-800">{dueDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr
                className="font-bold text-[10px] tracking-wider uppercase"
                style={{
                  backgroundColor: isClassic ? effectiveColor : isModern ? "#f1f5f9" : "#ffffff",
                  color: isClassic ? "#ffffff" : isModern ? "#334155" : "#111827",
                  borderBottom: isMinimal ? "2px solid #111827" : undefined,
                }}
              >
                <th className="py-2.5 px-3 w-8 text-center">#</th>
                <th className="py-2.5 px-3">DESCRIPTION</th>
                {showHsnSac && <th className="py-2.5 px-3">HSN/SAC</th>}
                {showQuantity && <th className="py-2.5 px-3 text-center">QTY</th>}
                <th className="py-2.5 px-3 text-right">RATE</th>
                <th className="py-2.5 px-3 text-right">TAXABLE</th>
                <th className="py-2.5 px-3 text-center">GST %</th>
                <th className="py-2.5 px-3 text-right">CGST</th>
                <th className="py-2.5 px-3 text-right">SGST</th>
                <th className="py-2.5 px-3 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr className="hover:bg-gray-50/50">
                <td className="py-2.5 px-3 text-center font-medium text-gray-400">1</td>
                <td className="py-2.5 px-3 font-semibold text-gray-900">
                  GST Return Filing (GSTR-1)
                </td>
                {showHsnSac && <td className="py-2.5 px-3 font-mono text-gray-500">998211</td>}
                {showQuantity && <td className="py-2.5 px-3 text-center">1</td>}
                <td className="py-2.5 px-3 text-right font-mono">₹1,500.00</td>
                <td className="py-2.5 px-3 text-right font-mono">₹1,500.00</td>
                <td className="py-2.5 px-3 text-center">18%</td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-600">₹135.00</td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-600">₹135.00</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                  ₹1,770.00
                </td>
              </tr>

              <tr className="hover:bg-gray-50/50">
                <td className="py-2.5 px-3 text-center font-medium text-gray-400">2</td>
                <td className="py-2.5 px-3 font-semibold text-gray-900">
                  Income Tax Return Filing (ITR-3)
                </td>
                {showHsnSac && <td className="py-2.5 px-3 font-mono text-gray-500">998231</td>}
                {showQuantity && <td className="py-2.5 px-3 text-center">1</td>}
                <td className="py-2.5 px-3 text-right font-mono">₹2,500.00</td>
                <td className="py-2.5 px-3 text-right font-mono">₹2,500.00</td>
                <td className="py-2.5 px-3 text-center">18%</td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-600">₹225.00</td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-600">₹225.00</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                  ₹2,950.00
                </td>
              </tr>

              <tr className="hover:bg-gray-50/50">
                <td className="py-2.5 px-3 text-center font-medium text-gray-400">3</td>
                <td className="py-2.5 px-3 font-semibold text-gray-900">
                  TDS Return Filing (Form 26Q)
                </td>
                {showHsnSac && <td className="py-2.5 px-3 font-mono text-gray-500">998211</td>}
                {showQuantity && <td className="py-2.5 px-3 text-center">1</td>}
                <td className="py-2.5 px-3 text-right font-mono">₹800.00</td>
                <td className="py-2.5 px-3 text-right font-mono">₹800.00</td>
                <td className="py-2.5 px-3 text-center">18%</td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-600">₹72.00</td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-600">₹72.00</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                  ₹944.00
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals & Amount in Words */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {/* Amount In Words Box */}
          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
            <span
              className="text-[9px] font-bold uppercase tracking-wider block"
              style={{ color: effectiveColor }}
            >
              AMOUNT IN WORDS
            </span>
            <p className="text-xs font-serif italic text-gray-800 mt-1">
              Rupees Five Thousand Six Hundred Sixty Four Only
            </p>
          </div>

          {/* Totals Computation */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-mono font-medium">₹4,800.00</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxable Amount</span>
              <span className="font-mono font-medium">₹4,800.00</span>
            </div>
            <div className="flex justify-between text-gray-600 border-t border-dashed border-gray-200 pt-1.5">
              <span>CGST (9%)</span>
              <span className="font-mono font-medium">₹432.00</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>SGST (9%)</span>
              <span className="font-mono font-medium">₹432.00</span>
            </div>

            {/* Total Grand Box */}
            <div
              className={`flex justify-between items-center px-3.5 py-2.5 rounded-lg mt-2 text-sm font-extrabold ${
                isMinimal
                  ? "border-t-2 border-black text-black pt-3 bg-transparent px-0"
                  : "text-white"
              }`}
              style={{
                backgroundColor: isMinimal ? "transparent" : effectiveColor,
              }}
            >
              <span>{isMinimal ? "Total" : "Total Amount"}</span>
              <span className="text-base font-mono">₹5,664.00</span>
            </div>
          </div>
        </div>

        {/* Payment Details & QR Code */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
          <span
            className="text-[10px] font-bold uppercase tracking-wider block mb-2"
            style={{ color: effectiveColor }}
          >
            PAYMENT DETAILS
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Bank Info */}
            <div className="sm:col-span-2 space-y-1 text-[11px] text-gray-700">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block">
                BANK DETAILS
              </span>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-500 font-medium">A/C Holder</span>
                <span className="col-span-2 font-bold text-gray-900">
                  {accountHolderName || "M/s Sharma & Associates"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-500 font-medium">A/C No.</span>
                <span className="col-span-2 font-mono font-semibold text-gray-900">
                  {accountNumber || "50200012345678"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-500 font-medium">IFSC</span>
                <span className="col-span-2 font-mono font-semibold text-gray-900">
                  {ifscCode || "HDFC0001234"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-500 font-medium">Branch</span>
                <span className="col-span-2 text-gray-800">
                  {branchName || "Koramangala, Bengaluru"}
                </span>
              </div>
            </div>

            {/* Scan To Pay QR Box */}
            <div className="sm:border-l sm:border-gray-200 sm:pl-4 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                SCAN TO PAY
              </span>
              {/* Crisp SVG QR Code simulation */}
              <div className="w-16 h-16 bg-white border border-gray-300 p-1 rounded-md shadow-xs flex items-center justify-center">
                <svg viewBox="0 0 45 45" className="w-full h-full text-gray-900">
                  <path
                    fill="currentColor"
                    d="M0 0h15v15H0zm3 3h9v9H3zm27-3h15v15H30zm3 3h9v9h-9zm-30 27h15v15H0zm3 3h9v9H3zm18-27h3v6h-3zm6 0h3v3h-3zm3 3h3v3h-3zm-6 3h6v3h-6zm0 6h3v3h-3zm-6-3h3v6h-3zm18 0h3v9h-3zm-9 3h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm6-3h3v3h-3zm-15 3h3v6h-3zm6 0h3v3h-3zm6 3h6v3h-6z"
                  />
                </svg>
              </div>
              <span className="text-[10px] font-mono text-gray-500 mt-1">
                {upiId || "sharma@hdfc"}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Authorised Signatory */}
        <div className="pt-2 flex flex-col sm:flex-row items-end justify-between gap-6">
          <div className="space-y-1 max-w-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              NOTES
            </span>
            <p className="text-[11px] text-gray-600 leading-relaxed">{notes}</p>
          </div>

          {/* Authorised Signatory */}
          <div className="flex flex-col items-center text-center min-w-[140px]">
            {digitalSignatureUrl ? (
              <img
                src={digitalSignatureUrl}
                alt="Digital Signature"
                className="h-10 object-contain mb-1"
              />
            ) : (
              <div className="h-10 w-28 border-b border-gray-400 border-dashed mb-1" />
            )}
            <div className="border-t border-gray-300 pt-1 w-full text-[10px] font-bold text-gray-600">
              Authorised Signatory
            </div>
          </div>
        </div>

        {/* Subtle Footer */}
        <div className="pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400">
          This is a system-generated invoice.
        </div>
      </div>

      {/* Bottom Accent Bar for Classic */}
      {isClassic && (
        <div
          className="w-full h-1.5"
          style={{ backgroundColor: effectiveColor }}
        />
      )}
    </div>
  );
};
