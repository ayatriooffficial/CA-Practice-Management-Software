"use client";

import React, { useMemo } from "react";
import { FileText, Plus } from "lucide-react";
import type { Notice, Client } from "@/types/notices";
import { NoticeTable, type ColumnDef, formatNoticeDate, getClientIdentifier } from "./NoticeTable";
import { StatusPill } from "@/components/common/StatusPill";

export const TdsNotices: React.FC = () => {
  const columns: ColumnDef[] = useMemo(
    () => [
      {
        id: "client",
        header: "Client",
        sortable: true,
        filterable: true,
        defaultWidth: 180,
        render: (_n: Notice, client?: Client) => {
          return (
            <div className="flex flex-col min-w-0">
              <span
                className="font-bold text-xs truncate max-w-[170px]"
                style={{ color: "var(--text-main)" }}
                title={client?.name}
              >
                {client?.name}
              </span>
              <span
                className="text-[11px] font-semibold tracking-wide uppercase mt-0.5"
                style={{ color: "var(--primary)" }}
              >
                {getClientIdentifier(client, "TDS")}
              </span>
            </div>
          );
        },
      },
      {
        id: "noticeNumber",
        header: "Notice Number",
        defaultWidth: 150,
        render: (n: Notice) => (
          <span className="font-medium text-xs tracking-tight" style={{ color: "var(--text-main)" }}>
            {n.noticeNumber}
          </span>
        ),
      },
      {
        id: "category",
        header: "Category",
        defaultWidth: 140,
        render: (n: Notice) => (
          <span
            className="text-xs truncate max-w-[180px] block font-medium"
            style={{ color: "var(--text-main)" }}
            title={"category" in n ? n.category : ""}
          >
            {"category" in n ? n.category : "-"}
          </span>
        ),
      },
      {
        id: "description",
        header: "Description",
        defaultWidth: 180,
        render: (n: Notice) => (
          <span
            className="text-xs truncate max-w-[200px] block"
            style={{ color: "var(--text-muted)" }}
            title={n.description}
          >
            {n.description || "-"}
          </span>
        ),
      },
      {
        id: "period",
        header: "Period",
        defaultWidth: 100,
        render: (n: Notice) => (
          <span className="text-xs font-medium" style={{ color: "var(--text-main)" }}>
            {"period" in n ? n.period : "-"}
          </span>
        ),
      },
      {
        id: "formType",
        header: "Form Type",
        defaultWidth: 110,
        render: (n: Notice) => (
          <span
            className="px-2 py-0.5 rounded text-[11px] font-semibold"
            style={{
              backgroundColor: "var(--bg-subtle)",
              color: "var(--text-main)",
            }}
          >
            {"formType" in n ? n.formType : "-"}
          </span>
        ),
      },
      {
        id: "files",
        header: "Files",
        defaultWidth: 80,
        render: (n: Notice) => {
          if (n.files && n.files.length > 0) {
            return (
              <div
                className="flex items-center gap-1 cursor-pointer"
                title={n.files.map((f) => f.name).join(", ")}
              >
                <FileText className="w-4 h-4" style={{ color: "var(--text-subtle)" }} />
                {n.files.length > 1 && (
                  <span className="text-[10px] font-bold" style={{ color: "var(--text-subtle)" }}>
                    {n.files.length}
                  </span>
                )}
              </div>
            );
          }
          return <span style={{ color: "var(--text-placeholder)" }}>-</span>;
        },
      },
      {
        id: "noticeDate",
        header: "Notice Date",
        sortable: true,
        defaultWidth: 120,
        render: (n: Notice) => (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {formatNoticeDate(n.portal === "IT" ? n.issuedOn : n.noticeDate)}
          </span>
        ),
      },
      {
        id: "portalStatus",
        header: "Portal Status",
        defaultWidth: 120,
        render: (n: Notice) => (
          <span className="text-xs font-medium" style={{ color: "var(--text-main)" }}>
            {"portalStatus" in n ? n.portalStatus : "-"}
          </span>
        ),
      },
      {
        id: "manualStatus",
        header: "Manual Status",
        filterable: true,
        defaultWidth: 140,
        render: (n: Notice) => {
          const status = n.portal === "GST" ? n.status : n.manualStatus;
          return <StatusPill status={status} />;
        },
      },
      {
        id: "syncedOn",
        header: "Synced On",
        defaultWidth: 120,
        render: (n: Notice) => (
          <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
            {formatNoticeDate(n.syncedAt)}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        defaultWidth: 110,
        render: (n: Notice) => {
          if (n.portal === "GST" && n.taskId) {
            return (
              <button
                type="button"
                className="text-xs font-semibold cursor-pointer hover:underline"
                style={{ color: "var(--primary)" }}
              >
                #{n.taskId}
              </button>
            );
          }
          return (
            <button
              type="button"
              className="text-xs font-semibold cursor-pointer hover:underline flex items-center gap-1"
              style={{ color: "var(--primary)" }}
            >
              <Plus className="w-3 h-3" />
              <span>Add Task</span>
            </button>
          );
        },
      },
    ],
    []
  );

  return (
    <NoticeTable
      portal="TDS"
      columns={columns}
      searchPlaceholder="Search by client, category, status..."
      defaultGroupBy="client"
    />
  );
};
