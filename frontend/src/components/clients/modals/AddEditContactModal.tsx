"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Check, AlertCircle, Loader2 } from "lucide-react";
import { IosToggleSwitch } from "@/components/ui/IosToggleSwitch";
import { groupApi } from "@/services/groupApi";

export interface ContactFormData {
  id?: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  name?: string;
  designation?: string;
  din?: string;
  dinStatus?: string;
  appointmentDate?: string;
  isPrimary: boolean;
  email?: string;
  mobile?: string;
  countryCode?: string;
  dob?: string;
  pan?: string;
  aadhar?: string;
  passport?: string;
  passportExpiry?: string;
  fatherName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
}

interface AddEditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => Promise<void>;
  initialData?: ContactFormData | null;
  totalExistingContactsCount?: number;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Puducherry"
];

const DIN_STATUSES = ["Active", "Approved", "Deactivated", "Disqualified", "Surrendered"];

export const AddEditContactModal: React.FC<AddEditContactModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  totalExistingContactsCount = 0,
}) => {
  const isEdit = Boolean(initialData?.id || initialData?.name);

  // Form State
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: "",
    middleName: "",
    lastName: "",
    designation: "Director",
    din: "",
    dinStatus: "Active",
    appointmentDate: "",
    isPrimary: totalExistingContactsCount === 0, // auto-mark primary if first contact
    email: "",
    mobile: "",
    countryCode: "+91",
    dob: "",
    pan: "",
    aadhar: "",
    passport: "",
    passportExpiry: "",
    fatherName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
  });

  // Autocomplete existing contacts
  const [existingContacts, setExistingContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);

  // Validation & Submission
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      const parts = (initialData.name || "").trim().split(" ");
      const fName = initialData.firstName || parts[0] || "";
      const mName = initialData.middleName || (parts.length > 2 ? parts[1] : "");
      const lName = initialData.lastName || (parts.length > 1 ? parts[parts.length - 1] : "");

      setFormData({
        ...initialData,
        firstName: fName,
        middleName: mName,
        lastName: lName,
        isPrimary: initialData.isPrimary ?? (totalExistingContactsCount === 0),
        countryCode: initialData.countryCode || "+91",
      });
    } else {
      setFormData({
        firstName: "",
        middleName: "",
        lastName: "",
        designation: "Director",
        din: "",
        dinStatus: "Active",
        appointmentDate: "",
        isPrimary: totalExistingContactsCount === 0,
        email: "",
        mobile: "",
        countryCode: "+91",
        dob: "",
        pan: "",
        aadhar: "",
        passport: "",
        passportExpiry: "",
        fatherName: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "Maharashtra",
        pincode: "",
      });
    }
    setErrors({});
  }, [initialData, isOpen, totalExistingContactsCount]);

  // Load existing contacts directory
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingDirectory(true);
    groupApi
      .getDirectoryContacts()
      .then((res) => {
        if (res?.data) setExistingContacts(res.data);
      })
      .catch(() => {})
      .finally(() => setIsLoadingDirectory(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ContactFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSelectExisting = (contact: any) => {
    setFormData((prev) => ({
      ...prev,
      firstName: contact.firstName || contact.name?.split(" ")[0] || "",
      middleName: contact.middleName || "",
      lastName: contact.lastName || contact.name?.split(" ").slice(1).join(" ") || "",
      designation: contact.designation || prev.designation,
      din: contact.din || prev.din,
      dinStatus: contact.dinStatus || prev.dinStatus,
      appointmentDate: contact.appointmentDate || prev.appointmentDate,
      email: contact.email || prev.email,
      mobile: contact.mobile || prev.mobile,
      dob: contact.dob || prev.dob,
      pan: contact.pan || prev.pan,
      aadhar: contact.aadhar || prev.aadhar,
      passport: contact.passport || prev.passport,
      passportExpiry: contact.passportExpiry || prev.passportExpiry,
      fatherName: contact.fatherName || prev.fatherName,
      addressLine1: contact.addressLine1 || contact.address || prev.addressLine1,
      addressLine2: contact.addressLine2 || prev.addressLine2,
      city: contact.city || prev.city,
      state: contact.state || prev.state,
      pincode: contact.pincode || prev.pincode,
    }));
    setIsDropdownOpen(false);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errs.firstName = "First Name is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = "Please enter a valid email address";
    }

    if (formData.mobile) {
      const cleanMobile = formData.mobile.replace(/\D/g, "");
      if (cleanMobile.length !== 10) {
        errs.mobile = "Mobile number must be exactly 10 digits";
      }
    }

    if (formData.pan) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(formData.pan.trim())) {
        errs.pan = "Invalid PAN format (e.g. ABCDE1234F)";
      }
    }

    if (formData.aadhar) {
      const cleanAadhar = formData.aadhar.replace(/\D/g, "");
      if (cleanAadhar.length !== 12) {
        errs.aadhar = "Aadhar number must be 12 digits";
      }
    }

    if (formData.pincode) {
      const cleanPin = formData.pincode.replace(/\D/g, "");
      if (cleanPin.length !== 6) {
        errs.pincode = "PIN code must be 6 digits";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const fullName = [formData.firstName, formData.middleName, formData.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      const payload: ContactFormData = {
        ...formData,
        name: fullName || formData.firstName,
        pan: (formData.pan || "").toUpperCase().trim(),
        address: [formData.addressLine1, formData.addressLine2, formData.city, formData.state, formData.pincode]
          .filter(Boolean)
          .join(", "),
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || "Failed to save contact" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExisting = existingContacts.filter((c) =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.pan || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.din || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? "Edit Contact" : "Add Contact"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Enter promoter, director or authorized representative details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {errors.form && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Section 1: Select from Existing Contacts (Image 5) */}
          {!isEdit && (
            <div className="p-4 border border-dashed border-purple-200 dark:border-purple-800/60 bg-purple-50/30 dark:bg-purple-950/20 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-gray-800 dark:text-slate-200">
                Select from existing contacts
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="w-full text-left px-3.5 py-2 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg shadow-2xs hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                >
                  <span className="text-gray-500 dark:text-gray-400">
                    Search existing contacts to autofill details...
                  </span>
                  <Search size={14} className="text-gray-400" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg shadow-xl z-20 max-h-56 overflow-y-auto p-2 space-y-1">
                    <input
                      type="text"
                      placeholder="Type name, PAN, or DIN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-[#d1d5db] dark:border-[#334155] rounded-md outline-hidden mb-2"
                      autoFocus
                    />
                    {filteredExisting.length === 0 ? (
                      <div className="p-3 text-xs text-center text-gray-500">
                        {isLoadingDirectory ? "Loading contacts..." : "No matching contacts found"}
                      </div>
                    ) : (
                      filteredExisting.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectExisting(c)}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs text-gray-800 dark:text-slate-200 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-[11px] text-gray-500 ml-2">({c.designation || "Director"})</span>
                            <p className="text-[10px] text-gray-400">From: {c.clientName}</p>
                          </div>
                          {c.pan && <span className="text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">{c.pan}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 2: DIN Details (Image 5) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wide uppercase text-gray-500 dark:text-gray-400 border-b border-[#dde2e8] dark:border-[#334155] pb-1.5">
              DIN Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border ${
                    errors.firstName ? "border-red-500" : "border-[#d1d5db] dark:border-[#334155]"
                  } rounded-lg outline-hidden focus:border-[#31719B] dark:focus:border-[#31719B] transition-colors`}
                  required
                />
                {errors.firstName && <p className="text-[10px] text-red-500 mt-0.5">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  placeholder="Middle Name"
                  value={formData.middleName || ""}
                  onChange={(e) => handleChange("middleName", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName || ""}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Director, Partner"
                  value={formData.designation || ""}
                  onChange={(e) => handleChange("designation", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  DIN
                </label>
                <input
                  type="text"
                  placeholder="8-digit DIN"
                  maxLength={8}
                  value={formData.din || ""}
                  onChange={(e) => handleChange("din", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  DIN Status
                </label>
                <select
                  value={formData.dinStatus || "Active"}
                  onChange={(e) => handleChange("dinStatus", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                >
                  {DIN_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  DIN Appointment Date
                </label>
                <input
                  type="date"
                  value={formData.appointmentDate || ""}
                  onChange={(e) => handleChange("appointmentDate", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              {/* Mark as Primary Toggle */}
              <div className="flex items-center gap-3 pt-6">
                <IosToggleSwitch
                  checked={formData.isPrimary}
                  onChange={(checked) => handleChange("isPrimary", checked)}
                  ariaLabel="Mark as primary contact"
                />
                <span className="text-xs font-medium text-gray-800 dark:text-slate-200">
                  Mark as Primary (POC)
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Personal Details (Image 5) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wide uppercase text-gray-500 dark:text-gray-400 border-b border-[#dde2e8] dark:border-[#334155] pb-1.5">
              Personal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email ID
                </label>
                <input
                  type="email"
                  placeholder="contact@company.com"
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border ${
                    errors.email ? "border-red-500" : "border-[#d1d5db] dark:border-[#334155]"
                  } rounded-lg outline-hidden focus:border-[#31719B] transition-colors`}
                />
                {errors.email && <p className="text-[10px] text-red-500 mt-0.5">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mobile Number
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-[#d1d5db] dark:border-[#334155] rounded-lg shrink-0">
                    IN +91
                  </span>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    maxLength={10}
                    value={formData.mobile || ""}
                    onChange={(e) => handleChange("mobile", e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border ${
                      errors.mobile ? "border-red-500" : "border-[#d1d5db] dark:border-[#334155]"
                    } rounded-lg outline-hidden focus:border-[#31719B] transition-colors`}
                  />
                </div>
                {errors.mobile && <p className="text-[10px] text-red-500 mt-0.5">{errors.mobile}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dob || ""}
                  onChange={(e) => handleChange("dob", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  value={formData.pan || ""}
                  onChange={(e) => handleChange("pan", e.target.value.toUpperCase())}
                  className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border ${
                    errors.pan ? "border-red-500" : "border-[#d1d5db] dark:border-[#334155]"
                  } rounded-lg outline-hidden focus:border-[#31719B] font-mono transition-colors`}
                />
                {errors.pan && <p className="text-[10px] text-red-500 mt-0.5">{errors.pan}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Aadhar Number
                </label>
                <input
                  type="text"
                  placeholder="12-digit Aadhar"
                  maxLength={12}
                  value={formData.aadhar || ""}
                  onChange={(e) => handleChange("aadhar", e.target.value.replace(/\D/g, ""))}
                  className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border ${
                    errors.aadhar ? "border-red-500" : "border-[#d1d5db] dark:border-[#334155]"
                  } rounded-lg outline-hidden focus:border-[#31719B] font-mono transition-colors`}
                />
                {errors.aadhar && <p className="text-[10px] text-red-500 mt-0.5">{errors.aadhar}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Passport Number
                </label>
                <input
                  type="text"
                  placeholder="Passport Number"
                  value={formData.passport || ""}
                  onChange={(e) => handleChange("passport", e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Passport Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.passportExpiry || ""}
                  onChange={(e) => handleChange("passportExpiry", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Father's Name
                </label>
                <input
                  type="text"
                  placeholder="Father's Name"
                  value={formData.fatherName || ""}
                  onChange={(e) => handleChange("fatherName", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Address Details (Image 5) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wide uppercase text-gray-500 dark:text-gray-400 border-b border-[#dde2e8] dark:border-[#334155] pb-1.5">
              Address Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  placeholder="Building, street, flat no."
                  value={formData.addressLine1 || ""}
                  onChange={(e) => handleChange("addressLine1", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  placeholder="Area, landmark"
                  value={formData.addressLine2 || ""}
                  onChange={(e) => handleChange("addressLine2", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State
                </label>
                <select
                  value={formData.state || "Maharashtra"}
                  onChange={(e) => handleChange("state", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg outline-hidden focus:border-[#31719B] transition-colors"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  placeholder="6-digit PIN"
                  maxLength={6}
                  value={formData.pincode || ""}
                  onChange={(e) => handleChange("pincode", e.target.value.replace(/\D/g, ""))}
                  className={`w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border ${
                    errors.pincode ? "border-red-500" : "border-[#d1d5db] dark:border-[#334155]"
                  } rounded-lg outline-hidden focus:border-[#31719B] font-mono transition-colors`}
                />
                {errors.pincode && <p className="text-[10px] text-red-500 mt-0.5">{errors.pincode}</p>}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
