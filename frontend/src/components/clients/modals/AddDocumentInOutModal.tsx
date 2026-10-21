"use client";

import React, { useState } from "react";
import { X, Loader2, ArrowLeftRight, Calendar, User, FileText } from "lucide-react";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";

interface AddDocumentInOutModalProps {
  isOpen: boolean;
  client: Client;
  onClose: () => void;
  onSuccess: (updatedClient: Client) => void;
}

export const AddDocumentInOutModal: React.FC<AddDocumentInOutModalProps> = ({
  isOpen,
  client,
  onClose,
  onSuccess,
}) => {
  const [documentName, setDocumentName] = useState("");
  const [personName, setPersonName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"In" | "Out">("In");
  const [returnable, setReturnable] = useState<"Yes" | "No">("No");
  const [returnDate, setReturnDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [hasFile, setHasFile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentName.trim()) {
      setErrorMessage("Document name is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        documentName: documentName.trim(),
        personName: personName.trim() || "-",
        date: date ? formatDateDisplay(date) : formatDateDisplay(new Date().toISOString()),
        status,
        returnable,
        returnDate: returnable === "Yes" && returnDate ? formatDateDisplay(returnDate) : "-",
        remarks: remarks.trim() || "-",
        file: hasFile ? "pdf" : null,
      };

      const res = await clientApi.addDocumentInOut(client.id, payload);
      if (res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        throw new Error((res as any).error || res.message || "Failed to record document movement");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl shadow-2xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#111827] dark:text-[#f8fafc] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155]"
          style={{ backgroundColor: "var(--orange-havy-light)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Record Document Movement (In - Out)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {client.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
              {errorMessage}
            </div>
          )}

          {/* Document Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g. Share Certificate, Bank Statement, Valuation Report, Audited Financials"
              className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Person Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Person Name / Handled By
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="e.g. Likith, Rajesh from client, Ramesh, Milton, Raju"
              className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Movement Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Status / Movement
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "In" | "Out")}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              >
                <option value="In">In (Received from client/authority)</option>
                <option value="Out">Out (Handed over / Dispatched)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Returnable & Return Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Returnable?
              </label>
              <select
                value={returnable}
                onChange={(e) => setReturnable(e.target.value as "Yes" | "No")}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              >
                <option value="No">No (Permanent)</option>
                <option value="Yes">Yes (Expected back)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Expected Return Date
              </label>
              <input
                type="date"
                disabled={returnable !== "Yes"}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Handed over document for physical ROC verification..."
              className="w-full p-2.5 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B] resize-none"
            />
          </div>

          {/* Has File Attachment */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="hasDocAttachment"
              checked={hasFile}
              onChange={(e) => setHasFile(e.target.checked)}
              className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
            />
            <label
              htmlFor="hasDocAttachment"
              className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Attach scanned copy (PDF receipt / acknowledgment)
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#dde2e8] dark:border-[#334155]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-md text-xs font-semibold text-gray-600 dark:text-gray-300 border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-md text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
