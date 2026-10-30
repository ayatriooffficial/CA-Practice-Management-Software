import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  formatIndianCurrency,
  formatIndianNumber,
  round2,
  STATE_OPTIONS,
  TAX_RATES,
} from "./gstFormUtils";
import { CsvImportCard } from "./CsvImportCard";

export interface Section7B2COthersProps {
  token: string;
  supplierStateCode: string;
  records: any[];
  onSaveRecords: (updated: any[]) => void;
  onBackToDashboard: () => void;
}

export const Section7B2COthers: React.FC<Section7B2COthersProps> = ({
  token,
  supplierStateCode,
  records,
  onSaveRecords,
  onBackToDashboard,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form State
  const [pos, setPos] = useState("");
  const [txval, setTxval] = useState<number | "">("");
  const [diffPercent, setDiffPercent] = useState(false);
  const [rate, setRate] = useState<number>(18);
  const [iamt, setIamt] = useState<number | "">("");
  const [camt, setCamt] = useState<number | "">("");
  const [samt, setSamt] = useState<number | "">("");
  const [csamt, setCsamt] = useState<number | "">("");
  const [formError, setFormError] = useState<string | null>(null);

  const isIntraState = useMemo(() => {
    if (!pos) return true;
    return pos.substring(0, 2) === supplierStateCode;
  }, [pos, supplierStateCode]);

  // Auto-calculate taxes when txval, rate, or diffPercent changes
  const handleRecalculateTax = (
    newTxval: number | "",
    newRate: number,
    newDiff: boolean,
    currentPos: string
  ) => {
    if (newTxval === "" || Number(newTxval) <= 0) {
      setIamt("");
      setCamt("");
      setSamt("");
      return;
    }
    const val = Number(newTxval);
    const mult = newDiff ? 0.65 : 1;
    const totalTax = round2((val * newRate * mult) / 100);

    const isIntra = currentPos ? currentPos.substring(0, 2) === supplierStateCode : true;
    if (isIntra) {
      const half = round2(totalTax / 2);
      setIamt(0);
      setCamt(half);
      setSamt(half);
    } else {
      setIamt(totalTax);
      setCamt(0);
      setSamt(0);
    }
  };

  const handleOpenAdd = () => {
    setEditingIndex(null);
    const defPos = supplierStateCode
      ? `${supplierStateCode}-${STATE_OPTIONS.find((s) => s.code === supplierStateCode)?.name}`
      : "";
    setPos(defPos);
    setTxval("");
    setDiffPercent(false);
    setRate(18);
    setIamt("");
    setCamt("");
    setSamt("");
    setCsamt("");
    setFormError(null);
    setIsAdding(true);
  };

  const handleOpenEdit = (idx: number) => {
    const r = records[idx];
    setEditingIndex(idx);
    setPos(r.pos || "");
    setTxval(r.txval || "");
    setDiffPercent(Boolean(r.diff_percent));
    setRate(r.rt || 18);
    setIamt(r.iamt ?? "");
    setCamt(r.camt ?? "");
    setSamt(r.samt ?? "");
    setCsamt(r.csamt ?? "");
    setFormError(null);
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!pos) {
      setFormError("Place of Supply (POS) is mandatory");
      return;
    }
    if (txval === "" || Number(txval) <= 0) {
      setFormError("Taxable value must be greater than zero");
      return;
    }

    // Uniqueness: one record per POS + Rate + differential flag
    const diffFlag = diffPercent ? 0.65 : 1;
    const exists = records.some(
      (r, i) =>
        i !== editingIndex &&
        r.pos === pos &&
        Number(r.rt) === Number(rate) &&
        (r.diff_percent ? 0.65 : 1) === diffFlag
    );

    if (exists) {
      setFormError("Record already exists for this POS, Rate and differential flag. Please edit the existing row.");
      return;
    }

    const newRecord = {
      id: editingIndex !== null ? records[editingIndex].id : `b2cs_${Date.now()}`,
      pos,
      sply_ty: isIntraState ? "INTRA" : "INTER",
      typ: "OE",
      rt: Number(rate),
      txval: Number(txval),
      diff_percent: diffPercent ? 0.65 : undefined,
      iamt: isIntraState ? 0 : Number(iamt || 0),
      camt: isIntraState ? Number(camt || 0) : 0,
      samt: isIntraState ? Number(samt || 0) : 0,
      csamt: Number(csamt || 0),
    };

    let updated = [...records];
    if (editingIndex !== null) {
      updated[editingIndex] = newRecord;
    } else {
      updated.unshift(newRecord);
    }
    onSaveRecords(updated);
    setIsAdding(false);
  };

  const handleDelete = (idx: number) => {
    if (!confirm("Delete this B2C Others record?")) return;
    onSaveRecords(records.filter((_, i) => i !== idx));
  };

  const handleCsvImport = (rows: any[], mode: "add" | "replace") => {
    // CSV aggregates duplicate keys by summing taxable value & taxes
    const aggMap = new Map<string, any>();

    const baseList = mode === "replace" ? [] : [...records];
    baseList.forEach((r) => {
      const key = `${r.pos}_${r.rt}_${r.diff_percent ? "Y" : "N"}`;
      aggMap.set(key, { ...r });
    });

    rows.forEach((r) => {
      const p = r.pos || "";
      const rt = Number(r.rate) || 0;
      const isDiff = r.differential_rate === "Y" || r.differential_rate === "0.65";
      const key = `${p}_${rt}_${isDiff ? "Y" : "N"}`;
      const isIntra = p ? p.substring(0, 2) === supplierStateCode : true;

      const tx = Number(r.taxable_value) || 0;
      const ig = Number(r.igst) || 0;
      const cg = Number(r.cgst) || 0;
      const sg = Number(r.sgst) || 0;
      const cs = Number(r.cess) || 0;

      if (aggMap.has(key)) {
        const cur = aggMap.get(key);
        cur.txval = round2(cur.txval + tx);
        cur.iamt = round2(cur.iamt + ig);
        cur.camt = round2(cur.camt + cg);
        cur.samt = round2(cur.samt + sg);
        cur.csamt = round2(cur.csamt + cs);
      } else {
        aggMap.set(key, {
          id: `b2cs_csv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          pos: p,
          sply_ty: isIntra ? "INTRA" : "INTER",
          typ: "OE",
          rt,
          txval: tx,
          diff_percent: isDiff ? 0.65 : undefined,
          iamt: isIntra ? 0 : ig,
          camt: isIntra ? cg : 0,
          samt: isIntra ? sg : 0,
          csamt: cs,
        });
      }
    });

    onSaveRecords(Array.from(aggMap.values()));
  };

  const validateCsvRow = (row: any) => {
    const errs: string[] = [];
    if (!row.pos) errs.push("pos missing");
    if (!row.rate) errs.push("rate missing");
    if (!row.taxable_value) errs.push("taxable_value missing");
    return { valid: errs.length === 0, errors: errs };
  };

  const totals = useMemo(() => {
    let tx = 0;
    let ig = 0;
    let cg = 0;
    let sg = 0;
    let cs = 0;
    records.forEach((r) => {
      tx += r.txval || 0;
      ig += r.iamt || 0;
      cg += r.camt || 0;
      sg += r.samt || 0;
      cs += r.csamt || 0;
    });
    return {
      tx: round2(tx),
      ig: round2(ig),
      cg: round2(cg),
      sg: round2(sg),
      cs: round2(cs),
    };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dde2e8] dark:border-[#334155] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isAdding ? () => setIsAdding(false) : onBackToDashboard}
            className="p-1.5 rounded-lg border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>7 – B2C (Others) Details</span>
              <span className="text-xs font-normal text-gray-400">
                ({records.length} {records.length === 1 ? "entry" : "entries"})
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Aggregated supplies to unregistered persons (Intra-State & Inter-State under ₹1 Lakh)
            </p>
          </div>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
            style={{ backgroundColor: "var(--primary, #31719B)" }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Details</span>
          </button>
        )}
      </div>

      {!isAdding && (
        <CsvImportCard
          token={token}
          sectionKey="b2cs"
          sectionTitle="B2C (Others)"
          onImportComplete={handleCsvImport}
          validatorFn={validateCsvRow}
        />
      )}

      {/* Single Add/Edit Form matching Screenshot 5 */}
      {isAdding && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
          <div className="border-b border-[#dde2e8] dark:border-[#334155] pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {editingIndex !== null ? "B2CS – Edit Details" : "B2CS – Add Details"}
            </h2>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. POS* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <span>POS (Place of Supply)</span> <span className="text-red-500">*</span>
                <span title="Place of Supply: state where the goods/services are supplied" className="text-gray-400 cursor-help">
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
              </label>
              <select
                value={pos}
                onChange={(e) => {
                  setPos(e.target.value);
                  handleRecalculateTax(txval, rate, diffPercent, e.target.value);
                }}
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

            {/* 2. Taxable Value (₹)* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Taxable value (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={txval}
                onChange={(e) => {
                  const v = e.target.value === "" ? "" : Number(e.target.value);
                  setTxval(v);
                  handleRecalculateTax(v, rate, diffPercent, pos);
                }}
                placeholder="0.00"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B]"
              />
            </div>

            {/* 3. Supply Type (Computed) */}
            <div>
              <label className="block font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Supply Type
              </label>
              <input
                type="text"
                readOnly
                value={isIntraState ? "Intra-State" : "Inter-State"}
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-gray-100 dark:bg-gray-800 px-3 text-gray-700 dark:text-gray-300 font-medium cursor-not-allowed"
              />
            </div>

            {/* 4. Differential percentage checkbox */}
            <div className="flex items-center pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={diffPercent}
                  onChange={(e) => {
                    setDiffPercent(e.target.checked);
                    handleRecalculateTax(txval, rate, e.target.checked, pos);
                  }}
                  className="w-3.5 h-3.5 accent-[#31719B]"
                />
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  Differential tax rate (65%)
                </span>
              </label>
            </div>

            {/* 5. Rate* */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Rate (%) <span className="text-red-500">*</span>
              </label>
              <select
                value={rate}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  setRate(r);
                  handleRecalculateTax(txval, r, diffPercent, pos);
                }}
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B]"
              >
                {TAX_RATES.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}%
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Integrated Tax (Shown only when Inter-State) */}
            {!isIntraState ? (
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Integrated Tax (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={iamt}
                  onChange={(e) => setIamt(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B]"
                />
              </div>
            ) : (
              <>
                {/* 7. Central Tax & State Tax (Shown only when Intra-State) */}
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Central Tax (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={camt}
                    onChange={(e) => setCamt(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    State/UT Tax (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={samt}
                    onChange={(e) => setSamt(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B]"
                  />
                </div>
              </>
            )}

            {/* 8. Cess */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                CESS (₹) (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={csamt}
                onChange={(e) => setCsamt(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-xs cursor-pointer"
            >
              BACK
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
              style={{ backgroundColor: "var(--primary, #31719B)" }}
            >
              SAVE
            </button>
          </div>
        </div>
      )}

      {/* Saved Records Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Saved B2C (Others) Records ({records.length})
        </h2>

        {records.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs">
            No B2C Others records saved yet. Click &quot;Add Details&quot; to add a POS rate row.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <th className="py-2.5 px-3">POS</th>
                  <th className="py-2.5 px-3">Supply Type</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value</th>
                  <th className="py-2.5 px-3 text-right">IGST</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                  <th className="py-2.5 px-3 text-right">Cess</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                {records.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{r.pos}</td>
                    <td className="py-2.5 px-3 text-gray-500">{r.sply_ty === "INTRA" ? "Intra-State" : "Inter-State"}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">{r.rt}%</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                      {formatIndianNumber(r.txval)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(r.iamt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(r.camt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(r.samt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(r.csamt)}</td>
                    <td className="py-2.5 px-3 text-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(idx)}
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
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3">Totals:</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.tx)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.ig)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.cg)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.sg)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(totals.cs)}</td>
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

