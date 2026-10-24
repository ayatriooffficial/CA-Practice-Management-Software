"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Calendar, ChevronDown, Check, CreditCard, ChevronUp } from "lucide-react";
import { Lead, STATES } from "@/data/crmData";
import { useCreateQuotation } from "@/hooks/useQuotationsQuery";
import { QuotationItem, QuotationBankDetails } from "@/services/quotationApi";
import { organizationApi } from "@/services/organizationApi";
import { serviceApi } from "@/services/serviceApi";
import { appSyncService } from "@/services/appSyncService";

interface AddQuotationModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddQuotationModal: React.FC<AddQuotationModalProps> = ({
  lead,
  onClose,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const createMutation = useCreateQuotation();

  // Quotation Metadata
  const [quotationDate, setQuotationDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(todayStr);

  // Billing Org State (Fetched dynamically from Database)
  const [billingOrgName, setBillingOrgName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingGstin, setBillingGstin] = useState("");
  const [billingPan, setBillingPan] = useState("");
  const [lutNumber, setLutNumber] = useState("");
  const [lutDisabled, setLutDisabled] = useState(false);
  const [billingEmail, setBillingEmail] = useState("");
  const [billingMobile, setBillingMobile] = useState("");
  const [billingWebsite, setBillingWebsite] = useState("");

  // Payment & Bank Details State (Linked to Organization Schema in DB)
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [bankDetails, setBankDetails] = useState<QuotationBankDetails>({
    paymentType: "Bank",
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    accountType: "Current",
    bankBranch: "",
    upi: "",
    currencyCode: "INR",
  });

  // Quotation To (Lead) State
  const initialLeadAddress = lead.addressDetails
    ? [
      lead.addressDetails.addressLine1,
      lead.addressDetails.addressLine2,
      lead.addressDetails.city,
      lead.addressDetails.pincode,
    ]
      .filter(Boolean)
      .join(", ")
    : (lead.address || "");

  const initialLeadState = lead.addressDetails?.state || lead.state || "Maharashtra";
  const matchedState = STATES.find(
    (s) => s.label.toLowerCase() === initialLeadState.toLowerCase()
  );
  const initialLeadStateCode = lead.addressDetails?.stateCode || matchedState?.code || "27";

  const [leadBusinessName, setLeadBusinessName] = useState(lead.businessName || lead.fullName);
  const [leadAddressLine, setLeadAddressLine] = useState(initialLeadAddress);
  const [leadState, setLeadState] = useState(matchedState?.label || initialLeadState);
  const [leadStateCode, setLeadStateCode] = useState(initialLeadStateCode);
  const [leadGstin, setLeadGstin] = useState(lead.gstin || "");

  // Dynamic Services fetched from Organization's services in DB (synchronized with backend)
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [customMode, setCustomMode] = useState<Record<string, boolean>>({});

  const [orgServices, setOrgServices] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      hsn: string;
      price: number;
      taxRate: number;
      description?: string;
    }>
  >(() => {
    try {
      const initial = appSyncService.getServices();
      return (initial || []).map((s) => {
        const rawTax = String(s.taxRate || "18").replace("%", "").trim();
        return {
          id: s.id || (s as any)._id || s.name,
          name: s.name,
          category: s.category || "General",
          hsn: s.sacCode || "998311",
          price: Number(s.professionalFee) || 0,
          taxRate: Number(rawTax) || 18,
          description: s.description || "",
        };
      });
    } catch {
      return [];
    }
  });

  // Group backend services by category for clean optgroups in dropdown
  const servicesByCategory = useMemo(() => {
    const map: Record<string, typeof orgServices> = {};
    for (const svc of orgServices) {
      const cat = svc.category || "General Services";
      if (!map[cat]) map[cat] = [];
      map[cat].push(svc);
    }
    return map;
  }, [orgServices]);

  // Line Items State
  const [items, setItems] = useState<QuotationItem[]>(() => {
    try {
      const initial = appSyncService.getServices();
      if (initial && initial.length > 0) {
        const first = initial[0];
        const rawTax = String(first.taxRate || "18").replace("%", "").trim();
        const taxRate = Number(rawTax) || 18;
        const price = Number(first.professionalFee) || 0;
        const tax = (price * taxRate) / 100;
        return [
          {
            id: "item-1",
            serviceId: first.id || (first as any)._id,
            serviceName: first.name,
            hsnSac: first.sacCode || "998311",
            quantity: 1,
            price: price,
            discountType: "percentage",
            discountValue: 0,
            taxRate: taxRate,
            sgst: tax / 2,
            cgst: tax / 2,
            igst: 0,
            amount: price,
            total: price + tax,
            description: first.description || "",
            isReimbursement: false,
          },
        ];
      }
    } catch {}
    return [
      {
        id: "item-1",
        serviceName: "",
        hsnSac: "998311",
        quantity: 1,
        price: 0,
        discountType: "percentage",
        discountValue: 0,
        taxRate: 18,
        sgst: 0,
        cgst: 0,
        igst: 0,
        amount: 0,
        total: 0,
        description: "",
        isReimbursement: false,
      },
    ];
  });

  // Calculations
  const calculateItem = (item: QuotationItem): QuotationItem => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const base = qty * price;

    let discount = 0;
    if (item.discountType === "flat") {
      discount = Number(item.discountValue) || 0;
    } else {
      discount = (base * (Number(item.discountValue) || 0)) / 100;
    }

    const discounted = Math.max(0, base - discount);
    const taxRate = Number(item.taxRate) || 0;
    const tax = (discounted * taxRate) / 100;
    const halfTax = tax / 2;

    return {
      ...item,
      amount: discounted,
      sgst: halfTax,
      cgst: halfTax,
      igst: 0,
      total: discounted + tax,
    };
  };

  // Fetch Organization details & Services on mount
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch organization details from DB
    organizationApi
      .getOrganization()
      .then((res) => {
        if (!isMounted || !res.success || !res.data) return;
        const org = res.data;
        if (org.name) setBillingOrgName(org.name);

        // Format address from addressDetails or flat address
        let formattedAddr = "";
        if (org.addressDetails) {
          const parts = [
            org.addressDetails.addressLine1,
            org.addressDetails.addressLine2,
            org.addressDetails.city,
            org.addressDetails.pincode,
            org.addressDetails.state,
            org.addressDetails.country,
          ].filter(Boolean);
          if (parts.length > 0) {
            formattedAddr = parts.join(", ");
          }
        }
        if (!formattedAddr && org.address) {
          formattedAddr = org.address;
        }
        setBillingAddress(formattedAddr);
        setBillingGstin(org.gstin || "");
        setBillingPan(org.pan || "");
        setLutNumber(org.lutNumber || "");
        if (org.lutDisabled !== undefined) {
          setLutDisabled(org.lutDisabled);
        }
        setBillingEmail(org.email || "");
        setBillingMobile(org.mobile || "");
        setBillingWebsite(org.website || "");

        // Payment / Bank Details from Organization DB
        const bank = org.paymentDetails?.bankDetails;
        if (bank) {
          setBankDetails({
            paymentType: org.paymentDetails?.paymentMode || "Bank",
            bankName: bank.bankName || "",
            accountName: bank.accountHolderName || org.name || "",
            accountNumber: bank.accountNumber || "",
            ifsc: bank.ifscCode || "",
            accountType: bank.accountType || "Current",
            bankBranch: bank.branchName || "",
            upi: bank.upiId || "",
            currencyCode: org.paymentDetails?.currency || "INR",
          });
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch organization billing details:", err);
      });

    // 2. Fetch organization services from backend DB (matching Task Section)
    setIsLoadingServices(true);
    serviceApi
      .getServices({ limit: 100 })
      .then((res) => {
        if (!isMounted || !res.data) return;
        const fetched = res.data.map((s) => {
          const rawTax = String(s.taxRate || "18").replace("%", "").trim();
          const numericTax = Number(rawTax) || 18;
          return {
            id: s.id || (s as any)._id || s.name,
            name: s.name,
            category: s.category || "General",
            hsn: s.sacCode || "998311",
            price: Number(s.professionalFee) || 0,
            taxRate: numericTax,
            description: s.description || "",
          };
        });

        if (fetched.length > 0) {
          setOrgServices(fetched);

          // Pre-populate first item if currently empty
          setItems((prev) => {
            if (prev.length === 1 && !prev[0].serviceName) {
              const first = fetched[0];
              return [
                calculateItem({
                  ...prev[0],
                  serviceId: first.id,
                  serviceName: first.name,
                  hsnSac: first.hsn,
                  price: first.price,
                  taxRate: first.taxRate,
                  description: first.description || "",
                }),
              ];
            }
            return prev;
          });
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch organization services from backend:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingServices(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleItemChange = (index: number, updates: Partial<QuotationItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = calculateItem({ ...copy[index], ...updates });
      return copy;
    });
  };

  const handleSelectServicePreset = (index: number, serviceNameOrId: string) => {
    const found = orgServices.find(
      (s) => s.id === serviceNameOrId || s.name.toLowerCase() === serviceNameOrId.toLowerCase()
    );
    if (found) {
      handleItemChange(index, {
        serviceId: found.id,
        serviceName: found.name,
        hsnSac: found.hsn,
        price: found.price,
        taxRate: found.taxRate,
        description: found.description || "",
      });
    } else {
      handleItemChange(index, { serviceName: serviceNameOrId });
    }
  };

  const handleAddService = () => {
    // Pick next backend service from orgServices that isn't already added
    const usedServiceIds = new Set(
      items.map((it) => it.serviceId || it.serviceName.toLowerCase())
    );
    const nextSvc =
      orgServices.find(
        (s) => !usedServiceIds.has(s.id) && !usedServiceIds.has(s.name.toLowerCase())
      ) || orgServices[0];

    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      serviceId: nextSvc?.id,
      serviceName: nextSvc?.name || "",
      hsnSac: nextSvc?.hsn || "998311",
      quantity: 1,
      price: nextSvc?.price || 0,
      discountType: "percentage",
      discountValue: 0,
      taxRate: nextSvc?.taxRate || 18,
      sgst: 0,
      cgst: 0,
      igst: 0,
      amount: 0,
      total: 0,
      description: nextSvc?.description || "",
      isReimbursement: false,
    };
    setItems((prev) => [...prev, calculateItem(newItem)]);
  };

  const handleAddReimbursement = () => {
    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      serviceName: "Govt MCA Stamp Duty / Portal Fee (Reimbursement)",
      hsnSac: "998311",
      quantity: 1,
      price: 0,
      discountType: "flat",
      discountValue: 0,
      taxRate: 0,
      sgst: 0,
      cgst: 0,
      igst: 0,
      amount: 0,
      total: 0,
      description: "Direct out-of-pocket government fee reimbursement without GST",
      isReimbursement: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totals = items.reduce(
    (acc, curr) => {
      acc.subtotal += (curr.quantity || 1) * (curr.price || 0);
      acc.amount += curr.amount || 0;
      acc.tax += (curr.sgst || 0) + (curr.cgst || 0);
      acc.grandTotal += curr.total || 0;
      return acc;
    },
    { subtotal: 0, amount: 0, tax: 0, grandTotal: 0 }
  );

  const handleSubmit = async (status: "Draft" | "Pending") => {
    try {
      await createMutation.mutateAsync({
        quotationDate,
        dueDate,
        status,
        template: "Aura",
        leadId: lead.id,
        billingOrg: {
          name: billingOrgName || "Practice Organization",
          address: billingAddress,
          priority: "Primary",
          gstin: billingGstin,
          pan: billingPan,
          lutNumber,
          lutDisabled,
          email: billingEmail,
          mobile: billingMobile,
          website: billingWebsite,
        },
        quotationTo: {
          leadId: lead.id,
          businessName: leadBusinessName,
          name: lead.fullName,
          addressLine1: leadAddressLine || lead.address || "",
          city: lead.addressDetails?.city || lead.policeStation || lead.postOffice || "",
          state: leadState,
          stateCode: leadStateCode,
          placeOfSupply: `${leadStateCode}-${leadState}`,
          gstin: leadGstin,
          pan: lead.pan || "",
          email: lead.email || "",
          mobile: lead.mobile || "",
        },
        bankDetails,
        items,
        subtotal: totals.subtotal,
        taxTotal: totals.tax,
        totalAmount: totals.grandTotal,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create quotation");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              onClick={onClose}
            >
              &lt; Leads
            </span>
            <span className="text-gray-300 dark:text-gray-600">&gt;</span>
            <span className="text-gray-900 dark:text-white font-bold">Add Quotation</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-slim">
          {/* Top Dates & Quotation No Card */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Org Initial */}
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                {(billingOrgName || "Org").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  {billingOrgName || "Loading Organization..."}
                </h3>
                <p className="text-xs text-gray-500">
                  {billingGstin ? `GSTIN: ${billingGstin}` : "Verified Firm Account"}
                </p>
              </div>
            </div>

            {/* Dates row */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Quotation No
                </label>
                <input
                  type="text"
                  disabled
                  value="Auto Generated (#QUOTxxxxx)"
                  className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Quotation Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="h-9 px-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-800 dark:text-white text-xs focus:outline-none focus:border-[#31719B]"
                  />
                  <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 px-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-800 dark:text-white text-xs focus:outline-none focus:border-[#31719B]"
                  />
                  <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Two Main Cards Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: Billing Organization (Fetched from DB) */}
            <div className="bg-white dark:bg-[#1e293b] rounded-sm border border-gray-200 dark:border-gray-700 p-4.5 space-y-4 shadow-sm">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>Billing Organization (Organization in DB)</span>
              </div>

              {/* Organization Business Name Display */}
              <input
                type="text"
                value={billingOrgName}
                onChange={(e) => setBillingOrgName(e.target.value)}
                placeholder="Organization Name"
                className="w-full h-9 px-3 rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B]"
              />

              {/* Details Box */}
              <div className="p-3 bg-gray-50/70 dark:bg-gray-800/40 rounded-sm border border-gray-100 dark:border-gray-700/60 text-xs space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Organization Details
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-500">Business Name</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">
                    {billingOrgName}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-500 shrink-0">Address</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300 text-right">
                    {billingAddress || "Office address not set"}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500">Priority</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#eaf3f8] text-[#31719B] border border-[#b3d4eb]">
                    Primary
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200/80 dark:border-gray-700 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">GSTIN:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                      {billingGstin || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">PAN:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                      {billingPan || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">
                      LUT Number: {lutNumber || "None"}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-500">
                      <input
                        type="checkbox"
                        checked={!lutDisabled}
                        onChange={(e) => setLutDisabled(!e.target.checked)}
                        className="rounded text-[#31719B] accent-[#31719B]"
                      />
                      <span>{lutDisabled ? "Disabled" : "Active"}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Quotation To (Lead's Details) */}
            <div className="bg-white dark:bg-[#1e293b] rounded-sm border border-gray-200 dark:border-gray-700 p-4.5 space-y-4 shadow-sm">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>Quotation To (Lead's details)</span>
              </div>

              {/* Business Name Input */}
              <input
                type="text"
                value={leadBusinessName}
                onChange={(e) => setLeadBusinessName(e.target.value)}
                placeholder="Lead or Business Name"
                className="w-full h-9 px-3 rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B]"
              />

              {/* Details Box */}
              <div className="p-3 bg-gray-50/70 dark:bg-gray-800/40 rounded-sm border border-gray-100 dark:border-gray-700/60 text-xs space-y-2.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Lead Details
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500">Contact Person</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {lead.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Address / Street</span>
                  <input
                    type="text"
                    value={leadAddressLine}
                    onChange={(e) => setLeadAddressLine(e.target.value)}
                    placeholder="Lead Street Address"
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs focus:outline-none focus:border-[#31719B]"
                  />
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">State / Place of Supply</span>
                  <select
                    value={leadState}
                    onChange={(e) => {
                      const selectedLabel = e.target.value;
                      setLeadState(selectedLabel);
                      const stObj = STATES.find((s) => s.label === selectedLabel);
                      if (stObj) setLeadStateCode(stObj.code);
                    }}
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B]"
                  >
                    {STATES.map((st) => (
                      <option key={st.code} value={st.label}>
                        {st.code} - {st.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">GSTIN (Optional)</span>
                  <input
                    type="text"
                    value={leadGstin}
                    onChange={(e) => setLeadGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 29AAACT1234M1ZX"
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-mono uppercase focus:outline-none focus:border-[#31719B]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Bank Details Card */}
          <div className="bg-white dark:bg-[#1e293b] rounded-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setShowBankDetails(!showBankDetails)}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                <CreditCard className="w-4 h-4 text-[#31719B]" />
                <span>Payment & Bank Details</span>
                <span className="text-[11px] font-normal text-gray-400">
                  {bankDetails.bankName
                    ? `${bankDetails.bankName} (A/C: ${bankDetails.accountNumber || "N/A"})`
                    : "(Synced from Organization DB)"}
                </span>
              </div>
              <button
                type="button"
                className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showBankDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {showBankDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank Ltd."
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs focus:outline-none focus:border-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={bankDetails.accountName}
                    onChange={(e) =>
                      setBankDetails({ ...bankDetails, accountName: e.target.value })
                    }
                    placeholder="Firm Account Name"
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs focus:outline-none focus:border-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankDetails.accountNumber}
                    onChange={(e) =>
                      setBankDetails({ ...bankDetails, accountNumber: e.target.value })
                    }
                    placeholder="e.g. 50200012345678"
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-mono focus:outline-none focus:border-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={bankDetails.ifsc}
                    onChange={(e) =>
                      setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. HDFC0000060"
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-mono uppercase focus:outline-none focus:border-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={bankDetails.bankBranch}
                    onChange={(e) =>
                      setBankDetails({ ...bankDetails, bankBranch: e.target.value })
                    }
                    placeholder="e.g. BKC Branch, Mumbai"
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs focus:outline-none focus:border-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Account Type
                  </label>
                  <select
                    value={bankDetails.accountType}
                    onChange={(e) =>
                      setBankDetails({ ...bankDetails, accountType: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs focus:outline-none focus:border-[#31719B]"
                  >
                    <option value="Current">Current</option>
                    <option value="Savings">Savings</option>
                    <option value="OD">Overdraft (OD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    UPI ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={bankDetails.upi || ""}
                    onChange={(e) => setBankDetails({ ...bankDetails, upi: e.target.value })}
                    placeholder="e.g. org@hdfcbank"
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs focus:outline-none focus:border-[#31719B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={bankDetails.currencyCode}
                    disabled
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Services Table */}
          <div className="space-y-3">
            <div className="rounded-sm border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr
                    className="text-white font-semibold"
                    style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  >
                    <th className="px-3 py-3 w-[260px]">
                      Services {isLoadingServices && <span className="text-[10px] font-normal opacity-80">(loading...)</span>}
                    </th>
                    <th className="px-2 py-3 w-[100px]">HSN/SAC</th>
                    <th className="px-2 py-3 w-[70px] text-center">Quantity</th>
                    <th className="px-2 py-3 w-[100px] text-right">Price</th>
                    <th className="px-2 py-3 w-[120px]">Discount</th>
                    <th className="px-2 py-3 w-[100px]">TAX Rate</th>
                    <th className="px-2 py-3 w-[80px] text-right">SGST</th>
                    <th className="px-2 py-3 w-[80px] text-right">CGST</th>
                    <th className="px-2 py-3 w-[100px] text-right">Amount</th>
                    <th className="px-3 py-3 w-[110px] text-right">Total</th>
                    <th className="px-2 py-3 w-10 text-center"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-[#1e293b]">
                  {items.map((item, idx) => (
                    <React.Fragment key={item.id || idx}>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        {/* Service Selection from backend DB */}
                        <td className="p-2 min-w-[220px]">
                          {item.isReimbursement ? (
                            <input
                              type="text"
                              value={item.serviceName}
                              onChange={(e) => handleItemChange(idx, { serviceName: e.target.value })}
                              placeholder="Reimbursement fee name"
                              className="w-full h-8 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B]"
                            />
                          ) : customMode[item.id || String(idx)] ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={item.serviceName}
                                onChange={(e) => handleItemChange(idx, { serviceName: e.target.value })}
                                placeholder="Enter custom service name"
                                className="w-full h-8 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B]"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomMode((prev) => ({ ...prev, [item.id || String(idx)]: false }))
                                }
                                title="Switch back to backend services catalog"
                                className="px-2 h-8 text-[10px] font-semibold text-[#31719B] bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/60 shrink-0 cursor-pointer"
                              >
                                Catalog
                              </button>
                            </div>
                          ) : (
                            <select
                              value={
                                item.serviceId ||
                                orgServices.find(
                                  (s) => s.name.toLowerCase() === item.serviceName?.toLowerCase()
                                )?.id ||
                                (item.serviceName ? "__custom__" : "")
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "__custom__") {
                                  setCustomMode((prev) => ({ ...prev, [item.id || String(idx)]: true }));
                                } else {
                                  const found = orgServices.find((s) => s.id === val || s.name === val);
                                  if (found) {
                                    handleItemChange(idx, {
                                      serviceId: found.id,
                                      serviceName: found.name,
                                      hsnSac: found.hsn,
                                      price: found.price,
                                      taxRate: found.taxRate,
                                      description: found.description || "",
                                    });
                                  }
                                }
                              }}
                              className="w-full h-8 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B] truncate cursor-pointer"
                            >
                              {isLoadingServices && orgServices.length === 0 ? (
                                <option value="">Loading services from database...</option>
                              ) : orgServices.length > 0 ? (
                                <>
                                  <option value="" disabled>
                                    Select service from database...
                                  </option>
                                  {Object.entries(servicesByCategory).map(([cat, list]) => (
                                    <optgroup key={cat} label={cat}>
                                      {list.map((s) => (
                                        <option key={s.id || s.name} value={s.id}>
                                          {s.name} {s.price ? `(₹${s.price.toLocaleString("en-IN")})` : ""}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                                  <option value="__custom__">+ Custom Service (Type manually)...</option>
                                </>
                              ) : (
                                <option value="" disabled>
                                  No services found in database
                                </option>
                              )}
                            </select>
                          )}
                        </td>

                        {/* HSN/SAC */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.hsnSac || ""}
                            onChange={(e) => handleItemChange(idx, { hsnSac: e.target.value })}
                            className="w-full h-8 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-mono focus:outline-none focus:border-[#31719B]"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, { quantity: Number(e.target.value) || 1 })
                            }
                            className="w-16 h-8 px-2 text-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-semibold focus:outline-none focus:border-[#31719B]"
                          />
                        </td>

                        {/* Price */}
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) =>
                              handleItemChange(idx, { price: Number(e.target.value) || 0 })
                            }
                            className="w-24 h-8 px-2 text-right rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-semibold focus:outline-none focus:border-[#31719B]"
                          />
                        </td>

                        {/* Discount */}
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <select
                              value={item.discountType || "percentage"}
                              onChange={(e) =>
                                handleItemChange(idx, {
                                  discountType: e.target.value as "percentage" | "flat",
                                })
                              }
                              className="h-8 px-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs focus:outline-none"
                            >
                              <option value="percentage">%</option>
                              <option value="flat">₹</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              value={item.discountValue || 0}
                              onChange={(e) =>
                                handleItemChange(idx, { discountValue: Number(e.target.value) || 0 })
                              }
                              className="w-16 h-8 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Tax Rate */}
                        <td className="p-2">
                          <select
                            value={item.taxRate}
                            onChange={(e) =>
                              handleItemChange(idx, { taxRate: Number(e.target.value) })
                            }
                            className="w-full h-8 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs focus:outline-none"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>

                        {/* SGST */}
                        <td className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">
                          ₹{(item.sgst || 0).toFixed(2)}
                        </td>

                        {/* CGST */}
                        <td className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">
                          ₹{(item.cgst || 0).toFixed(2)}
                        </td>

                        {/* Amount */}
                        <td className="p-2 text-right font-semibold text-gray-900 dark:text-white">
                          ₹{(item.amount || 0).toFixed(2)}
                        </td>

                        {/* Total */}
                        <td className="p-2 text-right font-bold text-gray-900 dark:text-white">
                          ₹{(item.total || 0).toFixed(2)}
                        </td>

                        {/* Delete Row */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            className="p-1 text-gray-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Description sub-row */}
                      <tr className="bg-gray-50/30 dark:bg-gray-800/20">
                        <td colSpan={11} className="px-3 pb-2.5 pt-0">
                          <input
                            type="text"
                            maxLength={300}
                            value={item.description || ""}
                            onChange={(e) => handleItemChange(idx, { description: e.target.value })}
                            placeholder="Description (optional notes for this line item)..."
                            className="w-full h-7 px-2 text-[11px] rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] placeholder:text-gray-400 focus:outline-none focus:border-[#31719B]"
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Service and Add Reimbursement Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddService}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-[#31719B] text-[#31719B] hover:bg-[#eaf3f8] dark:hover:bg-[#1a2e3f] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Service</span>
              </button>

              <button
                type="button"
                onClick={handleAddReimbursement}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Reimbursement</span>
              </button>
            </div>
          </div>

          {/* Grand Totals Summary Box */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax Total (GST)</span>
                <span>₹{totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Total Amount</span>
                <span>₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit("Draft")}
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-[#31719B] text-[#31719B] hover:bg-[#eaf3f8] dark:hover:bg-[#1a2e3f] transition-colors cursor-pointer"
            >
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("Pending")}
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Check className="w-4 h-4" />
              <span>{createMutation.isPending ? "Creating..." : "Create Quotation"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
