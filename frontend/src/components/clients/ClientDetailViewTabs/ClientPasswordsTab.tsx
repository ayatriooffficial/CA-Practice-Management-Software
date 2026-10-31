"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Lock,
  ExternalLink,
  MoreVertical,
  Puzzle,
  X,
  CheckCircle2,
  ShieldCheck,
  Download,
} from "lucide-react";
import { ClientPassword } from "@/data/crmData";
import { getAvatarBadge } from "./utils";
import { usePermission } from "../../team/usePermission";

export interface ClientPasswordsTabProps {
  passwords: ClientPassword[];
  revealedPasswords: Record<string, boolean>;
  setRevealedPasswords: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsAddPasswordOpen: (open: boolean) => void;
  handleDeletePassword: (pwdId: string, portal: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export function getPortalDefaultUrl(portalName: string, existingUrl?: string): string {
  if (existingUrl && existingUrl !== "-" && existingUrl.trim().length > 3) {
    return existingUrl.startsWith("http") ? existingUrl : `https://${existingUrl}`;
  }
  const p = (portalName || "").toLowerCase();
  if (p.includes("traces")) return "https://traces.tdscpc.gov.in";
  if (p.includes("income") || p.includes("it ") || p.includes("it portal"))
    return "https://eportal.incometax.gov.in";
  if (p.includes("gst")) return "https://services.gst.gov.in";
  if (p.includes("mca") || p.includes("roc")) return "https://www.mca.gov.in";
  if (p.includes("epfo") || p.includes("pf")) return "https://unifiedportal-mem.epfindia.gov.in";
  if (p.includes("esic")) return "https://www.esic.in";
  if (p.includes("dgft")) return "https://www.dgft.gov.in";
  return "https://www.incometax.gov.in";
}

export const ClientPasswordsTab: React.FC<ClientPasswordsTabProps> = ({
  passwords,
  revealedPasswords,
  setRevealedPasswords,
  setIsAddPasswordOpen,
  handleDeletePassword,
  showToast,
}) => {
  const { canDelete } = usePermission();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  const handleLaunch = (pwd: ClientPassword) => {
    const launchUrl = getPortalDefaultUrl(pwd.portal, pwd.url);
    window.open(launchUrl, "_blank", "noopener,noreferrer");
    showToast(`Launching ${pwd.portal} in new tab...`);
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-sm border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
      {/* Top Header matching Screenshot 2 */}
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Passwords
        </h2>

        <div className="flex items-center gap-3">
          {/* Get Extension button */}
          <button
            type="button"
            onClick={() => setIsExtensionModalOpen(true)}
            className="h-8 px-3.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Puzzle className="w-3.5 h-3.5 text-gray-500" />
            <span>Get Extension</span>
          </button>

          {/* + Add button */}
          <button
            type="button"
            onClick={() => setIsAddPasswordOpen(true)}
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            className="h-8 px-4 rounded-md text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Table matching Screenshot 2 columns */}
      <div className="overflow-x-auto scrollbar-slim">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                Name
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                Link
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                Username
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                Password
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                Remarks
              </th>
              <th className="w-36 px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {!passwords || passwords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                  No passwords stored. Click &quot;+ Add&quot; to securely store statutory credentials.
                </td>
              </tr>
            ) : (
              passwords.map((pwd, idx) => {
                const isVisible = revealedPasswords[pwd.id || idx];
                const portalUrl = getPortalDefaultUrl(pwd.portal, pwd.url);
                const isMenuOpen = openMenuId === (pwd.id || String(idx));

                return (
                  <tr
                    key={pwd.id || idx}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                  >
                    {/* Name with initials badge and padlock */}
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {getAvatarBadge(pwd.portal, idx)}
                        <span className="font-semibold">{pwd.portal}</span>
                        <Lock className="w-3 h-3 text-gray-400 ml-0.5" />
                      </div>
                    </td>

                    {/* Link */}
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] max-w-[200px]">
                      <a
                        href={portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline block truncate font-mono text-[11px]"
                        title={portalUrl}
                      >
                        {portalUrl.replace(/^https?:\/\//, "")}
                      </a>
                    </td>

                    {/* Username with Copy button */}
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono font-medium text-gray-800 dark:text-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>{pwd.userId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(pwd.userId);
                            showToast("User ID copied to clipboard!");
                          }}
                          title="Copy Username"
                          className="text-gray-400 hover:text-[#31719B] cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Password with Eye and Copy buttons */}
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {isVisible ? pwd.password : "••••••••••••"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPasswords((prev) => ({
                                ...prev,
                                [pwd.id || idx]: !prev[pwd.id || idx],
                              }))
                            }
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                            title={isVisible ? "Hide Password" : "Show Password"}
                          >
                            {isVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(pwd.password || "");
                              showToast("Password copied to clipboard!");
                            }}
                            title="Copy Password"
                            className="text-gray-400 hover:text-[#31719B] cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                      {pwd.remarks && pwd.remarks !== "-" ? pwd.remarks : "—"}
                    </td>

                    {/* Actions: Launch button & Three dots menu */}
                    <td className="px-3 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* ↗ Launch Button matching Screenshot 2 */}
                        <button
                          type="button"
                          onClick={() => handleLaunch(pwd)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline cursor-pointer transition-colors"
                          title={`Launch ${pwd.portal} in a new tab`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Launch</span>
                        </button>

                        {/* Three Dots Menu for Delete / More */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId(isMenuOpen ? null : pwd.id || String(idx))
                            }
                            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                            title="More options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div
                              onMouseLeave={() => setOpenMenuId(null)}
                              className="absolute right-0 mt-1 w-32 rounded-lg bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 shadow-xl py-1 z-30 text-xs text-left animate-in fade-in"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleLaunch(pwd);
                                }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3 text-blue-600" />
                                <span>Launch Portal</span>
                              </button>
                              {canDelete("password") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDeletePassword(pwd.id || "", pwd.portal);
                                  }}
                                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Pagination matching Screenshot 2 */}
      <div className="p-4 border-t border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div></div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <span>
            {passwords && passwords.length > 0
              ? `1-${Math.min(rowsPerPage, passwords.length)} of ${passwords.length}`
              : "0-0 of 0"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="p-1 rounded text-gray-300 dark:text-gray-600 cursor-not-allowed"
            >
              &lt;
            </button>
            <button
              type="button"
              disabled
              className="p-1 rounded text-gray-300 dark:text-gray-600 cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Get Extension Modal */}
      {isExtensionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#31719B] dark:text-[#60a5fa] flex items-center justify-center">
                  <Puzzle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    CA Auto-Fill Extension
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Chrome &amp; Edge Browser Extension
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExtensionModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Auto-fill and securely launch your client&apos;s Income Tax, GST, TRACES, and MCA portals with a single click directly from your practice dashboard without sharing raw credentials.
            </p>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>1-Click automated login to Income Tax &amp; GST portals</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Automatic CAPTCHA recognition &amp; resolution</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Zero-knowledge client-side encryption</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsExtensionModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast("Extension installer package prepared. Chrome Web Store link opened!");
                  setIsExtensionModalOpen(false);
                  window.open("https://chromewebstore.google.com", "_blank", "noopener,noreferrer");
                }}
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Extension</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
