"use client";

import React, { useState } from "react";
import { X, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";

interface AddPasswordModalProps {
  isOpen: boolean;
  client: Client;
  onClose: () => void;
  onSuccess: (updatedClient: Client) => void;
}

export const AddPasswordModal: React.FC<AddPasswordModalProps> = ({
  isOpen,
  client,
  onClose,
  onSuccess,
}) => {
  const [portal, setPortal] = useState("Income Tax Portal");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [url, setUrl] = useState("https://www.incometax.gov.in");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handlePortalChange = (val: string) => {
    setPortal(val);
    switch (val) {
      case "Income Tax Portal":
        setUrl("https://www.incometax.gov.in");
        break;
      case "GST Portal":
        setUrl("https://services.gst.gov.in");
        break;
      case "MCA / ROC V3":
        setUrl("https://www.mca.gov.in");
        break;
      case "TRACES (TDS)":
        setUrl("https://contents.tdscpc.gov.in");
        break;
      case "EPFO / Unified Portal":
        setUrl("https://unifiedportal-mem.epfindia.gov.in");
        break;
      case "ESIC Portal":
        setUrl("https://www.esic.in");
        break;
      case "DGFT":
        setUrl("https://www.dgft.gov.in");
        break;
      default:
        setUrl("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage("User ID / Login ID is required.");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Password is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        portal,
        userId: username.trim(),
        username: username.trim(),
        password: password.trim(),
        url: url.trim() || "-",
        remarks: remarks.trim() || "-",
      };

      const res = await clientApi.addPassword(client.id, payload);
      if (res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        throw new Error((res as any).error || res.message || "Failed to save portal credential");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
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
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Add Portal Credential
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

          {/* Portal Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Statutory Portal <span className="text-red-500">*</span>
            </label>
            <select
              value={portal}
              onChange={(e) => handlePortalChange(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
            >
              <option value="Income Tax Portal">Income Tax e-Filing Portal</option>
              <option value="GST Portal">GST Common Portal</option>
              <option value="MCA / ROC V3">MCA V3 / ROC Portal</option>
              <option value="TRACES (TDS)">TRACES TDS Portal</option>
              <option value="EPFO / Unified Portal">EPFO Employer Portal</option>
              <option value="ESIC Portal">ESIC Portal</option>
              <option value="DGFT">DGFT Portal</option>
              <option value="Custom Portal">Other / Bank Netbanking</option>
            </select>
          </div>

          {/* Username / User ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              User ID / Login ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. PAN or GSTIN or registered username"
              className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full h-9 pl-3 pr-10 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Portal URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Portal Login URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Security Remarks / Secondary Authentication
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. OTP sent to Director's mobile, password changed on May 2026..."
              className="w-full p-2.5 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B] resize-none"
            />
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
              <span>Save Credential</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
