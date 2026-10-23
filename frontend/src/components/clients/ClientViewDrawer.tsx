"use client";

import React from "react";
import {
  X,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Tag,
  Users,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { Client, CLIENT_TYPES, CLIENT_TAGS, RECURRING_SERVICES } from "@/data/crmData";
import { usePermission } from "@/components/team/usePermission";

interface ClientViewDrawerProps {
  client: Client;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string, name: string) => void;
  onToggleActive: (id: string) => void;
}

export const ClientViewDrawer: React.FC<ClientViewDrawerProps> = ({
  client,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const { canDelete, canAddEdit } = usePermission();
  const typeObj = CLIENT_TYPES.find((t) => t.value === client.type);
  const typeLabel = typeObj ? typeObj.label : client.type;

  const digits = client.mobile.replace(/\D/g, "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl h-full flex flex-col shadow-2xl border-l border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#111827] dark:text-[#f8fafc] animate-in slide-in-from-right duration-200 overflow-hidden"
        role="dialog"
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] shrink-0"
          style={{ backgroundColor: "var(--orange-havy-light)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold shadow-xs"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              {client.name[0] || "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#000000] dark:text-white truncate max-w-[280px]">
                  {client.name}
                </h3>
                {client.fileNo && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300">
                    #{client.fileNo}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {typeLabel} • {client.group}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {canAddEdit("clients") && (
              <button
                type="button"
                onClick={() => onEdit(client)}
                className="p-2 rounded-xl text-gray-500 hover:text-[#31719B] hover:bg-[#31719B]/10 transition-colors cursor-pointer"
                title="Edit Client"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDelete("clients") && (
              <button
                type="button"
                onClick={() => onDelete(client.id, client.name)}
                className="p-2 rounded-xl text-gray-500 hover:text-[#e8655a] hover:bg-[#e8655a]/10 transition-colors cursor-pointer"
                title="Delete Client"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-slim">
          {/* Quick Contact & Action Buttons */}
          <div className="grid grid-cols-3 gap-2.5">
            <a
              href={`tel:+91${digits}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-xs transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>

            <a
              href={`https://wa.me/91${digits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-xs transition-all hover:opacity-90 bg-[#25D366]"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>WhatsApp</span>
            </a>

            {client.email ? (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border border-[#dde2e8] dark:border-[#475569] text-gray-700 dark:text-gray-200 hover:border-[#31719B] transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onToggleActive(client.id)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border border-[#dde2e8] dark:border-[#475569] text-gray-700 dark:text-gray-200 hover:border-[#31719B]"
              >
                <span>{client.active ? "Set Inactive" : "Set Active"}</span>
              </button>
            )}
          </div>

          {/* Status & Overview Card */}
          <div
            className="p-4 rounded-2xl border border-[#dde2e8] dark:border-[#334155] space-y-3"
            style={{ backgroundColor: "var(--orange-havy-light)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Account Status
              </span>
              <button
                type="button"
                onClick={() => onToggleActive(client.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                  client.active
                    ? "bg-[#e6f6ec] text-[#1d8a4d]"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {client.active ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                <span>{client.active ? "Active Client" : "Inactive"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-gray-500 block">PAN Number</span>
                <span className="font-mono font-bold text-[#000000] dark:text-white">
                  {client.pan || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Client Group</span>
                <span className="font-semibold text-[#000000] dark:text-white">
                  {client.group || "General"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Registration Date</span>
                <span className="font-semibold text-[#000000] dark:text-white">
                  {client.dob || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Referred By</span>
                <span className="font-semibold text-[#000000] dark:text-white">
                  {client.referredBy || "Direct Walk-in"}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details Section */}
          <div className="space-y-3">
            <h4
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--premium-blue-dark)" }}
            >
              Contact Details
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155]">
                <Phone className="w-4 h-4 text-[#31719B] shrink-0" />
                <div>
                  <div className="font-semibold">{client.mobile}</div>
                  {client.secondaryMobile && (
                    <div className="text-gray-500 text-[11px]">
                      Alt: {client.secondaryMobile}
                    </div>
                  )}
                </div>
              </div>

              {client.email && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155]">
                  <Mail className="w-4 h-4 text-[#31719B] shrink-0" />
                  <div className="font-semibold truncate">{client.email}</div>
                </div>
              )}

              {client.address && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155]">
                  <MapPin className="w-4 h-4 text-[#e8655a] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {client.address}
                    </div>
                    <div className="text-gray-500 text-[11px] mt-0.5">
                      {client.city ? `${client.city}, ` : ""}
                      {client.state ? `${client.state} ` : ""}
                      {client.pincode ? `(${client.pincode})` : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Services Enrolled */}
          <div className="space-y-3">
            <h4
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--premium-blue-dark)" }}
            >
              Enrolled Compliance Services ({client.services?.length || 0})
            </h4>
            <div className="flex flex-wrap gap-2">
              {client.services && client.services.length > 0 ? (
                client.services.map((svcId) => {
                  const s = RECURRING_SERVICES.find((rs) => rs.id === svcId);
                  return (
                    <span
                      key={svcId}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#31719B]/30 bg-[#31719B]/10 text-[#31719B]"
                    >
                      {s ? s.name : svcId}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-gray-400 italic">
                  No active services assigned.
                </span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <h4
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--premium-blue-dark)" }}
            >
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {client.tags && client.tags.length > 0 ? (
                client.tags.map((tagVal) => {
                  const tagInfo = CLIENT_TAGS[tagVal];
                  return (
                    <span
                      key={tagVal}
                      className="px-3 py-1 rounded-full text-xs font-bold shadow-2xs"
                      style={{
                        backgroundColor: tagInfo?.bg || "#f1f5f9",
                        color: tagInfo?.text || "#475569",
                      }}
                    >
                      {tagInfo?.label || tagVal}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-gray-400 italic">No tags</span>
              )}
            </div>
          </div>

          {/* Assigned Team Members */}
          <div className="space-y-3">
            <h4
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--premium-blue-dark)" }}
            >
              Assigned Representatives
            </h4>
            <div className="flex flex-wrap gap-2">
              {client.users && client.users.length > 0 ? (
                client.users.map((usr) => (
                  <div
                    key={usr}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white"
                      style={{ backgroundColor: "var(--premium-blue-dark)" }}
                    >
                      {usr[0]}
                    </div>
                    <span>{usr}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-gray-400 italic">
                  No team members assigned
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
