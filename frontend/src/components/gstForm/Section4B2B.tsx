import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  formatIndianCurrency,
  formatIndianNumber,
  round2,
  STATE_OPTIONS,
  TAX_RATES,
  UQC_OPTIONS,
  HSN_MASTER_LIST,
} from "./gstFormUtils";
import { CsvImportCard } from "./CsvImportCard";

export interface Section4B2BProps {
  token: string;
  supplierStateCode: string;
  supplierGstin: string;
  returnPeriod: string;
  invoices: any[];
  onSaveInvoices: (updatedInvoices: any[]) => void;
  onBackToDashboard: () => void;
}

export const Section4B2B: React.FC<Section4B2BProps> = ({
  token,
  supplierStateCode,
  supplierGstin,
  returnPeriod,
  invoices,
  onSaveInvoices,
  onBackToDashboard,
}) => {
  // View states: 'list' | 'stepA' | 'stepB'
  const [currentStep, setCurrentStep] = useState<"list" | "stepA" | "stepB">("list");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Search & Pagination in Saved Records Table
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Step A Form State
  const [invType, setInvType] = useState<"R" | "DE" | "SEWP" | "SEWOP" | "CBW">("R");
  const [rchrg, setRchrg] = useState(false);
  const [diffPercent, setDiffPercent] = useState(false);
  const [ctin, setCtin] = useState("");
  const [cname, setCname] = useState("");
  const [nameInMaster, setNameInMaster] = useState("");
  const [inum, setInum] = useState("");
  const [idt, setIdt] = useState("");
  const [val, setVal] = useState<number | "">("");
  const [pos, setPos] = useState("");
  const [irn, setIrn] = useState("");
  const [irngendate, setIrngendate] = useState("");
  const [stepAErrors, setStepAErrors] = useState<Record<string, string>>({});

  // Step B Form State (Rates grid)
  const [rateItems, setRateItems] = useState<Record<number, {
    txval: number | "";
    iamt: number | "";
    camt: number | "";
    samt: number | "";
    csamt: number | "";
    hsn?: string;
    uqc?: string;
    qty?: number | "";
  }>>({});
  const [showHsnHelper, setShowHsnHelper] = useState(false);
  const [stepBErrors, setStepBErrors] = useState<string[]>([]);

  // Derived: Is Inter-State?
  const isPosSupplierState = pos ? pos.substring(0, 2) === supplierStateCode : false;
  const isInterState = useMemo(() => {
    if (invType === "DE" || invType === "SEWP" || invType === "SEWOP" || invType === "CBW") {
      return true; // Always IGST
    }
    return !isPosSupplierState;
  }, [invType, isPosSupplierState]);

  // Autocomplete recipients from existing invoices
  const savedRecipients = useMemo(() => {
    const map = new Map<string, string>();
    invoices.forEach((inv) => {
      if (inv.ctin && inv.cname) map.set(inv.ctin.toUpperCase(), inv.cname);
    });
    return Array.from(map.entries()).map(([g, n]) => ({ gstin: g, name: n }));
  }, [invoices]);

  // Open Form to Add New
  const handleAddNew = () => {
    setEditingIndex(null);
    setInvType("R");
    setRchrg(false);
    setDiffPercent(false);
    setCtin("");
    setCname("");
    setNameInMaster("");
    setInum("");
    // Default date to today or period
    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    setIdt(dStr);
    setVal("");
    setPos(supplierStateCode ? `${supplierStateCode}-${STATE_OPTIONS.find((s) => s.code === supplierStateCode)?.name}` : "");
    setIrn("");
    setIrngendate("");
    setStepAErrors({});

    // Reset rate grid
    const blankRates: any = {};
    TAX_RATES.forEach((rt) => {
      blankRates[rt] = { txval: "", iamt: "", camt: "", samt: "", csamt: "", hsn: "", uqc: "NOS", qty: "" };
    });
    setRateItems(blankRates);

    setCurrentStep("stepA");
  };

  // Open Form to Edit Existing
  const handleEdit = (idx: number) => {
    const inv = invoices[idx];
    setEditingIndex(idx);
    setInvType(inv.inv_type || "R");
    setRchrg(Boolean(inv.rchrg));
    setDiffPercent(Boolean(inv.diff_percent));
    setCtin(inv.ctin || "");
    setCname(inv.cname || "");
    setNameInMaster(inv.name_as_in_master || "");
    setInum(inv.inum || "");
    setIdt(inv.idt || "");
    setVal(inv.val || "");
    setPos(inv.pos || "");
    setIrn(inv.irn || "");
    setIrngendate(inv.irngendate || "");
    setStepAErrors({});

    const initialRates: any = {};
    TAX_RATES.forEach((rt) => {
      const match = (inv.items || []).find((it: any) => Number(it.rt) === rt);
      initialRates[rt] = {
        txval: match ? match.txval : "",
        iamt: match ? match.iamt : "",
        camt: match ? match.camt : "",
        samt: match ? match.samt : "",
        csamt: match ? match.csamt : "",
        hsn: match?.hsn || "",
        uqc: match?.uqc || "NOS",
        qty: match?.qty || "",
      };
    });
    setRateItems(initialRates);
    setCurrentStep("stepA");
  };

  // Step A: Next to Step B
  const handleStepANext = () => {
    const errors: Record<string, string> = {};

    if (!ctin.trim()) {
      errors.ctin = "Recipient GSTIN/UIN is mandatory";
    } else if (ctin.length !== 15) {
      errors.ctin = "GSTIN must be 15 characters";
    } else if (ctin.toUpperCase() === supplierGstin.toUpperCase()) {
      errors.ctin = "Recipient GSTIN must not equal supplier GSTIN";
    }

    if (!cname.trim()) {
      errors.cname = "Recipient Name is mandatory";
    }

    if (!inum.trim()) {
      errors.inum = "Invoice number is mandatory";
    } else if (inum.length > 16) {
      errors.inum = "Invoice number cannot exceed 16 characters";
    } else if (!/^[a-zA-Z0-9\/-]+$/.test(inum)) {
      errors.inum = "Allows only letters, digits, / and -";
    }

    // Uniqueness check for invoice number in table
    const duplicate = invoices.some((inv, idx) => idx !== editingIndex && inv.inum.toLowerCase() === inum.trim().toLowerCase());
    if (duplicate) {
      errors.inum = `Invoice number ${inum} already exists in this table`;
    }

    if (!idt.trim()) {
      errors.idt = "Invoice date is mandatory";
    }

    if (val === "" || Number(val) <= 0) {
      errors.val = "Total invoice value must be greater than zero";
    }

    if (!pos) {
      errors.pos = "Place of supply (POS) is mandatory";
    }

    if (Object.keys(errors).length > 0) {
      setStepAErrors(errors);
      return;
    }

    setStepAErrors({});
    setCurrentStep("stepB");
  };

  // Rate item change
  const handleTaxableChange = (rate: number, taxableValStr: string) => {
    const txval = taxableValStr === "" ? "" : Number(taxableValStr);
    const multiplier = diffPercent ? 0.65 : 1;

    setRateItems((prev) => {
      const cur = prev[rate] || { txval: "", iamt: "", camt: "", samt: "", csamt: "" };
      if (txval === "" || txval === 0) {
        return {
          ...prev,
          [rate]: { ...cur, txval: "", iamt: "", camt: "", samt: "", csamt: "" },
        };
      }

      const totalTax = round2((txval * rate * multiplier) / 100);

      if (isInterState) {
        return {
          ...prev,
          [rate]: {
            ...cur,
            txval,
            iamt: totalTax,
            camt: 0,
            samt: 0,
            csamt: cur.csamt || 0,
          },
        };
      } else {
        const half = round2(totalTax / 2);
        return {
          ...prev,
          [rate]: {
            ...cur,
            txval,
            iamt: 0,
            camt: half,
            samt: half,
            csamt: cur.csamt || 0,
          },
        };
      }
    });
  };

  // Step B: Calculate Totals
  const { totalTaxable, totalIgst, totalCgst, totalSgst, totalCess, totalTaxAndVal } = useMemo(() => {
    let tTaxable = 0;
    let tIgst = 0;
    let tCgst = 0;
    let tSgst = 0;
    let tCess = 0;

    Object.values(rateItems).forEach((row) => {
      if (row.txval && Number(row.txval) > 0) {
        tTaxable += Number(row.txval);
        tIgst += Number(row.iamt || 0);
        tCgst += Number(row.camt || 0);
        tSgst += Number(row.samt || 0);
        tCess += Number(row.csamt || 0);
      }
    });

    return {
      totalTaxable: round2(tTaxable),
      totalIgst: round2(tIgst),
      totalCgst: round2(tCgst),
      totalSgst: round2(tSgst),
      totalCess: round2(tCess),
      totalTaxAndVal: round2(tTaxable + tIgst + tCgst + tSgst + tCess),
    };
  }, [rateItems]);

  // Step B: Save Invoice
  const handleSaveInvoice = () => {
    const errors: string[] = [];
    if (totalTaxable <= 0) {
      errors.push("At least one rate row must have a taxable value > 0");
    }

    const numVal = Number(val) || 0;
    if (numVal < totalTaxable) {
      errors.push(`Total invoice value (₹${numVal}) cannot be less than total taxable value (₹${totalTaxable})`);
    }

    if (errors.length > 0) {
      setStepBErrors(errors);
      return;
    }

    const items = Object.entries(rateItems)
      .filter(([_, row]) => row.txval && Number(row.txval) > 0)
      .map(([rt, row]) => ({
        rt: Number(rt),
        txval: Number(row.txval),
        iamt: Number(row.iamt || 0),
        camt: Number(row.camt || 0),
        samt: Number(row.samt || 0),
        csamt: Number(row.csamt || 0),
        hsn: row.hsn || undefined,
        uqc: row.uqc || undefined,
        qty: row.qty ? Number(row.qty) : undefined,
      }));

    const newInvoice = {
      id: editingIndex !== null ? invoices[editingIndex].id : `inv_${Date.now()}`,
      inv_type: invType,
      rchrg,
      diff_percent: diffPercent ? 0.65 : undefined,
      ctin: ctin.trim().toUpperCase(),
      cname: cname.trim(),
      name_as_in_master: nameInMaster,
      inum: inum.trim(),
      idt: idt.trim(),
      val: Number(val),
      pos,
      sply_ty: isInterState ? "Inter-State" : "Intra-State",
      srctyp: irn ? "E-Invoice" : "Manual",
      irn: irn || undefined,
      irngendate: irngendate || undefined,
      items,
    };

    let updatedList = [...invoices];
    if (editingIndex !== null) {
      updatedList[editingIndex] = newInvoice;
    } else {
      updatedList.unshift(newInvoice);
    }

    onSaveInvoices(updatedList);
    setCurrentStep("list");
  };

  // Delete Invoice
  const handleDelete = (idx: number) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    const updated = invoices.filter((_, i) => i !== idx);
    onSaveInvoices(updated);
  };

  // Multi-delete
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected invoices?`)) return;
    const updated = invoices.filter((inv) => !selectedIds.has(inv.id));
    onSaveInvoices(updated);
    setSelectedIds(new Set());
  };

  // CSV Import Callback
  const handleCsvImport = (rows: any[], mode: "add" | "replace") => {
    // Group rows by recipient_gstin + invoice_no
    const groupMap = new Map<string, any>();

    rows.forEach((r) => {
      const gstin = (r.recipient_gstin || "").toUpperCase().trim();
      const num = (r.invoice_no || "").trim();
      const key = `${gstin}_${num}`;

      if (!groupMap.has(key)) {
        let mappedType: any = "R";
        const t = (r.invoice_type || "").toUpperCase();
        if (t.includes("DEEMED")) mappedType = "DE";
        else if (t.includes("WITHOUT")) mappedType = "SEWOP";
        else if (t.includes("SEZ")) mappedType = "SEWP";
        else if (t.includes("INTRA")) mappedType = "CBW";

        groupMap.set(key, {
          id: `inv_csv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          inv_type: mappedType,
          rchrg: r.reverse_charge === "Y" || r.reverse_charge === "Yes" || r.reverse_charge === "TRUE",
          diff_percent: r.differential_rate === "Y" || r.differential_rate === "0.65" ? 0.65 : undefined,
          ctin: gstin,
          cname: r.recipient_name || gstin,
          inum: num,
          idt: r.invoice_date || "",
          val: Number(r.invoice_value) || 0,
          pos: r.pos || "",
          sply_ty: "Inter-State",
          srctyp: r.irn ? "E-Invoice" : "Manual",
          irn: r.irn || undefined,
          irngendate: r.irn_date || undefined,
          items: [],
        });
      }

      const invObj = groupMap.get(key);
      const rate = Number(r.rate) || 0;
      const txval = Number(r.taxable_value) || 0;
      const igst = Number(r.igst) || 0;
      const cgst = Number(r.cgst) || 0;
      const samt = Number(r.sgst) || 0;
      const csamt = Number(r.cess) || 0;

      invObj.items.push({
        rt: rate,
        txval,
        iamt: igst,
        camt: cgst,
        samt,
        csamt,
        hsn: r.hsn || undefined,
        uqc: r.uqc || undefined,
        qty: r.quantity ? Number(r.quantity) : undefined,
      });
    });

    const parsedInvoices = Array.from(groupMap.values());
    if (mode === "replace") {
      onSaveInvoices(parsedInvoices);
    } else {
      onSaveInvoices([...parsedInvoices, ...invoices]);
    }
  };

  // CSV Validator
  const validateCsvRow = (row: any, idx: number) => {
    const errs: string[] = [];
    if (!row.recipient_gstin) errs.push("recipient_gstin missing");
    if (!row.invoice_no) errs.push("invoice_no missing");
    if (!row.invoice_date) errs.push("invoice_date missing");
    if (!row.pos) errs.push("pos missing");
    if (!row.rate) errs.push("rate missing");
    if (!row.taxable_value) errs.push("taxable_value missing");
    return { valid: errs.length === 0, errors: errs };
  };

  // Filtered list
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;
    const s = searchTerm.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.inum?.toLowerCase().includes(s) ||
        inv.cname?.toLowerCase().includes(s) ||
        inv.ctin?.toLowerCase().includes(s)
    );
  }, [invoices, searchTerm]);

  // Overall totals for saved records table
  const tableTotals = useMemo(() => {
    let tVal = 0;
    let tTxval = 0;
    let tIgst = 0;
    let tCgst = 0;
    let tSgst = 0;
    let tCess = 0;

    invoices.forEach((inv) => {
      tVal += inv.val || 0;
      (inv.items || []).forEach((it: any) => {
        tTxval += it.txval || 0;
        tIgst += it.iamt || 0;
        tCgst += it.camt || 0;
        tSgst += it.samt || 0;
        tCess += it.csamt || 0;
      });
    });

    return {
      tVal: round2(tVal),
      tTxval: round2(tTxval),
      tIgst: round2(tIgst),
      tCgst: round2(tCgst),
      tSgst: round2(tSgst),
      tCess: round2(tCess),
    };
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dde2e8] dark:border-[#334155] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={currentStep === "list" ? onBackToDashboard : () => setCurrentStep("list")}
            className="p-1.5 rounded-lg border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>4A, 4B, 6B, 6C – B2B, SEZ, DE Invoices</span>
              <span className="text-xs font-normal text-gray-400">
                ({invoices.length} {invoices.length === 1 ? "invoice" : "invoices"})
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="text-red-500 font-bold">*</span> Indicates mandatory fields
            </p>
          </div>
        </div>

        {currentStep === "list" && (
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
            style={{ backgroundColor: "var(--primary, #31719B)" }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Invoice</span>
          </button>
        )}
      </div>

      {/* CSV Import Card */}
      {currentStep === "list" && (
        <CsvImportCard
          token={token}
          sectionKey="b2b"
          sectionTitle="B2B / SEZ / Deemed Export Invoices"
          onImportComplete={handleCsvImport}
          validatorFn={validateCsvRow}
        />
      )}

      {/* STEP A FORM: Add / Edit Invoice Details */}
      {currentStep === "stepA" && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
          <div className="border-b border-[#dde2e8] dark:border-[#334155] pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Step A: {editingIndex !== null ? "Edit Invoice Details" : "Add Invoice Details"}
            </h2>
            <span className="text-xs text-gray-400 font-medium">Step 1 of 2</span>
          </div>

          {/* Checkboxes 1 to 6 in exact order */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-xs">
            {/* 1. Deemed Exports */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invType === "DE"}
                onChange={(e) => setInvType(e.target.checked ? "DE" : "R")}
                className="w-3.5 h-3.5 accent-[#31719B]"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Deemed Exports</span>
            </label>

            {/* 2. SEZ Supplies with payment */}
            <label className={`flex items-center gap-2 ${!ctin || ctin.length < 15 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                disabled={!ctin || ctin.length < 15}
                checked={invType === "SEWP"}
                onChange={(e) => setInvType(e.target.checked ? "SEWP" : "R")}
                className="w-3.5 h-3.5 accent-[#31719B]"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">SEZ Supplies with payment</span>
            </label>

            {/* 3. SEZ Supplies without payment */}
            <label className={`flex items-center gap-2 ${!ctin || ctin.length < 15 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                disabled={!ctin || ctin.length < 15}
                checked={invType === "SEWOP"}
                onChange={(e) => setInvType(e.target.checked ? "SEWOP" : "R")}
                className="w-3.5 h-3.5 accent-[#31719B]"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">SEZ Supplies without payment</span>
            </label>

            {/* 4. Supply attract reverse charge */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rchrg}
                onChange={(e) => setRchrg(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#31719B]"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Supply attract reverse charge</span>
            </label>

            {/* 5. Intra-State Supplies attracting IGST */}
            <label className={`flex items-center gap-2 ${!isPosSupplierState ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                disabled={!isPosSupplierState}
                checked={invType === "CBW"}
                onChange={(e) => setInvType(e.target.checked ? "CBW" : "R")}
                className="w-3.5 h-3.5 accent-[#31719B]"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Intra-State Supplies attracting IGST</span>
            </label>

            {/* 6. Differential Percentage */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={diffPercent}
                onChange={(e) => setDiffPercent(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#31719B]"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium" title="Is the supply eligible to be taxed at a differential percentage (%) of the existing rate of tax, as notified by the Government?">
                Differential Tax Rate (65%)
              </span>
            </label>
          </div>

          {/* Form Fields in exact order */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 7. Recipient GSTIN/UIN* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Recipient GSTIN/UIN <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={15}
                  value={ctin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setCtin(val);
                    // Match saved recipient
                    const found = savedRecipients.find((r) => r.gstin === val);
                    if (found) {
                      setCname(found.name);
                      setNameInMaster(found.name);
                    }
                    // Auto-set POS from recipient state
                    if (val.length >= 2) {
                      const stCode = val.substring(0, 2);
                      const stMatch = STATE_OPTIONS.find((s) => s.code === stCode);
                      if (stMatch) setPos(stMatch.label);
                    }
                  }}
                  placeholder="Enter 15-digit GSTIN or search"
                  className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
                />
              </div>
              {stepAErrors.ctin && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.ctin}</span>}
            </div>

            {/* 8. Recipient Name* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Recipient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cname}
                onChange={(e) => setCname(e.target.value)}
                placeholder="Trade or Legal name"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B]"
              />
              {stepAErrors.cname && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.cname}</span>}
            </div>

            {/* 9. Name as in Master (Read-only if matched) */}
            {nameInMaster && (
              <div>
                <label className="block font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Name as in Master
                </label>
                <input
                  type="text"
                  readOnly
                  value={nameInMaster}
                  className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-gray-100 dark:bg-gray-800 px-3 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            )}

            {/* 10. Invoice no.* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Invoice no. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={16}
                value={inum}
                onChange={(e) => setInum(e.target.value)}
                placeholder="e.g. INV/2026/001"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
              />
              {stepAErrors.inum && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.inum}</span>}
            </div>

            {/* 11. Invoice date* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Invoice date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={idt}
                onChange={(e) => setIdt(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
              />
              {stepAErrors.idt && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.idt}</span>}
            </div>

            {/* 12. Total invoice value (₹)* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Total invoice value (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={val}
                onChange={(e) => setVal(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B]"
              />
              {stepAErrors.val && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.val}</span>}
            </div>

            {/* 13. POS* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <span>POS (Place of Supply)</span> <span className="text-red-500">*</span>
                <span title="Place of Supply: state where the goods/services are supplied" className="text-gray-400 cursor-help">
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
              </label>
              <select
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B]"
              >
                <option value="">Select Place of Supply</option>
                {STATE_OPTIONS.map((st) => (
                  <option key={st.code} value={st.label}>
                    {st.label}
                  </option>
                ))}
              </select>
              {stepAErrors.pos && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.pos}</span>}
            </div>

            {/* 14. Supply Type (Computed) */}
            <div>
              <label className="block font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Supply Type
              </label>
              <input
                type="text"
                readOnly
                value={isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-gray-100 dark:bg-gray-800 px-3 text-gray-700 dark:text-gray-300 font-medium cursor-not-allowed"
              />
            </div>

            {/* 15. Source (Computed) */}
            <div>
              <label className="block font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Source
              </label>
              <input
                type="text"
                readOnly
                value={irn ? "E-Invoice" : "Manual"}
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-gray-100 dark:bg-gray-800 px-3 text-gray-700 dark:text-gray-300 cursor-not-allowed"
              />
            </div>

            {/* 16. IRN */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                IRN (Optional)
              </label>
              <input
                type="text"
                maxLength={64}
                value={irn}
                onChange={(e) => setIrn(e.target.value)}
                placeholder="64-character E-Invoice IRN hash"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-[11px] outline-none focus:border-[#31719B]"
              />
            </div>

            {/* 17. IRN date */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                IRN Date (Optional)
              </label>
              <input
                type="text"
                value={irngendate}
                onChange={(e) => setIrngendate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
            <button
              type="button"
              onClick={() => setCurrentStep("list")}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-xs cursor-pointer"
            >
              BACK TO LIST
            </button>
            <button
              type="button"
              onClick={handleStepANext}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
              style={{ backgroundColor: "var(--primary, #31719B)" }}
            >
              SAVE & PROCEED TO ITEM DETAILS →
            </button>
          </div>
        </div>
      )}

      {/* STEP B FORM: Item Details Rate Grid */}
      {currentStep === "stepB" && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
          <div className="border-b border-[#dde2e8] dark:border-[#334155] pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>Step B: Item Details for Invoice {inum}</span>
                <span className="text-xs font-normal text-gray-500 font-mono">
                  (Total Value: {formatIndianCurrency(Number(val))})
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supply Type: <span className="font-semibold text-gray-900 dark:text-white">{isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}</span>
              </p>
            </div>
            <span className="text-xs text-gray-400 font-medium">Step 2 of 2</span>
          </div>

          {stepBErrors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 space-y-1">
              {stepBErrors.map((err, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Rate Grid Table */}
          <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e3a5f] text-white font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-24">Rate (%)</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value (₹)*</th>
                  {isInterState ? (
                    <th className="py-2.5 px-3 text-right">Integrated Tax (₹)*</th>
                  ) : (
                    <>
                      <th className="py-2.5 px-3 text-right">Central Tax (₹)*</th>
                      <th className="py-2.5 px-3 text-right">State/UT Tax (₹)*</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-right">Cess (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                {TAX_RATES.map((rt) => {
                  const item = rateItems[rt] || { txval: "", iamt: "", camt: "", samt: "", csamt: "" };
                  const isRowFilled = item.txval !== "" && Number(item.txval) > 0;

                  return (
                    <tr key={rt} className={isRowFilled ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}>
                      {/* Rate label */}
                      <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">
                        {rt}%
                      </td>

                      {/* Taxable Value */}
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.txval}
                          onChange={(e) => handleTaxableChange(rt, e.target.value)}
                          placeholder="0.00"
                          className="h-8 w-36 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B]"
                        />
                      </td>

                      {/* Tax Columns */}
                      {isInterState ? (
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            disabled={!isRowFilled}
                            value={item.iamt}
                            onChange={(e) => {
                              const v = e.target.value === "" ? "" : Number(e.target.value);
                              setRateItems((prev) => ({
                                ...prev,
                                [rt]: { ...prev[rt], iamt: v },
                              }));
                            }}
                            className="h-8 w-32 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400"
                          />
                        </td>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              disabled={!isRowFilled}
                              value={item.camt}
                              onChange={(e) => {
                                const v = e.target.value === "" ? "" : Number(e.target.value);
                                setRateItems((prev) => ({
                                  ...prev,
                                  [rt]: { ...prev[rt], camt: v },
                                }));
                              }}
                              className="h-8 w-28 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              disabled={!isRowFilled}
                              value={item.samt}
                              onChange={(e) => {
                                const v = e.target.value === "" ? "" : Number(e.target.value);
                                setRateItems((prev) => ({
                                  ...prev,
                                  [rt]: { ...prev[rt], samt: v },
                                }));
                              }}
                              className="h-8 w-28 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400"
                            />
                          </td>
                        </>
                      )}

                      {/* Cess */}
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          disabled={!isRowFilled}
                          value={item.csamt}
                          onChange={(e) => {
                            const v = e.target.value === "" ? "" : Number(e.target.value);
                            setRateItems((prev) => ({
                              ...prev,
                              [rt]: { ...prev[rt], csamt: v },
                            }));
                          }}
                          placeholder="0.00"
                          className="h-8 w-28 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals Footer Row */}
              <tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold border-t-2 border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <td className="py-2.5 px-3">Total</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianCurrency(totalTaxable)}</td>
                  {isInterState ? (
                    <td className="py-2.5 px-3 text-right font-mono">{formatIndianCurrency(totalIgst)}</td>
                  ) : (
                    <>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianCurrency(totalCgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianCurrency(totalSgst)}</td>
                    </>
                  )}
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianCurrency(totalCess)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Comparison Strip */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl flex flex-wrap items-center justify-between text-xs gap-3">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total Invoice Value (Step A): </span>
              <span className="font-bold font-mono text-gray-900 dark:text-white">{formatIndianCurrency(Number(val))}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Calculated Invoice Total: </span>
              <span className="font-bold font-mono text-[#31719B] dark:text-blue-400">{formatIndianCurrency(totalTaxAndVal)}</span>
            </div>
            <div>
              {Number(val) < totalTaxable ? (
                <span className="text-red-500 font-bold">Blocking Error: Invoice value &lt; Taxable value</span>
              ) : Number(val) < totalTaxAndVal ? (
                <span className="text-amber-500 font-medium">Warning: Invoice value is less than taxable + tax</span>
              ) : (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Reconciled
                </span>
              )}
            </div>
          </div>

          {/* Collapsible HSN Helper Accordion */}
          <div className="border border-[#dde2e8] dark:border-[#334155] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHsnHelper(!showHsnHelper)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <span>HSN details for this invoice (Optional helper used only to auto-build Table 12)</span>
              {showHsnHelper ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showHsnHelper && (
              <div className="p-4 space-y-3 bg-white dark:bg-[#1e293b]">
                <p className="text-[11px] text-gray-500">
                  Tag each filled rate with HSN/SAC code to auto-generate Table 12 HSN outward summary with one click later.
                </p>
                <div className="space-y-2">
                  {TAX_RATES.filter((rt) => rateItems[rt]?.txval && Number(rateItems[rt].txval) > 0).map((rt) => (
                    <div key={rt} className="flex flex-wrap items-center gap-3 text-xs p-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                      <span className="w-16 font-bold">{rt}% row:</span>
                      <select
                        value={rateItems[rt]?.hsn || ""}
                        onChange={(e) =>
                          setRateItems((prev) => ({
                            ...prev,
                            [rt]: { ...prev[rt], hsn: e.target.value },
                          }))
                        }
                        className="h-8 rounded border border-gray-300 dark:border-gray-700 px-2 text-xs"
                      >
                        <option value="">Select HSN / SAC</option>
                        {HSN_MASTER_LIST.map((h) => (
                          <option key={h.hsn} value={h.hsn}>
                            {h.hsn} - {h.description.slice(0, 30)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={rateItems[rt]?.uqc || "NOS"}
                        onChange={(e) =>
                          setRateItems((prev) => ({
                            ...prev,
                            [rt]: { ...prev[rt], uqc: e.target.value },
                          }))
                        }
                        className="h-8 rounded border border-gray-300 dark:border-gray-700 px-2 text-xs"
                      >
                        {UQC_OPTIONS.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={rateItems[rt]?.qty || ""}
                        onChange={(e) =>
                          setRateItems((prev) => ({
                            ...prev,
                            [rt]: { ...prev[rt], qty: e.target.value === "" ? "" : Number(e.target.value) },
                          }))
                        }
                        className="h-8 w-20 rounded border border-gray-300 dark:border-gray-700 px-2 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
            <button
              type="button"
              onClick={() => setCurrentStep("stepA")}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-xs cursor-pointer"
            >
              ← BACK TO STEP A
            </button>
            <button
              type="button"
              onClick={handleSaveInvoice}
              className="px-6 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
              style={{ backgroundColor: "var(--primary, #31719B)" }}
            >
              SAVE INVOICE
            </button>
          </div>
        </div>
      )}

      {/* SAVED RECORDS TABLE (Always shown below per section 6.2) */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Saved Invoices ({invoices.length})
            </h2>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice no, recipient..."
              className="w-full h-8 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs outline-none focus:border-[#31719B]"
            />
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs">
            No records saved yet. Click &quot;Add Invoice&quot; or &quot;Import CSV&quot; to populate B2B invoices.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === invoices.length && invoices.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(invoices.map((inv) => inv.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      className="accent-[#31719B]"
                    />
                  </th>
                  <th className="py-2.5 px-3">Recipient GSTIN</th>
                  <th className="py-2.5 px-3">Recipient Name</th>
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">POS</th>
                  <th className="py-2.5 px-3 text-right">Invoice Val</th>
                  <th className="py-2.5 px-3 text-right">Taxable Val</th>
                  <th className="py-2.5 px-3 text-right">IGST</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                  <th className="py-2.5 px-3 text-right">Cess</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                {filteredInvoices.slice((page - 1) * pageSize, page * pageSize).map((inv, idx) => {
                  const globalIdx = (page - 1) * pageSize + idx;
                  const itms = inv.items || [];
                  const txval = itms.reduce((s: number, it: any) => s + (it.txval || 0), 0);
                  const igst = itms.reduce((s: number, it: any) => s + (it.iamt || 0), 0);
                  const cgst = itms.reduce((s: number, it: any) => s + (it.camt || 0), 0);
                  const samt = itms.reduce((s: number, it: any) => s + (it.samt || 0), 0);
                  const csamt = itms.reduce((s: number, it: any) => s + (it.csamt || 0), 0);

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) newSet.add(inv.id);
                            else newSet.delete(inv.id);
                            setSelectedIds(newSet);
                          }}
                          className="accent-[#31719B]"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-gray-900 dark:text-white">
                        {inv.ctin}
                      </td>
                      <td className="py-2.5 px-3 max-w-[140px] truncate" title={inv.cname}>
                        {inv.cname}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#31719B]">
                        {inv.inum}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 font-mono">
                        {inv.idt}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {inv.inv_type || "R"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">
                        {inv.pos?.slice(0, 15)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                        {formatIndianNumber(inv.val)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-700 dark:text-gray-300">
                        {formatIndianNumber(txval)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-700 dark:text-gray-300">
                        {formatIndianNumber(igst)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-700 dark:text-gray-300">
                        {formatIndianNumber(cgst)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-700 dark:text-gray-300">
                        {formatIndianNumber(samt)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-700 dark:text-gray-300">
                        {formatIndianNumber(csamt)}
                      </td>
                      <td className="py-2.5 px-3 text-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(globalIdx)}
                          className="p-1 text-gray-500 hover:text-[#31719B] transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(globalIdx)}
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals Row */}
              <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <td colSpan={7} className="py-2.5 px-3 text-left">
                    Totals across all {invoices.length} invoices:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tVal)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tTxval)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tIgst)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tCgst)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tSgst)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tCess)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredInvoices.length > pageSize && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <span>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredInvoices.length)} of {filteredInvoices.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1 rounded border border-[#dde2e8] dark:border-[#334155] disabled:opacity-40"
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                type="button"
                disabled={page * pageSize >= filteredInvoices.length}
                onClick={() => setPage(page + 1)}
                className="px-2.5 py-1 rounded border border-[#dde2e8] dark:border-[#334155] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

