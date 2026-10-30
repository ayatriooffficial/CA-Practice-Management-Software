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

export interface Section9BCdnProps {
  token: string;
  isRegistered: boolean;
  supplierStateCode: string;
  supplierGstin: string;
  notes: any[];
  onSaveNotes: (updated: any[]) => void;
  onBackToDashboard: () => void;
}

export const Section9BCdn: React.FC<Section9BCdnProps> = ({
  token,
  isRegistered,
  supplierStateCode,
  supplierGstin,
  notes,
  onSaveNotes,
  onBackToDashboard,
}) => {
  const [currentStep, setCurrentStep] = useState<"list" | "stepA" | "stepB">("list");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form State
  const [ctin, setCtin] = useState("");
  const [cname, setCname] = useState("");
  const [urType, setUrType] = useState<"B2CL" | "EXPWP" | "EXPWOP">("B2CL");
  const [ntty, setNtty] = useState<"C" | "D">("C");
  const [ntNum, setNtNum] = useState("");
  const [ntDt, setNtDt] = useState("");
  const [val, setVal] = useState<number | "">("");
  const [pos, setPos] = useState("");
  const [rchrg, setRchrg] = useState(false);
  const [invTyp, setInvTyp] = useState<any>("R");
  const [diffPercent, setDiffPercent] = useState(false);
  const [inum, setInum] = useState("");
  const [idt, setIdt] = useState("");
  const [stepAErrors, setStepAErrors] = useState<Record<string, string>>({});

  // Rate items
  const [rateItems, setRateItems] = useState<Record<number, {
    txval: number | "";
    iamt: number | "";
    camt: number | "";
    samt: number | "";
    csamt: number | "";
  }>>({});
  const [stepBErrors, setStepBErrors] = useState<string[]>([]);

  const isPosSupplierState = pos ? pos.substring(0, 2) === supplierStateCode : false;
  const isInterState = useMemo(() => {
    if (!isRegistered) return true; // Unregistered CDN is always IGST (B2CL/Export)
    if (invTyp === "DE" || invTyp === "SEWP" || invTyp === "SEWOP" || invTyp === "CBW") return true;
    return !isPosSupplierState;
  }, [isRegistered, invTyp, isPosSupplierState]);

  const handleAddNew = () => {
    setEditingIndex(null);
    setCtin("");
    setCname("");
    setUrType("B2CL");
    setNtty("C");
    setNtNum("");
    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    setNtDt(dStr);
    setVal("");
    setPos(supplierStateCode ? `${supplierStateCode}-${STATE_OPTIONS.find((s) => s.code === supplierStateCode)?.name}` : "");
    setRchrg(false);
    setInvTyp("R");
    setDiffPercent(false);
    setInum("");
    setIdt("");
    setStepAErrors({});

    const blankRates: any = {};
    TAX_RATES.forEach((rt) => {
      blankRates[rt] = { txval: "", iamt: "", camt: "", samt: "", csamt: "" };
    });
    setRateItems(blankRates);
    setCurrentStep("stepA");
  };

  const handleEdit = (idx: number) => {
    const n = notes[idx];
    setEditingIndex(idx);
    setCtin(n.ctin || "");
    setCname(n.cname || "");
    setUrType(n.ur_type || "B2CL");
    setNtty(n.ntty || "C");
    setNtNum(n.nt_num || "");
    setNtDt(n.nt_dt || "");
    setVal(n.val || "");
    setPos(n.pos || "");
    setRchrg(Boolean(n.rchrg));
    setInvTyp(n.inv_typ || "R");
    setDiffPercent(Boolean(n.diff_percent));
    setInum(n.inum || "");
    setIdt(n.idt || "");
    setStepAErrors({});

    const initialRates: any = {};
    TAX_RATES.forEach((rt) => {
      const match = (n.items || []).find((it: any) => Number(it.rt) === rt);
      initialRates[rt] = {
        txval: match ? match.txval : "",
        iamt: match ? match.iamt : "",
        camt: match ? match.camt : "",
        samt: match ? match.samt : "",
        csamt: match ? match.csamt : "",
      };
    });
    setRateItems(initialRates);
    setCurrentStep("stepA");
  };

  const handleStepANext = () => {
    const errors: Record<string, string> = {};

    if (isRegistered) {
      if (!ctin.trim()) errors.ctin = "Recipient GSTIN is mandatory";
      else if (ctin.length !== 15) errors.ctin = "GSTIN must be 15 characters";
      if (!cname.trim()) errors.cname = "Recipient Name is mandatory";
    }

    if (!ntNum.trim()) errors.ntNum = "Note number is mandatory";
    if (!ntDt.trim()) errors.ntDt = "Note date is mandatory";
    if (val === "" || Number(val) <= 0) errors.val = "Note value must be greater than zero";
    if (!pos) errors.pos = "Place of supply (POS) is mandatory";

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
      const cur = prev[rate] || { txval: "", iamt: "", camt: "", samt: "", csamt: "" };
      if (txval === "" || txval === 0) {
        return { ...prev, [rate]: { ...cur, txval: "", iamt: "", camt: "", samt: "" } };
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

  const { totalTaxable, totalIgst, totalCgst, totalSgst, totalCess } = useMemo(() => {
    let tx = 0;
    let ig = 0;
    let cg = 0;
    let sg = 0;
    let cs = 0;
    Object.values(rateItems).forEach((row) => {
      if (row.txval && Number(row.txval) > 0) {
        tx += Number(row.txval);
        ig += Number(row.iamt || 0);
        cg += Number(row.camt || 0);
        sg += Number(row.samt || 0);
        cs += Number(row.csamt || 0);
      }
    });
    return {
      totalTaxable: round2(tx),
      totalIgst: round2(ig),
      totalCgst: round2(cg),
      totalSgst: round2(sg),
      totalCess: round2(cs),
    };
  }, [rateItems]);

  const handleSaveNote = () => {
    if (totalTaxable <= 0) {
      setStepBErrors(["At least one rate row must have taxable value > 0"]);
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
      }));

    const newNote = {
      id: editingIndex !== null ? notes[editingIndex].id : `cdn_${Date.now()}`,
      registered: isRegistered,
      ctin: isRegistered ? ctin.trim().toUpperCase() : undefined,
      cname: isRegistered ? cname.trim() : undefined,
      ur_type: !isRegistered ? urType : undefined,
      ntty,
      nt_num: ntNum.trim(),
      nt_dt: ntDt.trim(),
      val: Number(val),
      pos,
      rchrg: isRegistered ? rchrg : undefined,
      inv_typ: isRegistered ? invTyp : undefined,
      diff_percent: diffPercent ? 0.65 : undefined,
      inum: inum.trim() || undefined,
      idt: idt.trim() || undefined,
      items,
    };

    let updated = [...notes];
    if (editingIndex !== null) {
      updated[editingIndex] = newNote;
    } else {
      updated.unshift(newNote);
    }
    onSaveNotes(updated);
    setCurrentStep("list");
  };

  const handleDelete = (idx: number) => {
    if (!confirm("Delete this credit/debit note?")) return;
    onSaveNotes(notes.filter((_, i) => i !== idx));
  };

  const totals = useMemo(() => {
    let tVal = 0;
    let tTxval = 0;
    let tIgst = 0;
    let tCgst = 0;
    let tSgst = 0;
    let tCess = 0;

    notes.forEach((n) => {
      const sign = n.ntty === "C" ? -1 : 1;
      tVal += sign * (n.val || 0);
      (n.items || []).forEach((it: any) => {
        tTxval += sign * (it.txval || 0);
        tIgst += sign * (it.iamt || 0);
        tCgst += sign * (it.camt || 0);
        tSgst += sign * (it.samt || 0);
        tCess += sign * (it.csamt || 0);
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
  }, [notes]);

  const titleText = isRegistered
    ? "9B – Credit / Debit Notes (Registered)"
    : "9B – Credit / Debit Notes (Unregistered)";

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h1 className="text-base font-bold text-gray-900 dark:text-white">
              {titleText}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRegistered
                ? "Credit and debit notes issued to registered recipients"
                : "Credit and debit notes for B2C Large, exports or unregistered buyers"}
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
            <span>Add Note</span>
          </button>
        )}
      </div>

      {currentStep === "list" && (
        <CsvImportCard
          token={token}
          sectionKey={isRegistered ? "cdnr" : "cdnur"}
          sectionTitle={titleText}
          onImportComplete={(importedRows, mode) => {
            const parsed = importedRows.map((r) => ({
              id: `cdn_csv_${Date.now()}_${Math.random()}`,
              registered: isRegistered,
              ctin: r.recipient_gstin,
              cname: r.recipient_name,
              ntty: r.note_type === "D" ? "D" : "C",
              nt_num: r.note_no,
              nt_dt: r.note_date,
              val: Number(r.note_value) || 0,
              pos: r.pos,
              items: [
                {
                  rt: Number(r.rate) || 0,
                  txval: Number(r.taxable_value) || 0,
                  iamt: Number(r.igst) || 0,
                  camt: Number(r.cgst) || 0,
                  samt: Number(r.sgst) || 0,
                  csamt: Number(r.cess) || 0,
                },
              ],
            }));
            onSaveNotes(mode === "replace" ? parsed : [...parsed, ...notes]);
          }}
          validatorFn={(r) => ({ valid: Boolean(r.note_no && r.note_date), errors: [] })}
        />
      )}

      {/* Step A Form */}
      {currentStep === "stepA" && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
          <div className="border-b border-[#dde2e8] dark:border-[#334155] pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Step A: {editingIndex !== null ? "Edit Note Details" : "Add Note Details"}
            </h2>
            <span className="text-xs text-gray-400 font-medium">Step 1 of 2</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Note Type (Credit / Debit) */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Note Type <span className="text-red-500">*</span>
              </label>
              <select
                value={ntty}
                onChange={(e) => setNtty(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B]"
              >
                <option value="C">Credit Note (Reduces liability)</option>
                <option value="D">Debit Note (Increases liability)</option>
              </select>
            </div>

            {/* Note Number* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Note Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={16}
                value={ntNum}
                onChange={(e) => setNtNum(e.target.value)}
                placeholder="e.g. CN/001"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
              />
              {stepAErrors.ntNum && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.ntNum}</span>}
            </div>

            {/* Note Date* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Note Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ntDt}
                onChange={(e) => setNtDt(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
              />
              {stepAErrors.ntDt && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.ntDt}</span>}
            </div>

            {/* If Registered: Recipient GSTIN & Name */}
            {isRegistered ? (
              <>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Recipient GSTIN/UIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={ctin}
                    onChange={(e) => setCtin(e.target.value.toUpperCase())}
                    placeholder="15-digit Recipient GSTIN"
                    className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
                  />
                  {stepAErrors.ctin && <span className="text-red-500 text-[11px] mt-1 block">{stepAErrors.ctin}</span>}
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Recipient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cname}
                    onChange={(e) => setCname(e.target.value)}
                    placeholder="Name"
                    className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B]"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={urType}
                  onChange={(e) => setUrType(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B]"
                >
                  <option value="B2CL">B2CL (B2C Large)</option>
                  <option value="EXPWP">Export with payment</option>
                  <option value="EXPWOP">Export without payment</option>
                </select>
              </div>
            )}

            {/* Note Value (₹)* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Note Value (₹) <span className="text-red-500">*</span>
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

            {/* POS* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Place of Supply (POS) <span className="text-red-500">*</span>
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
            </div>

            {/* Original Invoice No (Optional) */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Original Invoice No. (Optional)
              </label>
              <input
                type="text"
                value={inum}
                onChange={(e) => setInum(e.target.value)}
                placeholder="Original invoice number"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
              />
            </div>

            {/* Original Invoice Date (Optional) */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Original Invoice Date (Optional)
              </label>
              <input
                type="text"
                value={idt}
                onChange={(e) => setIdt(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
              />
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

      {/* Step B Rate Grid Form */}
      {currentStep === "stepB" && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
          <div className="border-b border-[#dde2e8] dark:border-[#334155] pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Step B: Item Details for Note {ntNum} ({ntty === "C" ? "Credit Note" : "Debit Note"})
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
                  const itm = rateItems[rt] || { txval: "", iamt: "", camt: "", samt: "", csamt: "" };
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
                      {isInterState ? (
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            disabled={!isFilled}
                            value={itm.iamt}
                            onChange={(e) =>
                              setRateItems((prev) => ({
                                ...prev,
                                [rt]: { ...prev[rt], iamt: e.target.value === "" ? "" : Number(e.target.value) },
                              }))
                            }
                            className="h-8 w-32 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400"
                          />
                        </td>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              disabled={!isFilled}
                              value={itm.camt}
                              onChange={(e) =>
                                setRateItems((prev) => ({
                                  ...prev,
                                  [rt]: { ...prev[rt], camt: e.target.value === "" ? "" : Number(e.target.value) },
                                }))
                              }
                              className="h-8 w-28 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              disabled={!isFilled}
                              value={itm.samt}
                              onChange={(e) =>
                                setRateItems((prev) => ({
                                  ...prev,
                                  [rt]: { ...prev[rt], samt: e.target.value === "" ? "" : Number(e.target.value) },
                                }))
                              }
                              className="h-8 w-28 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400"
                            />
                          </td>
                        </>
                      )}
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          disabled={!isFilled}
                          value={itm.csamt}
                          onChange={(e) =>
                            setRateItems((prev) => ({
                              ...prev,
                              [rt]: { ...prev[rt], csamt: e.target.value === "" ? "" : Number(e.target.value) },
                            }))
                          }
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
              onClick={handleSaveNote}
              className="px-6 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
              style={{ backgroundColor: "var(--primary, #31719B)" }}
            >
              SAVE NOTE
            </button>
          </div>
        </div>
      )}

      {/* Saved Records Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Saved Notes ({notes.length})
        </h2>

        {notes.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs">
            No credit/debit notes saved yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  {isRegistered && <th className="py-2.5 px-3">GSTIN</th>}
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Note No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Value</th>
                  <th className="py-2.5 px-3">POS</th>
                  <th className="py-2.5 px-3 text-right">Taxable Val</th>
                  <th className="py-2.5 px-3 text-right">IGST</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                  <th className="py-2.5 px-3 text-right">Cess</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                {notes.map((n, idx) => {
                  const itms = n.items || [];
                  const txval = itms.reduce((s: number, it: any) => s + (it.txval || 0), 0);
                  const igst = itms.reduce((s: number, it: any) => s + (it.iamt || 0), 0);
                  const cgst = itms.reduce((s: number, it: any) => s + (it.camt || 0), 0);
                  const samt = itms.reduce((s: number, it: any) => s + (it.samt || 0), 0);
                  const cess = itms.reduce((s: number, it: any) => s + (it.csamt || 0), 0);
                  return (
                    <tr key={n.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      {isRegistered && (
                        <td className="py-2.5 px-3 font-mono font-medium text-gray-900 dark:text-white">
                          {n.ctin}
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            n.ntty === "C"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {n.ntty === "C" ? "Credit" : "Debit"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#31719B]">{n.nt_num}</td>
                      <td className="py-2.5 px-3 text-gray-500 font-mono">{n.nt_dt}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                        {formatIndianNumber(n.val)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">{n.pos?.slice(0, 15)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(txval)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(igst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(cgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(samt)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(cess)}</td>
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
                  <td colSpan={isRegistered ? 4 : 3} className="py-2.5 px-3">Net Notes Total:</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.tVal)}</td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.tTxval)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.tIgst)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.tCgst)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.tSgst)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.tCess)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

