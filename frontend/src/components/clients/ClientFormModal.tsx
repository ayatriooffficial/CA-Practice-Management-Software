"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Building,
  Sparkles,
  AlertCircle,
  Check,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  Briefcase,
} from "lucide-react";
import {
  Client,
  CLIENT_TYPES,
  CLIENT_GROUPS,
  STATES,
  RECURRING_SERVICES,
  CLIENT_TAGS,
  MOCK_GSTIN_REGISTRY,
} from "@/data/crmData";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";

interface ClientFormModalProps {
  client?: Client | null;
  onSave: (client: Client) => void;
  onClose: () => void;
}

const AVAILABLE_USERS = ["Aarav", "Neha", "Isha", "Kabir", "Ananya Rao", "Neel", "CS Team"];

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  client,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(client?.id);

  const [formData, setFormData] = useState<Partial<Client>>(() => {
    if (client) {
      return { ...client };
    }
    return {
      name: "",
      fileNo: "",
      type: "individual",
      mobile: "",
      secondaryMobile: "",
      email: "",
      address: "",
      city: "",
      state: "Gujarat",
      pincode: "",
      group: "Accounting",
      tags: ["new-client"],
      active: true,
      services: ["gst-monthly"],
      users: ["Aarav"],
      pan: "",
      dob: "",
      referredBy: "",
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gstinInput, setGstinInput] = useState("");
  const [gstinFeedback, setGstinFeedback] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const handleChange = (field: keyof Client, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleTag = (tagKey: string) => {
    const current = new Set(formData.tags || []);
    if (current.has(tagKey)) {
      current.delete(tagKey);
    } else {
      current.add(tagKey);
    }
    handleChange("tags", Array.from(current));
  };

  const toggleService = (serviceId: string) => {
    const current = new Set(formData.services || []);
    if (current.has(serviceId)) {
      current.delete(serviceId);
    } else {
      current.add(serviceId);
    }
    handleChange("services", Array.from(current));
  };

  const toggleUser = (userName: string) => {
    const current = new Set(formData.users || []);
    if (current.has(userName)) {
      current.delete(userName);
    } else {
      current.add(userName);
    }
    handleChange("users", Array.from(current));
  };

  // GSTIN Autofill handler
  const handleAutofillGstin = (gstinToLookup?: string) => {
    const g = (gstinToLookup || gstinInput).trim().toUpperCase();
    if (!g) {
      setGstinFeedback("Please enter a 15-character GSTIN number.");
      return;
    }

    const matched = MOCK_GSTIN_REGISTRY[g];
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        name: matched.legalName,
        type: matched.type,
        address: matched.address,
        city: matched.city,
        state: matched.state,
        pincode: matched.pincode,
        pan: matched.pan,
      }));
      setGstinFeedback(`Autofilled details for "${matched.legalName}"!`);
    } else if (g.length >= 10) {
      // Derive PAN (chars 3 to 12)
      const panPart = g.substring(2, 12);
      setFormData((prev) => ({
        ...prev,
        pan: panPart,
      }));
      setGstinFeedback(`Derived PAN "${panPart}" from GSTIN state prefix.`);
    } else {
      setGstinFeedback("GSTIN not found in mock database. Try sample 24AAKCA1234F1Z5.");
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      newErrors.name = "Client Legal Name is required";
    }
    if (!formData.mobile?.trim()) {
      newErrors.mobile = "Mobile Number is required";
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      newErrors.mobile = "Enter a valid 10-digit mobile number";
    }
    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      newErrors.email = "Enter a valid email address";
    }
    if (
      formData.pan &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan.toUpperCase())
    ) {
      newErrors.pan = "Enter a valid 10-character PAN (e.g. ABCDE1234F)";
    }
    if (formData.pincode && formData.pincode.length !== 6) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector(
          ".border-rose-500, .border-\\[\\#e8655a\\], .border-red-500"
        );
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
          (firstErrorEl as HTMLElement)?.focus?.();
        }
      }, 50);
      return;
    }

    const finalClient: Client = {
      id: formData.id || `client-${Date.now()}`,
      name: formData.name || "Unnamed Client",
      fileNo: formData.fileNo || String(Math.floor(Math.random() * 900) + 100),
      type: formData.type || "individual",
      mobile: formData.mobile || "",
      secondaryMobile: formData.secondaryMobile || "",
      email: formData.email || "",
      address: formData.address || "",
      city: formData.city || "",
      state: formData.state || "Maharashtra",
      pincode: formData.pincode || "",
      group: formData.group || "Accounting",
      tags: formData.tags || [],
      active: formData.active ?? true,
      services: formData.services || [],
      users: formData.users || ["Aarav"],
      pan: (formData.pan || "").toUpperCase(),
      dob: formData.dob || "",
      referredBy: formData.referredBy || "",
      createdAt: formData.createdAt || new Date().toISOString(),
    };

    onSave(finalClient);
  };

  const isDirty = useMemo(() => {
    if (!client) {
      return Boolean(
        formData.name ||
        formData.mobile ||
        formData.email ||
        formData.pan ||
        formData.address
      );
    }
    return (
      formData.name !== client.name ||
      formData.mobile !== client.mobile ||
      formData.email !== client.email ||
      formData.pan !== client.pan ||
      formData.type !== client.type ||
      formData.address !== client.address
    );
  }, [formData, client]);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#111827] dark:text-[#f8fafc]"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] shrink-0"
            style={{ backgroundColor: "var(--orange-havy-light)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#000000] dark:text-white">
                  {isEditing ? `Edit Client: ${client?.name}` : "Create New Client"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Client master file, GSTIN autofill, billing group, and assigned representatives.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseAttempt}
              className="p-2 rounded-xl text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form
            id="client-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-2 space-y-5 scrollbar-slim"
          >
            {/* Requirement Warning & Validation Banner */}
            {Object.keys(errors).length > 0 && (
              <div
                id="modal-client-form-error-banner"
                className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/95 dark:bg-rose-950/50 p-4 text-rose-800 dark:text-rose-200 shadow-sm animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-rose-900 dark:text-rose-100 flex items-center gap-2">
                        <span>Required Fields & Validation Warnings</span>
                        <span className="text-xs bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded-full font-semibold">
                          {Object.keys(errors).length} requirement{Object.keys(errors).length > 1 ? "s" : ""} need attention
                        </span>
                      </h4>
                    </div>

                    <ul className="list-disc list-inside text-xs space-y-1 text-rose-700 dark:text-rose-300 pt-1">
                      {Object.entries(errors).map(([key, msg]) => (
                        <li key={key} className="font-medium">
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Quick GSTIN Autofill Banner */}
            <div className="p-4 rounded-xl border border-[#31719B]/30 bg-[#31719B]/5 dark:bg-[#31719B]/10 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-[#31719B]">
                  <Sparkles className="w-4 h-4 text-[#e8655a]" />
                  Quick GSTIN Autofill Assist
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 font-medium">
                    Try sample:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setGstinInput("24AAKCA1234F1Z5");
                      handleAutofillGstin("24AAKCA1234F1Z5");
                    }}
                    className="text-[11px] font-bold text-[#31719B] hover:underline cursor-pointer"
                  >
                    24AAKCA1234F1Z5 (Gujarat)
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGstinInput("27AABFV5678K1ZP");
                      handleAutofillGstin("27AABFV5678K1ZP");
                    }}
                    className="text-[11px] font-bold text-[#31719B] hover:underline cursor-pointer"
                  >
                    27AABFV5678K1ZP (Mumbai)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="client-gstin-input"
                  name="gstinInput"
                  aria-label="Enter 15-character GSTIN number"
                  type="text"
                  value={gstinInput}
                  onChange={(e) => setGstinInput(e.target.value.toUpperCase())}
                  placeholder="Enter 15-character GSTIN number"
                  className="flex-1 px-3.5 py-1.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-mono uppercase outline-none focus:border-[#31719B]"
                />
                <button
                  type="button"
                  onClick={() => handleAutofillGstin()}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                >
                  Autofill Details
                </button>
              </div>

              {gstinFeedback && (
                <p className="text-[11px] font-semibold text-[#31719B]">
                  {gstinFeedback}
                </p>
              )}
            </div>

            {/* 1. BASIC DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#dde2e8] dark:border-[#334155]">
                <h3
                  className="text-base font-bold tracking-tight flex items-center gap-2"
                  style={{ color: "var(--premium-blue-dark)" }}
                >
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-extrabold"
                    style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  >
                    1
                  </span>
                  Basic Client Master Details
                </h3>
                {/* Active Toggle */}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span>Client Status:</span>
                  <div
                    onClick={() => handleChange("active", !formData.active)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                      formData.active
                        ? "bg-[#31719B]"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        formData.active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                  <span
                    className={`font-bold ${
                      formData.active ? "text-[#31719B]" : "text-gray-400"
                    }`}
                  >
                    {formData.active ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="client-name" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Client Legal Name <span className="text-[#e8655a]">*</span>
                  </label>
                  <input
                    id="client-name"
                    name="clientName"
                    aria-label="Client Legal Name"
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. Apex Auto Works Pvt Ltd"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all outline-none bg-white dark:bg-[#0f172a] ${
                      errors.name
                        ? "border-[#e8655a] focus:ring-2 focus:ring-[#e8655a]/20"
                        : "border-[#dde2e8] dark:border-[#475569] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20"
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-[#e8655a] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="client-file-no" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    File No.
                  </label>
                  <input
                    id="client-file-no"
                    name="fileNo"
                    aria-label="File Number"
                    type="text"
                    value={formData.fileNo || ""}
                    onChange={(e) => handleChange("fileNo", e.target.value)}
                    placeholder="e.g. 012"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20 font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="client-type" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Constitution Type
                  </label>
                  <select
                    id="client-type"
                    name="clientType"
                    aria-label="Constitution Type"
                    value={formData.type || "individual"}
                    onChange={(e) => handleChange("type", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20 cursor-pointer"
                  >
                    {CLIENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="client-group" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Client Group
                  </label>
                  <select
                    id="client-group"
                    name="clientGroup"
                    aria-label="Client Group"
                    value={formData.group || "Accounting"}
                    onChange={(e) => handleChange("group", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20 cursor-pointer"
                  >
                    {CLIENT_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="client-pan" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    PAN No
                  </label>
                  <input
                    id="client-pan"
                    name="pan"
                    aria-label="PAN No"
                    type="text"
                    maxLength={10}
                    value={formData.pan || ""}
                    onChange={(e) =>
                      handleChange(
                        "pan",
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                      )
                    }
                    placeholder="ABCDE1234F"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm uppercase outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20 font-mono"
                  />
                  {errors.pan && (
                    <p className="mt-1 text-xs text-[#e8655a] font-medium">
                      {errors.pan}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="client-dob" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Date of Inc. / DOB
                  </label>
                  <input
                    id="client-dob"
                    name="dob"
                    aria-label="Date of Incorporation or Date of Birth"
                    type="date"
                    value={formData.dob || ""}
                    onChange={(e) => handleChange("dob", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="client-referred-by" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Referred By
                  </label>
                  <input
                    id="client-referred-by"
                    name="referredBy"
                    aria-label="Referred By"
                    type="text"
                    value={formData.referredBy || ""}
                    onChange={(e) => handleChange("referredBy", e.target.value)}
                    placeholder="Reference person or partner"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20"
                  />
                </div>
              </div>
            </div>

            {/* 2. CONTACT DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#dde2e8] dark:border-[#334155]">
                <h3
                  className="text-base font-bold tracking-tight flex items-center gap-2"
                  style={{ color: "var(--premium-blue-dark)" }}
                >
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-extrabold"
                    style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  >
                    2
                  </span>
                  Contact Information & Location
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="client-mobile" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Primary Mobile <span className="text-[#e8655a]">*</span>
                  </label>
                  <input
                    id="client-mobile"
                    name="mobile"
                    aria-label="Primary Mobile"
                    type="tel"
                    maxLength={10}
                    value={formData.mobile || ""}
                    onChange={(e) =>
                      handleChange("mobile", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20"
                  />
                  {errors.mobile && (
                    <p className="mt-1 text-xs text-[#e8655a] font-medium">
                      {errors.mobile}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="client-secondary-mobile" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Secondary Mobile
                  </label>
                  <input
                    id="client-secondary-mobile"
                    name="secondaryMobile"
                    aria-label="Secondary Mobile"
                    type="tel"
                    maxLength={10}
                    value={formData.secondaryMobile || ""}
                    onChange={(e) =>
                      handleChange(
                        "secondaryMobile",
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="Alternate contact"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20"
                  />
                </div>

                <div>
                  <label htmlFor="client-email" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Official Email ID
                  </label>
                  <input
                    id="client-email"
                    name="email"
                    aria-label="Official Email ID"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="accounts@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-[#e8655a] font-medium">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="client-address" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Registered Street Address
                  </label>
                  <textarea
                    id="client-address"
                    name="address"
                    aria-label="Registered Street Address"
                    rows={2}
                    value={formData.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Premises name, street, road, industrial area"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20 resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="client-city" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    City
                  </label>
                  <input
                    id="client-city"
                    name="city"
                    aria-label="City"
                    type="text"
                    value={formData.city || ""}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="e.g. Ahmedabad"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20"
                  />
                </div>

                <div>
                  <label htmlFor="client-state" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    State
                  </label>
                  <select
                    id="client-state"
                    name="clientState"
                    aria-label="State"
                    value={formData.state || "Maharashtra"}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20 cursor-pointer"
                  >
                    {STATES.map((s) => (
                      <option key={s.code} value={s.label}>
                        {s.label} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="client-pincode" className="block text-xs font-bold text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Pin Code
                  </label>
                  <input
                    id="client-pincode"
                    name="pincode"
                    aria-label="Pin Code"
                    type="text"
                    maxLength={6}
                    value={formData.pincode || ""}
                    onChange={(e) =>
                      handleChange("pincode", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="6-digit PIN"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-sm outline-none bg-white dark:bg-[#0f172a] focus:border-[#31719B] focus:ring-2 focus:ring-[#31719B]/20 font-mono"
                  />
                  {errors.pincode && (
                    <p className="mt-1 text-xs text-[#e8655a] font-medium">
                      {errors.pincode}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. SERVICES & TAGS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#dde2e8] dark:border-[#334155]">
                <h3
                  className="text-base font-bold tracking-tight flex items-center gap-2"
                  style={{ color: "var(--premium-blue-dark)" }}
                >
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-extrabold"
                    style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  >
                    3
                  </span>
                  Enrolled Compliance Services &amp; Tags
                </h3>
              </div>

              {/* Recurring Services Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Enrolled Recurring Services:
                </label>
                <div className="flex flex-wrap gap-2">
                  {RECURRING_SERVICES.map((s) => {
                    const isSelected = formData.services?.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#31719B] text-white border-[#31719B] shadow-2xs"
                            : "bg-white dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 border-[#dde2e8] dark:border-[#475569] hover:border-[#31719B]"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Client Tags:
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CLIENT_TAGS).map(([tagKey, info]) => {
                    const isSelected = formData.tags?.includes(tagKey);
                    return (
                      <button
                        key={tagKey}
                        type="button"
                        onClick={() => toggleTag(tagKey)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-offset-1 ring-[#31719B] border-transparent"
                            : "border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100"
                        }`}
                        style={{
                          backgroundColor: info.bg,
                          color: info.text,
                        }}
                      >
                        {isSelected && "✓ "}
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Team Members */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Assigned Team Officers:
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_USERS.map((user) => {
                    const isSelected = formData.users?.includes(user);
                    return (
                      <button
                        key={user}
                        type="button"
                        onClick={() => toggleUser(user)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#3D88BF]/10 text-[#31719B] border-[#31719B] font-bold"
                            : "bg-white dark:bg-[#0f172a] text-gray-500 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{user}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </form>

          {/* Bottom Actions Bar - Docked at the bottom with 0 space below */}
          <div className="shrink-0 px-6 py-3.5 border-t border-[#dde2e8] dark:border-[#334155] flex items-center justify-between bg-white dark:bg-[#1e293b] z-10">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="h-10 px-5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e293b] text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="client-form"
              className="flex items-center gap-2 h-10 px-6 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              style={{
                backgroundColor: "var(--premium-blue-dark)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
              }
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? "Save Changes" : "Create Client"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={showDiscardConfirm}
        onKeepEditing={() => setShowDiscardConfirm(false)}
        onDiscard={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to close?"
      />
    </>
  );
};
