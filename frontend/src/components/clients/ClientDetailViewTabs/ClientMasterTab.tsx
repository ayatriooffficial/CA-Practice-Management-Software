"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  User,
  Plus,
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
  Building2,
  FileBadge,
} from "lucide-react";
import { Client, ClientContact, ClientPassword, ClientLicense, ClientServiceSetting } from "@/data/crmData";
import { ClientGstLinksCard } from "./ClientGstLinksCard";
import { ClientMasterSuggestionsCard } from "./ClientMasterSuggestionsCard";
import { isGstReturnServiceEnabled } from "./utils";
import { AddContactModal } from "../modals/AddContactModal";
import { getAvatarBadge } from "./utils";
import { getPortalDefaultUrl } from "./ClientPasswordsTab";
import { driveApi, DocumentCategory } from "@/services/driveApi";
import { clientApi } from "@/services/clientApi";

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

  // Contacts state
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [showAllContacts, setShowAllContacts] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Licenses state
  const [showAllLicenses, setShowAllLicenses] = useState(false);
  const [uploadingLicId, setUploadingLicId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetLicForUpload, setTargetLicForUpload] = useState<ClientLicense | null>(null);

  // Passwords internal revealed state fallback
  const [localRevealedPasswords, setLocalRevealedPasswords] = useState<Record<string, boolean>>({});
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

  // Contacts dataset
  const contactsList = useMemo(() => client.contacts || [], [client.contacts]);
  const primaryContact = useMemo(() => {
    if (selectedContactId) {
      const found = contactsList.find((c) => c.id === selectedContactId);
      if (found) return found;
    }
    return contactsList.find((c) => c.isPrimary) || contactsList[0];
  }, [contactsList, selectedContactId]);

  const otherContacts = useMemo(() => {
    if (!primaryContact) return [];
    return contactsList.filter((c) => c.id !== primaryContact.id);
  }, [contactsList, primaryContact]);

  // Passwords dataset (max 5 visible initially, scrollable)
  const passwordsList = useMemo(() => client.passwords || [], [client.passwords]);

  // Licenses dataset (2 visible initially, show more on click)
  const licensesList = useMemo(() => client.licenses || [], [client.licenses]);
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
        {/* LEFT COLUMN: Entity Details, Contacts, Passwords, Licenses */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. ENTITY MASTER DETAILS CARD */}
          <div className=" bg-[var(--premium-blue-dark)]/2 dark:bg-[#1e293b]  border border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8  flex items-center justify-center text-white"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                >
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    Entity Master Details
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Primary registration profile and corporate identity
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
                  {client.address || "-"}
                </span>
              </div>

              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-medium">
                  City, State & Pincode
                </span>
                <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {[client.city, client.state, client.pincode].filter(Boolean).join(", ") || "-"}
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
                    className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2. CONTACTS (DIRECTORS & KEY EXECUTIVES) */}
          <div className="bg-[var(--premium-blue-dark)]/2 dark:bg-[#1e293b] border  border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8  bg-blue-50 dark:bg-blue-950/40 text-[#31719B] dark:text-[#60a5fa] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Contacts & Directors</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-[#31719B] dark:text-[#60a5fa]">
                      {contactsList.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Top director shown below • Expand to view all directors
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingContact(null);
                    setIsAddContactModalOpen(true);
                  }}
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Contact</span>
                </button>
              </div>
            </div>

            {contactsList.length === 0 ? (
              <div className="py-8 text-center bg-gray-50/50 dark:bg-gray-800/30  border border-dashed border-gray-200 dark:border-gray-700">
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
                  + Add First Director
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Top 1 Selected / Primary Contact Card */}
                {primaryContact && (
                  <div className=" border border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20 p-4 shadow-2xs">
                    <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9  bg-blue-100 dark:bg-blue-900/50 text-[#31719B] dark:text-[#60a5fa] flex items-center justify-center shrink-0 font-bold text-xs">
                          {primaryContact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                              {primaryContact.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-[#31719B] dark:text-[#60a5fa]">
                              {primaryContact.isPrimary ? "Primary Director" : "Selected Director"}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {primaryContact.designation || "Director"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingContact(primaryContact);
                            setIsAddContactModalOpen(true);
                          }}
                          className="h-7 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:text-[#31719B] text-gray-600 dark:text-gray-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-[#31719B]" />
                          <span>Edit</span>
                        </button>
                        {handleDeleteContact && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Remove director ${primaryContact.name}?`)) {
                                await handleDeleteContact(primaryContact.id || "", primaryContact.name || "");
                              }
                            }}
                            className="h-7 w-7 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:text-rose-600 text-gray-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-3 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">DIN</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                          {primaryContact.din || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">DIN Status</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {primaryContact.dinStatus || "Active"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Appointment Date</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {primaryContact.appointmentDate || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Mobile</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {primaryContact.mobile || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Email</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
                          {primaryContact.email || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show More Directors Toggle Button */}
                {otherContacts.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAllContacts(!showAllContacts)}
                      className="w-full py-2 px-3  border border-dashed border-[#dde2e8] dark:border-[#334155] bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100/80 text-xs font-semibold text-[#31719B] dark:text-[#60a5fa] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {showAllContacts ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Show Less Directors</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>
                            Show More Directors ({otherContacts.length} additional{" "}
                            {otherContacts.length === 1 ? "director" : "directors"})
                          </span>
                        </>
                      )}
                    </button>

                    {/* Expandable list of remaining directors */}
                    {showAllContacts && (
                      <div className="mt-3 space-y-2.5 animate-in fade-in duration-150">
                        {otherContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className=" border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] p-3.5 hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8  bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {contact.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 dark:text-white capitalize">
                                    {contact.name}
                                  </span>
                                  <span className="text-[11px] text-gray-400">
                                    ({contact.designation || "Director"})
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                                  <span>DIN: {contact.din || "-"}</span>
                                  <span>•</span>
                                  <span>Mob: {contact.mobile || "-"}</span>
                                  <span>•</span>
                                  <span>{contact.email || "-"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedContactId(contact.id || null)}
                                className="text-[11px] text-[#31719B] font-semibold hover:underline cursor-pointer"
                              >
                                Set as Top
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingContact(contact);
                                  setIsAddContactModalOpen(true);
                                }}
                                className="h-7 px-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-[#31719B] flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3 h-3 text-[#31719B]" />
                                <span>Edit</span>
                              </button>
                              {handleDeleteContact && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Remove director ${contact.name}?`)) {
                                      await handleDeleteContact(contact.id || "", contact.name || "");
                                    }
                                  }}
                                  className="h-7 w-7 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. PASSWORDS (SHOW 5 PASSWORDS & VERTICALLY SCROLLABLE) */}
          <div className="bg-[var(--premium-blue-dark)]/2 dark:bg-[#1e293b]  border border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8  bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Portal Credentials & Passwords</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                      {passwordsList.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Showing top 5 credentials • Vertically scrollable container
                  </p>
                </div>
              </div>

              {setIsAddPasswordOpen && (
                <button
                  type="button"
                  onClick={() => setIsAddPasswordOpen(true)}
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Password</span>
                </button>
              )}
            </div>

            {passwordsList.length === 0 ? (
              <div className="py-8 text-center bg-gray-50/50 dark:bg-gray-800/30  border border-dashed border-gray-200 dark:border-gray-700">
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
              /* Vertically scrollable table displaying up to 5 items comfortably */
              <div className="max-h-64 overflow-y-auto scrollbar-slim border border-[#dde2e8] dark:border-[#334155] ">
                <table className="min-w-full text-left text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-[#dde2e8] dark:border-[#334155]">
                    <tr>
                      <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">Portal</th>
                      <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">Username</th>
                      <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">Password</th>
                      <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155] text-right">Actions</th>
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
                                <span className="font-bold text-gray-900 dark:text-white block">
                                  {pwd.portal}
                                </span>
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
                              <button
                                type="button"
                                onClick={() => {
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

          {/* 4. LICENSES & REGISTRATIONS (SHOW 2 INITIALLY, EXPANDABLE) */}
          <div className="bg-[var(--premium-blue-dark)]/2 dark:bg-[#1e293b]  border border-[#dde2e8] dark:border-[#334155] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8  bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
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
              <div className="py-8 text-center bg-gray-50/50 dark:bg-gray-800/30  border border-dashed border-gray-200 dark:border-gray-700">
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
                    className=" border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] p-4 hover:border-gray-300 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9  bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
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
                    className="w-full py-2 px-3  border border-dashed border-[#dde2e8] dark:border-[#334155] bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100/80 text-xs font-semibold text-[#31719B] dark:text-[#60a5fa] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
        {/* RIGHT COLUMN: Notes (Vertically Scrollable Panel)        */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 sticky top-4">
          <div className="bg-[var(--premium-blue-dark)]/5 dark:bg-[#1e293b]    overflow-hidden flex flex-col max-h-[820px]">
            {/* Notes Header */}
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7  bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
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
                    className="p-3.5  border border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600 transition-colors space-y-2 text-xs"
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
        </div>
      </div>

      {/* Add / Edit Contact Modal */}
      <AddContactModal
        isOpen={isAddContactModalOpen}
        client={client}
        editingContact={editingContact}
        onClose={() => {
          setIsAddContactModalOpen(false);
          setEditingContact(null);
        }}
        onSuccess={(updated) => {
          if (onClientUpdated) {
            onClientUpdated(updated);
          }
          setIsAddContactModalOpen(false);
          setEditingContact(null);
          showToast(editingContact ? "Director updated successfully." : "Director added successfully.");
        }}
      />

      {/* GSTR-1 & GSTR-3B Dynamic Client Data Collection Link Card & Captured Suggestions */}
      {/* Erased when GSTR-1 & GSTR-3B GST service is turned off in Service Settings; visible when turned on */}
      {isGstEnabled && (
        <>
          <ClientGstLinksCard client={client} allServices={allServices} />
          <ClientMasterSuggestionsCard clientId={client.id || (client as any)._id} />
        </>
      )}
    </div>
  );
};

