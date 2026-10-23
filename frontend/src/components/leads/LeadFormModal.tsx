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
  Loader2,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Lead, STATES } from "@/data/crmData";
import { Select } from "@/components/ui/Select";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { driveApi, DocumentCategory } from "@/services/driveApi";
import { getDirectFilePreviewUrl } from "@/utils/filePreview";

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

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField("photo");
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("category", DocumentCategory.KYC_IDENTITY);
      formDataUpload.append("clientName", formData.fullName || `${formData.firstName || ""} ${formData.lastName || ""}`.trim());
      formDataUpload.append("description", `Profile photo for lead ${formData.fullName || "new lead"}`);

      const res = await driveApi.uploadDocument(formDataUpload);
      const photoUrl =
        (res.data?.driveFileId ? driveApi.getPreviewUrl(res.data.driveFileId) : null) ||
        res.data?.previewUrl ||
        res.data?.thumbnailUrl ||
        res.data?.webViewLink ||
        res.data?.fileName;
      if (photoUrl) {
        handleChange("photo", photoUrl);
      }
    } catch {
      // Fallback to local DataURL for offline compatibility
      const reader = new FileReader();
      reader.onload = () => {
        handleChange("photo", reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingField(null);
    }
  };

  const handleFileUpload = async (
    field: "panAttachment" | "aadhaarAttachment" | "dinAttachment",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);
    try {
      const fieldLabel = field === "panAttachment" ? "PAN" : field === "aadhaarAttachment" ? "Aadhaar" : "DIN";
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("category", DocumentCategory.KYC_IDENTITY);
      formDataUpload.append("clientName", formData.fullName || `${formData.firstName || ""} ${formData.lastName || ""}`.trim());
      formDataUpload.append("description", `${fieldLabel} attachment for lead ${formData.fullName || "new lead"}`);

      const res = await driveApi.uploadDocument(formDataUpload);
      if (res.data?.fileName) {
        handleChange(field, res.data.fileName);
      } else {
        handleChange(field, file.name);
      }
    } catch {
      // Fallback to file name
      handleChange(field, file.name);
    } finally {
      setUploadingField(null);
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
                <div className="flex flex-col items-center gap-2 pt-4">
                  <div
                    onClick={() => document.getElementById(fileInputId)?.click()}
                    className="w-24 h-24 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-[#f5f6f8] dark:bg-[#0f172a] flex items-center justify-center cursor-pointer hover:border-[#31719B] overflow-hidden transition-colors"
                  >
                    {formData.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getDirectFilePreviewUrl(formData.photo)}
                        alt="Lead preview"
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const clean = formData.photo ? formData.photo.trim() : "";
                          const idMatch = clean.match(/([a-zA-Z0-9_-]{25,})/);
                          if (idMatch && idMatch[1]) {
                            const fallback = driveApi.getPreviewUrl(idMatch[1]);
                            if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }
                        }}
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z" />
                      </svg>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById(fileInputId)?.click()}
                    disabled={uploadingField === "photo"}
                    className="text-xs font-semibold text-[#31719B] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {uploadingField === "photo" ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        <span>Verifying...</span>
                      </>
                    ) : formData.photo ? (
                      "Change"
                    ) : (
                      "Upload"
                    )}
                  </button>
                  <input
                    id={fileInputId}
                    name="leadPhoto"
                    aria-label="Upload lead photo"
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
                      <label htmlFor="lead-first-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                        First Name <span className="text-[#e8655a]">*</span>
                      </label>
                      <input
                        id="lead-first-name"
                        name="firstName"
                        aria-label="First Name"
                        type="text"
                        required
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
                      <label htmlFor="lead-middle-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                        Middle Name
                      </label>
                      <input
                        id="lead-middle-name"
                        name="middleName"
                        aria-label="Middle Name"
                        type="text"
                        value={formData.middleName || ""}
                        onChange={(e) => handleChange("middleName", e.target.value)}
                        placeholder="Middle Name"
                        className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                      />
                    </div>

                    <div>
                      <label htmlFor="lead-last-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                        Last Name <span className="text-[#e8655a]">*</span>
                      </label>
                      <input
                        id="lead-last-name"
                        name="lastName"
                        aria-label="Last Name"
                        type="text"
                        required
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
                      <label htmlFor="lead-full-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                        Party Full Name (Computed)
                      </label>
                      <input
                        id="lead-full-name"
                        name="fullName"
                        aria-label="Party Full Name (Computed)"
                        type="text"
                        value={formData.fullName || ""}
                        readOnly
                        placeholder="Party Full Name"
                        className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-[#F6F4F2] dark:bg-[#0b1120] px-3 text-sm font-semibold text-[#000000] dark:text-white cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label htmlFor="lead-abbreviation" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                        Abbreviation
                      </label>
                      <input
                        id="lead-abbreviation"
                        name="abbreviation"
                        aria-label="Abbreviation"
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
                      <label htmlFor="lead-dob" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                        Date of Birth
                      </label>
                      <input
                        id="lead-dob"
                        name="dob"
                        aria-label="Date of Birth"
                        type="date"
                        value={formData.dob || ""}
                        onChange={(e) => handleChange("dob", e.target.value)}
                        className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                      />
                    </div>

                    <div>
                      <label htmlFor="lead-gender" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                        Gender
                      </label>
                      <Select
                        id="lead-gender"
                        aria-label="Gender"
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
                  <label htmlFor="lead-aadhaar-mobile" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Mobile No Linked with Aadhaar
                  </label>
                  <input
                    id="lead-aadhaar-mobile"
                    name="aadhaarMobile"
                    aria-label="Mobile No Linked with Aadhaar"
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
                  <label htmlFor="lead-comm-mobile" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Communication Mobile <span className="text-[#e8655a]">*</span>
                  </label>
                  <input
                    id="lead-comm-mobile"
                    name="mobile"
                    aria-label="Communication Mobile"
                    type="tel"
                    maxLength={10}
                    value={formData.mobile || ""}
                    onChange={(e) =>
                      handleChange("mobile", e.target.value.replace(/\D/g, ""))
                    }
                    required
                    placeholder="Communication Mobile"
                    className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                  />
                </div>

                <div>
                  <label htmlFor="lead-email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Communication Mail ID
                  </label>
                  <input
                    id="lead-email"
                    name="email"
                    aria-label="Communication Mail ID"
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
                    <label htmlFor="lead-pan" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      PAN No
                    </label>
                    <input
                      id="lead-pan"
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
                      placeholder="PAN No"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm uppercase font-mono outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>

                  <div>
                    <label htmlFor="lead-pan-attachment" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer flex items-center justify-between">
                      <span>PAN Attachment</span>
                      {formData.panAttachment && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Drive Verified
                        </span>
                      )}
                    </label>
                    <label htmlFor="lead-pan-attachment" className="h-11 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-[#dde2e8] dark:border-[#475569] text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-[#31719B] px-3 py-2 transition">
                      {uploadingField === "panAttachment" ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span className="text-blue-600 font-semibold">Verifying & Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span className="truncate">
                            {formData.panAttachment || "Attach file"}
                          </span>
                        </>
                      )}
                      <input
                        id="lead-pan-attachment"
                        name="panAttachment"
                        aria-label="Upload PAN file attachment"
                        type="file"
                        onChange={(e) => handleFileUpload("panAttachment", e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label htmlFor="lead-aadhaar" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      Aadhaar No
                    </label>
                    <input
                      id="lead-aadhaar"
                      name="aadhaar"
                      aria-label="Aadhaar No"
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
                    <label htmlFor="lead-aadhaar-attachment" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer flex items-center justify-between">
                      <span>Aadhaar Attachment</span>
                      {formData.aadhaarAttachment && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Drive Verified
                        </span>
                      )}
                    </label>
                    <label htmlFor="lead-aadhaar-attachment" className="h-11 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-[#dde2e8] dark:border-[#475569] text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-[#31719B] px-3 py-2 transition">
                      {uploadingField === "aadhaarAttachment" ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span className="text-blue-600 font-semibold">Verifying & Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span className="truncate">
                            {formData.aadhaarAttachment || "Attach file"}
                          </span>
                        </>
                      )}
                      <input
                        id="lead-aadhaar-attachment"
                        name="aadhaarAttachment"
                        aria-label="Upload Aadhaar file attachment"
                        type="file"
                        onChange={(e) => handleFileUpload("aadhaarAttachment", e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label htmlFor="lead-din" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      DIN / DPIN No
                    </label>
                    <input
                      id="lead-din"
                      name="din"
                      aria-label="DIN or DPIN No"
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
                    <label htmlFor="lead-din-attachment" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer flex items-center justify-between">
                      <span>DIN Attachment</span>
                      {formData.dinAttachment && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Drive Verified
                        </span>
                      )}
                    </label>
                    <label htmlFor="lead-din-attachment" className="h-11 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-[#dde2e8] dark:border-[#475569] text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-[#31719B] px-3 py-2 transition">
                      {uploadingField === "dinAttachment" ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span className="text-blue-600 font-semibold">Verifying & Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span className="truncate">
                            {formData.dinAttachment || "Attach file"}
                          </span>
                        </>
                      )}
                      <input
                        id="lead-din-attachment"
                        name="dinAttachment"
                        aria-label="Upload DIN file attachment"
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
                    <label htmlFor="lead-mca-id" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      MCA V3 ID
                    </label>
                    <input
                      id="lead-mca-id"
                      name="mcaId"
                      aria-label="MCA V3 ID"
                      type="text"
                      value={formData.mcaId || ""}
                      onChange={(e) => handleChange("mcaId", e.target.value)}
                      placeholder="MCA V3 ID"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>

                  <div>
                    <label htmlFor="lead-mca-pw" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      MCA V3 PW
                    </label>
                    <div className="relative">
                      <input
                        id="lead-mca-pw"
                        name="mcaPassword"
                        aria-label="MCA V3 Password"
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
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lead-referred-by" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      Referred By
                    </label>
                    <input
                      id="lead-referred-by"
                      name="referredBy"
                      aria-label="Referred By"
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
                  <label htmlFor="lead-address" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                    Address
                  </label>
                  <textarea
                    id="lead-address"
                    name="address"
                    aria-label="Address"
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
                    <label htmlFor="lead-country" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      Country
                    </label>
                    <input
                      id="lead-country"
                      name="country"
                      aria-label="Country"
                      type="text"
                      value={formData.country || "India"}
                      onChange={(e) => handleChange("country", e.target.value)}
                      placeholder="Country"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>

                  <div>
                    <label htmlFor="lead-state" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      State Name
                    </label>
                    <Select
                      id="lead-state"
                      aria-label="State Name"
                      value={formData.state || "Maharashtra"}
                      onChange={(val) => handleChange("state", val)}
                      options={STATES.map((s) => ({ value: s.label, label: s.label }))}
                      separator={true}
                      searchable={true}
                      placeholder="Select State"
                    />
                  </div>

                  <div>
                    <label htmlFor="lead-pincode" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      Pin Code
                    </label>
                    <input
                      id="lead-pincode"
                      name="pincode"
                      aria-label="Pin Code"
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
                    <label htmlFor="lead-nationality" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      Nationality
                    </label>
                    <input
                      id="lead-nationality"
                      name="nationality"
                      aria-label="Nationality"
                      type="text"
                      value={formData.nationality || "Indian"}
                      readOnly
                      placeholder="Nationality"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-[#F6F4F2] dark:bg-[#0b1120] px-3 text-sm text-[#000000] dark:text-white cursor-not-allowed font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="lead-police-station" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      Police Station
                    </label>
                    <input
                      id="lead-police-station"
                      name="policeStation"
                      aria-label="Police Station"
                      type="text"
                      value={formData.policeStation || ""}
                      onChange={(e) => handleChange("policeStation", e.target.value)}
                      placeholder="Police Station"
                      className="h-11 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3 text-sm outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                    />
                  </div>

                  <div>
                    <label htmlFor="lead-post-office" className="block text-xs font-medium text-gray-700 dark:text-gray-300 py-2 cursor-pointer">
                      Post Office
                    </label>
                    <input
                      id="lead-post-office"
                      name="postOffice"
                      aria-label="Post Office"
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
