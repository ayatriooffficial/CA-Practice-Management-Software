"use client";

import React, { useState, useMemo } from "react";
import { RotateCcw, Upload, Plus, Trash2, GripVertical } from "lucide-react";
import { ServiceSubTask } from "@/data/serviceData";
import { usePermission } from "../../team/usePermission";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { DropdownActionItem } from "@/components/ui/TableActionDropdown";

interface ServiceSubTasksTabProps {
  subTasks: ServiceSubTask[];
  handleSyncToTasks: () => Promise<void>;
  isSyncing: boolean;
  setIsAddSubTaskOpen: (open: boolean) => void;
  handleDeleteSubTask: (id: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export const ServiceSubTasksTab: React.FC<ServiceSubTasksTabProps> = ({
  subTasks,
  handleSyncToTasks,
  isSyncing,
  setIsAddSubTaskOpen,
  handleDeleteSubTask,
  showToast,
}) => {
  const { canDelete } = usePermission();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedSubTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return subTasks.slice(start, start + pageSize);
  }, [subTasks, page, pageSize]);

  const columns = useMemo<DataTableColumn<ServiceSubTask>[]>(
    () => [
      {
        id: "drag",
        header: "",
        width: 48,
        align: "center",
        cell: () => (
          <div className="text-gray-400 cursor-grab">
            <GripVertical className="w-4 h-4 mx-auto" />
          </div>
        ),
      },
      {
        id: "index",
        header: "Index",
        width: 70,
        sortable: true,
        cell: (_st, idx) => (
          <span className="font-medium text-gray-500 dark:text-gray-400">
            {(page - 1) * pageSize + idx + 1}
          </span>
        ),
      },
      {
        id: "name",
        header: "Name",
        minWidth: 180,
        sortable: true,
        cell: (st) => (
          <span className="font-semibold text-gray-900 dark:text-white">
            {st.name}
          </span>
        ),
      },
      {
        id: "description",
        header: "Description",
        minWidth: 200,
        cell: (st) => (
          <span className="text-gray-500 dark:text-gray-400">
            {st.description || "-"}
          </span>
        ),
      },
      {
        id: "totalHours",
        header: "Total Hours",
        width: 120,
        sortable: true,
        cell: (st) => (
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {st.totalHours || "0 Hrs"}
          </span>
        ),
      },
      {
        id: "percentage",
        header: "Percentage",
        width: 110,
        sortable: true,
        align: "center",
        cell: (st) => (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600">
            {st.percentage || 0}%
          </span>
        ),
      },
    ],
    [page, pageSize]
  );

  const getSubTaskActions = (st: ServiceSubTask): DropdownActionItem[] => {
    if (!canDelete("services")) return [];
    return [
      {
        label: "Delete Sub Task",
        icon: Trash2,
        variant: "danger",
        onClick: () => handleDeleteSubTask(st.id),
      },
    ];
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Sub Tasks ({subTasks.length})
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Items auto-populate every task created from this service.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync Button */}
          <Button
            size="sm"
            variant="outline"
            icon={<RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />}
            onClick={handleSyncToTasks}
            disabled={isSyncing}
          >
            Sync
          </Button>

          {/* Import Button */}
          <Button
            size="sm"
            variant="outline"
            icon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => showToast("Subtasks imported from standard template")}
          >
            Import
          </Button>

          {/* Add Subtask Button */}
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsAddSubTaskOpen(true)}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Reusable DataTable */}
      <DataTable<ServiceSubTask>
        columns={columns}
        data={paginatedSubTasks}
        actions={canDelete("services") ? getSubTaskActions : undefined}
        getRowId={(st, idx) => st.id || String(idx)}
        emptyMessage='No sub tasks defined for this service. Click "+ Add" to create one.'
        pagination={{
          currentPage: page,
          pageSize,
          totalItems: subTasks.length,
          onPageChange: setPage,
          rowsPerPageOptions: [10, 25, 50],
          onRowsPerPageChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
        }}
      />
    </div>
  );
};
