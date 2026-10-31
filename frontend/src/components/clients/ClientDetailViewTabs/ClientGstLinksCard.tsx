"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Link2,
  Copy,
  Check,
  RefreshCw,
  XCircle,
  Eye,
  FileCheck,
  Clock,
  AlertTriangle,
  Download,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Client, ClientServiceSetting } from "@/data/crmData";
import { isGstReturnServiceEnabled } from "./utils";
import { gstFormApi, GstLinkItem } from "@/services/gstFormApi";

export interface ClientGstLinksCardProps {
  client?: Client;
  allServices?: ClientServiceSetting[];
}

export const ClientGstLinksCard: React.FC<ClientGstLinksCardProps> = ({ client, allServices }) => {
  if (client && !isGstReturnServiceEnabled(client, allServices)) {
    return null;
  }
  const [links, setLinks] = useState<GstLinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generation Form State
  const now = new Date();
  const defaultMonth = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0");
  const defaultYear = String(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [returnPeriod, setReturnPeriod] = useState<string>(`${defaultMonth}${defaultYear}`);
  const [frequency, setFrequency] = useState<"Monthly" | "Quarterly-QRMP">("Monthly");
  const [turnoverSlab, setTurnoverSlab] = useState<"Up to ₹5 crore" | "Above ₹5 crore">("Up to ₹5 crore");

  // Submission Viewer Modal
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState<any | null>(null);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
  const [activeJsonTab, setActiveJsonTab] = useState<"overview" | "gstr1" | "gstr3b" | "meta">("overview");
  const [copiedJson, setCopiedJson] = useState(false);

  const clientId = client?.id || (client as any)?._id;

  // Extract client GSTIN
  const clientGstin =
    (client as any)?.gstin ||
    (client as any)?.identifiers?.gstin ||
    client?.customerFiles?.statutory?.find((s) => s.type?.toLowerCase().includes("gst"))?.idNo ||
    "";

  const fetchLinks = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const data = await gstFormApi.getClientLinks(clientId);
      setLinks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load GST form links:", err);
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Handle Generate Link
  const handleGenerate = async () => {
    if (!client || !clientId) return;
    setIsGenerating(true);
    try {
      const stateCode = clientGstin ? clientGstin.substring(0, 2) : "27";
      const clientPan =
        (client as any)?.pan ||
        (client as any)?.identifiers?.pan ||
        (clientGstin && clientGstin.length >= 12 ? clientGstin.substring(2, 12) : "");

      const res = await gstFormApi.generateLink({
        clientId: clientId,
        gstin: clientGstin || "27AAACU9603R1ZM",
        legalName: client.legalName || client.name,
        tradeName: client.name,
        pan: clientPan,
        stateCode,
        returnPeriod,
        filingFrequency: frequency,
        turnoverSlab,
        registrationType: "Regular",
      });
      if (res?.publicUrl && res?.linkId) {
        localStorage.setItem(`gst_link_${res.linkId}`, res.publicUrl);
        if (res.rawToken) localStorage.setItem(`gst_token_${res.linkId}`, res.rawToken);
      }
      await fetchLinks();
    } catch (err: any) {
      alert(err.message || "Failed to generate link");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Revoke
  const handleRevoke = async (linkId: string) => {
    if (!confirm("Are you sure you want to revoke this link? The client will no longer be able to open or edit it.")) return;
    try {
      await gstFormApi.revokeLink(linkId);
      await fetchLinks();
    } catch (err: any) {
      alert(err.message || "Failed to revoke link");
    }
  };

  // Handle Regenerate
  const handleRegenerate = async (linkId: string) => {
    if (!confirm("Generating a new link will invalidate the current active link. Continue?")) return;
    try {
      const res = await gstFormApi.regenerateLink(linkId);
      if (res?.publicUrl && res?.linkId) {
        localStorage.setItem(`gst_link_${res.linkId}`, res.publicUrl);
        if (res.rawToken) localStorage.setItem(`gst_token_${res.linkId}`, res.rawToken);
      }
      await fetchLinks();
    } catch (err: any) {
      alert(err.message || "Failed to regenerate link");
    }
  };

  // Helper to get full link URL
  const getLinkUrl = (linkItem: GstLinkItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    if (linkItem.custom_url) return linkItem.custom_url;
    if (linkItem.publicUrl) return linkItem.publicUrl;
    if (linkItem.custom_slug) return `${origin}/gst-form/${linkItem.custom_slug}`;
    if (linkItem.rawToken) return `${origin}/gst-form/${linkItem.rawToken}`;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`gst_link_${linkItem._id}`);
      if (saved) return saved;
      const savedToken = localStorage.getItem(`gst_token_${linkItem._id}`);
      if (savedToken) return `${origin}/gst-form/${savedToken}`;
    }
    return `${origin}/gst-form/${linkItem._id}`;
  };

  // Handle Copy Link
  const handleCopyLink = (linkItem: GstLinkItem) => {
    const url = getLinkUrl(linkItem);
    navigator.clipboard.writeText(url);
    setCopiedId(linkItem._id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Handle View Submission
  const handleViewSubmission = async (linkItem: GstLinkItem) => {
    setIsLoadingSubmission(true);
    const targetId = linkItem.submission_id || linkItem._id;
    setSelectedSubmissionId(targetId);
    setActiveJsonTab("overview");
    try {
      // Find submission by submission_id or link id
      const sub = await gstFormApi.getSubmission(targetId);
      setSubmissionData(sub);
    } catch (err: any) {
      alert(err.message || "Failed to load submission data");
      setSelectedSubmissionId(null);
    } finally {
      setIsLoadingSubmission(false);
    }
  };

  const handleDownloadActiveJson = () => {
    if (!submissionData) return;
    let content = "";
    let filename = "";
    if (activeJsonTab === "gstr1") {
      content = JSON.stringify(submissionData.gstr1, null, 2);
      filename = `gstr1_${submissionData.return_period || "export"}.json`;
    } else if (activeJsonTab === "gstr3b") {
      content = JSON.stringify(submissionData.gstr3b, null, 2);
      filename = `gstr3b_${submissionData.return_period || "export"}.json`;
    } else {
      content = JSON.stringify(
        {
          submission_id: submissionData._id,
          client_id: submissionData.client_id,
          gstin: submissionData.gstin,
          return_period: submissionData.return_period,
          schema_version: submissionData.schema_version,
          payload_sha256: submissionData.payload_sha256,
          submitted_at: submissionData.submitted_at,
          validation_report: submissionData.validation_report,
        },
        null,
        2
      );
      filename = `meta_${submissionData.return_period || "export"}.json`;
    }

    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyActiveJson = () => {
    if (!submissionData) return;
    let content = "";
    if (activeJsonTab === "gstr1") {
      content = JSON.stringify(submissionData.gstr1, null, 2);
    } else if (activeJsonTab === "gstr3b") {
      content = JSON.stringify(submissionData.gstr3b, null, 2);
    } else {
      content = JSON.stringify(
        {
          submission_id: submissionData._id,
          client_id: submissionData.client_id,
          gstin: submissionData.gstin,
          return_period: submissionData.return_period,
          schema_version: submissionData.schema_version,
          payload_sha256: submissionData.payload_sha256,
          submitted_at: submissionData.submitted_at,
          validation_report: submissionData.validation_report,
        },
        null,
        2
      );
    }
    navigator.clipboard.writeText(content);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getSubmissionOverview = () => {
    if (!submissionData) return null;
    const g1 = submissionData.gstr1 || {};
    const g3b = submissionData.gstr3b || {};

    const b2bInvoices = (g1.b2b || []).flatMap((r: any) => r.inv || []);
    const b2bTaxable = b2bInvoices.reduce((sum: number, inv: any) => {
      const itmSum = (inv.itms || []).reduce((s: number, it: any) => s + (Number(it.itm_det?.txval) || 0), 0);
      return sum + itmSum;
    }, 0);
    const b2bTax = b2bInvoices.reduce((sum: number, inv: any) => {
      const itmTax = (inv.itms || []).reduce((s: number, it: any) => {
        const d = it.itm_det || {};
        return s + (Number(d.iamt) || 0) + (Number(d.camt) || 0) + (Number(d.samt) || 0) + (Number(d.csamt) || 0);
      }, 0);
      return sum + itmTax;
    }, 0);

    const b2csTaxable = (g1.b2cs || []).reduce((sum: number, r: any) => sum + (Number(r.txval) || 0), 0);
    const b2csTax = (g1.b2cs || []).reduce((sum: number, r: any) => {
      return sum + (Number(r.iamt) || 0) + (Number(r.camt) || 0) + (Number(r.samt) || 0) + (Number(r.csamt) || 0);
    }, 0);

    const sup31 = g3b.sup_details?.osup_det || {};
    const taxable3b = Number(sup31.txval) || (b2bTaxable + b2csTaxable);
    const tax3b = (Number(sup31.iamt) || 0) + (Number(sup31.camt) || 0) + (Number(sup31.samt) || 0) + (Number(sup31.csamt) || 0) || (b2bTax + b2csTax);
    const itcNet = g3b.itc_elg?.itc_net || {};
    const itcClaimed = (Number(itcNet.iamt) || 0) + (Number(itcNet.camt) || 0) + (Number(itcNet.samt) || 0) + (Number(itcNet.csamt) || 0);
    const estCash = Math.max(0, tax3b - itcClaimed);

    return {
      b2bCount: b2bInvoices.length,
      b2csCount: (g1.b2cs || []).length,
      hsnCount: ((g1.hsn?.hsn_b2b || []).length + (g1.hsn?.hsn_b2c || []).length),
      taxable3b,
      tax3b,
      itcClaimed,
      estCash,
      signatory: submissionData.raw_draft?.gstr3b?.verification?.signatory_name || "Authorized Signatory",
      place: submissionData.raw_draft?.gstr3b?.verification?.place || "Client Location",
    };
  };

  const activeLink = (links || []).find((l) => l.status === "ACTIVE");

  // Calculate remaining time for active link
  const getTimeRemaining = (_expiresAtStr?: string | null) => {
    return "Never Expires";
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dde2e8] dark:border-[#334155] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#eaf2f8] dark:bg-[#31719B]/20 text-[#31719B] flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>GSTR-1 & GSTR-3B Client Data Collection</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-[#31719B] dark:bg-blue-900/40 dark:text-blue-300">
                Phase 1 Active
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Generate a secure dynamic form link for client data entry (GSTR-1 & GSTR-3B) with zero login.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLinks}
          disabled={isLoading}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Refresh Link Status"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Active Link Banner if exists */}
      {activeLink ? (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Link
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                Never Expires
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Period: {activeLink.return_period} ({activeLink.filing_frequency})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getLinkUrl(activeLink)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#31719B] text-white hover:bg-[#275a7c] shadow-xs cursor-pointer transition-colors"
              >
                <span>Open Form ↗</span>
              </a>

              <button
                type="button"
                onClick={() => handleCopyLink(activeLink)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-[#dde2e8] dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-50 shadow-xs cursor-pointer"
              >
                {copiedId === activeLink._id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleRegenerate(activeLink._id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-[#dde2e8] dark:border-gray-700 text-[#31719B] hover:bg-gray-50 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>

              <button
                type="button"
                onClick={() => handleRevoke(activeLink._id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 shadow-xs cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Revoke</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-700 dark:text-gray-300 break-all bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 font-mono flex items-center justify-between gap-2">
            <span>{getLinkUrl(activeLink)}</span>
          </div>
        </div>
      ) : (
        /* Generator Controls */
        <div className="p-4 rounded-xl border border-dashed border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-[#0f172a]/40 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Return Period (MMYYYY)
              </label>
              <input
                type="text"
                value={returnPeriod}
                onChange={(e) => setReturnPeriod(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="e.g. 102026"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-3 font-mono outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Filing Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-3 outline-none focus:border-[#31719B]"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly-QRMP">Quarterly (QRMP)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Turnover Slab
              </label>
              <select
                value={turnoverSlab}
                onChange={(e) => setTurnoverSlab(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-3 outline-none focus:border-[#31719B]"
              >
                <option value="Up to ₹5 crore">Up to ₹5 crore (4-digit HSN)</option>
                <option value="Above ₹5 crore">Above ₹5 crore (6-digit HSN)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !returnPeriod || returnPeriod.length < 6}
                className="w-full h-9 rounded-lg text-xs font-semibold text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "var(--primary, #31719B)" }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    <span>Generate Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Links / Submissions Table */}
      <div>
        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
          Link & Submission History ({links?.length || 0})
        </h3>

        {!links || links.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            No GST collection links generated yet for this client.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created At</th>
                  <th className="py-2.5 px-3">Status / Expiry</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                {(links || []).map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-2.5 px-3 font-mono font-medium text-gray-900 dark:text-white">
                      {item.return_period}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                      {item.filing_frequency}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : item.status === "SUBMITTED"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
                            : item.status === "EXPIRED"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {new Date(item.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {item.status === "SUBMITTED" && item.submitted_at ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          Submitted on{" "}
                          {new Date(item.submitted_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : item.status === "ACTIVE" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Never Expires
                        </span>
                      ) : (
                        <span className="text-gray-400">{item.status}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      {item.status === "ACTIVE" && (
                        <>
                          <a
                            href={getLinkUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#31719B] hover:underline font-semibold"
                          >
                            Open ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(item)}
                            className="text-[#31719B] hover:underline font-semibold"
                          >
                            Copy
                          </button>
                        </>
                      )}
                      {item.status === "SUBMITTED" && (
                        <button
                          type="button"
                          onClick={() => handleViewSubmission(item)}
                          className="text-[#31719B] hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Submission</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Details Modal */}
      {selectedSubmissionId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#31719B]" />
                  <span>GST Return Submission Data</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                  Period: {submissionData?.return_period} · GSTIN: {submissionData?.gstin}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubmissionId(null);
                  setSubmissionData(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {isLoadingSubmission ? (
                <div className="py-12 flex flex-col items-center justify-center text-xs text-gray-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
                  <span>Loading submission files...</span>
                </div>
              ) : submissionData ? (
                <>
                  {/* Meta Strip */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg text-xs">
                    <div>
                      <span className="text-gray-400 block">Submitted At</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {new Date(submissionData.submitted_at).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Schema Version</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {submissionData.schema_version}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-400 block">Payload SHA-256</span>
                      <span className="font-mono text-[10px] text-gray-700 dark:text-gray-300 truncate block">
                        {submissionData.payload_sha256}
                      </span>
                    </div>
                  </div>

                  {/* JSON Tabs & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dde2e8] dark:border-[#334155] pb-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveJsonTab("overview")}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                          activeJsonTab === "overview"
                            ? "border-[#31719B] text-[#31719B]"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                        }`}
                      >
                        Summary Overview
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveJsonTab("gstr1")}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                          activeJsonTab === "gstr1"
                            ? "border-[#31719B] text-[#31719B]"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                        }`}
                      >
                        Canonical gstr1.json
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveJsonTab("gstr3b")}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                          activeJsonTab === "gstr3b"
                            ? "border-[#31719B] text-[#31719B]"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                        }`}
                      >
                        Canonical gstr3b.json
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveJsonTab("meta")}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                          activeJsonTab === "meta"
                            ? "border-[#31719B] text-[#31719B]"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                        }`}
                      >
                        meta.json
                      </button>
                    </div>

                    {activeJsonTab !== "overview" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyActiveJson}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-xs cursor-pointer"
                        >
                          {copiedJson ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadActiveJson}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#31719B] hover:bg-gray-50 shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download JSON</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {activeJsonTab === "overview" ? (
                    <div className="space-y-4 text-xs">
                      {(() => {
                        const ov = getSubmissionOverview();
                        if (!ov) return null;
                        return (
                          <>
                            {/* Summary Metric Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                                <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Sales Taxable (3.1)</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  ₹{ov.taxable3b.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                                <span className="text-gray-500 dark:text-gray-400 block text-[11px]">GST Output Tax</span>
                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                  ₹{ov.tax3b.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                                <span className="text-gray-500 dark:text-gray-400 block text-[11px]">ITC Claimed (Table 4)</span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{ov.itcClaimed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                                <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Est. Cash Tax</span>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  ₹{ov.estCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            {/* Section breakdown */}
                            <div className="border border-[#dde2e8] dark:border-[#334155] rounded-lg p-3 space-y-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                                <span>GSTR-1 Invoices & Summary</span>
                                <span className="text-[11px] text-gray-500 font-normal">
                                  {ov.b2bCount} B2B Invoices · {ov.b2csCount} B2C Rows · {ov.hsnCount} HSN Rows
                                </span>
                              </h4>
                              {/* B2B Table if any */}
                              {(submissionData.gstr1?.b2b || []).length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                      <tr>
                                        <th className="p-1.5">Recipient GSTIN</th>
                                        <th className="p-1.5">Invoice No</th>
                                        <th className="p-1.5">Date</th>
                                        <th className="p-1.5 text-right">Value</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                      {(submissionData.gstr1?.b2b || []).flatMap((r: any) =>
                                        (r.inv || []).map((inv: any, idx: number) => (
                                          <tr key={`${r.ctin}-${inv.inum}-${idx}`}>
                                            <td className="p-1.5 font-mono">{r.ctin}</td>
                                            <td className="p-1.5 font-mono">{inv.inum}</td>
                                            <td className="p-1.5">{inv.idt}</td>
                                            <td className="p-1.5 text-right font-mono font-medium">₹{Number(inv.val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-gray-400 py-2">No B2B invoices in this return.</p>
                              )}
                            </div>

                            {/* Signatory verification strip */}
                            <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg flex items-center justify-between">
                              <div>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 block">Verified & Signed By</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{ov.signatory}</span>
                                <span className="text-[11px] text-gray-400 ml-2">({ov.place})</span>
                              </div>
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Confirmed & Locked
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="relative">
                      <pre className="p-3 bg-gray-950 text-gray-100 rounded-lg text-[11px] font-mono max-h-96 overflow-auto">
                        {JSON.stringify(
                          activeJsonTab === "gstr1"
                            ? submissionData.gstr1
                            : activeJsonTab === "gstr3b"
                            ? submissionData.gstr3b
                            : {
                                submission_id: submissionData._id,
                                client_id: submissionData.client_id,
                                gstin: submissionData.gstin,
                                return_period: submissionData.return_period,
                                schema_version: submissionData.schema_version,
                                payload_sha256: submissionData.payload_sha256,
                                submitted_at: submissionData.submitted_at,
                                validation_report: submissionData.validation_report,
                              },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

