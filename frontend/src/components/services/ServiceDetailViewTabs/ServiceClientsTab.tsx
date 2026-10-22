"use client";

import React from "react";
import { Search, Loader2 } from "lucide-react";
import { Client, ClientServiceSetting } from "@/data/crmData";
import { Service } from "@/data/serviceData";
import { IosToggleSwitch } from "@/components/ui/IosToggleSwitch";

interface ServiceClientsTabProps {
  clients: Client[];
  filteredClients: Client[];
  clientSearch: string;
  setClientSearch: (val: string) => void;
  selectedDeptFilter: string;
  setSelectedDeptFilter: (val: string) => void;
  isClientsLoading: boolean;
  service: Service;
  handleToggleClientService: (clientItem: Client, nextVal: boolean) => Promise<void>;
  pendingClientId?: string | null;
}

export const ServiceClientsTab: React.FC<ServiceClientsTabProps> = ({
  filteredClients,
  clientSearch,
  setClientSearch,
  selectedDeptFilter,
  setSelectedDeptFilter,
  isClientsLoading,
  service,
  handleToggleClientService,
  pendingClientId,
}) => {
  return (
    <div className="gap-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[var(--text-main)]">
          Clients ({filteredClients.length})
        </h3>

        <div className="flex items-center gap-x-2">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="h-8 px-2.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none"
          >
            <option value="All departments">All departments</option>
            <option value="GST">GST</option>
            <option value="Income Tax">Income Tax</option>
            <option value="Accounts">Accounts</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]" />
            <input
              type="text"
              placeholder="Search clients..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none w-44"
            />
          </div>
        </div>
      </div>

      {/* Clients Table matching Screenshot 1 */}
      <div className="rounded-xl border border-[var(--border-main)] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className="border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 font-semibold"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <th className="py-2.5 px-3 w-16 text-center">Compliance</th>
              <th className="py-2.5 px-4">Client</th>
              <th className="py-2.5 px-3">Rec. Task</th>
              <th className="py-2.5 px-3 text-center">Task Freq</th>
              <th className="py-2.5 px-3">Start</th>
              <th className="py-2.5 px-3">Target</th>
              <th className="py-2.5 px-3">End</th>
              <th className="py-2.5 px-3">Rec Invoice</th>
              <th className="py-2.5 px-3 text-center">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-main)]">
            {isClientsLoading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-xs text-[var(--text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[var(--primary)]" />
                  Loading linked clients...
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No clients registered in database.
                </td>
              </tr>
            ) : (
              filteredClients.map((clientItem, idx) => {
                const initials = clientItem.name
                  ? clientItem.name.substring(0, 2).toUpperCase()
                  : "CL";

                // Find this specific service in client's serviceSettings
                const svcSetting = (clientItem.serviceSettings || []).find(
                  (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
                );
                const isServiceInArray = (clientItem.services || []).some(
                  (s) => s.trim().toLowerCase() === service.name.trim().toLowerCase()
                );
                const isEnabled = svcSetting ? Boolean(svcSetting.compliance) : Boolean(isServiceInArray);

                const recTask = svcSetting?.recTask || (isEnabled ? "Enabled" : "Disabled");
                const taskFreq = svcSetting?.frequency || service.frequency || "Monthly";
                const start = svcSetting?.start || "Day 1";
                const target = svcSetting?.target || (service.tatDays ? `Day ${service.tatDays}` : "Day 5");
                const end = svcSetting?.end || (service.tatDays ? `Day ${service.tatDays + 2}` : "Day 10");
                const recInvoice = svcSetting?.recInvoice || "Disabled";
                const amount = svcSetting?.amount !== undefined ? svcSetting.amount : (service.professionalFee || 0);

                const clientId = clientItem.id || (clientItem as any)._id;
                const isPending = Boolean(pendingClientId && pendingClientId === clientId);

                return (
                  <tr key={clientId || idx} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <IosToggleSwitch
                          checked={isEnabled}
                          disabled={isPending}
                          onChange={(nextVal) => handleToggleClientService(clientItem, nextVal)}
                          ariaLabel={`Toggle ${service.name} for ${clientItem.name}`}
                        />
                        {isPending && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary)] shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-x-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {initials}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-[var(--text-main)] hover:underline cursor-pointer block truncate">
                            {clientItem.name}
                          </span>
                          {clientItem.fileNo && (
                            <span className="text-[10px] text-[var(--text-subtle)] font-mono block">
                              {clientItem.fileNo}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                          recTask === "Enabled"
                            ? "bg-[#e6f9ed] text-[#16a34a] border border-[#bbf7d0]"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {recTask}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                          taskFreq === "Quarterly"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                        }`}
                      >
                        {taskFreq}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-subtle)]">{start}</td>
                    <td className="py-2.5 px-3 text-[var(--text-subtle)]">{target}</td>
                    <td className="py-2.5 px-3 text-[var(--text-subtle)]">{end}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                          recInvoice === "Enabled"
                            ? "bg-[#e6f9ed] text-[#16a34a] border border-[#bbf7d0]"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {recInvoice}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-[var(--text-main)]">
                      {amount > 0
                        ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
