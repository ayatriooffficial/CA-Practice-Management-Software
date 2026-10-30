"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Filter, Paperclip, FileText, PenTool, Loader2 } from "lucide-react";
import { stageAndRedirectToPdfSigner } from "@/services/stageToPdfSigner";
import type {
  ComplianceGridRow,
  ComplianceCellStatus,
  ComplianceEntry,
  Frequency,
} from "@/types/compliance";
import type { Client } from "@/types/notices";
import { getComplianceGrid, setEntryStatus } from "@/services/complianceApi";
import { getClients } from "@/services/noticeApi";
import { isOverdue } from "@/lib/dates";
import { ColumnResizer } from "@/components/ui/ColumnResizer";
import { useResizableColumns } from "@/hooks/useResizableColumns";

export interface ComplianceGridProps {
  categoryId?: string;
  fy?: string;
  frequency?: string;
  search?: string;
  portal?: string;
  isAuto?: boolean;
  clientId?: string;
}

interface ClientGroup {
  key: string;
  clientId: string;
  clientName: string;
  identifier?: string;
  state?: string;
  rows: ComplianceGridRow[];
}

function parseStartYear(fyStr?: string): number {
  if (!fyStr) return 2025;
  const match = fyStr.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : 2025;
}

function normalizeFyParam(fyStr?: string): string {
  const startYr = parseStartYear(fyStr);
  const endYrShort = String(startYr + 1).slice(-2);
  return `${startYr}-${endYrShort}`;
}

function formatFormLabel(item: ComplianceGridRow["item"]): string {
  const code = (item.formCode || "").toUpperCase();
  const label = item.label || "";
  if (label.toLowerCase().includes("return") || label.includes("(")) return label;
  if (code === "ITR1" || label === "ITR-1") return "ITR-1 Return";
  if (code === "ITR2" || label === "ITR-2") return "ITR-2 Return";
  if (code === "ITR3" || label === "ITR-3") return "ITR-3 (Non - Audit Assessee)";
  return label || item.formCode || "-";
}

export const ComplianceGrid: React.FC<ComplianceGridProps> = ({
  categoryId = "cat-it",
  fy = "2025-2026",
  frequency = "all",
  search = "",
  portal,
  isAuto = true,
  clientId,
}) => {
  const [rows, setRows] = useState<ComplianceGridRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();
  const [stagingComplianceKey, setStagingComplianceKey] = useState<string | null>(null);

  const handleSignComplianceDoc = async (
    clientName: string,
    clientId: string,
    item: any,
    periodKey: string,
    entry?: ComplianceEntry
  ) => {
    const key = `${clientName}-${periodKey}`;
    setStagingComplianceKey(key);
    try {
      const safeForm = item.formCode || item.label || item.name || "Filing";
      const safeName = `${safeForm}_${periodKey}_${clientName.replace(/\s+/g, "_")}.pdf`;
      await stageAndRedirectToPdfSigner(router, {
        fileName: safeName,
        clientId,
        clientName,
        fileUrl: (entry as any)?.documentUrl || (entry as any)?.challanUrl,
      });
    } catch (err: any) {
      alert(err?.message || "Failed to stage compliance filing for DSC signing");
    } finally {
      setStagingComplianceKey(null);
    }
  };

  const startYear = parseStartYear(fy);
  const endYear = startYear + 1;
  const normalizedFy = normalizeFyParam(fy);

  const isIncomeTax = useMemo(() => {
    return (
      portal === "IT" ||
      categoryId === "cat-it" ||
      categoryId.toLowerCase().includes("income tax") ||
      categoryId.toLowerCase() === "it"
    );
  }, [portal, categoryId]);

  const apiFrequency = useMemo(() => {
    if (!frequency || frequency.toLowerCase() === "all") return "ALL";
    const clean = frequency.toLowerCase().replace("-", "_");
    return clean as Frequency;
  }, [frequency]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getComplianceGrid({
        categoryId,
        fy: normalizedFy,
        frequency: apiFrequency,
        search: search.trim() || undefined,
      }),
      getClients(),
    ])
      .then(([gridRes, clientsRes]) => {
        if (!mounted) return;
        const fetchedRows = gridRes.rows || [];
        setRows(clientId ? fetchedRows.filter((r) => r.clientId === clientId) : fetchedRows);
        setClients(clientsRes.data || []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [categoryId, normalizedFy, apiFrequency, search, clientId]);

  const clientMap = useMemo(() => {
    return new Map(clients.map((c) => [c.id, c]));
  }, [clients]);

  const isYearly = useMemo(() => {
    return frequency.toLowerCase() === "yearly";
  }, [frequency]);

  const { periodColumns, groupedHeaderLabel } = useMemo(() => {
    const freqLower = frequency.toLowerCase();
    const isQuarterly = freqLower === "quarterly";
    const isHalfYearly = freqLower === "half_yearly" || freqLower === "half-yearly";
    const isAnnual = freqLower === "yearly";
    const isMonthly = freqLower === "monthly";

    const monthlyCols = [
      { key: "M04", label: `Apr ${startYear}` },
      { key: "M05", label: `May ${startYear}` },
      { key: "M06", label: `Jun ${startYear}` },
      { key: "M07", label: `Jul ${startYear}` },
      { key: "M08", label: `Aug ${startYear}` },
      { key: "M09", label: `Sep ${startYear}` },
      { key: "M10", label: `Oct ${startYear}` },
      { key: "M11", label: `Nov ${startYear}` },
      { key: "M12", label: `Dec ${startYear}` },
      { key: "M01", label: `Jan ${endYear}` },
      { key: "M02", label: `Feb ${endYear}` },
      { key: "M03", label: `Mar ${endYear}` },
    ];

    const quarterlyCols = [
      { key: "Q1", label: "Q1" },
      { key: "Q2", label: "Q2" },
      { key: "Q3", label: "Q3" },
      { key: "Q4", label: "Q4" },
    ];

    const halfYearlyCols = [
      { key: "H1", label: "H1" },
      { key: "H2", label: "H2" },
    ];

    const annualCols = [
      { key: "ANNUAL", label: `${startYear}-${String(endYear).slice(-2)}` },
    ];

    if (isAnnual) {
      return {
        periodColumns: annualCols,
        groupedHeaderLabel: "Annual",
      };
    }

    if (isQuarterly) {
      return {
        periodColumns: quarterlyCols,
        groupedHeaderLabel: "Quarterly",
      };
    }

    if (isHalfYearly) {
      return {
        periodColumns: halfYearlyCols,
        groupedHeaderLabel: "Half-Yearly",
      };
    }

    if (isMonthly) {
      return {
        periodColumns: monthlyCols,
        groupedHeaderLabel: "Monthly",
      };
    }

    // frequency === "all"
    const rowFrequencies = new Set<string>();
    rows.forEach((r) => {
      if (r.item?.frequency) rowFrequencies.add(r.item.frequency.toLowerCase());
    });

    if (rowFrequencies.size === 1) {
      if (rowFrequencies.has("yearly")) {
        return { periodColumns: annualCols, groupedHeaderLabel: "Annual" };
      }
      if (rowFrequencies.has("quarterly")) {
        return { periodColumns: quarterlyCols, groupedHeaderLabel: "Quarterly" };
      }
      if (rowFrequencies.has("half_yearly") || rowFrequencies.has("half-yearly")) {
        return { periodColumns: halfYearlyCols, groupedHeaderLabel: "Half-Yearly" };
      }
      return { periodColumns: monthlyCols, groupedHeaderLabel: "Monthly" };
    }

    if (rowFrequencies.size > 1) {
      const combined: { key: string; label: string }[] = [];
      if (rowFrequencies.has("monthly")) combined.push(...monthlyCols);
      if (rowFrequencies.has("quarterly")) combined.push(...quarterlyCols);
      if (rowFrequencies.has("half_yearly") || rowFrequencies.has("half-yearly")) combined.push(...halfYearlyCols);
      if (rowFrequencies.has("yearly")) combined.push(...annualCols);
      return {
        periodColumns: combined,
        groupedHeaderLabel: "All Periods",
      };
    }

    // Default if no rows present yet:
    if (isIncomeTax) {
      return { periodColumns: annualCols, groupedHeaderLabel: "Annual" };
    }
    return {
      periodColumns: monthlyCols,
      groupedHeaderLabel: "Monthly",
    };
  }, [frequency, rows, isIncomeTax, startYear, endYear]);

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {
      clients: 240,
      secondCol: 180,
    };
    periodColumns.forEach((c) => {
      widths[c.key] = 120;
    });
    return widths;
  }, [periodColumns]);

  const {
    getColumnWidth,
    handleResizeStart,
    resizingKey,
    resetColumnWidth,
  } = useResizableColumns({
    storageKey: `compliance_grid_cols_${categoryId}`,
    initialWidths,
    minWidth: 70,
    maxWidth: 400,
  });

  const clientGroups = useMemo(() => {
    const groups: ClientGroup[] = [];
    const groupMap = new Map<string, ClientGroup>();

    for (const r of rows) {
      const client = clientMap.get(r.clientId);
      const name = r.clientName || client?.name || "Unknown Client";

      let idVal = r.item.identifier;
      if (!idVal && client) {
        if (isIncomeTax) {
          idVal = client.identifiers?.pan;
        } else if (portal === "GST" || categoryId === "cat-gst") {
          idVal = client.identifiers?.gstin;
        } else if (portal === "TDS" || categoryId === "cat-tds") {
          idVal = client.identifiers?.tan;
        }
        idVal =
          idVal ||
          client.identifiers?.pan ||
          client.identifiers?.gstin ||
          client.identifiers?.tan;
      }

      const st = r.item.state || client?.state || "Karnataka";
      const groupKey = `${r.clientId}__${idVal || ""}__${st}`;

      let group = groupMap.get(groupKey);
      if (!group) {
        group = {
          key: groupKey,
          clientId: r.clientId,
          clientName: name,
          identifier: idVal,
          state: st,
          rows: [],
        };
        groupMap.set(groupKey, group);
        groups.push(group);
      }
      group.rows.push(r);
    }

    return groups;
  }, [rows, clientMap, portal, categoryId, isIncomeTax]);

  const clientCount = clientGroups.length;

  const isAllSelected =
    clientGroups.length > 0 &&
    clientGroups.every((g) => selectedClients.has(g.clientId));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(clientGroups.map((g) => g.clientId)));
    }
  };

  const handleToggleSelectClient = (cId: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(cId)) {
        next.delete(cId);
      } else {
        next.add(cId);
      }
      return next;
    });
  };

  const secondColHeader = useMemo(() => {
    if (isIncomeTax) return "Form";
    if (portal === "TDS" || categoryId === "cat-tds" || categoryId.toLowerCase().includes("tds")) return "Type";
    if (portal === "GST" || categoryId === "cat-gst" || categoryId.toLowerCase().includes("gst")) return "Return";
    return "Form";
  }, [isIncomeTax, portal, categoryId]);

  const getItemLabelColor = (item: ComplianceGridRow["item"]) => {
    const isTds = portal === "TDS" || categoryId === "cat-tds";
    if (!isTds) return "var(--text-main)";

    const kind =
      item.kind ||
      (item.label.toLowerCase().includes("payment")
        ? "payment"
        : item.label.toLowerCase().includes("certificate")
        ? "certificate"
        : "return");

    if (kind === "payment") return "var(--primary)";
    if (kind === "return") return "var(--badge-addon-text)";
    if (kind === "certificate") return "var(--banner-text)";
    return "var(--text-main)";
  };

  const evaluateCell = (
    cellData?: { status: ComplianceCellStatus; entry?: ComplianceEntry }
  ): { status: ComplianceCellStatus; hasDocs: boolean } => {
    if (!cellData) {
      return { status: "BLANK", hasDocs: false };
    }
    const { entry, status: directStatus } = cellData;
    if (!entry && (!directStatus || directStatus === "BLANK")) {
      return { status: "BLANK", hasDocs: false };
    }
    let computedStatus: ComplianceCellStatus = directStatus || "PENDING";
    if (entry) {
      if (entry.filedOn) {
        computedStatus = "FILED";
      } else if (entry.dueDate && isOverdue(entry.dueDate)) {
        computedStatus = "MISSED";
      } else if (entry.statusOverride) {
        computedStatus = entry.statusOverride.toUpperCase() as ComplianceCellStatus;
      } else {
        computedStatus = "PENDING";
      }
    }

    const hasDocs = Boolean(entry && entry.documents && entry.documents.length > 0);
    return { status: computedStatus, hasDocs };
  };

  const handleCellClick = async (
    rowItem: ComplianceGridRow["item"],
    colKey: string,
    currentStatus: ComplianceCellStatus,
    entry?: ComplianceEntry
  ) => {
    if (isAuto) return;

    const nextStatus: ComplianceCellStatus =
      currentStatus === "PENDING"
        ? "FILED"
        : currentStatus === "FILED"
        ? "MISSED"
        : "PENDING";

    const targetId = entry?.id || `${rowItem.id}_${colKey}`;
    const updatedEntry = await setEntryStatus(targetId, nextStatus, `FY ${startYear}-${endYear}`);

    if (updatedEntry) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.item.id === rowItem.id) {
            return {
              ...r,
              cells: {
                ...r.cells,
                [colKey]: {
                  status: nextStatus,
                  entry: updatedEntry,
                },
              },
            };
          }
          return r;
        })
      );
    }
  };

  if (!loading && rows.length === 0) {
    if (error) {
      return (
        <div className="p-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          <p>Unable to load compliance data: {error.message}</p>
        </div>
      );
    }

    return (
      <div
        className="flex-1 border rounded-lg flex flex-col items-center justify-center p-12 text-center"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <FileText
          className="w-10 h-10 mb-3"
          style={{ color: "var(--text-subtle)" }}
        />
        <h3
          className="text-sm font-semibold mb-1"
          style={{ color: "var(--text-main)" }}
        >
          No compliance items found
        </h3>
        <p
          className="text-xs max-w-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No records matching the selected category, financial year, frequency, or search query.
        </p>
      </div>
    );
  }

  const clientsWidth = getColumnWidth("clients");
  const secondColWidth = getColumnWidth("secondCol");

  return (
    <div
      className="w-full flex-1 overflow-auto border rounded-lg max-h-[calc(100vh-210px)] shadow-2xs"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-main)",
      }}
    >
      <table className="w-full text-left border-collapse border-spacing-0">
        <thead>
          <tr>
            <th
              rowSpan={2}
              className="sticky left-0 top-0 z-30 px-4 py-2.5 text-xs font-semibold border-b border-r select-none"
              style={{
                width: clientsWidth,
                minWidth: clientsWidth,
                maxWidth: clientsWidth,
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Select all clients"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded cursor-pointer"
                />
                <span className="whitespace-nowrap font-bold">
                  Clients ({clientCount})
                </span>
                <Filter
                  className="w-3.5 h-3.5 ml-auto shrink-0"
                  style={{ color: "var(--text-subtle)" }}
                />
              </div>
              <ColumnResizer
                onMouseDown={(e) => handleResizeStart("clients", e)}
                onDoubleClick={() => resetColumnWidth("clients")}
                isResizing={resizingKey === "clients"}
              />
            </th>

            <th
              rowSpan={2}
              className="sticky top-0 z-30 px-4 py-2.5 text-xs font-semibold border-b border-r select-none"
              style={{
                left: clientsWidth,
                width: secondColWidth,
                minWidth: secondColWidth,
                maxWidth: secondColWidth,
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{secondColHeader}</span>
                <Filter
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: "var(--text-subtle)" }}
                />
              </div>
              <ColumnResizer
                onMouseDown={(e) => handleResizeStart("secondCol", e)}
                onDoubleClick={() => resetColumnWidth("secondCol")}
                isResizing={resizingKey === "secondCol"}
              />
            </th>

            <th
              colSpan={periodColumns.length}
              className="sticky top-0 z-20 px-4 py-1.5 text-center text-xs font-semibold border-b tracking-wide"
              style={{
                backgroundColor: isYearly ? "var(--badge-new-bg)" : "var(--bg-subtle)",
                borderColor: "var(--border-main)",
                color: isYearly ? "var(--badge-new-text)" : "var(--text-main)",
              }}
            >
              {groupedHeaderLabel}
            </th>
          </tr>

          <tr>
            {periodColumns.map((col) => {
              const width = getColumnWidth(col.key);
              return (
                <th
                  key={col.key}
                  className="relative sticky top-[29px] z-20 px-3 py-2 text-center text-xs font-semibold border-b border-r last:border-r-0 whitespace-nowrap"
                  style={{
                    width,
                    minWidth: width,
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-main)",
                    color: "var(--text-muted)",
                  }}
                >
                  <span className="pr-2">{col.label}</span>
                  <ColumnResizer
                    onMouseDown={(e) => handleResizeStart(col.key, e)}
                    onDoubleClick={() => resetColumnWidth(col.key)}
                    isResizing={resizingKey === col.key}
                  />
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {clientGroups.map((group) => {
            const isGroupSelected = selectedClients.has(group.clientId);
            const totalGroupRows = group.rows.length;

            return group.rows.map((r, rowIdx) => {
              const isFirstRow = rowIdx === 0;
              const itemLabelColor = getItemLabelColor(r.item);
              const formattedLabel = formatFormLabel(r.item);

              return (
                <tr
                  key={`${group.key}__${r.item.id}`}
                  className="hover:opacity-95 transition-colors"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                  }}
                >
                  {isFirstRow && (
                    <td
                      rowSpan={totalGroupRows}
                      className="sticky left-0 z-10 px-4 py-3 align-top border-b border-r"
                      style={{
                        width: clientsWidth,
                        minWidth: clientsWidth,
                        maxWidth: clientsWidth,
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-main)",
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Select client ${group.clientName}`}
                          checked={isGroupSelected}
                          onChange={() =>
                            handleToggleSelectClient(group.clientId)
                          }
                          className="mt-0.5 rounded cursor-pointer shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span
                            className="font-bold text-xs truncate max-w-[180px]"
                            style={{ color: "var(--text-main)" }}
                            title={group.clientName}
                          >
                            {group.clientName}
                          </span>
                          {group.identifier && (
                            <span
                              className="text-[11px] font-semibold tracking-wide truncate max-w-[180px] cursor-pointer hover:underline mt-0.5"
                              style={{ color: "var(--primary)" }}
                              title={group.identifier}
                            >
                              {group.identifier}
                            </span>
                          )}
                          {group.state && (
                            <span
                              className="text-[10px] mt-0.5"
                              style={{ color: "var(--text-subtle)" }}
                            >
                              {group.state}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  )}

                  <td
                    className="sticky z-10 px-4 py-2.5 border-b border-r align-middle"
                    style={{
                      left: clientsWidth,
                      width: secondColWidth,
                      minWidth: secondColWidth,
                      maxWidth: secondColWidth,
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-main)",
                    }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: itemLabelColor }}
                        title={formattedLabel}
                      >
                        {formattedLabel}
                      </span>
                    </div>
                  </td>

                  {periodColumns.map((col) => {
                    const width = getColumnWidth(col.key);
                    const cellData = r.cells[col.key];
                    const { status, hasDocs } = evaluateCell(cellData);

                    let badgeColor = "var(--text-subtle)";
                    let badgeBg = "var(--bg-subtle)";
                    let badgeBorder = "var(--border-main)";

                    if (status === "FILED") {
                      badgeColor = "var(--badge-new-text)";
                      badgeBg = "var(--badge-new-bg)";
                      badgeBorder = "var(--badge-new-border)";
                    } else if (status === "MISSED") {
                      badgeColor = "var(--danger)";
                      badgeBg = "var(--credits-bg)";
                      badgeBorder = "var(--credits-border)";
                    } else if (status === "PENDING") {
                      badgeColor = "var(--banner-text)";
                      badgeBg = "var(--banner-bg)";
                      badgeBorder = "var(--banner-border)";
                    }

                    return (
                      <td
                        key={col.key}
                        onClick={() =>
                          handleCellClick(
                            r.item,
                            col.key,
                            status,
                            cellData?.entry
                          )
                        }
                        className={`px-3 py-2 text-center border-b border-r last:border-r-0 align-middle ${
                          !isAuto ? "cursor-pointer hover:opacity-80" : ""
                        }`}
                        style={{
                          width,
                          minWidth: width,
                          borderColor: "var(--border-main)",
                        }}
                      >
                        {status === "BLANK" ? (
                          <span style={{ color: "var(--text-placeholder)" }}>-</span>
                        ) : (
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <span
                              className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wider"
                              style={{
                                color: badgeColor,
                                backgroundColor: badgeBg,
                                borderColor: badgeBorder,
                              }}
                            >
                              {status === "PENDING" ? "PENDI..." : status}
                            </span>
                            {hasDocs && (
                              <div className="inline-flex items-center gap-1">
                                <Paperclip
                                  className="w-3.5 h-3.5 shrink-0"
                                  style={{ color: "var(--text-subtle)" }}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSignComplianceDoc(group.clientName, group.clientId, r.item, col.key, cellData?.entry);
                                  }}
                                  disabled={stagingComplianceKey === `${group.clientName}-${col.key}`}
                                  className="p-0.5 rounded-none text-[#31719B] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                  title="Sign with DSC (PAdES)"
                                >
                                  {stagingComplianceKey === `${group.clientName}-${col.key}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#31719B]" />
                                  ) : (
                                    <PenTool className="w-3.5 h-3.5 text-[#31719B]" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
};
