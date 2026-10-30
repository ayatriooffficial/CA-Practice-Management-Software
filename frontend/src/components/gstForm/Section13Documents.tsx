import React, { useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileText,
  Info,
} from "lucide-react";
import { NATURE_OF_DOCUMENTS } from "./gstFormUtils";
import { CsvImportCard } from "./CsvImportCard";

export interface Section13DocumentsProps {
  token: string;
  docSections: any[];
  onSaveDocSections: (updated: any[]) => void;
  onBackToDashboard: () => void;
}

export const Section13Documents: React.FC<Section13DocumentsProps> = ({
  token,
  docSections,
  onSaveDocSections,
  onBackToDashboard,
}) => {
  // Ensure all 12 natures exist in state
  const currentSections = useMemo(() => {
    return NATURE_OF_DOCUMENTS.map((nat) => {
      const match = (docSections || []).find((s: any) => s.doc_num === nat.id);
      return {
        doc_num: nat.id,
        name: nat.name,
        docs: match?.docs || [],
      };
    });
  }, [docSections]);

  // Auto-calculate suggested total from From and To
  const computeSuggestedTotal = (from: string, to: string): number | null => {
    if (!from || !to) return null;
    const fromMatch = from.match(/(\d+)$/);
    const toMatch = to.match(/(\d+)$/);
    if (fromMatch && toMatch) {
      const fromNum = parseInt(fromMatch[1], 10);
      const toNum = parseInt(toMatch[1], 10);
      const fromPrefix = from.slice(0, fromMatch.index);
      const toPrefix = to.slice(0, toMatch.index);
      if (fromPrefix === toPrefix && toNum >= fromNum) {
        return toNum - fromNum + 1;
      }
    }
    return null;
  };

  const handleAddRow = (docNum: number) => {
    const updated = currentSections.map((sec) => {
      if (sec.doc_num === docNum) {
        const nextNum = (sec.docs.length || 0) + 1;
        const newDoc = {
          id: `doc_${Date.now()}_${Math.random()}`,
          num: nextNum,
          from: "",
          to: "",
          totnum: 1,
          cancel: 0,
          net_issue: 1,
        };
        return {
          ...sec,
          docs: [...sec.docs, newDoc],
        };
      }
      return sec;
    });
    onSaveDocSections(updated);
  };

  const handleUpdateRow = (
    docNum: number,
    rowIdx: number,
    field: "from" | "to" | "totnum" | "cancel",
    val: any
  ) => {
    const updated = currentSections.map((sec) => {
      if (sec.doc_num === docNum) {
        const docs = [...sec.docs];
        const cur = { ...docs[rowIdx] };

        if (field === "from") {
          cur.from = val;
          const sugg = computeSuggestedTotal(val, cur.to);
          if (sugg !== null) {
            cur.totnum = sugg;
            cur.net_issue = Math.max(0, sugg - cur.cancel);
          }
        } else if (field === "to") {
          cur.to = val;
          const sugg = computeSuggestedTotal(cur.from, val);
          if (sugg !== null) {
            cur.totnum = sugg;
            cur.net_issue = Math.max(0, sugg - cur.cancel);
          }
        } else if (field === "totnum") {
          const n = parseInt(val, 10) || 0;
          cur.totnum = n;
          cur.net_issue = Math.max(0, n - cur.cancel);
        } else if (field === "cancel") {
          const c = parseInt(val, 10) || 0;
          cur.cancel = c;
          cur.net_issue = Math.max(0, cur.totnum - c);
        }

        docs[rowIdx] = cur;
        return { ...sec, docs };
      }
      return sec;
    });
    onSaveDocSections(updated);
  };

  const handleDeleteRow = (docNum: number, rowIdx: number) => {
    const updated = currentSections.map((sec) => {
      if (sec.doc_num === docNum) {
        return {
          ...sec,
          docs: sec.docs.filter((_: any, i: number) => i !== rowIdx),
        };
      }
      return sec;
    });
    onSaveDocSections(updated);
  };

  // CSV Import Callback
  const handleCsvImport = (rows: any[], mode: "add" | "replace") => {
    const group = new Map<number, any[]>();

    rows.forEach((r) => {
      let docNum = parseInt(r.nature, 10);
      if (isNaN(docNum)) {
        const found = NATURE_OF_DOCUMENTS.find(
          (n) => n.name.toLowerCase() === (r.nature || "").toLowerCase()
        );
        docNum = found ? found.id : 1;
      }
      if (!group.has(docNum)) group.set(docNum, []);

      const tot = parseInt(r.total_number, 10) || 1;
      const can = parseInt(r.cancelled, 10) || 0;
      group.get(docNum)!.push({
        id: `doc_csv_${Date.now()}_${Math.random()}`,
        num: group.get(docNum)!.length + 1,
        from: r.from || "",
        to: r.to || "",
        totnum: tot,
        cancel: can,
        net_issue: Math.max(0, tot - can),
      });
    });

    const updated = currentSections.map((sec) => {
      const importedForThis = group.get(sec.doc_num) || [];
      if (mode === "replace") {
        return { ...sec, docs: importedForThis };
      } else {
        return { ...sec, docs: [...sec.docs, ...importedForThis] };
      }
    });

    onSaveDocSections(updated);
  };

  // Summary strip calculations
  const summaryStrip = useMemo(() => {
    let tot = 0;
    let cancel = 0;
    let net = 0;

    currentSections.forEach((sec) => {
      sec.docs.forEach((d: any) => {
        tot += Number(d.totnum) || 0;
        cancel += Number(d.cancel) || 0;
        net += Number(d.net_issue) || 0;
      });
    });

    return { tot, cancel, net };
  }, [currentSections]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
            <h1 className="text-base font-bold text-gray-900 dark:text-white">
              13 – Documents issued during the tax period
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Mandatory summary of all serially numbered tax invoices, credit/debit notes and challans issued
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToDashboard}
          className="px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
          style={{ backgroundColor: "var(--primary, #31719B)" }}
        >
          SAVE & RETURN TO DASHBOARD
        </button>
      </div>

      {/* CSV Import */}
      <CsvImportCard
        token={token}
        sectionKey="documents"
        sectionTitle="Documents Summary (Table 13)"
        onImportComplete={handleCsvImport}
        validatorFn={(r) => ({ valid: Boolean(r.from && r.to), errors: [] })}
      />

      {/* Summary Strip */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Info className="w-4 h-4 text-[#31719B]" />
          <span>Changes are saved automatically. Use &quot;Add Document&quot; to append a series range.</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-gray-400 block text-[10px]">Total Issued</span>
            <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">{summaryStrip.tot}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-400 block text-[10px]">Total Cancelled</span>
            <span className="font-bold text-red-600 font-mono text-sm">{summaryStrip.cancel}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-400 block text-[10px]">Net Issued</span>
            <span className="font-bold text-emerald-600 font-mono text-sm">{summaryStrip.net}</span>
          </div>
        </div>
      </div>

      {/* 12 Numbered Sub-Sections Cards */}
      <div className="space-y-4">
        {currentSections.map((sec) => (
          <div
            key={sec.doc_num}
            className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
              <h2 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#31719B] dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center text-[11px] font-bold">
                  {sec.doc_num}
                </span>
                <span>{sec.name}</span>
              </h2>

              <span className="text-xs text-gray-400 font-mono">
                {sec.docs.length} series {sec.docs.length === 1 ? "row" : "rows"}
              </span>
            </div>

            {sec.docs.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                There are no documents to be displayed.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1e3a5f] text-white font-semibold">
                    <tr>
                      <th className="py-2 px-3 w-12">No.</th>
                      <th className="py-2 px-3">Sr. No. From*</th>
                      <th className="py-2 px-3">Sr. No. To*</th>
                      <th className="py-2 px-3 text-right">Total number*</th>
                      <th className="py-2 px-3 text-right">Cancelled*</th>
                      <th className="py-2 px-3 text-right">Net issued</th>
                      <th className="py-2 px-3 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                    {sec.docs.map((doc: any, rIdx: number) => (
                      <tr key={doc.id || rIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-gray-500 font-mono">{rIdx + 1}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            maxLength={16}
                            value={doc.from}
                            onChange={(e) => handleUpdateRow(sec.doc_num, rIdx, "from", e.target.value)}
                            placeholder="e.g. 2026-27/01"
                            className="h-8 w-full max-w-[140px] rounded border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2 font-mono text-xs outline-none focus:border-[#31719B]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            maxLength={16}
                            value={doc.to}
                            onChange={(e) => handleUpdateRow(sec.doc_num, rIdx, "to", e.target.value)}
                            placeholder="e.g. 2026-27/11"
                            className="h-8 w-full max-w-[140px] rounded border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2 font-mono text-xs outline-none focus:border-[#31719B]"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min={1}
                            value={doc.totnum}
                            onChange={(e) => handleUpdateRow(sec.doc_num, rIdx, "totnum", e.target.value)}
                            className="h-8 w-24 rounded border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2 font-mono text-right text-xs outline-none focus:border-[#31719B]"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            value={doc.cancel}
                            onChange={(e) => handleUpdateRow(sec.doc_num, rIdx, "cancel", e.target.value)}
                            className="h-8 w-20 rounded border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2 font-mono text-right text-xs outline-none focus:border-[#31719B]"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/60">
                          {doc.net_issue}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(sec.doc_num, rIdx)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleAddRow(sec.doc_num)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD DOCUMENT</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
          style={{ backgroundColor: "var(--primary, #31719B)" }}
        >
          SAVE & RETURN TO DASHBOARD
        </button>
      </div>
    </div>
  );
};

