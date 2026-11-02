"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Loader2 } from "lucide-react";
import { ColumnResizer } from "./ColumnResizer";
import { TableActionDropdown, DropdownActionItem } from "./TableActionDropdown";
import { Pagination } from "./Pagination";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T, index: number) => React.ReactNode;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  align?: "left" | "center" | "right";
}

export interface DataTablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  rowsPerPageOptions?: number[];
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId?: (item: T, index: number) => string;
  // Selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  // Three-dot row actions
  actions?: (item: T, index: number) => DropdownActionItem[];
  actionsHeaderLabel?: string;
  // Sorting
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  // Pagination
  pagination?: DataTablePaginationProps;
  // Loading & Empty States
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  // Custom row click
  onRowClick?: (item: T, index: number) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId = (item: any, idx) => item?.id || item?._id || String(idx),
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  actions,
  actionsHeaderLabel = "Action",
  sortKey,
  sortDirection,
  onSort,
  pagination,
  loading = false,
  emptyMessage = "No records found.",
  emptyIcon,
  onRowClick,
  className = "",
}: DataTableProps<T>) {
  // Column width state for resizing
  const defaultWidths = useRef<Record<string, number>>(
    columns.reduce((acc, col) => {
      acc[col.id] = col.width || 150;
      return acc;
    }, {} as Record<string, number>)
  );

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths.current);
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Sync default widths if columns change
  useEffect(() => {
    setColumnWidths((prev) => {
      const updated = { ...prev };
      columns.forEach((col) => {
        if (!updated[col.id]) {
          updated[col.id] = col.width || 150;
        }
      });
      return updated;
    });
  }, [columns]);

  const handleResizeStart = useCallback(
    (colId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingKey(colId);
      startXRef.current = e.clientX;
      startWidthRef.current = columnWidths[colId] || 150;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        const colDef = columns.find((c) => c.id === colId);
        const minW = colDef?.minWidth || 60;
        const maxW = colDef?.maxWidth || 800;
        const newWidth = Math.max(minW, Math.min(maxW, startWidthRef.current + delta));

        setColumnWidths((prev) => ({
          ...prev,
          [colId]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        setResizingKey(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [columnWidths, columns]
  );

  const resetColumnWidth = useCallback(
    (colId: string) => {
      const orig = defaultWidths.current[colId] || 150;
      setColumnWidths((prev) => ({
        ...prev,
        [colId]: orig,
      }));
    },
    []
  );

  // Select all logic
  const allSelected =
    data.length > 0 &&
    data.every((item, idx) => selectedIds.includes(getRowId(item, idx)));

  const handleToggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      const currentPageIds = new Set(data.map((item, idx) => getRowId(item, idx)));
      onSelectionChange(selectedIds.filter((id) => !currentPageIds.has(id)));
    } else {
      const newIds = new Set(selectedIds);
      data.forEach((item, idx) => newIds.add(getRowId(item, idx)));
      onSelectionChange(Array.from(newIds));
    }
  };

  const handleToggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className={`bg-white dark:bg-[#1e293b] flex flex-col rounded-none border-0 ${className}`}>
      {/* Scrollable Spreadsheet Table */}
      <div className="overflow-x-auto scrollbar-slim">
        <table
          suppressHydrationWarning
          className="min-w-full border-separate border-spacing-0 text-left text-xs select-none"
          style={{ width: "max-content" }}
        >
          <thead>
            <tr
              className="text-gray-700 dark:text-gray-300 font-semibold"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              {/* Frozen Checkbox Column */}
              {selectable && (
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-12 min-w-[48px] max-w-[48px] px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all rows"
                    className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                  />
                </th>
              )}

              {/* Dynamic Resizable Header Columns */}
              {columns.map((col) => {
                const colWidth = columnWidths[col.id] || col.width || 150;
                const alignClass =
                  col.align === "center"
                    ? "text-center"
                    : col.align === "right"
                    ? "text-right"
                    : "text-left";

                return (
                  <th
                    key={col.id}
                    scope="col"
                    className={`relative px-3.5 py-3 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap ${alignClass}`}
                    style={{
                      backgroundColor: "var(--orange-havy-light)",
                      width: `${colWidth}px`,
                      minWidth: `${colWidth}px`,
                      maxWidth: `${colWidth}px`,
                    }}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.id)}
                        className={`flex items-center gap-1.5 hover:text-[#31719B] transition-colors cursor-pointer select-none ${
                          col.align === "right" ? "ml-auto" : col.align === "center" ? "mx-auto" : ""
                        }`}
                      >
                        <span>{col.header}</span>
                        {sortKey === col.id ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#31719B]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#31719B]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}

                    {/* Drag to resize divider */}
                    <ColumnResizer
                      onMouseDown={(e) => handleResizeStart(col.id, e)}
                      onDoubleClick={() => resetColumnWidth(col.id)}
                      isResizing={resizingKey === col.id}
                    />
                  </th>
                );
              })}

              {/* Frozen Actions Column on Right */}
              {actions && (
                <th
                  scope="col"
                  className="sticky right-0 z-30 w-24 min-w-[96px] max-w-[96px] px-3 py-3 font-semibold text-[#000000] dark:text-white border-l border-b border-[#dde2e8] dark:border-[#334155] text-center"
                  style={{ backgroundColor: "var(--orange-havy-light)" }}
                >
                  {actionsHeaderLabel}
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1e293b]"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
                    <span className="text-xs font-medium">Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="py-16 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-[#1e293b]"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    {emptyIcon}
                    <p className="text-xs font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, idx) => {
                const rowId = getRowId(item, idx);
                const isSelected = selectedIds.includes(rowId);

                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick?.(item, idx)}
                    className={`transition-colors border-b border-[#dde2e8] dark:border-[#334155] ${
                      isSelected
                        ? "bg-blue-50/50 dark:bg-blue-950/20"
                        : "bg-white dark:bg-[#1e293b] hover:bg-gray-50/70 dark:hover:bg-gray-800/50"
                    } ${onRowClick ? "cursor-pointer" : ""}`}
                  >
                    {/* Frozen Checkbox Cell */}
                    {selectable && (
                      <td
                        className={`sticky left-0 z-20 px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center ${
                          isSelected
                            ? "bg-blue-50/90 dark:bg-[#182642]"
                            : "bg-white dark:bg-[#1e293b]"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleRow(rowId, e as any)}
                          aria-label={`Select row ${idx + 1}`}
                          className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                        />
                      </td>
                    )}

                    {/* Data Cells */}
                    {columns.map((col) => {
                      const colWidth = columnWidths[col.id] || col.width || 150;
                      const alignClass =
                        col.align === "center"
                          ? "text-center"
                          : col.align === "right"
                          ? "text-right"
                          : "text-left";

                      let content: React.ReactNode;
                      if (col.cell) {
                        content = col.cell(item, idx);
                      } else if (col.accessorKey) {
                        content = String((item as any)[col.accessorKey] ?? "-");
                      } else {
                        content = "-";
                      }

                      return (
                        <td
                          key={col.id}
                          className={`px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-800 dark:text-gray-200 text-xs ${alignClass}`}
                          style={{
                            width: `${colWidth}px`,
                            minWidth: `${colWidth}px`,
                            maxWidth: `${colWidth}px`,
                          }}
                        >
                          {content}
                        </td>
                      );
                    })}

                    {/* Frozen Actions Cell on Right */}
                    {actions && (
                      <td
                        className={`sticky right-0 z-20 px-3 py-2.5 border-l border-b border-[#dde2e8] dark:border-[#334155] text-center ${
                          isSelected
                            ? "bg-blue-50/90 dark:bg-[#182642]"
                            : "bg-white dark:bg-[#1e293b]"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TableActionDropdown actions={actions(item, idx)} />
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b]">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {pagination.rowsPerPageOptions && pagination.onRowsPerPageChange && (
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onRowsPerPageChange!(Number(e.target.value))}
                  className="bg-transparent border border-[#dde2e8] dark:border-[#334155] rounded-sm px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none"
                >
                  {pagination.rowsPerPageOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <span>
              Showing{" "}
              <strong>
                {pagination.totalItems > 0
                  ? (pagination.currentPage - 1) * pagination.pageSize + 1
                  : 0}
              </strong>
              –
              <strong>
                {Math.min(
                  pagination.currentPage * pagination.pageSize,
                  pagination.totalItems
                )}
              </strong>{" "}
              of <strong>{pagination.totalItems}</strong> entries
            </span>
          </div>

          <Pagination
            currentPage={pagination.currentPage}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}
