import React, { useState, useMemo } from "react";
import { Plus, Trash2, ExternalLink, FileText, Search } from "lucide-react";
import { ClientLicense } from "@/data/crmData";
import { getAvatarBadge } from "./utils";
import { usePermission } from "../../team/usePermission";

export interface ClientLicensesTabProps {
  licenses: ClientLicense[];
  setIsAddLicenseOpen: (open: boolean) => void;
  handleDeleteLicense: (licId: string, licName: string) => Promise<void>;
}

export const ClientLicensesTab: React.FC<ClientLicensesTabProps> = ({
  licenses,
  setIsAddLicenseOpen,
  handleDeleteLicense,
}) => {
  const { canDelete } = usePermission();
  const [search, setSearch] = useState("");

  const filteredLicenses = useMemo(() => {
    if (!search.trim()) return licenses;
    const q = search.toLowerCase();
    return licenses.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.licenseNo && l.licenseNo.toLowerCase().includes(q))
    );
  }, [licenses, search]);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-sm border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Licenses ({filteredLicenses.length})
          </h2>
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter licenses..."
              className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#7c3aed]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddLicenseOpen(true)}
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
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Name
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                License No
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Issued Date
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Expiry Date
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                URL
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-center">
                Files
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
            {filteredLicenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                  No licenses recorded. Click "+ Add" to record a license.
                </td>
              </tr>
            ) : (
              filteredLicenses.map((lic, idx) => (
                <tr
                  key={lic.id || idx}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                >
                  {/* Name + Avatar */}
                  <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      {getAvatarBadge(lic.name, idx)}
                      <span>{lic.name}</span>
                    </div>
                  </td>

                  {/* License No */}
                  <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono text-gray-700 dark:text-gray-300">
                    {lic.licenseNo || "-"}
                  </td>

                  {/* Issued Date */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {lic.issuedDate || "-"}
                  </td>

                  {/* Expiry Date */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {lic.expiryDate || "-"}
                  </td>

                  {/* URL */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {lic.url && lic.url !== "-" ? (
                      <a
                        href={lic.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#31719B] hover:underline flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Files / Drive Link */}
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                    {lic.fileUrl || (lic.file && (lic.file.startsWith("http") || lic.file.startsWith("/"))) ? (
                      <a
                        href={lic.fileUrl || lic.file || "#"}
                        target="_blank"
                        rel="noreferrer"
                        title={`View ${lic.file || lic.name} on Google Drive`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-[#31719B] dark:text-[#60a5fa] font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[11px] transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="max-w-[85px] truncate font-semibold">View File</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    ) : lic.file ? (
                      <span
                        title={lic.file}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="max-w-[75px] truncate">{lic.file}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Remarks */}
                  <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300 max-w-xs truncate">
                    {lic.remarks || "-"}
                  </td>

                  {/* Delete action */}
                  <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                    {canDelete("licenses") ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteLicense(lic.id || "", lic.name)}
                        title="Delete license"
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
