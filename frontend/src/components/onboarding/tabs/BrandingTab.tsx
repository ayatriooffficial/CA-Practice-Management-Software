"use client";

import React, { useState } from "react";
import {
  Upload,
  Check,
  Eye,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Cloud,
} from "lucide-react";
import { CaIndiaLogo } from "@/components/ui/CaIndiaLogo";
import { InvoiceLivePreview } from "./InvoiceLivePreview";
import { organizationApi } from "@/services/organizationApi";
import { driveApi, DocumentCategory } from "@/services/driveApi";
import { getDirectFilePreviewUrl } from "@/utils/filePreview";

export interface DocumentColorSetting {
  id: string;
  code: string;
  label: string;
  name: string;
  hex: string;
}

export const SUGGESTED_COLORS = [
  // Row 1
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Lime", hex: "#84CC16" },
  // Row 2
  { name: "Green", hex: "#22C55E" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Sky", hex: "#0EA5E9" },
  // Row 3
  { name: "Blue", hex: "#3B82F6" },
  { name: "Indigo", hex: "#4F46E5" },
  { name: "Violet", hex: "#6366F1" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Fuchsia", hex: "#A855F7" },
  // Row 4
  { name: "Pink", hex: "#EC4899" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Slate", hex: "#64748B" },
  { name: "Dark Navy", hex: "#334155" },
  { name: "Charcoal", hex: "#1E293B" },
];

export const getColorName = (hex: string, fallbackName?: string): string => {
  const match = SUGGESTED_COLORS.find(
    (c) => c.hex.toLowerCase() === hex.toLowerCase()
  );
  if (match) return match.name;
  return fallbackName || "Custom";
};

export const DEFAULT_DOCUMENT_COLORS: DocumentColorSetting[] = [
  { id: "invoice", code: "INV", label: "Invoice", name: "Indigo", hex: "#4F46E5" },
  { id: "quotation", code: "QUO", label: "Quotation", name: "Sky", hex: "#0EA5E9" },
  { id: "credit_note", code: "CN", label: "Credit Note", name: "Green", hex: "#22C55E" },
  { id: "debit_note", code: "DN", label: "Debit Note", name: "Red", hex: "#EF4444" },
  { id: "receipt", code: "REC", label: "Receipt", name: "Amber", hex: "#F59E0B" },
  { id: "proforma", code: "PFI", label: "Proforma", name: "Purple", hex: "#8B5CF6" },
];

export interface BrandingTabProps {
  firmName: string;
  template: "classic" | "modern" | "minimal";
  setTemplate: (val: "classic" | "modern" | "minimal") => void;
  documentColors: DocumentColorSetting[];
  setDocumentColors: React.Dispatch<React.SetStateAction<DocumentColorSetting[]>>;
  firmLogoUrl: string | null;
  setFirmLogoUrl: (val: string | null) => void;
  digitalSignatureUrl: string | null;
  setDigitalSignatureUrl: (val: string | null) => void;
  showCaLogo: boolean;
  setShowCaLogo: (val: boolean) => void;
  isSaving?: boolean;
  onSave?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export const BrandingTab: React.FC<BrandingTabProps> = ({
  firmName,
  template,
  setTemplate,
  documentColors,
  setDocumentColors,
  firmLogoUrl,
  setFirmLogoUrl,
  digitalSignatureUrl,
  setDigitalSignatureUrl,
  showCaLogo,
  setShowCaLogo,
  isSaving = false,
  onSave,
  onPrevious,
  onNext,
}) => {
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState(false);
  const [signatureUploadSuccess, setSignatureUploadSuccess] = useState(false);

  const activeInvoiceColor =
    documentColors.find((c) => c.id === "invoice")?.hex || "#4F46E5";

  const handleColorChange = (id: string, newHex: string, newName?: string) => {
    const updated = documentColors.map((c) =>
      c.id === id
        ? {
          ...c,
          hex: newHex,
          name: newName || getColorName(newHex, c.name),
        }
        : c
    );
    setDocumentColors(updated);
    // Auto-save to organization so preview and generated invoices immediately reflect the new color
    organizationApi
      .updateOrganization({
        invoiceSettings: {
          documentColors: updated,
        },
      })
      .catch((err) => console.error("Failed to auto-save document color:", err));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview for immediate visual feedback
    const localUrl = URL.createObjectURL(file);
    setFirmLogoUrl(localUrl);
    setIsUploadingLogo(true);
    setLogoUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", DocumentCategory.GENERAL);
      formData.append("description", `Firm Logo for ${firmName || "Organization"}`);

      const response = await driveApi.uploadDocument(formData);
      if (response && response.data) {
        const driveDoc = response.data;
        // Store only relative path in DB (environment-agnostic, never localhost)
        const relativeUrl = `/api/v1/drive/${driveDoc.driveFileId || driveDoc._id}/preview`;
        const displayUrl = getDirectFilePreviewUrl(relativeUrl);
        setFirmLogoUrl(displayUrl);
        setLogoUploadSuccess(true);

        // Auto-save relative URL to organization invoiceSettings
        await organizationApi.updateOrganization({
          invoiceSettings: {
            firmLogoUrl: relativeUrl,
          },
        });
      }
    } catch (err: any) {
      console.error("Failed to upload firm logo to Google Drive:", err);
      // Fallback: keep local URL if upload fails so user can still preview
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setFirmLogoUrl(null);
    setLogoUploadSuccess(false);
    try {
      await organizationApi.updateOrganization({
        invoiceSettings: {
          firmLogoUrl: null,
        },
      });
    } catch (err) {
      console.error("Failed to clear firm logo:", err);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setDigitalSignatureUrl(localUrl);
    setIsUploadingSignature(true);
    setSignatureUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", DocumentCategory.GENERAL);
      formData.append("description", `Authorised Digital Signature for ${firmName || "Organization"}`);

      const response = await driveApi.uploadDocument(formData);
      if (response && response.data) {
        const driveDoc = response.data;
        // Store only relative path in DB (environment-agnostic, never localhost)
        const relativeUrl = `/api/v1/drive/${driveDoc.driveFileId || driveDoc._id}/preview`;
        const displayUrl = getDirectFilePreviewUrl(relativeUrl);
        setDigitalSignatureUrl(displayUrl);
        setSignatureUploadSuccess(true);

        // Auto-save relative URL to organization invoiceSettings
        await organizationApi.updateOrganization({
          invoiceSettings: {
            digitalSignatureUrl: relativeUrl,
          },
        });
      }
    } catch (err: any) {
      console.error("Failed to upload digital signature to Google Drive:", err);
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const handleRemoveSignature = async () => {
    setDigitalSignatureUrl(null);
    setSignatureUploadSuccess(false);
    try {
      await organizationApi.updateOrganization({
        invoiceSettings: {
          digitalSignatureUrl: null,
        },
      });
    } catch (err) {
      console.error("Failed to clear digital signature:", err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
            <span>🎨 Professional Branding</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Select your preferred invoice layout, customize document brand colors, and manage firm logos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLivePreviewModal(true)}
          className="px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-main)] hover:border-[var(--primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Eye className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>Full Screen Preview</span>
        </button>
      </div>

      {/* 1. Invoice Template Selection (Matches Image 5 Exactly) */}
      <div className="space-y-3 px-30">
        <div>
          <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
            Invoice Template
          </h4>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Select a layout. The preview reflects your firm name and Invoice color.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Classic Template */}
          <div
            onClick={() => setTemplate("classic")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between group hover:shadow-xl ${template === "classic"
              ? "border-[#4F46E5] bg-white dark:bg-slate-900 shadow-md ring-2 ring-[#4F46E5]/20"
              : "border-[var(--border-strong)] hover:border-gray-300  dark:hover:border-gray-700 bg-[var(--bg-surface)]"
              }`}
          >
            {/* Miniature Scaled Sheet of Classic Invoice */}
            <div className="w-full h-80 bg-white border border-gray-200/90 rounded-2xl overflow-hidden p-3 flex flex-col justify-between shadow-xs mb-3.5 select-none relative text-[8px]">
              {/* Hover Overlay with "Full Preview" Button */}
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center rounded-2xl z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemplate("classic");
                    setShowLivePreviewModal(true);
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 hover:bg-[#4F46E5] hover:text-white cursor-pointer border border-white/40 dark:border-slate-700"
                >
                  <Eye className="w-4 h-4 text-[#4F46E5] group-hover:text-white" />
                  <span>Full Preview</span>
                </button>
              </div>

              {/* Top Solid Accent Bar (Plain, No Stripes) */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: activeInvoiceColor }}
              />

              {/* Header Mini: Plain transparent background for Classic */}
              <div className="flex justify-between items-start pt-1.5 px-0.5 border-b border-gray-100 pb-1">
                <div className="flex items-center gap-1.5">
                  <CaIndiaLogo size={18} />
                  <span className="text-[9px] font-bold text-gray-800">Your Firm Name</span>
                </div>
                <div className="text-right">
                  <span
                    className="text-[9px] font-bold block"
                    style={{ color: activeInvoiceColor }}
                  >
                    Tax Invoice
                  </span>
                  <span className="text-[6.5px] font-mono text-gray-400">INV/2024-001</span>
                </div>
              </div>

              {/* Bill To & Dates Mini */}
              <div className="flex justify-between items-start text-[6px] gap-2 pt-1">
                <div className="space-y-0.5">
                  <span
                    className="font-bold text-[6.5px] block uppercase"
                    style={{ color: activeInvoiceColor }}
                  >
                    BILL TO
                  </span>
                  <span className="font-bold text-[7.5px] text-gray-800 block">
                    Rajesh Exports Pvt. Ltd.
                  </span>
                  <span className="text-gray-400 block truncate max-w-[150px]">
                    B-12, Industrial Area Phase-II, Koramangala Bengaluru, Karnataka - 560058
                  </span>
                  <span className="text-gray-500 block">GSTIN: 29AABCU9603R1ZM</span>
                  <span className="text-gray-500 block">PAN: AABCU9603R</span>
                  <span className="text-gray-500 block">TAN: BLRR12345E</span>
                  <span className="text-gray-500 block">Contact: Rajesh Kumar</span>
                  <span className="text-gray-500 block">✉ accounts@rajeshexports.com  📱 9876543210</span>
                  <span className="text-gray-500 block">POS: 29 – Karnataka</span>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <span className="text-gray-400 block text-[6.5px]">Invoice Date</span>
                  <span className="font-bold text-gray-800 text-[7px] block">01-Jun-2024</span>
                  <span className="text-gray-400 block text-[6.5px] pt-1">Due Date</span>
                  <span className="font-bold text-gray-800 text-[7px] block">15-Jun-2024</span>
                </div>
              </div>

              {/* Table Mini */}
              <div className="rounded-sm overflow-hidden my-1">
                <div
                  className="px-1.5 py-0.5 flex justify-between text-[6.5px] text-white font-bold"
                  style={{ backgroundColor: activeInvoiceColor }}
                >
                  <span className="w-4">#</span>
                  <span className="flex-1">Description</span>
                  <span className="w-10 text-center">HSN/SAC</span>
                  <span className="w-5 text-center">Qty</span>
                  <span className="w-10 text-right">Rate</span>
                  <span className="w-10 text-right">Taxable</span>
                  <span className="w-8 text-center">GST %</span>
                  <span className="w-8 text-right">CGST</span>
                  <span className="w-8 text-right">SGST</span>
                  <span className="w-10 text-right">Total</span>
                </div>
                <div className="divide-y divide-gray-100 text-[6px] text-gray-600 bg-white">
                  <div className="px-1.5 py-0.5 flex justify-between">
                    <span className="w-4 text-gray-400">1</span>
                    <span className="flex-1 font-medium text-gray-800">GST Return Filing (GSTR-1)</span>
                    <span className="w-10 text-center font-mono text-gray-500">998211</span>
                    <span className="w-5 text-center">1</span>
                    <span className="w-10 text-right font-mono">₹1,500.00</span>
                    <span className="w-10 text-right font-mono">₹1,500.00</span>
                    <span className="w-8 text-center">18%</span>
                    <span className="w-8 text-right font-mono">₹135.00</span>
                    <span className="w-8 text-right font-mono">₹135.00</span>
                    <span className="w-10 text-right font-mono font-bold text-gray-800">₹1,770.00</span>
                  </div>
                  <div className="px-1.5 py-0.5 flex justify-between">
                    <span className="w-4 text-gray-400">2</span>
                    <span className="flex-1 font-medium text-gray-800">Income Tax Return (ITR-3)</span>
                    <span className="w-10 text-center font-mono text-gray-500">998231</span>
                    <span className="w-5 text-center">1</span>
                    <span className="w-10 text-right font-mono">₹2,500.00</span>
                    <span className="w-10 text-right font-mono">₹2,500.00</span>
                    <span className="w-8 text-center">18%</span>
                    <span className="w-8 text-right font-mono">₹225.00</span>
                    <span className="w-8 text-right font-mono">₹225.00</span>
                    <span className="w-10 text-right font-mono font-bold text-gray-800">₹2,950.00</span>
                  </div>
                  <div className="px-1.5 py-0.5 flex justify-between">
                    <span className="w-4 text-gray-400">3</span>
                    <span className="flex-1 font-medium text-gray-800">TDS Return Filing (Form 26Q)</span>
                    <span className="w-10 text-center font-mono text-gray-500">998211</span>
                    <span className="w-5 text-center">1</span>
                    <span className="w-10 text-right font-mono">₹800.00</span>
                    <span className="w-10 text-right font-mono">₹800.00</span>
                    <span className="w-8 text-center">18%</span>
                    <span className="w-8 text-right font-mono">₹72.00</span>
                    <span className="w-8 text-right font-mono">₹72.00</span>
                    <span className="w-10 text-right font-mono font-bold text-gray-800">₹944.00</span>
                  </div>
                </div>
              </div>

              {/* Totals & Amount in words */}
              <div className="flex justify-between items-end text-[6px] pt-1">
                <div className="text-gray-400 space-y-0.5 max-w-[140px]">
                  <span className="text-[5.5px] uppercase font-bold block">Amount in Words</span>
                  <span className="italic text-gray-600 block">Rupees Five Thousand Six Hundred Sixty Four Only</span>
                </div>
                <div className="w-28 space-y-0.5 text-right">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">₹4,800.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Taxable Amount</span>
                    <span className="font-mono">₹4,800.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>CGST (9%)</span>
                    <span className="font-mono">₹432.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>SGST (9%)</span>
                    <span className="font-mono">₹432.00</span>
                  </div>
                  <div className="flex justify-between font-bold pt-0.5 border-t border-gray-200" style={{ color: activeInvoiceColor }}>
                    <span>Total</span>
                    <span className="font-mono">₹5,664.00</span>
                  </div>
                </div>
              </div>

              {/* Bottom Solid Accent Bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: activeInvoiceColor }}
              />
            </div>

            {/* Template Info (Matches Image Clean Footer) */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h5 className="text-sm font-bold text-[var(--text-main)]">Classic</h5>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  Colored bars top & bottom with a branded table header. Professional and trusted.
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${template === "classic"
                  ? "bg-[#4F46E5] border-[#4F46E5] text-white shadow-xs"
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
                  }`}
              >
                {template === "classic" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Card 2: Modern Template (Popular) */}
          <div
            onClick={() => setTemplate("modern")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between group hover:shadow-xl ${template === "modern"
              ? "border-[#4F46E5] bg-white dark:bg-slate-900 shadow-md ring-2 ring-[#4F46E5]/20"
              : "border-[var(--border-strong)] hover:border-gray-300 dark:hover:border-gray-700 bg-[var(--bg-surface)]"
              }`}
          >
            {/* Miniature Scaled Sheet of Modern Invoice */}
            <div className="w-full h-80 bg-white border border-gray-200/90 rounded-2xl overflow-hidden p-3 flex flex-col justify-between shadow-xs mb-3.5 select-none relative text-[8px]">
              {/* Hover Overlay with "Full Preview" Button */}
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center rounded-2xl z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemplate("modern");
                    setShowLivePreviewModal(true);
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 hover:bg-[#4F46E5] hover:text-white cursor-pointer border border-white/40 dark:border-slate-700"
                >
                  <Eye className="w-4 h-4 text-[#4F46E5] group-hover:text-white" />
                  <span>Full Preview</span>
                </button>
              </div>

              {/* Top Accent Striped Bar */}
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{
                  backgroundColor: activeInvoiceColor,
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.25) 4px, transparent 4px, transparent 8px)",
                }}
              />

              {/* Header Mini with soft tinted background */}
              <div
                className="flex justify-between items-start -mx-3 -mt-1 px-3 py-2 border-b border-indigo-100/70"
                style={{
                  backgroundColor: `color-mix(in srgb, ${activeInvoiceColor} 6%, #f8faff)`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <CaIndiaLogo size={18} />
                  <span className="text-[9px] font-bold text-gray-900">Your Firm Name</span>
                </div>
                <div className="text-right">
                  <span
                    className="text-[9px] font-extrabold uppercase block"
                    style={{ color: activeInvoiceColor }}
                  >
                    TAX INVOICE
                  </span>
                  <span className="text-[6.5px] font-mono text-gray-400">INV/2024-001</span>
                </div>
              </div>

              {/* Bill To & Meta Two Rounded Boxes */}
              <div className="grid grid-cols-5 gap-1.5 pt-1 text-[6px]">
                <div className="col-span-3 p-1.5 rounded-lg border border-gray-100 bg-gray-50/70 space-y-0.5">
                  <span
                    className="font-bold text-[6.5px] block uppercase"
                    style={{ color: activeInvoiceColor }}
                  >
                    BILL TO
                  </span>
                  <span className="font-bold text-[7px] text-gray-800 block truncate">
                    Rajesh Exports Pvt. Ltd.
                  </span>
                  <span className="text-gray-400 block truncate">
                    B-12, Industrial Area Phase-II, Koramangala Bengaluru
                  </span>
                  <span className="text-gray-500 block truncate">GSTIN: 29AABCU9603R1ZM</span>
                  <span className="text-gray-500 block">PAN: AABCU9603R | TAN: BLRR12345E</span>
                  <span className="text-gray-500 block truncate">Contact: Rajesh Kumar  📱 9876543210</span>
                  <span className="text-gray-500 block">POS: 29 – Karnataka</span>
                </div>
                <div className="col-span-2 p-1.5 rounded-lg border border-gray-100 bg-gray-50/70 space-y-1">
                  <div>
                    <span
                      className="font-bold text-[5.5px] block uppercase"
                      style={{ color: activeInvoiceColor }}
                    >
                      INVOICE NO.
                    </span>
                    <span className="font-mono font-bold text-gray-800 text-[6.5px] block">
                      INV/2024-001
                    </span>
                  </div>
                  <div className="border-t border-gray-200/60 pt-0.5">
                    <span
                      className="font-bold text-[5.5px] block uppercase"
                      style={{ color: activeInvoiceColor }}
                    >
                      INVOICE DATE
                    </span>
                    <span className="font-semibold text-gray-800 text-[6px] block">
                      01-Jun-2024
                    </span>
                  </div>
                  <div className="border-t border-gray-200/60 pt-0.5">
                    <span
                      className="font-bold text-[5.5px] block uppercase"
                      style={{ color: activeInvoiceColor }}
                    >
                      DUE DATE
                    </span>
                    <span className="font-semibold text-gray-800 text-[6px] block">
                      15-Jun-2024
                    </span>
                  </div>
                </div>
              </div>

              {/* Table Mini */}
              <div className="rounded-sm overflow-hidden my-1">
                <div
                  className="px-1.5 py-0.5 flex justify-between text-[6.5px] text-white font-bold"
                  style={{ backgroundColor: activeInvoiceColor }}
                >
                  <span className="w-4">#</span>
                  <span className="flex-1">DESCRIPTION</span>
                  <span className="w-10 text-center">HSN/SAC</span>
                  <span className="w-5 text-center">QTY</span>
                  <span className="w-10 text-right">RATE</span>
                  <span className="w-10 text-right">TAXABLE</span>
                  <span className="w-8 text-center">GST %</span>
                  <span className="w-8 text-right">CGST</span>
                  <span className="w-8 text-right">SGST</span>
                  <span className="w-10 text-right">TOTAL</span>
                </div>
                <div className="divide-y divide-gray-100 text-[6px] text-gray-600 bg-white">
                  <div className="px-1.5 py-0.5 flex justify-between">
                    <span className="w-4 text-gray-400">1</span>
                    <span className="flex-1 font-medium text-gray-800">GST Return Filing (GSTR-1)</span>
                    <span className="w-10 text-center font-mono text-gray-500">998211</span>
                    <span className="w-5 text-center">1</span>
                    <span className="w-10 text-right font-mono">₹1,500.00</span>
                    <span className="w-10 text-right font-mono">₹1,500.00</span>
                    <span className="w-8 text-center">18%</span>
                    <span className="w-8 text-right font-mono">₹135.00</span>
                    <span className="w-8 text-right font-mono">₹135.00</span>
                    <span className="w-10 text-right font-mono font-bold text-gray-800">₹1,770.00</span>
                  </div>
                  <div className="px-1.5 py-0.5 flex justify-between">
                    <span className="w-4 text-gray-400">2</span>
                    <span className="flex-1 font-medium text-gray-800">Income Tax Return (ITR-3)</span>
                    <span className="w-10 text-center font-mono text-gray-500">998231</span>
                    <span className="w-5 text-center">1</span>
                    <span className="w-10 text-right font-mono">₹2,500.00</span>
                    <span className="w-10 text-right font-mono">₹2,500.00</span>
                    <span className="w-8 text-center">18%</span>
                    <span className="w-8 text-right font-mono">₹225.00</span>
                    <span className="w-8 text-right font-mono">₹225.00</span>
                    <span className="w-10 text-right font-mono font-bold text-gray-800">₹2,950.00</span>
                  </div>
                  <div className="px-1.5 py-0.5 flex justify-between">
                    <span className="w-4 text-gray-400">3</span>
                    <span className="flex-1 font-medium text-gray-800">TDS Return Filing (Form 26Q)</span>
                    <span className="w-10 text-center font-mono text-gray-500">998211</span>
                    <span className="w-5 text-center">1</span>
                    <span className="w-10 text-right font-mono">₹800.00</span>
                    <span className="w-10 text-right font-mono">₹800.00</span>
                    <span className="w-8 text-center">18%</span>
                    <span className="w-8 text-right font-mono">₹72.00</span>
                    <span className="w-8 text-right font-mono">₹72.00</span>
                    <span className="w-10 text-right font-mono font-bold text-gray-800">₹944.00</span>
                  </div>
                </div>
              </div>

              {/* Amount In Words & Totals Boxes */}
              <div className="grid grid-cols-5 gap-1.5 pt-1 text-[6px]">
                <div className="col-span-3 p-1.5 rounded-lg border border-purple-100 bg-[#f5f3ff] space-y-0.5">
                  <span
                    className="font-bold text-[5.5px] block uppercase"
                    style={{ color: activeInvoiceColor }}
                  >
                    AMOUNT IN WORDS
                  </span>
                  <span className="italic text-gray-700 block">
                    Rupees Five Thousand Six Hundred Sixty Four Only
                  </span>
                </div>
                <div className="col-span-2 p-1.5 rounded-lg border border-gray-100 bg-gray-50/70 space-y-0.5 text-right">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">₹4,800.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Taxable Amount</span>
                    <span className="font-mono">₹4,800.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>CGST (9%)</span>
                    <span className="font-mono">₹432.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>SGST (9%)</span>
                    <span className="font-mono">₹432.00</span>
                  </div>
                  <div
                    className="flex justify-between font-bold px-1 py-0.5 rounded text-white text-[6.5px] mt-0.5"
                    style={{ backgroundColor: activeInvoiceColor }}
                  >
                    <span>Total Amount</span>
                    <span className="font-mono">₹5,664.00</span>
                  </div>
                </div>
              </div>

              {/* Modern Full Horizontal Notes with no padding/margin to document, similar to header */}
              <div
                className="-mx-3 -mb-3 p-2 border-t border-indigo-100/70 flex justify-between items-center text-[5.5px]"
                style={{
                  backgroundColor: `color-mix(in srgb, ${activeInvoiceColor} 4%, #f8faff)`,
                }}
              >
                <div>
                  <span className="text-gray-400 font-bold block text-[5px]">NOTES</span>
                  <span className="text-gray-500 truncate block max-w-[120px]">Thank you for your business.</span>
                </div>
                <div className="text-center shrink-0">
                  <div className="w-12 border-t border-gray-400 mb-0.5" />
                  <span className="text-gray-600 font-bold text-[5px]">Authorised Signatory</span>
                </div>
              </div>
            </div>

            {/* Template Info (Matches Image Clean Footer) */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">Modern</h5>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Popular
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  Bold full-width header block, clean gray table, highlighted total box.
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${template === "modern"
                  ? "bg-[#4F46E5] border-[#4F46E5] text-white shadow-xs"
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
                  }`}
              >
                {template === "modern" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Card 3: Minimal Template */}
          <div
            onClick={() => setTemplate("minimal")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between group hover:shadow-xl ${template === "minimal"
              ? "border-[#4F46E5] bg-white dark:bg-slate-900 shadow-md ring-2 ring-[#4F46E5]/20"
              : "border-[var(--border-strong)] hover:border-gray-300 dark:hover:border-gray-700 bg-[var(--bg-surface)]"
              }`}
          >
            {/* Miniature Scaled Sheet of Minimal Invoice */}
            <div className="w-full h-80 bg-white border border-gray-200/90 rounded-2xl overflow-hidden p-3 flex flex-col justify-between shadow-xs mb-3.5 select-none relative text-[8px]">
              {/* Hover Overlay with "Full Preview" Button */}
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center rounded-2xl z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemplate("minimal");
                    setShowLivePreviewModal(true);
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 hover:bg-black hover:text-white cursor-pointer border border-white/40 dark:border-slate-700"
                >
                  <Eye className="w-4 h-4 text-black dark:text-white group-hover:text-white" />
                  <span>Full Preview</span>
                </button>
              </div>

              {/* Header Mini with Bold Black Line */}
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <CaIndiaLogo size={18} />
                    <span className="text-[9px] font-black text-black">Your Firm Name</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-black block">TAX INVOICE</span>
                    <span className="text-[6.5px] font-mono text-gray-500">INV/2024-001</span>
                    <span className="text-[6px] text-gray-500 block">Date: 01-Jun-2024</span>
                    <span className="text-[6px] text-gray-500 block">Due: 15-Jun-2024</span>
                  </div>
                </div>
                <div className="w-full h-px bg-black mt-1" />
              </div>

              {/* Billed To Mini */}
              <div className="space-y-0.5 text-[6px]">
                <span className="text-[6px] font-bold text-gray-500 uppercase block">BILLED TO</span>
                <span className="font-bold text-[7.5px] text-black block">Rajesh Exports Pvt. Ltd.</span>
                <span className="text-gray-500 block truncate">
                  B-12, Industrial Area Phase-II, Koramangala Bengaluru, Karnataka - 560058
                </span>
                <span className="text-gray-500 block">GSTIN: 29AABCU9603R1ZM | PAN: AABCU9603R</span>
                <span className="text-gray-500 block truncate">Contact: Rajesh Kumar | accounts@rajeshexports.com | 9876543210</span>
                <span className="text-gray-500 block">POS: 29 – Karnataka</span>
              </div>

              {/* Table Mini with Clean Top & Bottom Borders */}
              <div className="border-t border-b border-black py-0.5 my-1">
                <div className="flex justify-between text-[6.5px] text-black font-bold">
                  <span className="w-4">#</span>
                  <span className="flex-1">DESCRIPTION</span>
                  <span className="w-10 text-center">HSN/SAC</span>
                  <span className="w-5 text-center">QTY</span>
                  <span className="w-10 text-right">RATE</span>
                  <span className="w-10 text-right">TAXABLE</span>
                  <span className="w-8 text-center">GST %</span>
                  <span className="w-8 text-right">CGST</span>
                  <span className="w-8 text-right">SGST</span>
                  <span className="w-10 text-right">TOTAL</span>
                </div>
                <div className="divide-y divide-gray-100 text-[6px] text-gray-800">
                  <div className="py-0.5 flex justify-between">
                    <span className="w-4 text-gray-400">1</span>
                    <span className="flex-1 font-medium">GST Return Filing (GSTR-1)</span>
                    <span className="w-10 text-center font-mono text-gray-500">998211</span>
                    <span className="w-5 text-center">1</span>
                    <span className="w-10 text-right font-mono">₹1,500.00</span>
                    <span className="w-10 text-right font-mono">₹1,500.00</span>
                    <span className="w-8 text-center">18%</span>
                    <span className="w-8 text-right font-mono">₹135.00</span>
                    <span className="w-8 text-right font-mono">₹135.00</span>
                    <span className="w-10 text-right font-mono font-bold">₹1,770.00</span>
                  </div>
                  <div className="py-0.5 flex justify-between">
                    <span className="w-4 text-gray-400">2</span>
                    <span className="flex-1 font-medium">Income Tax Return (ITR-3)</span>
                    <span className="w-10 text-center font-mono text-gray-500">998231</span>
                    <span className="w-5 text-center">1</span>
                    <span className="w-10 text-right font-mono">₹2,500.00</span>
                    <span className="w-10 text-right font-mono">₹2,500.00</span>
                    <span className="w-8 text-center">18%</span>
                    <span className="w-8 text-right font-mono">₹225.00</span>
                    <span className="w-8 text-right font-mono">₹225.00</span>
                    <span className="w-10 text-right font-mono font-bold">₹2,950.00</span>
                  </div>
                  <div className="py-0.5 flex justify-between">
                    <span className="w-4 text-gray-400">3</span>
                    <span className="flex-1 font-medium">TDS Return Filing (Form 26Q)</span>
                    <span className="w-10 text-center font-mono text-gray-500">998211</span>
                    <span className="w-5 text-center">1</span>
                    <span className="w-10 text-right font-mono">₹800.00</span>
                    <span className="w-10 text-right font-mono">₹800.00</span>
                    <span className="w-8 text-center">18%</span>
                    <span className="w-8 text-right font-mono">₹72.00</span>
                    <span className="w-8 text-right font-mono">₹72.00</span>
                    <span className="w-10 text-right font-mono font-bold">₹944.00</span>
                  </div>
                </div>
              </div>

              {/* Totals & Amount in words */}
              <div className="flex justify-between items-end text-[6px] pt-1">
                <div className="border border-gray-200 rounded p-1 max-w-[140px] space-y-0.5">
                  <span className="text-[5.5px] uppercase font-bold text-gray-500 block">AMOUNT IN WORDS</span>
                  <span className="italic text-gray-700 block">Rupees Five Thousand Six Hundred Sixty Four Only</span>
                </div>
                <div className="w-28 space-y-0.5 text-right">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">₹4,800.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Taxable Amount</span>
                    <span className="font-mono">₹4,800.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>CGST (9%)</span>
                    <span className="font-mono">₹432.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>SGST (9%)</span>
                    <span className="font-mono">₹432.00</span>
                  </div>
                  <div className="flex justify-between font-bold pt-0.5 border-t border-black text-black">
                    <span>Total</span>
                    <span className="font-mono">₹5,664.00</span>
                  </div>
                </div>
              </div>

              {/* Payment Details Mini */}
              <div className="text-[5.5px] text-gray-400 font-semibold uppercase tracking-wider pt-0.5">
                PAYMENT DETAILS
              </div>
            </div>

            {/* Template Info (Matches Image Clean Footer) */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h5 className="text-sm font-bold text-[var(--text-main)]">Minimal</h5>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  All black & white. No color. Clean, print-friendly, and distraction-free.
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${template === "minimal"
                  ? "bg-[#4F46E5] border-[#4F46E5] text-white shadow-xs"
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
                  }`}
              >
                {template === "minimal" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Document Colors (Matches Image 5 Exactly) */}
      <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
        <div>
          <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
            Document Colors
          </h4>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Each document type has its own accent color — applied to templates, badges, and previews.
          </p>
        </div>

        {/* Click outside backdrop for color picker popovers */}
        {openPickerId && (
          <div
            className="fixed inset-0 z-30 bg-transparent"
            onClick={() => setOpenPickerId(null)}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {documentColors.map((item) => {
            const isPickerOpen = openPickerId === item.id;
            const currentColorName = item.name || getColorName(item.hex);

            return (
              <div
                key={item.id}
                className={`relative p-4 rounded-2xl border bg-[var(--bg-surface)] transition-all shadow-md hover:shadow-lg ${isPickerOpen
                  ? "border-[#4F46E5] ring-2 ring-[#4F46E5]/20 z-40"
                  : "border-[var(--border-subtle)] hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
              >
                {/* Top Accent Line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
                  style={{ backgroundColor: item.hex }}
                />

                {/* Card Header: Code Badge + Label */}
                <div className="flex items-center gap-2 mb-3 pt-1">
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                    style={{
                      backgroundColor: `${item.hex}18`,
                      color: item.hex,
                    }}
                  >
                    {item.code}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-main)]">
                    {item.label}
                  </span>
                </div>

                {/* Color Selector Trigger Button (Matches User Screenshot) */}
                <button
                  type="button"
                  onClick={() => setOpenPickerId(isPickerOpen ? null : item.id)}
                  className="w-full h-11 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-hover)] hover:bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center justify-between cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-md shrink-0 shadow-xs"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span className="text-xs font-semibold text-[var(--text-main)]">
                      {currentColorName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[var(--text-muted)] font-medium">
                      {item.hex.toUpperCase()}
                    </span>
                    {isPickerOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Dropdown Popover matching the user's screenshot exactly */}
                {isPickerOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                    {/* Popover Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
                      <div
                        className="w-9 h-9 rounded-xl shrink-0 shadow-xs"
                        style={{ backgroundColor: item.hex }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {item.label}
                        </h4>
                        <span className="text-xs font-mono text-gray-400 font-medium">
                          {item.hex.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* SUGGESTED 20-Color Grid */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        SUGGESTED
                      </span>
                      <div className="grid grid-cols-5 gap-2">
                        {SUGGESTED_COLORS.map((col) => {
                          const isSelected = item.hex.toLowerCase() === col.hex.toLowerCase();
                          return (
                            <button
                              key={col.hex}
                              type="button"
                              onClick={() => {
                                handleColorChange(item.id, col.hex, col.name);
                              }}
                              className={`relative aspect-square rounded-xl transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ${isSelected ? "scale-105" : "hover:opacity-90"
                                }`}
                              style={{
                                backgroundColor: col.hex,
                                boxShadow: isSelected
                                  ? `0 0 0 2px white, 0 0 0 4px ${col.hex}`
                                  : undefined,
                              }}
                              title={`${col.name} (${col.hex})`}
                            >
                              {isSelected && (
                                <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-xs" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* CUSTOM Color Picker Wheel */}
                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        CUSTOM
                      </span>
                      <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all group">
                        <div className="w-8 h-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0 group-hover:border-[#4F46E5] transition-colors">
                          <div
                            className="w-4 h-4 rounded-full shadow-xs"
                            style={{ backgroundColor: item.hex }}
                          />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block group-hover:text-[#4F46E5] transition-colors">
                            Pick any color
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            Click to open color wheel
                          </span>
                        </div>
                        <input
                          type="color"
                          value={item.hex}
                          onChange={(e) => handleColorChange(item.id, e.target.value, "Custom")}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Firm Logo & Digital Signature (Matches Image 4 Exactly) */}
      <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Firm Logo Upload Box */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-[var(--text-main)]">
              Firm Logo
            </span>
            <div className="relative border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors rounded-2xl p-6 text-center bg-[var(--bg-surface)] flex flex-col items-center justify-center min-h-[140px] group">
              {isUploadingLogo ? (
                <div className="flex flex-col items-center gap-2 py-4 animate-in fade-in">
                  <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Uploading logo to Google Drive...
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Syncing with 08_General_Documents folder
                  </span>
                </div>
              ) : firmLogoUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-1 rounded-xl bg-white border border-gray-100 dark:border-gray-800 shadow-xs">
                    <img
                      src={getDirectFilePreviewUrl(firmLogoUrl)}
                      alt="Firm Logo"
                      crossOrigin="anonymous"
                      className="max-h-16 object-contain rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                    <Cloud className="w-3 h-3 text-emerald-600" />
                    <span>Saved to Google Drive</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer mt-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Logo</span>
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-[var(--primary)] transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    Click or drag to upload logo
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-[#4F46E5]" />
                    <span>Direct sync to Google Drive · PNG, JPG, SVG</span>
                  </span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Digital Signature Upload Box */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-[var(--text-main)]">
              Digital Signature
            </span>
            <div className="relative border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors rounded-2xl p-6 text-center bg-[var(--bg-surface)] flex flex-col items-center justify-center min-h-[140px] group">
              {isUploadingSignature ? (
                <div className="flex flex-col items-center gap-2 py-4 animate-in fade-in">
                  <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Uploading signature to Google Drive...
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Syncing with 08_General_Documents folder
                  </span>
                </div>
              ) : digitalSignatureUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-1 rounded-xl bg-white border border-gray-100 dark:border-gray-800 shadow-xs">
                    <img
                      src={getDirectFilePreviewUrl(digitalSignatureUrl)}
                      alt="Digital Signature"
                      crossOrigin="anonymous"
                      className="max-h-16 object-contain rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                    <Cloud className="w-3 h-3 text-emerald-600" />
                    <span>Saved to Google Drive</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveSignature}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer mt-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Signature</span>
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-[var(--primary)] transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    Click or drag to upload signature
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-[#4F46E5]" />
                    <span>Direct sync to Google Drive · PNG with transparent bg</span>
                  </span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Show CA Authentic Logo Toggle (Matches Image 4 Exactly) */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[var(--text-main)] block">
            Show CA Authentic Logo on Invoice
          </span>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            When enabled, the CA Authentic Logo appears in the bottom-left corner of invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCaLogo(!showCaLogo)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showCaLogo ? "bg-[#4F46E5]" : "bg-gray-300 dark:bg-gray-700"
            }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showCaLogo ? "translate-x-5" : "translate-x-0"
              }`}
          />
        </button>
      </div>

      {/* 5. CA Notice Alert Box (Matches Image 4 Exactly) */}
      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 flex items-center gap-4 text-xs text-amber-900 dark:text-amber-200">
        <div className="shrink-0">
          <CaIndiaLogo size={38} />
        </div>
        <p className="leading-relaxed text-[11px]">
          <span className="font-bold">This CA Authentic Logo</span> is used as the fallback on
          invoices when your firm logo is not uploaded, or whenever{" "}
          <span className="font-bold">Show CA Authentic Logo on Invoice</span> is enabled.
        </p>
      </div>

      {/* Bottom Navigation & Save Button */}
      <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
        {onPrevious ? (
          <button
            type="button"
            onClick={onPrevious}
            className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous: Bank & Payments</span>
          </button>
        ) : <div />}

        <div className="flex items-center gap-3">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next: Document Settings</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Full Live Preview Modal with Template Selection */}
      {showLivePreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                    Choose Invoice Template Preview
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Click between formats to choose the exact statutory layout for your clients.
                </p>
              </div>

              {/* Template Switcher Tabs inside Modal */}
              <div className="flex items-center gap-1 bg-[#F6F4F2] dark:bg-slate-800 p-1 rounded-xl border border-[var(--border-subtle)]">
                {(["classic", "modern", "minimal"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTemplate(fmt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${template === fmt
                      ? "bg-white dark:bg-slate-900 text-[#4F46E5] shadow-xs scale-[1.02]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                  >
                    {fmt}
                    {fmt === "modern" && (
                      <span className="ml-1 text-[9px] text-emerald-600 font-extrabold">★</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowLivePreviewModal(false)}
                className="w-8 h-8 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center cursor-pointer font-bold text-base"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Exact Invoice Preview */}
            <div className="max-h-[72vh] overflow-y-auto rounded-xl pr-1 bg-gray-50/50 dark:bg-slate-900/30 p-2 sm:p-4 border border-[var(--border-subtle)]">
              <InvoiceLivePreview
                template={template}
                accentColor={activeInvoiceColor}
                firmName={firmName}
                firmLogoUrl={firmLogoUrl}
                digitalSignatureUrl={digitalSignatureUrl}
                showCaLogo={showCaLogo}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                <span>Selected:</span>
                <span className="font-bold text-[#4F46E5] uppercase">{template} Template</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLivePreviewModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setShowLivePreviewModal(false)}
                  className="px-5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Use This Format</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
