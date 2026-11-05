"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  X,
  Pencil,
  FileText,
  MoreVertical,
  Trash2,
  Building2,
  Users,
  Receipt,
  CheckSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { GroupRecord, groupApi } from "@/services/groupApi";
import { GroupEntitiesTab } from "./tabs/GroupEntitiesTab";
import { GroupContactsTab } from "./tabs/GroupContactsTab";
import { GroupInvoicesTab } from "./tabs/GroupInvoicesTab";
import { GroupTasksTab } from "./tabs/GroupTasksTab";
import { AddEditGroupModal } from "./AddEditGroupModal";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { usePermission } from "@/components/team/usePermission";

interface GroupDetailViewProps {
  groupId: string;
}

type GroupTabType = "entities" | "contacts" | "invoice" | "tasks";

const getInitials = (name?: string) => {
  if (!name) return "GP";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ groupId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams?.get("tab") as GroupTabType) || "entities";

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const { canAddEdit, canDelete } = usePermission();

  const [group, setGroup] = useState<GroupRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<GroupTabType>("entities");

  // Track loaded tabs for lazy loading
  const [loadedTabs, setLoadedTabs] = useState<Set<GroupTabType>>(new Set(["entities"]));

  // Modals & Menu
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Fetch Group details
  const fetchGroup = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await groupApi.getGroupById(groupId);
      if (res && res.data) {
        setGroup(res.data);
      } else {
        setError("Group not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load group details");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // Tab change with lazy loading
  const handleTabChange = (tab: GroupTabType) => {
    setActiveTab(tab);
    setLoadedTabs((prev) => new Set([...prev, tab]));
  };

  // Save edit handler
  const handleSaveEdit = async (data: any) => {
    try {
      await groupApi.updateGroup(groupId, data);
      setToast({ message: "Group updated successfully", type: "success" });
      fetchGroup();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update group", type: "error" });
      throw err;
    }
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    try {
      await groupApi.deleteGroup(groupId);
      router.push("/groups");
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete group", type: "error" });
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center p-8 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300">
        <Loader2 className="w-8 h-8 animate-spin text-[#31719B] mb-3" />
        <p className="text-xs font-semibold">Loading group cockpit...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center p-8 bg-white dark:bg-[#0f172a]">
        <div className="max-w-md w-full bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-[#dde2e8] dark:border-[#334155] text-center shadow-card space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Group Not Found</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {error || "The requested group does not exist or has been removed."}
          </p>
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-all"
            style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Groups</span>
          </Link>
        </div>
      </div>
    );
  }

  const entitiesCount = group.entities?.length || group.stats?.entitiesCount || 0;
  const pocName = group.poc?.name || group.stats?.pocName || "POC not set";

  return (
    <div className="w-full flex flex-col gap-4 min-h-[calc(100vh-var(--header-height))] bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] p-3 sm:p-5">
      {/* Toast */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Cockpit Header (Image 2) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#dde2e8] dark:border-[#334155]">
        {/* Left: Back button + Avatar + Group Name + Subtitle */}
        <div className="flex items-center gap-3">
          <Link
            href="/groups"
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Back to Groups"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
            {getInitials(group.name)}
          </div>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {group.name}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {entitiesCount} {entitiesCount === 1 ? "entity" : "entities"} · POC: {pocName}
            </p>
          </div>
        </div>

        {/* Right: Edit + Generate Invoice + 3-Dot (Delete) + Close (X) */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {canAddEdit("clients") && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg shadow-2xs hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Pencil size={13} className="text-gray-500" />
              <span>Edit</span>
            </button>
          )}

          {/* Generate Invoice primary button */}
          <Link
            href={`/invoice?groupId=${group.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg shadow-2xs transition-all hover:opacity-95 cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
          >
            <FileText size={13} />
            <span>Generate Invoice</span>
          </Link>

          {/* Three-dot Action Menu (Delete Group) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <MoreVertical size={16} />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-lg shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                {canDelete("clients") && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Delete Group</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Close (X) button */}
          <Link
            href="/groups"
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </Link>
        </div>
      </div>

      {/* Cockpit Tabs with dynamic counts (Image 2) */}
      <div className="border-b border-[#dde2e8] dark:border-[#334155] px-1">
        <nav className="flex items-center gap-6 overflow-x-auto select-none" aria-label="Group Cockpit Tabs">
          <button
            type="button"
            onClick={() => handleTabChange("entities")}
            className={`pb-2.5 text-xs font-semibold transition-colors relative cursor-pointer ${
              activeTab === "entities"
                ? "text-[#31719B] dark:text-[#93c5fd]"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <span>Entities & Master Data ({entitiesCount})</span>
            {activeTab === "entities" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#31719B] dark:bg-[#93c5fd]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("contacts")}
            className={`pb-2.5 text-xs font-semibold transition-colors relative cursor-pointer ${
              activeTab === "contacts"
                ? "text-[#31719B] dark:text-[#93c5fd]"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <span>Contacts</span>
            {activeTab === "contacts" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#31719B] dark:bg-[#93c5fd]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("invoice")}
            className={`pb-2.5 text-xs font-semibold transition-colors relative cursor-pointer ${
              activeTab === "invoice"
                ? "text-[#31719B] dark:text-[#93c5fd]"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <span>Invoice ({group.stats?.invoicesCount || 0})</span>
            {activeTab === "invoice" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#31719B] dark:bg-[#93c5fd]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("tasks")}
            className={`pb-2.5 text-xs font-semibold transition-colors relative cursor-pointer ${
              activeTab === "tasks"
                ? "text-[#31719B] dark:text-[#93c5fd]"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <span>Tasks ({group.stats?.openTasksCount || 0})</span>
            {activeTab === "tasks" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#31719B] dark:bg-[#93c5fd]" />
            )}
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="w-full pt-1">
        {activeTab === "entities" && (
          <GroupEntitiesTab
            group={group}
            onRefresh={fetchGroup}
            showToast={(msg, type) => setToast({ message: msg, type: type || "info" })}
          />
        )}

        {activeTab === "contacts" && loadedTabs.has("contacts") && (
          <GroupContactsTab groupId={group.id} />
        )}

        {activeTab === "invoice" && loadedTabs.has("invoice") && (
          <GroupInvoicesTab group={group} />
        )}

        {activeTab === "tasks" && loadedTabs.has("tasks") && (
          <GroupTasksTab group={group} />
        )}
      </div>

      {/* Edit Group Modal */}
      {isEditModalOpen && (
        <AddEditGroupModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdit}
          group={group}
        />
      )}

      {/* Delete Group Modal */}
      {isDeleteModalOpen && (
        <DiscardConfirmationModal
          isOpen={isDeleteModalOpen}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Group"
          message={`Are you sure you want to delete "${group.name}"? All member clients will be unlinked and preserved in your client list.`}
          confirmText="Delete Group"
        />
      )}
    </div>
  );
};
