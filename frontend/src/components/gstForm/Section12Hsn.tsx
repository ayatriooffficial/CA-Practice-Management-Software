import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  AlertCircle,
  Download,
  Sparkles,
  Info,
} from "lucide-react";
import {
  formatIndianCurrency,
  formatIndianNumber,
  round2,
  TAX_RATES,
  UQC_OPTIONS,
  HSN_MASTER_LIST,
} from "./gstFormUtils";
import { CsvImportCard } from "./CsvImportCard";

export interface Section12HsnProps {
  token: string;
  turnoverSlab: "Up to ₹5 crore" | "Above ₹5 crore";
  hsnB2b: any[];
  hsnB2c: any[];
  b2bInvoices: any[];
  b2clInvoices: any[];
  b2csRows: any[];
  cdnrNotes: any[];
  onSaveHsn: (b2b: any[], b2c: any[]) => void;
  onBackToDashboard: () => void;
}

export const Section12Hsn: React.FC<Section12HsnProps> = ({
  token,
  turnoverSlab,
  hsnB2b,
  hsnB2c,
  b2bInvoices,
  b2clInvoices,
  b2csRows,
  cdnrNotes,
  onSaveHsn,
  onBackToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<"B2B" | "B2C">("B2B");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form State
  const [selectedHsn, setSelectedHsn] = useState<any | null>(null);
  const [productNameMaster, setProductNameMaster] = useState("");
  const [uqc, setUqc] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [txval, setTxval] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");
  const [iamt, setIamt] = useState<number | "">(0);
  const [camt, setCamt] = useState<number | "">(0);
  const [samt, setSamt] = useState<number | "">(0);
  const [csamt, setCsamt] = useState<number | "">(0);
  const [hsnSearch, setHsnSearch] = useState("");
  const [showHsnDropdown, setShowHsnDropdown] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const minDigits = turnoverSlab === "Above ₹5 crore" ? 6 : 4;

  const currentRecords = activeTab === "B2B" ? hsnB2b : hsnB2c;

  // Expected Sections Totals for Reconciliation
  const expectedB2b = useMemo(() => {
    let tx = 0;
    let ig = 0;
    let cg = 0;
    let sg = 0;
    let cs = 0;

    b2bInvoices.forEach((inv) => {
      (inv.items || []).forEach((it: any) => {
        tx += it.txval || 0;
        ig += it.iamt || 0;
        cg += it.camt || 0;
        sg += it.samt || 0;
        cs += it.csamt || 0;
      });
    });

    cdnrNotes.forEach((n) => {
      const sign = n.ntty === "C" ? -1 : 1;
      (n.items || []).forEach((it: any) => {
        tx += sign * (it.txval || 0);
        ig += sign * (it.iamt || 0);
        cg += sign * (it.camt || 0);
        sg += sign * (it.samt || 0);
        cs += sign * (it.csamt || 0);
      });
    });

    return {
      tx: round2(tx),
      ig: round2(ig),
      cg: round2(cg),
      sg: round2(sg),
      cs: round2(cs),
    };
  }, [b2bInvoices, cdnrNotes]);

  const expectedB2c = useMemo(() => {
    let tx = 0;
    let ig = 0;
    let cg = 0;
    let sg = 0;
    let cs = 0;

    b2clInvoices.forEach((inv) => {
      (inv.items || []).forEach((it: any) => {
        tx += it.txval || 0;
        ig += it.iamt || 0;
        cs += it.csamt || 0;
      });
    });

    b2csRows.forEach((r) => {
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
  }, [b2clInvoices, b2csRows]);

  // Tab Totals
  const currentTabTotals = useMemo(() => {
    let tx = 0;
    let ig = 0;
    let cg = 0;
    let sg = 0;
    let cs = 0;
    currentRecords.forEach((h) => {
      tx += h.txval || 0;
      ig += h.iamt || 0;
      cg += h.camt || 0;
      sg += h.samt || 0;
      cs += h.csamt || 0;
    });
    return {
      tx: round2(tx),
      ig: round2(ig),
      cg: round2(cg),
      sg: round2(sg),
      cs: round2(cs),
    };
  }, [currentRecords]);

  // HSN Search Filtering
  const filteredHsnMaster = useMemo(() => {
    if (!hsnSearch.trim()) return HSN_MASTER_LIST;
    const s = hsnSearch.toLowerCase();
    return HSN_MASTER_LIST.filter(
      (h) => h.hsn.toLowerCase().includes(s) || h.description.toLowerCase().includes(s)
    );
  }, [hsnSearch]);

  const handleSelectHsn = (h: any) => {
    setSelectedHsn(h);
    setHsnSearch(`${h.hsn} - ${h.description}`);
    setShowHsnDropdown(false);
    if (h.isService) {
      setUqc("NA");
      setQty(0);
    } else {
      setUqc("NOS");
    }
  };

  const handleReset = () => {
    setEditingIndex(null);
    setSelectedHsn(null);
    setHsnSearch("");
    setProductNameMaster("");
    setUqc("");
    setQty("");
    setTxval("");
    setRate("");
    setIamt(0);
    setCamt(0);
    setSamt(0);
    setCsamt(0);
    setFormErrors([]);
  };

  const handleOpenEdit = (idx: number) => {
    const row = currentRecords[idx];
    setEditingIndex(idx);
    const matched = HSN_MASTER_LIST.find((h) => h.hsn === row.hsn_sc) || {
      hsn: row.hsn_sc,
      description: row.desc,
    };
    setSelectedHsn(matched);
    setHsnSearch(`${matched.hsn} - ${matched.description}`);
    setProductNameMaster(row.product_name || "");
    setUqc(row.uqc || "NOS");
    setQty(row.qty ?? "");
    setTxval(row.txval ?? "");
    setRate(row.rt ?? "");
    setIamt(row.iamt ?? 0);
    setCamt(row.camt ?? 0);
    setSamt(row.samt ?? 0);
    setCsamt(row.csamt ?? 0);
    setFormErrors([]);
  };

  const handleAddRecord = () => {
    const errs: string[] = [];

    if (!selectedHsn) {
      errs.push("HSN / SAC must be selected from the master dropdown");
    } else if (selectedHsn.hsn.length < minDigits) {
      errs.push(`HSN code must have at least ${minDigits} digits for your turnover slab`);
    }

    if (!uqc) errs.push("UQC is mandatory");
    if (qty === "" || Number(qty) < 0) errs.push("Total Quantity is mandatory");
    if (txval === "" || Number(txval) <= 0) errs.push("Total taxable value must be greater than zero");
    if (rate === "" || Number(rate) < 0) errs.push("Rate (%) is mandatory");

    // Per-row validation: CGST must equal SGST (+/- 1); IGST + CGST + SGST must equal taxable * rate / 100 (+/- 1)
    if (camt !== "" && samt !== "") {
      if (Math.abs(Number(camt) - Number(samt)) > 1.0) {
        errs.push("Central Tax and State/UT Tax must be equal (within ₹1 tolerance)");
      }
    }

    const totalEnteredTax = (Number(iamt) || 0) + (Number(camt) || 0) + (Number(samt) || 0);
    const expectedTax = round2((Number(txval) * Number(rate)) / 100);
    if (Math.abs(totalEnteredTax - expectedTax) > 1.0) {
      errs.push(`Total tax (₹${totalEnteredTax}) does not match expected tax (₹${expectedTax} at ${rate}%) within ₹1 tolerance`);
    }

    // Duplicate rule: one row per HSN + UQC + Rate in each tab
    const duplicate = currentRecords.some(
      (r, i) =>
        i !== editingIndex &&
        r.hsn_sc === selectedHsn?.hsn &&
        r.uqc === uqc &&
        Number(r.rt) === Number(rate)
    );
    if (duplicate) {
      errs.push("Duplicate record exists for this HSN, UQC and Rate in this tab. Please edit the existing row.");
    }

    if (errs.length > 0) {
      setFormErrors(errs);
      return;
    }

    const newRecord = {
      id: editingIndex !== null ? currentRecords[editingIndex].id : `hsn_${Date.now()}`,
      tab: activeTab,
      hsn_sc: selectedHsn.hsn,
      desc: selectedHsn.description,
      product_name: productNameMaster.trim() || undefined,
      uqc,
      qty: Number(qty),
      txval: Number(txval),
      rt: Number(rate),
      iamt: Number(iamt) || 0,
      camt: Number(camt) || 0,
      samt: Number(samt) || 0,
      csamt: Number(csamt) || 0,
    };

    let updatedList = [...currentRecords];
    if (editingIndex !== null) {
      updatedList[editingIndex] = newRecord;
    } else {
      updatedList.unshift(newRecord);
    }

    if (activeTab === "B2B") {
      onSaveHsn(updatedList, hsnB2c);
    } else {
      onSaveHsn(hsnB2b, updatedList);
    }

    handleReset();
  };

  const handleDelete = (idx: number) => {
    if (!confirm("Delete this HSN outward summary record?")) return;
    const updated = currentRecords.filter((_, i) => i !== idx);
    if (activeTab === "B2B") {
      onSaveHsn(updated, hsnB2c);
    } else {
      onSaveHsn(hsnB2b, updated);
    }
  };

  // "Generate from invoices" helper (groups invoice helpers by HSN + UQC + rate)
  const handleGenerateFromInvoices = () => {
    const b2bMap = new Map<string, any>();
    let foundAny = false;

    b2bInvoices.forEach((inv) => {
      (inv.items || []).forEach((it: any) => {
        if (it.hsn && it.txval > 0) {
          foundAny = true;
          const u = it.uqc || "NOS";
          const rt = it.rt || 18;
          const key = `${it.hsn}_${u}_${rt}`;
          const hsnEntry = HSN_MASTER_LIST.find((h) => h.hsn === it.hsn);

          if (!b2bMap.has(key)) {
            b2bMap.set(key, {
              id: `hsn_gen_${Date.now()}_${key}`,
              tab: "B2B",
              hsn_sc: it.hsn,
              desc: hsnEntry?.description || "Invoice item",
              uqc: u,
              qty: 0,
              txval: 0,
              rt,
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0,
            });
          }

          const cur = b2bMap.get(key);
          cur.qty = round2(cur.qty + (Number(it.qty) || 0));
          cur.txval = round2(cur.txval + (Number(it.txval) || 0));
          cur.iamt = round2(cur.iamt + (Number(it.iamt) || 0));
          cur.camt = round2(cur.camt + (Number(it.camt) || 0));
          cur.samt = round2(cur.samt + (Number(it.samt) || 0));
          cur.csamt = round2(cur.csamt + (Number(it.csamt) || 0));
        }
      });
    });

    if (!foundAny) {
      alert("No HSN helper data found in your invoices. Please add HSN records manually or import CSV.");
      return;
    }

    const generated = Array.from(b2bMap.values());
    onSaveHsn(generated, hsnB2c);
    alert(`Successfully generated ${generated.length} HSN records into the B2B tab!`);
  };

  // Download Master HSN CSV
  const handleDownloadHsnList = () => {
    let csv = "hsn_code,description,type\n";
    HSN_MASTER_LIST.forEach((h) => {
      csv += `"${h.hsn}","${h.description}","${h.isService ? "Service" : "Goods"}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "master_hsn_codes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reconciliation Difference
  const activeExpected = activeTab === "B2B" ? expectedB2b : expectedB2c;
  const diffTaxable = round2(Math.abs(currentTabTotals.tx - activeExpected.tx));
  const isReconciled = diffTaxable <= 1.0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dde2e8] dark:border-[#334155] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-1.5 rounded-lg border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>12 – HSN-wise summary of outward supplies</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Turnover Slab: <strong className="text-gray-900 dark:text-white">{turnoverSlab}</strong> (Minimum {minDigits} digits mandatory)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadHsnList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#31719B]" />
            <span>DOWNLOAD HSN CODES LIST</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateFromInvoices}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-[#31719B] dark:text-blue-300 hover:bg-blue-100 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate from invoices</span>
          </button>
        </div>
      </div>

      {/* Two Tabs: B2B Supplies vs B2C Supplies */}
      <div className="flex items-center gap-2 border-b border-[#dde2e8] dark:border-[#334155]">
        <button
          type="button"
          onClick={() => {
            setActiveTab("B2B");
            handleReset();
          }}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === "B2B"
              ? "border-[#31719B] text-[#31719B]"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
          }`}
        >
          B2B Supplies ({hsnB2b.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("B2C");
            handleReset();
          }}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === "B2C"
              ? "border-[#31719B] text-[#31719B]"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
          }`}
        >
          B2C Supplies ({hsnB2c.length})
        </button>
      </div>

      {/* Reconciliation Banner */}
      <div
        className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between text-xs gap-3 ${
          isReconciled
            ? "bg-emerald-50/60 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-300"
            : "bg-red-50/60 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/60 dark:text-red-300"
        }`}
      >
        <div className="flex items-center gap-2">
          {isReconciled ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>
            {activeTab} Tab Taxable Total: <strong className="font-mono">{formatIndianCurrency(currentTabTotals.tx)}</strong> vs Expected Sections Total: <strong className="font-mono">{formatIndianCurrency(activeExpected.tx)}</strong>
          </span>
        </div>
        <div>
          {isReconciled ? (
            <span className="font-bold">Reconciled within ₹1.00 tolerance</span>
          ) : (
            <span className="font-bold">Difference: ₹{diffTaxable} (Action required before submit)</span>
          )}
        </div>
      </div>

      {/* CSV Import */}
      <CsvImportCard
        token={token}
        sectionKey="hsn"
        sectionTitle={`HSN Summary (${activeTab})`}
        onImportComplete={(rows, mode) => {
          const parsed = rows
            .filter((r) => !r.tab || (r.tab || "").toUpperCase() === activeTab)
            .map((r) => ({
              id: `hsn_csv_${Date.now()}_${Math.random()}`,
              tab: activeTab,
              hsn_sc: r.hsn,
              desc: r.product_name || "Imported HSN",
              uqc: r.uqc || "NOS",
              qty: Number(r.quantity) || 0,
              txval: Number(r.taxable_value) || 0,
              rt: Number(r.rate) || 0,
              iamt: Number(r.igst) || 0,
              camt: Number(r.cgst) || 0,
              samt: Number(r.sgst) || 0,
              csamt: Number(r.cess) || 0,
            }));
          if (activeTab === "B2B") {
            onSaveHsn(mode === "replace" ? parsed : [...parsed, ...hsnB2b], hsnB2c);
          } else {
            onSaveHsn(hsnB2b, mode === "replace" ? parsed : [...parsed, ...hsnB2c]);
          }
        }}
        validatorFn={(r) => ({ valid: Boolean(r.hsn && r.taxable_value), errors: [] })}
      />

      {/* Add / Edit Form (Exact order from screenshot 6) */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white border-b border-[#dde2e8] dark:border-[#334155] pb-3">
          Add/Edit Details ({activeTab} Tab)
        </h2>

        {formErrors.length > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 space-y-1">
            {formErrors.map((err, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* 1. HSN* (Dropdown ONLY) */}
          <div className="md:col-span-2 relative">
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              HSN / SAC Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={hsnSearch}
              onFocus={() => setShowHsnDropdown(true)}
              onChange={(e) => {
                setHsnSearch(e.target.value);
                setShowHsnDropdown(true);
              }}
              placeholder="Search by Product Name or HSN Code in Master"
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono outline-none focus:border-[#31719B]"
            />
            {showHsnDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-lg shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-gray-800">
                {filteredHsnMaster.length === 0 ? (
                  <div className="p-3 text-gray-400 text-center">No matching HSN codes found</div>
                ) : (
                  filteredHsnMaster.map((h) => (
                    <button
                      key={h.hsn}
                      type="button"
                      onClick={() => handleSelectHsn(h)}
                      className="w-full p-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="font-mono font-bold text-[#31719B]">{h.hsn}</span>
                      <span className="text-gray-600 dark:text-gray-300 truncate max-w-xs">{h.description}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. Product Name as in My Master */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Product Name as in My Master (Optional)
            </label>
            <input
              type="text"
              value={productNameMaster}
              onChange={(e) => setProductNameMaster(e.target.value)}
              placeholder="Custom description"
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B]"
            />
          </div>

          {/* 3. Description as per HSN Code (Read-only) */}
          <div>
            <label className="block font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Description as per HSN
            </label>
            <input
              type="text"
              readOnly
              value={selectedHsn?.description || ""}
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-gray-100 dark:bg-gray-800 px-3 text-gray-600 dark:text-gray-400 truncate cursor-not-allowed"
            />
          </div>

          {/* 4. UQC* */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              UQC <span className="text-red-500">*</span>
            </label>
            <select
              disabled={!selectedHsn}
              value={uqc}
              onChange={(e) => setUqc(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">Select UQC</option>
              {UQC_OPTIONS.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.code} - {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Total Quantity* */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Total Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              disabled={!selectedHsn}
              value={qty}
              onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.000"
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>

          {/* 6. Total taxable value (₹)* */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Total taxable value (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={txval}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                setTxval(val);
                if (rate !== "" && val !== "") {
                  const t = round2((val * Number(rate)) / 100);
                  const half = round2(t / 2);
                  setCamt(half);
                  setSamt(half);
                  setIamt(0);
                }
              }}
              placeholder="0.00"
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B]"
            />
          </div>

          {/* 7. Rate (%)* */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Rate (%) <span className="text-red-500">*</span>
            </label>
            <select
              value={rate}
              onChange={(e) => {
                const r = e.target.value === "" ? "" : Number(e.target.value);
                setRate(r);
                if (txval !== "" && r !== "") {
                  const t = round2((Number(txval) * r) / 100);
                  const half = round2(t / 2);
                  setCamt(half);
                  setSamt(half);
                  setIamt(0);
                }
              }}
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 outline-none focus:border-[#31719B]"
            >
              <option value="">Select Rate</option>
              {TAX_RATES.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}%
                </option>
              ))}
            </select>
          </div>

          {/* 8. Integrated Tax (₹)* */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Integrated tax (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              disabled={rate === ""}
              value={iamt}
              onChange={(e) => setIamt(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>

          {/* 9. Central Tax (₹)* */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Central tax (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              disabled={rate === ""}
              value={camt}
              onChange={(e) => setCamt(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>

          {/* 10. State/UT Tax (₹)* */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              State/UT tax (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              disabled={rate === ""}
              value={samt}
              onChange={(e) => setSamt(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>

          {/* 11. Cess (₹) */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Cess (₹) (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              disabled={rate === ""}
              value={csamt}
              onChange={(e) => setCsamt(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              className="w-full h-9 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 font-mono text-right outline-none focus:border-[#31719B] disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* Action Buttons: BACK, RESET, ADD */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            RESET
          </button>
          <button
            type="button"
            onClick={handleAddRecord}
            disabled={!selectedHsn || !txval || rate === ""}
            className="px-6 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--primary, #31719B)" }}
          >
            {editingIndex !== null ? "UPDATE" : "ADD"}
          </button>
        </div>
      </div>

      {/* Saved Records Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4">
        <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Saved HSN Records in {activeTab} Tab ({currentRecords.length})
        </h2>

        {currentRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 bg-blue-50/30 dark:bg-blue-950/10 rounded-lg border border-dashed border-blue-200 dark:border-blue-900/40">
            There are no saved records to be displayed.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  <th className="py-2.5 px-3">HSN Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">UQC</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3 text-right">IGST</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                  <th className="py-2.5 px-3 text-right">Cess</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                {currentRecords.map((h, idx) => (
                  <tr key={h.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#31719B]">{h.hsn_sc}</td>
                    <td className="py-2.5 px-3 max-w-[160px] truncate" title={h.desc}>
                      {h.desc}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{h.uqc}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{h.qty}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                      {formatIndianNumber(h.txval)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{h.rt}%</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(h.iamt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(h.camt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(h.samt)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(h.csamt)}</td>
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
                  <td colSpan={4} className="py-2.5 px-3">Tab Totals:</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(currentTabTotals.tx)}</td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(currentTabTotals.ig)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(currentTabTotals.cg)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(currentTabTotals.sg)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatIndianNumber(currentTabTotals.cs)}</td>
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

