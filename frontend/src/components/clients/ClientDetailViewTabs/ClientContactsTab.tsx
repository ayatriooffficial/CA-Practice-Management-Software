"use client";

import React, { useState, useMemo } from "react";
import {
  User,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Mail,
  Phone,
} from "lucide-react";
import { Client, ClientContact } from "@/data/crmData";
import { AddContactModal } from "../modals/AddContactModal";

import { TableActionDropdown, DropdownActionItem } from "@/components/ui/TableActionDropdown";

interface ClientContactsTabProps {
  client: Client;
  onClientUpdated?: (updated: Client) => void;
  showToast: (msg: string) => void;
  handleDeleteContact?: (contactId: string, name: string) => Promise<void>;
}

export const ClientContactsTab: React.FC<ClientContactsTabProps> = ({
  client,
  onClientUpdated,
  showToast,
  handleDeleteContact,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);

  // Contacts list directly from client.contacts (no default or demo contacts)
  const contactsList: ClientContact[] = useMemo(() => {
    return client.contacts || [];
  }, [client.contacts]);

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

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
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
              className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
            />
          </div>

          {/* + Add Contact Button */}
          <button
            type="button"
            onClick={() => {
              setEditingContact(null);
              setIsAddModalOpen(true);
            }}
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            className="h-8 px-4 rounded-md text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Contacts Cards List */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            No contacts found.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingContact(null);
              setIsAddModalOpen(true);
            }}
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            className="mt-3 px-4 py-1.5 rounded-md text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            + Add First Contact
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContacts.map((contact, index) => {
            const actions: DropdownActionItem[] = [
              {
                label: "Edit Contact",
                icon: Pencil,
                onClick: () => {
                  setEditingContact(contact);
                  setIsAddModalOpen(true);
                },
              },
              {
                label: "Delete Contact",
                icon: Trash2,
                variant: "danger",
                onClick: async () => {
                  if (handleDeleteContact && contact.id) {
                    await handleDeleteContact(contact.id, contact.name);
                  } else {
                    showToast("Contact ID is missing");
                  }
                },
              },
            ];

            return (
              <div
                key={contact.id || index}
                className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    {/* User Icon inside squircle */}
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#31719B] dark:text-[#60a5fa] flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                          {contact.name}
                        </span>
                        {contact.isPrimary && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#31719B] dark:text-[#60a5fa] border border-blue-200 dark:border-blue-800">
                            Primary Contact
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
                        setEditingContact(contact);
                        setIsAddModalOpen(true);
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

                {/* 5-Column Grid Fields matching Screenshot 1 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-4 gap-x-6 pt-4 text-xs">
                  {/* Row 1 */}
                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      DIN
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.din || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      DIN Status
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {contact.dinStatus || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      Date of Appointment
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {contact.appointmentDate || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      Date of Birth
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {contact.dob || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      Email ID
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block truncate">
                      {contact.email || "-"}
                    </span>
                  </div>

                  {/* Row 2 */}
                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      Mobile Number
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.mobile || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      PAN
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.pan || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      Aadhar Number
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.aadhar || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      Passport Number
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block font-mono">
                      {contact.passport || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      Father&apos;s Name
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {contact.fatherName || "-"}
                    </span>
                  </div>

                  {/* Row 3: Address Line spanning full width */}
                  <div className="col-span-full pt-2 border-t border-gray-100 dark:border-gray-800/60">
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      Address Line
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                      {contact.address || "-"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {isAddModalOpen && (
        <AddContactModal
          isOpen={isAddModalOpen}
          client={client}
          editingContact={editingContact}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingContact(null);
          }}
          onSuccess={(updated) => {
            onClientUpdated?.(updated);
            showToast(
              editingContact
                ? `Contact "${editingContact.name}" updated successfully.`
                : "New contact added successfully."
            );
          }}
        />
      )}
    </div>
  );
};
