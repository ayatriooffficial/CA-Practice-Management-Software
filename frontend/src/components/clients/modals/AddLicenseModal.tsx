"use client";

import React, { useState, useRef } from "react";
import { X, Loader2, Award, Calendar, Link as LinkIcon, FileText, Upload, CheckCircle2, FileUp } from "lucide-react";
import { clientApi } from "@/services/clientApi";
import { driveApi } from "@/services/driveApi";
import { Client } from "@/data/crmData";

interface AddLicenseModalProps {
  isOpen: boolean;
  client: Client;
  onClose: () => void;
  onSuccess: (updatedClient: Client) => void;
}

export const AddLicenseModal: React.FC<AddLicenseModalProps> = ({
  isOpen,
  client,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [url, setUrl] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("License name is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      let uploadedFileUrl = "";
      let attachedFileName = "";

      if (selectedFile) {
        setIsUploadingDrive(true);
        try {
          const formData = new FormData();
          formData.append("file", selectedFile);
          formData.append("category", "COMPLIANCE_MCA");
          formData.append(
            "description",
            `License Document: ${name.trim()} (${licenseNo.trim() || "No Lic No"})`
          );
          formData.append("clientName", client.name);
          if (client.id) formData.append("clientId", client.id);
          formData.append("uploadedBy", "Staff");

          const driveRes = await driveApi.uploadDocument(formData);
          if (driveRes.data) {
            uploadedFileUrl =
              driveRes.data.webViewLink ||
              driveRes.data.previewUrl ||
              (driveRes.data.driveFileId ? driveApi.getDownloadUrl(driveRes.data.driveFileId) : "");
            attachedFileName = selectedFile.name;
          }
        } catch (uploadErr: any) {
          console.warn("Drive upload fallback:", uploadErr);
          attachedFileName = selectedFile.name;
        } finally {
          setIsUploadingDrive(false);
        }
      }

      const payload = {
        name: name.trim(),
        licenseNo: licenseNo.trim() || "-",
        issuedDate: issuedDate ? formatDateDisplay(issuedDate) : "-",
        expiryDate: expiryDate ? formatDateDisplay(expiryDate) : "-",
        url: url.trim() || uploadedFileUrl || "-",
        remarks: remarks.trim() || "-",
        file: attachedFileName || (name.toLowerCase().includes("shop") ? "xls" : "pdf"),
        fileUrl: uploadedFileUrl || undefined,
      };

      const res = await clientApi.addLicense(client.id, payload);
      if (res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        throw new Error((res as any).error || res.message || "Failed to add license");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "-";
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
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Add Client License
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

          {/* License Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              License / Registration Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FSSAI, Shop & Establishment, Factory License, PAN, IEC"
              className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
            />
          </div>

          {/* License Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              License / Registration Number
            </label>
            <input
              type="text"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              placeholder="e.g. 329833232 or 27AADCB2230M1Z2"
              className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Issued Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
                />
              </div>
            </div>
          </div>

          {/* Portal URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Portal / Verification URL
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
              Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. This is the final MOA, renewal due in 60 days..."
              className="w-full p-2.5 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B] resize-none"
            />
          </div>

          {/* Document File / Drive Upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Upload License Document (Google Drive)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-emerald-600">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for Drive Upload
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#31719B] dark:hover:border-[#31719B] rounded-lg p-3 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/20"
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-xs font-semibold text-[#31719B]">
                    Click to browse and upload file
                  </span>
                  <span className="text-[10px] text-gray-400">
                    PDF, DOC, XLSX, or Images up to 25MB (Auto-syncs to Google Drive)
                  </span>
                </div>
              </div>
            )}
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
              <span>Save License</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
