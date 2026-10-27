"use client";

import React from "react";
import { TaskItem } from "@/data/taskData";
import { TaskChecklistTab } from "./TaskChecklistTab";
import { TaskDocumentRequestTab } from "./TaskDocumentRequestTab";
import { TaskCommentsTab } from "./TaskCommentsTab";
import { TaskSummaryTab } from "./TaskSummaryTab";
import { TaskSubTasksList } from "./TaskSubTasksList";
import { TaskInfoPanel } from "./TaskInfoPanel";
import { TaskNavigationMenu } from "./TaskNavigationMenu";
import { TaskLinkedEmailsTab } from "./TaskLinkedEmailsTab";

export {
  TaskChecklistTab,
  TaskDocumentRequestTab,
  TaskCommentsTab,
  TaskSummaryTab,
  TaskSubTasksList,
  TaskInfoPanel,
  TaskNavigationMenu,
  TaskLinkedEmailsTab,
};

export interface TaskDetailViewTabsProps {
  activeSubTab: string;
  task: TaskItem;
  // Checklist props
  isAddChecklistInline: boolean;
  setIsAddChecklistInline: (open: boolean) => void;
  checklistTitle: string;
  setChecklistTitle: (val: string) => void;
  handleAddChecklist: () => Promise<void>;
  handleToggleChecklist: (itemId: string) => Promise<void>;
  handleDeleteChecklist: (itemId: string) => Promise<void>;
  // Doc requests props
  isAddDocInline: boolean;
  setIsAddDocInline: (open: boolean) => void;
  docTitle: string;
  setDocTitle: (val: string) => void;
  handleAddDocRequest: () => Promise<void>;
  handleToggleDocRequest: (docId: string) => Promise<void>;
  handleDeleteDocRequest: (docId: string) => Promise<void>;
  handleUploadDocFile?: (docId: string, file: File, docTitle?: string) => Promise<void>;
  handleUploadGeneralFile?: (file: File, title: string) => Promise<void>;
  uploadingDocId?: string | null;
  uploadError?: string | null;
  // Comments props
  commentText: string;
  setCommentText: (val: string) => void;
  isSendingComment: boolean;
  handleSendComment: (e: React.FormEvent) => Promise<void>;
  onTaskUpdated?: (updatedTask: TaskItem) => void;
}

const TaskSubTabSkeleton: React.FC = () => (
  <div className="w-full space-y-3 p-3 animate-in fade-in duration-100">
    <div className="flex items-center justify-between">
      <div className="h-5 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      <div className="h-7 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
    </div>
    <div className="space-y-2">
      <div className="h-14 bg-gray-100 dark:bg-gray-800/60 rounded-lg border border-[var(--border-main)] animate-pulse" />
      <div className="h-14 bg-gray-100 dark:bg-gray-800/60 rounded-lg border border-[var(--border-main)] animate-pulse" />
      <div className="h-14 bg-gray-100 dark:bg-gray-800/60 rounded-lg border border-[var(--border-main)] animate-pulse" />
    </div>
  </div>
);

export const TaskDetailViewTabs: React.FC<TaskDetailViewTabsProps> = ({
  activeSubTab,
  task,
  isAddChecklistInline,
  setIsAddChecklistInline,
  checklistTitle,
  setChecklistTitle,
  handleAddChecklist,
  handleToggleChecklist,
  handleDeleteChecklist,
  isAddDocInline,
  setIsAddDocInline,
  docTitle,
  setDocTitle,
  handleAddDocRequest,
  handleToggleDocRequest,
  handleDeleteDocRequest,
  handleUploadDocFile,
  handleUploadGeneralFile,
  uploadingDocId,
  uploadError,
  commentText,
  setCommentText,
  isSendingComment,
  handleSendComment,
  onTaskUpdated,
}) => {
  const renderTab = () => {
    if (activeSubTab === "Linked Emails") {
      return (
        <TaskLinkedEmailsTab
          task={task}
          onTaskUpdated={onTaskUpdated}
        />
      );
    }

    if (activeSubTab === "Checklist") {
      return (
        <TaskChecklistTab
          checklist={task.checklist}
          isAddChecklistInline={isAddChecklistInline}
          setIsAddChecklistInline={setIsAddChecklistInline}
          checklistTitle={checklistTitle}
          setChecklistTitle={setChecklistTitle}
          handleAddChecklist={handleAddChecklist}
          handleToggleChecklist={handleToggleChecklist}
          handleDeleteChecklist={handleDeleteChecklist}
        />
      );
    }

    if (activeSubTab === "Document Request") {
      return (
        <TaskDocumentRequestTab
          documentRequests={task.documentRequests}
          isAddDocInline={isAddDocInline}
          setIsAddDocInline={setIsAddDocInline}
          docTitle={docTitle}
          setDocTitle={setDocTitle}
          handleAddDocRequest={handleAddDocRequest}
          handleToggleDocRequest={handleToggleDocRequest}
          handleDeleteDocRequest={handleDeleteDocRequest}
          handleUploadDocFile={handleUploadDocFile}
          handleUploadGeneralFile={handleUploadGeneralFile}
          uploadingDocId={uploadingDocId}
          uploadError={uploadError}
        />
      );
    }

    if (activeSubTab === "Task Summary") {
      return (
        <TaskSummaryTab
          task={task}
          handleToggleChecklist={handleToggleChecklist}
          handleToggleDocRequest={handleToggleDocRequest}
          commentText={commentText}
          setCommentText={setCommentText}
          isSendingComment={isSendingComment}
          handleSendComment={handleSendComment}
        />
      );
    }

    return (
      <TaskCommentsTab
        comments={task.comments || []}
        commentText={commentText}
        setCommentText={setCommentText}
        isSendingComment={isSendingComment}
        handleSendComment={handleSendComment}
      />
    );
  };

  return (
    <React.Suspense fallback={<TaskSubTabSkeleton />}>
      {renderTab()}
    </React.Suspense>
  );
};
