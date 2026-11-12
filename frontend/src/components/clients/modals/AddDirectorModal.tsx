"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  UserCheck,
  User,
  Users,
  Building2,
  Check,
  ExternalLink,
  Plus,
  Loader2,
  ShieldCheck,
  Phone,
  Mail,
  CreditCard,
  Hash,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/services/clientApi";
import { leadApi } from "@/services/leadApi";
import { Client, ClientContact, Lead } from "@/data/crmData";

interface AddDirectorModalProps {
  isOpen: boolean;
  client: Client;
  editingContact?: ClientContact | null;
  onClose: () => void;
  onSuccess: (updatedClient: Client) => void;
}

const COMMON_DESIGNATIONS = [
  "Director",
  "Managing Director",
  "Whole-time Director",
  "Additional Director",
  "Independent Director",
  "Partner",
  "Designated Partner",
  "Proprietor",
  "Authorized Signatory",
];

export const AddDirectorModal: React.FC<AddDirectorModalProps> = ({
  isOpen,
  client,
  editingContact,
  onClose,
  onSuccess,
}) => {
  const router = useRouter();

  // Mode: "select-lead" | "manual"
  const [mode, setMode] = useState<"select-lead" | "manual">("select-lead");

  // Leads list & search state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form fields for chosen director
  const [designation, setDesignation] = useState("Director");
  const [isPrimary, setIsPrimary] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");

  // Manual fallback fields (if promoter not yet in leads)
  const [manualName, setManualName] = useState("");
  const [manualPan, setManualPan] = useState("");
  const [manualMobile, setManualMobile] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualDin, setManualDin] = useState("");
  const [manualMcaId, setManualMcaId] = useState("");
  const [manualMcaPassword, setManualMcaPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Existing director identifiers to detect duplicates
  const existingDirectorIds = useMemo(() => {
    const list = client.contacts || [];
    const leadIds = new Set<string>();
    const pans = new Set<string>();
    const names = new Set<string>();

    list.forEach((c) => {
      if (c.leadId) leadIds.add(String(c.leadId));
      if (c.pan && c.pan !== "-") pans.add(c.pan.trim().toUpperCase());
      if (c.name) names.add(c.name.trim().toLowerCase());
    });

    return { leadIds, pans, names };
  }, [client.contacts]);

  // Fetch leads when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage("");
    setSelectedLead(null);

    if (editingContact) {
      setMode("manual");
      setManualName(editingContact.name || "");
      setDesignation(editingContact.designation || "Director");
      setIsPrimary(Boolean(editingContact.isPrimary));
      setManualPan(editingContact.pan === "-" ? "" : editingContact.pan || "");
      setManualMobile(editingContact.mobile === "-" ? "" : editingContact.mobile || "");
      setManualEmail(editingContact.email === "-" ? "" : editingContact.email || "");
      setManualDin(editingContact.din === "-" ? "" : editingContact.din || "");
      setManualMcaId(editingContact.mcaId === "-" ? "" : editingContact.mcaId || "");
      setManualMcaPassword(editingContact.mcaPassword === "-" ? "" : editingContact.mcaPassword || "");
      setAppointmentDate(editingContact.appointmentDate || "");
    } else {
      setMode("select-lead");
      setDesignation("Director");
      setIsPrimary(false);
      setAppointmentDate(new Date().toISOString().split("T")[0]);

      setIsLoadingLeads(true);
      leadApi
        .getLeads({ limit: 100 })
        .then((res) => {
          if (res.data) {
            setLeads(res.data);
          }
        })
        .catch(() => {
          // non-blocking
        })
        .finally(() => {
          setIsLoadingLeads(false);
        });
    }
  }, [isOpen, editingContact]);

  if (!isOpen) return null;

  // Filter leads based on search query
  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const fullName = (lead.fullName || `${lead.firstName || ""} ${lead.lastName || ""}`).toLowerCase();
    const pan = (lead.pan || "").toLowerCase();
    const din = (lead.din || lead.mcaId || "").toLowerCase();
    const mobile = (lead.mobile || "").toLowerCase();
    const email = (lead.email || "").toLowerCase();
    return (
      fullName.includes(q) ||
      pan.includes(q) ||
      din.includes(q) ||
      mobile.includes(q) ||
      email.includes(q)
    );
  });

  const isLeadAlreadyDirector = (lead: Lead) => {
    const leadId = String(lead.id || (lead as any)._id);
    if (leadId && existingDirectorIds.leadIds.has(leadId)) return true;
    if (lead.pan && existingDirectorIds.pans.has(lead.pan.trim().toUpperCase())) return true;
    const name = (lead.fullName || `${lead.firstName || ""} ${lead.lastName || ""}`).trim().toLowerCase();
    if (name && existingDirectorIds.names.has(name)) return true;
    return false;
  };

  const handleOpenInLeads = (targetLeadId?: string, name?: string) => {
    onClose();
    const params = new URLSearchParams();
    if (targetLeadId) params.set("leadId", targetLeadId);
    if (name) params.set("search", name);
    router.push(`/leads?${params.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      let payload: Partial<ClientContact>;

      if (editingContact) {
        // Update existing director
        payload = {
          name: manualName.trim(),
          isPrimary,
          designation: designation.trim() || "Director",
          din: manualDin.trim() || "-",
          dinStatus: "Active",
          mcaId: manualMcaId.trim() || undefined,
          mcaPassword: manualMcaPassword.trim() || undefined,
          appointmentDate: appointmentDate || "-",
          email: manualEmail.trim() || "-",
          mobile: manualMobile.trim() || "-",
          pan: manualPan.trim().toUpperCase() || "-",
          leadId: editingContact.leadId,
        };

        const contactId = editingContact.id || (editingContact as any)._id;
        const res = await clientApi.updateContact(client.id, contactId, payload);
        let updatedClient = res.data;
        if (!updatedClient?.contacts || updatedClient.contacts.length === 0) {
          try {
            const fresh = await clientApi.getClientById(client.id);
            if (fresh?.data) updatedClient = fresh.data;
          } catch {}
        }
        if (updatedClient) {
          onSuccess(updatedClient);
          onClose();
        } else {
          throw new Error((res as any).error || res.message || "Failed to update director");
        }
      } else if (mode === "select-lead" && selectedLead) {
        // Add chosen Lead as Director
        const leadFullName = (
          selectedLead.fullName || `${selectedLead.firstName || ""} ${selectedLead.lastName || ""}`
        ).trim();

        payload = {
          name: leadFullName,
          isPrimary,
          designation: designation.trim() || "Director",
          din: selectedLead.din || selectedLead.mcaId || "-",
          dinStatus: "Active",
          mcaId: selectedLead.mcaId || selectedLead.din || undefined,
          mcaPassword: selectedLead.mcaPassword || undefined,
          appointmentDate: appointmentDate || new Date().toISOString().split("T")[0],
          dob: selectedLead.dob || "-",
          email: selectedLead.email || "-",
          mobile: selectedLead.mobile || "-",
          pan: (selectedLead.pan || "-").toUpperCase(),
          aadhar: selectedLead.aadhaar || "-",
          address: selectedLead.address || "-",
          leadId: String(selectedLead.id || (selectedLead as any)._id),
        };

        const res = await clientApi.addContact(client.id, payload);
        let updatedClient = res.data;
        if (!updatedClient?.contacts || updatedClient.contacts.length === 0) {
          try {
            const fresh = await clientApi.getClientById(client.id);
            if (fresh?.data) updatedClient = fresh.data;
          } catch {}
        }
        if (updatedClient) {
          onSuccess(updatedClient);
          onClose();
        } else {
          throw new Error((res as any).error || res.message || "Failed to add director");
        }
      } else {
        // Manual entry fallback
        if (!manualName.trim()) {
          setErrorMessage("Director Name is required.");
          setIsSubmitting(false);
          return;
        }

        payload = {
          name: manualName.trim(),
          isPrimary,
          designation: designation.trim() || "Director",
          din: manualDin.trim() || "-",
          dinStatus: "Active",
          mcaId: manualMcaId.trim() || undefined,
          mcaPassword: manualMcaPassword.trim() || undefined,
          appointmentDate: appointmentDate || "-",
          email: manualEmail.trim() || "-",
          mobile: manualMobile.trim() || "-",
          pan: manualPan.trim().toUpperCase() || "-",
        };

        const res = await clientApi.addContact(client.id, payload);
        let updatedClient = res.data;
        if (!updatedClient?.contacts || updatedClient.contacts.length === 0) {
          try {
            const fresh = await clientApi.getClientById(client.id);
            if (fresh?.data) updatedClient = fresh.data;
          } catch {}
        }
        if (updatedClient) {
          onSuccess(updatedClient);
          onClose();
        } else {
          throw new Error((res as any).error || res.message || "Failed to add director");
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save director. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e293b] w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between"
          style={{ backgroundColor: "var(--orange-havy-light)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{editingContact ? "Edit Director" : "Add Director / Promoter"}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-[#31719B] dark:bg-blue-900/60 dark:text-blue-300 font-semibold">
                  {client.name}
                </span>
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {editingContact
                  ? `Update company-specific designation or view full KYC profile in Leads`
                  : `Choose an authorized promoter/director from the Leads directory`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editing mode banner: redirect to Leads for changing KYC details */}
        {editingContact && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Directors are registered as Promoters in <strong>Leads</strong>. To edit KYC, PAN, MCA documents, or phone, open the Leads section.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenInLeads(editingContact.leadId, editingContact.name)}
              className="px-3 py-1.5 rounded-md bg-[#31719B] hover:bg-[#26597b] text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Leads</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {!editingContact && (
            <>
              {/* Mode Switcher */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("select-lead");
                      setSelectedLead(null);
                    }}
                    className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                      mode === "select-lead"
                        ? "bg-[#31719B] text-white shadow-xs"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Choose from Leads Directory</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("manual");
                      setSelectedLead(null);
                    }}
                    className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                      mode === "manual"
                        ? "bg-[#31719B] text-white shadow-xs"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Manual Entry</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenInLeads()}
                  className="text-xs font-semibold text-[#31719B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>+ Create New Promoter in Leads</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* SECTION: Choose from Leads */}
              {mode === "select-lead" && (
                <div className="space-y-4">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search promoters by name, PAN, DIN, or mobile..."
                      className="w-full h-9 pl-9 pr-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B] text-xs"
                    />
                  </div>

                  {/* Leads List */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-800/60 px-3.5 py-2 text-[11px] font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800 flex justify-between">
                      <span>Available Promoters ({filteredLeads.length})</span>
                      <span>Click to select promoter</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {isLoadingLeads ? (
                        <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-[#31719B]" />
                          <span>Loading promoters from Leads directory...</span>
                        </div>
                      ) : filteredLeads.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 space-y-2">
                          <User className="w-7 h-7 mx-auto text-gray-300 dark:text-gray-600" />
                          <p className="text-xs font-semibold">No promoters found matching search.</p>
                          <button
                            type="button"
                            onClick={() => handleOpenInLeads()}
                            className="text-xs text-[#31719B] font-semibold hover:underline"
                          >
                            + Add this person to Leads first
                          </button>
                        </div>
                      ) : (
                        filteredLeads.map((lead) => {
                          const leadFullName = (
                            lead.fullName || `${lead.firstName || ""} ${lead.lastName || ""}`
                          ).trim();
                          const isAlready = isLeadAlreadyDirector(lead);
                          const isSelected =
                            selectedLead &&
                            (selectedLead.id === lead.id || (selectedLead as any)._id === (lead as any)._id);

                          return (
                            <div
                              key={lead.id || (lead as any)._id}
                              onClick={() => {
                                if (!isAlready) setSelectedLead(lead);
                              }}
                              className={`p-3 transition-colors flex items-center justify-between gap-3 ${
                                isAlready
                                  ? "opacity-60 bg-gray-50/60 dark:bg-gray-900/40 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-blue-50/90 dark:bg-blue-950/40 border-l-4 border-l-[#31719B] cursor-pointer"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isSelected
                                      ? "bg-[#31719B] text-white"
                                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                                  }`}
                                >
                                  {(leadFullName || "P").slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white capitalize truncate">
                                      {leadFullName}
                                    </span>
                                    {lead.status && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                        {lead.status}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                                    {lead.pan && (
                                      <span className="flex items-center gap-1 font-mono">
                                        <CreditCard className="w-3 h-3 text-gray-400" />
                                        {lead.pan}
                                      </span>
                                    )}
                                    {(lead.din || lead.mcaId) && (
                                      <span className="flex items-center gap-1 font-mono">
                                        <Hash className="w-3 h-3 text-gray-400" />
                                        DIN: {lead.din || lead.mcaId}
                                      </span>
                                    )}
                                    {lead.mobile && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-gray-400" />
                                        {lead.mobile}
                                      </span>
                                    )}
                                    {lead.email && (
                                      <span className="flex items-center gap-1 truncate max-w-[180px]">
                                        <Mail className="w-3 h-3 text-gray-400" />
                                        {lead.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isAlready ? (
                                  <span className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Already Assigned
                                  </span>
                                ) : isSelected ? (
                                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#31719B] text-white flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" />
                                    Selected
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLead(lead);
                                    }}
                                    className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-700 hover:border-[#31719B] text-gray-700 dark:text-gray-300 hover:text-[#31719B]"
                                  >
                                    Select
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Selected Lead Preview & Company Configuration */}
                  {selectedLead && (
                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#31719B]" />
                          Selected Promoter Details
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedLead(null)}
                          className="text-[11px] text-gray-500 hover:text-gray-700 underline"
                        >
                          Change
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white dark:bg-gray-900 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">Promoter Name</span>
                          <span className="font-bold text-gray-900 dark:text-white capitalize">
                            {selectedLead.fullName || `${selectedLead.firstName || ""} ${selectedLead.lastName || ""}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">PAN</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                            {selectedLead.pan || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">DIN / MCA ID</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                            {selectedLead.din || selectedLead.mcaId || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">Mobile</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {selectedLead.mobile || "-"}
                          </span>
                        </div>
                      </div>

                      {/* Designation and Primary Config for this company */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Designation in {client.name} <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            className="w-full h-9 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B] text-xs font-medium"
                          >
                            {COMMON_DESIGNATIONS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Appointment Date
                          </label>
                          <input
                            type="date"
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                            className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B] text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="isPrimarySelected"
                          checked={isPrimary}
                          onChange={(e) => setIsPrimary(e.target.checked)}
                          className="w-4 h-4 text-[#31719B] accent-[#31719B] rounded border-gray-300 cursor-pointer"
                        />
                        <label
                          htmlFor="isPrimarySelected"
                          className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                        >
                          Primary Director / Main Statutory Signatory
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* SECTION: Manual Entry / Editing Details */}
          {(mode === "manual" || editingContact) && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Director Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Kishore Kumar"
                    className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Designation
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
                  >
                    {COMMON_DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={manualPan}
                    onChange={(e) => setManualPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B] font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    DIN (Director ID)
                  </label>
                  <input
                    type="text"
                    value={manualDin}
                    onChange={(e) => setManualDin(e.target.value)}
                    placeholder="e.g. 08123456"
                    className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={manualMobile}
                    onChange={(e) => setManualMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="director@example.com"
                    className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
                  />
                </div>
              </div>

              {/* MCA Credentials for auto-fill */}
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 block">
                  MCA V3 Portal Credentials (Optional for Auto-Fill)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">MCA User ID / Login ID</label>
                    <input
                      type="text"
                      value={manualMcaId}
                      onChange={(e) => setManualMcaId(e.target.value)}
                      placeholder="e.g. DIN or User ID"
                      className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">MCA Password</label>
                    <input
                      type="password"
                      value={manualMcaPassword}
                      onChange={(e) => setManualMcaPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimaryManual"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-[#31719B] accent-[#31719B] rounded border-gray-300 cursor-pointer"
                />
                <label
                  htmlFor="isPrimaryManual"
                  className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                >
                  Primary Director / Authorised Signatory
                </label>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t border-[#dde2e8] dark:border-[#334155] pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting || (mode === "select-lead" && !selectedLead && !editingContact)}
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
                className="px-5 py-2 rounded-lg text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : editingContact ? (
                  <span>Update Director</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Add as Director</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

