"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, UserCheck, User } from "lucide-react";
import { clientApi } from "@/services/clientApi";
import { Client, ClientContact } from "@/data/crmData";

interface AddContactModalProps {
  isOpen: boolean;
  client: Client;
  editingContact?: ClientContact | null;
  onClose: () => void;
  onSuccess: (updatedClient: Client) => void;
}

function toDateInputValue(str?: string): string {
  if (!str || str === '-' || str === 'None') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  client,
  editingContact,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [designation, setDesignation] = useState("Director");
  const [din, setDin] = useState("");
  const [dinStatus, setDinStatus] = useState("Active");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [pan, setPan] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [passport, setPassport] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [address, setAddress] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (editingContact) {
      setName(editingContact.name || "");
      setIsPrimary(Boolean(editingContact.isPrimary));
      setDesignation(editingContact.designation || "Director");
      setDin(editingContact.din === "-" ? "" : editingContact.din || "");
      setDinStatus(editingContact.dinStatus || "Active");
      setAppointmentDate(toDateInputValue(editingContact.appointmentDate));
      setDob(toDateInputValue(editingContact.dob));
      setEmail(editingContact.email === "-" ? "" : editingContact.email || "");
      setMobile(editingContact.mobile === "-" ? "" : editingContact.mobile || "");
      setPan(editingContact.pan === "-" ? "" : editingContact.pan || "");
      setAadhar(editingContact.aadhar === "-" ? "" : editingContact.aadhar || "");
      setPassport(editingContact.passport === "-" ? "" : editingContact.passport || "");
      setFatherName(editingContact.fatherName === "-" ? "" : editingContact.fatherName || "");
      setAddress(editingContact.address === "-" ? "" : editingContact.address || "");
    } else {
      setName("");
      setIsPrimary(false);
      setDesignation("Director");
      setDin("");
      setDinStatus("Active");
      setAppointmentDate("");
      setDob("");
      setEmail("");
      setMobile("");
      setPan("");
      setAadhar("");
      setPassport("");
      setFatherName("");
      setAddress("");
    }
    setErrorMessage("");
  }, [editingContact, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Contact Name is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload: Partial<ClientContact> = {
        name: name.trim(),
        isPrimary,
        designation: designation.trim() || "Director",
        din: din.trim() || "-",
        dinStatus: dinStatus.trim() || "-",
        appointmentDate: appointmentDate || "-",
        dob: dob || "-",
        email: email.trim() || "-",
        mobile: mobile.trim() || "-",
        pan: pan.trim().toUpperCase() || "-",
        aadhar: aadhar.trim() || "-",
        passport: passport.trim() || "-",
        fatherName: fatherName.trim() || "-",
        address: address.trim() || "-",
      };

      const contactId = editingContact?.id || (editingContact as any)?._id;
      const res = contactId
        ? await clientApi.updateContact(client.id, contactId, payload)
        : await clientApi.addContact(client.id, payload);

      if (res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        throw new Error((res as any).error || res.message || "Failed to save contact");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save contact. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between"
          style={{ backgroundColor: "var(--orange-havy-light)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {editingContact ? "Edit Contact" : "Add Key Contact"}
              </h2>
              <p className="text-[11px] text-gray-500">
                {editingContact
                  ? `Update details for ${editingContact.name}`
                  : `Add promoter, director, or partner for ${client.name}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Row 1: Name & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kishore Kumar"
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Director, Managing Director, Partner"
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Primary Contact Checkbox */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="checkbox"
              id="isPrimaryCheckbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 text-[#31719B] accent-[#31719B] rounded border-gray-300 focus:ring-[#31719B] cursor-pointer"
            />
            <label
              htmlFor="isPrimaryCheckbox"
              className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
            >
              Primary Contact (Show as main signatory on cards and letters)
            </label>
          </div>

          {/* Row 2: DIN & DIN Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                DIN (Director Identification Number)
              </label>
              <input
                type="text"
                value={din}
                onChange={(e) => setDin(e.target.value)}
                placeholder="e.g. 08123456"
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                DIN Status
              </label>
              <select
                value={dinStatus}
                onChange={(e) => setDinStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B] cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Approved">Approved</option>
                <option value="Disqualified">Disqualified</option>
                <option value="Deactivated">Deactivated</option>
                <option value="-">-</option>
              </select>
            </div>
          </div>

          {/* Row 3: Appointment Date & Date of Birth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Date of Appointment
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Row 4: Email & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email ID
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kishore@turia.com"
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9876543210"
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Row 5: PAN & Aadhar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white uppercase font-mono outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Aadhar Number
              </label>
              <input
                type="text"
                value={aadhar}
                onChange={(e) => setAadhar(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Row 6: Passport & Father's Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Passport Number
              </label>
              <input
                type="text"
                value={passport}
                onChange={(e) => setPassport(e.target.value.toUpperCase())}
                placeholder="A1234567"
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Father&apos;s Name
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Row 7: Address */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Residential / Office Address Line
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Flat 402, Sunshine Heights, MG Road, Bangalore - 560001"
              className="w-full p-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-[#31719B] resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
              className="h-9 px-5 rounded-md text-xs font-semibold text-white shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingContact ? "Update Contact" : "Save Contact"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
