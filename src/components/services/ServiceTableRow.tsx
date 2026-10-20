"use client";

import React, { memo } from "react";
import { Pencil, Trash2, RotateCcw, Clock, BookOpen, Layers } from "lucide-react";
import { Service } from "@/data/serviceData";

export interface ServiceColumnDef {
  key: keyof Service | "actions" | "select";
  label: string;
  minWidth?: string;
  sortable?: boolean;
}

export const ALL_SERVICE_COLUMNS: ServiceColumnDef[] = [
  { key: "name", label: "Service Name", sortable: true, minWidth: "min-w-[220px]" },
  { key: "category", label: "Category", sortable: true, minWidth: "min-w-[120px]" },
  { key: "isRecurring", label: "Recurring", sortable: true, minWidth: "min-w-[110px]" },
  { key: "frequency", label: "Frequency", sortable: true, minWidth: "min-w-[110px]" },
  { key: "professionalFee", label: "Professional Fee", sortable: true, minWidth: "min-w-[130px]" },
  { key: "sop", label: "SOP", minWidth: "min-w-[140px]" },
  { key: "subTasks", label: "Sub Tasks", minWidth: "min-w-[110px]" },
  { key: "difficulty", label: "Difficulty", sortable: true, minWidth: "min-w-[110px]" },
  { key: "status", label: "Status", sortable: true, minWidth: "min-w-[100px]" },
  { key: "createdAt", label: "Created On", sortable: true, minWidth: "min-w-[120px]" },
  { key: "updatedAt", label: "Updated On", sortable: true, minWidth: "min-w-[120px]" },
];

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatDate = (iso?: string): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : DATE_FORMATTER.format(d);
  } catch {
    return iso;
  }
};

interface ServiceTableRowProps {
  service: Service;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (service: Service) => void;
  onDelete: (id: string, name: string) => void;
  onRestore?: (id: string, name: string) => void;
}

export const ServiceTableRow = memo(function ServiceTableRow({
  service,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onRestore,
}: ServiceTableRowProps) {
  const isDeleted = Boolean(service.isDeleted);

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
          id={`service-select-${service.id}`}
          name={`select-service-${service.id}`}
          aria-label={`Select service ${service.name}`}
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(service.id)}
          className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
        />
      </td>

      {/* Service Name */}
      <td className="px-3.5 py-2.5 min-w-[220px] border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(service)}
            className="text-left font-semibold text-[#000000] dark:text-white hover:text-[#31719B] hover:underline cursor-pointer transition-colors"
          >
            {service.name}
          </button>
          {isDeleted && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              Deleted
            </span>
          )}
        </div>
      </td>

      {/* Category */}
      <td className="px-3.5 py-2.5 min-w-[120px] border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          {service.category}
        </span>
      </td>

      {/* Recurring */}
      <td className="px-3.5 py-2.5 min-w-[110px] border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
            service.isRecurring
              ? "font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              : "font-normal text-gray-500 dark:text-gray-400"
          }`}
        >
          {service.isRecurring ? "Recurring" : "One-Time"}
        </span>
      </td>

      {/* Frequency */}
      <td className="px-3.5 py-2.5 min-w-[110px] border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{service.frequency}</span>
        </div>
      </td>

      {/* Professional Fee */}
      <td className="px-3.5 py-2.5 min-w-[130px] border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white whitespace-nowrap font-mono text-xs">
        {CURRENCY_FORMATTER.format(service.professionalFee)}
      </td>

      {/* SOP */}
      <td className="px-3.5 py-2.5 min-w-[140px] border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-gray-400" />
          <span>{service.sop || "Standard SOP v1.0"}</span>
        </div>
      </td>

      {/* Sub Tasks */}
      <td className="px-3.5 py-2.5 min-w-[110px] border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <span>
            {service.subTasks && service.subTasks.length > 0
              ? `${service.subTasks.length} Tasks`
              : "—"}
          </span>
        </div>
      </td>

      {/* Difficulty */}
      <td className="px-3.5 py-2.5 min-w-[110px] border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap text-xs">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          {service.difficulty}
        </span>
      </td>

      {/* Status */}
      <td className="px-3.5 py-2.5 min-w-[100px] border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap text-xs">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            service.status === "Active"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {service.status}
        </span>
      </td>

      {/* Created On */}
      <td className="px-3.5 py-2.5 min-w-[120px] border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
        {formatDate(service.createdAt)}
      </td>

      {/* Updated On */}
      <td className="px-3.5 py-2.5 min-w-[120px] border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
        {formatDate(service.updatedAt)}
      </td>

      {/* Actions (Sticky Right: 0px) */}
      <td
        className={`sticky right-0 z-20 w-24 min-w-[96px] max-w-[96px] px-3 py-2.5 border-l border-b border-[#dde2e8] dark:border-[#334155] text-center whitespace-nowrap opacity-100 ${stickyCellBg}`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(service)}
            className="p-1 rounded text-gray-500 hover:text-[#31719B] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Edit Service"
            aria-label={`Edit ${service.name}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {isDeleted ? (
            onRestore && (
              <button
                type="button"
                onClick={() => onRestore(service.id, service.name)}
                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                title="Restore Service"
                aria-label={`Restore ${service.name}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => onDelete(service.id, service.name)}
              className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
              title="Soft Delete Service"
              aria-label={`Delete ${service.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});
