import React from "react";
import {
  Search,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ClientServiceSetting } from "@/data/crmData";
import { IosToggleSwitch } from "@/components/ui/IosToggleSwitch";

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
  handleSaveServiceOptions: (updatedSetting: ClientServiceSetting) => Promise<void>;
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
              className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#7c3aed]"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center rounded-md border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
            <button
              type="button"
              onClick={() => setServiceFilter("Enabled")}
              className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${
                serviceFilter === "Enabled"
                  ? "bg-purple-100 text-[#7c3aed] dark:bg-purple-950/60 dark:text-purple-300 shadow-xs"
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
                  ? "bg-purple-100 text-[#7c3aed] dark:bg-purple-950/60 dark:text-purple-300 shadow-xs"
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
                Compliance
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
                    <Loader2 className="w-5 h-5 animate-spin text-[#7c3aed]" />
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
              Object.entries(groupedServices).map(([category, items]) => {
                const isCollapsed = collapsedCategories[category];
                const allCategoryCompliance = items.length > 0 && items.every((x) => x.compliance);

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
                              {/* Compliance Toggle switch */}
                              <td className="px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                                <IosToggleSwitch
                                  checked={Boolean(svc.compliance)}
                                  onChange={() =>
                                    handleToggleServiceCompliance(svc.serviceName, Boolean(svc.compliance))
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
                                      : "bg-[#ede9fe] text-[#7c3aed]"
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
                                        : "bg-[#ede9fe] text-[#7c3aed]"
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

                              {/* Amount */}
                              <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-right text-gray-900 dark:text-white">
                                {svc.amount > 0
                                  ? `₹${svc.amount.toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`
                                  : "—"}
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
                                    <ChevronUp className="w-3.5 h-3.5 text-[#7c3aed]" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Options Editor Drawer */}
                            {isExpanded && editingService && (
                              <tr className="bg-purple-50/40 dark:bg-purple-950/20 border-b border-[#dde2e8] dark:border-[#334155]">
                                <td colSpan={12} className="px-6 py-4">
                                  <div className="flex flex-col gap-3.5 bg-white dark:bg-[#0f172a] rounded-lg p-4 border border-purple-200 dark:border-purple-900/60 shadow-xs">
                                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-gray-900 dark:text-white">
                                          Edit Service Settings: {svc.serviceName}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                          {svc.category}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExpandedServiceId(null);
                                            setEditingService(null);
                                          }}
                                          className="h-7 px-3 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isSavingServiceOptions}
                                          onClick={() => handleSaveServiceOptions(editingService)}
                                          className="h-7 px-3.5 text-xs font-semibold text-white bg-[#7c3aed] hover:bg-[#6d28d9] rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                                        >
                                          {isSavingServiceOptions ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <CheckCircle2 className="w-3 h-3" />
                                          )}
                                          <span>Save Changes</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Options Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          Compliance
                                        </label>
                                        <div className="flex items-center gap-2 h-8">
                                          <IosToggleSwitch
                                            checked={Boolean(editingService.compliance)}
                                            onChange={(val) =>
                                              setEditingService({ ...editingService, compliance: val })
                                            }
                                          />
                                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {editingService.compliance ? "Enabled" : "Disabled"}
                                          </span>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          Rec. Task
                                        </label>
                                        <select
                                          value={editingService.recTask || "Disabled"}
                                          onChange={(e) =>
                                            setEditingService({
                                              ...editingService,
                                              recTask: e.target.value as any,
                                            })
                                          }
                                          className="w-full h-8 px-2.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
                                        >
                                          <option value="Enabled">Enabled</option>
                                          <option value="Disabled">Disabled</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          Rec. Invoice
                                        </label>
                                        <select
                                          value={editingService.recInvoice || "Disabled"}
                                          onChange={(e) =>
                                            setEditingService({
                                              ...editingService,
                                              recInvoice: e.target.value as any,
                                            })
                                          }
                                          className="w-full h-8 px-2.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
                                        >
                                          <option value="Enabled">Enabled</option>
                                          <option value="Disabled">Disabled</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          Frequency
                                        </label>
                                        <select
                                          value={editingService.frequency || "Monthly"}
                                          onChange={(e) =>
                                            setEditingService({
                                              ...editingService,
                                              frequency: e.target.value,
                                            })
                                          }
                                          className="w-full h-8 px-2.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
                                        >
                                          <option value="Monthly">Monthly</option>
                                          <option value="Quarterly">Quarterly</option>
                                          <option value="Half-Yearly">Half-Yearly</option>
                                          <option value="Annually">Annually</option>
                                          <option value="One-Time">One-Time</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          Start Day
                                        </label>
                                        <input
                                          type="text"
                                          value={editingService.start || ""}
                                          onChange={(e) =>
                                            setEditingService({
                                              ...editingService,
                                              start: e.target.value,
                                            })
                                          }
                                          placeholder="e.g. Day 1"
                                          className="w-full h-8 px-2.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          Target Day
                                        </label>
                                        <input
                                          type="text"
                                          value={editingService.target || ""}
                                          onChange={(e) =>
                                            setEditingService({
                                              ...editingService,
                                              target: e.target.value,
                                            })
                                          }
                                          placeholder="e.g. Day 19"
                                          className="w-full h-8 px-2.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          End Day
                                        </label>
                                        <input
                                          type="text"
                                          value={editingService.end || ""}
                                          onChange={(e) =>
                                            setEditingService({
                                              ...editingService,
                                              end: e.target.value,
                                            })
                                          }
                                          placeholder="e.g. Day 19"
                                          className="w-full h-8 px-2.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          Invoice Frequency
                                        </label>
                                        <select
                                          value={editingService.invFreq || ""}
                                          onChange={(e) =>
                                            setEditingService({
                                              ...editingService,
                                              invFreq: e.target.value,
                                            })
                                          }
                                          className="w-full h-8 px-2.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
                                        >
                                          <option value="">None (—)</option>
                                          <option value="Monthly">Monthly</option>
                                          <option value="Quarterly">Quarterly</option>
                                          <option value="Annually">Annually</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          Invoice Day
                                        </label>
                                        <input
                                          type="number"
                                          min={1}
                                          max={31}
                                          value={editingService.invDay ?? ""}
                                          onChange={(e) =>
                                            setEditingService({
                                              ...editingService,
                                              invDay: e.target.value ? Number(e.target.value) : undefined,
                                            })
                                          }
                                          placeholder="e.g. 1"
                                          className="w-full h-8 px-2.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                          Tariff Amount (₹)
                                        </label>
                                        <input
                                          type="number"
                                          min={0}
                                          step="any"
                                          value={editingService.amount ?? 0}
                                          onChange={(e) =>
                                            setEditingService({
                                              ...editingService,
                                              amount: Number(e.target.value) || 0,
                                            })
                                          }
                                          className="w-full h-8 px-2.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
