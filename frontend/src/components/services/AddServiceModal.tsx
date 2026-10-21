"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import {
  Service,
  SERVICE_CATEGORIES,
  SERVICE_FREQUENCIES,
  SERVICE_DIFFICULTIES,
  TAX_RATES,
  EXEMPTION_REASONS,
} from "@/data/serviceData";
import { Select } from "@/components/ui/Select";

interface AddServiceModalProps {
  service?: Service | null;
  onSave: (serviceData: Partial<Service>) => Promise<void>;
  onClose: () => void;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  service,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(service?.id);

  // Form State
  const [name, setName] = useState(service?.name || "");
  const [category, setCategory] = useState(service?.category || "");
  const [frequency, setFrequency] = useState(service?.frequency || "Monthly");
  const [difficulty, setDifficulty] = useState<Service["difficulty"]>(
    service?.difficulty || "Medium"
  );
  const [description, setDescription] = useState(service?.description || "");
  const [isRecurring, setIsRecurring] = useState(service?.isRecurring ?? true);

  // Commercial & Tax
  const [professionalFee, setProfessionalFee] = useState<string>(
    service?.professionalFee !== undefined ? String(service.professionalFee) : "0"
  );
  const [taxRate, setTaxRate] = useState(service?.taxRate || "18%");
  const [sacCode, setSacCode] = useState(service?.sacCode || "998231");
  const [exemptionReason, setExemptionReason] = useState(service?.exemptionReason || "");
  const [maxOopBudget, setMaxOopBudget] = useState<string>(
    service?.maxOopBudget !== undefined ? String(service.maxOopBudget) : "0"
  );
  const [tatDays, setTatDays] = useState<string>(
    service?.tatDays !== undefined ? String(service.tatDays) : "3"
  );
  const [tatHours, setTatHours] = useState(service?.tatHours || "00:00");

  // Additional Note
  const [note, setNote] = useState(service?.note || "");
  const [sop, setSop] = useState(service?.sop || "Standard SOP v1.0");

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Service Name is required";
    if (!category.trim()) errs.category = "Category is required";
    if (isNaN(Number(professionalFee)) || Number(professionalFee) < 0) {
      errs.professionalFee = "Enter a valid professional fee";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...(service?.id ? { id: service.id } : {}),
        name: name.trim(),
        category: category.trim(),
        frequency,
        difficulty,
        description: description.trim(),
        isRecurring,
        professionalFee: Number(professionalFee) || 0,
        taxRate,
        sacCode: sacCode.trim(),
        exemptionReason: exemptionReason.trim(),
        maxOopBudget: Number(maxOopBudget) || 0,
        tatDays: Number(tatDays) || 0,
        tatHours: tatHours.trim(),
        note: note.trim(),
        sop: sop.trim() || "Standard SOP v1.0",
        status: service?.status || "Active",
      });
      onClose();
    } catch {
      // Error is surfaced via caller's toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-service-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-5xl my-auto bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2
              id="add-service-title"
              className="text-lg font-bold tracking-tight text-gray-900 dark:text-white"
            >
              {isEditing ? `Edit ${service?.name}` : "Add New Service"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Services added here become the master list for recurring tasks and client billing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-slim">
          <form id="add-service-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT COLUMN: Service Details & Commercials (Spans 2 cols) */}
              <div className="lg:col-span-2 space-y-5">
                {/* 1. SERVICE DETAILS CARD */}
                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] shadow-2xs space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Service Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Service Name */}
                    <div>
                      <label
                        htmlFor="srv-name"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Service Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="srv-name"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                        }}
                        placeholder="e.g. TDS Payment (Monthly)"
                        className={`h-10 w-full rounded-md border px-3 text-xs outline-none transition-colors bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white ${
                          errors.name
                            ? "border-red-500 focus:ring-1 focus:ring-red-500"
                            : "border-gray-200 dark:border-gray-700 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                        }`}
                      />
                      {errors.name && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <label
                        htmlFor="srv-category"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Category <span className="text-red-500">*</span>
                      </label>
                      <Select
                        id="srv-category"
                        value={category}
                        onChange={(val) => {
                          setCategory(val);
                          if (errors.category) setErrors((prev) => ({ ...prev, category: "" }));
                        }}
                        options={SERVICE_CATEGORIES}
                        placeholder="Category"
                        searchable={true}
                        error={errors.category}
                      />
                      {errors.category && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.category}</p>
                      )}
                    </div>

                    {/* Frequency */}
                    <div>
                      <label
                        htmlFor="srv-frequency"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Frequency
                      </label>
                      <Select
                        id="srv-frequency"
                        value={frequency}
                        onChange={(val) => setFrequency(val)}
                        options={SERVICE_FREQUENCIES}
                        placeholder="Frequency"
                      />
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label
                        htmlFor="srv-difficulty"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Difficulty
                      </label>
                      <Select
                        id="srv-difficulty"
                        value={difficulty}
                        onChange={(val) => setDifficulty(val as Service["difficulty"])}
                        options={SERVICE_DIFFICULTIES as any}
                        placeholder="Difficulty"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="srv-description"
                        className="text-xs font-semibold text-gray-700 dark:text-gray-300"
                      >
                        Description
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {description.length}/300
                      </span>
                    </div>
                    <textarea
                      id="srv-description"
                      rows={2}
                      maxLength={300}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Internal description of what this service covers..."
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] px-3 py-2 text-xs outline-none text-gray-900 dark:text-white focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] resize-none"
                    />
                  </div>

                  {/* Recurring Toggle Pill */}
                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-[#0f172a]/50">
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      Is this a recurring service? Auto-generates scheduled tasks for clients.
                    </span>
                    <div className="flex items-center rounded-lg bg-gray-200 dark:bg-gray-800 p-0.5 shrink-0 ml-4">
                      <button
                        type="button"
                        onClick={() => setIsRecurring(true)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          isRecurring
                            ? "bg-[#6366f1] text-white shadow-xs"
                            : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRecurring(false)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          !isRecurring
                            ? "bg-[#6366f1] text-white shadow-xs"
                            : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. COMMERCIAL & TAX CARD */}
                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] shadow-2xs space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Commercial &amp; Tax
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Professional Fee */}
                    <div>
                      <label
                        htmlFor="srv-fee"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Professional Fee <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="srv-fee"
                        type="number"
                        min={0}
                        value={professionalFee}
                        onChange={(e) => setProfessionalFee(e.target.value)}
                        placeholder="0"
                        className="h-10 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] px-3 text-xs outline-none text-gray-900 dark:text-white focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                      />
                    </div>

                    {/* Tax Rate */}
                    <div>
                      <label
                        htmlFor="srv-tax"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Tax Rate
                      </label>
                      <Select
                        id="srv-tax"
                        value={taxRate}
                        onChange={(val) => setTaxRate(val)}
                        options={TAX_RATES}
                        placeholder="Tax Rate"
                      />
                    </div>

                    {/* SAC Code */}
                    <div>
                      <label
                        htmlFor="srv-sac"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        SAC Code
                      </label>
                      <input
                        id="srv-sac"
                        type="text"
                        value={sacCode}
                        onChange={(e) => setSacCode(e.target.value)}
                        placeholder="e.g. 998231"
                        className="h-10 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] px-3 text-xs outline-none text-gray-900 dark:text-white focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Exemption Reason */}
                    <div>
                      <label
                        htmlFor="srv-exemption"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Exemption Reason
                      </label>
                      <Select
                        id="srv-exemption"
                        value={exemptionReason}
                        onChange={(val) => setExemptionReason(val)}
                        options={EXEMPTION_REASONS}
                        placeholder="Exemption Reason"
                      />
                    </div>

                    {/* Max OOP Budget */}
                    <div>
                      <label
                        htmlFor="srv-oop"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Max OOP Budget
                      </label>
                      <input
                        id="srv-oop"
                        type="number"
                        min={0}
                        value={maxOopBudget}
                        onChange={(e) => setMaxOopBudget(e.target.value)}
                        placeholder="0"
                        className="h-10 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] px-3 text-xs outline-none text-gray-900 dark:text-white focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                      />
                    </div>

                    {/* TAT (days) */}
                    <div>
                      <label
                        htmlFor="srv-tat-days"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                      >
                        TAT (days)
                      </label>
                      <input
                        id="srv-tat-days"
                        type="number"
                        min={0}
                        value={tatDays}
                        onChange={(e) => setTatDays(e.target.value)}
                        placeholder="e.g. 3"
                        className="h-10 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] px-3 text-xs outline-none text-gray-900 dark:text-white focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                      />
                    </div>
                  </div>

                  {/* TAT (hours) */}
                  <div className="w-full sm:w-1/3">
                    <label
                      htmlFor="srv-tat-hours"
                      className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                    >
                      TAT (hours)
                    </label>
                    <input
                      id="srv-tat-hours"
                      type="text"
                      value={tatHours}
                      onChange={(e) => setTatHours(e.target.value)}
                      placeholder="00:00"
                      className="h-10 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] px-3 text-xs outline-none text-gray-900 dark:text-white focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                    />
                  </div>
                </div>

                {/* 3. ADDITIONAL NOTE CARD */}
                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] shadow-2xs space-y-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Additional Note
                  </h3>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="srv-note"
                        className="text-xs font-semibold text-gray-700 dark:text-gray-300"
                      >
                        Note
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">{note.length}/500</span>
                    </div>
                    <textarea
                      id="srv-note"
                      rows={2}
                      maxLength={500}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note about this change — it will be recorded in the activity log..."
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] px-3 py-2 text-xs outline-none text-gray-900 dark:text-white focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] resize-none"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      This note is optional and will be saved to the activity log for this service.
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Service Checklist & After Saving Note */}
              <div className="space-y-4">
                {/* Service Checklist Card */}
                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                    Service Checklist
                  </h3>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200 block">
                        Service Name
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                        Required - shown in task headers and reports
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200 block">
                        Category
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                        Determines SOP, checklist and doc defaults
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200 block">
                        Frequency
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                        How often recurring tasks trigger
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200 block">
                        Recurring
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                        Turn on to auto-create tasks on schedule
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200 block">
                        Professional Fee
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                        Base fee - can be overridden per client
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200 block">
                        SAC Code
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                        Required for GST invoicing
                      </span>
                    </div>
                  </div>
                </div>

                {/* After Saving Card (Soft violet tint matching screenshot) */}
                <div className="p-4.5 rounded-xl border border-[#e0dcfe] dark:border-[#433785] bg-[#f4f2ff] dark:bg-[#28214f]/50 space-y-2">
                  <h4 className="text-xs font-bold text-[#5a4be0] dark:text-[#a89df8]">
                    After saving
                  </h4>
                  <p className="text-xs leading-relaxed text-[#5a4be0]/90 dark:text-[#c4bcfa]">
                    You can configure per-client pricing, add checklist items, set sub-task
                    templates, and define document requests from the service detail page.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1e293b] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-service-form"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#6366f1] hover:bg-[#5254db] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Service</span>
          </button>
        </div>
      </div>
    </div>
  );
};
