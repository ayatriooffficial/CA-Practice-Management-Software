"use client";

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Building,
  FileText,
  FileEdit,
  Palette,
  Eye,
  Printer,
  Check,
  Edit2,
  SlidersHorizontal,
  Download,
  Maximize2,
  Minimize2,
  GripVertical,
  GripHorizontal,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { ServiceItem, InvoiceRecord } from './types';
import { FIRM_DETAILS } from './mockData';
import { useInvoice } from './InvoiceContext';
import { AddBankAccountModal } from './AddBankAccountModal';
import { taskApi } from '@/services/taskApi';
import { TaskItem } from '@/data/taskData';
import { clientApi } from '@/services/clientApi';
import { serviceApi } from '@/services/serviceApi';
import { Client } from '@/data/crmData';
import { Service } from '@/data/serviceData';
import { organizationApi, OrganizationDetails } from '@/services/organizationApi';
import { InvoiceLivePreview, printInvoiceElement, downloadInvoicePDF } from '@/components/onboarding/tabs/InvoiceLivePreview';

interface AddInvoiceFormProps {
  type: 'invoice' | 'proforma';
  mode?: 'create' | 'edit' | 'view';
  initialData?: InvoiceRecord;
  onBack: () => void;
}

export const AddInvoiceForm: React.FC<AddInvoiceFormProps> = ({
  type,
  mode = 'create',
  initialData,
  onBack,
}) => {
  const { addInvoice, addProforma, updateInvoice, bankAccounts } = useInvoice();

  const [currentMode, setCurrentMode] = useState<'create' | 'edit' | 'view'>(mode);
  const isView = currentMode === 'view';
  const isEdit = currentMode === 'edit';
  const isProforma = type === 'proforma';
  const titlePrefix = isProforma ? 'Proforma' : 'Invoice';

  const [activeFormat, setActiveFormat] = useState<"classic" | "modern" | "minimal">("modern");
  const [activeInvoiceColor, setActiveInvoiceColor] = useState<string>("#4F46E5");
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(isView);

  // Dates
  const [invoiceDate, setInvoiceDate] = useState(() => initialData?.date || new Date().toLocaleDateString('en-GB'));
  const [dueDate, setDueDate] = useState(() => initialData?.dueDate || new Date().toLocaleDateString('en-GB'));

  // Client Selection
  const [selectedClientId, setSelectedClientId] = useState<string>(() => initialData?.clientId || '');
  const [clients, setClients] = useState<Client[]>([]);
  const matchedClient = clients.find(
    (client) =>
      client.id === selectedClientId ||
      (client.name && initialData?.clientBusinessName && client.name.toLowerCase() === initialData.clientBusinessName.toLowerCase())
  );
  const selectedClient = matchedClient || (initialData?.clientBusinessName ? {
    id: initialData.clientId || 'client-prefilled',
    fileNo: '',
    name: initialData.clientBusinessName,
    legalName: initialData.clientLegalName || initialData.clientBusinessName,
    group: initialData.clientGroup || 'Clients',
    category: 'Corporate',
    pan: initialData.clientPan || '',
    active: true,
    address: initialData.clientAddress || '',
  } as unknown as Client : undefined);

  const [serviceCatalog, setServiceCatalog] = useState<Service[]>([]);

  // Organization Selection (Fetched from actual DB)
  const [organizations, setOrganizations] = useState<OrganizationDetails[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);

  // Bank Selection
  const [selectedBankId, setSelectedBankId] = useState<string>(() => initialData?.bankAccountId || '');
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

  // Services list
  const [services, setServices] = useState<ServiceItem[]>(() => {
    if (initialData?.services && initialData.services.length > 0) {
      return initialData.services;
    }
    return [
      {
        id: 'srv-1',
        serviceName: '',
        description: '',
        compliancePeriod: 'FY 2026-27',
        frequency: 'One-Time',
        periodLabel: 'N/A - One-Time',
        quantity: 1,
        price: 0,
        amount: 0,
        total: 0,
      },
    ];
  });

  // Note
  const [note, setNote] = useState(() => initialData?.notes || '');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskAllocations, setTaskAllocations] = useState<Array<{ taskId: string; amount: string }>>([]);
  const [allocationTaskId, setAllocationTaskId] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Live Preview Dimension & Zoom Adjustability
  const [previewWidth, setPreviewWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ayatrio_invoice_preview_width');
      if (saved) return Math.min(75, Math.max(28, Number(saved)));
    }
    return 50;
  });
  const [previewHeight, setPreviewHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ayatrio_invoice_preview_height');
      if (saved) return Math.min(1800, Math.max(420, Number(saved)));
    }
    return 780;
  });
  const [isHeightAuto, setIsHeightAuto] = useState<boolean>(false);
  const [isBigWindowModalOpen, setIsBigWindowModalOpen] = useState<boolean>(false);
  const [isDraggingWidth, setIsDraggingWidth] = useState(false);
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBigWindowModalOpen) {
        setIsBigWindowModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBigWindowModalOpen]);

  const splitContainerRef = useRef<HTMLDivElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ayatrio_invoice_preview_width', String(previewWidth));
    }
  }, [previewWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ayatrio_invoice_preview_height', String(previewHeight));
    }
  }, [previewHeight]);

  const handleMouseDownWidthResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingWidth(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const container = splitContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const distanceFromRight = containerRect.right - currentX;
      let newPercent = (distanceFromRight / containerRect.width) * 100;
      newPercent = Math.min(75, Math.max(25, Math.round(newPercent)));
      setPreviewWidth(newPercent);
    };

    const onMouseUp = () => {
      setIsDraggingWidth(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMouseDownHeightResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingHeight(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
    const startY = e.clientY;
    const initialHeight = previewCardRef.current?.offsetHeight || previewHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.min(2200, Math.max(380, Math.round(initialHeight + deltaY)));
      setPreviewHeight(newHeight);
      setIsHeightAuto(false);
    };

    const onMouseUp = () => {
      setIsDraggingHeight(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const resetDimensions = () => {
    setPreviewWidth(50);
    setPreviewHeight(780);
    setIsHeightAuto(false);
  };

  useEffect(() => {
    taskApi.getTasks({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .then((response) => {
        const fetchedTasks = response.data || [];
        setTasks(fetchedTasks);
        if (initialData && !taskAllocations.length) {
          // If draft invoice came from task, match taskId
          const incomingTaskId = (initialData as any).taskId;
          const cleanIncoming = incomingTaskId ? String(incomingTaskId).replace(/^#/, '').toLowerCase() : '';
          const matched = fetchedTasks.find(
            (t) =>
              (t.taskId && String(t.taskId).replace(/^#/, '').toLowerCase() === cleanIncoming) ||
              t.id === incomingTaskId ||
              (t.clientName && initialData.clientBusinessName && t.clientName.toLowerCase() === initialData.clientBusinessName.toLowerCase())
          );
          if (matched) {
            setTaskAllocations([{ taskId: matched.taskId || incomingTaskId || matched.id, amount: String(initialData.totalPayable || subTotal) }]);
          } else if (incomingTaskId) {
            setTaskAllocations([{ taskId: incomingTaskId, amount: String(initialData.totalPayable || subTotal) }]);
          }
        }
      });
    clientApi.getClients({ page: 1, limit: 100, active: true, sortBy: 'name', sortOrder: 'asc' })
      .then((response) => {
        const fetchedClients = response.data || [];
        if (initialData?.clientBusinessName && !fetchedClients.some((c) => c.name.toLowerCase() === initialData.clientBusinessName.toLowerCase())) {
          fetchedClients.unshift({
            id: initialData.clientId || 'client-prefilled',
            fileNo: '',
            name: initialData.clientBusinessName,
            legalName: initialData.clientLegalName || initialData.clientBusinessName,
            group: initialData.clientGroup || 'Clients',
            category: 'Corporate',
            pan: initialData.clientPan || '',
            active: true,
            address: initialData.clientAddress || '',
          } as unknown as Client);
        }
        setClients(fetchedClients);
      });
    serviceApi.getServices({ limit: 100 })
      .then((response) => setServiceCatalog(response.data || []))
      .catch(() => { });

    // Fetch actual organization(s) from Database
    Promise.allSettled([
      organizationApi.getOrganizations(),
      organizationApi.getOrganization(),
    ]).then(([multiRes, singleRes]) => {
      let orgList: OrganizationDetails[] = [];
      if (multiRes.status === 'fulfilled' && multiRes.value?.data && multiRes.value.data.length > 0) {
        orgList = multiRes.value.data;
      } else if (singleRes.status === 'fulfilled' && singleRes.value?.data) {
        orgList = [singleRes.value.data];
      }

      setOrganizations(orgList);
      setIsLoadingOrg(false);

      if (orgList.length > 0) {
        const matched = orgList.find(
          (o) =>
            (initialData?.billingOrg && o.name.toLowerCase() === initialData.billingOrg.toLowerCase()) ||
            (initialData?.billingOrg && (o.id === initialData.billingOrg || (o as any)._id === initialData.billingOrg))
        );
        setSelectedOrgId(matched?.id || (matched as any)?._id || orgList[0].id || (orgList[0] as any)._id || '');
      }
    }).catch(() => {
      setIsLoadingOrg(false);
    });
  }, [initialData]);

  const selectedOrg = React.useMemo(() => {
    const found = organizations.find((o) => (o.id || (o as any)._id) === selectedOrgId);
    if (found) return found;
    if (organizations.length > 0) return organizations[0];
    return null;
  }, [organizations, selectedOrgId]);

  const formattedOrgAddress = React.useMemo(() => {
    if (!selectedOrg) return FIRM_DETAILS.address;
    if (selectedOrg.addressDetails) {
      const parts = [
        selectedOrg.addressDetails.addressLine1,
        selectedOrg.addressDetails.addressLine2,
        selectedOrg.addressDetails.city,
        selectedOrg.addressDetails.state,
        selectedOrg.addressDetails.pincode,
        selectedOrg.addressDetails.country,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    return selectedOrg.address || FIRM_DETAILS.address;
  }, [selectedOrg]);

  const orgName = selectedOrg?.name || initialData?.billingOrg || FIRM_DETAILS.name;
  const orgInitials = React.useMemo(() => {
    if (!orgName) return 'KA';
    const words = orgName.trim().split(/\s+/);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return orgName.substring(0, 2).toUpperCase();
  }, [orgName]);

  // Column print options (HSN/SAC, QTY, Description, CGST, SGST)
  const [printColumns, setPrintColumns] = useState({
    hsnSac: true,
    qty: true,
    description: true,
    cgst: true,
    sgst: true,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      const fileName = `Invoice_${initialData?.number || "INV-2026-001"}.pdf`;
      await downloadInvoicePDF("invoice-printable-root", fileName);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Sync format, color and column options when selectedOrg loads
  useEffect(() => {
    if (selectedOrg?.invoiceSettings) {
      if (selectedOrg.invoiceSettings.template) {
        setActiveFormat(selectedOrg.invoiceSettings.template);
      }
      const color = selectedOrg.invoiceSettings.documentColors?.find((c: any) => c.id === (isProforma ? 'proforma' : 'invoice'))?.hex;
      if (color) setActiveInvoiceColor(color);
      if (selectedOrg.invoiceSettings.printColumns) {
        setPrintColumns({
          hsnSac: selectedOrg.invoiceSettings.printColumns.hsnSac ?? true,
          qty: selectedOrg.invoiceSettings.printColumns.qty ?? true,
          description: selectedOrg.invoiceSettings.printColumns.description ?? true,
          cgst: selectedOrg.invoiceSettings.printColumns.cgst ?? true,
          sgst: selectedOrg.invoiceSettings.printColumns.sgst ?? true,
        });
      }
    }
  }, [selectedOrg, isProforma]);

  // Intercept Ctrl+P / Cmd+P when viewing or previewing invoice
  useEffect(() => {
    if (!isView && !isPreviewActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        printInvoiceElement("invoice-printable-root");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isView, isPreviewActive]);

  const handleChangeFormat = async (fmt: "classic" | "modern" | "minimal") => {
    setActiveFormat(fmt);
    if (selectedOrg) {
      try {
        await organizationApi.updateOrganization({
          invoiceSettings: {
            ...(selectedOrg.invoiceSettings || {}),
            template: fmt,
          },
        });
      } catch (e) {
        console.warn("Failed to update organization template:", e);
      }
    }
  };

  const handleToggleColumn = async (col: "hsnSac" | "qty" | "description" | "cgst" | "sgst") => {
    const updated = {
      ...printColumns,
      [col]: !printColumns[col],
    };
    setPrintColumns(updated);
    if (selectedOrg) {
      try {
        await organizationApi.updateOrganization({
          invoiceSettings: {
            ...(selectedOrg.invoiceSettings || {}),
            printColumns: updated,
          },
        });
      } catch (e) {
        console.warn("Failed to update organization print columns:", e);
      }
    }
  };

  // Calculations (Subtotal, GST, and Total with GST added)
  const subTotal = services.reduce((sum, s) => sum + s.amount, 0);
  const cgstAmount = Math.round((subTotal * 0.09) * 100) / 100;
  const sgstAmount = Math.round((subTotal * 0.09) * 100) / 100;
  const totalPayable = Math.round((subTotal + cgstAmount + sgstAmount) * 100) / 100;

  // Handlers for Services
  const handleServiceChange = (id: string, field: keyof ServiceItem, value: any) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === 'serviceName') {
          const matchedSrv = serviceCatalog.find(
            (c) => c.name.toLowerCase() === String(value).toLowerCase() || c.id === value
          );
          if (matchedSrv) {
            if (matchedSrv.professionalFee) {
              updated.price = matchedSrv.professionalFee;
              updated.amount = (updated.quantity || 1) * matchedSrv.professionalFee;
              updated.total = updated.amount;
            }
            if (matchedSrv.description && !updated.description) {
              updated.description = matchedSrv.description;
            }
          }
        }
        if (field === 'quantity' || field === 'price') {
          const qty = field === 'quantity' ? Number(value) : s.quantity;
          const prc = field === 'price' ? Number(value) : s.price;
          updated.amount = (qty || 0) * (prc || 0);
          updated.total = updated.amount;
        }
        return updated;
      })
    );
  };

  const handleAddService = () => {
    setServices((prev) => [
      ...prev,
      {
        id: `srv-${Date.now()}`,
        serviceName: '',
        description: '',
        compliancePeriod: 'FY 2026-27',
        frequency: 'One-Time',
        periodLabel: 'N/A - One-Time',
        quantity: 1,
        price: 0,
        amount: 0,
        total: 0,
      },
    ]);
  };

  const handleAddReimbursementItem = () => {
    setServices((prev) => [
      ...prev,
      {
        id: `srv-${Date.now()}`,
        serviceName: 'Government ROC MCA Fees',
        description: '',
        compliancePeriod: 'FY 2026-27',
        frequency: 'One-Time',
        periodLabel: 'N/A - One-Time',
        quantity: 1,
        price: 0,
        amount: 0,
        total: 0,
        isReimbursement: true,
      },
    ]);
  };

  const handleRemoveService = (id: string) => {
    if (services.length > 1) {
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleSave = async () => {
    if (!selectedClient) {
      setSaveError('Please select a client to proceed.');
      return;
    }
    let allocations = taskAllocations.filter((allocation) => Number(allocation.amount) > 0).map((allocation) => ({
      taskId: allocation.taskId,
      amountPaise: Math.round(Number(allocation.amount) * 100),
    }));

    if (!allocations.length && (initialData as any)?.taskId) {
      allocations = [{
        taskId: (initialData as any).taskId,
        amountPaise: Math.round(totalPayable * 100),
      }];
    }

    if (allocations.length > 0 && allocations.reduce((sum, allocation) => sum + allocation.amountPaise, 0) !== Math.round(totalPayable * 100)) {
      setSaveError(`Allocated amount across tasks must equal total payable (₹${totalPayable.toFixed(2)}) or remove task allocations to save as direct invoice.`);
      return;
    }

    const payload = {
      date: invoiceDate,
      dueDate: dueDate,
      billingOrg: orgName,
      billingAddress: formattedOrgAddress,
      clientId: selectedClient.id,
      clientBusinessName: selectedClient.name,
      clientLegalName: selectedClient.legalName || selectedClient.name,
      clientGroup: selectedClient.group,
      clientGstin: (selectedClient as any).gstin || '',
      clientAddress: selectedClient.address || '',
      clientPan: selectedClient.pan || '',
      services,
      subTotal,
      totalPayable,
      tdsExcludedAmount: subTotal,
      currency: 'INR',
      bankAccountId: selectedBankId,
      notes: note || undefined,
      placeOfSupply: selectedClient.state || '',
    };

    setIsSaving(true);
    setSaveError('');
    try {
      if (isEdit && initialData) {
        await updateInvoice(initialData.id, payload);
        onBack();
        return;
      }
      if (isProforma) await addProforma(payload, allocations);
      else await addInvoice(payload, allocations);
      onBack();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The invoice could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderInvoiceLivePreview = () => (
    <InvoiceLivePreview
      template={activeFormat}
      accentColor={activeInvoiceColor}
      firmName={orgName}
      firmAddress={formattedOrgAddress}
      firmGstin={(selectedOrg?.addressDetails as any)?.gstin || (selectedOrg as any)?.gstin}
      firmPan={(selectedOrg?.addressDetails as any)?.pan || (selectedOrg as any)?.pan}
      firmLogoUrl={selectedOrg?.invoiceSettings?.firmLogoUrl}
      digitalSignatureUrl={selectedOrg?.invoiceSettings?.digitalSignatureUrl}
      showCaLogo={selectedOrg?.invoiceSettings?.showCaLogo ?? true}
      showHsnSac={printColumns.hsnSac}
      showQuantity={printColumns.qty}
      showDescription={printColumns.description}
      showCgst={printColumns.cgst}
      showSgst={printColumns.sgst}
      invoiceType={type}
      title={isProforma ? "Proforma Invoice" : "Tax Invoice"}
      invoiceNumber={initialData?.number || "INV/2026-001"}
      invoiceDate={invoiceDate}
      dueDate={dueDate}
      clientName={selectedClient?.name}
      clientLegalName={selectedClient?.legalName || selectedClient?.name}
      clientAddress={selectedClient?.address}
      clientGstin={(selectedClient as any)?.gstin}
      clientPan={selectedClient?.pan}
      items={services.map((s, idx) => {
        const taxable = s.amount || 0;
        const itemCgst = Math.round((taxable * 0.09) * 100) / 100;
        const itemSgst = Math.round((taxable * 0.09) * 100) / 100;
        return {
          id: s.id || String(idx + 1),
          name: s.serviceName || "Service Item",
          description: s.description || (s.compliancePeriod ? `Period: ${s.compliancePeriod}` : undefined),
          hsnSac: (s as any).hsnSac || "998211",
          qty: s.quantity || 1,
          rate: s.price || 0,
          taxable,
          gstRate: 18,
          cgst: itemCgst,
          sgst: itemSgst,
          total: taxable + itemCgst + itemSgst,
        };
      })}
      subtotal={subTotal}
      taxableAmount={subTotal}
      cgstTotal={cgstAmount}
      sgstTotal={sgstAmount}
      totalAmount={totalPayable}
      notes={note || selectedOrg?.invoiceSettings?.defaultInvoiceNote}
      bankName={selectedBank?.bankName || selectedOrg?.paymentDetails?.bankDetails?.bankName || "HDFC Bank"}
      accountHolderName={selectedBank?.accountBusinessName || selectedOrg?.paymentDetails?.bankDetails?.accountHolderName || orgName}
      accountNumber={selectedBank?.accountNumber || selectedOrg?.paymentDetails?.bankDetails?.accountNumber || "50200012345678"}
      ifscCode={selectedBank?.ifscCode || selectedOrg?.paymentDetails?.bankDetails?.ifscCode || "HDFC0001234"}
      branchName={selectedBank?.branchAddress || (selectedBank as any)?.branchName || selectedOrg?.paymentDetails?.bankDetails?.branchName || "Koramangala, Bengaluru"}
      upiId={selectedBank?.upi || (selectedBank as any)?.upiId || selectedOrg?.paymentDetails?.bankDetails?.upiId || "sharma@hdfc"}
    />
  );

  return (
    <div className="w-full flex-1 flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] select-none text-gray-800 dark:text-gray-200 transition-colors">
      {/* Outer Single White Card Shell - dynamically widens in split partition mode */}
      <div className={`w-full bg-white dark:bg-[#1e293b] rounded-xl border border-[#e5e7eb] dark:border-[#334155] shadow-xs ${isPreviewActive ? 'p-5 sm:p-7 max-w-[2100px]' : 'p-7 sm:p-9 max-w-7xl'} mx-auto flex flex-col gap-8`}>

        {/* Section 1: Top Breadcrumb & Format Switcher Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#f1f5f9] dark:border-[#334155]/60 print:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <button
              type="button"
              onClick={onBack}
              className="text-[#3D6A9E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>‹ {titlePrefix} List</span>
            </button>
            <span className="text-gray-400">›</span>
            <span className="text-gray-900 dark:text-white font-bold">
              {isView
                ? `View ${initialData?.number || titlePrefix}`
                : isEdit
                  ? `Edit ${initialData?.number || titlePrefix}`
                  : `Add ${titlePrefix}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switcher */}
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl text-xs border border-gray-200 dark:border-gray-700 shadow-2xs">
              <span className="text-[11px] font-semibold text-gray-500 px-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3 text-[#3D6A9E]" />
                Format:
              </span>
              {(["modern", "classic", "minimal"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleChangeFormat(fmt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${activeFormat === fmt
                    ? "bg-white dark:bg-gray-900 text-[#3D6A9E] font-bold shadow-xs border border-gray-200 dark:border-gray-700"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  title={`Change format to ${fmt}`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Toggle Preview / Form Button (when drafting or editing) */}
            {!isView && (
              <button
                type="button"
                onClick={() => setIsPreviewActive((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${isPreviewActive
                  ? "bg-[#3D6A9E] text-white border-[#3D6A9E] shadow-sm ring-2 ring-[#3D6A9E]/20"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50"
                  }`}
                title={isPreviewActive ? "Exit split partition preview" : "Partition screen: Edit on left, live invoice preview on right"}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isPreviewActive ? "Split Preview (Active)" : "Live Preview"}</span>
              </button>
            )}

            {/* Columns Selector Dropdown (when viewing or previewing) */}
            {(isView || isPreviewActive) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColumnDropdown((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] hover:bg-gray-50 dark:hover:bg-[#0f172a] text-gray-700 dark:text-gray-300 transition-colors cursor-pointer text-xs font-semibold"
                  title="Choose which columns will print"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#3D6A9E]" />
                  <span>Columns</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#3D6A9E]/15 text-[#3D6A9E] font-bold">
                    {[printColumns.hsnSac, printColumns.qty, printColumns.description, printColumns.cgst, printColumns.sgst].filter(Boolean).length}/5
                  </span>
                </button>

                {showColumnDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 mb-1 border-b border-gray-100 dark:border-gray-700">
                      Print Columns
                    </div>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printColumns.hsnSac}
                        onChange={() => handleToggleColumn("hsnSac")}
                        className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                      />
                      <span className="font-medium">HSN / SAC</span>
                    </label>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printColumns.qty}
                        onChange={() => handleToggleColumn("qty")}
                        className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                      />
                      <span className="font-medium">Quantity (QTY)</span>
                    </label>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printColumns.description}
                        onChange={() => handleToggleColumn("description")}
                        className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                      />
                      <span className="font-medium">Item Description</span>
                    </label>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printColumns.cgst}
                        onChange={() => handleToggleColumn("cgst")}
                        className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                      />
                      <span className="font-medium">CGST</span>
                    </label>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printColumns.sgst}
                        onChange={() => handleToggleColumn("sgst")}
                        className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                      />
                      <span className="font-medium">SGST</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Print & Download PDF buttons (when viewing/previewing) */}
            {(isView || isPreviewActive) && (
              <>
                <button
                  type="button"
                  onClick={() => printInvoiceElement("invoice-printable-root")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] hover:bg-gray-50 dark:hover:bg-[#0f172a] text-gray-600 dark:text-gray-300 transition-colors cursor-pointer text-xs font-semibold"
                  title="Print Invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-[#3D6A9E]" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] hover:bg-gray-50 dark:hover:bg-[#0f172a] text-gray-600 dark:text-gray-300 transition-colors cursor-pointer text-xs font-semibold disabled:opacity-50"
                  title="Download as PDF"
                >
                  <Download className={`w-3.5 h-3.5 text-[#3D6A9E] ${isDownloadingPDF ? "animate-bounce" : ""}`} />
                  <span>{isDownloadingPDF ? "Downloading..." : "Download PDF"}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded border border-[#dde2e8] dark:border-[#475569] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#0f172a] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Mode OR Partitioned Split Live Preview OR Standard Form Mode */}
        {isView ? (
          <div className="w-full flex flex-col gap-6 animate-in fade-in duration-150 print:p-0 print:m-0">
            <div className="max-w-4xl mx-auto w-full shadow-lg rounded-xl overflow-hidden border border-gray-200/90 dark:border-gray-800 print:max-w-none print:shadow-none print:border-none print:rounded-none">
              {renderInvoiceLivePreview()}
            </div>

            <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-gray-100 dark:border-gray-800 pb-4 print:hidden">
              {saveError && <p role="alert" className="mr-auto text-xs text-red-600 font-semibold">{saveError}</p>}
              <button
                type="button"
                onClick={() => {
                  setCurrentMode('edit');
                  setIsPreviewActive(false);
                }}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-[#3D6A9E] hover:bg-[#325884] text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Invoice Data</span>
              </button>
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] text-gray-700 dark:text-gray-300 hover:bg-gray-50 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div
            ref={splitContainerRef}
            className={
              isPreviewActive
                ? "w-full flex flex-col xl:flex-row gap-4 xl:gap-0 items-start animate-in fade-in duration-200 relative"
                : "w-full flex flex-col gap-8 animate-in fade-in duration-200"
            }
          >
            {/* Left Partition: Interactive Form Controls (Left side you change) */}
            <div
              style={isPreviewActive ? { width: `calc(${100 - previewWidth}% - 12px)` } : undefined}
              className={isPreviewActive ? "w-full flex flex-col gap-8 min-w-0 transition-all duration-75 pr-0 xl:pr-3" : "w-full flex flex-col gap-8"}
            >
              {/* Section 2: Header Block: Left Avatar & Right Vertically Stacked Number & Dates */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 sm:gap-8">
                {/* Organization Circular Avatar */}
                <div className="w-20 h-20 rounded-full bg-[#eeedfd] dark:bg-[#3D6A9E]/20 flex items-center justify-center text-[#3D6A9E] text-2xl font-bold tracking-tight shadow-xs shrink-0">
                  {orgInitials}
                </div>

                {/* Dedicated Right Column: Vertically Stacked No, Date, Due Date with 20px gap */}
                <div className="w-full sm:w-72 md:w-80 flex flex-col gap-5">
                  {/* Number (Read-only grey input box) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {titlePrefix} No
                    </label>
                    <input
                      type="text"
                      disabled
                      value={initialData?.number || ''}
                      placeholder="Auto-generated"
                      className="w-full h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-gray-100 dark:bg-gray-800/60 text-xs text-gray-500 cursor-not-allowed outline-none"
                    />
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {titlePrefix} Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full h-10 pl-3.5 pr-9 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                      />
                      <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full h-10 pl-3.5 pr-9 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                      />
                      <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Two Roomy Cards: Billing Organization vs Proforma/Invoice To */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Card 1: Billing Organization */}
                <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-6 sm:p-7 flex flex-col gap-4 shadow-2xs">
                  <div className="flex flex-col gap-3.5">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white">
                      Billing Organization <span className="font-normal text-gray-500 text-xs">(Your details)</span>
                    </label>

                    <select
                      disabled={isView || organizations.length <= 1}
                      value={selectedOrgId || (selectedOrg ? (selectedOrg.id || (selectedOrg as any)._id) : '')}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E] cursor-pointer disabled:bg-gray-50 dark:disabled:bg-[#0f172a]/60 disabled:cursor-default"
                    >
                      {organizations.length > 0 ? (
                        organizations.map((org, index) => {
                          const oId = org.id || (org as any)._id || `org-${index}`;
                          return (
                            <option key={oId} value={oId}>
                              {org.name}
                            </option>
                          );
                        })
                      ) : (
                        <option value="">{orgName}</option>
                      )}
                    </select>
                  </div>

                  {/* Business Details Panel */}
                  <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] p-6 text-xs flex flex-col gap-3.5 bg-[#f9fafb] dark:bg-[#0f172a]/50">
                    <div className="font-bold text-gray-900 dark:text-white text-xs">
                      Business Details
                    </div>
                    <div className="flex items-start">
                      <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Business Name</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{orgName}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Address</span>
                      <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{formattedOrgAddress}</span>
                    </div>
                    <div className="flex items-center pt-2 border-b border-dotted border-gray-300 dark:border-gray-700 pb-3">
                      <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Priority</span>
                      <span className="px-2.5 py-0.5 rounded border border-[#3D6A9E] text-[#3D6A9E] bg-white dark:bg-[#1e293b] text-xs font-semibold">
                        {(selectedOrg as any)?.priority || (organizations.indexOf(selectedOrg as any) === 0 ? "Primary" : "Secondary")}
                      </span>
                    </div>
                    {selectedOrg?.gstin && (
                      <div className="flex items-center">
                        <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">GSTIN</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{selectedOrg.gstin}</span>
                      </div>
                    )}
                    {selectedOrg?.pan && (
                      <div className="flex items-center">
                        <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">PAN</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{selectedOrg.pan}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 2: Client Organization */}
                <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-6 sm:p-7 flex flex-col gap-4 shadow-2xs">
                  <div className="flex flex-col gap-3.5">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white">
                      {titlePrefix} To <span className="font-normal text-gray-500 text-xs">(Client's details)</span>
                    </label>

                    <select
                      value={selectedClientId}
                      onChange={(e) => { setSelectedClientId(e.target.value); setTaskAllocations([]); }}
                      className="w-full h-11 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E] cursor-pointer"
                    >
                      <option value="">Select Client/Business from list</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Client Details Panel or Centered Placeholder */}
                  {selectedClient ? (
                    <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] p-6 text-xs flex flex-col gap-3.5 bg-[#f9fafb] dark:bg-[#0f172a]/50 animate-in fade-in duration-100">
                      <div className="flex justify-between items-center pb-1">
                        <span className="font-bold text-gray-900 dark:text-white">Client Details</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-[#3D6A9E] font-semibold">
                          {selectedClient.group}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Legal Name</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedClient.legalName}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">PAN</span>
                        <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{selectedClient.pan || '—'}</span>
                      </div>
                      <div className="flex items-start border-b border-dotted border-gray-300 dark:border-gray-700 pb-3">
                        <span className="w-28 text-gray-500 dark:text-gray-400 shrink-0">Address</span>
                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedClient.address}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#dde2e8] dark:border-[#334155] py-14 px-6 text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center min-h-[160px]">
                      Select Client/Business from list
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Services Table Section with Taller Purple Header */}
              <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden shadow-xs flex flex-col">
                {/* Taller Purple Header Bar */}
                <div className="bg-[#6366f1] text-white px-6 py-3.5 grid grid-cols-12 gap-3 text-xs font-semibold tracking-tight items-center">
                  <div className="col-span-5">Services</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Amount</div>
                  <div className="col-span-1 text-right">Total</div>
                </div>

                {/* Service Rows (20px top padding from purple header, 20px gap between rows) */}
                <div className="flex flex-col divide-y divide-[#e5e7eb] dark:divide-[#334155] p-6 gap-5">
                  {services.map((srv) => (
                    <div key={srv.id} className="pt-5 first:pt-0 flex flex-col gap-4">
                      {/* Main Row */}
                      <div className="grid grid-cols-12 gap-3 items-center text-xs">
                        {/* Service Name Dropdown */}
                        <div className="col-span-5">
                          <select
                            value={srv.serviceName}
                            onChange={(e) => handleServiceChange(srv.id, 'serviceName', e.target.value)}
                            className="w-full h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
                          >
                            <option value="">Service Name</option>
                            {serviceCatalog.map((service) => (
                              <option key={service.id} value={service.name}>
                                {service.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            min={1}
                            value={srv.quantity}
                            onChange={(e) => handleServiceChange(srv.id, 'quantity', e.target.value)}
                            className="w-full h-10 text-center px-2 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                          />
                        </div>

                        {/* Price (Empty by default) */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            min={0}
                            placeholder=""
                            value={srv.price === 0 ? '' : srv.price}
                            onChange={(e) => handleServiceChange(srv.id, 'price', e.target.value)}
                            className="w-full h-10 text-center px-2 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                          />
                        </div>

                        {/* Amount (read-only) */}
                        <div className="col-span-2">
                          <input
                            type="text"
                            disabled
                            value={srv.amount === 0 ? '0' : srv.amount}
                            className="w-full h-10 text-center px-2 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 outline-none"
                          />
                        </div>

                        {/* Total & Trash */}
                        <div className="col-span-1 flex items-center justify-end gap-2 font-bold text-gray-900 dark:text-white">
                          <span>₹{srv.total.toFixed(2)}</span>
                          {services.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveService(srv.id)}
                              className="text-red-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                              title="Delete Service Row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sub-Row: Description (with 0/300 counter) + Compliance Period */}
                      <div className="grid grid-cols-12 gap-4 items-start text-xs pt-1">
                        {/* Description Input with 8px label gap and 6px counter gap */}
                        <div className="col-span-5 flex flex-col gap-2">
                          <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            Description
                          </label>
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="text"
                              maxLength={300}
                              placeholder="Description"
                              value={srv.description}
                              onChange={(e) => handleServiceChange(srv.id, 'description', e.target.value)}
                              className="w-full h-10 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none focus:border-[#3D6A9E]"
                            />
                            <span className="text-[10px] text-gray-400 text-right">
                              {srv.description.length}/300
                            </span>
                          </div>
                        </div>

                        {/* Compliance Period Selects */}
                        <div className="col-span-7 flex flex-col gap-2">
                          <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            Compliance Period
                          </label>
                          <div className="grid grid-cols-3 gap-2.5">
                            <select
                              value={srv.compliancePeriod}
                              onChange={(e) => handleServiceChange(srv.id, 'compliancePeriod', e.target.value)}
                              className="w-full h-10 px-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none"
                            >
                              <option value="FY 2026-27">FY 2026-27</option>
                              <option value="FY 2025-26">FY 2025-26</option>
                            </select>

                            <select
                              value={srv.frequency}
                              onChange={(e) => handleServiceChange(srv.id, 'frequency', e.target.value)}
                              className="w-full h-10 px-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none"
                            >
                              <option value="One-Time">One-Time</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Quarterly">Quarterly</option>
                              <option value="Half Yearly">Half Yearly</option>
                              <option value="Annual">Annual</option>
                            </select>

                            <select
                              value={srv.periodLabel}
                              onChange={(e) => handleServiceChange(srv.id, 'periodLabel', e.target.value)}
                              className="w-full h-10 px-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs outline-none"
                            >
                              <option value="N/A - One-Time">N/A - One-Time</option>
                              <option value="Q1 (Apr-Jun)">Q1 (Apr-Jun)</option>
                              <option value="Q2 (Jul-Sep)">Q2 (Jul-Sep)</option>
                              <option value="Q3 (Oct-Dec)">Q3 (Oct-Dec)</option>
                              <option value="Q4 (Jan-Mar)">Q4 (Jan-Mar)</option>
                              <option value="Annual">Annual</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Outlined Purple Add Service Buttons (20px top, 20px bottom, 12px gap) */}
                <div className="p-5 border-t border-[#e5e7eb] dark:border-[#334155] flex items-center gap-3 bg-gray-50/50 dark:bg-[#0f172a]/20">
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#3D6A9E] text-[#3D6A9E] hover:bg-[#eeedfd] dark:hover:bg-[#3D6A9E]/20 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Service</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddReimbursementItem}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#3D6A9E] text-[#3D6A9E] hover:bg-[#eeedfd] dark:hover:bg-[#3D6A9E]/20 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Reimbursement</span>
                  </button>
                </div>
              </div>

              {/* Task level invoice allocation: report revenue uses these explicit issued amounts. */}
              <section className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] p-5 flex flex-col gap-3" aria-labelledby="task-allocation-heading">
                <div>
                  <h2 id="task-allocation-heading" className="text-sm font-bold text-gray-900 dark:text-white">Task Revenue Allocation</h2>
                  <p className="mt-1 text-xs text-gray-500">Allocate the full invoice amount directly to tasks so task revenue is fully attributable.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select value={allocationTaskId} onChange={(event) => setAllocationTaskId(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border px-3 text-xs dark:bg-slate-900">
                    <option value="">Select a task</option>
                    {tasks.filter((task) => task.clientId === selectedClientId).map((task) => <option key={task.taskId} value={task.taskId}>{task.taskId} · {task.clientName} · {task.serviceName}</option>)}
                  </select>
                  <button type="button" disabled={!allocationTaskId || taskAllocations.some((row) => row.taskId === allocationTaskId)} onClick={() => { setTaskAllocations((rows) => [...rows, { taskId: allocationTaskId, amount: '' }]); setAllocationTaskId(''); }} className="h-10 rounded-md border px-4 text-xs font-semibold disabled:opacity-50">Add task</button>
                </div>
                {taskAllocations.map((allocation) => {
                  const task = tasks.find((item) => item.taskId === allocation.taskId);
                  return <div key={allocation.taskId} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] items-center gap-2 rounded-md bg-gray-50 p-2 dark:bg-slate-900">
                    <span className="text-xs">{task?.taskId} · {task?.clientName} · {task?.serviceName}</span>
                    <label className="flex items-center gap-2 text-xs">Allocated (₹)<input aria-label={`Amount allocated to ${task?.taskId}`} type="number" min="0.01" step="0.01" value={allocation.amount} onChange={(event) => setTaskAllocations((rows) => rows.map((row) => row.taskId === allocation.taskId ? { ...row, amount: event.target.value } : row))} className="h-9 min-w-0 flex-1 rounded border px-2 dark:bg-slate-800" /></label>
                    <button type="button" aria-label={`Remove allocation for ${task?.taskId}`} onClick={() => setTaskAllocations((rows) => rows.filter((row) => row.taskId !== allocation.taskId))} className="px-2 py-1 text-xs text-red-600">Remove</button>
                  </div>;
                })}
                {taskAllocations.length > 0 && <p className="text-xs text-gray-500">Allocated: ₹{(taskAllocations.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)).toFixed(2)} / ₹{totalPayable.toFixed(2)}</p>}
              </section>

              {/* Section 5: Bank Account Section & Totals Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
                {/* Bank Account Card (Left 7 Cols) */}
                <div className="md:col-span-7 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Bank Account
                    </label>

                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E] cursor-pointer"
                    >
                      <option value="">No bank accounts - Add Bank Account in Settings</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountNumber} ({b.accountType}) {b.isPrimary ? '• Primary' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Empty State Card or Selected Bank Card (24px-28px padding) */}
                  <div className="rounded-xl border border-[#e5e7eb] dark:border-[#334155] p-6 sm:p-7 text-xs flex flex-col gap-4 bg-[#f9fafb] dark:bg-[#0f172a]/40 shadow-2xs">
                    {selectedBank ? (
                      <div className="flex flex-col gap-2 pb-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">{selectedBank.bankName}</span>
                          {selectedBank.isPrimary && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-gray-700 dark:text-gray-300">
                          A/C: <span className="font-mono font-medium">{selectedBank.accountNumber}</span> | IFSC: <span className="font-mono font-medium">{selectedBank.ifscCode}</span>
                        </div>
                        <div className="text-gray-500 text-[11px]">{selectedBank.branchAddress}</div>
                      </div>
                    ) : (
                      <div className="text-center py-6 flex flex-col items-center justify-center gap-2">
                        <p className="text-xs text-gray-500">No Bank Account Added click below to add</p>
                        <button
                          type="button"
                          onClick={() => setIsAddBankModalOpen(true)}
                          className="inline-flex items-center gap-1 text-[#3D6A9E] hover:underline font-semibold text-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Bank Account</span>
                        </button>
                      </div>
                    )}

                    {/* Dotted Divider & Currency Code */}
                    <div className="pt-3 border-t border-dotted border-gray-300 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Currency Code</span>
                      <span className="font-semibold text-gray-900 dark:text-white">INR</span>
                    </div>
                  </div>
                </div>

                {/* Totals Card (Right 5 Cols) (24px-28px padding) */}
                <div className="md:col-span-5 rounded-xl border border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-6 sm:p-7 flex flex-col gap-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Sub Total</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      ₹{subTotal.toFixed(2)}
                    </span>
                  </div>

                  {printColumns.cgst && (
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>CGST (9%)</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        ₹{cgstAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {printColumns.sgst && (
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>SGST (9%)</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        ₹{sgstAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-dotted border-gray-300 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Total Payable
                    </span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      ₹{totalPayable.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 6: Note Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <FileEdit className="w-4 h-4 text-gray-500" />
                  <span>Note</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="No note added"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#3D6A9E]"
                />
              </div>

              {/* Section 7: Footer Actions (28px padding below buttons) */}
              <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-gray-100 dark:border-gray-800 pb-7">
                {saveError && <p role="alert" className="mr-auto text-xs text-red-600">{saveError}</p>}
                <button
                  type="button"
                  onClick={onBack}
                  className="px-6 py-2.5 rounded-lg border border-[#3D6A9E] text-[#3D6A9E] hover:bg-[#eeedfd]/50 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {isView ? 'Close' : 'Cancel'}
                </button>
                {!isView && (
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="px-7 py-2.5 rounded-lg bg-[#3D6A9E] hover:bg-[#6357e8] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-98"
                  >
                    {isSaving ? 'Saving…' : isEdit ? 'Update' : 'Save'}
                  </button>
                )}
              </div>
            </div>

            {/* Draggable Width Divider (between Form and Live Preview on desktop) */}
            {isPreviewActive && (
              <div
                onMouseDown={handleMouseDownWidthResize}
                className={`hidden xl:flex items-center justify-center w-5 -mx-1 cursor-col-resize select-none group z-30 self-stretch ${
                  isDraggingWidth ? 'cursor-col-resize' : ''
                }`}
                title="Click & drag horizontally to adjust preview width"
              >
                <div
                  className={`w-1.5 h-36 rounded-full transition-colors flex items-center justify-center ${
                    isDraggingWidth
                      ? 'bg-[#3D6A9E] shadow-md ring-2 ring-[#3D6A9E]/30'
                      : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-[#3D6A9E]'
                  }`}
                >
                  <GripVertical className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )}

            {/* Right Partition: Real-Time Live Preview (Right side with adjustable height and width) */}
            {isPreviewActive && (
              <div
                style={{ width: `${previewWidth}%` }}
                className="w-full xl:min-w-[360px] sticky top-4 flex flex-col gap-2.5 min-w-0 transition-all duration-75 pl-0 xl:pl-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800/80 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                      Live Preview
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {previewWidth}% W
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Big Window Button: Opens full proper invoice modal */}
                    <button
                      type="button"
                      onClick={() => setIsBigWindowModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D6A9E] hover:bg-[#325884] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
                      title="Open full proper invoice in Big Window modal"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Big Window</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => printInvoiceElement("invoice-printable-root")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] hover:bg-gray-100 dark:hover:bg-[#0f172a] text-gray-600 dark:text-gray-300 text-xs font-semibold cursor-pointer transition-colors"
                      title="Print Invoice"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#3D6A9E]" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      disabled={isDownloadingPDF}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] hover:bg-gray-100 dark:hover:bg-[#0f172a] text-gray-600 dark:text-gray-300 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                      title="Download as PDF"
                    >
                      <Download className={`w-3.5 h-3.5 text-[#3D6A9E] ${isDownloadingPDF ? "animate-bounce" : ""}`} />
                      <span>{isDownloadingPDF ? "..." : "PDF"}</span>
                    </button>
                  </div>
                </div>

                {/* Preview Viewport with Adjustable Height & Width */}
                <div
                  ref={previewCardRef}
                  style={{
                    height: isHeightAuto ? 'auto' : `${previewHeight}px`,
                    maxHeight: isHeightAuto ? 'none' : `${previewHeight}px`,
                  }}
                  className="w-full overflow-y-auto overflow-x-auto rounded-xl shadow-lg border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-75 relative"
                >
                  <div className="w-full">
                    {renderInvoiceLivePreview()}
                  </div>
                </div>

                {/* Vertical Height Resizing Bar at Bottom */}
                {!isHeightAuto && (
                  <div
                    onMouseDown={handleMouseDownHeightResize}
                    onDoubleClick={() => setPreviewHeight(780)}
                    className={`w-full h-5 -mt-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center cursor-row-resize select-none transition-all group shadow-2xs ${
                      isDraggingHeight ? 'bg-gray-200 dark:bg-gray-700' : ''
                    }`}
                    title="Click and drag vertically to resize preview height (Double-click to reset to 780px)"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 bg-gray-300 dark:bg-gray-500 group-hover:bg-[#3D6A9E] rounded-full transition-colors flex items-center justify-center">
                        <GripHorizontal className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                      </div>
                      <span className="text-[9px] font-mono text-gray-500 group-hover:text-[#3D6A9E] dark:group-hover:text-white transition-colors">
                        {previewHeight}px H
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Big Window Full Invoice Modal */}
      {isBigWindowModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBigWindowModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Big Window Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-850 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Invoice Preview — Big Window
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#3D6A9E]/10 text-[#3D6A9E]">
                  {initialData?.number || "INV/2026-001"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Small Window Button to return to split view */}
                <button
                  type="button"
                  onClick={() => setIsBigWindowModalOpen(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#3D6A9E] hover:bg-[#325884] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Return to side-by-side Small Window"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Small Window</span>
                </button>

                <button
                  type="button"
                  onClick={() => printInvoiceElement("invoice-printable-root-modal")}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold cursor-pointer transition-colors"
                  title="Print Invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-[#3D6A9E]" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#dde2e8] dark:border-[#475569] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                  title="Download as PDF"
                >
                  <Download className={`w-3.5 h-3.5 text-[#3D6A9E] ${isDownloadingPDF ? "animate-bounce" : ""}`} />
                  <span>{isDownloadingPDF ? "Downloading..." : "PDF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBigWindowModalOpen(false)}
                  className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Close modal (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Big Window Modal Body: Proper full invoice view */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-gray-100/70 dark:bg-gray-950/70">
              <div id="invoice-printable-root-modal" className="max-w-4xl mx-auto shadow-lg rounded-xl overflow-hidden border border-gray-200/90 dark:border-gray-800 bg-white">
                {renderInvoiceLivePreview()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      <AddBankAccountModal
        isOpen={isAddBankModalOpen}
        onClose={() => setIsAddBankModalOpen(false)}
        onSuccess={(acc) => setSelectedBankId(acc.id)}
      />
    </div>
  );
};
