"use client";

import React from "react";
import {
  Share2,
  Mail,
  MessageSquare,
  Clock,
  ShieldCheck,
  ChevronLeft,
  CheckCircle2,
  Info,
  ChevronRight,
} from "lucide-react";

export interface InvoiceSharingTabProps {
  autoReminder: boolean;
  setAutoReminder: (val: boolean) => void;
  ccInvoiceMail: string;
  setCcInvoiceMail: (val: string) => void;
  enableWhatsAppSharing: boolean;
  setEnableWhatsAppSharing: (val: boolean) => void;
  enableClientPortal: boolean;
  setEnableClientPortal: (val: boolean) => void;
  onPrevious: () => void;
  onComplete: () => void;
  isSaving?: boolean;
}

export const InvoiceSharingTab: React.FC<InvoiceSharingTabProps> = ({
  autoReminder,
  setAutoReminder,
  ccInvoiceMail,
  setCcInvoiceMail,
  enableWhatsAppSharing,
  setEnableWhatsAppSharing,
  enableClientPortal,
  setEnableClientPortal,
  onPrevious,
  onComplete,
  isSaving = false,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <Share2 className="w-5 h-5 text-[var(--primary)]" />
          <span>Invoice Sharing & Automation</span>
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Configure how invoices, payment receipts, and automated collection reminders are delivered to clients.
        </p>
      </div>

      <div className="space-y-4">
        {/* Automatic Reminders Card */}
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-gray-700 transition-all space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[var(--primary)] flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-main)]">
                  Automatic Payment Reminders
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Notify clients automatically before due date to accelerate collections.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAutoReminder(!autoReminder)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoReminder ? "bg-[var(--primary)]" : "bg-gray-300 dark:bg-gray-700"
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoReminder ? "translate-x-5" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          {autoReminder && (
            <div className="p-3 bg-[var(--bg-hover)] rounded-lg text-xs space-y-2 border border-[var(--border-subtle)] animate-in fade-in">
              <span className="font-semibold text-[var(--text-main)] block">
                Reminder Cadence:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3 Days Before Due Date</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>On Due Date</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3 Days Overdue</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CC Invoice Email */}
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-gray-700 transition-all space-y-2 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-main)]">
                Default CC to Invoice Email
              </h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Always send an audit copy of all outgoing invoices to your internal accounting email.
              </p>
            </div>
          </div>

          <div className="pt-1">
            <input
              type="email"
              value={ccInvoiceMail}
              onChange={(e) => setCcInvoiceMail(e.target.value)}
              placeholder="e.g. accounts@yourfirm.com, partners@yourfirm.com"
              className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] shadow-xs"
            />
          </div>
        </div>

        {/* WhatsApp Sharing */}
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-gray-700 transition-all flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-main)]">
                Instant WhatsApp PDF Delivery
              </h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Send professional invoice link and PDF directly to the client’s mobile number.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEnableWhatsAppSharing(!enableWhatsAppSharing)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enableWhatsAppSharing ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
              }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enableWhatsAppSharing ? "translate-x-5" : "translate-x-0"
                }`}
            />
          </button>
        </div>

        {/* Client Portal Payment Link */}
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-gray-700 transition-all flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-main)]">
                Client Self-Service Portal Access
              </h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Provide secure online link where clients can view GST tax breakdown and pay online.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEnableClientPortal(!enableClientPortal)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enableClientPortal ? "bg-[#4F46E5]" : "bg-gray-300 dark:bg-gray-700"
              }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enableClientPortal ? "translate-x-5" : "translate-x-0"
                }`}
            />
          </button>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous: Document Settings</span>
        </button>

        <button
          type="button"
          onClick={onComplete}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>Next: Business Hours</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
