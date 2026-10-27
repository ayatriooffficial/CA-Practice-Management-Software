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
  Sparkles,
} from "lucide-react";
import { CaIndiaLogo } from "@/components/ui/CaIndiaLogo";
import { InvoiceLivePreview } from "./InvoiceLivePreview";

export interface DocumentColorSetting {
  id: string;
  code: string;
  label: string;
  name: string;
  hex: string;
}

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

  const activeInvoiceColor =
    documentColors.find((c) => c.id === "invoice")?.hex || "#4F46E5";

  const handleColorChange = (id: string, newHex: string) => {
    setDocumentColors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hex: newHex } : c))
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFirmLogoUrl(url);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setDigitalSignatureUrl(url);
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
            Customize invoice layout, document brand colors, firm logos, and CA authenticity markers.
          </p>
        </div>

        {/* Live Preview Toggle Button */}
        <button
          type="button"
          onClick={() => setShowLivePreviewModal(true)}
          className="px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-main)] hover:border-[var(--primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Eye className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>Full Invoice Preview</span>
        </button>
      </div>

      {/* 1. Invoice Template Selection (Matches Image 5) */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
            Invoice Template
          </h4>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Select a layout. The preview reflects your firm name and Invoice color.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Classic Template Card */}
          <div
            onClick={() => setTemplate("classic")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              template === "classic"
                ? "border-[#4F46E5] bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-[#4F46E5]/20"
                : "border-[var(--border-subtle)] hover:border-gray-300 dark:hover:border-gray-700 bg-[var(--bg-surface)]"
            }`}
          >
            {/* Template Visual Thumbnail Simulation */}
            <div className="w-full h-36 bg-white border border-gray-200 rounded-lg overflow-hidden p-2.5 flex flex-col justify-between shadow-xs mb-3 select-none">
              <div className="w-full h-1.5 bg-[#4F46E5] rounded-full" />
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#004A8F]" />
                  <div className="h-2 w-12 bg-gray-300 rounded" />
                </div>
                <div className="h-2 w-10 bg-[#4F46E5] rounded" />
              </div>
              <div className="space-y-1 px-1">
                <div className="h-2.5 w-full bg-[#4F46E5] rounded-xs" />
                <div className="h-1.5 w-full bg-gray-100 rounded-xs" />
                <div className="h-1.5 w-full bg-gray-100 rounded-xs" />
              </div>
              <div className="flex justify-between items-center px-1 pt-1 border-t border-gray-100">
                <div className="h-1.5 w-12 bg-gray-200 rounded" />
                <div className="h-2.5 w-8 bg-[#4F46E5] rounded-xs" />
              </div>
              <div className="w-full h-1 bg-[#4F46E5] rounded-full" />
            </div>

            {/* Template Title & Description */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold text-[var(--text-main)]">Classic</h5>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  Colored bars top & bottom with a branded table header. Professional and trusted.
                </p>
              </div>

              {/* Selection Indicator Circle */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                  template === "classic"
                    ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {template === "classic" && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Modern Template Card */}
          <div
            onClick={() => setTemplate("modern")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              template === "modern"
                ? "border-[#4F46E5] bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-[#4F46E5]/20"
                : "border-[var(--border-subtle)] hover:border-gray-300 dark:hover:border-gray-700 bg-[var(--bg-surface)]"
            }`}
          >
            {/* Template Visual Thumbnail Simulation */}
            <div className="w-full h-36 bg-white border border-gray-200 rounded-lg overflow-hidden p-2.5 flex flex-col justify-between shadow-xs mb-3 select-none">
              <div className="w-full h-7 bg-slate-100 rounded flex items-center justify-between px-2">
                <div className="h-2 w-10 bg-gray-400 rounded" />
                <div className="h-2 w-8 bg-indigo-600 rounded" />
              </div>
              <div className="space-y-1 px-1">
                <div className="h-2 w-full bg-slate-200 rounded-xs" />
                <div className="h-1.5 w-full bg-gray-100 rounded-xs" />
                <div className="h-1.5 w-full bg-gray-100 rounded-xs" />
              </div>
              <div className="flex justify-between items-center px-1 pt-1 border-t border-gray-100">
                <div className="h-2 w-10 bg-gray-200 rounded" />
                <div className="h-3 w-10 bg-indigo-600 rounded-xs" />
              </div>
            </div>

            {/* Template Title & Description */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h5 className="text-xs font-bold text-[var(--text-main)]">Modern</h5>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Popular
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  Bold full-width header block, clean gray table, highlighted total box.
                </p>
              </div>

              {/* Selection Indicator Circle */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                  template === "modern"
                    ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {template === "modern" && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Minimal Template Card */}
          <div
            onClick={() => setTemplate("minimal")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              template === "minimal"
                ? "border-black dark:border-white bg-gray-50/50 dark:bg-gray-900/50 shadow-md ring-2 ring-black/10"
                : "border-[var(--border-subtle)] hover:border-gray-300 dark:hover:border-gray-700 bg-[var(--bg-surface)]"
            }`}
          >
            {/* Template Visual Thumbnail Simulation */}
            <div className="w-full h-36 bg-white border border-gray-200 rounded-lg overflow-hidden p-2.5 flex flex-col justify-between shadow-xs mb-3 select-none">
              <div className="flex justify-between items-center px-1 border-b border-gray-800 pb-1.5">
                <div className="h-2.5 w-12 bg-black rounded-xs" />
                <div className="h-2 w-8 bg-gray-800 rounded-xs" />
              </div>
              <div className="space-y-1 px-1">
                <div className="h-2 w-full bg-gray-300 rounded-xs" />
                <div className="h-1.5 w-full bg-gray-100 rounded-xs" />
                <div className="h-1.5 w-full bg-gray-100 rounded-xs" />
              </div>
              <div className="flex justify-between items-center px-1 pt-1 border-t border-black">
                <div className="h-2 w-10 bg-gray-600 rounded-xs" />
                <div className="h-2.5 w-8 bg-black rounded-xs" />
              </div>
            </div>

            {/* Template Title & Description */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold text-[var(--text-main)]">Minimal</h5>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  All black & white. No color. Clean, print-friendly, and distraction-free.
                </p>
              </div>

              {/* Selection Indicator Circle */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                  template === "minimal"
                    ? "bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {template === "minimal" && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Document Colors (Matches Image 5) */}
      <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
        <div>
          <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
            Document Colors
          </h4>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Each document type has its own accent color — applied to templates, badges, and previews.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {documentColors.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-gray-700 transition-all flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: `${item.hex}18`,
                    color: item.hex,
                  }}
                >
                  {item.code}
                </span>
                <span className="text-xs font-semibold text-[var(--text-main)]">
                  {item.label}
                </span>
              </div>

              {/* Color swatch & Hex selector */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={item.hex}
                  onChange={(e) => handleColorChange(item.id, e.target.value)}
                  className="w-5 h-5 rounded-full border-0 cursor-pointer p-0 bg-transparent"
                  title={`Change color for ${item.label}`}
                />
                <span className="text-[11px] font-mono text-[var(--text-muted)] font-medium">
                  {item.hex.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Firm Logo & Digital Signature (Matches Image 4) */}
      <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Firm Logo Upload Box */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-[var(--text-main)]">
              Firm Logo
            </span>
            <div className="relative border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors rounded-2xl p-6 text-center bg-[var(--bg-surface)] flex flex-col items-center justify-center min-h-[140px] group">
              {firmLogoUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={firmLogoUrl}
                    alt="Firm Logo"
                    className="max-h-16 object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setFirmLogoUrl(null)}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
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
                  <span className="text-[10px] text-[var(--text-muted)]">
                    PNG, JPG, SVG · max 5 MB
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
              {digitalSignatureUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={digitalSignatureUrl}
                    alt="Digital Signature"
                    className="max-h-16 object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setDigitalSignatureUrl(null)}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
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
                  <span className="text-[10px] text-[var(--text-muted)]">
                    PNG with transparent bg preferred
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

      {/* 4. Show CA Authentic Logo Toggle (Matches Image 4) */}
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
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            showCaLogo ? "bg-[#4F46E5]" : "bg-gray-300 dark:bg-gray-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              showCaLogo ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* 5. CA Notice Alert Box (Matches Image 4) */}
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

      {/* Full Live Preview Modal */}
      {showLivePreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-sm font-bold text-[var(--text-main)]">
                  Live Invoice Preview · {template.toUpperCase()} Template
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLivePreviewModal(false)}
                className="w-7 h-7 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto rounded-lg pr-1">
              <InvoiceLivePreview
                template={template}
                accentColor={activeInvoiceColor}
                firmName={firmName}
                firmLogoUrl={firmLogoUrl}
                digitalSignatureUrl={digitalSignatureUrl}
                showCaLogo={showCaLogo}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
