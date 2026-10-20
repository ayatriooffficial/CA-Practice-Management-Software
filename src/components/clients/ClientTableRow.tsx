"use client";

import React, { memo } from "react";
import { Phone, Eye, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Client } from "@/data/crmData";

export interface ClientColumnDef {
  id: string;
  label: string;
  sortable?: boolean;
}

export const CLIENT_COLUMNS: ClientColumnDef[] = [
  { id: "photo", label: "PHOTO" },
  { id: "fileNo", label: "FILE NO.", sortable: true },
  { id: "name", label: "NAME", sortable: true },
  { id: "type", label: "TYPE", sortable: true },
  { id: "mobile", label: "MOBILE" },
  { id: "group", label: "GROUP", sortable: true },
  { id: "tags", label: "TAGS" },
  { id: "status", label: "STATUS" },
  { id: "users", label: "USERS" },
];

interface ClientTableRowProps {
  client: Client;
  isSelected: boolean;
  visibleColumns: ClientColumnDef[];
  activeMenuId: string | null;
  onToggleSelect: (id: string) => void;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onToggleActive: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onRestore?: (id: string, name: string) => void;
  onToggleMenu: (id: string | null) => void;
}

export const ClientTableRow = memo(
  ({
    client,
    isSelected,
    visibleColumns,
    onToggleSelect,
    onView,
    onEdit,
    onToggleActive,
    onDelete,
    onRestore,
  }: ClientTableRowProps) => {
    const isDeleted = Boolean((client as any).isDeleted);

    const stickyCellBg = isSelected
      ? "bg-[#edf4f9] dark:bg-[#1c2c3e] group-hover:bg-[#e2edf5] dark:group-hover:bg-[#23374d]"
      : isDeleted
      ? "bg-red-50/50 dark:bg-red-950/20 group-hover:bg-red-100/50 dark:group-hover:bg-red-900/30"
      : "bg-white dark:bg-[#1e293b] group-hover:bg-[#F6F4F2] dark:group-hover:bg-[#162032]";

    return (
      <tr
        className={`group transition-colors ${
          isSelected
            ? "bg-[#edf4f9] hover:bg-[#e2edf5] dark:bg-[#1c2c3e] dark:hover:bg-[#23374d]"
            : isDeleted
            ? "bg-red-50/40 hover:bg-red-100/50 dark:bg-red-950/20 dark:hover:bg-red-900/30"
            : "bg-white hover:bg-[#F6F4F2] dark:bg-[#1e293b] dark:hover:bg-[#162032]"
        }`}
      >
        {/* Checkbox (Sticky Left: 0px) */}
        <td
          className={`sticky left-0 z-20 w-12 min-w-[48px] max-w-[48px] px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center opacity-100 ${stickyCellBg}`}
        >
          <input
            id={`client-select-${client.id}`}
            name={`select-client-${client.id}`}
            aria-label={`Select client ${client.name || client.id}`}
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(client.id)}
            className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
          />
        </td>

        {/* Dynamic Column Cells */}
        {visibleColumns.map((col) => {
          switch (col.id) {
            case "photo":
              return (
                <td
                  key={col.id}
                  className="px-3 py-2 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center w-12"
                >
                  {client.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={client.photo}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover mx-auto border border-gray-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 mx-auto text-xs font-bold">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </td>
              );

            case "fileNo":
              return (
                <td
                  key={col.id}
                  className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => onView(client)}
                    className="hover:text-[#31719B] hover:underline cursor-pointer"
                  >
                    {client.fileNo}
                  </button>
                </td>
              );

            case "name":
              return (
                <td
                  key={col.id}
                  className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-[#31719B] whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => onView(client)}
                    className="hover:underline cursor-pointer text-left flex items-center gap-1.5"
                  >
                    <span>{client.name}</span>
                    {isDeleted && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                        Deleted
                      </span>
                    )}
                  </button>
                </td>
              );

            case "type":
              return (
                <td
                  key={col.id}
                  className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 capitalize whitespace-nowrap"
                >
                  {client.type.replace("-", " ")}
                </td>
              );

            case "mobile":
              return (
                <td
                  key={col.id}
                  className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap"
                >
                  <a
                    href={`tel:${client.mobile}`}
                    className="flex items-center gap-1 text-[#31719B] hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{client.mobile}</span>
                  </a>
                </td>
              );

            case "group":
              return (
                <td
                  key={col.id}
                  className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap"
                >
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs">
                    {client.group}
                  </span>
                </td>
              );

            case "tags":
              return (
                <td
                  key={col.id}
                  className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300"
                >
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {client.tags?.slice(0, 2).map((t, idx) => (
                      <span
                        key={`${client.id || 'c'}-tag-${t || 'empty'}-${idx}`}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-[#31719B]/10 text-[#31719B] font-medium"
                      >
                        {t}
                      </span>
                    ))}
                    {(client.tags?.length || 0) > 2 && (
                      <span className="text-[10px] text-gray-400">
                        +{client.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
              );

            case "status":
              return (
                <td
                  key={col.id}
                  className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center"
                >
                  <button
                    type="button"
                    onClick={() => onToggleActive(client.id)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      client.active
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {client.active ? "Active" : "Inactive"}
                  </button>
                </td>
              );

            case "users":
              return (
                <td
                  key={col.id}
                  className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-400 text-xs"
                >
                  {client.users?.length ? client.users.join(", ") : "—"}
                </td>
              );

            default:
              return null;
          }
        })}

        {/* Sticky Actions Column */}
        <td
          className={`sticky right-0 z-20 w-24 min-w-[96px] max-w-[96px] px-2 py-2 border-l border-b border-[#dde2e8] dark:border-[#334155] text-center opacity-100 ${stickyCellBg}`}
        >
          <div className="relative inline-block text-left">
            {!isDeleted ? (
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => onView(client)}
                  className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#31719B] transition-colors"
                  title="View Client Details"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(client)}
                  className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#31719B] transition-colors"
                  title="Edit Client"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(client.id, client.name)}
                  className="p-1 rounded text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors"
                  title="Soft Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              onRestore && (
                <button
                  type="button"
                  onClick={() => onRestore(client.id, client.name)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 transition-colors"
                  title="Restore Client"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
              )
            )}
          </div>
        </td>
      </tr>
    );
  },
  (prev, next) =>
    prev.client.id === next.client.id &&
    prev.client.name === next.client.name &&
    prev.client.fileNo === next.client.fileNo &&
    prev.client.active === next.client.active &&
    (prev.client as any).updatedAt === (next.client as any).updatedAt &&
    prev.isSelected === next.isSelected &&
    prev.activeMenuId === next.activeMenuId &&
    prev.visibleColumns === next.visibleColumns
);

ClientTableRow.displayName = "ClientTableRow";
