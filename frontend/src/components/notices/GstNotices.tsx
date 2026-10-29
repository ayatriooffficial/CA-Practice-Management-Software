"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, PenTool, Loader2 } from "lucide-react";
import { stageAndRedirectToPdfSigner } from "@/services/stageToPdfSigner";
import type { Notice, Client } from "@/types/notices";
import { NoticeTable, type ColumnDef, formatNoticeDate, getClientIdentifier } from "./NoticeTable";
import { StatusPill } from "@/components/common/StatusPill";
import { isOverdue, getOverdueDays } from "@/lib/dates";

export const GstNotices: React.FC = () => {
  const router = useRouter();
  const [stagingNoticeId, setStagingNoticeId] = useState<string | null>(null);

  const handleSignNoticeWithDsc = async (notice: Notice, client?: Client) => {
    setStagingNoticeId(notice.id);
    try {
      const pdfFile = notice.files?.find((f) => f.name.toLowerCase().endsWith(".pdf")) || notice.files?.[0];
      await stageAndRedirectToPdfSigner(router, {
        fileName: pdfFile?.name || `Notice_Reply_${notice.id}.pdf`,
        fileUrl: pdfFile?.url,
        clientId: client?.id || notice.clientId,
        clientName: client?.name,
      });
    } catch (err: any) {
      alert(err?.message || "Failed to stage notice file for DSC signing");
    } finally {
      setStagingNoticeId(null);
    };
  };
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
                {getClientIdentifier(client, "GST")}
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
        id: "type",
        header: "Type of Notice",
        defaultWidth: 130,
        render: (n: Notice) => (
          <span className="text-xs font-medium" style={{ color: "var(--text-main)" }}>
            {"type" in n ? n.type : "-"}
          </span>
        ),
      },
      {
        id: "description",
        header: "Description",
        defaultWidth: 200,
        render: (n: Notice) => (
          <span
            className="text-xs truncate max-w-[220px] block"
            style={{ color: "var(--text-muted)" }}
            title={n.description}
          >
            {n.description || "-"}
          </span>
        ),
      },
      {
        id: "dueDate",
        header: "Due Date",
        sortable: true,
        defaultWidth: 130,
        render: (n: Notice) => {
          if (!n.dueDate) {
            return <span style={{ color: "var(--text-placeholder)" }}>-</span>;
          }
          const overdue = isOverdue(n.dueDate);
          const days = getOverdueDays(n.dueDate);

          return (
            <div className="flex flex-col min-w-0">
              <span className="text-xs" style={{ color: "var(--text-main)" }}>
                {formatNoticeDate(n.dueDate)}
              </span>
              {overdue && days > 0 && (
                <span
                  className="text-[11px] font-semibold mt-0.5"
                  style={{ color: "var(--danger)" }}
                >
                  {days}d overdue
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "files",
        header: "Files",
        defaultWidth: 100,
        render: (n: Notice, client?: Client) => {
          if (n.files && n.files.length > 0) {
            const hasPdf = n.files.some((f) => f.name.toLowerCase().endsWith(".pdf"));
            return (
              <div className="flex items-center gap-1.5">
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
                {hasPdf && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSignNoticeWithDsc(n, client);
                    }}
                    disabled={stagingNoticeId === n.id}
                    className="p-1 rounded-none text-[#31719B] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                    title="Sign with DSC (PAdES)"
                  >
                    {stagingNoticeId === n.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#31719B]" />
                    ) : (
                      <PenTool className="w-3.5 h-3.5 text-[#31719B]" />
                    )}
                  </button>
                )}
              </div>
            );
          }
          return <span style={{ color: "var(--text-placeholder)" }}>-</span>;
        },
      },
      {
        id: "status",
        header: "Status",
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
      portal="GST"
      columns={columns}
      searchPlaceholder="Search by client, notice number, description..."
      defaultGroupBy="client"
    />
  );
};
