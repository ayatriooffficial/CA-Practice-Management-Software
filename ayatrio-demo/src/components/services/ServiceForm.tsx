"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Check } from "lucide-react";
import {
  Service,
  SERVICE_CATEGORIES,
  SERVICE_FREQUENCIES,
  SERVICE_DIFFICULTIES,
  TAX_RATES,
  EXEMPTION_REASONS,
} from "@/data/serviceData";
import { Select } from "@/components/ui/Select";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";

interface ServiceFormProps {
  initialService?: Service | null;
  onSave: (serviceData: Partial<Service>) => Promise<void>;
  onCancel: () => void;
}

export const ServiceForm: React.FC<ServiceFormProps> = ({
  initialService,
  onSave,
  onCancel,
}) => {
  const isEditing = Boolean(initialService?.id);

  // Form State
  const [name, setName] = useState(initialService?.name || "");
  const [category, setCategory] = useState(initialService?.category || "");
  const [frequency, setFrequency] = useState(initialService?.frequency || "Monthly");
  const [difficulty, setDifficulty] = useState<Service["difficulty"]>(
    initialService?.difficulty || "Medium"
  );
  const [description, setDescription] = useState(initialService?.description || "");
  const [isRecurring, setIsRecurring] = useState(initialService?.isRecurring ?? true);

  // Commercial & Tax
  const [professionalFee, setProfessionalFee] = useState<string>(
    initialService?.professionalFee !== undefined ? String(initialService.professionalFee) : "0"
  );
  const [taxRate, setTaxRate] = useState(initialService?.taxRate || "18%");
  const [sacCode, setSacCode] = useState(initialService?.sacCode || "998231");
  const [exemptionReason, setExemptionReason] = useState(initialService?.exemptionReason || "");
  const [maxOopBudget, setMaxOopBudget] = useState<string>(
    initialService?.maxOopBudget !== undefined ? String(initialService.maxOopBudget) : "0"
  );
  const [tatDays, setTatDays] = useState<string>(
    initialService?.tatDays !== undefined ? String(initialService.tatDays) : "3"
  );
  const [tatHours, setTatHours] = useState(initialService?.tatHours || "00:00");

  // Additional Note
  const [note, setNote] = useState(initialService?.note || "");
  const [sop, setSop] = useState(initialService?.sop || "Standard SOP v1.0");

  // Errors, Loading & Discard Modal
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const isDirty = useMemo(() => {
    if (!initialService) {
      return Boolean(
        name ||
        category ||
        description ||
        professionalFee !== "0" ||
        note ||
        sacCode !== "998231"
      );
    }
    return (
      name !== (initialService.name || "") ||
      category !== (initialService.category || "") ||
      frequency !== (initialService.frequency || "Monthly") ||
      difficulty !== (initialService.difficulty || "Medium") ||
      description !== (initialService.description || "") ||
      isRecurring !== initialService.isRecurring ||
      professionalFee !== String(initialService.professionalFee || 0) ||
      taxRate !== (initialService.taxRate || "18%") ||
      sacCode !== (initialService.sacCode || "") ||
      exemptionReason !== (initialService.exemptionReason || "") ||
      maxOopBudget !== String(initialService.maxOopBudget || 0) ||
      tatDays !== String(initialService.tatDays || 3) ||
      tatHours !== (initialService.tatHours || "00:00") ||
      note !== (initialService.note || "")
    );
  }, [
    name,
    category,
    frequency,
    difficulty,
    description,
    isRecurring,
    professionalFee,
    taxRate,
    sacCode,
    exemptionReason,
    maxOopBudget,
    tatDays,
    tatHours,
    note,
    initialService,
  ]);

  const handleCancelAttempt = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      onCancel();
    }
  };

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
        ...(initialService?.id ? { id: initialService.id } : {}),
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
        status: initialService?.status || "Active",
      });
    } catch {
      // Handled in caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-150">
      {/* 1. Breadcrumb Bar (Matching Client second page) */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-base md:text-lg">
          <button
            type="button"
            onClick={handleCancelAttempt}
            aria-label="Back to Services"
            className="p-1 rounded-md text-[#31719B] hover:bg-[#31719B]/10 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </span>
          <button
            type="button"
            onClick={handleCancelAttempt}
            className="font-medium text-[#31719B] hover:underline cursor-pointer"
          >
            Services
          </button>
          <span className="text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {isEditing ? `Edit ${initialService?.name}` : "Add New Service"}
          </span>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCancelAttempt}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="service-page-form"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-md text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
            }
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Service</span>
          </button>
        </div>
      </div>

      {/* 2. Subtitle / Banner */}
      <div className="px-1 text-xs text-gray-500 dark:text-gray-400 -mt-2">
        Services added here become the master list for recurring tasks and client billing.
      </div>

      {/* 3. Main Form Grid */}
      <form id="service-page-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Form Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* CARD 1: SERVICE DETAILS */}
            <div className="rounded-xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 md:p-6 shadow-card space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Service Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Service Name */}
                <div>
                  <label
                    htmlFor="sf-name"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Service Name <span className="text-[#e8655a]">*</span>
                  </label>
                  <input
                    id="sf-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder="e.g. TDS Payment (Monthly)"
                    className={`h-11 w-full rounded-md border px-3.5 text-sm outline-none transition-all bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white ${
                      errors.name
                        ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
                        : "border-[#dde2e8] dark:border-[#475569] hover:border-gray-400 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-[#e8655a]">{errors.name}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="sf-category"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Category <span className="text-[#e8655a]">*</span>
                  </label>
                  <Select
                    id="sf-category"
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
                    <p className="mt-1 text-xs text-[#e8655a]">{errors.category}</p>
                  )}
                </div>

                {/* Frequency */}
                <div>
                  <label
                    htmlFor="sf-frequency"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Frequency
                  </label>
                  <Select
                    id="sf-frequency"
                    value={frequency}
                    onChange={(val) => setFrequency(val)}
                    options={SERVICE_FREQUENCIES}
                    placeholder="Frequency"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <label
                    htmlFor="sf-difficulty"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Difficulty
                  </label>
                  <Select
                    id="sf-difficulty"
                    value={difficulty}
                    onChange={(val) => setDifficulty(val as Service["difficulty"])}
                    options={SERVICE_DIFFICULTIES as any}
                    placeholder="Difficulty"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="sf-description"
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Description
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {description.length}/300
                  </span>
                </div>
                <textarea
                  id="sf-description"
                  rows={3}
                  maxLength={300}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Internal description of what this service covers..."
                  className="w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none hover:border-gray-400 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] resize-none"
                />
              </div>

              {/* Recurring Toggle Pill Container */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-gray-50/70 dark:bg-[#0f172a]/60 mt-2">
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  Is this a recurring service? Auto-generates scheduled tasks for clients.
                </span>
                <div className="flex items-center rounded-lg bg-gray-200 dark:bg-gray-800 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsRecurring(true)}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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

            {/* CARD 2: COMMERCIAL & TAX */}
            <div className="rounded-xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 md:p-6 shadow-card space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Commercial &amp; Tax
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Professional Fee */}
                <div>
                  <label
                    htmlFor="sf-fee"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Professional Fee <span className="text-[#e8655a]">*</span>
                  </label>
                  <input
                    id="sf-fee"
                    type="number"
                    min={0}
                    value={professionalFee}
                    onChange={(e) => setProfessionalFee(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 text-sm outline-none text-gray-900 dark:text-white hover:border-gray-400 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                  />
                </div>

                {/* Tax Rate */}
                <div>
                  <label
                    htmlFor="sf-tax"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Tax Rate
                  </label>
                  <Select
                    id="sf-tax"
                    value={taxRate}
                    onChange={(val) => setTaxRate(val)}
                    options={TAX_RATES}
                    placeholder="Tax Rate"
                  />
                </div>

                {/* SAC Code */}
                <div>
                  <label
                    htmlFor="sf-sac"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    SAC Code
                  </label>
                  <input
                    id="sf-sac"
                    type="text"
                    value={sacCode}
                    onChange={(e) => setSacCode(e.target.value)}
                    placeholder="e.g. 998231"
                    className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 text-sm outline-none text-gray-900 dark:text-white hover:border-gray-400 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Exemption Reason */}
                <div>
                  <label
                    htmlFor="sf-exemption"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Exemption Reason
                  </label>
                  <Select
                    id="sf-exemption"
                    value={exemptionReason}
                    onChange={(val) => setExemptionReason(val)}
                    options={EXEMPTION_REASONS}
                    placeholder="Exemption Reason"
                  />
                </div>

                {/* Max OOP Budget */}
                <div>
                  <label
                    htmlFor="sf-oop"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Max OOP Budget
                  </label>
                  <input
                    id="sf-oop"
                    type="number"
                    min={0}
                    value={maxOopBudget}
                    onChange={(e) => setMaxOopBudget(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 text-sm outline-none text-gray-900 dark:text-white hover:border-gray-400 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                  />
                </div>

                {/* TAT (days) */}
                <div>
                  <label
                    htmlFor="sf-tat-days"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    TAT (days)
                  </label>
                  <input
                    id="sf-tat-days"
                    type="number"
                    min={0}
                    value={tatDays}
                    onChange={(e) => setTatDays(e.target.value)}
                    placeholder="e.g. 3"
                    className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 text-sm outline-none text-gray-900 dark:text-white hover:border-gray-400 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                  />
                </div>
              </div>

              {/* TAT (hours) */}
              <div className="w-full sm:w-1/3">
                <label
                  htmlFor="sf-tat-hours"
                  className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                >
                  TAT (hours)
                </label>
                <input
                  id="sf-tat-hours"
                  type="text"
                  value={tatHours}
                  onChange={(e) => setTatHours(e.target.value)}
                  placeholder="00:00"
                  className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 text-sm outline-none text-gray-900 dark:text-white hover:border-gray-400 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                />
              </div>
            </div>

            {/* CARD 3: ADDITIONAL NOTE */}
            <div className="rounded-xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 md:p-6 shadow-card space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Additional Note
              </h2>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="sf-note"
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Note
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">{note.length}/500</span>
                </div>
                <textarea
                  id="sf-note"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note about this change — it will be recorded in the activity log..."
                  className="w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none hover:border-gray-400 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] resize-none"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  This note is optional and will be saved to the activity log for this service.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: Checklist & After Saving Note */}
          <div className="space-y-5">
            {/* Service Checklist Card */}
            <div className="rounded-xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 shadow-card space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Service Checklist
              </h3>

              <div className="space-y-4 text-xs">
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

            {/* After Saving Card (Soft violet tint from screenshot) */}
            <div className="rounded-xl border border-[#e0dcfe] dark:border-[#433785] bg-[#f4f2ff] dark:bg-[#28214f]/50 p-5 space-y-2">
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

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-3 pb-8">
          <button
            type="button"
            onClick={handleCancelAttempt}
            disabled={isSubmitting}
            className="h-11 rounded-md border border-[#31719B] bg-white dark:bg-[#1e293b] px-6 text-sm font-semibold text-[#31719B] transition-colors hover:bg-[#31719B]/5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 h-11 rounded-md px-7 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
            }
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save Service</span>
          </button>
        </div>
      </form>

      {/* Discard Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={showDiscardModal}
        onKeepEditing={() => setShowDiscardModal(false)}
        onDiscard={() => {
          setShowDiscardModal(false);
          onCancel();
        }}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to close?"
      />
    </div>
  );
};
