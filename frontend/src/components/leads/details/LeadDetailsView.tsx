"use client";

import React, { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Lead } from "@/data/crmData";
import { useLeadById, useUpdateLead, useDeleteLead, useLeadTasks } from "@/hooks/useLeadsQuery";
import { LeadDetailsHeader } from "./LeadDetailsHeader";
import { PipelineChevronBar } from "./PipelineChevronBar";
import { LeadScoreCard } from "./LeadScoreCard";
import { DealCard } from "./DealCard";
import { BusinessInfoCard } from "./BusinessInfoCard";
import { LeadTasksTab, QuotationTab, DetailNotesTab } from "./tabs";
import { Quotation } from "@/services/quotationApi";
import { Loader2 } from "lucide-react";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";

// Code-split heavy modals out of the initial tab render
const AddQuotationModal = dynamic(
  () => import("./quotation/AddQuotationModal").then((mod) => mod.AddQuotationModal),
  { ssr: false }
);

const QuotationViewModal = dynamic(
  () => import("./quotation/QuotationViewModal").then((mod) => mod.QuotationViewModal),
  { ssr: false }
);

const AddLeadTaskModal = dynamic(
  () => import("./tasks/AddLeadTaskModal").then((mod) => mod.AddLeadTaskModal),
  { ssr: false }
);

const EditLeadScoreModal = dynamic(
  () => import("./score/EditLeadScoreModal").then((mod) => mod.EditLeadScoreModal),
  { ssr: false }
);

const EditDealModal = dynamic(
  () => import("./deal/EditDealModal").then((mod) => mod.EditDealModal),
  { ssr: false }
);

export type LeadDetailTabType = "notes" | "quotation" | "tasks";

interface LeadDetailsViewProps {
  leadId: string;
  initialLead?: Lead;
  onClose: () => void;
  onEditLead: (lead: Lead) => void;
  onConvertLead: (lead: Lead) => void;
}

export const LeadDetailsView: React.FC<LeadDetailsViewProps> = ({
  leadId,
  initialLead,
  onClose,
  onEditLead,
  onConvertLead,
}) => {
  const { data: serverLead, isLoading } = useLeadById(leadId);
  const { data: tasks = [] } = useLeadTasks(leadId);
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();

  const activeLead: Lead = useMemo(() => {
    return serverLead || initialLead || ({} as Lead);
  }, [serverLead, initialLead]);

  // Real metric computations
  const followUpsCount = useMemo(() => {
    return tasks.filter((t: any) => t.status !== "Completed").length;
  }, [tasks]);

  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((t: any) => {
      if (t.status === "Completed") return false;
      if (t.status === "Overdue") return true;
      return t.taskDate && t.taskDate < today;
    }).length;
  }, [tasks]);

  const realDaysInStage = useMemo(() => {
    if (activeLead.daysInStage !== undefined && activeLead.daysInStage !== null && activeLead.daysInStage > 0) {
      return activeLead.daysInStage;
    }
    if (activeLead.createdAt) {
      const created = new Date(activeLead.createdAt).getTime();
      const diff = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    }
    return 0;
  }, [activeLead.daysInStage, activeLead.createdAt]);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<LeadDetailTabType>("tasks");

  // Modal states
  const [isAddQuotationOpen, setIsAddQuotationOpen] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [taskModalState, setTaskModalState] = useState<{ open: boolean; taskToEdit?: any }>({
    open: false,
  });
  const [isEditScoreOpen, setIsEditScoreOpen] = useState(false);
  const [isEditDealOpen, setIsEditDealOpen] = useState(false);

  // Handle stage change from chevron bar
  const handleSelectStage = useCallback(
    async (newStage: string) => {
      try {
        await updateMutation.mutateAsync({
          id: activeLead.id,
          data: { pipelineStage: newStage },
        });
      } catch (err: any) {
        alert(err.message || "Failed to update pipeline stage");
      }
    },
    [activeLead.id, updateMutation]
  );

  // Handle status update
  const handleStatusChange = useCallback(
    async (status: string) => {
      try {
        await updateMutation.mutateAsync({
          id: activeLead.id,
          data: { status },
        });
      } catch (err: any) {
        alert(err.message || "Failed to update lead status");
      }
    },
    [activeLead.id, updateMutation]
  );

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: "danger" | "primary";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Handle Lost Lead
  const handleLostLead = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: "Mark as Lost Lead?",
      message: `Are you sure you want to mark lead "${activeLead.fullName}" as Lost Lead?`,
      confirmText: "Mark as Lost",
      cancelText: "Cancel",
      confirmVariant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await handleStatusChange("dropped");
      },
    });
  }, [activeLead.fullName, handleStatusChange]);

  // Handle Delete Lead
  const handleDeleteLead = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: "Move to Trash?",
      message: `Are you sure you want to move lead "${activeLead.fullName}" to trash?`,
      confirmText: "Move to Trash",
      cancelText: "Cancel",
      confirmVariant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteMutation.mutateAsync(activeLead.id);
          onClose();
        } catch (err: any) {
          alert(err.message || "Failed to delete lead");
        }
      },
    });
  }, [activeLead.fullName, activeLead.id, deleteMutation, onClose]);

  if (isLoading && !serverLead && !initialLead) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center bg-white dark:bg-[#0f172a] rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
          <span className="text-xs text-gray-400">Loading lead profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f8fafc] dark:bg-[#0f172a] min-h-[calc(100vh-var(--header-height))] flex flex-col animate-in fade-in duration-200">
      {/* 1. Top Lead Details Header */}
      <LeadDetailsHeader
        lead={activeLead}
        onClose={onClose}
        onEdit={() => onEditLead(activeLead)}
        onConvert={() => onConvertLead(activeLead)}
        onLostLead={handleLostLead}
        onDeleteLead={handleDeleteLead}
        onStatusChange={handleStatusChange}
      />

      {/* 2. Interactive Chevron Pipeline Stages Bar */}
      <PipelineChevronBar
        currentStage={activeLead.pipelineStage || "new_lead"}
        onSelectStage={handleSelectStage}
        disabled={updateMutation.isPending}
      />

      {/* 3. Main Body: Left Info Cards + Right Tabs Area */}
      <div className="flex-1 p-2 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Left Sidebar (Columns 1-4) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Lead Score Card */}
          <LeadScoreCard
            score={activeLead.leadScore}
            pipelineStage={activeLead.pipelineStage || "new_lead"}
            daysInStage={realDaysInStage}
            followUpsCount={followUpsCount}
            overdueCount={overdueCount}
            onEditScore={() => setIsEditScoreOpen(true)}
          />

          {/* Deal Value Card */}
          <DealCard
            dealValue={activeLead.dealValue}
            onEditDeal={() => setIsEditDealOpen(true)}
          />

          {/* Business Info Card */}
          <BusinessInfoCard lead={activeLead} />
        </div>

        {/* Right Main Content (Columns 5-12) */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-5 shadow-sm space-y-5">
          {/* Navigation Tabs Header */}
          <div className="flex items-center space-x-6 border-b border-[#e2e8f0] dark:border-[#334155] text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`pb-3 relative transition-colors cursor-pointer ${activeTab === "notes"
                ? "text-[#31719B] dark:text-[#60a5fa]"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
            >
              <span>Detail Notes</span>
              {activeTab === "notes" && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("quotation")}
              className={`pb-3 relative transition-colors cursor-pointer ${activeTab === "quotation"
                ? "text-[#31719B] dark:text-[#60a5fa]"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
            >
              <span>Quotation</span>
              {activeTab === "quotation" && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`pb-3 relative transition-colors cursor-pointer ${activeTab === "tasks"
                ? "text-[#31719B] dark:text-[#60a5fa]"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
            >
              <span>Lead Tasks</span>
              {activeTab === "tasks" && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                />
              )}
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="pt-2">
            {activeTab === "tasks" && (
              <LeadTasksTab
                lead={activeLead}
                onOpenAddTask={() => setTaskModalState({ open: true })}
                onEditTask={(task) => setTaskModalState({ open: true, taskToEdit: task })}
              />
            )}

            {activeTab === "quotation" && (
              <QuotationTab
                lead={activeLead}
                onOpenAddQuotation={() => setIsAddQuotationOpen(true)}
                onViewQuotation={(q) => setViewingQuotation(q)}
              />
            )}

            {activeTab === "notes" && <DetailNotesTab lead={activeLead} />}
          </div>
        </div>
      </div>

      {/* Modals Container */}
      {isAddQuotationOpen && (
        <AddQuotationModal
          lead={activeLead}
          onClose={() => setIsAddQuotationOpen(false)}
        />
      )}

      {viewingQuotation && (
        <QuotationViewModal
          quotation={viewingQuotation}
          lead={activeLead}
          onClose={() => setViewingQuotation(null)}
        />
      )}

      {taskModalState.open && (
        <AddLeadTaskModal
          lead={activeLead}
          taskToEdit={taskModalState.taskToEdit}
          onClose={() => setTaskModalState({ open: false })}
        />
      )}

      {isEditScoreOpen && (
        <EditLeadScoreModal
          lead={activeLead}
          onClose={() => setIsEditScoreOpen(false)}
        />
      )}

      {isEditDealOpen && (
        <EditDealModal
          lead={activeLead}
          onClose={() => setIsEditDealOpen(false)}
        />
      )}

      {/* Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
