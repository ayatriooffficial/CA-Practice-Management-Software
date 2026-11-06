"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MoreVertical, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import { GroupRecord } from "@/services/groupApi";
import { groupApi } from "@/services/groupApi";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { TableActionDropdown } from "@/components/ui/TableActionDropdown";
import { usePermission } from "@/components/team/usePermission";

interface GroupEntitiesTabProps {
  group: GroupRecord;
  onRefresh: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const getInitials = (name?: string) => {
  if (!name) return "CL";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const GroupEntitiesTab: React.FC<GroupEntitiesTabProps> = ({
  group,
  onRefresh,
  showToast,
}) => {
  const { canDelete } = usePermission();
  const [clientToRemove, setClientToRemove] = useState<any | null>(null);
  const [updatingPocId, setUpdatingPocId] = useState<string | null>(null);

  const entities = group.entities || [];

  // Update POC radio selection
  const handleSelectPoc = async (entityId: string) => {
    try {
      setUpdatingPocId(entityId);
      await groupApi.updateGroupPoc(group.id, entityId);
      showToast("Point of Contact updated successfully", "success");
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to update POC", "error");
    } finally {
      setUpdatingPocId(null);
    }
  };

  // Remove from group
  const handleConfirmRemove = async () => {
    if (!clientToRemove) return;
    try {
      await groupApi.removeClientFromGroup(group.id, clientToRemove.id);
      showToast(`Removed "${clientToRemove.name}" from group`, "info");
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to remove client", "error");
    } finally {
      setClientToRemove(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Table Container (Image 2) */}
      <div className="w-full bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-none overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-slate-800/60 border-b border-[#dde2e8] dark:border-[#334155] text-gray-500 dark:text-gray-400 font-semibold select-none">
              <th className="py-2.5 px-3 w-12 text-center">POC</th>
              <th className="py-2.5 px-3 min-w-[200px]">Client</th>
              <th className="py-2.5 px-3 min-w-[140px]">Contact</th>
              <th className="py-2.5 px-3 min-w-[110px]">Mobile</th>
              <th className="py-2.5 px-3 min-w-[150px]">Business Entity</th>
              <th className="py-2.5 px-3 min-w-[130px]">GSTIN</th>
              <th className="py-2.5 px-3 min-w-[100px]">PAN</th>
              <th className="py-2.5 px-3 min-w-[90px]">Labels</th>
              <th className="py-2.5 px-3 min-w-[80px]">Status</th>
              <th className="py-2.5 px-3 min-w-[100px]">Created On</th>
              <th className="py-2.5 px-3 text-center w-14">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {entities.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  No entities in this group. Click "Edit" above to add clients.
                </td>
              </tr>
            ) : (
              entities.map((entity: any) => {
                const isPoc = group.pocClientId
                  ? group.pocClientId.toString() === entity.id
                  : false;

                const primaryContact =
                  (entity.contacts || []).find((c: any) => c.isPrimary) ||
                  (entity.contacts || [])[0] ||
                  null;

                const createdDateFormatted = entity.createdAt
                  ? new Date(entity.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "-";

                return (
                  <tr
                    key={entity.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* POC Radio Button */}
                    <td className="py-2.5 px-3 text-center">
                      {updatingPocId === entity.id ? (
                        <Loader2 size={13} className="animate-spin text-[#31719B] mx-auto" />
                      ) : (
                        <input
                          type="radio"
                          name="group_poc_entity"
                          checked={isPoc}
                          onChange={() => handleSelectPoc(entity.id)}
                          className="rounded-full text-[#31719B] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                          title="Designate this entity's primary contact as Group POC"
                        />
                      )}
                    </td>

                    {/* Client Avatar + Name Link + File No */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {getInitials(entity.name)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/client/${entity.id}`}
                            className="font-semibold text-[#31719B] hover:underline truncate block max-w-[180px]"
                            title={entity.name}
                          >
                            {entity.name}
                          </Link>
                          <span className="text-[10px] text-gray-400 font-mono block">
                            {entity.fileNo || "-"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact (Primary POC name of this entity) */}
                    <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 font-medium truncate max-w-[140px]">
                      {primaryContact ? primaryContact.name : entity.name}
                    </td>

                    {/* Mobile */}
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 font-mono">
                      {primaryContact?.mobile || entity.mobile || "-"}
                    </td>

                    {/* Business Entity (Constitution) */}
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                      {entity.type || "Private Limited Company"}
                    </td>

                    {/* GSTIN */}
                    <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400">
                      {entity.gstin || "-"}
                    </td>

                    {/* PAN */}
                    <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400">
                      {entity.pan || "-"}
                    </td>

                    {/* Labels */}
                    <td className="py-2.5 px-3 text-gray-400">-</td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {entity.status || (entity.active ? "Active" : "Inactive")}
                      </span>
                    </td>

                    {/* Created On */}
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                      {createdDateFormatted}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-2.5 px-3 text-center">
                      {canDelete("clients") ? (
                        <TableActionDropdown
                          align="right"
                          actions={[
                            {
                              label: "Remove from Group",
                              icon: Trash2,
                              variant: "danger",
                              onClick: () => setClientToRemove(entity),
                            },
                          ]}
                        />
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Remove Confirmation Dialog */}
      {clientToRemove && (
        <DiscardConfirmationModal
          isOpen={Boolean(clientToRemove)}
          onCancel={() => setClientToRemove(null)}
          onConfirm={handleConfirmRemove}
          title="Remove from Group"
          message={`Are you sure you want to remove "${clientToRemove.name}" from this group? The client will remain in the client directory.`}
          confirmText="Remove"
        />
      )}
    </div>
  );
};
