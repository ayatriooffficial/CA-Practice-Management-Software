"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Calendar, Building2, ChevronDown, Check } from "lucide-react";
import { Lead } from "@/data/crmData";
import { useCreateQuotation } from "@/hooks/useQuotationsQuery";
import { QuotationItem } from "@/services/quotationApi";

interface AddQuotationModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess?: () => void;
}

const INDIAN_STATES = [
  "Karnataka",
  "Maharashtra",
  "Delhi",
  "Tamil Nadu",
  "Gujarat",
  "Uttar Pradesh",
  "Telangana",
  "West Bengal",
  "Kerala",
  "Rajasthan",
  "Haryana",
  "Punjab",
  "Madhya Pradesh",
  "Bihar",
  "Odisha",
  "Goa",
  "Assam",
  "Jharkhand",
  "Chhattisgarh",
];

const PREDEFINED_SERVICES = [
  { name: "Advance Tax (1st Installment)", hsn: "998311", price: 288, taxRate: 18 },
  { name: "GSTR-1 (Monthly Filing)", hsn: "998311", price: 1500, taxRate: 18 },
  { name: "GSTR-3B (Monthly Return)", hsn: "998311", price: 2000, taxRate: 18 },
  { name: "ITR 1 - Salaried Individual", hsn: "998311", price: 1000, taxRate: 18 },
  { name: "Statutory Audit Compliance", hsn: "998311", price: 15000, taxRate: 18 },
  { name: "TDS Filing (Quarterly)", hsn: "998311", price: 3000, taxRate: 18 },
  { name: "Company Incorporation ROC", hsn: "998311", price: 7500, taxRate: 18 },
];

export const AddQuotationModal: React.FC<AddQuotationModalProps> = ({
  lead,
  onClose,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const createMutation = useCreateQuotation();

  // Quotation Metadata
  const [quotationNo, setQuotationNo] = useState("");
  const [quotationDate, setQuotationDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(todayStr);

  // Billing Org State
  const [billingOrgName, setBillingOrgName] = useState("Turia Associates Demo");
  const [billingAddress, setBillingAddress] = useState(
    "165, Cambridge Layout Bangalore - 560008 Karnataka"
  );
  const [billingGstin, setBillingGstin] = useState("29AARCS3638L2ZH");
  const [billingPan, setBillingPan] = useState("KKXPS8986J");
  const [lutNumber, setLutNumber] = useState("LUT28798");
  const [lutDisabled, setLutDisabled] = useState(true);

  // Lead / Quotation To State
  const [leadBusinessName, setLeadBusinessName] = useState(lead.businessName || lead.fullName);
  const [leadState, setLeadState] = useState(lead.state || "Karnataka");
  const [leadGstin, setLeadGstin] = useState(lead.gstin || "");

  // Items State
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: "item-1",
      serviceName: "Advance Tax (1st Installment)",
      hsnSac: "998311",
      quantity: 1,
      price: 288,
      discountType: "percentage",
      discountValue: 0,
      taxRate: 18,
      sgst: 25.92,
      cgst: 25.92,
      igst: 0,
      amount: 288,
      total: 339.84,
      description: "",
      isReimbursement: false,
    },
  ]);

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

  const handleItemChange = (index: number, updates: Partial<QuotationItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = calculateItem({ ...copy[index], ...updates });
      return copy;
    });
  };

  const handleSelectServicePreset = (index: number, serviceName: string) => {
    const found = PREDEFINED_SERVICES.find((s) => s.name === serviceName);
    if (found) {
      handleItemChange(index, {
        serviceName: found.name,
        hsnSac: found.hsn,
        price: found.price,
        taxRate: found.taxRate,
      });
    } else {
      handleItemChange(index, { serviceName });
    }
  };

  const handleAddService = () => {
    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
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
    };
    setItems((prev) => [...prev, newItem]);
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
          name: billingOrgName,
          address: billingAddress,
          priority: "Primary",
          gstin: billingGstin,
          pan: billingPan,
          lutNumber,
          lutDisabled,
          email: "kavinraj@turia.in",
          mobile: "8722750204",
          website: "https://turia.in/",
        },
        quotationTo: {
          leadId: lead.id,
          businessName: leadBusinessName,
          name: lead.fullName,
          addressLine1: lead.address || "",
          city: lead.policeStation || lead.postOffice || "",
          state: leadState,
          stateCode: "29",
          placeOfSupply: leadState,
          gstin: leadGstin,
          pan: lead.pan || "",
          email: lead.email || "",
          mobile: lead.mobile || "",
        },
        bankDetails: {
          paymentType: "Bank",
          bankName: "HDFC",
          accountName: "Turia Books Technologies Private Limited",
          accountNumber: "8934784834990842",
          ifsc: "HDFC9003928",
          accountType: "Current",
          bankBranch: "Indira Nagar",
          upi: "6363693138@ybl",
          currencyCode: "INR",
        },
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
            <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer" onClick={onClose}>
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
            {/* Lead Avatar Initial */}
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                {billingOrgName.slice(0, 2).toUpperCase() || "TA"}
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
            {/* Left Card: Billing Organization (Your Details) */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-4.5 space-y-4 shadow-sm">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>Billing Organization (Your details)</span>
              </div>

              {/* Selector */}
              <div className="relative">
                <select
                  value={billingOrgName}
                  onChange={(e) => setBillingOrgName(e.target.value)}
                  className="w-full h-9 px-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B] appearance-none"
                >
                  <option value="Turia Associates Demo">Turia Associates Demo</option>
                  <option value="Ayatrio Business Services">Ayatrio Business Services</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Details Box */}
              <div className="p-3 bg-gray-50/70 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-700/60 text-xs space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Business Details
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
                    {billingAddress}
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
                      {billingGstin}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">PAN:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                      {billingPan}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">LUT Number: {lutNumber}</span>
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
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-4.5 space-y-4 shadow-sm">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>Quotation To (Lead's details)</span>
              </div>

              {/* Selector */}
              <input
                type="text"
                value={leadBusinessName}
                onChange={(e) => setLeadBusinessName(e.target.value)}
                placeholder="Lead or Business Name"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B]"
              />

              {/* Details Box */}
              <div className="p-3 bg-gray-50/70 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-700/60 text-xs space-y-2.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Business Details
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500">Contact Person</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {lead.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">State / Place of Supply</span>
                  <select
                    value={leadState}
                    onChange={(e) => setLeadState(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B]"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
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

          {/* Services Table */}
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr
                    className="text-white font-semibold"
                    style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  >
                    <th className="px-3 py-3 w-[240px]">Services</th>
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
                        {/* Service Name Dropdown / Input */}
                        <td className="p-2">
                          <input
                            type="text"
                            list={`services-list-${idx}`}
                            value={item.serviceName}
                            onChange={(e) => handleSelectServicePreset(idx, e.target.value)}
                            placeholder="Select or enter service name"
                            className="w-full h-8 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-[#31719B]"
                          />
                          <datalist id={`services-list-${idx}`}>
                            {PREDEFINED_SERVICES.map((s) => (
                              <option key={s.name} value={s.name} />
                            ))}
                          </datalist>
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
