"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  INDIAN_STATES,
  BUSINESS_ENTITIES,
  BUSINESS_TYPES,
  CURRENCIES,
  MSME_CATEGORIES,
} from "./types";

export interface OrganizationProfileTabProps {
  businessName: string;
  setBusinessName: (val: string) => void;
  businessEmail: string;
  setBusinessEmail: (val: string) => void;
  contactNumber: string;
  setContactNumber: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  businessEntity: string;
  setBusinessEntity: (val: string) => void;
  businessType: string;
  setBusinessType: (val: string) => void;
  addressLine1: string;
  setAddressLine1: (val: string) => void;
  addressLine2: string;
  setAddressLine2: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  pincode: string;
  setPincode: (val: string) => void;
  isGstRegistered: boolean;
  setIsGstRegistered: (val: boolean) => void;
  gstin: string;
  setGstin: (val: string) => void;
  cinNumber: string;
  setCinNumber: (val: string) => void;
  panNumber: string;
  setPanNumber: (val: string) => void;
  tanNumber: string;
  setTanNumber: (val: string) => void;
  udyamNumber: string;
  setUdyamNumber: (val: string) => void;
  msmeCategory: string;
  setMsmeCategory: (val: string) => void;
  professionalTaxNumber: string;
  setProfessionalTaxNumber: (val: string) => void;
  providentFundNumber: string;
  setProvidentFundNumber: (val: string) => void;
  esiRegistrationNumber: string;
  setEsiRegistrationNumber: (val: string) => void;
  isSaving: boolean;
  onSave: () => void;
  onSkip: () => void;
}

export const OrganizationProfileTab: React.FC<OrganizationProfileTabProps> = ({
  businessName,
  setBusinessName,
  businessEmail,
  setBusinessEmail,
  contactNumber,
  setContactNumber,
  currency,
  setCurrency,
  businessEntity,
  setBusinessEntity,
  businessType,
  setBusinessType,
  addressLine1,
  setAddressLine1,
  addressLine2,
  setAddressLine2,
  city,
  setCity,
  country,
  setCountry,
  state,
  setState,
  pincode,
  setPincode,
  isGstRegistered,
  setIsGstRegistered,
  gstin,
  setGstin,
  cinNumber,
  setCinNumber,
  panNumber,
  setPanNumber,
  tanNumber,
  setTanNumber,
  udyamNumber,
  setUdyamNumber,
  msmeCategory,
  setMsmeCategory,
  professionalTaxNumber,
  setProfessionalTaxNumber,
  providentFundNumber,
  setProvidentFundNumber,
  esiRegistrationNumber,
  setEsiRegistrationNumber,
  isSaving,
  onSave,
  onSkip,
}) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Row 1 */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Enter Business Name"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Business Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            placeholder="name@business.com"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="9876543210"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        {/* Row 2 */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Currency <span className="text-red-500">*</span>
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Business Entity <span className="text-red-500">*</span>
          </label>
          <select
            value={businessEntity}
            onChange={(e) => setBusinessEntity(e.target.value)}
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          >
            {BUSINESS_ENTITIES.map((be) => (
              <option key={be} value={be}>
                {be}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Business Type <span className="text-red-500">*</span>
          </label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          >
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt} value={bt}>
                {bt}
              </option>
            ))}
          </select>
        </div>

        {/* Row 3 */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Address Line 1 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Address Line 1"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Address Line 2 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Address Line 2"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        {/* Row 4 */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="India"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            State <span className="text-red-500">*</span>
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          >
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Pin Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="560038"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>
      </div>

      {/* Row 5: GST Toggle and Input */}
      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-[var(--text-main)]">
            Is GST Registered
          </span>
          <button
            type="button"
            onClick={() => setIsGstRegistered(!isGstRegistered)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isGstRegistered ? "bg-[#635BFF]" : "bg-gray-300 dark:bg-gray-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isGstRegistered ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {isGstRegistered && (
          <div className="max-w-md">
            <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
              GSTIN
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 29AARCS3638L2ZH"
              className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
            />
          </div>
        )}
      </div>

      {/* Row 6: CIN, PAN, TAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            CIN Number
          </label>
          <input
            type="text"
            value={cinNumber}
            onChange={(e) => setCinNumber(e.target.value.toUpperCase())}
            placeholder="CIN Number"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            PAN Number
          </label>
          <input
            type="text"
            value={panNumber}
            onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
            placeholder="PAN Number"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            TAN Number
          </label>
          <input
            type="text"
            value={tanNumber}
            onChange={(e) => setTanNumber(e.target.value.toUpperCase())}
            placeholder="TAN Number"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>
      </div>

      {/* Row 7: Udyam, MSME, Professional Tax */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Udyam Number
          </label>
          <input
            type="text"
            value={udyamNumber}
            onChange={(e) => setUdyamNumber(e.target.value.toUpperCase())}
            placeholder="Udyam Number"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            MSME Category
          </label>
          <select
            value={msmeCategory}
            onChange={(e) => setMsmeCategory(e.target.value)}
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          >
            {MSME_CATEGORIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Professional Tax Number
          </label>
          <input
            type="text"
            value={professionalTaxNumber}
            onChange={(e) => setProfessionalTaxNumber(e.target.value)}
            placeholder="Professional Tax Number"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>
      </div>

      {/* Row 8: PF & ESI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            Provident Fund Number
          </label>
          <input
            type="text"
            value={providentFundNumber}
            onChange={(e) => setProvidentFundNumber(e.target.value)}
            placeholder="Provident Fund Number"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
            ESI Registration Number
          </label>
          <input
            type="text"
            value={esiRegistrationNumber}
            onChange={(e) => setEsiRegistrationNumber(e.target.value)}
            placeholder="Enter ESI Registration Number"
            className="w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition-all"
          />
        </div>
      </div>

      {/* Step 1 Actions */}
      <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="px-6 py-2.5 rounded-lg bg-[#635BFF] hover:bg-[#5349e0] text-sm font-semibold text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>Save & Next</span>
        </button>
      </div>
    </div>
  );
};
