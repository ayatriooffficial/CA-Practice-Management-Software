"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Loader2, KeyRound, Calendar, Building2, MapPin, Usb, Download } from "lucide-react";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";
import { ConnectorStatusBadge } from "@/components/ui/ConnectorStatusBadge";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { Select } from "@/components/ui/Select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateClients } from "@/store/features/clients/clientSlice";

interface AddDscModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedClientId?: string;   // Passed when opened from Client > DSC tab
  preselectedClientName?: string; // Passed when opened from Client > DSC tab
  client?: Client;
  onSuccess?: (updatedClient?: any) => void;
}

export const AddDscModal: React.FC<AddDscModalProps> = ({
  isOpen,
  onClose,
  preselectedClientId,
  preselectedClientName,
  client,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const reduxClients = useAppSelector((state) => state.clients.items);

  const effectiveClientId = preselectedClientId || client?.id || (client as any)?._id;
  const effectiveClientName = preselectedClientName || client?.name;

  const [localClients, setLocalClients] = useState<Client[]>(reduxClients || []);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const [clientId, setClientId] = useState<string>(effectiveClientId || "");
  const [name, setName] = useState("");
  const [customId, setCustomId] = useState("");
  const [vendor, setVendor] = useState("eMudhra");
  const [dscClass, setDscClass] = useState("Class III");
  const [binNumber, setBinNumber] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [location, setLocation] = useState<"CA Office" | "Client Office" | "Missing" | "In Transit">("CA Office");
  const [status, setStatus] = useState<"Active" | "Expired" | "Revoked">("Active");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReadingToken, setIsReadingToken] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Keep local clients synchronized with Redux store if available
  useEffect(() => {
    if (reduxClients && reduxClients.length > 0) {
      setLocalClients(reduxClients);
    }
  }, [reduxClients]);

  // Fetch clients directly whenever opened in global mode (no preselectedClientId)
  useEffect(() => {
    if (!isOpen || effectiveClientId) return;

    let isMounted = true;
    setIsLoadingClients(true);

    clientApi
      .getClients({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setLocalClients(list);
        if (list.length > 0) {
          dispatch(hydrateClients({ clients: list }));
        }
      })
      .catch((err) => {
        console.error("AddDscModal: Failed to fetch clients:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingClients(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveClientId, dispatch]);

  // Reset form when modal opens or effectiveClientId changes
  useEffect(() => {
    if (isOpen) {
      setClientId(effectiveClientId || "");
      setName("");
      setCustomId("");
      setVendor("eMudhra");
      setDscClass("Class III");
      setBinNumber("");
      setIssuedDate("");
      setExpiryDate("");
      setLocation("CA Office");
      setStatus("Active");
      setRemarks("");
      setErrorMessage("");
    }
  }, [isOpen, effectiveClientId]);

  const activeClients = localClients.length > 0 ? localClients : reduxClients;

  const clientOptions = useMemo(() => {
    return (activeClients || []).map((c) => {
      const id = c.id || (c as any)._id || "";
      const label = c.name + (c.fileNo ? ` (${c.fileNo})` : "");
      return { value: id, label };
    });
  }, [activeClients]);

  const formatToInputDate = (dateVal?: string | Date): string => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleReadFromUSB = async () => {
    setIsReadingToken(true);
    setErrorMessage("");

    try {
      const res = await fetch("http://127.0.0.1:8081/read-dsc");
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `USB Connector error (${res.status})`);
      }
      const data = await res.json();

      setName(data.name || "");
      setCustomId(data.serialNumber || "");

      if (data.expiryDate) {
        setExpiryDate(formatToInputDate(data.expiryDate));
      }
      if (data.issuedDate) {
        setIssuedDate(formatToInputDate(data.issuedDate));
      }

      const issuerLower = (data.issuer || "").toLowerCase();
      if (issuerLower.includes("emudhra")) {
        setVendor("eMudhra");
      } else if (issuerLower.includes("capricorn")) {
        setVendor("Capricorn");
      } else if (issuerLower.includes("vsign")) {
        setVendor("Vsign");
      } else if (issuerLower.includes("pantasign")) {
        setVendor("Pantasign");
      } else if (issuerLower.includes("idsign")) {
        setVendor("IDSign");
      } else {
        setVendor("Other");
      }

      setToast({
        message: `Successfully read DSC token for ${data.name || "Signatory"}!`,
        type: "success",
      });
    } catch (err: any) {
      setToast({
        message: err.message || "Failed to read DSC from USB token. Ensure the connector is running.",
        type: "error",
      });
    } finally {
      setIsReadingToken(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedClientId = effectiveClientId || clientId;
    if (!resolvedClientId) {
      setErrorMessage("Please select a client.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Signatory name is required.");
      return;
    }
    if (!expiryDate) {
      setErrorMessage("Expiry date is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        clientId: resolvedClientId,
        dscId: customId.trim() || undefined,
        name: name.trim(),
        issuedDate: issuedDate ? formatDateDisplay(issuedDate) : "-",
        expiryDate: formatDateDisplay(expiryDate),
        binNumber: binNumber.trim() || "-",
        vendor: vendor.trim() || "-",
        class: dscClass.trim() || "-",
        location,
        status,
        remarks: remarks.trim() || "-",
      };

      const res = await clientApi.addDsc(resolvedClientId, payload);
      if (res.data) {
        onSuccess?.(res.data);
        onClose();
      } else {
        throw new Error((res as any).error || res.message || "Failed to add digital signature");
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
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl my-auto rounded-xl shadow-2xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#111827] dark:text-[#f8fafc] max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] flex-shrink-0 flex items-center justify-between"
          style={{ backgroundColor: "var(--orange-havy-light)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Register Digital Signature (DSC)
              </h2>
              {effectiveClientName && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {effectiveClientName}
                </p>
              )}
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Fields Container */}
          <div className="overflow-y-auto p-6 flex-1 hover:scroll-smooth border-b border-[#dde2e8] dark:border-[#334155] space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
              {errorMessage}
            </div>
          )}

          {!effectiveClientId && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Select Client <span className="text-red-500">*</span>
                </label>
                {isLoadingClients && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#31719B] dark:text-blue-400 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Loading clients...</span>
                  </span>
                )}
              </div>
              <Select
                value={clientId}
                onChange={(val) => {
                  setClientId(val);
                  if (errorMessage) setErrorMessage("");
                }}
                options={clientOptions}
                placeholder={
                  isLoadingClients
                    ? "Loading clients directory..."
                    : clientOptions.length === 0
                    ? "No clients found in database"
                    : "Search and select client..."
                }
                disabled={isLoadingClients}
                searchable={true}
              />
            </div>
          )}

          {/* Local DSC Connector Status Badge & Read from USB Action */}
          <div className="relative overflow-hidden p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 flex items-center justify-center shadow-2xs">
                  <Usb className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block leading-tight">
                    USB DSC Token Connector
                  </span>
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">
                    Auto-fill signatory, serial no., vendor & expiry from physical USB
                  </span>
                </div>
              </div>
              <ConnectorStatusBadge />
            </div>

            <div className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/70 border border-red-200/80 dark:border-red-900/50 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-red-100 dark:border-red-950/60 pb-2">
                <span className="font-bold text-red-800 dark:text-red-300">
                  Quick Setup Steps:
                </span>
                <a
                  href="/downloads/DSC-Connector-Windows.zip"
                  download="DSC-Connector-Windows.zip"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white border border-red-600 shadow-2xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Connector (.zip)</span>
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-red-700 dark:text-red-300">
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    1
                  </span>
                  <span className="font-medium text-red-700 dark:text-red-300">Download and extract ZIP</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    2
                  </span>
                  <span className="font-medium text-red-700 dark:text-red-300">Run DSC-Connector.exe</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    3
                  </span>
                  <span className="font-medium text-red-700 dark:text-red-300">Insert USB & click button</span>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleReadFromUSB}
                disabled={isReadingToken}
                className="w-full sm:w-auto h-8 px-4 rounded-lg text-xs font-bold text-white shadow-xs transition-all hover:bg-red-700 active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 border border-red-600"
              >
                {isReadingToken ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reading from USB Token...</span>
                  </>
                ) : (
                  <>
                    <Usb className="w-3.5 h-3.5" />
                    <span>Read from USB</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Signatory Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Signatory Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kavin, Milton, Lobo, Rajesh Sharma"
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Token / DSC ID
              </label>
              <input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="#S00185"
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Vendor, Class, Bin */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Vendor
              </label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              >
                <option value="eMudhra">eMudhra</option>
                <option value="Capricorn">Capricorn</option>
                <option value="Vsign">Vsign</option>
                <option value="Pantasign">Pantasign</option>
                <option value="IDSign">IDSign</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Class
              </label>
              <select
                value={dscClass}
                onChange={(e) => setDscClass(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              >
                <option value="Class III">Class III</option>
                <option value="Class II">Class II</option>
                <option value="DGFT">DGFT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Bin / Box No.
              </label>
              <input
                type="text"
                value={binNumber}
                onChange={(e) => setBinNumber(e.target.value)}
                placeholder="e.g. 123"
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Issued & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Issued Date
              </label>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Physical Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as any)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              >
                <option value="CA Office">CA Office (Safe Custody)</option>
                <option value="Client Office">Client Office</option>
                <option value="In Transit">In Transit / Courier</option>
                <option value="Missing">Missing / Untraceable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Revoked">Revoked</option>
              </select>
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
              placeholder="e.g. Pin is written on token, token renewal due..."
              className="w-full p-2.5 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B] resize-none"
            />
          </div>

          </div>

          {/* Sticky Footer Actions */}
          <div className="px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0 bg-white dark:bg-[#1e293b]">
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
              <span>Save Digital Signature</span>
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
