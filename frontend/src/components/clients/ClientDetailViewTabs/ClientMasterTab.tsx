"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Plus,
  Crown,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  FileText,
  StickyNote,
  Award,
  Upload,
  Download,
  Building2,
  FileBadge,
  Repeat,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Puzzle,
} from "lucide-react";
import {
  Client,
  ClientContact,
  ClientPassword,
  ClientLicense,
  ClientServiceSetting,
} from "@/data/crmData";
import { Pagination } from "@/components/ui/Pagination";
import { ClientGstLinksCard } from "./ClientGstLinksCard";
import { ClientMasterSuggestionsCard } from "./ClientMasterSuggestionsCard";
import { isGstReturnServiceEnabled } from "./utils";
import { AddDirectorModal } from "../modals/AddDirectorModal";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { getAvatarBadge } from "./utils";
import { getPortalDefaultUrl } from "./utils";
import { driveApi, DocumentCategory } from "@/services/driveApi";
import { clientApi } from "@/services/clientApi";
import Button from "@/components/ui/Button";
import { groupApi } from "@/services/groupApi";

export interface ClientMasterTabProps {
  allServices?: ClientServiceSetting[];
  client: Client;
  onClientUpdated?: (updated: Client) => void;
  showToast?: (msg: string) => void;
  handleDeleteContact?: (contactId: string, name: string) => Promise<void>;
  setIsAddNoteOpen?: (isOpen: boolean) => void;
  handleDeleteNote?: (noteId: string) => void;
  revealedPasswords?: Record<string, boolean>;
  setRevealedPasswords?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsAddPasswordOpen?: (open: boolean) => void;
  handleDeletePassword?: (pwdId: string, portal: string) => Promise<void>;
  setIsAddLicenseOpen?: (open: boolean) => void;
  handleDeleteLicense?: (licId: string, licName: string) => Promise<void>;
  onEditLicense?: (lic: ClientLicense) => void;
}

export const ClientMasterTab: React.FC<ClientMasterTabProps> = ({
  client,
  allServices,
  onClientUpdated,
  showToast = () => { },
  handleDeleteContact,
  setIsAddNoteOpen,
  handleDeleteNote,
  revealedPasswords = {},
  setRevealedPasswords,
  setIsAddPasswordOpen,
  handleDeletePassword,
  setIsAddLicenseOpen,
  handleDeleteLicense,
  onEditLicense,
}) => {
  const isGstEnabled = useMemo(() => {
    return isGstReturnServiceEnabled(client, allServices);
  }, [client, allServices]);

  // Contacts state & pagination (limit 3)
  const CONTACTS_PER_PAGE = 3;
  const router = useRouter();
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [deleteDirectorConfirm, setDeleteDirectorConfirm] = useState<{
    isOpen: boolean;
    contactId: string;
    contactName: string;
    isLastDirector: boolean;
  }>({
    isOpen: false,
    contactId: "",
    contactName: "",
    isLastDirector: false,
  });
  const [contactsPage, setContactsPage] = useState(1);
  const [revealedMcaPasswords, setRevealedMcaPasswords] = useState<Record<string, boolean>>({});
  const [revealedPromoterPasswords, setRevealedPromoterPasswords] = useState<Record<string, boolean>>({});
  const [revealedStatutoryPasswords, setRevealedStatutoryPasswords] = useState<Record<string, boolean>>({});

  // Browser extension presence detection
  const [hasExtension, setHasExtension] = useState<boolean>(false);
  useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement.dataset.caPracticeExtension) {
      setHasExtension(true);
    }
    const handleExtMsg = (e: MessageEvent) => {
      if (
        e.data?.source === "CA_PRACTICE_EXTENSION" ||
        e.data?.type === "CA_PRACTICE_EXTENSION_READY"
      ) {
        setHasExtension(true);
      }
    };
    window.addEventListener("message", handleExtMsg);
    return () => window.removeEventListener("message", handleExtMsg);
  }, []);

  // Licenses state
  const [showAllLicenses, setShowAllLicenses] = useState(false);
  const [uploadingLicId, setUploadingLicId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetLicForUpload, setTargetLicForUpload] = useState<ClientLicense | null>(null);

  // Passwords internal revealed state fallback
  const [localRevealedPasswords, setLocalRevealedPasswords] = useState<Record<string, boolean>>({});
  const [pocGroupName, setPocGroupName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const cId = client.id || (client as any)._id?.toString();
    if (!cId) return;

    groupApi
      .listGroups({ limit: 100 })
      .then((res) => {
        if (!isMounted || !res?.data) return;
        const matched = res.data.find((g) => {
          const pocId =
            typeof g.pocClientId === "string"
              ? g.pocClientId
              : (g.pocClientId as any)?.id ||
                (g.pocClientId as any)?._id?.toString() ||
                (g.poc?.clientId);
          return pocId && String(pocId) === String(cId);
        });
        if (matched) {
          setPocGroupName(matched.name);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [client.id, (client as any)._id]);
  const activeRevealed = setRevealedPasswords ? revealedPasswords : localRevealedPasswords;
  const togglePasswordReveal = (id: string) => {
    if (setRevealedPasswords) {
      setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
    } else {
      setLocalRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  };

  // Promoters List from customerFiles.promoter
  const promotersList = useMemo(() => {
    return client.customerFiles?.promoter || [];
  }, [client.customerFiles?.promoter]);

  // Contacts dataset (merges contacts with customerFiles.promoter)
  const contactsList: ClientContact[] = useMemo(() => {
    const existing: ClientContact[] = client.contacts || [];
    const promotersMap = new Map<string, any>();
    (client.customerFiles?.promoter || []).forEach((p: any) => {
      if (p.name) promotersMap.set(p.name.trim().toLowerCase(), p);
    });

    const promoters: ClientContact[] = (client.customerFiles?.promoter || []).map((p, i) => ({
      id: `promoter-${p.key || i + 1}`,
      name: p.name,
      isPrimary: i === 0,
      designation: p.designation || "Director",
      pan: p.pan,
      din: p.mcaId,
      mcaId: p.mcaId,
      mcaPassword: p.mcaPassword,
      dinStatus: "Active",
    }));

    if (existing.length === 0) return promoters;
    const existingNames = new Set(existing.map((c) => (c.name || "").trim().toLowerCase()));
    const enrichedExisting = existing.map((c) => {
      const p = promotersMap.get((c.name || "").trim().toLowerCase());
      return {
        ...c,
        mcaId: c.mcaId || p?.mcaId || c.din,
        mcaPassword: c.mcaPassword || p?.mcaPassword,
      };
    });
    const unlisted = promoters.filter((p) => !existingNames.has((p.name || "").trim().toLowerCase()));
    return [...enrichedExisting, ...unlisted];
  }, [client.contacts, client.customerFiles?.promoter]);

  // Comprehensive fallback helper to get MCA ID and Password for a director
  const getDirectorMcaCredentials = (contact: ClientContact) => {
    const id = contact.mcaId || contact.din || "";
    let pwd = contact.mcaPassword || "";

    if (!pwd) {
      const contactName = (contact.name || "").trim().toLowerCase();
      const matchedPromoter = (client.customerFiles?.promoter || []).find((p: any) => {
        const pName = (p.name || "").trim().toLowerCase();
        return (
          (contactName && pName && contactName === pName) ||
          (contact.pan && p.pan && contact.pan.trim().toUpperCase() === p.pan.trim().toUpperCase()) ||
          (id && p.mcaId && id.trim() === p.mcaId.trim())
        );
      });
      if (matchedPromoter?.mcaPassword) {
        pwd = matchedPromoter.mcaPassword;
      }
    }

    if (!pwd) {
      const mcaCred = (passwordsList || []).find((p) => {
        const isMca = p.portal && p.portal.toLowerCase().includes("mca");
        if (!isMca) return false;
        if (id && p.userId && p.userId.trim() === id.trim()) return true;
        if (contact.name && p.remarks && p.remarks.toLowerCase().includes(contact.name.toLowerCase())) return true;
        return true;
      });
      if (mcaCred?.password) {
        pwd = mcaCred.password;
      }
    }

    if (!pwd) {
      const statCred = (client.customerFiles?.statutory || []).find(
        (s: any) => s.type && s.type.toLowerCase().includes("mca") && s.password
      );
      if (statCred?.password) {
        pwd = statCred.password;
      }
    }

    return { id, pwd };
  };

  // Paginated contacts dataset (limit 3)
  const totalContactPages = Math.max(1, Math.ceil(contactsList.length / CONTACTS_PER_PAGE));
  const safeContactsPage = Math.min(Math.max(1, contactsPage), totalContactPages);

  const paginatedContacts = useMemo(() => {
    const start = (safeContactsPage - 1) * CONTACTS_PER_PAGE;
    return contactsList.slice(start, start + CONTACTS_PER_PAGE);
  }, [contactsList, safeContactsPage]);

  // Statutory Details dataset from client.customerFiles?.statutory
  const statutoryList = useMemo(() => {
    return client.customerFiles?.statutory || [];
  }, [client.customerFiles?.statutory]);

  // Recurring Services dataset: merges client.customerFiles.recurring with enabled allServices
  const recurringServicesList = useMemo(() => {
    const fromFiles = (client.customerFiles?.recurring || []).map((r: any, i: number) => {
      const fee = r.totalServiceFee || r.tariff || r.amount;
      return {
        id: `rec-${r.key || i + 1}`,
        name: r.service || r.serviceName || r.type || "Recurring Service",
        periodicity: r.periodicity || "Monthly",
        amount: fee ? (String(fee).startsWith("₹") ? String(fee) : `₹${fee}`) : "-",
        dueDate: r.dueDate || "15th of month",
        status: "Active",
        source: "file",
      };
    });

    const fromSettings = (allServices || [])
      .filter((s) => s.compliance || s.isActive)
      .map((s) => ({
        id: `srv-${s.id || s.serviceId}`,
        name: s.serviceName,
        periodicity: s.frequency || "Monthly",
        amount: s.amount ? `₹${s.amount}` : "-",
        dueDate: s.target || "20th of month",
        status: "Active",
        source: "settings",
      }));

    if (fromFiles.length === 0 && fromSettings.length === 0) {
      return [];
    }

    const seenNames = new Set<string>();
    const combined: any[] = [];

    [...fromFiles, ...fromSettings].forEach((item) => {
      const key = item.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(item);
      }
    });

    return combined;
  }, [client.customerFiles?.recurring, allServices]);

  // Passwords dataset (merges passwords with customerFiles.statutory credentials)
  const passwordsList: ClientPassword[] = useMemo(() => {
    const existing: ClientPassword[] = client.passwords || [];
    const statutoryPwds: ClientPassword[] = (client.customerFiles?.statutory || [])
      .filter((s) => Boolean(s.userId || s.password))
      .map((s, i) => ({
        id: `statutory-pwd-${s.key || i + 1}`,
        portal: s.type,
        userId: s.userId || "-",
        password: s.password || "",
        remarks: s.idNo ? `ID: ${s.idNo}` : undefined,
      }));

    if (existing.length === 0) return statutoryPwds;
    const existingPortals = new Set(existing.map((p) => p.portal.toLowerCase()));
    const unlisted = statutoryPwds.filter((p) => !existingPortals.has(p.portal.toLowerCase()));
    return [...existing, ...unlisted];
  }, [client.passwords, client.customerFiles?.statutory]);

  // Licenses dataset (merges licenses with customerFiles.statutory registrations)
  const licensesList: ClientLicense[] = useMemo(() => {
    const existing: ClientLicense[] = client.licenses || [];
    const statutoryLics: ClientLicense[] = (client.customerFiles?.statutory || []).map((s, i) => ({
      id: `statutory-lic-${s.key || i + 1}`,
      name: s.type,
      licenseNo: s.idNo || "-",
      file: s.attachment || null,
      fileUrl: s.attachment || undefined,
      remarks: s.userId ? `User ID: ${s.userId}` : undefined,
    }));

    if (existing.length === 0) return statutoryLics;
    const existingNames = new Set(existing.map((l) => l.name.toLowerCase()));
    const unlisted = statutoryLics.filter((l) => !existingNames.has(l.name.toLowerCase()));
    return [...existing, ...unlisted];
  }, [client.licenses, client.customerFiles?.statutory]);

  const visibleLicenses = useMemo(() => {
    if (showAllLicenses) return licensesList;
    return licensesList.slice(0, 2);
  }, [licensesList, showAllLicenses]);

  // Notes dataset
  const notesList = useMemo(() => client.notes || [], [client.notes]);

  // License document upload handler
  const triggerLicenseUpload = (lic: ClientLicense) => {
    setTargetLicForUpload(lic);
    fileInputRef.current?.click();
  };

  const handleLicenseFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetLicForUpload || !client) return;

    setUploadingLicId(targetLicForUpload.id || null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", DocumentCategory.COMPLIANCE_MCA);
      formData.append(
        "description",
        `License Document: ${targetLicForUpload.name} (${targetLicForUpload.licenseNo || "No Lic No"})`
      );
      formData.append("clientName", client.name);
      if (client.id) formData.append("clientId", client.id);
      formData.append("uploadedBy", "Staff");

      const driveRes = await driveApi.uploadDocument(formData);
      const uploadedFileUrl =
        driveRes.data?.webViewLink ||
        driveRes.data?.previewUrl ||
        (driveRes.data?.driveFileId ? driveApi.getDownloadUrl(driveRes.data.driveFileId) : "");

      const updatePayload = {
        name: targetLicForUpload.name,
        file: file.name,
        fileUrl: uploadedFileUrl,
        driveFileId: driveRes.data?.driveFileId || null,
      };

      const res = await clientApi.updateLicense(client.id, targetLicForUpload.id || "", updatePayload);
      if (res.data && onClientUpdated) {
        onClientUpdated(res.data);
      }
      showToast("License document attached successfully.");
    } catch (err: any) {
      showToast(err.message || "Failed to upload license document.");
    } finally {
      setUploadingLicId(null);
      setTargetLicForUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150">
      {/* Hidden file input for license upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleLicenseFileChange}
      />

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: EXACT SECTION FLOW                          */}
        {/* 1. Entity Master Details(Promoter Details)              */}
        {/* 2. Contacts & Directors                                  */}
        {/* 3. Statutory Details                                     */}
        {/* 4. Recurring Service                                     */}
        {/* 5. Portal Credentials & Passwords                        */}
        {/* 6. Licenses & Statutory Registrations                    */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* ========================================================================= */}
          {/* SECTION 1: ENTITY MASTER DETAILS (PROMOTER DETAILS)                      */}
          {/* ========================================================================= */}
          <div
            style={{ backgroundColor: "var(--orange-havy-light)" }}
            className="border border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-5 "
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                >
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    Entity Master Details(Promoter Details)
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Primary registration profile, corporate identity and promoter background
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${client.active !== false
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300"
                  }`}
              >
                {client.active !== false ? "● Active & In Good Standing" : "● Inactive"}
              </span>
            </div>

            {/* Entity Information Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  Legal / Business Name
                </span>
                <span className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5 block">
                  {client.legalName || client.name}
                </span>
              </div>

              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  File Number
                </span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono mt-0.5 block">
                  #{client.fileNo || "PVT0000"}
                </span>
              </div>

              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  Permanent Account Number (PAN)
                </span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono mt-0.5 block">
                  {client.pan || "-"}
                </span>
              </div>

              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  Entity / Business Type
                </span>
                <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {client.type || "Private Limited Company"}
                </span>
              </div>

              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  Primary Mobile
                </span>
                <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {client.mobile || "-"}
                </span>
              </div>

              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  Primary Email
                </span>
                <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block truncate">
                  {client.email || "-"}
                </span>
              </div>

              <div className="md:col-span-2">
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  Registered Address
                </span>
                <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {client.addressDetails?.addressLine1 || client.address || "-"}
                </span>
              </div>

              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  City, State & Pincode
                </span>
                <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {[
                    client.addressDetails?.city || client.city,
                    client.addressDetails?.state || client.state,
                    client.addressDetails?.pincode || client.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </span>
              </div>

              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  Client Group
                </span>
                <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {client.group || "Corporate Clients"}
                </span>
              </div>
            </div>

            {/* Entity Tags */}
            {client.tags && client.tags.length > 0 && (
              <div className="border-t border-[#dde2e8] dark:border-[#334155] pt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-gray-400">Tags:</span>
                {client.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Integrated Promoter Details List */}
            {promotersList.length > 0 && (
              <div className="border-t border-[#dde2e8] dark:border-[#334155] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#31719B]" />
                    <span>Promoter Details ({promotersList.length})</span>
                  </h4>
                  <span className="text-[10px] text-gray-500">Key owners & stakeholders</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {promotersList.map((promoter: any, idx: number) => {
                    const pKey = promoter.key || idx;
                    const isPwdRevealed = Boolean(revealedPromoterPasswords[pKey]);
                    return (
                      <div
                        key={pKey}
                        className="bg-white/90 dark:bg-gray-800/80 border border-gray-200/90 dark:border-gray-700 rounded-md p-3 text-xs space-y-2 shadow-2xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block">
                              {promoter.name}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {promoter.designation || "Promoter / Stakeholder"}
                            </span>
                          </div>
                          {promoter.pan && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-[10px] text-gray-700 dark:text-gray-300 font-semibold">
                              PAN: {promoter.pan}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-100 dark:border-gray-700">
                          <div>
                            <span className="text-gray-400 block text-[10px]">MCA ID / DIN</span>
                            <span className="font-mono font-medium text-gray-800 dark:text-gray-200 truncate block">
                              {promoter.mcaId || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">MCA Password</span>
                            {promoter.mcaPassword ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-medium text-gray-800 dark:text-gray-200 text-[10px]">
                                  {isPwdRevealed ? promoter.mcaPassword : "••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedPromoterPasswords((prev) => ({
                                      ...prev,
                                      [pKey]: !prev[pKey],
                                    }))
                                  }
                                  className="text-gray-400 hover:text-[#31719B] p-0.5"
                                  title={isPwdRevealed ? "Hide Password" : "Show Password"}
                                >
                                  {isPwdRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(promoter.mcaPassword, "Promoter Password")}
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                  title="Copy Password"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </div>

                        {(promoter.mcaId || promoter.mcaPassword) && (
                          <div className="pt-2 flex items-center justify-end border-t border-gray-100 dark:border-gray-700/60">
                            <button
                              type="button"
                              onClick={() => {
                                window.postMessage(
                                  {
                                    type: "CA_PRACTICE_AUTOFILL_MCA",
                                    mcaId: promoter.mcaId || "",
                                    mcaPassword: promoter.mcaPassword || "",
                                    directorName: promoter.name,
                                    clientName: client.name,
                                  },
                                  "*"
                                );
                                if (promoter.mcaPassword) copyToClipboard(promoter.mcaPassword, "MCA Password");

                                const hasExt =
                                  typeof document !== "undefined" &&
                                  document.documentElement.dataset.caPracticeExtension;
                                if (!hasExt) {
                                  window.open(
                                    "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html",
                                    "_blank"
                                  );
                                  showToast("Opening MCA login (Password copied to clipboard)");
                                } else {
                                  showToast(`MCA login opened with auto-fill for ${promoter.name}`);
                                }
                              }}
                              className="h-6 px-2 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#31719B] dark:text-[#60a5fa] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Open MCA Portal and Auto-Fill Credentials via CA Practice Extension"
                            >
                              <Puzzle className="w-3 h-3 text-[#31719B] dark:text-[#60a5fa]" />
                              <span>Auto-Fill MCA</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: CONTACTS & DIRECTORS                                          */}
          {/* ========================================================================= */}
          <div
            style={{ backgroundColor: "var(--orange-havy-light)" }}
            className="border border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-4 "
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#31719B] dark:text-[#60a5fa] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Directors & Promoters</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-[#31719B] dark:text-[#60a5fa]">
                      {contactsList.length}
                    </span>
                    {pocGroupName && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
                        <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                        <span>Group POC ({pocGroupName})</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {contactsList.length > 0
                      ? `Showing ${(safeContactsPage - 1) * CONTACTS_PER_PAGE + 1}–${Math.min(
                        safeContactsPage * CONTACTS_PER_PAGE,
                        contactsList.length
                      )} of ${contactsList.length} directors • Limit 3 per page`
                      : "No directors registered"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/downloads/ca-practice-extension.zip"
                  download="ca-practice-extension.zip"
                  className="h-8 px-2.5 rounded-md text-xs font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[#31719B] dark:text-[#60a5fa] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Download CA Practice Auto-Fill Extension (.ZIP for Chrome / Edge)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Extension</span>
                </a>
                <Button
                  type="button"
                  onClick={() => {
                    setEditingContact(null);
                    setIsAddContactModalOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Director</span>
                </Button>
              </div>
            </div>

            {contactsList.length === 0 ? (
              pocGroupName ? (
                <div className="space-y-3">
                  <div className="border rounded-md p-4 transition-all shadow-2xs border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 font-bold text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700">
                          {(client.name || "CL").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                              {client.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-[#31719B] dark:text-[#60a5fa]">
                              Primary Contact
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
                              <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                              <span>Group POC ({pocGroupName})</span>
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {client.type || "Designated POC"} • Client Entity
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px] font-semibold uppercase">Mobile</span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{client.mobile || "-"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] font-semibold uppercase">Email</span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate block">{client.email || "-"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] font-semibold uppercase">PAN</span>
                        <span className="text-gray-700 dark:text-gray-300 font-mono font-medium">{client.pan || "-"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] font-semibold uppercase">Group</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">{pocGroupName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-white/70 dark:bg-gray-800/30 border border-dashed border-gray-300 dark:border-gray-700">
                  <User className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    No directors or contacts registered yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingContact(null);
                      setIsAddContactModalOpen(true);
                    }}
                    className="mt-2 text-xs font-semibold text-[#31719B] hover:underline cursor-pointer"
                  >
                    Add First Director
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {paginatedContacts.map((contact, idx) => {
                  const isPrimary =
                    contact.isPrimary ||
                    (!contactsList.some((c) => c.isPrimary) && idx === 0 && safeContactsPage === 1);
                  const { id: directorMcaId, pwd: directorMcaPassword } = getDirectorMcaCredentials(contact);
                  return (
                    <div
                      key={String(contact.id || "c") + "-" + String(idx)}
                      className={`border rounded-md p-4 transition-all shadow-2xs ${isPrimary
                        ? "border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20"
                        : "border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#1e293b] hover:border-gray-300 dark:hover:border-gray-700"
                        }`}
                    >
                      <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${isPrimary
                              ? "bg-blue-100 dark:bg-blue-900/50 text-[#31719B] dark:text-[#60a5fa]"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                              }`}
                          >
                            {(contact.name || "D").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                                {contact.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isPrimary
                                  ? "bg-blue-100 dark:bg-blue-900/60 text-[#31719B] dark:text-[#60a5fa]"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                  }`}
                              >
                                {isPrimary ? "Primary Director" : "Director"}
                              </span>
                              {isPrimary && pocGroupName && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                  <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                                  <span>Group POC ({pocGroupName})</span>
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                              {contact.designation || "Director"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {(directorMcaId || directorMcaPassword) && (
                            <button
                              type="button"
                              onClick={() => {
                                window.postMessage(
                                  {
                                    type: "CA_PRACTICE_AUTOFILL_MCA",
                                    mcaId: directorMcaId,
                                    mcaPassword: directorMcaPassword,
                                    directorName: contact.name,
                                    clientName: client.name,
                                  },
                                  "*"
                                );
                                if (directorMcaPassword) copyToClipboard(directorMcaPassword, "MCA Password");

                                const hasExt =
                                  typeof document !== "undefined" &&
                                  document.documentElement.dataset.caPracticeExtension;
                                if (!hasExt) {
                                  window.open(
                                    "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html",
                                    "_blank"
                                  );
                                  showToast(`Opening MCA login (Password copied to clipboard)`);
                                } else {
                                  showToast(`MCA login opened with auto-fill for ${contact.name}`);
                                }
                              }}
                              className="h-7 px-2.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#31719B] dark:text-[#60a5fa] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Open MCA Portal and Auto-Fill Credentials via CA Practice Extension"
                            >
                              <Puzzle className="w-3.5 h-3.5" />
                              <span>Auto-Fill MCA</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const q = new URLSearchParams();
                              if (contact.leadId) q.set("leadId", contact.leadId);
                              if (contact.pan && contact.pan !== "-") {
                                q.set("search", contact.pan);
                              } else if (contact.name) {
                                q.set("search", contact.name);
                              }
                              router.push(`/leads?${q.toString()}`);
                            }}
                            className="h-7 px-2.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#31719B] dark:text-[#60a5fa] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Open promoter KYC & identity profile in Leads"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Edit in Leads</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContact(contact);
                              setIsAddContactModalOpen(true);
                            }}
                            className="h-7 px-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:text-[#31719B] text-gray-500 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit designation or company role"
                          >
                            <Pencil className="w-3 h-3 text-gray-500" />
                          </button>
                          {handleDeleteContact && (
                            <button
                              type="button"
                              onClick={() => {
                                const isLast = contactsList.length <= 1;
                                setDeleteDirectorConfirm({
                                  isOpen: true,
                                  contactId: contact.id || "",
                                  contactName: contact.name || "",
                                  isLastDirector: isLast,
                                });
                              }}
                              className="h-7 w-7 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:text-rose-600 text-gray-400 flex items-center justify-center transition-colors cursor-pointer"
                              title={contactsList.length <= 1 ? "Remove Sole Director from Client (Warning)" : "Remove Director from Client"}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-3 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">MCA ID</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className="font-semibold text-gray-800 dark:text-gray-200 font-mono truncate"
                              title={directorMcaId || "-"}
                            >
                              {directorMcaId || "-"}
                            </span>
                            {directorMcaId && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(directorMcaId, "MCA ID")}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-0.5 shrink-0"
                                title="Copy MCA ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">MCA Password</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {directorMcaPassword ? (
                              <>
                                <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono text-[11px]">
                                  {revealedMcaPasswords[contact.id || idx]
                                    ? directorMcaPassword
                                    : "••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedMcaPasswords((prev) => ({
                                      ...prev,
                                      [contact.id || idx]: !prev[contact.id || idx],
                                    }))
                                  }
                                  className="text-gray-400 hover:text-[#31719B] cursor-pointer p-0.5 shrink-0"
                                  title={revealedMcaPasswords[contact.id || idx] ? "Hide Password" : "Show Password"}
                                >
                                  {revealedMcaPasswords[contact.id || idx] ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(directorMcaPassword, "MCA Password")}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-0.5 shrink-0"
                                  title="Copy MCA Password"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <span className="text-gray-400 font-mono">-</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">DIN</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono block mt-0.5">
                            {contact.din || "-"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">PAN</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono block mt-0.5">
                            {contact.pan || "-"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">Mobile</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 block mt-0.5">
                            {contact.mobile || "-"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">Email</span>
                          <span
                            className="font-semibold text-gray-800 dark:text-gray-200 truncate block mt-0.5"
                            title={contact.email}
                          >
                            {contact.email || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination (Limit 3) */}
                {contactsList.length > CONTACTS_PER_PAGE && (
                  <Pagination
                    currentPage={safeContactsPage}
                    pageSize={CONTACTS_PER_PAGE}
                    totalItems={contactsList.length}
                    onPageChange={(page) => setContactsPage(page)}
                    className="rounded-none border border-gray-200 dark:border-gray-700 mt-2 px-4 py-2.5 bg-white/70 dark:bg-gray-800/50"
                  />
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: STATUTORY DETAILS                                              */}
          {/* ========================================================================= */}
          <div
            style={{ backgroundColor: "var(--orange-havy-light)" }}
            className="border border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-4 "
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Statutory Details</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                      {statutoryList.length || (client.pan || (client as any).gstin ? 1 : 0)}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Statutory tax IDs, portal registrations and official certifications
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Statutory Identifiers Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white/90 dark:bg-gray-800/80 border border-gray-200/90 dark:border-gray-700 rounded-md text-xs shadow-2xs">
                <span className="text-[10px] text-gray-400 block font-medium">Income Tax PAN</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono font-bold text-gray-900 dark:text-white text-xs">
                    {client.pan || "-"}
                  </span>
                  {client.pan && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(client.pan || "", "PAN")}
                      className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                      title="Copy PAN"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white/90 dark:bg-gray-800/80 border border-gray-200/90 dark:border-gray-700 rounded-md text-xs shadow-2xs">
                <span className="text-[10px] text-gray-400 block font-medium">GSTIN</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono font-bold text-gray-900 dark:text-white text-xs truncate">
                    {(client as any).gstin || (client as any).gst || "-"}
                  </span>
                  {((client as any).gstin || (client as any).gst) && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard((client as any).gstin || (client as any).gst, "GSTIN")}
                      className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                      title="Copy GSTIN"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white/90 dark:bg-gray-800/80 border border-gray-200/90 dark:border-gray-700 rounded-md text-xs shadow-2xs">
                <span className="text-[10px] text-gray-400 block font-medium">CIN / Corporate Registration</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono font-bold text-gray-900 dark:text-white text-xs truncate">
                    {(client as any).cin || (client as any).regNo || "-"}
                  </span>
                  {((client as any).cin || (client as any).regNo) && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard((client as any).cin || (client as any).regNo, "CIN")}
                      className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                      title="Copy CIN"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Statutory Registrations from customerFiles.statutory */}
            {statutoryList.length === 0 ? (
              <div className="py-6 text-center bg-white/60 dark:bg-gray-800/30  border border-dashed border-gray-300 dark:border-gray-700">
                <ShieldCheck className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  No additional statutory records stored.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {statutoryList.map((stat: any, idx: number) => {
                  const statKey = stat.key || idx;
                  const isPwdRevealed = Boolean(revealedStatutoryPasswords[statKey]);
                  return (
                    <div
                      key={statKey}
                      className="bg-white/90 dark:bg-gray-800/80 border border-gray-200/90 dark:border-gray-700 rounded-md p-3 text-xs shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white text-xs">
                              {stat.type || "Statutory Registration"}
                            </span>
                            {stat.idNo && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                                {stat.idNo}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-[11px] mt-1">
                            {stat.userId && (
                              <span>
                                User ID: <strong className="font-mono text-gray-700 dark:text-gray-300">{stat.userId}</strong>
                              </span>
                            )}
                            {stat.password && (
                              <span className="flex items-center gap-1">
                                Password:{" "}
                                <strong className="font-mono text-gray-700 dark:text-gray-300">
                                  {isPwdRevealed ? stat.password : "••••••••"}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedStatutoryPasswords((prev) => ({
                                      ...prev,
                                      [statKey]: !prev[statKey],
                                    }))
                                  }
                                  className="text-gray-400 hover:text-purple-600 p-0.5"
                                  title={isPwdRevealed ? "Hide Password" : "Show Password"}
                                >
                                  {isPwdRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(stat.password, "Password")}
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                  title="Copy Password"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {stat.attachment && (
                          <a
                            href={stat.attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-6 px-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-[#31719B] flex items-center gap-1 text-[11px] transition-colors"
                          >
                            <FileText className="w-3 h-3 text-purple-600" />
                            <span>Attachment</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: RECURRING SERVICE                                              */}
          {/* ========================================================================= */}
          <div
            style={{ backgroundColor: "var(--orange-havy-light)" }}
            className="border border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-4 "
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Recurring Service</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      {recurringServicesList.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Active compliance retainer cycles, periodic return filings and recurring services
                  </p>
                </div>
              </div>
            </div>

            {recurringServicesList.length === 0 ? (
              <div className="py-8 text-center bg-white/70 dark:bg-gray-800/30  border border-dashed border-gray-300 dark:border-gray-700">
                <Repeat className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  No recurring service engagements configured.
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Enable retainer services from the Service Settings tab to populate recurring cycles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recurringServicesList.map((service, idx) => (
                  <div
                    key={service.id || idx}
                    className="p-3.5 bg-white/90 dark:bg-gray-800/80 border border-gray-200/90 dark:border-gray-700 rounded-md text-xs shadow-2xs space-y-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-900 dark:text-white text-xs block leading-snug">
                          {service.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          <span>Frequency: <strong className="text-gray-700 dark:text-gray-300 capitalize">{service.periodicity}</strong></span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {service.status}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-500">
                      <span>Due Cycle: <strong className="text-gray-700 dark:text-gray-300">{service.dueDate}</strong></span>
                      {service.amount !== "-" && (
                        <span>Fee: <strong className="text-gray-900 dark:text-white font-mono">{service.amount}</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 5: PORTAL CREDENTIALS & PASSWORDS                                */}
          {/* ========================================================================= */}
          <div
            style={{ backgroundColor: "var(--orange-havy-light)" }}
            className="border border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-4 "
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>Portal Credentials & Passwords</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                      {passwordsList.length}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${hasExtension
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-blue-50 dark:bg-blue-950/40 text-[#31719B] dark:text-[#60a5fa] border-blue-200 dark:border-blue-800"
                        }`}
                      title={
                        hasExtension
                          ? "CA Practice Browser Extension Connected & Ready for 1-Click Auto-Fill"
                          : "Browser Extension Auto-Fill available for 16 compliance portals"
                      }
                    >
                      <Puzzle className="w-3 h-3 text-[#31719B] dark:text-[#60a5fa]" />
                      <span>{hasExtension ? "Extension Ready" : "Extension Auto-Fill"}</span>
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Showing top credentials • 1-click Auto-Fill via Extension
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/downloads/ca-practice-extension.zip"
                  download="ca-practice-extension.zip"
                  className="h-8 px-3 rounded-md text-xs font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[#31719B] dark:text-[#60a5fa] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Download CA Practice Auto-Fill Extension (.ZIP for Chrome / Edge)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Extension</span>
                </a>

                {setIsAddPasswordOpen && (
                  <Button
                    type="button"
                    onClick={() => setIsAddPasswordOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Password</span>
                  </Button>
                )}
              </div>
            </div>

            {passwordsList.length === 0 ? (
              <div className="py-8 text-center bg-white/70 dark:bg-gray-800/30  border border-dashed border-gray-300 dark:border-gray-700">
                <Lock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  No portal credentials stored.
                </p>
                {setIsAddPasswordOpen && (
                  <button
                    type="button"
                    onClick={() => setIsAddPasswordOpen(true)}
                    className="mt-2 text-xs font-semibold text-[#31719B] hover:underline cursor-pointer"
                  >
                    + Add Portal Credential
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto scrollbar-slim border border-[#dde2e8] dark:border-[#334155] rounded-md bg-white/90 dark:bg-[#1e293b]">
                <table className="min-w-full text-left text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-[#dde2e8] dark:border-[#334155]">
                    <tr>
                      <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                        Portal
                      </th>
                      <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                        Username
                      </th>
                      <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                        Password
                      </th>
                      <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155] text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {passwordsList.map((pwd, idx) => {
                      const pwdKey = pwd.id || `pwd-${idx}`;
                      const isRevealed = Boolean(activeRevealed[pwdKey] || (pwd.id && activeRevealed[pwd.id]));
                      const launchUrl = getPortalDefaultUrl(pwd.portal, pwd.url);
                      const displayUsername = pwd.userId || (pwd as any).username || "-";

                      return (
                        <tr
                          key={pwdKey}
                          className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800 transition-colors"
                        >
                          <td className="py-2.5 px-3.5 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                              {getAvatarBadge(pwd.portal, idx)}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-900 dark:text-white block">
                                    {pwd.portal}
                                  </span>
                                  <span
                                    className="inline-flex items-center text-[#31719B] dark:text-[#60a5fa] opacity-80 hover:opacity-100 transition-opacity"
                                    title="Auto-fill supported via CA Practice Extension"
                                  >
                                    <Puzzle className="w-3 h-3" />
                                  </span>
                                </div>
                                {(pwd as any).type && (
                                  <span className="text-[10px] text-gray-400 block">{(pwd as any).type}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-1.5 font-mono text-gray-800 dark:text-gray-200">
                              <span>{displayUsername}</span>
                              {displayUsername !== "-" && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(displayUsername, "Username")}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
                                  title="Copy Username"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-gray-900 dark:text-gray-100 font-semibold tracking-wider">
                                {isRevealed ? pwd.password : "••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordReveal(pwd.id || pwdKey)}
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer p-0.5"
                                title={isRevealed ? "Hide Password" : "Show Password"}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              {pwd.password && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(pwd.password || "", "Password")}
                                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer p-0.5"
                                  title="Copy Password"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 border-b border-gray-100 dark:border-gray-800 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(() => {
                                const pLower = (pwd.portal || "").toLowerCase();
                                let pId = "";
                                let pName = "";
                                if (pLower.includes("mca")) { pId = "mca"; pName = "MCA"; }
                                else if (pLower.includes("eway") || pLower.includes("e-way")) { pId = "ewaybill"; pName = "E-Way Bill"; }
                                else if (pLower.includes("gst")) { pId = "gst"; pName = "GST"; }
                                else if (pLower.includes("income") || pLower.includes("itd") || pLower.includes("itr")) { pId = "incometax"; pName = "ITD"; }
                                else if (pLower.includes("traces") || pLower.includes("tds")) { pId = "traces"; pName = "TRACES"; }
                                else if (pLower.includes("epfo") || pLower.includes("pf") || pLower.includes("provident")) { pId = "epfo"; pName = "EPFO"; }
                                else if (pLower.includes("esic") || pLower.includes("esi")) { pId = "esic"; pName = "ESIC"; }
                                else if (pLower.includes("shram") || pLower.includes("suvidha") || pLower.includes("lin")) { pId = "shramsuvidha"; pName = "Shram"; }
                                else if (pLower.includes("udyam") || pLower.includes("msme")) { pId = "udyam"; pName = "Udyam"; }
                                else if (pLower.includes("nsws") || pLower.includes("single window")) { pId = "nsws"; pName = "NSWS"; }
                                else if (pLower.includes("startup")) { pId = "startupindia"; pName = "Startup"; }
                                else if (pLower.includes("ipindia") || pLower.includes("trademark") || pLower.includes("patent")) { pId = "ipindia"; pName = "IP India"; }
                                else if (pLower.includes("dgft") || pLower.includes("iec")) { pId = "dgft"; pName = "DGFT"; }
                                else if (pLower.includes("icegate") || pLower.includes("customs")) { pId = "icegate"; pName = "ICEGATE"; }
                                else if (pLower.includes("foscos") || pLower.includes("fssai") || pLower.includes("food")) { pId = "foscos"; pName = "FoSCoS"; }
                                else if (pLower.includes("gem") || pLower.includes("marketplace")) { pId = "gem"; pName = "GeM"; }
                                else { pId = "universal"; pName = pwd.portal || "Portal"; }

                                if (!pId) return null;

                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      window.postMessage(
                                        {
                                          type: "CA_PRACTICE_AUTOFILL_PORTAL",
                                          portalId: pId,
                                          userId: pwd.userId || "",
                                          password: pwd.password || "",
                                          directorName: pwd.remarks || `${pName} Credential`,
                                          clientName: client.name,
                                          clientPan: client.pan || "",
                                          targetUrl: launchUrl,
                                        },
                                        "*"
                                      );
                                      if (pId === "mca") {
                                        window.postMessage(
                                          {
                                            type: "CA_PRACTICE_AUTOFILL_MCA",
                                            mcaId: pwd.userId || "",
                                            mcaPassword: pwd.password || "",
                                            directorName: pwd.remarks || "MCA Credential",
                                            clientName: client.name,
                                            targetUrl: launchUrl,
                                          },
                                          "*"
                                        );
                                      }
                                      if (pwd.password) copyToClipboard(pwd.password, `${pName} Password`);

                                      const hasExt =
                                        typeof document !== "undefined" &&
                                        document.documentElement.dataset.caPracticeExtension;
                                      if (!hasExt) {
                                        window.open(launchUrl, "_blank");
                                        showToast(`Opening ${pName} login (Password copied to clipboard)`);
                                      } else {
                                        showToast(`${pName} login opened with auto-fill`);
                                      }
                                    }}
                                    className="h-7 px-2.5 rounded-sm border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#31719B] dark:text-[#60a5fa] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                    title={`Open ${pName} Portal and Auto-Fill Credentials via CA Practice Extension`}
                                  >
                                    <Puzzle className="w-3.5 h-3.5" />
                                    <span>Auto-Fill {pName}</span>
                                  </button>
                                );
                              })()}
                              <button
                                type="button"
                                onClick={() => {
                                  const pLower = (pwd.portal || "").toLowerCase();
                                  let pId = "";
                                  if (pLower.includes("mca")) pId = "mca";
                                  else if (pLower.includes("eway") || pLower.includes("e-way")) pId = "ewaybill";
                                  else if (pLower.includes("gst")) pId = "gst";
                                  else if (pLower.includes("income") || pLower.includes("itd") || pLower.includes("itr")) pId = "incometax";
                                  else if (pLower.includes("traces") || pLower.includes("tds")) pId = "traces";
                                  else if (pLower.includes("epfo") || pLower.includes("pf") || pLower.includes("provident")) pId = "epfo";
                                  else if (pLower.includes("esic") || pLower.includes("esi")) pId = "esic";
                                  else if (pLower.includes("shram") || pLower.includes("suvidha") || pLower.includes("lin")) pId = "shramsuvidha";
                                  else if (pLower.includes("udyam") || pLower.includes("msme")) pId = "udyam";
                                  else if (pLower.includes("nsws") || pLower.includes("single window")) pId = "nsws";
                                  else if (pLower.includes("startup")) pId = "startupindia";
                                  else if (pLower.includes("ipindia") || pLower.includes("trademark") || pLower.includes("patent")) pId = "ipindia";
                                  else if (pLower.includes("dgft") || pLower.includes("iec")) pId = "dgft";
                                  else if (pLower.includes("icegate") || pLower.includes("customs")) pId = "icegate";
                                  else if (pLower.includes("foscos") || pLower.includes("fssai") || pLower.includes("food")) pId = "foscos";
                                  else if (pLower.includes("gem") || pLower.includes("marketplace")) pId = "gem";
                                  else pId = "universal";

                                  if (pId) {
                                    window.postMessage(
                                      {
                                        type: "CA_PRACTICE_AUTOFILL_PORTAL",
                                        portalId: pId,
                                        userId: pwd.userId || "",
                                        password: pwd.password || "",
                                        directorName: pwd.remarks || `${pwd.portal} Credential`,
                                        clientName: client.name,
                                        clientPan: client.pan || "",
                                        targetUrl: launchUrl,
                                      },
                                      "*"
                                    );
                                  }

                                  if (pwd.portal?.toLowerCase().includes("mca")) {
                                    window.postMessage(
                                      {
                                        type: "CA_PRACTICE_AUTOFILL_MCA",
                                        mcaId: pwd.userId || "",
                                        mcaPassword: pwd.password || "",
                                        directorName: pwd.remarks || "MCA Credential",
                                        clientName: client.name,
                                        targetUrl: launchUrl,
                                      },
                                      "*"
                                    );
                                    if (pwd.password) copyToClipboard(pwd.password, "MCA Password");
                                  }
                                  window.open(launchUrl, "_blank", "noopener,noreferrer");
                                  showToast(`Launching ${pwd.portal}...`);
                                }}
                                className="h-7 px-2 rounded border border-gray-200 dark:border-gray-700 text-xs font-medium text-[#31719B] dark:text-[#60a5fa] hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1 cursor-pointer"
                                title="Open Portal in New Tab"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Launch</span>
                              </button>
                              {handleDeletePassword && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Delete credential for ${pwd.portal}?`)) {
                                      await handleDeletePassword(pwd.id || "", pwd.portal);
                                    }
                                  }}
                                  className="h-7 w-7 rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                                  title="Delete Credential"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 6: LICENSES & STATUTORY REGISTRATIONS                             */}
          {/* ========================================================================= */}
          <div
            style={{ backgroundColor: "var(--orange-havy-light)" }}
            className="border border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-4 "
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Licenses & Statutory Registrations</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                      {licensesList.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Top 2 licenses shown • Expand to view all licenses
                  </p>
                </div>
              </div>

              {setIsAddLicenseOpen && (
                <button
                  type="button"
                  onClick={() => setIsAddLicenseOpen(true)}
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add License</span>
                </button>
              )}
            </div>

            {licensesList.length === 0 ? (
              <div className="py-8 text-center bg-white/70 dark:bg-gray-800/30  border border-dashed border-gray-300 dark:border-gray-700">
                <Award className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  No statutory licenses added.
                </p>
                {setIsAddLicenseOpen && (
                  <button
                    type="button"
                    onClick={() => setIsAddLicenseOpen(true)}
                    className="mt-2 text-xs font-semibold text-[#31719B] hover:underline cursor-pointer"
                  >
                    + Add License / Registration
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleLicenses.map((lic, idx) => (
                  <div
                    key={lic.id || idx}
                    className="border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#1e293b] p-4 hover:border-gray-300 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs rounded-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <FileBadge className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {lic.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Active
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500 dark:text-gray-400">
                          <span>
                            License No:{" "}
                            <strong className="font-mono text-gray-800 dark:text-gray-200">
                              {lic.licenseNo || "-"}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>Authority: {(lic as any).authority || "Government Portal"}</span>
                          {lic.expiryDate && (
                            <>
                              <span>•</span>
                              <span>Expires: {lic.expiryDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {lic.fileUrl ? (
                        <a
                          href={lic.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-[#31719B] flex items-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3 h-3 text-amber-600" />
                          <span>View Doc</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerLicenseUpload(lic)}
                          disabled={uploadingLicId === lic.id}
                          className="h-7 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-[#31719B] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3 h-3 text-gray-400" />
                          <span>{uploadingLicId === lic.id ? "Uploading..." : "Attach File"}</span>
                        </button>
                      )}

                      {onEditLicense && (
                        <button
                          type="button"
                          onClick={() => onEditLicense(lic)}
                          className="h-7 px-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-[#31719B] flex items-center gap-1 cursor-pointer"
                          title="Edit License"
                        >
                          <Pencil className="w-3 h-3 text-[#31719B]" />
                          <span>Edit</span>
                        </button>
                      )}

                      {handleDeleteLicense && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Remove license ${lic.name}?`)) {
                              await handleDeleteLicense(lic.id || "", lic.name);
                            }
                          }}
                          className="h-7 w-7 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                          title="Delete License"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Show More Licenses Toggle Button */}
                {licensesList.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowAllLicenses(!showAllLicenses)}
                    className="w-full py-2 px-3 rounded-md border border-dashed border-[#dde2e8] dark:border-[#334155] bg-white/70 dark:bg-gray-800/40 hover:bg-white text-xs font-semibold text-[#31719B] dark:text-[#60a5fa] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {showAllLicenses ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Show Less Licenses</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>
                          Show More Licenses ({licensesList.length - 2} additional{" "}
                          {licensesList.length - 2 === 1 ? "license" : "licenses"})
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Notes & Observations                       */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 sticky top-4 space-y-4">
          <div
            style={{ backgroundColor: "var(--orange-havy-light)" }}
            className="border border-[#dde2e8] dark:border-[#334155]  overflow-hidden flex flex-col max-h-[820px] shadow-xs"
          >
            {/* Notes Header */}
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <StickyNote className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    Notes & Observations
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    {notesList.length} {notesList.length === 1 ? "entry" : "entries"} recorded
                  </span>
                </div>
              </div>

              {setIsAddNoteOpen && (
                <button
                  type="button"
                  onClick={() => setIsAddNoteOpen(true)}
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  className="h-7 px-3 rounded-md text-xs font-semibold text-white shadow-xs flex items-center gap-1 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Note</span>
                </button>
              )}
            </div>

            {/* Notes Scrollable Body */}
            <div className="p-4 space-y-3 overflow-y-auto scrollbar-slim flex-1">
              {notesList.length === 0 ? (
                <div className="py-16 text-center text-gray-400 font-medium text-xs space-y-2">
                  <StickyNote className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
                  <p>No internal notes recorded yet.</p>
                  {setIsAddNoteOpen && (
                    <button
                      type="button"
                      onClick={() => setIsAddNoteOpen(true)}
                      className="text-xs font-semibold text-[#31719B] hover:underline cursor-pointer"
                    >
                      + Create First Note
                    </button>
                  )}
                </div>
              ) : (
                notesList.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white/90 dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600 transition-colors space-y-2 text-xs shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs leading-snug">
                          {note.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {note.createdAt
                            ? new Date(note.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                            : "Recent"}
                        </span>
                      </div>

                      {handleDeleteNote && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete note "${note.title}"?`)) {
                              handleDeleteNote(note.id || "");
                            }
                          }}
                          className="text-gray-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer shrink-0"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-xs">
                      {note.content}
                    </p>

                    <div className="pt-1 text-[10px] text-gray-400 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                      <span>Logged by {note.author || "Staff"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Master Suggestions Card */}
          <ClientMasterSuggestionsCard clientId={client.id || (client as any)._id} />
        </div>
      </div>

      {/* Add / Edit Director Modal */}
      <AddDirectorModal
        isOpen={isAddContactModalOpen}
        client={client}
        editingContact={editingContact}
        onClose={() => {
          setIsAddContactModalOpen(false);
          setEditingContact(null);
        }}
        onSuccess={(updated) => {
          if (onClientUpdated) {
            onClientUpdated({ ...updated });
          }
          setIsAddContactModalOpen(false);
          setEditingContact(null);
          showToast(editingContact ? "Director updated successfully." : "Director added successfully.");
        }}
      />

      {/* Director Deletion Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={deleteDirectorConfirm.isOpen}
        title={
          deleteDirectorConfirm.isLastDirector
            ? "Remove Last Director & Client"
            : "Remove Director from Client"
        }
        message={
          deleteDirectorConfirm.isLastDirector
            ? `Warning: "${deleteDirectorConfirm.contactName}" is the LAST remaining director for "${client.name}". Removing the last director will also remove client "${client.name}" and hide its associated records.\n\nAre you sure you want to proceed? (Note: The director and their credentials will be removed from this client; their master Lead record will NOT be deleted.)`
            : `Are you sure you want to remove director "${deleteDirectorConfirm.contactName}" from "${client.name}"? This will unlink the director and their credentials from this client only. The lead record in the Leads directory will NOT be deleted.`
        }
        confirmText={
          deleteDirectorConfirm.isLastDirector
            ? "Yes, Remove Last Director & Client"
            : "Remove from Client"
        }
        cancelText="Cancel"
        confirmVariant="danger"
        onCancel={() =>
          setDeleteDirectorConfirm({
            isOpen: false,
            contactId: "",
            contactName: "",
            isLastDirector: false,
          })
        }
        onConfirm={async () => {
          const { contactId, contactName } = deleteDirectorConfirm;
          setDeleteDirectorConfirm({
            isOpen: false,
            contactId: "",
            contactName: "",
            isLastDirector: false,
          });
          if (handleDeleteContact && contactId) {
            await handleDeleteContact(contactId, contactName);
          }
        }}
      />

      {/* GSTR-1 & GSTR-3B Dynamic Client Data Collection Link Card & Captured Suggestions */}
      {isGstEnabled && (
        <ClientGstLinksCard client={client} allServices={allServices} />
      )}
    </div>
  );
};
