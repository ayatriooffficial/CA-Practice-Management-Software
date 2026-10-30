import React, { useMemo } from "react";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { formatIndianCurrency, formatIndianNumber, round2 } from "./gstFormUtils";
import { CsvImportCard } from "./CsvImportCard";

export interface Section8NilRatedProps {
  token: string;
  rows: any[];
  onSaveRows: (updated: any[]) => void;
  onBackToDashboard: () => void;
}

export const Section8NilRated: React.FC<Section8NilRatedProps> = ({
  token,
  rows,
  onSaveRows,
  onBackToDashboard,
}) => {
  const defaultRows = useMemo(() => {
    const template = [
      { sply_ty: "INTRB2B", label: "Inter-State supplies to registered persons", nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      { sply_ty: "INTRAB2B", label: "Intra-State supplies to registered persons", nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      { sply_ty: "INTRB2C", label: "Inter-State supplies to unregistered persons", nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      { sply_ty: "INTRAB2C", label: "Intra-State supplies to unregistered persons", nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
    ];
    if (!rows || rows.length === 0) return template;
    return template.map((def) => {
      const match = rows.find((r) => r.sply_ty === def.sply_ty);
      return match ? { ...def, ...match } : def;
    });
  }, [rows]);

  const [currentRows, setCurrentRows] = React.useState(defaultRows);

  const handleCellChange = (
    sply_ty: string,
    field: "nil_amt" | "expt_amt" | "ngsup_amt",
    valStr: string
  ) => {
    const val = valStr === "" ? 0 : Number(valStr);
    const updated = currentRows.map((r) => {
      if (r.sply_ty === sply_ty) {
        return { ...r, [field]: val };
      }
      return r;
    });
    setCurrentRows(updated);
    onSaveRows(updated);
  };

  const handleCsvImport = (importedRows: any[]) => {
    const updated = currentRows.map((r) => {
      const match = importedRows.find(
        (im) => (im.supply_type || "").toUpperCase() === r.sply_ty
      );
      if (match) {
        return {
          ...r,
          nil_amt: Number(match.nil_rated) || 0,
          expt_amt: Number(match.exempted) || 0,
          ngsup_amt: Number(match.non_gst) || 0,
        };
      }
      return r;
    });
    setCurrentRows(updated);
    onSaveRows(updated);
  };

  const totals = useMemo(() => {
    let tNil = 0;
    let tExpt = 0;
    let tNg = 0;
    currentRows.forEach((r) => {
      tNil += r.nil_amt || 0;
      tExpt += r.expt_amt || 0;
      tNg += r.ngsup_amt || 0;
    });
    return {
      tNil: round2(tNil),
      tExpt: round2(tExpt),
      tNg: round2(tNg),
      totalOverall: round2(tNil + tExpt + tNg),
    };
  }, [currentRows]);

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
            <h1 className="text-base font-bold text-gray-900 dark:text-white">
              8A, 8B, 8C, 8D – Nil Rated Supplies
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Report Nil Rated, Exempted (other than Nil rated/non-GST supply), and Non-GST outward supplies
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToDashboard}
          className="px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer"
          style={{ backgroundColor: "var(--primary, #31719B)" }}
        >
          SAVE & BACK TO DASHBOARD
        </button>
      </div>

      <CsvImportCard
        token={token}
        sectionKey="nil"
        sectionTitle="Nil / Exempt / Non-GST Supplies"
        onImportComplete={handleCsvImport}
        validatorFn={(r) => ({ valid: Boolean(r.supply_type), errors: [] })}
      />

      {/* 4x3 Grid Card */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-4">
        <div className="overflow-x-auto border border-[#dde2e8] dark:border-[#334155] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-semibold">
              <tr>
                <th className="py-3 px-4 w-1/3">Nature of Supply</th>
                <th className="py-3 px-4 text-right">Nil Rated Supplies (₹)</th>
                <th className="py-3 px-4 text-right">Exempted (Other than nil/non-GST) (₹)</th>
                <th className="py-3 px-4 text-right">Non-GST Supplies (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
              {currentRows.map((r) => (
                <tr key={r.sply_ty} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {r.label}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={r.nil_amt || ""}
                      onChange={(e) => handleCellChange(r.sply_ty, "nil_amt", e.target.value)}
                      placeholder="0.00"
                      className="h-8 w-36 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B]"
                    />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={r.expt_amt || ""}
                      onChange={(e) => handleCellChange(r.sply_ty, "expt_amt", e.target.value)}
                      placeholder="0.00"
                      className="h-8 w-36 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B]"
                    />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={r.ngsup_amt || ""}
                      onChange={(e) => handleCellChange(r.sply_ty, "ngsup_amt", e.target.value)}
                      placeholder="0.00"
                      className="h-8 w-36 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 font-mono text-right text-xs outline-none focus:border-[#31719B]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-[#dde2e8] dark:border-[#334155]">
              <tr>
                <td className="py-3 px-4">Total</td>
                <td className="py-3 px-4 text-right font-mono">{formatIndianCurrency(totals.tNil)}</td>
                <td className="py-3 px-4 text-right font-mono">{formatIndianCurrency(totals.tExpt)}</td>
                <td className="py-3 px-4 text-right font-mono">{formatIndianCurrency(totals.tNg)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end p-2 text-xs text-gray-500">
          <span>Overall Total Nil/Exempt Outward Supplies: <strong className="text-gray-900 dark:text-white font-mono">{formatIndianCurrency(totals.totalOverall)}</strong></span>
        </div>
      </div>
    </div>
  );
};

