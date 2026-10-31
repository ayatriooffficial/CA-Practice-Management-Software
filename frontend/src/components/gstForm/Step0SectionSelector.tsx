"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  ShoppingBag,
  Building2,
  Store,
  Ban,
  FileMinus2,
  Package,
  Layers,
  CreditCard,
  Percent,
} from "lucide-react";

export interface Step0Selection {
  returns: {
    gstr1: boolean;
    gstr3b: boolean;
  };
  sections: string[];
  isNil: boolean;
}

interface Step0SectionSelectorProps {
  header: {
    gstin: string;
    legalName: string;
    tradeName?: string;
    returnPeriod: string;
    filingFrequency: string;
    turnoverSlab: string;
  };
  clientContext?: {
    enabledServices: {
      gstr1: boolean;
      gstr3b: boolean;
    };
    hasPreviousSubmission: boolean;
    previousSubmissionSummary?: {
      submissionId: string;
      returnPeriod: string;
      selectedSections?: string[];
    };
  };
  initialSelection?: Step0Selection;
  onStart: (selection: Step0Selection) => void;
  onStartFromLastPeriod?: () => void;
  isCarryingOver?: boolean;
}

export const GSTR1_CARDS = [
  {
    id: "b2b",
    title: "Sales to GST-registered businesses",
    hint: "Invoices where your customer gave you a GSTIN",
    officialTag: "Table 4A, 4B, 6B, 6C",
    icon: Building2,
    isSelling: true,
  },
  {
    id: "b2cl",
    title: "Large sales to customers without GSTIN in another state",
    hint: "Invoice value above ₹1 lakh, customer in a different state",
    officialTag: "Table 5",
    icon: ShoppingBag,
    isSelling: true,
  },
  {
    id: "b2cs",
    title: "Retail / regular sales to customers without GSTIN",
    hint: "Shop, counter or small online sales",
    officialTag: "Table 7",
    icon: Store,
    isSelling: true,
  },
  {
    id: "nil",
    title: "Nil-rated, exempt or non-GST sales",
    hint: "Sales with no GST charged",
    officialTag: "Table 8",
    icon: Ban,
    isSelling: true,
  },
  {
    id: "cdnr",
    title: "Credit or debit notes to GST-registered customers",
    hint: "Returns, discounts, corrections for registered buyers",
    officialTag: "Table 9B (Reg)",
    icon: FileMinus2,
    isSelling: true,
  },
  {
    id: "cdnur",
    title: "Credit or debit notes to customers without GSTIN",
    hint: "Returns and corrections for unregistered buyers",
    officialTag: "Table 9B (Unreg)",
    icon: FileMinus2,
    isSelling: true,
  },
  {
    id: "hsn",
    title: "Product summary (HSN)",
    hint: "Needed for every return. We build this for you.",
    officialTag: "Table 12",
    icon: Package,
    isLocked: true,
    isSelling: false,
  },
  {
    id: "doc_issue",
    title: "Invoice number summary",
    hint: "Needed for every return. We build this for you.",
    officialTag: "Table 13",
    icon: Layers,
    isLocked: true,
    isSelling: false,
  },
];

export const GSTR3B_CARDS = [
  {
    id: "itc",
    title: "Input tax credit (GST paid on your purchases)",
    hint: "Purchases and inward services where you claim tax credit",
    officialTag: "Table 4",
    icon: CreditCard,
  },
  {
    id: "rchrg_purchase",
    title: "Purchases under reverse charge",
    hint: "Inward supplies attracting reverse charge (paid by you)",
    officialTag: "Table 3.1(d) & 4(A)(3)",
    icon: RotateCcw,
  },
  {
    id: "exempt_purchase",
    title: "Exempt / nil-rated / non-GST purchases",
    hint: "Inward supplies from composition dealers or exempt items",
    officialTag: "Table 5",
    icon: Ban,
  },
  {
    id: "interest_late_fee",
    title: "Interest or late fee",
    hint: "Interest on delayed payments or late filing liabilities",
    officialTag: "Table 5.1",
    icon: Percent,
  },
  {
    id: "prev_period_liability",
    title: "Tax of an earlier period paid in this return",
    hint: "Tax liability break-up for past months",
    officialTag: "Break-up",
    icon: Clock,
  },
];

export const Step0SectionSelector: React.FC<Step0SectionSelectorProps> = ({
  header,
  clientContext,
  initialSelection,
  onStart,
  onStartFromLastPeriod,
  isCarryingOver = false,
}) => {
  const enabledGstr1 = clientContext?.enabledServices?.gstr1 ?? true;
  const enabledGstr3b = clientContext?.enabledServices?.gstr3b ?? true;

  // 1. Returns Selected
  const [returnGstr1, setReturnGstr1] = useState(
    initialSelection?.returns?.gstr1 ?? enabledGstr1
  );
  const [returnGstr3b, setReturnGstr3b] = useState(
    initialSelection?.returns?.gstr3b ?? enabledGstr3b
  );

  // 2. Sections Selected
  const [selectedSections, setSelectedSections] = useState<Set<string>>(() => {
    if (initialSelection?.sections && initialSelection.sections.length > 0) {
      return new Set(initialSelection.sections);
    }
    // Default smart selection: if previous sections exist, use them
    const prev = clientContext?.previousSubmissionSummary?.selectedSections;
    if (prev && prev.length > 0) {
      return new Set(prev);
    }
    // Otherwise sensible default: B2B, B2CS, and ITC
    return new Set(["b2b", "b2cs", "itc"]);
  });

  // 3. Nil Return Checkbox
  const [isNil, setIsNil] = useState(initialSelection?.isNil ?? false);

  // Derived: Are any selling sections selected?
  const hasSellingSelected = useMemo(() => {
    if (!returnGstr1) return false;
    return GSTR1_CARDS.some(
      (c) => c.isSelling && selectedSections.has(c.id)
    );
  }, [returnGstr1, selectedSections]);

  // Toggle Section
  const handleToggleSection = (sectionId: string) => {
    if (isNil) return;
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Compute Active Final Sections (including locked HSN & Documents if selling sections exist)
  const finalSectionsList = useMemo(() => {
    if (isNil) return [];
    const list: string[] = [];

    if (returnGstr1) {
      GSTR1_CARDS.forEach((card) => {
        if (card.isLocked) {
          if (hasSellingSelected) list.push(card.id);
        } else if (selectedSections.has(card.id)) {
          list.push(card.id);
        }
      });
    }

    if (returnGstr3b) {
      GSTR3B_CARDS.forEach((card) => {
        if (selectedSections.has(card.id)) {
          list.push(card.id);
        }
      });
    }

    return list;
  }, [isNil, returnGstr1, returnGstr3b, selectedSections, hasSellingSelected]);

  // Estimated Completion Time: ~1-2 min per checked section
  const estimatedMinutes = useMemo(() => {
    if (isNil) return 1;
    const count = finalSectionsList.length;
    return Math.max(2, Math.round(count * 1.5));
  }, [isNil, finalSectionsList]);

  // Handle Form Start
  const handleStart = () => {
    onStart({
      returns: {
        gstr1: returnGstr1,
        gstr3b: returnGstr3b,
      },
      sections: finalSectionsList,
      isNil,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Nil Return Quick Toggle */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            id="nilReturnCheckbox"
            type="checkbox"
            checked={isNil}
            onChange={(e) => setIsNil(e.target.checked)}
            className="w-4 h-4 rounded text-[#31719B] border-amber-300 focus:ring-[#31719B] cursor-pointer"
          />
          <label htmlFor="nilReturnCheckbox" className="cursor-pointer select-none">
            <span className="text-sm font-bold text-amber-900 dark:text-amber-200 block">
              No sales or purchases this period (Nil return)
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-400">
              Check this if your business had zero transactions. You will skip straight to declaration.
            </span>
          </label>
        </div>
        {isNil && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            Nil Return Mode
          </span>
        )}
      </div>

      {!isNil && (
        <>
          {/* 3.1 Return Choice */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-[#dde2e8] dark:border-[#334155] shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Step 1: Choose Returns to File
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Select the tax returns required for this filing period
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  returnGstr1
                    ? "border-[#31719B] bg-[#31719B]/5 dark:bg-[#31719B]/10 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                } ${!enabledGstr1 ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={returnGstr1}
                  disabled={!enabledGstr1}
                  onChange={(e) => setReturnGstr1(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#31719B] border-gray-300 focus:ring-[#31719B]"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      GSTR-1
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
                      Outward Sales
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Statement of outward supplies, sales invoices, credit notes and HSN summary.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  returnGstr3b
                    ? "border-[#31719B] bg-[#31719B]/5 dark:bg-[#31719B]/10 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                } ${!enabledGstr3b ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={returnGstr3b}
                  disabled={!enabledGstr3b}
                  onChange={(e) => setReturnGstr3b(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#31719B] border-gray-300 focus:ring-[#31719B]"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      GSTR-3B
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
                      Summary & ITC
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Monthly summary return, ITC claims, and tax payment calculations.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 3.2 GSTR-1 Section Cards */}
          {returnGstr1 && (
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-[#dde2e8] dark:border-[#334155] shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Step 2: What did you sell this month? (GSTR-1)
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Select only the categories where you had transactions. Unchecked sections are skipped.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GSTR1_CARDS.map((card) => {
                  const Icon = card.icon;
                  const isChecked = card.isLocked
                    ? hasSellingSelected
                    : selectedSections.has(card.id);

                  return (
                    <div
                      key={card.id}
                      onClick={() => !card.isLocked && handleToggleSection(card.id)}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all select-none ${
                        card.isLocked
                          ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 cursor-default"
                          : isChecked
                          ? "border-[#31719B] bg-[#31719B]/5 dark:bg-[#31719B]/10 shadow-sm cursor-pointer"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 cursor-pointer"
                      }`}
                    >
                      <div className="mt-0.5">
                        {card.isLocked ? (
                          <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center">
                            <Lock className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSection(card.id)}
                            className="w-4 h-4 rounded text-[#31719B] border-gray-300 focus:ring-[#31719B] cursor-pointer"
                          />
                        )}
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                            {card.title}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                            {card.officialTag}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {card.hint}
                        </p>
                        {card.isLocked && hasSellingSelected && (
                          <span className="inline-block text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Auto-included & derived
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3.3 GSTR-3B Section Cards */}
          {returnGstr3b && (
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-[#dde2e8] dark:border-[#334155] shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Step 3: What purchases or credits do you have? (GSTR-3B)
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Your sales liabilities are calculated automatically. Choose purchase details to report:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GSTR3B_CARDS.map((card) => {
                  const Icon = card.icon;
                  const isChecked = selectedSections.has(card.id);

                  return (
                    <div
                      key={card.id}
                      onClick={() => handleToggleSection(card.id)}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? "border-[#31719B] bg-[#31719B]/5 dark:bg-[#31719B]/10 shadow-sm"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="mt-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSection(card.id)}
                          className="w-4 h-4 rounded text-[#31719B] border-gray-300 focus:ring-[#31719B] cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                            {card.title}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                            {card.officialTag}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {card.hint}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer Start Action Strip */}
      <div className="sticky bottom-4 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md p-4 rounded-2xl border border-[#dde2e8] dark:border-[#334155] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#31719B]/10 text-[#31719B] dark:text-[#64B5D6] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              Estimated completion: ~{estimatedMinutes} minutes
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              {isNil
                ? "Nil return declaration only"
                : `${finalSectionsList.length} sections queued for entry`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-[#31719B] text-white hover:bg-[#275a7c] transition-all shadow-md active:scale-98"
        >
          {isNil ? "Proceed to Nil Filing" : "Start Data Entry"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

