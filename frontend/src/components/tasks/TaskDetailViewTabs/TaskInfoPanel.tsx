"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  MoreVertical,
  Edit,
  Mail,
  MessageSquare,
  ReceiptText,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2,
  Upload,
  Download,
  ShieldCheck,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Building,
  Key,
  FolderOpen,
  Send,
  Loader2,
  RefreshCw,
  Phone,
  User,
  Hash,
} from "lucide-react";
import { TaskItem } from "@/data/taskData";
import { Client, ClientPassword, ClientNote } from "@/data/crmData";
import { Service } from "@/data/serviceData";
import { IDocumentItem, DocumentCategory, driveApi } from "@/services/driveApi";
import { clientApi } from "@/services/clientApi";
import { serviceApi } from "@/services/serviceApi";
import { taskApi } from "@/services/taskApi";

interface TaskInfoPanelProps {
  task: TaskItem;
  activeRightTab: string;
  setActiveRightTab: (tab: string) => void;
  isTimerRunning: boolean;
  onTimerToggle: () => void;
  timerSaving: boolean;
  timerError: string | null;
  timerSeconds: number;
  formatTimer: (totalSec: number) => string;
  handleStatusChange: (status: string) => Promise<void>;
  onGenerateInvoice?: () => void;
  isEmployee?: boolean;
  onTaskUpdated?: (updated: TaskItem) => void;
}

export const TaskInfoPanel: React.FC<TaskInfoPanelProps> = ({
  task,
  activeRightTab,
  setActiveRightTab,
  isTimerRunning,
  onTimerToggle,
  timerSaving,
  timerError,
  timerSeconds,
  formatTimer,
  handleStatusChange,
  onGenerateInvoice,
  isEmployee,
  onTaskUpdated,
}) => {
  // DB Fetched Data
  const [client, setClient] = useState<Client | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [driveFiles, setDriveFiles] = useState<IDocumentItem[]>([]);
  const [loadingClient, setLoadingClient] = useState(false);
  const [loadingService, setLoadingService] = useState(false);
  const [loadingDrive, setLoadingDrive] = useState(false);

  // UI State
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Password Tab State
  const [isAddingPassword, setIsAddingPassword] = useState(false);
  const [newPortal, setNewPortal] = useState("Income Tax Portal");
  const [newUserId, setNewUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRemarks, setNewRemarks] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Pins Tab State
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // UDIN Tab State
  const [isEditingUdin, setIsEditingUdin] = useState(false);
  const [udinInput, setUdinInput] = useState(
    task.complianceStatus?.referenceNo && task.complianceStatus.referenceNo !== "—"
      ? task.complianceStatus.referenceNo
      : ""
  );
  const [isSavingUdin, setIsSavingUdin] = useState(false);

  // Files Tab State
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [selectedDriveCategory, setSelectedDriveCategory] = useState<DocumentCategory>(
    DocumentCategory.TAX_RETURNS
  );
  const [driveUploadFile, setDriveUploadFile] = useState<File | null>(null);
  const [driveDescription, setDriveDescription] = useState("");
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);

  // Info Tab Compliance Edit State
  const [isEditingCompliance, setIsEditingCompliance] = useState(false);
  const [compPeriod, setCompPeriod] = useState(task.complianceStatus?.period || task.period || "");
  const [compDueDate, setCompDueDate] = useState(task.complianceStatus?.dueDate || task.targetDueDate || "");
  const [compStatus, setCompStatus] = useState(task.complianceStatus?.status || "Pending");
  const [compRefNo, setCompRefNo] = useState(task.complianceStatus?.referenceNo || "—");
  const [compFiledDate, setCompFiledDate] = useState(task.complianceStatus?.filedDate || "—");
  const [isSavingCompliance, setIsSavingCompliance] = useState(false);

  // SOP Tab Edit State
  const [isEditingSop, setIsEditingSop] = useState(false);
  const [sopInput, setSopInput] = useState(task.sop || "");
  const [isSavingSop, setIsSavingSop] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleCopy = (text: string, key: string, label: string = "Value") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerToast(`${label} copied to clipboard!`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // 1. Fetch Client Details from DB
  useEffect(() => {
    let isMounted = true;
    const fetchClient = async () => {
      setLoadingClient(true);
      try {
        let found: Client | null = null;
        const isHexId = (val?: string | null) => Boolean(val && /^[0-9a-fA-F]{24}$/.test(String(val).trim()));

        // 1. Direct query by clientId if present
        if (task.clientId) {
          try {
            const res = await clientApi.getClientById(task.clientId);
            if (res?.data) found = res.data;
          } catch {
            // fallback
          }
        }

        // 2. Query by task.clientName if it was stored as a MongoDB ObjectId
        if (!found && isHexId(task.clientName)) {
          try {
            const res = await clientApi.getClientById(task.clientName);
            if (res?.data) found = res.data;
          } catch {
            // fallback
          }
        }

        // 3. Search by fileNo, pan, or human name
        if (!found && (task.clientFileNo || task.clientPan || (task.clientName && !isHexId(task.clientName)))) {
          const searchKey = task.clientFileNo || task.clientPan || task.clientName;
          try {
            const res = await clientApi.getClients({ search: searchKey });
            if (res?.data && res.data.length > 0) {
              found =
                res.data.find(
                  (c) =>
                    (task.clientFileNo && c.fileNo?.toLowerCase() === task.clientFileNo.toLowerCase()) ||
                    (task.clientPan && c.pan?.toLowerCase() === task.clientPan.toLowerCase()) ||
                    (task.clientName && c.name?.toLowerCase() === task.clientName.toLowerCase())
                ) || null;
            }
          } catch {
            // fallback
          }
        }

        // 4. Fallback search over clients list
        if (!found) {
          try {
            const res = await clientApi.getClients({ limit: 100 });
            if (res?.data && res.data.length > 0) {
              found =
                res.data.find(
                  (c) =>
                    (task.clientId && (c.id === task.clientId || (c as any)._id === task.clientId)) ||
                    (isHexId(task.clientName) && (c.id === task.clientName || (c as any)._id === task.clientName)) ||
                    (task.clientFileNo && c.fileNo?.toLowerCase() === task.clientFileNo.toLowerCase()) ||
                    (task.clientPan && c.pan?.toLowerCase() === task.clientPan.toLowerCase())
                ) || null;
            }
          } catch {
            // fallback
          }
        }

        if (isMounted) {
          setClient(found);
          if (found && (task.clientName !== found.name || !task.clientId || isHexId(task.clientName))) {
            onTaskUpdated?.({
              ...task,
              clientName: found.name,
              clientId: found.id || (found as any)._id || task.clientId,
              clientFileNo: found.fileNo || task.clientFileNo,
              clientPan: found.pan || task.clientPan,
              legalName: found.legalName || found.name || task.legalName,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch client details from DB:", err);
      } finally {
        if (isMounted) setLoadingClient(false);
      }
    };

    fetchClient();
    return () => {
      isMounted = false;
    };
  }, [task.clientId, task.clientFileNo, task.clientPan, task.clientName]);

  // 2. Fetch Service Details from DB
  useEffect(() => {
    let isMounted = true;
    const fetchService = async () => {
      setLoadingService(true);
      try {
        let found: Service | null = null;
        if (task.serviceId) {
          try {
            const res = await serviceApi.getServiceById(task.serviceId);
            if (res?.data) found = res.data;
          } catch {
            // fallback
          }
        }
        if (!found && task.serviceName) {
          const res = await serviceApi.getServices({ search: task.serviceName });
          if (res?.data && res.data.length > 0) {
            found =
              res.data.find((s) => s.name.toLowerCase() === task.serviceName.toLowerCase()) ||
              res.data[0];
          }
        }
        if (isMounted) {
          setService(found);
          if (!sopInput && (found?.sop || task.sop)) {
            setSopInput(task.sop || found?.sop || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch service details from DB:", err);
      } finally {
        if (isMounted) setLoadingService(false);
      }
    };

    fetchService();
    return () => {
      isMounted = false;
    };
  }, [task.serviceId, task.serviceName]);

  // 3. Fetch Google Drive Files for Client / Task from DB
  const loadDriveDocuments = async (clientId?: string) => {
    setLoadingDrive(true);
    try {
      const cId = clientId || client?.id || task.clientId;
      const res = await driveApi.getDocuments({
        clientId: cId || undefined,
        search: !cId ? task.clientName || undefined : undefined,
      });
      if (res?.data) {
        setDriveFiles(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch drive documents from DB:", err);
    } finally {
      setLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (activeRightTab === "Files") {
      loadDriveDocuments(client?.id);
    }
  }, [activeRightTab, client?.id]);

  // Handler: Add Password to DB
  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClientId = client?.id || (client as any)?._id || task.clientId;
    if (!targetClientId) {
      triggerToast("No linked client found to save password");
      return;
    }
    if (!newPortal || !newUserId) {
      triggerToast("Portal and User ID are required");
      return;
    }
    setIsSavingPassword(true);
    try {
      const payload: Partial<ClientPassword> = {
        portal: newPortal,
        userId: newUserId.trim(),
        password: newPassword,
        remarks: newRemarks.trim(),
      };
      const res = await clientApi.addPassword(targetClientId, payload);
      if (res.data) {
        setClient(res.data);
      } else {
        const updatedPasswords = [
          { id: `pwd-${Date.now()}`, ...payload } as ClientPassword,
          ...(client?.passwords || []),
        ];
        if (client) setClient({ ...client, passwords: updatedPasswords });
      }
      setNewUserId("");
      setNewPassword("");
      setNewRemarks("");
      setIsAddingPassword(false);
      triggerToast("Portal credential added to security vault");
    } catch (err: any) {
      console.error("Failed to add password:", err);
      triggerToast(err.message || "Failed to add password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handler: Delete Password from DB
  const handleDeletePassword = async (pwdId: string) => {
    const targetClientId = client?.id || (client as any)?._id || task.clientId;
    if (!targetClientId) return;
    try {
      const res = await clientApi.deletePassword(targetClientId, pwdId);
      if (res.data) {
        setClient(res.data);
      } else if (client) {
        setClient({
          ...client,
          passwords: (client.passwords || []).filter(
            (p: any) => p.id !== pwdId && p._id !== pwdId
          ),
        });
      }
      triggerToast("Credential removed");
    } catch (err: any) {
      console.error("Failed to delete password:", err);
      triggerToast("Failed to delete credential");
    }
  };

  // Handler: Add Pinned Note to DB
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClientId = client?.id || (client as any)?._id || task.clientId;
    if (!targetClientId) {
      triggerToast("No linked client found to save note");
      return;
    }
    if (!newNoteContent.trim()) {
      triggerToast("Note content cannot be empty");
      return;
    }
    setIsSavingNote(true);
    try {
      const payload: Partial<ClientNote> = {
        title: newNoteTitle.trim() || `Task Note (${task.taskId})`,
        content: newNoteContent.trim(),
        author: "CA Team",
        createdAt: new Date().toISOString(),
      };
      const res = await clientApi.addNote(targetClientId, payload);
      if (res.data) {
        setClient(res.data);
      } else if (client) {
        const updatedNotes = [
          { id: `note-${Date.now()}`, ...payload } as ClientNote,
          ...(client.notes || []),
        ];
        setClient({ ...client, notes: updatedNotes });
      }
      setNewNoteTitle("");
      setNewNoteContent("");
      setIsAddingNote(false);
      triggerToast("Pinned note saved to database");
    } catch (err: any) {
      console.error("Failed to add note:", err);
      triggerToast(err.message || "Failed to add note");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Handler: Delete Pinned Note from DB
  const handleDeleteNote = async (noteId: string) => {
    const targetClientId = client?.id || (client as any)?._id || task.clientId;
    if (!targetClientId) return;
    try {
      const res = await clientApi.deleteNote(targetClientId, noteId);
      if (res.data) {
        setClient(res.data);
      } else if (client) {
        setClient({
          ...client,
          notes: (client.notes || []).filter(
            (n: any) => n.id !== noteId && n._id !== noteId
          ),
        });
      }
      triggerToast("Pinned note deleted");
    } catch (err: any) {
      console.error("Failed to delete note:", err);
      triggerToast("Failed to delete note");
    }
  };

  // Handler: Update UDIN in DB
  const handleSaveUdin = async () => {
    if (!udinInput.trim()) {
      triggerToast("Please enter a valid UDIN reference");
      return;
    }
    setIsSavingUdin(true);
    try {
      const targetId = task.id || (task as any)._id || task.taskId;
      const updatedCompliance = {
        period: task.complianceStatus?.period || task.period || "Current",
        dueDate: task.complianceStatus?.dueDate || task.targetDueDate || "",
        referenceNo: udinInput.trim().toUpperCase(),
        status: "Compliant" as const,
        filedDate:
          task.complianceStatus?.filedDate && task.complianceStatus.filedDate !== "—"
            ? task.complianceStatus.filedDate
            : new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
        attachmentsCount: Math.max(task.complianceStatus?.attachmentsCount || 1, 1),
      };

      const res = await taskApi.updateTask(targetId, {
        complianceStatus: updatedCompliance,
      });

      if (onTaskUpdated && res.data) {
        onTaskUpdated(res.data);
      } else if (onTaskUpdated) {
        onTaskUpdated({ ...task, complianceStatus: updatedCompliance });
      }
      setIsEditingUdin(false);
      triggerToast("UDIN reference updated and saved to DB");
    } catch (err: any) {
      console.error("Failed to update UDIN:", err);
      triggerToast("Failed to update UDIN");
    } finally {
      setIsSavingUdin(false);
    }
  };

  // Handler: Save Compliance Status in DB
  const handleSaveCompliance = async () => {
    setIsSavingCompliance(true);
    try {
      const targetId = task.id || (task as any)._id || task.taskId;
      const updatedCompliance = {
        period: compPeriod || task.period,
        dueDate: compDueDate || task.targetDueDate,
        status: compStatus as any,
        filedDate: compFiledDate || "—",
        referenceNo: compRefNo || "—",
        attachmentsCount: task.complianceStatus?.attachmentsCount || 0,
      };

      const res = await taskApi.updateTask(targetId, {
        complianceStatus: updatedCompliance,
      });

      if (onTaskUpdated && res.data) {
        onTaskUpdated(res.data);
      } else if (onTaskUpdated) {
        onTaskUpdated({ ...task, complianceStatus: updatedCompliance });
      }
      setIsEditingCompliance(false);
      triggerToast("Compliance status updated in DB");
    } catch (err: any) {
      console.error("Failed to save compliance:", err);
      triggerToast("Failed to save compliance");
    } finally {
      setIsSavingCompliance(false);
    }
  };

  // Handler: Save SOP Notes in DB
  const handleSaveSop = async () => {
    setIsSavingSop(true);
    try {
      const targetId = task.id || (task as any)._id || task.taskId;
      const res = await taskApi.updateTask(targetId, {
        sop: sopInput,
      });
      if (onTaskUpdated && res.data) {
        onTaskUpdated(res.data);
      } else if (onTaskUpdated) {
        onTaskUpdated({ ...task, sop: sopInput });
      }
      setIsEditingSop(false);
      triggerToast("SOP instructions updated in DB");
    } catch (err: any) {
      console.error("Failed to save SOP:", err);
      triggerToast("Failed to save SOP");
    } finally {
      setIsSavingSop(false);
    }
  };

  // Handler: Upload File to Google Drive
  const handleDriveUpload = async () => {
    if (!driveUploadFile) {
      setUploadErrorMessage("Please select a file to upload.");
      return;
    }
    setIsUploadingDrive(true);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", driveUploadFile);
      formData.append("category", selectedDriveCategory);
      formData.append(
        "description",
        driveDescription || `Document for task ${task.taskId} - ${task.taskName}`
      );
      if (client?.id) {
        formData.append("clientId", client.id);
      } else if (task.clientId) {
        formData.append("clientId", task.clientId);
      }
      formData.append("clientName", client?.name || task.clientName);
      formData.append(
        "tags",
        JSON.stringify(["TaskDocument", task.taskId, task.serviceName])
      );

      await driveApi.uploadDocument(formData);
      setUploadSuccessMessage(`Successfully uploaded "${driveUploadFile.name}" to Google Drive`);
      setDriveUploadFile(null);
      setDriveDescription("");
      loadDriveDocuments(client?.id);
      triggerToast("File uploaded to Google Drive");
    } catch (err: any) {
      setUploadErrorMessage(err.message || "Failed to upload document to Google Drive");
    } finally {
      setIsUploadingDrive(false);
    }
  };

  // Combined Passwords from client info:
  // 1. client.passwords (portal vault passwords)
  // 2. client.customerFiles.statutory (Income Tax, GST, MCA, TRACES logins entered in client info)
  // 3. client.customerFiles.promoter (Director / Promoter MCA passwords entered in client info)
  const allPasswords: ClientPassword[] = [
    ...(client?.passwords || []).map((p: any, idx: number) => ({
      id: p.id || p._id || `pwd-${idx}`,
      portal: p.portal || "Portal",
      userId: p.userId || p.username || p.loginId || "",
      password: p.password || p.pass || "",
      remarks: p.remarks && p.remarks !== "-" ? p.remarks : (p.url && p.url !== "-" ? p.url : ""),
    })),
    ...(client?.customerFiles?.statutory || [])
      .filter((stat: any) => stat && (stat.password || stat.userId || stat.idNo || stat.type))
      .map((stat: any, idx: number) => ({
        id: `stat-${stat._id || stat.idNo || stat.userId || idx}`,
        portal: stat.type ? `${stat.type} (Statutory KYC)` : "Statutory Portal",
        userId: stat.userId || stat.idNo || "",
        password: stat.password || stat.pass || "",
        remarks: stat.idNo ? `Statutory Identifier: ${stat.idNo}` : "Statutory File",
      })),
    ...(client?.customerFiles?.promoter || [])
      .filter((prom: any) => prom && (prom.mcaPassword || prom.mcaId || prom.name))
      .map((prom: any, idx: number) => ({
        id: `prom-${prom._id || prom.pan || prom.mcaId || idx}`,
        portal: `MCA / ROC (${prom.name || "Director Login"})`,
        userId: prom.mcaId || prom.pan || "",
        password: prom.mcaPassword || "",
        remarks: `Promoter: ${prom.name || "Director"}${prom.designation ? ` (${prom.designation})` : ""}`,
      })),
  ];

  return (
    <div className="lg:col-span-4 p-4 space-y-4 bg-[var(--bg-muted)] border-l border-[var(--border-main)]">
      {/* Top Tabs: Info, SOP, Pins, UDIN, Files, Password */}
      <div className="flex items-center space-x-2 border-b border-[var(--border-main)] pb-2 text-xs overflow-x-auto scrollbar-slim">
        {["Info", "SOP", "Pins", "UDIN", "Files", "Password"].map((tab) => {
          const isActive = activeRightTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveRightTab(tab)}
              style={{
                color: isActive ? "var(--primary)" : undefined,
                borderBottomColor: isActive ? "var(--primary)" : "transparent",
              }}
              className={`pb-1 font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer flex items-center gap-1 ${
                isActive ? "" : "text-[var(--text-subtle)] hover:text-[var(--text-main)]"
              }`}
            >
              <span>{tab}</span>
              {tab === "Password" && allPasswords.length > 0 && (
                <span className="text-[9px] px-1 py-0.2 rounded-full bg-[var(--brand-soft)] font-mono">
                  {allPasswords.length}
                </span>
              )}
              {tab === "Files" && (driveFiles.length > 0 || (task.documentRequests?.length || 0) > 0) && (
                <span className="text-[9px] px-1 py-0.2 rounded-full bg-[var(--brand-soft)] font-mono">
                  {driveFiles.length + (task.documentRequests?.length || 0)}
                </span>
              )}
              {tab === "Pins" && (client?.notes?.length || 0) > 0 && (
                <span className="text-[9px] px-1 py-0.2 rounded-full bg-[var(--brand-soft)] font-mono">
                  {client?.notes?.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Controls: Start Timer, Send for Review, Complete, Ready to Bill, Generate Invoice */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={onTimerToggle}
          disabled={timerSaving}
          className={`py-1.5 px-3 text-xs font-semibold rounded-full border transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer ${
            isTimerRunning
              ? "bg-amber-500 text-white border-amber-600 animate-pulse"
              : "bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border-main)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          {isTimerRunning ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>{timerSaving ? "Saving…" : `Stop (${formatTimer(timerSeconds)})`}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              <span>Start Timer</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("Sent for Review")}
          style={{ backgroundColor: "var(--primary)" }}
          className="py-1.5 px-3 text-xs font-semibold text-white rounded-full shadow-xs transition-colors hover:opacity-90 cursor-pointer"
        >
          Send for Review
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("Completed")}
          className="py-1.5 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-xs transition-colors cursor-pointer"
        >
          Complete
        </button>

        {task.status !== "Ready to Bill" && (
          <button
            type="button"
            onClick={() => handleStatusChange("Ready to Bill")}
            className="py-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-xs transition-colors cursor-pointer"
          >
            Ready to Bill
          </button>
        )}

        {task.status === "Ready to Bill" && !isEmployee && onGenerateInvoice && (
          <button
            type="button"
            onClick={onGenerateInvoice}
            className="py-1.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-xs transition-all cursor-pointer flex items-center space-x-1"
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>Generate Invoice</span>
          </button>
        )}

        <button
          type="button"
          aria-label="More actions"
          className="p-1.5 text-[var(--text-subtle)] hover:text-[var(--text-main)] border border-[var(--border-main)] rounded-full cursor-pointer bg-[var(--bg-surface)]"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {timerError && <p role="alert" className="text-xs text-red-600">{timerError}</p>}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-2 rounded bg-gray-900 text-white text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* TAB 1: INFO */}
      {activeRightTab === "Info" && (
        <div className="space-y-3">
          {/* Compliance Status Card */}
          <div className="bg-[var(--banner-bg)] border border-[var(--banner-border)] text-[var(--banner-text)] rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between font-bold mb-2">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Compliance Status</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingCompliance(!isEditingCompliance)}
                className="hover:opacity-75 cursor-pointer text-[10px] font-semibold underline flex items-center space-x-1"
              >
                <Edit className="w-3 h-3" />
                <span>{isEditingCompliance ? "Cancel" : "Edit"}</span>
              </button>
            </div>

            {isEditingCompliance ? (
              <div className="space-y-2 pt-1 border-t border-[var(--banner-border)]">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-[10px] font-semibold block text-[var(--banner-link)]">
                      Period:
                    </label>
                    <input
                      type="text"
                      value={compPeriod}
                      onChange={(e) => setCompPeriod(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-main)] p-1 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block text-[var(--banner-link)]">
                      Due Date:
                    </label>
                    <input
                      type="text"
                      value={compDueDate}
                      onChange={(e) => setCompDueDate(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-main)] p-1 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block text-[var(--banner-link)]">
                      Status:
                    </label>
                    <select
                      value={compStatus}
                      onChange={(e) => setCompStatus(e.target.value as "Pending" | "Overdue" | "Compliant" | "Filed")}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-main)] p-1 rounded text-xs"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Compliant">Compliant</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Filed">Filed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block text-[var(--banner-link)]">
                      Ref No / UDIN:
                    </label>
                    <input
                      type="text"
                      value={compRefNo}
                      onChange={(e) => setCompRefNo(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-main)] p-1 rounded text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveCompliance}
                    disabled={isSavingCompliance}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded cursor-pointer"
                  >
                    {isSavingCompliance ? "Saving…" : "Save Status"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                <div>
                  <span className="text-[var(--banner-link)] block opacity-80">PERIOD</span>
                  <span className="font-semibold">{task.complianceStatus?.period || task.period}</span>
                </div>
                <div>
                  <span className="text-[var(--banner-link)] block opacity-80">DUE DATE</span>
                  <span className="font-semibold">{task.complianceStatus?.dueDate || task.targetDueDate}</span>
                </div>
                <div>
                  <span className="text-[var(--banner-link)] block opacity-80">STATUS</span>
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      task.complianceStatus?.status === "Compliant"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {task.complianceStatus?.status || "Overdue"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--banner-link)] block opacity-80">FILED DATE</span>
                  <span>{task.complianceStatus?.filedDate || "—"}</span>
                </div>
                <div>
                  <span className="text-[var(--banner-link)] block opacity-80">REFERENCE NO / UDIN</span>
                  <span className="font-mono font-semibold truncate block">
                    {task.complianceStatus?.referenceNo || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--banner-link)] block opacity-80">ATTACHMENTS</span>
                  <span>{task.complianceStatus?.attachmentsCount || 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Linked Client Profile Card (Fetched from DB) */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <span className="font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                <Building className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                <span>Linked Client Profile</span>
              </span>
              {loadingClient ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-subtle)]" />
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  {client ? "DB Linked" : "Local Sync"}
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-subtle)]">Entity Name:</span>
                <span className="font-semibold text-[var(--text-main)] truncate max-w-[190px]">
                  {client?.name || (!/^[0-9a-fA-F]{24}$/.test(task.clientName) ? task.clientName : "Client Profile")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-subtle)]">File No:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-mono font-bold text-[var(--text-main)]">
                    {client?.fileNo || task.clientFileNo || "—"}
                  </span>
                  {(client?.fileNo || task.clientFileNo) && (
                    <button
                      type="button"
                      onClick={() => handleCopy(client?.fileNo || task.clientFileNo, "fileNo", "File No")}
                      className="text-[var(--text-subtle)] hover:text-[var(--primary)] cursor-pointer"
                    >
                      {copiedKey === "fileNo" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-subtle)]">Client PAN:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-mono font-bold text-[var(--text-main)]">
                    {client?.pan || task.clientPan || "—"}
                  </span>
                  {(client?.pan || task.clientPan) && (
                    <button
                      type="button"
                      onClick={() => handleCopy(client?.pan || task.clientPan, "pan", "PAN")}
                      className="text-[var(--text-subtle)] hover:text-[var(--primary)] cursor-pointer"
                    >
                      {copiedKey === "pan" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-subtle)]">Practice Group:</span>
                <span className="font-medium text-[var(--text-main)]">{client?.group || task.groupName || "Corporate"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-subtle)]">Constitution / Type:</span>
                <span className="capitalize text-[var(--text-main)]">{client?.type || "Private Limited"}</span>
              </div>
              {client?.mobile && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-subtle)]">Mobile:</span>
                  <a href={`tel:${client.mobile}`} className="font-medium text-blue-600 hover:underline">
                    {client.mobile}
                  </a>
                </div>
              )}
              {client?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-subtle)]">Email:</span>
                  <a href={`mailto:${client.email}`} className="font-medium text-blue-600 hover:underline truncate max-w-[180px]">
                    {client.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 2-Column Task System Metadata */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs">
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[11px]">
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  TASK NAME
                </span>
                <span className="font-medium text-[var(--text-main)] truncate block">
                  {task.taskName}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  SHARE
                </span>
                <div className="flex items-center space-x-2 pt-0.5" style={{ color: "var(--primary)" }}>
                  <Mail className="w-3.5 h-3.5 cursor-pointer hover:opacity-75" />
                  <MessageSquare className="w-3.5 h-3.5 cursor-pointer hover:opacity-75" />
                </div>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  TASK ID
                </span>
                <span className="font-bold text-[var(--text-main)] font-mono">{task.taskId}</span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  SERVICE NAME
                </span>
                <span className="font-semibold text-[var(--text-main)] truncate block">
                  {task.serviceName}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  FREQUENCY
                </span>
                <span className="text-[var(--text-muted)]">{task.frequency}</span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  FILING PERIOD
                </span>
                <span className="text-[var(--text-muted)]">{task.period}</span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  CATEGORY
                </span>
                <span className="text-[var(--text-muted)]">{task.category}</span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  DEPARTMENT
                </span>
                <span className="text-[var(--text-muted)]">{task.department || "GST"}</span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  TASK TYPE
                </span>
                <span className="text-[var(--text-muted)]">{task.taskType}</span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  FINANCIAL YEAR
                </span>
                <span className="text-[var(--text-muted)]">{task.financialYear}</span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  START DATE
                </span>
                <span className="text-[var(--text-muted)]">{task.startDate}</span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  TARGET DUE
                </span>
                <span className="text-[var(--text-muted)]">{task.targetDueDate}</span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  STATUS
                </span>
                <span
                  className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: "var(--brand-soft)",
                    color: "var(--primary)",
                  }}
                >
                  {task.status}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  PRIORITY
                </span>
                <span className="text-emerald-600 font-semibold">{task.priority}</span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  CREATOR (ADMIN)
                </span>
                <span className="text-[var(--text-main)] font-semibold">
                  {task.creatorName || "Admin"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  SUB STATUS
                </span>
                <span className="text-[var(--text-placeholder)]">—</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SOP (Standard Operating Procedure) */}
      {activeRightTab === "SOP" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
            <div>
              <span className="font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                <span>Standard Operating Procedure (SOP)</span>
              </span>
              <p className="text-[11px] text-[var(--text-subtle)]">
                Statutory guidelines and workflow checklist from database
              </p>
            </div>
            <div className="flex items-center space-x-1.5">
              <span
                className="text-[10px] px-2 py-0.5 rounded font-semibold"
                style={{ backgroundColor: "var(--brand-soft)", color: "var(--primary)" }}
              >
                {task.serviceName}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingSop(!isEditingSop)}
                className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                {isEditingSop ? "Cancel" : "Edit SOP"}
              </button>
            </div>
          </div>

          {loadingService ? (
            <div className="py-6 text-center text-[var(--text-subtle)] flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
              <span>Fetching statutory SOP from database…</span>
            </div>
          ) : (
            <>
              {/* SOP Content / Editor */}
              {isEditingSop ? (
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={sopInput}
                    onChange={(e) => setSopInput(e.target.value)}
                    className="w-full text-xs p-2.5 rounded border border-[var(--border-main)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    placeholder="Provide detailed SOP guidelines, statutory deadlines, and verification steps…"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleSaveSop}
                      disabled={isSavingSop}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--primary)] rounded cursor-pointer hover:opacity-90"
                    >
                      {isSavingSop ? "Saving…" : "Save SOP"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-[var(--text-main)] leading-relaxed whitespace-pre-wrap bg-[var(--bg-subtle)] p-3 rounded border border-[var(--border-main)] min-h-[120px]">
                  {task.sop ||
                    service?.sop ||
                    "Standard operating procedure instructions linked to this service are available for execution. Follow statutory guidelines and checklist verification."}
                </div>
              )}

              {/* Service Subtask Stages from DB */}
              {service?.subTasks && service.subTasks.length > 0 && (
                <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded border border-blue-100 dark:border-blue-900 space-y-1.5">
                  <span className="font-bold text-[11px] text-blue-900 dark:text-blue-300 block">
                    Execution Workflow Stages ({service.subTasks.length}):
                  </span>
                  <div className="space-y-1">
                    {service.subTasks.map((st: any, i: number) => {
                      const name = typeof st === "string" ? st : st.name;
                      return (
                        <div key={i} className="flex items-center space-x-1.5 text-[11px] text-[var(--text-main)]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Statutory Service Level Guidelines */}
              <div className="text-[11px] text-[var(--text-subtle)] space-y-1 pt-1 border-t border-[var(--border-main)]">
                <div className="flex items-center justify-between">
                  <span>Turnaround Time (TAT):</span>
                  <strong className="text-[var(--text-main)]">
                    {service?.tatDays ? `${service.tatDays} Business Days` : "Standard SLA"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Service Category:</span>
                  <strong className="text-[var(--text-main)]">{service?.category || task.category}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audit Difficulty:</span>
                  <strong className="text-[var(--text-main)]">{service?.difficulty || "Medium"}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: PINS (Client Pinned Notes & Fast Reference from DB) */}
      {activeRightTab === "Pins" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
            <div>
              <span className="font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                <Hash className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                <span>Pinned Notes & Quick Reference</span>
              </span>
              <p className="text-[11px] text-[var(--text-subtle)]">
                Important client memos, PAN/GSTIN pins, and notes from DB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-[var(--primary)] rounded cursor-pointer hover:opacity-90 flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>{isAddingNote ? "Cancel" : "Add Note"}</span>
            </button>
          </div>

          {/* Quick Reference Badges */}
          <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)]">
            <div>
              <span className="text-[var(--text-subtle)] block text-[10px]">CLIENT PAN</span>
              <div className="flex items-center space-x-1 font-mono font-bold text-[var(--text-main)]">
                <span>{client?.pan || task.clientPan || "—"}</span>
                {(client?.pan || task.clientPan) && (
                  <button
                    type="button"
                    onClick={() => handleCopy(client?.pan || task.clientPan, "pinPan", "PAN")}
                    className="text-[var(--text-subtle)] hover:text-[var(--primary)] cursor-pointer"
                  >
                    {copiedKey === "pinPan" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="text-[var(--text-subtle)] block text-[10px]">CLIENT FILE NO</span>
              <div className="flex items-center space-x-1 font-mono font-bold text-[var(--text-main)]">
                <span>{client?.fileNo || task.clientFileNo || "—"}</span>
                {(client?.fileNo || task.clientFileNo) && (
                  <button
                    type="button"
                    onClick={() => handleCopy(client?.fileNo || task.clientFileNo, "pinFileNo", "File No")}
                    className="text-[var(--text-subtle)] hover:text-[var(--primary)] cursor-pointer"
                  >
                    {copiedKey === "pinFileNo" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="text-[var(--text-subtle)] block text-[10px]">TARGET DUE</span>
              <span className="font-semibold text-amber-600">{task.targetDueDate}</span>
            </div>
            <div>
              <span className="text-[var(--text-subtle)] block text-[10px]">PRACTICE GROUP</span>
              <span className="font-semibold text-[var(--text-main)]">{client?.group || task.groupName || "Corporate"}</span>
            </div>
          </div>

          {/* Inline Add Note Form */}
          {isAddingNote && (
            <form onSubmit={handleAddNote} className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded space-y-2">
              <span className="font-bold text-[11px] text-amber-900 dark:text-amber-200 block">
                Record Pinned Observation
              </span>
              <input
                type="text"
                placeholder="Note Title / Subject"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full text-xs p-1.5 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-main)]"
              />
              <textarea
                rows={3}
                required
                placeholder="Write observation, special client instruction, or filing note…"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full text-xs p-1.5 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-main)]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded cursor-pointer"
                >
                  {isSavingNote ? "Saving…" : "Save Note"}
                </button>
              </div>
            </form>
          )}

          {/* List of Pinned Notes from DB */}
          <div className="space-y-2">
            {!client?.notes || client.notes.length === 0 ? (
              <div className="py-6 text-center text-[var(--text-subtle)] text-[11px]">
                No internal notes recorded in DB for this client. Click "+ Add Note" to create one.
              </div>
            ) : (
              client.notes.map((note) => (
                <div
                  key={note.id}
                  className="p-2.5 rounded border border-[var(--border-main)] bg-[var(--bg-subtle)] space-y-1 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-[var(--text-main)]">
                      {note.title}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-[var(--text-subtle)]">
                        {note.createdAt ? new Date(note.createdAt).toLocaleDateString("en-GB") : ""}
                      </span>
                      {note.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id!)}
                          className="text-gray-400 hover:text-red-600 cursor-pointer p-0.5"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <span className="text-[9px] text-[var(--text-subtle)] block">
                    Logged by {note.author || "Staff"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: UDIN (Unique Document Identification Number - ICAI) */}
      {activeRightTab === "UDIN" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
            <div>
              <span className="font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>UDIN Generation & ICAI Verification</span>
              </span>
              <p className="text-[11px] text-[var(--text-subtle)]">
                ICAI Unique Document Identification Number compliance
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingUdin(!isEditingUdin)}
              className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              {isEditingUdin ? "Cancel" : "Update UDIN"}
            </button>
          </div>

          {/* Current UDIN Status Card */}
          <div className="p-3 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-subtle)]">Compliance Status:</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  task.complianceStatus?.referenceNo && task.complianceStatus.referenceNo !== "—"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {task.complianceStatus?.referenceNo && task.complianceStatus.referenceNo !== "—"
                  ? "Generated & Compliant"
                  : "Pending Generation"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--text-subtle)] block">
                UDIN REFERENCE NUMBER (18-DIGIT)
              </span>
              <div className="flex items-center justify-between mt-0.5 bg-[var(--bg-surface)] p-2 rounded border border-[var(--border-main)] font-mono text-sm font-bold text-[var(--text-main)]">
                <span>{task.complianceStatus?.referenceNo || "—"}</span>
                {task.complianceStatus?.referenceNo && task.complianceStatus.referenceNo !== "—" && (
                  <button
                    type="button"
                    onClick={() => handleCopy(task.complianceStatus?.referenceNo || "", "udin", "UDIN")}
                    className="text-[var(--text-subtle)] hover:text-[var(--primary)] cursor-pointer flex items-center space-x-1 text-xs"
                  >
                    {copiedKey === "udin" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px]">DOCUMENT TYPE</span>
                <span className="font-semibold text-[var(--text-main)]">{task.serviceName}</span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px]">ISSUING AUTHORITY</span>
                <span className="font-semibold text-[var(--text-main)]">ICAI Chartered Accountant</span>
              </div>
            </div>

            {/* ICAI Portal Link */}
            <div className="pt-2 border-t border-[var(--border-main)] flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-subtle)]">Verify online at official portal:</span>
              <a
                href="https://udin.icai.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center space-x-1"
              >
                <span>udin.icai.org</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Inline Edit UDIN */}
          {isEditingUdin && (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded space-y-2">
              <span className="font-bold text-[11px] text-blue-900 dark:text-blue-200 block">
                Enter Generated UDIN Reference
              </span>
              <input
                type="text"
                maxLength={18}
                placeholder="e.g. 26524103BABC123456"
                value={udinInput}
                onChange={(e) => setUdinInput(e.target.value.toUpperCase())}
                className="w-full text-xs p-2 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-main)] font-mono font-bold uppercase tracking-wider"
              />
              <p className="text-[10px] text-[var(--text-subtle)]">
                UDIN format: 2-digit Year (26) + 6-digit Membership No + 10-digit Alphanumeric code.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSaveUdin}
                  disabled={isSavingUdin}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
                >
                  {isSavingUdin ? "Saving…" : "Save UDIN"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FILES (Google Drive + Task Document Requests from DB) */}
      {activeRightTab === "Files" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
            <div>
              <span className="font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                <FolderOpen className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                <span>Client Files & Drive Documents</span>
              </span>
              <p className="text-[11px] text-[var(--text-subtle)]">
                Google Drive files and task document compliance
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadDriveDocuments(client?.id)}
              className="p-1 text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer"
              title="Refresh Files"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Google Drive Direct File Upload Box */}
          <div className="p-3 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)] space-y-2">
            <span className="font-bold text-[11px] text-[var(--text-main)] flex items-center space-x-1">
              <Upload className="w-3 h-3 text-[var(--primary)]" />
              <span>Upload Directly to Google Drive</span>
            </span>

            {uploadSuccessMessage && (
              <div className="p-2 rounded bg-emerald-50 text-emerald-800 text-[10px] border border-emerald-200">
                {uploadSuccessMessage}
              </div>
            )}
            {uploadErrorMessage && (
              <div className="p-2 rounded bg-red-50 text-red-800 text-[10px] border border-red-200">
                {uploadErrorMessage}
              </div>
            )}

            <div className="space-y-2 text-[11px]">
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-subtle)] block mb-1">
                  Target Drive Folder / Category:
                </label>
                <select
                  value={selectedDriveCategory}
                  onChange={(e) => setSelectedDriveCategory(e.target.value as DocumentCategory)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-main)] p-1.5 rounded text-xs"
                >
                  <option value={DocumentCategory.TAX_RETURNS}>Tax & GST Filings</option>
                  <option value={DocumentCategory.AUDIT_FINANCIALS}>Audited Financials</option>
                  <option value={DocumentCategory.INVOICES_BILLING}>Invoices & Billing</option>
                  <option value={DocumentCategory.COMPLIANCE_MCA}>MCA & ROC Compliance</option>
                  <option value={DocumentCategory.KYC_IDENTITY}>KYC & Entity Identification</option>
                  <option value={DocumentCategory.WORKPAPERS}>Working Papers</option>
                  <option value={DocumentCategory.GENERAL}>General Client Documents</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[var(--text-subtle)] block mb-1">
                  File Attachment:
                </label>
                <input
                  type="file"
                  onChange={(e) => setDriveUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[var(--text-main)] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--brand-soft)] file:text-[var(--primary)] cursor-pointer"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleDriveUpload}
                  disabled={!driveUploadFile || isUploadingDrive}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--primary)] rounded cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center space-x-1"
                >
                  {isUploadingDrive ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Uploading to Drive…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3" />
                      <span>Upload to Drive</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Google Drive Document List */}
          <div className="space-y-2">
            <span className="font-bold text-[11px] text-[var(--text-main)] block">
              Google Drive Files ({driveFiles.length})
            </span>
            {loadingDrive ? (
              <div className="py-4 text-center text-[var(--text-subtle)] flex items-center justify-center space-x-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading Google Drive files…</span>
              </div>
            ) : driveFiles.length > 0 ? (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-slim">
                {driveFiles.map((doc) => (
                  <div
                    key={doc._id || doc.id || doc.driveFileId}
                    className="p-2 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)] flex items-center justify-between"
                  >
                    <div className="text-[11px] truncate flex-1 pr-2">
                      <p className="font-medium text-[var(--text-main)] truncate">{doc.fileName}</p>
                      <span className="text-[9px] text-[var(--text-subtle)]">
                        {doc.category} • {(doc.size / 1024).toFixed(0)} KB •{" "}
                        {new Date(doc.createdAt).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {doc.webViewLink && (
                        <a
                          href={doc.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center space-x-0.5"
                        >
                          <span>View</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {doc.webContentLink && (
                        <a
                          href={doc.webContentLink}
                          download
                          className="text-[10px] font-semibold text-emerald-600 hover:underline flex items-center space-x-0.5"
                        >
                          <Download className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-[var(--text-subtle)] text-[11px]">
                No files uploaded to Google Drive for this client yet.
              </div>
            )}
          </div>

          {/* Task Document Requests List */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-main)]">
            <span className="font-bold text-[11px] text-[var(--text-main)] block">
              Task Document Requests ({task.documentRequests?.length || 0})
            </span>
            {task.documentRequests && task.documentRequests.length > 0 ? (
              <div className="space-y-1.5">
                {task.documentRequests.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)] flex items-center justify-between"
                  >
                    <div className="text-[11px] truncate flex-1 pr-2">
                      <p className="font-medium text-[var(--text-main)] truncate">{doc.title}</p>
                      <span
                        className={`text-[10px] font-medium ${
                          doc.status === "Received" ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-semibold underline"
                        style={{ color: "var(--primary)" }}
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-[10px] text-[var(--text-subtle)]">Pending file</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-[var(--text-subtle)] text-[11px]">
                No specific task document requests configured.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: PASSWORD (Portal Access & Credentials from DB) */}
      {activeRightTab === "Password" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
            <div>
              <span className="font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                <span>Statutory Portal Credentials</span>
              </span>
              <p className="text-[11px] text-[var(--text-subtle)]">
                Secure vault for Income Tax, GST, MCA, and TRACES logins
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingPassword(!isAddingPassword)}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-[var(--primary)] rounded cursor-pointer hover:opacity-90 flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>{isAddingPassword ? "Cancel" : "Add Password"}</span>
            </button>
          </div>

          {/* Add Password Form */}
          {isAddingPassword && (
            <form
              onSubmit={handleAddPassword}
              className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded space-y-2"
            >
              <span className="font-bold text-[11px] text-blue-900 dark:text-blue-200 block">
                Store Portal Login in Vault
              </span>
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-subtle)] block mb-0.5">
                  Portal Name:
                </label>
                <select
                  value={newPortal}
                  onChange={(e) => setNewPortal(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                >
                  <option value="Income Tax Portal">Income Tax e-Filing Portal</option>
                  <option value="GST Portal">GST Common Portal</option>
                  <option value="MCA / ROC V3">MCA V3 / ROC Portal</option>
                  <option value="TRACES (TDS)">TRACES (TDS CPC)</option>
                  <option value="EPFO / Unified Portal">EPFO Unified Portal</option>
                  <option value="ESIC Portal">ESIC Portal</option>
                  <option value="DGFT">DGFT Portal</option>
                  <option value="State Profession Tax">Profession Tax Portal</option>
                  <option value="Custom Portal">Other Statutory Portal</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[var(--text-subtle)] block mb-0.5">
                  User ID / Login ID:
                </label>
                <input
                  type="text"
                  required
                  placeholder="PAN, GSTIN, or Portal Username"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-main)] font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[var(--text-subtle)] block mb-0.5">
                  Password:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Portal Access Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[var(--text-subtle)] block mb-0.5">
                  Remarks / Hints:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Registered with Director Mobile"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--primary)] rounded cursor-pointer hover:opacity-90"
                >
                  {isSavingPassword ? "Saving…" : "Save Credential"}
                </button>
              </div>
            </form>
          )}

          {/* List of Passwords from DB */}
          {allPasswords.length === 0 ? (
            <div className="text-center py-6 text-[var(--text-subtle)] text-[11px] space-y-1">
              <ShieldCheck className="w-6 h-6 text-gray-400 mx-auto" />
              <p>No statutory portal passwords saved in DB for this client.</p>
              <p className="text-[10px]">Click "+ Add Password" to store one securely.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allPasswords.map((pwd, idx) => {
                const pwdKey = String(pwd.id ?? `pwd-${idx}`);
                const isRevealed = Boolean(revealedPasswords[pwdKey]);
                const hasPassword = Boolean(pwd.password && pwd.password.trim().length > 0);
                const hasUserId = Boolean(pwd.userId && pwd.userId !== "—");

                return (
                  <div
                    key={pwdKey}
                    className="p-3 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-[11px] text-[var(--text-main)]">
                          {pwd.portal}
                        </span>
                      </div>
                      {pwd.id && (
                        <button
                          type="button"
                          onClick={() => handleDeletePassword(pwd.id!)}
                          className="text-gray-400 hover:text-red-600 cursor-pointer p-0.5"
                          title="Delete Credential"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {/* User ID */}
                      <div className="bg-[var(--bg-surface)] p-2 rounded border border-[var(--border-main)]">
                        <span className="text-[9px] uppercase font-semibold text-[var(--text-subtle)] block">
                          USER ID
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-mono font-bold text-[var(--text-main)] truncate max-w-[110px]">
                            {pwd.userId || "—"}
                          </span>
                          {hasUserId && (
                            <button
                              type="button"
                              onClick={() => handleCopy(pwd.userId, `uid-${idx}`, "User ID")}
                              className="text-[var(--text-subtle)] hover:text-[var(--primary)] cursor-pointer"
                              title="Copy User ID"
                            >
                              {copiedKey === `uid-${idx}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Password */}
                      <div className="bg-[var(--bg-surface)] p-2 rounded border border-[var(--border-main)]">
                        <span className="text-[9px] uppercase font-semibold text-[var(--text-subtle)] block">
                          PASSWORD
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-mono font-bold text-[var(--text-main)] truncate max-w-[90px]">
                            {hasPassword ? (
                              isRevealed ? pwd.password : "••••••••"
                            ) : (
                              <span className="text-gray-400 font-normal italic text-[10px]">No password set</span>
                            )}
                          </span>
                          {hasPassword && (
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedPasswords((prev) => ({
                                    ...prev,
                                    [pwdKey]: !prev[pwdKey],
                                  }))
                                }
                                className="text-[var(--text-subtle)] hover:text-[var(--primary)] cursor-pointer"
                                title={isRevealed ? "Hide Password" : "Show Password"}
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(pwd.password!, `pwd-${idx}`, "Password")}
                                className="text-[var(--text-subtle)] hover:text-[var(--primary)] cursor-pointer"
                                title="Copy Password"
                              >
                                {copiedKey === `pwd-${idx}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {pwd.remarks && (
                      <p className="text-[10px] text-[var(--text-subtle)] italic">
                        Note: {pwd.remarks}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
