"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  ChevronRight,
  CornerDownRight,
  Crown,
  ExternalLink,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { Client } from "@/data/crmData";
import { groupApi, GroupRecord, GroupEntity } from "@/services/groupApi";
import { useAppDispatch } from "@/store/hooks";
import { setSelectedClient } from "@/store/features/clients/clientSlice";

interface ClientGroupTabProps {
  client: Client;
}

const getInitials = (name?: string) => {
  if (!name) return "GP";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const ClientGroupTab: React.FC<ClientGroupTabProps> = ({ client }) => {
  const dispatch = useAppDispatch();
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  const clientId = client.id || (client as any)._id?.toString();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    groupApi
      .listGroups({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data) {
          setGroups(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load groups for client:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  // Filter groups where this client is either a member or POC
  const clientGroups = useMemo(() => {
    return groups.filter((g) => {
      // Check POC match
      const pocId = typeof g.pocClientId === "string" ? g.pocClientId : (g.pocClientId as any)?.id || (g.pocClientId as any)?._id;
      if (pocId && String(pocId) === String(clientId)) return true;

      // Check member match in clientIds
      const isMember = (g.clientIds || []).some((c: any) => {
        const cid = typeof c === "string" ? c : c.id || c._id?.toString();
        return String(cid) === String(clientId);
      });
      if (isMember) return true;

      // Check member match in populated entities
      const isEntity = (g.entities || []).some((e: any) => {
        const eid = typeof e === "string" ? e : e.id || e._id?.toString();
        return String(eid) === String(clientId);
      });
      return isEntity;
    });
  }, [groups, clientId]);

  const toggleExpand = (gid: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-xs">
        <Loader2 className="w-6 h-6 animate-spin text-[#31719B] mx-auto mb-2" />
        <p className="text-xs text-gray-500 font-medium">Checking group memberships...</p>
      </div>
    );
  }

  if (clientGroups.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-8 shadow-xs text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-400">
          <FolderOpen size={24} />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          No Group Assignment
        </h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          {client.name} is currently an independent entity and is not assigned to any client group or family umbrella.
        </p>
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all shadow-xs cursor-pointer"
          style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
        >
          <span>Manage Groups Directory</span>
          <ExternalLink size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {clientGroups.map((grp) => {
        const pocId = typeof grp.pocClientId === "string" ? grp.pocClientId : (grp.pocClientId as any)?.id || (grp.pocClientId as any)?._id;
        const isClientPoc = String(pocId) === String(clientId);
        const isExpanded = expandedGroupIds.has(grp.id);

        const entitiesCount = grp.stats?.entitiesCount || (grp.entities?.length ?? grp.clientIds?.length ?? 0);
        const openTasks = grp.stats?.openTasksCount ?? 0;
        const readyToBill = grp.stats?.readyToBillCount ?? 0;
        const invoices = grp.stats?.invoicesCount ?? 0;
        const proformas = grp.stats?.proformasCount ?? 0;
        const outstanding = grp.stats?.outstandingAmount ?? 0;

        return (
          <div
            key={grp.id}
            className={`rounded-xl border shadow-xs overflow-hidden transition-all ${
              isClientPoc
                ? "border-purple-300 dark:border-purple-800/80 bg-white dark:bg-[#1e293b]"
                : "border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b]"
            }`}
          >
            {/* Top Status Banner */}
            <div
              className={`px-4 py-2.5 flex items-center justify-between border-b ${
                isClientPoc
                  ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900 text-purple-900 dark:text-purple-200"
                  : "bg-gray-50/70 dark:bg-slate-800/50 border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {isClientPoc ? (
                  <Crown className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500" />
                ) : (
                  <Users className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <span className="text-xs font-bold">
                  {isClientPoc ? "POC of Group: " : "Member of Group: "}
                  <span className="text-[#31719B] dark:text-[#93c5fd] font-extrabold">{grp.name}</span>
                </span>
                {isClientPoc && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                    Point of Contact
                  </span>
                )}
              </div>

              <Link
                href={`/groups/${grp.id}`}
                onClick={() => {
                  dispatch(setSelectedClient(null));
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("app:reset-view:client"));
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#31719B] dark:text-[#93c5fd] hover:underline"
              >
                <span>View Full Group Cockpit</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {/* Rich Group Table matching GroupListView */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#dde2e8] dark:border-[#334155] bg-gray-50/40 dark:bg-slate-800/40 text-gray-500 dark:text-gray-400 font-semibold">
                    <th className="py-2.5 px-3 w-8"></th>
                    <th className="py-2.5 px-3">Group Name</th>
                    <th className="py-2.5 px-3">Group ID</th>
                    <th className="py-2.5 px-3 text-center">Entities</th>
                    <th className="py-2.5 px-3">Point of Contact</th>
                    <th className="py-2.5 px-3 text-center">Open Tasks</th>
                    <th className="py-2.5 px-3 text-center">Ready to Bill</th>
                    <th className="py-2.5 px-3 text-center">Invoices</th>
                    <th className="py-2.5 px-3 text-center">Proformas</th>
                    <th className="py-2.5 px-3 text-right">Inv. Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(grp.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-transform cursor-pointer"
                        title={isExpanded ? "Collapse member entities" : "Expand member entities"}
                      >
                        <ChevronRight
                          size={14}
                          className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </button>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(grp.name)}
                        </div>
                        <Link
                          href={`/groups/${grp.id}`}
                          onClick={() => {
                            dispatch(setSelectedClient(null));
                            if (typeof window !== "undefined") {
                              window.dispatchEvent(new CustomEvent("app:reset-view:client"));
                            }
                          }}
                          className="font-bold text-gray-900 dark:text-white hover:text-[#31719B] hover:underline"
                        >
                          {grp.name}
                        </Link>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      {grp.groupId || "-"}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {entitiesCount} {entitiesCount === 1 ? "Entity" : "Entities"}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {isClientPoc ? (
                        <div className="flex items-center gap-1.5">
                          <Crown size={12} className="text-amber-500 fill-amber-500" />
                          <span className="font-semibold text-purple-700 dark:text-purple-300">
                            {client.name} (This Client)
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {grp.stats?.pocName || "No POC set"}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-gray-800 dark:text-slate-200">
                      {openTasks}
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                      {readyToBill}
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-gray-800 dark:text-slate-200">
                      {invoices}
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-gray-800 dark:text-slate-200">
                      {proformas}
                    </td>

                    <td className="py-3 px-3 text-right font-semibold text-rose-600 dark:text-rose-400 font-mono">
                      ₹{outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Expandable Sub-Rows: Member Entities */}
                  {isExpanded &&
                    (grp.entities || []).map((entity: GroupEntity) => {
                      const isSelf = String(entity.id || entity._id) === String(clientId);
                      const isEntityPoc = String(entity.id || entity._id) === String(pocId);

                      return (
                        <tr
                          key={entity.id}
                          className={`border-b text-xs transition-colors ${
                            isSelf
                              ? "bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900"
                              : "bg-gray-50/30 dark:bg-slate-900/30 border-gray-100 dark:border-slate-800/60"
                          }`}
                        >
                          <td className="py-2 px-3"></td>
                          <td className="py-2 px-3 pl-8" colSpan={3}>
                            <div className="flex items-center gap-2">
                              <CornerDownRight size={13} className="text-gray-400 shrink-0" />
                              <Link
                                href={`/client/${entity.id}`}
                                className={`font-semibold hover:underline truncate max-w-[220px] ${
                                  isSelf
                                    ? "text-purple-800 dark:text-purple-200 font-bold"
                                    : "text-gray-800 dark:text-slate-200 hover:text-[#31719B]"
                                }`}
                              >
                                {entity.name}
                              </Link>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                  Current Entity
                                </span>
                              )}
                              {isEntityPoc && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  <Crown size={9} className="fill-amber-500" />
                                  <span>POC</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2 px-3 text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                            {entity.mobile || "-"}
                          </td>

                          <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                            {entity.openTasksCount ?? 0}
                          </td>

                          <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                            {entity.readyToBillCount ?? 0}
                          </td>

                          <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                            {entity.invoicesCount ?? 0}
                          </td>

                          <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                            {entity.proformasCount ?? 0}
                          </td>

                          <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                            ₹{(entity.outstandingAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

