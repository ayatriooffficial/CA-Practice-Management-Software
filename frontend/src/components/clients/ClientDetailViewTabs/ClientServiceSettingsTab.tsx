import React, { useState } from "react";
import {
  Search,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { ClientServiceSetting } from "@/data/crmData";
import { IosToggleSwitch } from "@/components/ui/IosToggleSwitch";
import { ClientRecurringTaskDrawer } from "./ClientRecurringTaskDrawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";

export interface ClientServiceSettingsTabProps {
  serviceSearch: string;
  setServiceSearch: (val: string) => void;
  serviceFilter: "All" | "Enabled";
  setServiceFilter: (val: "All" | "Enabled") => void;
  allServices: ClientServiceSetting[];
  filteredServices: ClientServiceSetting[];
  groupedServices: Record<string, ClientServiceSetting[]>;
  collapsedCategories: Record<string, boolean>;
  toggleCategory: (cat: string) => void;
  expandedServiceId: string | null;
  setExpandedServiceId: (id: string | null) => void;
  editingService: ClientServiceSetting | null;
  setEditingService: React.Dispatch<React.SetStateAction<ClientServiceSetting | null>>;
  isSavingServiceOptions: boolean;
  isLoadingServices: boolean;
  handleToggleServiceCompliance: (serviceName: string, currentVal: boolean) => Promise<void>;
  handleToggleCategoryCompliance: (catName: string, items: ClientServiceSetting[]) => Promise<void>;
  handleSaveServiceOptions: (updatedSetting: ClientServiceSetting, keepDrawerOpen?: boolean) => Promise<void>;
}

export const ClientServiceSettingsTab: React.FC<ClientServiceSettingsTabProps> = ({
  serviceSearch,
  setServiceSearch,
  serviceFilter,
  setServiceFilter,
  allServices,
  filteredServices,
  groupedServices,
  collapsedCategories,
  toggleCategory,
  expandedServiceId,
  setExpandedServiceId,
  editingService,
  setEditingService,
  isSavingServiceOptions,
  isLoadingServices,
  handleToggleServiceCompliance,
  handleToggleCategoryCompliance,
  handleSaveServiceOptions,
}) => {
  const [inlineEditingService, setInlineEditingService] = useState<string | null>(null);
  const [inlineProfVal, setInlineProfVal] = useState<string>("");
  const [inlineGovtVal, setInlineGovtVal] = useState<string>("");
  const [inlineOtherVal, setInlineOtherVal] = useState<string>("");
  const [isSavingInlineRate, setIsSavingInlineRate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <div className="bg-white dark:bg-[#1e293b] shadow-card overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          Services ({serviceSearch.trim() || serviceFilter === "Enabled" ? filteredServices.length : allServices.length})
        </h2>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              placeholder="Search service..."
              className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center rounded-md border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
            <button
              type="button"
              onClick={() => setServiceFilter("Enabled")}
              className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${
                serviceFilter === "Enabled"
                  ? "bg-blue-100 text-[#31719B] dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Enabled
            </button>
            <button
              type="button"
              onClick={() => setServiceFilter("All")}
              className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${
                serviceFilter === "All"
                  ? "bg-blue-100 text-[#31719B] dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              All
            </button>
          </div>

          {/* Three dots menu */}
          <button
            type="button"
            title="More Options"
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Service Settings Table */}
      <div className="overflow-x-auto scrollbar-slim">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr
              className="text-gray-700 dark:text-gray-300"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <th className="w-16 px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                Active
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Service
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Rec. Task
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Rec. Invoice
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Frequency
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Start
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Target
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                End
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Inv. Freq
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Inv. Day
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-right">
                Amount
              </th>
              <th className="w-10 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155]"></th>
            </tr>
          </thead>
          <tbody>
            {isLoadingServices ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-500 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#31719B]" />
                    <span>Loading services...</span>
                  </div>
                </td>
              </tr>
            ) : Object.keys(groupedServices).length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400 font-medium">
                  No services found. Add services in the Services section to configure them for this client.
                </td>
              </tr>
            ) : (
              (() => {
                const categoryEntries = Object.entries(groupedServices);
                const paginatedCategories = categoryEntries.slice((page - 1) * pageSize, page * pageSize);
                return paginatedCategories.map(([category, items]) => {
                const isCollapsed = collapsedCategories[category];
                const allCategoryCompliance = items.length > 0 && items.every((x) => Boolean(x.isActive !== undefined ? x.isActive : x.compliance));

                return (
                  <React.Fragment key={category}>
                    {/* Category Group Header Row */}
                    <tr className="bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100/60 transition-colors">
                      <td className="px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                        <IosToggleSwitch
                          checked={allCategoryCompliance}
                          onChange={() => handleToggleCategoryCompliance(category, items)}
                          ariaLabel={`Toggle category ${category}`}
                        />
                      </td>
                      <td
                        colSpan={10}
                        className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-bold text-gray-800 dark:text-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <span>{category}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-200/60 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {items.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
                          title={isCollapsed ? "Expand Category" : "Collapse Category"}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronUp className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Category Items */}
                    {!isCollapsed &&
                      items.map((svc) => {
                        const isExpanded = expandedServiceId === svc.serviceName;

                        return (
                          <React.Fragment key={svc.id || svc.serviceName}>
                            <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                              {/* Active / Compliance Toggle switch */}
                              <td className="px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                                <IosToggleSwitch
                                  checked={Boolean(svc.isActive !== undefined ? svc.isActive : svc.compliance)}
                                  onChange={() =>
                                    handleToggleServiceCompliance(svc.serviceName, Boolean(svc.isActive !== undefined ? svc.isActive : svc.compliance))
                                  }
                                  ariaLabel={`Toggle ${svc.serviceName}`}
                                />
                              </td>

                              {/* Service Name */}
                              <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                                {svc.serviceName}
                              </td>

                              {/* Rec. Task */}
                              <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                                    svc.recTask === "Enabled"
                                      ? "bg-[#e6f9ed] text-[#16a34a] border border-[#bbf7d0]"
                                      : "bg-[#f1f3f5] text-[#6b7280]"
                                  }`}
                                >
                                  {svc.recTask || "Disabled"}
                                </span>
                              </td>

                              {/* Rec. Invoice */}
                              <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                                    svc.recInvoice === "Enabled"
                                      ? "bg-[#e6f9ed] text-[#16a34a] border border-[#bbf7d0]"
                                      : "bg-[#f1f3f5] text-[#6b7280]"
                                  }`}
                                >
                                  {svc.recInvoice || "Disabled"}
                                </span>
                              </td>

                              {/* Frequency */}
                              <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                                    svc.frequency === "Quarterly"
                                      ? "bg-[#ffedd5] text-[#ea580c]"
                                      : "bg-blue-50 dark:bg-blue-950/50 text-[#31719B] dark:text-[#60a5fa]"
                                  }`}
                                >
                                  {svc.frequency || "Monthly"}
                                </span>
                              </td>

                              {/* Start, Target, End */}
                              <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                                {svc.start || "—"}
                              </td>
                              <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                                {svc.target || "—"}
                              </td>
                              <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                                {svc.end || "—"}
                              </td>

                              {/* Inv Freq */}
                              <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                                {svc.invFreq ? (
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                                      svc.invFreq === "Quarterly"
                                        ? "bg-[#ffedd5] text-[#ea580c]"
                                        : "bg-blue-50 dark:bg-blue-950/50 text-[#31719B] dark:text-[#60a5fa]"
                                    }`}
                                  >
                                    {svc.invFreq}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>

                              {/* Inv Day */}
                              <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                                {svc.invDay ?? "—"}
                              </td>

                              {/* Amount & Breakdown */}
                              <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-right text-gray-900 dark:text-white">
                                {inlineEditingService === svc.serviceName ? (
                                  <div
                                    className="flex flex-col gap-1.5 p-2.5 bg-blue-50/95 dark:bg-[#1e293b] rounded-lg border border-[#31719B] text-left min-w-[220px] shadow-lg animate-in fade-in"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-between text-[11px] font-bold text-[#31719B] dark:text-[#6db0db]">
                                      <span>Breakdown Charges</span>
                                      <span className="text-gray-900 dark:text-white">
                                        Total: ₹{((parseFloat(inlineProfVal) || 0) + (parseFloat(inlineGovtVal) || 0) + (parseFloat(inlineOtherVal) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      <div>
                                        <span className="text-[9.5px] font-semibold text-gray-500 dark:text-gray-400 block">Prof (₹)</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={inlineProfVal}
                                          onChange={(e) => setInlineProfVal(e.target.value)}
                                          className="w-full h-7 px-1.5 text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-semibold outline-none focus:border-[#31719B]"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[9.5px] font-semibold text-gray-500 dark:text-gray-400 block">Govt (₹)</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={inlineGovtVal}
                                          onChange={(e) => setInlineGovtVal(e.target.value)}
                                          className="w-full h-7 px-1.5 text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-semibold outline-none focus:border-[#31719B]"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[9.5px] font-semibold text-gray-500 dark:text-gray-400 block">Other (₹)</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={inlineOtherVal}
                                          onChange={(e) => setInlineOtherVal(e.target.value)}
                                          className="w-full h-7 px-1.5 text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-semibold outline-none focus:border-[#31719B]"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-blue-200/50 dark:border-blue-900/40">
                                      <button
                                        type="button"
                                        onClick={() => setInlineEditingService(null)}
                                        className="px-2 py-0.5 rounded text-[10.5px] text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSavingInlineRate}
                                        onClick={async () => {
                                          const p = parseFloat(inlineProfVal) || 0;
                                          const g = parseFloat(inlineGovtVal) || 0;
                                          const o = parseFloat(inlineOtherVal) || 0;
                                          const total = p + g + o;
                                          setIsSavingInlineRate(true);
                                          await handleSaveServiceOptions(
                                            {
                                              ...svc,
                                              professionalFee: p,
                                              governmentFee: g,
                                              otherCharges: o,
                                              totalServiceFee: total,
                                              amount: total,
                                            },
                                            true
                                          );
                                          setIsSavingInlineRate(false);
                                          setInlineEditingService(null);
                                        }}
                                        className="px-2.5 py-0.5 rounded bg-[#31719B] text-white hover:bg-[#255677] text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        {isSavingInlineRate ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Check className="w-3 h-3" />
                                        )}
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="group flex flex-col items-end gap-0.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span
                                        onClick={() => {
                                          const effectiveProf = (svc.professionalFee && svc.professionalFee > 0)
                                            ? svc.professionalFee
                                            : (svc.amount || 0);
                                          setInlineEditingService(svc.serviceName);
                                          setInlineProfVal(String(effectiveProf));
                                          setInlineGovtVal(String(svc.governmentFee ?? 0));
                                          setInlineOtherVal(String(svc.otherCharges ?? 0));
                                        }}
                                        className="cursor-pointer hover:text-[#31719B] dark:hover:text-[#6db0db] transition-colors"
                                        title="Click to edit charges breakdown for this client"
                                      >
                                        {(svc.totalServiceFee || svc.amount || 0) > 0
                                          ? `₹${(svc.totalServiceFee || svc.amount || 0).toLocaleString("en-IN", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}`
                                          : "—"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const effectiveProf = (svc.professionalFee && svc.professionalFee > 0)
                                            ? svc.professionalFee
                                            : (svc.amount || 0);
                                          setInlineEditingService(svc.serviceName);
                                          setInlineProfVal(String(effectiveProf));
                                          setInlineGovtVal(String(svc.governmentFee ?? 0));
                                          setInlineOtherVal(String(svc.otherCharges ?? 0));
                                        }}
                                        title="Edit charges breakdown for this client"
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-[#31719B] cursor-pointer transition-all"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                                      Prof: ₹{Number((svc.professionalFee && svc.professionalFee > 0) ? svc.professionalFee : (svc.amount || 0)).toLocaleString("en-IN")}
                                      {Number(svc.governmentFee ?? 0) > 0 ? ` | Govt: ₹${Number(svc.governmentFee).toLocaleString("en-IN")}` : ""}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Row expand button */}
                              <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                                <button
                                  type="button"
                                  title={isExpanded ? "Collapse Options" : "Expand Options"}
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedServiceId(null);
                                      setEditingService(null);
                                    } else {
                                      setExpandedServiceId(svc.serviceName);
                                      setEditingService({ ...svc });
                                    }
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-[#31719B]" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Options Editor Drawer */}
                            {isExpanded && editingService && (
                              <tr className="bg-purple-50/40 dark:bg-purple-950/20 border-b border-[#dde2e8] dark:border-[#334155]">
                                <td colSpan={12} className="px-5 py-4">
                                  <ClientRecurringTaskDrawer
                                    editingService={editingService}
                                    setEditingService={setEditingService}
                                    onSave={handleSaveServiceOptions}
                                    onCancel={() => {
                                      setExpandedServiceId(null);
                                      setEditingService(null);
                                    }}
                                    isSaving={isSavingServiceOptions}
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              });
            })()
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
