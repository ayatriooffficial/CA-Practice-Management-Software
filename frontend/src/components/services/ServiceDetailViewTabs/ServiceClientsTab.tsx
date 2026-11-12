"use client";

import React, { useState, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import { Service } from "@/data/serviceData";
import { Client } from "@/data/crmData";
import { IosToggleSwitch } from "@/components/ui/IosToggleSwitch";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";

interface ServiceClientsTabProps {
  service: Service;
  clients: Client[];
  filteredClients?: Client[];
  clientSearch: string;
  setClientSearch: (val: string) => void;
  selectedDeptFilter: string;
  setSelectedDeptFilter: (val: string) => void;
  isClientsLoading: boolean;
  handleToggleClientService: (client: Client, enable: boolean) => Promise<void>;
  pendingClientId?: string | null;
  page?: number;
  setPage?: (p: number) => void;
  totalDocs?: number;
}

export const ServiceClientsTab: React.FC<ServiceClientsTabProps> = ({
  service,
  clients,
  filteredClients,
  clientSearch,
  setClientSearch,
  selectedDeptFilter,
  setSelectedDeptFilter,
  isClientsLoading,
  handleToggleClientService,
  pendingClientId,
  page,
  setPage,
  totalDocs,
}) => {
  const [localPage, setLocalPage] = useState(1);
  const activePage = page !== undefined ? page : localPage;
  const setActivePage = setPage || setLocalPage;
  const pageSize = 10;
  const totalItems = totalDocs !== undefined ? totalDocs : (filteredClients?.length ?? clients.length);
  const displayClients = clients;

  const columns = useMemo<DataTableColumn<Client>[]>(
    () => [
      {
        id: "compliance",
        header: "Compliance",
        width: 100,
        align: "center",
        cell: (clientItem) => {
          const svcSetting = (clientItem.serviceSettings || []).find(
            (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          const isServiceInArray = (clientItem.services || []).some(
            (s) => s.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          const isEnabled = svcSetting
            ? Boolean(svcSetting.isActive !== undefined ? svcSetting.isActive : svcSetting.compliance)
            : Boolean(isServiceInArray);

          const clientId = clientItem.id || (clientItem as any)._id;
          const isPending = Boolean(pendingClientId && pendingClientId === clientId);

          return (
            <div className="flex items-center justify-center gap-1.5">
              <IosToggleSwitch
                checked={isEnabled}
                disabled={isPending}
                onChange={(nextVal) => handleToggleClientService(clientItem, nextVal)}
                ariaLabel={`Toggle ${service.name} for ${clientItem.name}`}
              />
              {isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#31719B] shrink-0" />
              )}
            </div>
          );
        },
      },
      {
        id: "client",
        header: "Client",
        minWidth: 200,
        sortable: true,
        cell: (clientItem) => {
          const initials = clientItem.name
            ? clientItem.name.substring(0, 2).toUpperCase()
            : "CL";
          return (
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#31719B] dark:text-[#6db0db] font-bold text-[10px] flex items-center justify-center shrink-0">
                {initials}
              </span>
              <div className="truncate">
                <span className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer block truncate">
                  {clientItem.name}
                </span>
                {clientItem.fileNo && (
                  <span className="text-[10px] text-gray-400 font-mono block">
                    {clientItem.fileNo}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "recTask",
        header: "Rec. Task",
        width: 120,
        sortable: true,
        cell: (clientItem) => {
          const svcSetting = (clientItem.serviceSettings || []).find(
            (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          const isServiceInArray = (clientItem.services || []).some(
            (s) => s.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          const isEnabled = svcSetting
            ? Boolean(svcSetting.isActive !== undefined ? svcSetting.isActive : svcSetting.compliance)
            : Boolean(isServiceInArray);
          const recTask = svcSetting?.recTask || (isEnabled ? "Enabled" : "Disabled");

          return (
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                recTask === "Enabled"
                  ? "bg-[#e6f9ed] text-[#16a34a] border border-[#bbf7d0]"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {recTask}
            </span>
          );
        },
      },
      {
        id: "taskFreq",
        header: "Task Freq",
        width: 120,
        sortable: true,
        align: "center",
        cell: (clientItem) => {
          const svcSetting = (clientItem.serviceSettings || []).find(
            (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          const taskFreq = svcSetting?.frequency || service.frequency || "Monthly";
          return (
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                taskFreq === "Quarterly"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
              }`}
            >
              {taskFreq}
            </span>
          );
        },
      },
      {
        id: "start",
        header: "Start",
        width: 100,
        sortable: true,
        cell: (clientItem) => {
          const svcSetting = (clientItem.serviceSettings || []).find(
            (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          return (
            <span className="text-gray-600 dark:text-gray-300">
              {svcSetting?.start || "Day 1"}
            </span>
          );
        },
      },
      {
        id: "target",
        header: "Target",
        width: 100,
        sortable: true,
        cell: (clientItem) => {
          const svcSetting = (clientItem.serviceSettings || []).find(
            (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          return (
            <span className="text-gray-600 dark:text-gray-300">
              {svcSetting?.target || (service.tatDays ? `Day ${service.tatDays}` : "Day 5")}
            </span>
          );
        },
      },
      {
        id: "end",
        header: "End",
        width: 100,
        sortable: true,
        cell: (clientItem) => {
          const svcSetting = (clientItem.serviceSettings || []).find(
            (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          return (
            <span className="text-gray-600 dark:text-gray-300">
              {svcSetting?.end || (service.tatDays ? `Day ${service.tatDays + 2}` : "Day 10")}
            </span>
          );
        },
      },
      {
        id: "recInvoice",
        header: "Rec Invoice",
        width: 120,
        sortable: true,
        cell: (clientItem) => {
          const svcSetting = (clientItem.serviceSettings || []).find(
            (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          const recInvoice = svcSetting?.recInvoice || "Disabled";
          return (
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                recInvoice === "Enabled"
                  ? "bg-[#e6f9ed] text-[#16a34a] border border-[#bbf7d0]"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {recInvoice}
            </span>
          );
        },
      },
      {
        id: "amount",
        header: "Amount",
        width: 130,
        sortable: true,
        align: "right",
        cell: (clientItem) => {
          const svcSetting = (clientItem.serviceSettings || []).find(
            (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
          );
          const amount = svcSetting?.amount !== undefined ? svcSetting.amount : (service.professionalFee || 0);
          return (
            <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              {amount > 0
                ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—"}
            </span>
          );
        },
      },
    ],
    [service, pendingClientId, handleToggleClientService]
  );

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Clients ({totalItems})
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure recurring compliance schedules for individual clients.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => {
              setSelectedDeptFilter(e.target.value);
              setActivePage(1);
            }}
            className="h-8 px-2.5 text-xs bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-sm text-gray-800 dark:text-gray-200 focus:outline-none"
          >
            <option value="All departments">All departments</option>
            <option value="GST">GST</option>
            <option value="Income Tax">Income Tax</option>
            <option value="Accounts">Accounts</option>
          </select>

          {/* Search Input */}
          <div className="w-52">
            <Input
              size="sm"
              placeholder="Search clients..."
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setActivePage(1);
              }}
              leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
              onClear={() => {
                setClientSearch("");
                setActivePage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Reusable DataTable */}
      <DataTable<Client>
        columns={columns}
        data={displayClients}
        loading={isClientsLoading}
        getRowId={(c, idx) => c.id || (c as any)._id || String(idx)}
        emptyMessage="No clients found for this service."
        pagination={{
          currentPage: activePage,
          pageSize: 10,
          totalItems,
          onPageChange: setActivePage,
        }}
      />
    </div>
  );
};
