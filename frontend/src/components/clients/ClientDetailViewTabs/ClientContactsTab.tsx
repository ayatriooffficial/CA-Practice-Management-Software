"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, MoreVertical, Pencil, Trash2, ShieldCheck, Mail, Phone, Calendar, MapPin, User } from "lucide-react";
import { Client, ClientContact } from "@/data/crmData";
import { clientApi } from "@/services/clientApi";
import { AddEditContactModal, ContactFormData } from "../modals/AddEditContactModal";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { TableActionDropdown, DropdownActionItem } from "@/components/ui/TableActionDropdown";

interface ClientContactsTabProps {
  client: Client;
  onClientUpdated?: (updated: Client) => void;
  showToast?: (msg: string) => void;
  handleDeleteContact?: (contactId: string, name: string) => Promise<void>;
}

const getInitials = (name?: string) => {
  if (!name) return "CO";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const ClientContactsTab: React.FC<ClientContactsTabProps> = ({
  client,
  onClientUpdated,
  showToast,
  handleDeleteContact,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactFormData | null>(null);
  const [contactToDelete, setContactToDelete] = useState<any | null>(null);
  const [localToast, setLocalToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Contacts list strictly deduplicated from client.contacts
  const contactsList: ClientContact[] = useMemo(() => {
    const existing = client.contacts || [];

    // Strictly deduplicate existing by lowercased trimmed name and DIN/PAN
    const seenNames = new Set<string>();
    const seenIds = new Set<string>();
    const dedupedExisting: ClientContact[] = [];

    existing.forEach((c) => {
      const nameKey = (c.name || "").trim().toLowerCase();
      const dinKey = (c.din || c.mcaId || "").trim().toUpperCase();
      const panKey = (c.pan || "").trim().toUpperCase();

      if (nameKey && seenNames.has(nameKey)) return;
      if (dinKey && seenIds.has(dinKey)) return;
      if (panKey && seenIds.has(panKey)) return;

      if (nameKey) seenNames.add(nameKey);
      if (dinKey) seenIds.add(dinKey);
      if (panKey) seenIds.add(panKey);
      dedupedExisting.push(c);
    });

    if (dedupedExisting.length > 0) return dedupedExisting;

    // Fallback only if no contacts registered yet: seed from customerFiles.promoter
    const promoters = (client.customerFiles?.promoter || []).map((p, i) => ({
      id: `promoter-${p.key || i + 1}`,
      name: p.name,
      isPrimary: i === 0,
      designation: p.designation || "Director",
      pan: p.pan,
      din: p.mcaId,
      dinStatus: "Active",
    }));

    return promoters;
  }, [client.contacts, client.customerFiles?.promoter]);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contactsList;
    const q = searchQuery.toLowerCase();
    return contactsList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.designation && c.designation.toLowerCase().includes(q)) ||
        (c.din && c.din.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.pan && c.pan.toLowerCase().includes(q))
    );
  }, [contactsList, searchQuery]);

  // Handle Save (Add or Edit)
  const handleSaveContact = async (data: ContactFormData) => {
    try {
      let res;
      if (selectedContact?.id && !selectedContact.id.startsWith("promoter-")) {
        res = await clientApi.updateContact(client.id, selectedContact.id, data);
        if (showToast) showToast("Contact updated successfully");
        else setLocalToast({ message: "Contact updated successfully", type: "success" });
      } else {
        res = await clientApi.addContact(client.id, data);
        if (showToast) showToast("Contact added successfully");
        else setLocalToast({ message: "Contact added successfully", type: "success" });
      }

      if (res && res.data && onClientUpdated) {
        onClientUpdated(res.data);
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || "Failed to save contact");
      else setLocalToast({ message: err.message || "Failed to save contact", type: "error" });
      throw err;
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;
    try {
      const contactId = contactToDelete.id || contactToDelete._id;
      if (handleDeleteContact && contactId) {
        await handleDeleteContact(contactId, contactToDelete.name);
      } else {
        const res = await clientApi.deleteContact(client.id, contactId);
        if (onClientUpdated && res.data) {
          onClientUpdated(res.data);
        }
        if (showToast) showToast("Contact removed successfully");
        else setLocalToast({ message: "Contact removed successfully", type: "info" });
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || "Failed to delete contact");
      else setLocalToast({ message: err.message || "Failed to delete contact", type: "error" });
    } finally {
      setContactToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {localToast && (
        <ToastNotification
          message={localToast.message}
          type={localToast.type}
          onClose={() => setLocalToast(null)}
        />
      )}

      {/* Top Header (Image 4): Contacts (n), Search box, + Add Contact Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
          Contacts ({contactsList.length})
        </h2>

        <div className="flex items-center gap-3">
          {/* Search Contacts Input */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Contacts..."
              className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-hidden focus:border-[#31719B] transition-colors"
            />
          </div>

          {/* + Add Contact Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedContact(null);
              setIsAddEditOpen(true);
            }}
            style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
            className="h-8 px-4 rounded-md text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Contacts Cards List (Image 4) */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            No contacts found.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedContact(null);
              setIsAddEditOpen(true);
            }}
            style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
            className="mt-3 px-4 py-1.5 rounded-md text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            + Add First Contact
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContacts.map((contact, index) => {
            const contactId = contact.id || index.toString();
            const actions: DropdownActionItem[] = [
              {
                label: "Edit Contact",
                icon: Pencil,
                onClick: () => {
                  setSelectedContact({
                    ...contact,
                    firstName: contact.name?.split(" ")[0] || "",
                    middleName: contact.name?.split(" ").length > 2 ? contact.name?.split(" ")[1] : "",
                    lastName: contact.name?.split(" ").slice(1).join(" ") || "",
                    isPrimary: Boolean(contact.isPrimary),
                  });
                  setIsAddEditOpen(true);
                },
              },
              {
                label: "Delete Contact",
                icon: Trash2,
                variant: "danger",
                onClick: () => {
                  setContactToDelete(contact);
                },
              },
            ];

            return (
              <div
                key={String(contactId) + "-" + String(index)}
                className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    {/* User Initials Circle */}
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {getInitials(contact.name)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                          {contact.name}
                        </span>
                        {contact.isPrimary && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#31719B] dark:text-[#60a5fa] border border-blue-200 dark:border-blue-800">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Primary Contact</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        {contact.designation || "Director"}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit Contact & Three Dots Menu */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContact({
                          ...contact,
                          firstName: contact.name?.split(" ")[0] || "",
                          middleName: contact.name?.split(" ").length > 2 ? contact.name?.split(" ")[1] : "",
                          lastName: contact.name?.split(" ").slice(1).join(" ") || "",
                          isPrimary: Boolean(contact.isPrimary),
                        });
                        setIsAddEditOpen(true);
                      }}
                      title="Edit Contact"
                      className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-200 text-gray-600 dark:text-gray-300 hover:text-[#31719B] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#31719B]" />
                      <span>Edit</span>
                    </button>

                    <TableActionDropdown
                      actions={actions}
                      buttonAriaLabel={`Actions for ${contact.name}`}
                    />
                  </div>
                </div>

                {/* 5-Column Grid Fields (Image 4) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-4 gap-x-6 pt-4 text-xs">
                  {/* Row 1 */}
                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">DIN</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.din || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">DIN Status</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {contact.dinStatus || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">Date of Appointment</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {contact.appointmentDate || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">Date of Birth</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {contact.dob || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">Email ID</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block truncate" title={contact.email}>
                      {contact.email || "-"}
                    </span>
                  </div>

                  {/* Row 2 */}
                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">Mobile Number</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.mobile || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">PAN</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.pan || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">Aadhar Number</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.aadhar || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">Passport Number</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.passport || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">Father's Name</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {contact.fatherName || "-"}
                    </span>
                  </div>

                  {/* Row 3: Address Line full span */}
                  <div className="col-span-2 sm:col-span-3 md:col-span-5 pt-1">
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">Address Line</span>
                    <span className="text-xs text-gray-700 dark:text-slate-300 mt-0.5 block">
                      {contact.address || "-"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Contact Modal (Image 5) */}
      {isAddEditOpen && (
        <AddEditContactModal
          isOpen={isAddEditOpen}
          onClose={() => {
            setIsAddEditOpen(false);
            setSelectedContact(null);
          }}
          onSave={handleSaveContact}
          initialData={selectedContact}
          totalExistingContactsCount={contactsList.length}
        />
      )}

      {/* Discard / Delete Confirmation Modal */}
      {contactToDelete && (
        <DiscardConfirmationModal
          isOpen={Boolean(contactToDelete)}
          onCancel={() => setContactToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Contact"
          message={`Are you sure you want to remove contact "${contactToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete"
        />
      )}
    </div>
  );
};
