"use client";

import React, { memo } from "react";
import { Phone, Pencil, Trash2, RotateCcw, UserCheck } from "lucide-react";
import { Lead } from "@/data/crmData";
import { getDirectFilePreviewUrl } from "@/utils/filePreview";
import { usePermission } from "@/components/team/usePermission";

export interface LeadColumnDef {
  key: keyof Lead | "actions" | "select";
  label: string;
  width?: string;
  kind?: "text" | "date" | "timestamp" | "file" | "secret" | "phone" | "email";
  sortable?: boolean;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatCellDate = (iso: string): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : DATE_FORMATTER.format(d);
  } catch {
    return iso;
  }
};

export const ALL_LEAD_COLUMNS: LeadColumnDef[] = [
  { key: "fullName", label: "Party Full Name", sortable: true, width: "w-[220px]" },
  { key: "mobile", label: "Communication Mobile", kind: "phone", width: "w-[170px]" },
  { key: "email", label: "Communication Mail ID", kind: "email", width: "w-[210px]" },
  { key: "pan", label: "PAN No", sortable: true, width: "w-[130px]" },
  { key: "aadhaar", label: "Aadhaar No", width: "w-[140px]" },
  { key: "gender", label: "Gender", width: "w-[110px]" },
  { key: "dob", label: "Date of Birth", kind: "date", sortable: true, width: "w-[130px]" },
  { key: "state", label: "State Name", sortable: true, width: "w-[150px]" },
  { key: "createdAt", label: "Created On", kind: "timestamp", sortable: true, width: "w-[140px]" },
  { key: "updatedAt", label: "Updated On", kind: "timestamp", sortable: true, width: "w-[140px]" },
  { key: "firstName", label: "First Name", sortable: true, width: "w-[140px]" },
  { key: "middleName", label: "Middle Name", sortable: true, width: "w-[140px]" },
  { key: "lastName", label: "Last Name", sortable: true, width: "w-[140px]" },
  { key: "abbreviation", label: "Abbreviation", width: "w-[120px]" },
  { key: "aadhaarMobile", label: "Mobile No Linked with Aadhaar", width: "w-[170px]" },
  { key: "panAttachment", label: "PAN Attachment", kind: "file", width: "w-[140px]" },
  { key: "aadhaarAttachment", label: "Aadhaar Attachment", kind: "file", width: "w-[140px]" },
  { key: "address", label: "Address", width: "w-[220px]" },
  { key: "country", label: "Country", width: "w-[120px]" },
  { key: "pincode", label: "Pin Code", width: "w-[110px]" },
  { key: "nationality", label: "Nationality", width: "w-[120px]" },
  { key: "policeStation", label: "Police Station", width: "w-[140px]" },
  { key: "postOffice", label: "Post Office", width: "w-[140px]" },
  { key: "din", label: "DIN / DPIN No", width: "w-[130px]" },
  { key: "dinAttachment", label: "DIN Attachment", kind: "file", width: "w-[140px]" },
  { key: "mcaId", label: "MCA V3 ID", width: "w-[140px]" },
  { key: "mcaPassword", label: "MCA V3 PW", kind: "secret", width: "w-[130px]" },
  { key: "referredBy", label: "Referred By", width: "w-[140px]" },
];

export const INITIAL_LEAD_COLUMN_WIDTHS: Record<string, number> = {
  fullName: 220,
  mobile: 170,
  email: 210,
  pan: 130,
  aadhaar: 140,
  gender: 110,
  dob: 130,
  state: 150,
  createdAt: 140,
  updatedAt: 140,
  firstName: 140,
  middleName: 140,
  lastName: 140,
  abbreviation: 120,
  aadhaarMobile: 170,
  panAttachment: 140,
  aadhaarAttachment: 140,
  address: 220,
  country: 120,
  pincode: 110,
  nationality: 120,
  policeStation: 140,
  postOffice: 140,
  din: 130,
  dinAttachment: 140,
  mcaId: 140,
  mcaPassword: 130,
  referredBy: 140,
};

interface LeadTableRowProps {
  lead: Lead;
  isSelected: boolean;
  visibleColumns?: LeadColumnDef[];
  dynamicColumns?: LeadColumnDef[];
  columnWidths?: Record<string, number>;
  formatDate?: (iso: string) => string;
  onToggleSelect: (id: string) => void;
  onSelectLead?: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string, name: string) => void;
  onRestore?: (id: string, name: string) => void;
  onConvert?: (lead: Lead) => void;
}

export const LeadTableRow = memo(
  ({
    lead,
    isSelected,
    visibleColumns,
    dynamicColumns,
    columnWidths,
    formatDate,
    onToggleSelect,
    onSelectLead,
    onEdit,
    onDelete,
    onRestore,
    onConvert,
  }: LeadTableRowProps) => {
    const { canDelete, canAddEdit } = usePermission();
    const isDeleted = Boolean((lead as any).isDeleted);
    const isConverted = (lead as any).status === "converted";

    const cols = dynamicColumns || (visibleColumns ? visibleColumns.filter((col) => col.key !== "fullName") : []);

    const stickyCellBg = isSelected
      ? "bg-[#edf4f9] dark:bg-[#1c2c3e] group-hover:bg-[#e2edf5] dark:group-hover:bg-[#23374d]"
      : isDeleted
        ? "bg-red-50/50 dark:bg-red-950/20 group-hover:bg-red-100/50 dark:group-hover:bg-red-900/30"
        : "bg-white dark:bg-[#1e293b] group-hover:bg-[#F6F4F2] dark:group-hover:bg-[#162032]";

    const fullNameWidth = columnWidths?.fullName || INITIAL_LEAD_COLUMN_WIDTHS.fullName || 220;

    return (
      <tr
        className={`group transition-colors ${isSelected
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
            id={`lead-select-${lead.id}`}
            name={`select-lead-${lead.id}`}
            aria-label={`Select lead ${lead.fullName || lead.id}`}
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(lead.id)}
            className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
          />
        </td>

        {/* Party Full Name (Sticky Left: 48px) */}
        <td
          className={`sticky left-[48px] z-20 px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] opacity-100 ${stickyCellBg}`}
          style={{
            width: `${fullNameWidth}px`,
            minWidth: `${fullNameWidth}px`,
            maxWidth: `${fullNameWidth}px`,
          }}
        >
          <div className="flex items-center gap-2.5 text-left truncate">
            <button
              type="button"
              onClick={() => (onSelectLead ? onSelectLead(lead) : onEdit(lead))}
              className="flex items-center gap-2.5 text-left cursor-pointer group/name hover:opacity-80 transition-opacity truncate max-w-full"
            >
              {lead.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getDirectFilePreviewUrl(lead.photo)}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#eef0f3] dark:bg-[#334155] flex items-center justify-center text-gray-400 shrink-0">
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
              <span className="font-semibold text-[#31719B] group-hover/name:underline truncate">
                {lead.fullName}
              </span>
            </button>
          </div>
        </td>

        {/* Dynamic Columns */}
        {cols.map((col) => {
          const colWidth = columnWidths?.[col.key as string] || INITIAL_LEAD_COLUMN_WIDTHS[col.key as string] || 140;
          const val = (lead as any)[col.key];
          let cellContent: React.ReactNode = val || "—";

          if (col.kind === "timestamp" || col.kind === "date") {
            cellContent = formatDate ? formatDate(val) : formatCellDate(val);
          } else if (col.kind === "secret") {
            cellContent = <span className="font-mono text-gray-400">••••••••</span>;
          } else if (col.kind === "phone" && val) {
            cellContent = (
              <a
                href={`tel:${val}`}
                className="flex items-center gap-1 text-[#31719B] hover:underline"
              >
                <Phone className="w-3 h-3" />
                <span>{val}</span>
              </a>
            );
          } else if (col.kind === "email" && val) {
            cellContent = (
              <a
                href={`mailto:${val}`}
                className="flex items-center gap-1 text-[#31719B] hover:underline"
              >
                <span>{val}</span>
              </a>
            );
          } else if (col.kind === "file") {
            cellContent = val ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                Attached
              </span>
            ) : (
              <span className="text-gray-300">—</span>
            );
          }

          return (
            <td
              key={col.key as string}
              className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-800 dark:text-gray-200 whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                width: `${colWidth}px`,
                minWidth: `${colWidth}px`,
                maxWidth: `${colWidth}px`,
              }}
            >
              {cellContent}
            </td>
          );
        })}

        {/* Sticky Actions Column */}
        <td
          className={`sticky right-0 z-20 w-28 min-w-[112px] max-w-[112px] px-2 py-2 border-l border-b border-[#dde2e8] dark:border-[#334155] text-center opacity-100 ${stickyCellBg}`}
        >
          <div className="flex items-center justify-center gap-1">
            {!isDeleted ? (
              <>
                {/* Convert to Client Button */}
                {onConvert && !isConverted && (
                  <button
                    type="button"
                    onClick={() => onConvert(lead)}
                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 transition-colors"
                    title="Convert to Client"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                )}

                {/* Edit Button */}
                {canAddEdit("leads") && (
                  <button
                    type="button"
                    onClick={() => onEdit(lead)}
                    className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#31719B] transition-colors"
                    title="Edit Lead"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Soft Delete Button */}
                {canDelete("leads") && (
                  <button
                    type="button"
                    onClick={() => onDelete(lead.id, lead.fullName)}
                    className="p-1 rounded text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors"
                    title="Soft Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              /* Restore Button */
              canDelete("leads") && onRestore && (
                <button
                  type="button"
                  onClick={() => onRestore(lead.id, lead.fullName)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 transition-colors"
                  title="Restore Lead"
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
  // Custom memo comparison function: only re-render if the specific lead data, selection, or columns change
  (prev, next) =>
    prev.lead.id === next.lead.id &&
    prev.lead.updatedAt === next.lead.updatedAt &&
    prev.lead.fullName === next.lead.fullName &&
    prev.isSelected === next.isSelected &&
    prev.visibleColumns === next.visibleColumns &&
    prev.columnWidths === next.columnWidths
);

LeadTableRow.displayName = "LeadTableRow";
