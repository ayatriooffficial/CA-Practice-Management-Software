"use client";

import React, { useState, useId, useMemo } from "react";
import {
  X,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
  Calendar,
} from "lucide-react";
import { Lead, STATES } from "@/data/crmData";
import { Select } from "@/components/ui/Select";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";

interface LeadFormModalProps {
  lead?: Lead | null;
  onSave: (lead: Lead) => void;
  onClose: () => void;
}

const GENDERS = ["Male", "Female", "Others", "Transgender"];

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  lead,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(lead?.id);

  const [formData, setFormData] = useState<Partial<Lead>>(() => {
    if (lead) {
      return { ...lead };
    }
    return {
      firstName: "",
      middleName: "",
      lastName: "",
      fullName: "",
      abbreviation: "",
      dob: "",
      aadhaarMobile: "",
      mobile: "",
      email: "",
      pan: "",
      panAttachment: null,
      aadhaar: "",
      aadhaarAttachment: null,
      gender: "Male",
      address: "",
      country: "India",
      state: "Maharashtra",
      pincode: "",
      nationality: "Indian",
      policeStation: "",
      postOffice: "",
      din: "",
      dinAttachment: null,
      mcaId: "",
      mcaPassword: "",
      referredBy: "",
      photo: null,
    };
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const fileInputId = useId();

  const handleChange = (field: keyof Lead, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (
        field === "firstName" ||
        field === "middleName" ||
        field === "lastName"
      ) {
        const parts = [
          field === "firstName" ? value : updated.firstName,
          field === "middleName" ? value : updated.middleName,
          field === "lastName" ? value : updated.lastName,
        ]
          .map((p) => (p || "").trim())
          .filter(Boolean);
        updated.fullName = parts.join(" ");
      }

      if (field === "country") {
        updated.nationality =
          (value || "").trim().toLowerCase() === "india" ? "Indian" : "NRI";
      }

      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleChange("photo", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (
    field: "panAttachment" | "aadhaarAttachment" | "dinAttachment",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handleChange(field, file.name);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName?.trim()) {
      newErrors.firstName = "First Name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    const now = new Date().toISOString();
    const finalLead: Lead = {
      id: formData.id || `lead-${Date.now()}`,
      fullName:
        formData.fullName ||
        [formData.firstName, formData.middleName, formData.lastName]
          .filter(Boolean)
          .join(" ") ||
        "Unnamed Lead",
      firstName: formData.firstName || "",
      middleName: formData.middleName || "",
      lastName: formData.lastName || "",
      abbreviation: formData.abbreviation || "",
      dob: formData.dob || "",
      aadhaarMobile: formData.aadhaarMobile || "",
      mobile: formData.mobile || "",
      email: formData.email || "",
      pan: (formData.pan || "").toUpperCase(),
      panAttachment: formData.panAttachment || null,
      aadhaar: formData.aadhaar || "",
      aadhaarAttachment: formData.aadhaarAttachment || null,
      gender: (formData.gender as any) || "Male",
      address: formData.address || "",
      country: formData.country || "India",
      state: formData.state || "Maharashtra",
      pincode: formData.pincode || "",
      nationality: formData.nationality || "Indian",
      policeStation: formData.policeStation || "",
      postOffice: formData.postOffice || "",
      din: formData.din || "",
      dinAttachment: formData.dinAttachment || null,
      mcaId: formData.mcaId || "",
      mcaPassword: formData.mcaPassword || "",
      referredBy: formData.referredBy || "",
      photo: formData.photo || null,
      createdAt: formData.createdAt || now,
      updatedAt: now,
    };

    onSave(finalLead);
  };

  const isDirty = useMemo(() => {
    if (!lead) {
      return Boolean(
        formData.firstName ||
        formData.middleName ||
        formData.lastName ||
        formData.mobile ||
        formData.email ||
        formData.pan ||
        formData.aadhaar ||
        formData.din ||
        formData.mcaId ||
        formData.address ||
        formData.photo
      );
    }
    return (
      (formData.firstName || "") !== (lead.firstName || "") ||
      (formData.middleName || "") !== (lead.middleName || "") ||
      (formData.lastName || "") !== (lead.lastName || "") ||
      (formData.mobile || "") !== (lead.mobile || "") ||
      (formData.email || "") !== (lead.email || "") ||
      (formData.pan || "") !== (lead.pan || "") ||
      (formData.aadhaar || "") !== (lead.aadhaar || "") ||
      (formData.address || "") !== (lead.address || "") ||
      (formData.photo || null) !== (lead.photo || null) ||
      (formData.gender || "Male") !== (lead.gender || "Male") ||
      (formData.dob || "") !== (lead.dob || "")
    );
  }, [formData, lead]);

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
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#111827] dark:text-[#f8fafc]"
          role="dialog"
          aria-modal="true"
        >
          {/* Header matching Screenshot 2 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] shrink-0">
            <h2 className="text-xl font-bold tracking-tight text-[#000000] dark:text-white">
              {isEditing ? "Edit Lead" : "Add Lead"}
            </h2>

            <button
              type="button"
              onClick={handleCloseAttempt}
              className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content - Scrollable with py-2 */}
          <form
            id="lead-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-2 space-y-5 scrollbar-slim"
          >
            {/* 1. PERSONAL DETAILS */}
            <div className="space-y-3">
              <h3
                className="text-base font-bold"
                style={{ color: "var(--premium-blue-dark)" }}
              >
                Personal Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 items-start">
                {/* Photo thumbnail */}
                <div className="flex flex-col items-center gap-2 pt-2">
                  <div
                    onClick={() => document.getElementById(fileInputId)?.click()}
                    className="w-24 h-24 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-[#f5f6f8] dark:bg-[#0f172a] flex items-center justify-center cursor-pointer hover:border-[#31719B] overflow-hidden transition-colors"
                  >
                    {formData.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formData.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z" />
                      </svg>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById(fileInputId)?.click()}
                    className="text-xs font-semibold text-[#31719B] hover:underline cursor-pointer"
                  >
                    {formData.photo ? "Change" : "Upload"}
                  </button>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Name inputs */}
                <div className="space-y-1">
                  {/* Row 1: First Name, Middle Name, Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                        First Name <span className="text-[#e8655a]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName || ""}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        placeholder="First Name"
                        className={`h-11 w-full rounded-md border px-3 text-sm outline-none bg-white dark:bg-[#0f172a] text-[#000000] dark:text-white ${errors.firstName
                          ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
                          : "border-[#dde2e8] dark:border-[#475569] focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        value={formData.middleName || ""}
                        onChange={(e) => handleChange("middleName", e.target.value)}
                        placeholder="Middle Name"
                        className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.lastName || ""}
                        onChange={(e) => handleChange("lastName", e.target.value)}
                        placeholder="Last Name"
                        className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                      />
                    </div>
                  </div>

                  {/* Row 2: Derived Full Name + Abbreviation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                        Party Full Name (Computed)
                      </label>
                      <input
                        type="text"
                        value={formData.fullName || ""}
                        readOnly
                        placeholder="Party Full Name"
                        className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-[#F6F4F2] dark:bg-[#0b1120] px-3 text-sm font-semibold text-[#000000] dark:text-white cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                        Abbreviation
                      </label>
                      <input
                        type="text"
                        value={formData.abbreviation || ""}
                        onChange={(e) => handleChange("abbreviation", e.target.value)}
                        placeholder="Abbreviation"
                        className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                      />
                    </div>
                  </div>

                  {/* Row 3: Date of Birth + Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.dob || ""}
                        onChange={(e) => handleChange("dob", e.target.value)}
                        className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                        Gender
                      </label>
                      <Select
                        value={formData.gender || "Male"}
                        onChange={(val) => handleChange("gender", val)}
                        options={GENDERS.map((g) => ({ value: g, label: g }))}
                        separator={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CONTACT DETAILS */}
            <div className="space-y-3">
              <h3
                className="text-base font-bold"
                style={{ color: "var(--premium-blue-dark)" }}
              >
                Contact Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                    Mobile No Linked with Aadhaar
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.aadhaarMobile || ""}
                    onChange={(e) =>
                      handleChange("aadhaarMobile", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Mobile No Linked with Aadhaar"
                    className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                    Communication Mobile
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.mobile || ""}
                    onChange={(e) =>
                      handleChange("mobile", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Communication Mobile"
                    className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                    Communication Mail ID
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Communication Mail ID"
                    className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                  />
                </div>
              </div>
            </div>

            {/* 3. IDENTITY & DOCUMENTS */}
            <div className="space-y-3">
              <h3
                className="text-base font-bold"
                style={{ color: "var(--premium-blue-dark)" }}
              >
                Identity & Documents
              </h3>

              <div className="space-y-1">
                {/* Row 1: PAN, PAN Attachment, Aadhaar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      PAN No
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={formData.pan || ""}
                      onChange={(e) =>
                        handleChange(
                          "pan",
                          e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                        )
                      }
                      placeholder="PAN No"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm uppercase font-mono outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      PAN Attachment
                    </label>
                    <label className="h-11 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-[#dde2e8] dark:border-[#475569] text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-[#31719B] px-3 py-2">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {formData.panAttachment || "Attach file"}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload("panAttachment", e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      Aadhaar No
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={formData.aadhaar || ""}
                      onChange={(e) =>
                        handleChange("aadhaar", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Aadhaar No"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>
                </div>

                {/* Row 2: Aadhaar Attachment, DIN, DIN Attachment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      Aadhaar Attachment
                    </label>
                    <label className="h-11 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-[#dde2e8] dark:border-[#475569] text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-[#31719B] px-3 py-2">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {formData.aadhaarAttachment || "Attach file"}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload("aadhaarAttachment", e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      DIN / DPIN No
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={formData.din || ""}
                      onChange={(e) =>
                        handleChange("din", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="DIN / DPIN No"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      DIN Attachment
                    </label>
                    <label className="h-11 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-[#dde2e8] dark:border-[#475569] text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-[#31719B] px-3 py-2">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {formData.dinAttachment || "Attach file"}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload("dinAttachment", e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Row 3: MCA V3 ID, MCA V3 PW, Referred By */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      MCA V3 ID
                    </label>
                    <input
                      type="text"
                      value={formData.mcaId || ""}
                      onChange={(e) => handleChange("mcaId", e.target.value)}
                      placeholder="MCA V3 ID"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      MCA V3 PW
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.mcaPassword || ""}
                        onChange={(e) => handleChange("mcaPassword", e.target.value)}
                        placeholder="MCA V3 PW"
                        className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-3 pr-10 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      Referred By
                    </label>
                    <input
                      type="text"
                      value={formData.referredBy || ""}
                      onChange={(e) => handleChange("referredBy", e.target.value)}
                      placeholder="Referred By"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. ADDRESS DETAILS */}
            <div className="space-y-3">
              <h3
                className="text-base font-bold"
                style={{ color: "var(--premium-blue-dark)" }}
              >
                Address Details
              </h3>

              <div className="space-y-1">
                {/* Full-width Address Textarea */}
                <div className="py-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Address"
                    className="min-h-[4.625rem] w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 py-2.5 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B] resize-y"
                  />
                </div>

                {/* Row: Country, State Name, Pin Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country || "India"}
                      onChange={(e) => handleChange("country", e.target.value)}
                      placeholder="Country"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      State Name
                    </label>
                    <Select
                      value={formData.state || "Maharashtra"}
                      onChange={(val) => handleChange("state", val)}
                      options={STATES.map((s) => ({ value: s.label, label: s.label }))}
                      separator={true}
                      searchable={true}
                      placeholder="Select State"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      Pin Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.pincode || ""}
                      onChange={(e) =>
                        handleChange("pincode", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Pin Code"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>
                </div>

                {/* Row: Nationality, Police Station, Post Office */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={formData.nationality || "Indian"}
                      readOnly
                      placeholder="Nationality"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-[#F6F4F2] dark:bg-[#0b1120] px-3 text-sm text-[#000000] dark:text-white cursor-not-allowed font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      Police Station
                    </label>
                    <input
                      type="text"
                      value={formData.policeStation || ""}
                      onChange={(e) => handleChange("policeStation", e.target.value)}
                      placeholder="Police Station"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2">
                      Post Office
                    </label>
                    <input
                      type="text"
                      value={formData.postOffice || ""}
                      onChange={(e) => handleChange("postOffice", e.target.value)}
                      placeholder="Post Office"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Bottom Actions Bar - Docked at the bottom with 0 space below */}
          <div className="shrink-0 px-6 py-3.5 border-t border-[#dde2e8] dark:border-[#334155] flex items-center justify-end gap-3 bg-white dark:bg-[#1e293b] z-10">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="h-10 rounded-md border border-[#31719B] bg-white dark:bg-[#1e293b] px-6 text-sm font-semibold text-[#31719B] hover:bg-[#31719B]/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="lead-form"
              className="h-10 rounded-md px-7 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
              }
            >
              Save
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
        message="You have unsaved changes in this lead. Are you sure you want to close?"
      />
    </>
  );
};
