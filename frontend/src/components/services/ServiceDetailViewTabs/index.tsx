"use client";

import React from "react";
import { Service, ServiceSubTask, ServiceChecklistItem, ServiceDocumentRequestItem } from "@/data/serviceData";
import { Client } from "@/data/crmData";

import { ServiceSubTasksTab } from "./ServiceSubTasksTab";
import { ServiceChecklistTab } from "./ServiceChecklistTab";
import { ServiceDocumentRequestTab } from "./ServiceDocumentRequestTab";
import { ServiceClientsTab } from "./ServiceClientsTab";
import { ServiceSopTab } from "./ServiceSopTab";
import { ServiceOverviewTab } from "./ServiceOverviewTab";
import { AddSubTaskModal } from "./AddSubTaskModal";

export {
  ServiceSubTasksTab,
  ServiceChecklistTab,
  ServiceDocumentRequestTab,
  ServiceClientsTab,
  ServiceSopTab,
  ServiceOverviewTab,
  AddSubTaskModal,
};

export type ServiceTabType =
  | "Overview"
  | "SOP"
  | "Sub Tasks"
  | "Checklist"
  | "Document Request"
  | "Clients";

export interface ServiceDetailViewTabsProps {
  activeTab: ServiceTabType;
  service: Service;
  // Subtasks props
  subTasks: ServiceSubTask[];
  handleSyncToTasks: () => Promise<void>;
  isSyncing: boolean;
  setIsAddSubTaskOpen: (open: boolean) => void;
  handleDeleteSubTask: (id: string) => Promise<void>;
  // Checklist props
  checklist: ServiceChecklistItem[];
  isAddChecklistInline: boolean;
  setIsAddChecklistInline: (open: boolean) => void;
  checklistTitle: string;
  setChecklistTitle: (val: string) => void;
  handleAddChecklist: () => Promise<void>;
  handleDeleteChecklist: (id: string) => Promise<void>;
  // Document Requests props
  documentRequests: ServiceDocumentRequestItem[];
  isAddDocInline: boolean;
  setIsAddDocInline: (open: boolean) => void;
  docTitle: string;
  setDocTitle: (val: string) => void;
  docDescription: string;
  setDocDescription: (val: string) => void;
  handleAddDocumentRequest: () => Promise<void>;
  handleDeleteDocumentRequest: (id: string) => Promise<void>;
  // Clients props
  clients: Client[];
  filteredClients: Client[];
  clientSearch: string;
  setClientSearch: (val: string) => void;
  selectedDeptFilter: string;
  setSelectedDeptFilter: (val: string) => void;
  isClientsLoading: boolean;
  handleToggleClientService: (clientItem: Client, nextVal: boolean) => Promise<void>;
  pendingClientId?: string | null;
  // SOP props
  sopContent: string;
  setSopContent: (val: string) => void;
  handleSaveSop: (structured?: any) => Promise<void>;
  isSavingSop: boolean;
  // Common Toast
  showToast: (msg: string) => void;
}

export const ServiceDetailViewTabs: React.FC<ServiceDetailViewTabsProps> = ({
  activeTab,
  service,
  subTasks,
  handleSyncToTasks,
  isSyncing,
  setIsAddSubTaskOpen,
  handleDeleteSubTask,
  checklist,
  isAddChecklistInline,
  setIsAddChecklistInline,
  checklistTitle,
  setChecklistTitle,
  handleAddChecklist,
  handleDeleteChecklist,
  documentRequests,
  isAddDocInline,
  setIsAddDocInline,
  docTitle,
  setDocTitle,
  docDescription,
  setDocDescription,
  handleAddDocumentRequest,
  handleDeleteDocumentRequest,
  clients,
  filteredClients,
  clientSearch,
  setClientSearch,
  selectedDeptFilter,
  setSelectedDeptFilter,
  isClientsLoading,
  handleToggleClientService,
  pendingClientId,
  sopContent,
  setSopContent,
  handleSaveSop,
  isSavingSop,
  showToast,
}) => {
  switch (activeTab) {
    case "Sub Tasks":
      return (
        <ServiceSubTasksTab
          subTasks={subTasks}
          handleSyncToTasks={handleSyncToTasks}
          isSyncing={isSyncing}
          setIsAddSubTaskOpen={setIsAddSubTaskOpen}
          handleDeleteSubTask={handleDeleteSubTask}
          showToast={showToast}
        />
      );

    case "Checklist":
      return (
        <ServiceChecklistTab
          checklist={checklist}
          isAddChecklistInline={isAddChecklistInline}
          setIsAddChecklistInline={setIsAddChecklistInline}
          checklistTitle={checklistTitle}
          setChecklistTitle={setChecklistTitle}
          handleAddChecklist={handleAddChecklist}
          handleDeleteChecklist={handleDeleteChecklist}
          handleSyncToTasks={handleSyncToTasks}
          isSyncing={isSyncing}
          showToast={showToast}
        />
      );

    case "Document Request":
      return (
        <ServiceDocumentRequestTab
          documentRequests={documentRequests}
          isAddDocInline={isAddDocInline}
          setIsAddDocInline={setIsAddDocInline}
          docTitle={docTitle}
          setDocTitle={setDocTitle}
          docDescription={docDescription}
          setDocDescription={setDocDescription}
          handleAddDocumentRequest={handleAddDocumentRequest}
          handleDeleteDocumentRequest={handleDeleteDocumentRequest}
          handleSyncToTasks={handleSyncToTasks}
          isSyncing={isSyncing}
          showToast={showToast}
        />
      );

    case "Clients":
      return (
        <ServiceClientsTab
          clients={clients}
          filteredClients={filteredClients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          selectedDeptFilter={selectedDeptFilter}
          setSelectedDeptFilter={setSelectedDeptFilter}
          isClientsLoading={isClientsLoading}
          service={service}
          handleToggleClientService={handleToggleClientService}
          pendingClientId={pendingClientId}
        />
      );

    case "SOP":
      return (
        <ServiceSopTab
          service={service}
          sopContent={sopContent}
          setSopContent={setSopContent}
          handleSaveSop={handleSaveSop}
          isSavingSop={isSavingSop}
        />
      );

    case "Overview":
      return <ServiceOverviewTab service={service} />;

    default:
      return null;
  }
};
