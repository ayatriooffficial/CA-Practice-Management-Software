import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  formatIndianCurrency,
  formatIndianNumber,
  round2,
  STATE_OPTIONS,
  TAX_RATES,
} from "./gstFormUtils";
import { CsvImportCard } from "./CsvImportCard";

export interface Section5B2CLargeProps {
  token: string;
  supplierStateCode: string;
  invoices: any[];
  onSaveInvoices: (updated: any[]) => void;
  onBackToDashboard: () => void;
}

export const Section5B2CLarge: React.FC<Section5B2CLargeProps> = ({
  token,
  supplierStateCode,
  invoices,
  onSaveInvoices,
  onBackToDashboard,
}) => {
  const [currentStep, setCurrentStep] = useState<"list" | "stepA" | "stepB">("list");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Step A Form State
  const [pos, setPos] = useState("");
  const [inum, setInum] = useState("");
  const [idt, setIdt] = useState("");
  const [val, setVal] = useState<number | "">("");
  const [diffPercent, setDiffPercent] = useState(false);
  const [etin, setEtin] = useState("");
  const [stepAErrors, setStepAErrors] = useState<Record<string, string>>({});

  // Step B Rate Grid State (IGST + Cess only)
  const [rateItems, setRateItems] = useState<Record<number, {
    txval: number | "";
    iamt: number | "";
    csamt: number | "";
  }>>({});
  const [stepBErrors, setStepBErrors] = useState<string[]>([]);

  // Inter-state POS options (cannot be supplier state)
  const interStateOptions = useMemo(() => {
    return STATE_OPTIONS.filter((s) => s.code !== supplierStateCode);
  }, [supplierStateCode]);

  const handleAddNew = () => {
    setEditingIndex(null);
    setPos("");
    setInum("");
    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    setIdt(dStr);
    setVal("");
    setDiffPercent(false);
    setEtin("");
    setStepAErrors({});

    const blankRates: any = {};
    TAX_RATES.forEach((rt) => {
      blankRates[rt] = { txval: "", iamt: "", csamt: "" };
    });
    setRateItems(blankRates);
    setCurrentStep("stepA");
  };

  const handleEdit = (idx: number) => {
    const inv = invoices[idx];
    setEditingIndex(idx);
    setPos(inv.pos || "");
    setInum(inv.inum || "");
    setIdt(inv.idt || "");
    setVal(inv.val || "");
    setDiffPercent(Boolean(inv.diff_percent));
    setEtin(inv.etin || "");
    setStepAErrors({});

    const initialRates: any = {};
    TAX_RATES.forEach((rt) => {
      const match = (inv.items || []).find((it: any) => Number(it.rt) === rt);
      initialRates[rt] = {
        txval: match ? match.txval : "",
        iamt: match ? match.iamt : "",
        csamt: match ? match.csamt : "",
      };
    });
    setRateItems(initialRates);
    setCurrentStep("stepA");
  };

  const handleStepANext = () => {
    const errors: Record<string, string> = {};

    if (!pos) {
      errors.pos = "Place of supply (POS) is mandatory";
    } else if (pos.substring(0, 2) === supplierStateCode) {
      errors.pos = "B2C Large POS must be Inter-State (cannot be supplier state)";
    }

    if (!inum.trim()) {
      errors.inum = "Invoice number is mandatory";
    } else if (inum.length > 16) {
      errors.inum = "Invoice number cannot exceed 16 characters";
    }

    if (!idt.trim()) {
      errors.idt = "Invoice date is mandatory";
    }

    if (val === "" || Number(val) <= 100000) {
      errors.val = "Total invoice value must exceed ₹1,00,000 for B2C Large";
    }

    if (Object.keys(errors).length > 0) {
      setStepAErrors(errors);
      return;
    }

    setStepAErrors({});
    setCurrentStep("stepB");
  };

  const handleTaxableChange = (rate: number, txStr: string) => {
    const txval = txStr === "" ? "" : Number(txStr);
    const multiplier = diffPercent ? 0.65 : 1;

    setRateItems((prev) => {
      const cur = prev[rate] || { txval: "", iamt: "", csamt: "" };
      if (txval === "" || txval === 0) {
        return { ...prev, [rate]: { ...cur, txval: "", iamt: "" } };
      }
      const igst = round2((txval * rate * multiplier) / 100);
      return {
        ...prev,
        [rate]: {
          ...cur,
          txval,
          iamt: igst,
          csamt: cur.csamt || 0,
        },
      };
    });
  };

  const { totalTaxable, totalIgst, totalCess, totalTaxAndVal } = useMemo(() => {
    let tTaxable = 0;
    let tIgst = 0;
    let tCess = 0;

    Object.values(rateItems).forEach((row) => {
      if (row.txval && Number(row.txval) > 0) {
        tTaxable += Number(row.txval);
        tIgst += Number(row.iamt || 0);
        tCess += Number(row.csamt || 0);
      }
    });

    return {
      totalTaxable: round2(tTaxable),
      totalIgst: round2(tIgst),
      totalCess: round2(tCess),
      totalTaxAndVal: round2(tTaxable + tIgst + tCess),
    };
  }, [rateItems]);

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
        camt: 0,
        samt: 0,
        csamt: Number(row.csamt || 0),
      }));

    const newInvoice = {
      id: editingIndex !== null ? invoices[editingIndex].id : `b2cl_${Date.now()}`,
      pos,
      inum: inum.trim(),
      idt: idt.trim(),
      val: Number(val),
      diff_percent: diffPercent ? 0.65 : undefined,
      etin: etin.trim() || undefined,
      items,
    };

    let updated = [...invoices];
    if (editingIndex !== null) {
      updated[editingIndex] = newInvoice;
    } else {
      updated.unshift(newInvoice);
    }
    onSaveInvoices(updated);
    setCurrentStep("list");
  };

  const handleDelete = (idx: number) => {
    if (!confirm("Delete this B2C Large invoice?")) return;
    onSaveInvoices(invoices.filter((_, i) => i !== idx));
  };

  const handleCsvImport = (rows: any[], mode: "add" | "replace") => {
    const groupMap = new Map<string, any>();
    rows.forEach((r) => {
      const num = (r.invoice_no || "").trim();
      if (!groupMap.has(num)) {
        groupMap.set(num, {
          id: `b2cl_csv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          pos: r.pos || "",
          inum: num,
          idt: r.invoice_date || "",
          val: Number(r.invoice_value) || 0,
          diff_percent: r.differential_rate === "Y" || r.differential_rate === "0.65" ? 0.65 : undefined,
          etin: r.ecom_gstin || undefined,
          items: [],
        });
      }
      const inv = groupMap.get(num);
      inv.items.push({
        rt: Number(r.rate) || 0,
        txval: Number(r.taxable_value) || 0,
        iamt: Number(r.igst) || 0,
        camt: 0,
        samt: 0,
        csamt: Number(r.cess) || 0,
      });
    });

    const parsed = Array.from(groupMap.values());
    onSaveInvoices(mode === "replace" ? parsed : [...parsed, ...invoices]);
  };

  const validateCsvRow = (row: any) => {
    const errs: string[] = [];
    if (!row.pos) errs.push("pos missing");
    if (!row.invoice_no) errs.push("invoice_no missing");
    if (!row.invoice_date) errs.push("invoice_date missing");
    if (!row.invoice_value || Number(row.invoice_value) <= 100000) errs.push("invoice_value must exceed ₹1 Lakh");
    return { valid: errs.length === 0, errors: errs };
  };

  const tableTotals = useMemo(() => {
    let tVal = 0;
    let tTxval = 0;
    let tIgst = 0;
    let tCess = 0;
    invoices.forEach((inv) => {
      tVal += inv.val || 0;
      (inv.items || []).forEach((it: any) => {
        tTxval += it.txval || 0;
        tIgst += it.iamt || 0;
        tCess += it.csamt || 0;
      });
    });
    return {
      tVal: round2(tVal),
      tTxval: round2(tTxval),
      tIgst: round2(tIgst),
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
              <span>5 – B2C (Large) Invoices</span>
              <span className="text-xs font-normal text-gray-400">
                ({invoices.length} {invoices.length === 1 ? "invoice" : "invoices"})
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Inter-State invoices to unregistered persons exceeding ₹1,00,000 threshold
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

      {currentStep === "list" && (
        <CsvImportCard
          token={token}
          sectionKey="b2cl"
          sectionTitle="B2C Large Invoices"
          onImportComplete={handleCsvImport}
          validatorFn={validateCsvRow}
        />
      )}

      {/* Step A Form */}
      {currentStep === "stepA" && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
          <div className="border-b border-[#dde2e8] dark:border-[#334155] pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Step A: {editingIndex !== null ? "Edit B2C Large Details" : "Add B2C Large Details"}
            </h2>
            <span className="text-xs text-gray-400 font-medium">Step 1 of 2</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* POS* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                POS (Place of Supply) <span className="text-red-500">*</span>
              </label>
              <select
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B]"
              >
                <option value="">Select Inter-State POS</option>
                {interStateOptions.map((st) => (
                  <option key={st.code} value={st.label}>
                    {st.label}
                  </option>
                ))}
              </select>
              {stepAErrors.pos && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.pos}</span>}
            </div>

            {/* Invoice No* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Invoice no. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={16}
                value={inum}
                onChange={(e) => setInum(e.target.value)}
                placeholder="e.g. INV-L001"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
              />
              {stepAErrors.inum && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.inum}</span>}
            </div>

            {/* Invoice Date* */}
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

            {/* Total invoice value (₹)* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Total invoice value (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={val}
                onChange={(e) => setVal(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Must exceed ₹1,00,000"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B]"
              />
              {stepAErrors.val && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.val}</span>}
            </div>

            {/* E-commerce Operator GSTIN */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                E-Commerce Operator GSTIN (Optional)
              </label>
              <input
                type="text"
                maxLength={15}
                value={etin}
                onChange={(e) => setEtin(e.target.value.toUpperCase())}
                placeholder="15-digit ECO GSTIN"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
              />
            </div>

            {/* Differential Rate Checkbox */}
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={diffPercent}
                  onChange={(e) => setDiffPercent(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#31719B]"
                />
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  Differential Percentage (65%)
                </span>
              </label>
            </div>
          </div>

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
              className="px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
              style={{ backgroundColor: "var(--primary, #31719B)" }}
            >
              PROCEED TO ITEM DETAILS →
            </button>
          </div>
        </div>
      )}

      {/* Step B Rate Grid Form (IGST + Cess only) */}
      {currentStep === "stepB" && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
          <div className="border-b border-[#dde2e8] dark:border-[#334155] pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Step B: Item Details for Invoice {inum} (Inter-State IGST Only)
            </h2>
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

          <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e3a5f] text-white font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-28">Rate (%)</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value (₹)*</th>
                  <th className="py-2.5 px-3 text-right">Integrated Tax (₹)*</th>
                  <th className="py-2.5 px-3 text-right">Cess (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                {TAX_RATES.map((rt) => {
                  const itm = rateItems[rt] || { txval: "", iamt: "", csamt: "" };
                  const isFilled = itm.txval !== "" && Number(itm.txval) > 0;
                  return (
                    <tr key={rt} className={isFilled ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}>
                      <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">{rt}%</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={itm.txval}
                          onChange={(e) => handleTaxableChange(rt, e.target.value)}
                          placeholder="0.00"
                          className="h-8 w-36 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B]"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          disabled={!isFilled}
                          value={itm.iamt}
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
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          disabled={!isFilled}
                          value={itm.csamt}
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
              <tfoot className="bg-gray-100 dark:bg-gray-800/80 font-bold border-t-2 border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <td className="py-2.5 px-3">Total</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianCurrency(totalTaxable)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianCurrency(totalIgst)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianCurrency(totalCess)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl flex flex-wrap items-center justify-between text-xs gap-3">
            <div>
              <span className="text-gray-500">Invoice Value: </span>
              <span className="font-bold font-mono">{formatIndianCurrency(Number(val))}</span>
            </div>
            <div>
              <span className="text-gray-500">Calculated Total: </span>
              <span className="font-bold font-mono text-[#31719B]">{formatIndianCurrency(totalTaxAndVal)}</span>
            </div>
            <div>
              {Number(val) < totalTaxable ? (
                <span className="text-red-500 font-bold">Error: Invoice value &lt; Taxable value</span>
              ) : (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Reconciled
                </span>
              )}
            </div>
          </div>

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
              className="px-6 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
              style={{ backgroundColor: "var(--primary, #31719B)" }}
            >
              SAVE INVOICE
            </button>
          </div>
        </div>
      )}

      {/* Saved Records Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Saved B2C Large Invoices ({invoices.length})
        </h2>

        {invoices.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs">
            No B2C Large records saved yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <th className="py-2.5 px-3">POS</th>
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Invoice Val</th>
                  <th className="py-2.5 px-3 text-right">Taxable Val</th>
                  <th className="py-2.5 px-3 text-right">IGST</th>
                  <th className="py-2.5 px-3 text-right">Cess</th>
                  <th className="py-2.5 px-3">E-Com GSTIN</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                {invoices.map((inv, idx) => {
                  const itms = inv.items || [];
                  const txval = itms.reduce((s: number, it: any) => s + (it.txval || 0), 0);
                  const igst = itms.reduce((s: number, it: any) => s + (it.iamt || 0), 0);
                  const cess = itms.reduce((s: number, it: any) => s + (it.csamt || 0), 0);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{inv.pos}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#31719B]">{inv.inum}</td>
                      <td className="py-2.5 px-3 text-gray-500 font-mono">{inv.idt}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                        {formatIndianNumber(inv.val)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(txval)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(igst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(cess)}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-500">{inv.etin || "-"}</td>
                      <td className="py-2.5 px-3 text-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(idx)}
                          className="p-1 text-gray-500 hover:text-[#31719B] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(idx)}
                          className="p-1 text-gray-500 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3">Totals:</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tVal)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tTxval)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tIgst)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(tableTotals.tCess)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

