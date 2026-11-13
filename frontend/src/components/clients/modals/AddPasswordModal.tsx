"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Check,
  Zap,
} from "lucide-react";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";

interface PortalDefinition {
  id: string;
  name: string;
  shortName: string;
  loginUrl: string;
  idPlaceholder: string;
  idLabel: string;
  description: string;
  aliases: string[];
}

export const PORTAL_DEFINITIONS: PortalDefinition[] = [
  {
    id: "incometax",
    name: "Income Tax e-Filing Portal (ITD)",
    shortName: "Income Tax",
    loginUrl: "https://eportal.incometax.gov.in/iec/foservices/#/login",
    idPlaceholder: "e.g. PAN (e.g. ABCDE1234F) or Aadhaar",
    idLabel: "User ID (PAN / Aadhaar)",
    description: "ITR Filing, Tax Payments, AIS/26AS, Verification",
    aliases: ["income", "tax", "itd", "itr", "incometax", "e-filing"],
  },
  {
    id: "gst",
    name: "GST Common Portal",
    shortName: "GST",
    loginUrl: "https://services.gst.gov.in/services/login",
    idPlaceholder: "e.g. GSTIN (27AAAAA0000A1Z5) or Username",
    idLabel: "GST Username / GSTIN",
    description: "Returns (GSTR-1, GSTR-3B), Payments, ITC Reconciliation",
    aliases: ["gst", "goods and services", "gstin"],
  },
  {
    id: "mca",
    name: "MCA V3 / ROC Portal",
    shortName: "MCA",
    loginUrl: "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html",
    idPlaceholder: "e.g. MCA User ID, DIN, or Registered Email",
    idLabel: "MCA User ID / DIN",
    description: "Company / LLP annual filings (AOC-4, MGT-7), SPICe+, DIN KYC",
    aliases: ["mca", "roc", "v3", "corporate", "din"],
  },
  {
    id: "ewaybill",
    name: "GST E-Way Bill System",
    shortName: "E-Way Bill",
    loginUrl: "https://ewaybillgst.gov.in/login.aspx",
    idPlaceholder: "e.g. E-Way Bill Username",
    idLabel: "E-Way Bill Username",
    description: "Generating e-way bills for goods transport",
    aliases: ["eway", "e-way", "ewaybill"],
  },
  {
    id: "traces",
    name: "TRACES TDS Portal",
    shortName: "TRACES",
    loginUrl: "https://www.tdscpc.gov.in/app/login.xhtml",
    idPlaceholder: "e.g. TAN or Registered User ID",
    idLabel: "TRACES User ID / TAN",
    description: "TDS statements, Form 16/16A, challan corrections",
    aliases: ["traces", "tds", "cpc", "tan"],
  },
  {
    id: "epfo",
    name: "EPFO Employer Portal",
    shortName: "EPFO",
    loginUrl: "https://unifiedportal-emp.epfindia.gov.in/epfo/",
    idPlaceholder: "e.g. Establishment Username",
    idLabel: "Establishment Username",
    description: "PF monthly ECR filings & employer compliance",
    aliases: ["epfo", "pf", "provident", "uan"],
  },
  {
    id: "esic",
    name: "ESIC Employer Portal",
    shortName: "ESIC",
    loginUrl: "https://www.esic.in/EmployerPortal/ESICInsurancePortal/Portal_LoginNew.aspx",
    idPlaceholder: "e.g. Employer User ID / 17-digit code",
    idLabel: "Employer User ID",
    description: "Employee State Insurance monthly contribution filings",
    aliases: ["esic", "esi"],
  },
  {
    id: "shramsuvidha",
    name: "Shram Suvidha Portal",
    shortName: "Shram Suvidha",
    loginUrl: "https://shramsuvidha.gov.in/login",
    idPlaceholder: "e.g. Labour Identification Number (LIN) or User ID",
    idLabel: "LIN / User ID",
    description: "Unified annual returns & labour law inspections",
    aliases: ["shram", "suvidha", "lin"],
  },
  {
    id: "udyam",
    name: "Udyam MSME Registration",
    shortName: "Udyam MSME",
    loginUrl: "https://udyamregistration.gov.in/Government-India/Ministry-MSME-registration.htm",
    idPlaceholder: "e.g. Udyam Registration No. / Mobile",
    idLabel: "Udyam Registration No.",
    description: "MSME Udyam registration and certificate verification",
    aliases: ["udyam", "msme"],
  },
  {
    id: "nsws",
    name: "National Single Window System (NSWS)",
    shortName: "NSWS",
    loginUrl: "https://www.nsws.gov.in/login",
    idPlaceholder: "e.g. NSWS Registered Email / User ID",
    idLabel: "User ID / Email",
    description: "Centralized investor approvals and state NOC licenses",
    aliases: ["nsws", "single window"],
  },
  {
    id: "startupindia",
    name: "Startup India Portal",
    shortName: "Startup India",
    loginUrl: "https://www.startupindia.gov.in/content/sih/en/login.html",
    idPlaceholder: "e.g. Registered Email ID",
    idLabel: "Registered Email ID",
    description: "DPIIT Recognition and Section 80-IAC Tax Exemption",
    aliases: ["startup", "dpiit"],
  },
  {
    id: "ipindia",
    name: "IP India (Trademark & Patent)",
    shortName: "IP India",
    loginUrl: "https://ipindiaonline.gov.in/eregister/eregister.aspx",
    idPlaceholder: "e.g. Registered User ID",
    idLabel: "IP India User ID",
    description: "Trademarks, Patents, and Designs e-filings",
    aliases: ["ipindia", "trademark", "patent", "ipr"],
  },
  {
    id: "dgft",
    name: "DGFT (Foreign Trade) Portal",
    shortName: "DGFT",
    loginUrl: "https://www.dgft.gov.in/CP/?opt=login",
    idPlaceholder: "e.g. IEC / Registered User ID",
    idLabel: "IEC / Username",
    description: "Import Export Code (IEC) & trade export schemes",
    aliases: ["dgft", "iec", "foreign trade"],
  },
  {
    id: "icegate",
    name: "ICEGATE (Customs Portal)",
    shortName: "ICEGATE",
    loginUrl: "https://www.icegate.gov.in/",
    idPlaceholder: "e.g. ICEGATE User ID",
    idLabel: "ICEGATE User ID",
    description: "Customs e-filing, Bill of Entry, and Shipping Bills",
    aliases: ["icegate", "customs"],
  },
  {
    id: "foscos",
    name: "FSSAI FoSCoS Food Safety",
    shortName: "FoSCoS",
    loginUrl: "https://foscos.fssai.gov.in/",
    idPlaceholder: "e.g. User ID or FSSAI Application / License No.",
    idLabel: "User ID / License No.",
    description: "FSSAI Food License / Registration & Annual Returns",
    aliases: ["foscos", "fssai", "food"],
  },
  {
    id: "gem",
    name: "Government e-Marketplace (GeM)",
    shortName: "GeM",
    loginUrl: "https://gem.gov.in/login",
    idPlaceholder: "e.g. GeM Primary User ID",
    idLabel: "GeM User ID",
    description: "Government procurement & tender participation",
    aliases: ["gem", "marketplace"],
  },
  {
    id: "custom",
    name: "Other / Custom Banking Portal",
    shortName: "Custom / Bank",
    loginUrl: "",
    idPlaceholder: "e.g. Customer ID or Netbanking Login ID",
    idLabel: "Login ID",
    description: "Bank netbanking or other statutory portal",
    aliases: ["custom", "bank", "netbanking"],
  },
];

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
  const [selectedPortalId, setSelectedPortalId] = useState<string>("incometax");
  const [portalCustomName, setPortalCustomName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [url, setUrl] = useState<string>("https://eportal.incometax.gov.in/iec/foservices/#/login");
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const activeDef = useMemo(() => {
    return (
      PORTAL_DEFINITIONS.find((p) => p.id === selectedPortalId) ||
      PORTAL_DEFINITIONS[0]
    );
  }, [selectedPortalId]);

  const handlePortalChange = (portalId: string) => {
    setSelectedPortalId(portalId);
    const target = PORTAL_DEFINITIONS.find((p) => p.id === portalId);
    if (target && target.loginUrl) {
      setUrl(target.loginUrl);
    } else if (portalId === "custom") {
      setUrl("");
    }
  };

  // Detect if current typed URL is a generic homepage that has a recommended direct login page
  const suggestedLoginUrl = useMemo(() => {
    if (!url) return null;
    const clean = url.trim().toLowerCase();

    for (const def of PORTAL_DEFINITIONS) {
      if (!def.loginUrl) continue;
      const targetDomain = new URL(def.loginUrl).hostname.replace(/^www\./, "");
      if (clean.includes(targetDomain) && clean !== def.loginUrl.toLowerCase()) {
        // Current URL is likely home/generic page instead of exact login page
        return def.loginUrl;
      }
    }
    return null;
  }, [url]);

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  // Central save & optional launch routine
  const saveAndExecute = async (autoFillLaunch: boolean = false) => {
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
      const finalPortalName =
        selectedPortalId === "custom" && portalCustomName.trim()
          ? portalCustomName.trim()
          : activeDef.name;

      const finalUrl = url.trim() || activeDef.loginUrl || "-";

      const payload = {
        portal: finalPortalName,
        userId: username.trim(),
        username: username.trim(),
        password: password.trim(),
        url: finalUrl,
        remarks: remarks.trim() || "-",
      };

      const res = await clientApi.addPassword(client.id, payload);
      if (res.data) {
        onSuccess(res.data);

        // If user requested automatic fill & launch
        if (autoFillLaunch) {
          const pId = activeDef.id || "universal";
          const launchUrl =
            finalUrl && finalUrl !== "-" ? finalUrl : activeDef.loginUrl;

          // 1. Dispatch universal autofill event to extension
          window.postMessage(
            {
              type: "CA_PRACTICE_AUTOFILL_PORTAL",
              portalId: pId,
              userId: username.trim(),
              password: password.trim(),
              directorName: remarks || `${activeDef.shortName} Credential`,
              clientName: client.name,
              clientPan: client.pan || "",
              targetUrl: launchUrl,
            },
            "*"
          );

          // 2. Backward compatibility for MCA portal
          if (pId === "mca") {
            window.postMessage(
              {
                type: "CA_PRACTICE_AUTOFILL_MCA",
                mcaId: username.trim(),
                mcaPassword: password.trim(),
                directorName: remarks || "MCA Credential",
                clientName: client.name,
                targetUrl: launchUrl,
              },
              "*"
            );
          }

          // 3. Copy password to clipboard as immediate fallback
          copyToClipboard(password.trim());

          // 4. If extension is not detected on document, open window directly
          const hasExt =
            typeof document !== "undefined" &&
            document.documentElement.dataset.caPracticeExtension;
          if (!hasExt && launchUrl && launchUrl.startsWith("http")) {
            window.open(launchUrl, "_blank", "noopener,noreferrer");
          }
        }

        onClose();
      } else {
        throw new Error(
          (res as any).error || res.message || "Failed to save portal credential"
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveAndExecute(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl shadow-2xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#111827] dark:text-[#f8fafc] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155]"
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

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                {errorMessage}
              </div>
            )}

          {/* Portal Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Statutory Portal <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400">
                {activeDef.description}
              </span>
            </div>

            <select
              value={selectedPortalId}
              onChange={(e) => handlePortalChange(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
            >
              {PORTAL_DEFINITIONS.map((def) => (
                <option key={def.id} value={def.id}>
                  {def.name}
                </option>
              ))}
            </select>

            {/* Quick-Select Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-gray-400 font-medium">
                Quick Select:
              </span>
              {[
                { id: "incometax", label: "Income Tax" },
                { id: "gst", label: "GST" },
                { id: "mca", label: "MCA" },
                { id: "ewaybill", label: "E-Way Bill" },
                { id: "traces", label: "TRACES" },
                { id: "epfo", label: "EPFO" },
                { id: "esic", label: "ESIC" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handlePortalChange(chip.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                    selectedPortalId === chip.id
                      ? "bg-blue-50 dark:bg-blue-950/50 border-[#31719B] text-[#31719B] dark:text-[#60a5fa] font-semibold"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {selectedPortalId === chip.id && (
                    <Check className="w-2.5 h-2.5 inline mr-1" />
                  )}
                  {chip.label}
                </button>
              ))}
            </div>

            {selectedPortalId === "custom" && (
              <div className="mt-2.5">
                <input
                  type="text"
                  required
                  value={portalCustomName}
                  onChange={(e) => setPortalCustomName(e.target.value)}
                  placeholder="Enter Custom Portal or Bank Name (e.g. HDFC Netbanking, Trade Portal)"
                  className="w-full h-8 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
                />
              </div>
            )}
          </div>

          {/* Username / User ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {activeDef.idLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={activeDef.idPlaceholder}
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
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Portal Login URL with smart suggestion and open button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Portal Login URL
              </label>
              {activeDef.loginUrl && url !== activeDef.loginUrl && (
                <button
                  type="button"
                  onClick={() => setUrl(activeDef.loginUrl)}
                  className="text-[10px] text-[#31719B] dark:text-[#60a5fa] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  Reset to Direct Login URL
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-9 px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
              {url && url.startsWith("http") && (
                <button
                  type="button"
                  onClick={() =>
                    window.open(url, "_blank", "noopener,noreferrer")
                  }
                  className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-colors shrink-0"
                  title="Test & Open this URL in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Smart Direct Login URL suggestion badge */}
            {suggestedLoginUrl && (
              <div className="mt-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                <span className="truncate">
                  💡 <b>Tip:</b> Direct login endpoint is:{" "}
                  <code className="font-mono text-[10px]">
                    {suggestedLoginUrl}
                  </code>
                </span>
                <button
                  type="button"
                  onClick={() => setUrl(suggestedLoginUrl)}
                  className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-semibold text-[10px] shrink-0 hover:bg-amber-300 cursor-pointer"
                >
                  Use Direct Login Page
                </button>
              </div>
            )}
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
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-3.5 border-t border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 px-4 rounded-md text-xs font-semibold text-gray-600 dark:text-gray-300 border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {/* Save Only */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Save Credential</span>
            </button>

            {/* Save & Open Website (Auto-Fill) */}
            <button
              type="button"
              onClick={() => saveAndExecute(true)}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-md text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8]"
              title="Saves this credential and immediately opens the login page with automatic form fill"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              )}
              <span>Open & Auto-Fill</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
);
};
