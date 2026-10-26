import React, { useState, useMemo } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { ClientDsc } from "@/data/crmData";
import { getAvatarBadge } from "./utils";
import { usePermission } from "../../team/usePermission";

export interface ClientDscTabProps {
  dscs: ClientDsc[];
  setIsAddDscOpen: (open: boolean) => void;
  handleDeleteDsc: (dscId: string, name: string) => Promise<void>;
}

export const ClientDscTab: React.FC<ClientDscTabProps> = ({
  dscs,
  setIsAddDscOpen,
  handleDeleteDsc,
}) => {
  const { canDelete } = usePermission();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Expired">("All");

  const filteredDscs = useMemo(() => {
    return dscs.filter((dsc) => {
      if (statusFilter !== "All" && dsc.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          dsc.name.toLowerCase().includes(q) ||
          (dsc.dscId && dsc.dscId.toLowerCase().includes(q)) ||
          (dsc.vendor && dsc.vendor.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dscs, search, statusFilter]);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Digital Signatures ({filteredDscs.length})
          </h2>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search DSC..."
              className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
            />
          </div>

          <div className="flex items-center rounded-md border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
            {(["All", "Active", "Expired"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${
                  statusFilter === filter
                    ? "bg-blue-100 text-[#31719B] dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddDscOpen(true)}
          className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          style={{ backgroundColor: "var(--premium-blue-dark)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-slim">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr
              className="text-gray-700 dark:text-gray-300"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                DSC ID
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Name
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Issued Date
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Expiry Date
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Bin Number
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Vendor
              </th>
              <th className="px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Class
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Location
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Status
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Remarks
              </th>
              <th className="w-12 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDscs.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-gray-400 font-medium">
                  No Digital Signatures on record. Click "+ Add" to record a DSC.
                </td>
              </tr>
            ) : (
              filteredDscs.map((dsc, idx) => (
                <tr
                  key={dsc.id || idx}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                >
                  {/* DSC ID */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono text-gray-700 dark:text-gray-300 font-medium">
                    {dsc.dscId || `#S${idx + 100}`}
                  </td>

                  {/* Name + Avatar */}
                  <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      {getAvatarBadge(dsc.name, idx)}
                      <span>{dsc.name}</span>
                    </div>
                  </td>

                  {/* Issued Date */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {dsc.issuedDate || "-"}
                  </td>

                  {/* Expiry Date */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {dsc.expiryDate || "-"}
                  </td>

                  {/* Bin Number */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {dsc.binNumber || "-"}
                  </td>

                  {/* Vendor */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {dsc.vendor || "-"}
                  </td>

                  {/* Class */}
                  <td className="px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {dsc.class || "-"}
                  </td>

                  {/* Location */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {dsc.location || "-"}
                  </td>

                  {/* Status */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                        dsc.status === "Active"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                      }`}
                    >
                      {dsc.status || "Active"}
                    </span>
                  </td>

                  {/* Remarks */}
                  <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300 max-w-xs truncate">
                    {dsc.remarks || "-"}
                  </td>

                  {/* Delete action */}
                  <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                    {canDelete("digital_signature") ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteDsc(dsc.dscId || dsc.id || "", dsc.name)}
                        title="Delete digital signature"
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
