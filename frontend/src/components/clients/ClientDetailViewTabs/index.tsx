"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { Client, ClientServiceSetting } from "@/data/crmData";
import { TaskItem } from "@/data/taskData";
import { ClientTabType } from "../ClientDetailView";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { ClientMasterTab } from "./ClientMasterTab";

const TabLoadingFallback = () => (
  <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-2">
    <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
    <span className="text-xs font-medium">Loading section...</span>
  </div>
);

const ClientServiceSettingsTab = dynamic(
  () => import("./ClientServiceSettingsTab").then((m) => m.ClientServiceSettingsTab),
  { ssr: false, loading: TabLoadingFallback }
);
const ClientDocumentsTab = dynamic(
  () => import("./ClientDocumentsTab").then((m) => m.ClientDocumentsTab),
  { ssr: false, loading: TabLoadingFallback }
);
const ClientDscTab = dynamic(
  () => import("./ClientDscTab").then((m) => m.ClientDscTab),
  { ssr: false, loading: TabLoadingFallback }
);
const ClientInvoicesTab = dynamic(
  () => import("./ClientInvoicesTab").then((m) => m.ClientInvoicesTab),
  { ssr: false, loading: TabLoadingFallback }
);
const ClientLedgerTab = dynamic(
  () => import("./ClientLedgerTab").then((m) => m.ClientLedgerTab),
  { ssr: false, loading: TabLoadingFallback }
);

export {
  ClientServiceSettingsTab,
  ClientDocumentsTab,
  ClientDscTab,
  ClientMasterTab,
  ClientInvoicesTab,
  ClientLedgerTab,
};

export interface ClientDetailViewTabsProps {
  activeTab: ClientTabType;
  client: Client;
  // Service Settings tab props
  serviceSearch: string;
  setServiceSearch: (v: string) => void;
  serviceFilter: "All" | "Enabled";
  setServiceFilter: (v: "All" | "Enabled") => void;
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
  handleSaveServiceOptions: (srv: ClientServiceSetting, keepDrawerOpen?: boolean) => Promise<void>;
  // License tab props
  setIsAddLicenseOpen: (v: boolean) => void;
  handleDeleteLicense: (id: string, name: string) => Promise<void>;
  onEditLicense?: (lic: any) => void;
  // Doc Movement props
  setIsAddDocInOutOpen: (v: boolean) => void;
  handleDeleteDocMovement: (id: string, name: string) => Promise<void>;
  onEditDocMovement?: (doc: any) => void;
  // DSC props
  setIsAddDscOpen: (v: boolean) => void;
  handleDeleteDsc: (id: string, name: string) => Promise<void>;
  // Tasks props
  clientTasks: TaskItem[];
  isLoadingTasks: boolean;
  onRefreshTasks?: () => void;
  // Passwords props
  revealedPasswords: Record<string, boolean>;
  setRevealedPasswords: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsAddPasswordOpen: (v: boolean) => void;
  handleDeletePassword: (id: string, portal: string) => Promise<void>;
  showToast: (msg: string) => void;
  // Notes props
  setIsAddNoteOpen: (v: boolean) => void;
  handleDeleteNote: (id: string) => Promise<void> | void;
  // Contact props
  handleDeleteContact?: (id: string, name: string) => Promise<void>;
  onClientUpdated?: (client: Client) => void;
  // Helpers
  getAvatarBadge?: (text: string, index: number) => React.ReactNode;
}

export const ClientDetailViewTabs: React.FC<ClientDetailViewTabsProps> = ({
  activeTab,
  client,
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
  setIsAddLicenseOpen,
  handleDeleteLicense,
  onEditLicense,
  setIsAddDocInOutOpen,
  handleDeleteDocMovement,
  onEditDocMovement,
  setIsAddDscOpen,
  handleDeleteDsc,
  clientTasks,
  isLoadingTasks,
  onRefreshTasks,
  revealedPasswords,
  setRevealedPasswords,
  setIsAddPasswordOpen,
  handleDeletePassword,
  showToast,
  setIsAddNoteOpen,
  handleDeleteNote,
  handleDeleteContact,
  onClientUpdated,
  getAvatarBadge,
}) => {
  switch (activeTab) {
    case "Service Settings":
      return (
        <ClientServiceSettingsTab
          serviceSearch={serviceSearch}
          setServiceSearch={setServiceSearch}
          serviceFilter={serviceFilter}
          setServiceFilter={setServiceFilter}
          allServices={allServices}
          filteredServices={filteredServices}
          groupedServices={groupedServices}
          collapsedCategories={collapsedCategories}
          toggleCategory={toggleCategory}
          expandedServiceId={expandedServiceId}
          setExpandedServiceId={setExpandedServiceId}
          editingService={editingService}
          setEditingService={setEditingService}
          isSavingServiceOptions={isSavingServiceOptions}
          isLoadingServices={isLoadingServices}
          handleToggleServiceCompliance={handleToggleServiceCompliance}
          handleToggleCategoryCompliance={handleToggleCategoryCompliance}
          handleSaveServiceOptions={handleSaveServiceOptions}
        />
      );



    case "Documents":
      return (
        <ClientDocumentsTab
          client={client}
          documents={client.documentsInOut || []}
          setIsAddDocInOutOpen={setIsAddDocInOutOpen}
          handleDeleteDocMovement={handleDeleteDocMovement}
          onEditDocMovement={onEditDocMovement}
          clientTasks={clientTasks}
          isLoadingTasks={isLoadingTasks}
          clientName={client.name}
          clientId={client.id}
          onRefreshTasks={onRefreshTasks}
        />
      );

    case "DSC":
      return (
        <ClientDscTab
          dscs={client.dscs || []}
          setIsAddDscOpen={setIsAddDscOpen}
          handleDeleteDsc={handleDeleteDsc}
        />
      );

    case "Master":
      return (
        <ClientMasterTab
          client={client}
          allServices={allServices}
          onClientUpdated={onClientUpdated}
          showToast={showToast}
          handleDeleteContact={handleDeleteContact}
          setIsAddNoteOpen={setIsAddNoteOpen}
          handleDeleteNote={handleDeleteNote}
          revealedPasswords={revealedPasswords}
          setRevealedPasswords={setRevealedPasswords}
          setIsAddPasswordOpen={setIsAddPasswordOpen}
          handleDeletePassword={handleDeletePassword}
          setIsAddLicenseOpen={setIsAddLicenseOpen}
          handleDeleteLicense={handleDeleteLicense}
          onEditLicense={onEditLicense}
        />
      );





    case "Invoices":
      return <ClientInvoicesTab client={client} showToast={showToast} />;

    case "Ledger":
      return <ClientLedgerTab client={client} showToast={showToast} />;


    default:
      return (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-8 shadow-card text-center space-y-3">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
          >
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {activeTab} Module
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {activeTab} records and statutory tracking configured for {client.name}.
          </p>
        </div>
      );
  }
};
