"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  SkipForward,
  HelpCircle,
  X,
} from "lucide-react";
import { gstFormApi, GstPublicContext, ValidationReport } from "@/services/gstFormApi";
import { GstFormHeader } from "@/components/gstForm/GstFormHeader";
import { Step0SectionSelector, Step0Selection } from "@/components/gstForm/Step0SectionSelector";
import { GstWizardStepper, WizardStepInfo } from "@/components/gstForm/GstWizardStepper";
import { OneLineInvoiceGrid, GridInvoiceRow } from "@/components/gstForm/OneLineInvoiceGrid";
import { B2COthersGrid, B2CSRow } from "@/components/gstForm/B2COthersGrid";
import { Section8NilRated } from "@/components/gstForm/Section8NilRated";
import { HsnAutoStep, HsnItem } from "@/components/gstForm/HsnAutoStep";
import { DocumentsAutoStep, NatureSection } from "@/components/gstForm/DocumentsAutoStep";
import { Gstr3BWizardSteps } from "@/components/gstForm/Gstr3BWizardSteps";
import { GstSummaryPage } from "@/components/gstForm/GstSummaryPage";
import { formatReturnPeriod } from "@/components/gstForm/gstFormUtils";

// Canonical ordered wizard sections
const SECTION_ORDER = [
  { id: "b2b", title: "B2B Invoices", shortTitle: "B2B", tableTag: "Table 4A" },
  { id: "b2cl", title: "Large B2C Invoices (> ₹1L)", shortTitle: "B2C Large", tableTag: "Table 5" },
  { id: "b2cs", title: "Other Consumer & Counter Sales", shortTitle: "B2C Others", tableTag: "Table 7" },
  { id: "nil", title: "Nil Rated & Exempt Supplies", shortTitle: "Nil/Exempt", tableTag: "Table 8" },
  { id: "cdnr", title: "Credit / Debit Notes (Registered)", shortTitle: "CDNR", tableTag: "Table 9B" },
  { id: "cdnur", title: "Credit / Debit Notes (Unregistered)", shortTitle: "CDNUR", tableTag: "Table 9B" },
  { id: "hsn", title: "HSN / SAC Summary", shortTitle: "HSN", tableTag: "Table 12" },
  { id: "doc_issue", title: "Documents Issued & Series", shortTitle: "Docs", tableTag: "Table 13" },
  { id: "3b_sales", title: "Calculated Sales (Tables 3.1 & 3.2)", shortTitle: "3B Sales", tableTag: "Tables 3.1/3.2" },
  { id: "itc", title: "Input Tax Credit (ITC Claimed)", shortTitle: "ITC", tableTag: "Table 4" },
  { id: "rchrg_purchase", title: "Purchases with Reverse Charge", shortTitle: "Rev Charge", tableTag: "Table 3.1(d)" },
  { id: "exempt_purchase", title: "Exempt & Non-GST Purchases", shortTitle: "Exempt Purch", tableTag: "Table 5" },
  { id: "interest_late_fee", title: "Interest & Late Fee", shortTitle: "Interest", tableTag: "Table 5.1" },
];

export default function PublicGstFormPage() {
  const params = useParams();
  const rawParam = params?.token;
  const token = Array.isArray(rawParam) ? rawParam.join("-") : (rawParam as string);

  const [isLoading, setIsLoading] = useState(true);
  const [context, setContext] = useState<GstPublicContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form Navigation State
  const [currentStep, setCurrentStep] = useState<"step0" | "wizard" | "summary">("step0");
  const [activeWizardIndex, setActiveWizardIndex] = useState<number>(0);
  const [formData, setFormData] = useState<any | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Action states
  const [isCarryingOver, setIsCarryingOver] = useState(false);
  const [isDerivingHsn, setIsDerivingHsn] = useState(false);
  const [isDerivingDocs, setIsDerivingDocs] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [skipConfirmModal, setSkipConfirmModal] = useState<boolean>(false);

  // Validation Report & Submission
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<any | null>(null);

  // Debounced auto-save timer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.title = "CA Practice · GST Return Filing Portal";
  }, []);

  // Load context on mount
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setIsLoading(true);

    gstFormApi
      .getPublicContext(token)
      .then((res) => {
        if (!isMounted) return;
        setContext(res);
        if (res.isAccessible) {
          const draftPayload = res.draft || {};
          const hasSelectedSections =
            Array.isArray(draftPayload.selected_sections) && draftPayload.selected_sections.length > 0;

          // Determine initial step
          let initStep: "step0" | "wizard" | "summary" = "step0";
          if (draftPayload.currentStep === "summary") {
            initStep = "summary";
          } else if (hasSelectedSections) {
            initStep = "wizard";
          }

          setFormData({
            currentStep: initStep,
            selected_sections: draftPayload.selected_sections || [],
            auto_included_sections: draftPayload.auto_included_sections || [],
            started_from_previous_submission_id: draftPayload.started_from_previous_submission_id,
            sticky_defaults: draftPayload.sticky_defaults || res.clientContext?.commonDefaults || {},
            gstr1: draftPayload.gstr1 || {
              is_nil: false,
              b2b: [],
              b2cl: [],
              b2cs: [],
              nil: [],
              cdnr: [],
              cdnur: [],
              hsn_b2b: [],
              hsn_b2c: [],
              doc_issue: [],
            },
            gstr3b: draftPayload.gstr3b || {
              is_nil: false,
              table3_1: {
                osup_det: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
                osup_zero: { txval: 0, iamt: 0, csamt: 0 },
                osup_nil_exmp: { txval: 0 },
                isup_rev: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
                osup_nongst: { txval: 0 },
              },
              table3_2: [],
              table4: {
                itc_avl: {
                  impg: { iamt: 0, csamt: 0 },
                  imps: { iamt: 0, csamt: 0 },
                  isrc: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                  isd: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                  oth: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                },
                itc_rev: {
                  rul: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                  oth: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                },
                itc_net: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                itc_inelg: {
                  rul: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                  oth: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                },
              },
              table5: { comp_nil: { inter: 0, intra: 0 }, non_gst: { inter: 0, intra: 0 } },
              table5_1: { interest: { iamt: 0, camt: 0, samt: 0, csamt: 0 }, late_fee: { camt: 0, samt: 0 } },
              verification: { declared: false, signatory_name: "", date: "", place: "" },
            },
          });

          setCurrentStep(initStep);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError(err.message || "Invalid or expired link");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Auto-save handler
  const triggerAutoSave = useCallback(
    (newFormData: any) => {
      setFormData(newFormData);
      if (!token) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        setIsAutoSaving(true);
        try {
          const res = await gstFormApi.saveDraft(token, newFormData);
          const t = new Date(res.updatedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          setLastSavedAt(t);
        } catch (err) {
          console.error("Auto-save failed:", err);
        } finally {
          setIsAutoSaving(false);
        }
      }, 1000);
    },
    [token]
  );

  // Compute GSTR-3B Table 3.1 & 3.2 from GSTR-1 automatically
  const updateGstr3BFromGstr1 = (currentGstr1: any, currentGstr3B: any, supplierStateCode: string) => {
    let osup_det_txval = 0;
    let osup_det_iamt = 0;
    let osup_det_camt = 0;
    let osup_det_samt = 0;
    let osup_det_csamt = 0;

    let osup_zero_txval = 0;
    let osup_zero_iamt = 0;
    let osup_zero_csamt = 0;

    let osup_nil_exmp_txval = 0;
    let osup_nongst_txval = 0;

    const unregMap = new Map<string, { txval: number; iamt: number }>();

    // 1. B2B
    (currentGstr1.b2b || []).forEach((inv: any) => {
      const isZero = inv.inv_type === "SEWP" || inv.inv_type === "SEWOP";
      (inv.items || []).forEach((it: any) => {
        if (isZero) {
          osup_zero_txval += Number(it.txval) || 0;
          osup_zero_iamt += Number(it.iamt) || 0;
          osup_zero_csamt += Number(it.csamt) || 0;
        } else {
          osup_det_txval += Number(it.txval) || 0;
          osup_det_iamt += Number(it.iamt) || 0;
          osup_det_camt += Number(it.camt) || 0;
          osup_det_samt += Number(it.samt) || 0;
          osup_det_csamt += Number(it.csamt) || 0;
        }
      });
    });

    // 2. B2CL
    (currentGstr1.b2cl || []).forEach((inv: any) => {
      const posCode = inv.pos ? String(inv.pos).substring(0, 2) : "";
      (inv.items || []).forEach((it: any) => {
        osup_det_txval += Number(it.txval) || 0;
        osup_det_iamt += Number(it.iamt) || 0;
        osup_det_csamt += Number(it.csamt) || 0;

        if (posCode && posCode !== supplierStateCode) {
          const cur = unregMap.get(posCode) || { txval: 0, iamt: 0 };
          cur.txval += Number(it.txval) || 0;
          cur.iamt += Number(it.iamt) || 0;
          unregMap.set(posCode, cur);
        }
      });
    });

    // 3. B2CS
    (currentGstr1.b2cs || []).forEach((r: any) => {
      osup_det_txval += Number(r.txval) || 0;
      osup_det_iamt += Number(r.iamt) || 0;
      osup_det_camt += Number(r.camt) || 0;
      osup_det_samt += Number(r.samt) || 0;
      osup_det_csamt += Number(r.csamt) || 0;

      const posCode = r.pos ? String(r.pos).substring(0, 2) : "";
      if (posCode && posCode !== supplierStateCode && (Number(r.iamt) || 0) > 0) {
        const cur = unregMap.get(posCode) || { txval: 0, iamt: 0 };
        cur.txval += Number(r.txval) || 0;
        cur.iamt += Number(r.iamt) || 0;
        unregMap.set(posCode, cur);
      }
    });

    // 4. CDN Registered
    (currentGstr1.cdnr || []).forEach((n: any) => {
      const sign = n.nt_ty === "C" || n.ntty === "C" ? -1 : 1;
      const isZero = n.inv_type === "SEWP" || n.inv_type === "SEWOP";
      (n.items || []).forEach((it: any) => {
        if (isZero) {
          osup_zero_txval += sign * (Number(it.txval) || 0);
          osup_zero_iamt += sign * (Number(it.iamt) || 0);
          osup_zero_csamt += sign * (Number(it.csamt) || 0);
        } else {
          osup_det_txval += sign * (Number(it.txval) || 0);
          osup_det_iamt += sign * (Number(it.iamt) || 0);
          osup_det_camt += sign * (Number(it.camt) || 0);
          osup_det_samt += sign * (Number(it.samt) || 0);
          osup_det_csamt += sign * (Number(it.csamt) || 0);
        }
      });
    });

    // 5. CDN Unregistered
    (currentGstr1.cdnur || []).forEach((n: any) => {
      const sign = n.nt_ty === "C" || n.ntty === "C" ? -1 : 1;
      (n.items || []).forEach((it: any) => {
        osup_det_txval += sign * (Number(it.txval) || 0);
        osup_det_iamt += sign * (Number(it.iamt) || 0);
        osup_det_csamt += sign * (Number(it.csamt) || 0);
      });
    });

    // 6. Nil
    (currentGstr1.nil || []).forEach((n: any) => {
      osup_nil_exmp_txval += (Number(n.nil_amt) || 0) + (Number(n.expt_amt) || 0);
      osup_nongst_txval += Number(n.ngsup_amt) || 0;
    });

    const table3_2: any[] = [];
    unregMap.forEach((val, pos) => {
      table3_2.push({ group: "unreg", pos, txval: val.txval, iamt: val.iamt });
    });

    return {
      ...currentGstr3B,
      table3_1: {
        ...currentGstr3B.table3_1,
        osup_det: {
          txval: osup_det_txval,
          iamt: osup_det_iamt,
          camt: osup_det_camt,
          samt: osup_det_samt,
          csamt: osup_det_csamt,
        },
        osup_zero: {
          txval: osup_zero_txval,
          iamt: osup_zero_iamt,
          csamt: osup_zero_csamt,
        },
        osup_nil_exmp: { txval: osup_nil_exmp_txval },
        osup_nongst: { txval: osup_nongst_txval },
      },
      table3_2,
    };
  };

  // Run Server Validation
  const runValidation = async (customPayload?: any) => {
    if (!token) return;
    const p = customPayload || formData;
    if (!p) return;
    try {
      if (p.gstr1?.b2b) {
        p.gstr1.b2b.forEach((inv: any) => {
          if (!inv.cname?.trim() && inv.ctin) {
            inv.cname = `Recipient (${inv.ctin})`;
          }
        });
      }
      const rep = await gstFormApi.validateForm(token, p);
      setValidationReport(rep);
    } catch (err) {
      console.error("Validation failed:", err);
    }
  };

  // Final Submit Handler
  const handleSubmitReturn = async () => {
    if (!token || !formData) return;
    setIsSubmitting(true);
    try {
      const finalPayload = {
        ...formData,
        gstr3b: {
          ...formData.gstr3b,
          verification: {
            declared: true,
            signatory_name:
              formData.gstr3b?.verification?.signatory_name ||
              context?.header?.legalName ||
              "Authorized Signatory",
            place: formData.gstr3b?.verification?.place || "Bangalore",
            date: new Date().toLocaleDateString("en-GB"),
          },
        },
      };
      if (finalPayload.gstr1?.b2b) {
        finalPayload.gstr1.b2b.forEach((inv: any) => {
          if (!inv.cname?.trim() && inv.ctin) {
            inv.cname = `Recipient (${inv.ctin})`;
          }
        });
      }
      const res = await gstFormApi.submitForm(token, finalPayload);
      setSubmissionSuccess(res);
    } catch (err: any) {
      alert(err.message || "Failed to submit return");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Calculate Active Wizard Steps
  const wizardSteps: WizardStepInfo[] = useMemo(() => {
    if (!formData) return [];
    const selected = new Set(formData.selected_sections || []);
    const autoInc = new Set(formData.auto_included_sections || []);

    const steps: WizardStepInfo[] = [];
    const gstr1 = formData.gstr1 || {};
    const gstr3b = formData.gstr3b || {};

    SECTION_ORDER.forEach((sec) => {
      const isSelected = selected.has(sec.id) || autoInc.has(sec.id);
      if (!isSelected) return;

      let recordCount = 0;
      let hasData = false;

      if (sec.id === "b2b") {
        recordCount = (gstr1.b2b || []).length;
        hasData = recordCount > 0;
      } else if (sec.id === "b2cl") {
        recordCount = (gstr1.b2cl || []).length;
        hasData = recordCount > 0;
      } else if (sec.id === "b2cs") {
        recordCount = (gstr1.b2cs || []).filter((r: any) => (Number(r.txval) || 0) > 0).length;
        hasData = (gstr1.b2cs || []).length > 0;
      } else if (sec.id === "nil") {
        recordCount = (gstr1.nil || []).filter((r: any) => (Number(r.nil_amt) || 0) > 0 || (Number(r.expt_amt) || 0) > 0).length;
        hasData = recordCount > 0;
      } else if (sec.id === "cdnr") {
        recordCount = (gstr1.cdnr || []).length;
        hasData = recordCount > 0;
      } else if (sec.id === "cdnur") {
        recordCount = (gstr1.cdnur || []).length;
        hasData = recordCount > 0;
      } else if (sec.id === "hsn") {
        recordCount = (gstr1.hsn_b2b || []).length + (gstr1.hsn_b2c || []).length;
        hasData = recordCount > 0;
      } else if (sec.id === "doc_issue") {
        recordCount = (gstr1.doc_issue || []).reduce((acc: number, n: any) => acc + (n.docs || []).length, 0);
        hasData = recordCount > 0;
      } else if (sec.id === "3b_sales") {
        hasData = true;
        recordCount = 1;
      } else if (sec.id === "itc") {
        const net = gstr3b.table4?.itc_net || {};
        hasData = (Number(net.iamt) || 0) > 0 || (Number(net.camt) || 0) > 0 || (Number(net.samt) || 0) > 0;
        recordCount = hasData ? 1 : 0;
      } else if (sec.id === "rchrg_purchase") {
        const rchrg = gstr3b.table3_1?.isup_rev || {};
        hasData = (Number(rchrg.txval) || 0) > 0;
        recordCount = hasData ? 1 : 0;
      } else if (sec.id === "exempt_purchase") {
        const p = gstr3b.table5 || {};
        hasData = (Number(p.comp_nil?.inter) || 0) > 0 || (Number(p.comp_nil?.intra) || 0) > 0;
        recordCount = hasData ? 1 : 0;
      } else if (sec.id === "interest_late_fee") {
        const int = gstr3b.table5_1?.interest || {};
        hasData = (Number(int.iamt) || 0) > 0 || (Number(int.camt) || 0) > 0 || (Number(int.samt) || 0) > 0;
        recordCount = hasData ? 1 : 0;
      }

      steps.push({
        id: sec.id,
        title: sec.title,
        shortTitle: sec.shortTitle,
        tableTag: sec.tableTag,
        status: hasData ? "valid" : "pending",
        hasData,
        recordCount,
      });
    });

    return steps;
  }, [formData]);

  // Active step object
  const activeStep = wizardSteps[activeWizardIndex] || wizardSteps[0] || null;

  // 2. Live Running Totals Calculation
  const runningTotals = useMemo(() => {
    if (!formData) {
      return { salesTaxable: 0, salesGst: 0, itcEntered: 0, estimatedCashTax: 0 };
    }

    const gstr1 = formData.gstr1 || {};
    const gstr3b = formData.gstr3b || {};

    let salesTaxable = 0;
    let salesGst = 0;

    // B2B
    (gstr1.b2b || []).forEach((inv: any) => {
      (inv.items || []).forEach((it: any) => {
        salesTaxable += Number(it.txval) || 0;
        salesGst += (Number(it.iamt) || 0) + (Number(it.camt) || 0) + (Number(it.samt) || 0) + (Number(it.csamt) || 0);
      });
    });

    // B2CL
    (gstr1.b2cl || []).forEach((inv: any) => {
      (inv.items || []).forEach((it: any) => {
        salesTaxable += Number(it.txval) || 0;
        salesGst += (Number(it.iamt) || 0) + (Number(it.csamt) || 0);
      });
    });

    // B2CS
    (gstr1.b2cs || []).forEach((r: any) => {
      salesTaxable += Number(r.txval) || 0;
      salesGst += (Number(r.iamt) || 0) + (Number(r.camt) || 0) + (Number(r.samt) || 0) + (Number(r.csamt) || 0);
    });

    // CDNR
    (gstr1.cdnr || []).forEach((n: any) => {
      const sign = n.nt_ty === "C" || n.ntty === "C" ? -1 : 1;
      (n.items || []).forEach((it: any) => {
        salesTaxable += sign * (Number(it.txval) || 0);
        salesGst += sign * ((Number(it.iamt) || 0) + (Number(it.camt) || 0) + (Number(it.samt) || 0) + (Number(it.csamt) || 0));
      });
    });

    // CDNUR
    (gstr1.cdnur || []).forEach((n: any) => {
      const sign = n.nt_ty === "C" || n.ntty === "C" ? -1 : 1;
      (n.items || []).forEach((it: any) => {
        salesTaxable += sign * (Number(it.txval) || 0);
        salesGst += sign * ((Number(it.iamt) || 0) + (Number(it.csamt) || 0));
      });
    });

    // Nil
    (gstr1.nil || []).forEach((n: any) => {
      salesTaxable += (Number(n.nil_amt) || 0) + (Number(n.expt_amt) || 0) + (Number(n.ngsup_amt) || 0);
    });

    // ITC from Table 4 net
    const itcNet = gstr3b.table4?.itc_net || {};
    const itcEntered =
      (Number(itcNet.iamt) || 0) +
      (Number(itcNet.camt) || 0) +
      (Number(itcNet.samt) || 0) +
      (Number(itcNet.csamt) || 0);

    const estimatedCashTax = Math.max(0, salesGst - itcEntered);

    return {
      salesTaxable: Math.max(0, salesTaxable),
      salesGst: Math.max(0, salesGst),
      itcEntered,
      estimatedCashTax,
    };
  }, [formData]);

  // Target totals for HSN reconciliation
  const targetB2bTotal = useMemo(() => {
    if (!formData) return 0;
    const gstr1 = formData.gstr1 || {};
    let sum = 0;
    (gstr1.b2b || []).forEach((inv: any) => {
      (inv.items || []).forEach((it: any) => {
        sum += Number(it.txval) || 0;
      });
    });
    return sum;
  }, [formData]);

  const targetB2cTotal = useMemo(() => {
    if (!formData) return 0;
    const gstr1 = formData.gstr1 || {};
    let sum = 0;
    (gstr1.b2cl || []).forEach((inv: any) => {
      (inv.items || []).forEach((it: any) => {
        sum += Number(it.txval) || 0;
      });
    });
    (gstr1.b2cs || []).forEach((r: any) => {
      sum += Number(r.txval) || 0;
    });
    return sum;
  }, [formData]);

  // Handle Step 0 Start
  const handleStartFromStep0 = (selection: Step0Selection) => {
    if (!formData || !context) return;

    if (selection.isNil) {
      // Nil return mode: set both returns to Nil and go straight to Summary
      const updated = {
        ...formData,
        currentStep: "summary",
        selected_sections: [],
        auto_included_sections: [],
        gstr1: {
          ...formData.gstr1,
          is_nil: true,
          b2b: [],
          b2cl: [],
          b2cs: [],
          nil: [],
          cdnr: [],
          cdnur: [],
          hsn_b2b: [],
          hsn_b2c: [],
          doc_issue: [],
        },
        gstr3b: {
          ...formData.gstr3b,
          is_nil: true,
        },
      };
      triggerAutoSave(updated);
      setCurrentStep("summary");
      runValidation();
      return;
    }

    // Outward selling sections check
    const outwardSelling = ["b2b", "b2cl", "b2cs", "nil", "cdnr", "cdnur"];
    const hasOutward = selection.sections.some((s) => outwardSelling.includes(s));

    const autoIncluded: string[] = [];
    if (hasOutward) {
      autoIncluded.push("hsn", "doc_issue");
    }
    if (selection.returns.gstr3b) {
      autoIncluded.push("3b_sales");
    }

    const updated = {
      ...formData,
      currentStep: "wizard",
      selected_sections: selection.sections,
      auto_included_sections: autoIncluded,
      gstr1: {
        ...formData.gstr1,
        is_nil: false,
      },
      gstr3b: {
        ...formData.gstr3b,
        is_nil: false,
      },
    };

    triggerAutoSave(updated);
    setActiveWizardIndex(0);
    setCurrentStep("wizard");
  };

  // Handle Carry Over from Last Period
  const handleStartFromLastPeriod = async () => {
    if (!token || !formData || !context) return;
    setIsCarryingOver(true);
    try {
      const carryOver = await gstFormApi.getCarryOver(token);
      if (!carryOver || !carryOver.sections) {
        alert("No previous period data available to carry over.");
        return;
      }

      const updated = {
        ...formData,
        currentStep: "wizard",
        selected_sections: carryOver.sections,
        auto_included_sections: ["hsn", "doc_issue", "3b_sales"],
        started_from_previous_submission_id: carryOver.previousSubmissionId,
        sticky_defaults: {
          ...formData.sticky_defaults,
          usualPos: carryOver.commonDefaults?.usualPos,
          usualRates: carryOver.commonDefaults?.usualRates,
        },
        gstr1: {
          ...formData.gstr1,
          b2cs: (carryOver.b2csStructure || []).map((r: any) => ({
            ...r,
            txval: "",
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          })),
          hsn_b2b: (carryOver.hsnStructure || []).map((h: any) => ({
            ...h,
            qty: "",
            txval: "",
            iamt: "",
            camt: "",
            samt: "",
            csamt: "",
          })),
          doc_issue: (carryOver.seriesRows || []).map((s: any, idx: number) => ({
            doc_num: s.docNum || idx + 1,
            name: s.name || `Document Nature ${s.docNum || idx + 1}`,
            docs: [
              {
                num: 1,
                from: `${s.prefix || ""}${String((s.lastNumber || 0) + 1).padStart(3, "0")}`,
                to: "",
                totnum: "",
                cancld: 0,
                net_issued: "",
              },
            ],
          })),
        },
      };

      triggerAutoSave(updated);
      setActiveWizardIndex(0);
      setCurrentStep("wizard");
    } catch (err: any) {
      alert(err.message || "Failed to carry over previous period structure.");
    } finally {
      setIsCarryingOver(false);
    }
  };

  // Trigger Auto-Derive HSN
  const handleTriggerAutoDeriveHsn = async () => {
    if (!token || !formData) return;
    setIsDerivingHsn(true);
    try {
      const derived = await gstFormApi.deriveHsn(token, formData);
      const updatedGstr1 = {
        ...formData.gstr1,
        hsn_b2b: derived.hsn_b2b || [],
        hsn_b2c: derived.hsn_b2c || [],
      };
      triggerAutoSave({ ...formData, gstr1: updatedGstr1 });
    } catch (err) {
      console.error("Auto-derive HSN failed:", err);
    } finally {
      setIsDerivingHsn(false);
    }
  };

  // Trigger Auto-Derive Documents
  const handleTriggerAutoDeriveDocs = async () => {
    if (!token || !formData) return;
    setIsDerivingDocs(true);
    try {
      const derived = await gstFormApi.deriveDocuments(token, formData);
      const updatedGstr1 = {
        ...formData.gstr1,
        doc_issue: derived.doc_issue || [],
      };
      triggerAutoSave({ ...formData, gstr1: updatedGstr1 });
    } catch (err) {
      console.error("Auto-derive Documents failed:", err);
    } finally {
      setIsDerivingDocs(false);
    }
  };

  // Wizard Stepper: Next Button
  const handleWizardNext = () => {
    if (activeWizardIndex < wizardSteps.length - 1) {
      const nextIdx = activeWizardIndex + 1;
      setActiveWizardIndex(nextIdx);

      // Auto-derive triggers when entering HSN or Docs for the first time
      const nextStepId = wizardSteps[nextIdx]?.id;
      if (nextStepId === "hsn" && (!formData.gstr1.hsn_b2b?.length && !formData.gstr1.hsn_b2c?.length)) {
        handleTriggerAutoDeriveHsn();
      } else if (nextStepId === "doc_issue" && !formData.gstr1.doc_issue?.length) {
        handleTriggerAutoDeriveDocs();
      }
    } else {
      // Last wizard step: Go to Summary
      runValidation();
      setCurrentStep("summary");
      triggerAutoSave({ ...formData, currentStep: "summary" });
    }
  };

  // Wizard Stepper: Back Button
  const handleWizardBack = () => {
    if (activeWizardIndex > 0) {
      setActiveWizardIndex(activeWizardIndex - 1);
    } else {
      // First section: go back to Step 0 Scope Selector
      setCurrentStep("step0");
      triggerAutoSave({ ...formData, currentStep: "step0" });
    }
  };

  // Wizard Stepper: Skip Button
  const handleConfirmSkip = () => {
    setSkipConfirmModal(false);
    handleWizardNext();
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-[#0f172a] text-gray-700 dark:text-gray-300">
        <Loader2 className="w-10 h-10 animate-spin text-[#31719B] mb-3" />
        <h2 className="text-sm font-bold">Connecting to Secure GST Portal...</h2>
        <p className="text-xs text-gray-400 mt-1">Validating token credentials & loading client return context</p>
      </div>
    );
  }

  // 2. Expired / Inaccessible State
  if (context && !context.isAccessible) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#0f172a]">
        <div className="max-w-md w-full bg-white dark:bg-[#1e293b] p-8 rounded-2xl border border-[#dde2e8] dark:border-[#334155] text-center shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            {context.state === "SUBMITTED" ? <CheckCircle2 className="w-6 h-6 text-blue-600" /> : <Clock className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {context.state === "SUBMITTED" ? "Already Submitted" : "Link Expired"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {context.message || "This link has expired or has already been used. Please contact your Chartered Accountant."}
            </p>
          </div>
          {context.state === "SUBMITTED" && context.submittedAt && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-mono text-gray-600">
              Submitted at: {new Date(context.submittedAt).toLocaleString("en-IN")}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Error State
  if (loadError || !context || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#0f172a]">
        <div className="max-w-md w-full bg-white dark:bg-[#1e293b] p-8 rounded-2xl border border-red-200 text-center shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Unable to Load Form</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {loadError || "This link is invalid or expired. Please contact your CA firm."}
            </p>
            {token && (
              <p className="text-[10px] text-gray-400 font-mono mt-2 break-all bg-gray-50 dark:bg-gray-800 p-1.5 rounded">
                Token: {token}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#31719B] text-white hover:bg-[#275a7c] transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 4. Success Screen After Submit
  if (submissionSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#0f172a]">
        <div className="max-w-xl w-full bg-white dark:bg-[#1e293b] p-8 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 text-center shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              GST Return Data Successfully Submitted!
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your return details for period <strong>{formatReturnPeriod(context.header.returnPeriod)}</strong> have been saved and locked.
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-xs space-y-2 text-left font-mono border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between">
              <span className="text-gray-400">Submission ID:</span>
              <span className="font-bold text-gray-900 dark:text-white">{submissionSuccess.submissionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Submitted At:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {new Date(submissionSuccess.submittedAt).toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">SHA-256 Tamper Hash:</span>
              <span className="text-[10px] break-all block text-[#31719B] dark:text-blue-400">
                {submissionSuccess.payloadSha256}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Your Chartered Accountant has been notified and will review your submission before final filing.
          </p>
        </div>
      </div>
    );
  }

  // 5. Main Form Workspace
  const gstr1 = formData.gstr1;
  const gstr3b = formData.gstr3b;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] pb-24">
      {/* Persistent Prefilled Header Card */}
      <GstFormHeader
        header={context.header}
        lastSavedAt={lastSavedAt}
        currentStep={currentStep}
        onStepChange={(st) => {
          if (st === "step0") {
            setCurrentStep("step0");
          } else if (st === "wizard") {
            if (wizardSteps.length > 0) {
              setCurrentStep("wizard");
            } else {
              setCurrentStep("step0");
            }
          } else if (st === "summary") {
            runValidation();
            setCurrentStep("summary");
          }
        }}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        {/* STEP 0: What do you need to file? */}
        {currentStep === "step0" && (
          <Step0SectionSelector
            header={context.header}
            clientContext={context.clientContext}
            initialSelection={{
              returns: {
                gstr1: Boolean(context.clientContext?.enabledServices?.gstr1 ?? true),
                gstr3b: Boolean(context.clientContext?.enabledServices?.gstr3b ?? true),
              },
              sections: formData.selected_sections || [],
              isNil: Boolean(formData.gstr1?.is_nil || formData.gstr3b?.is_nil),
            }}
            onStart={handleStartFromStep0}
            onStartFromLastPeriod={handleStartFromLastPeriod}
            isCarryingOver={isCarryingOver}
          />
        )}

        {/* STEP 1: Smart Form Wizard */}
        {currentStep === "wizard" && activeStep && (
          <div className="space-y-6">
            {/* Wizard Stepper with Live Totals Bar */}
            <GstWizardStepper
              steps={wizardSteps}
              currentStepIndex={activeWizardIndex}
              onSelectStep={(idx) => {
                setActiveWizardIndex(idx);
                const stepId = wizardSteps[idx]?.id;
                if (stepId === "hsn" && (!gstr1.hsn_b2b?.length && !gstr1.hsn_b2c?.length)) {
                  handleTriggerAutoDeriveHsn();
                } else if (stepId === "doc_issue" && !gstr1.doc_issue?.length) {
                  handleTriggerAutoDeriveDocs();
                }
              }}
              onAddSection={() => setShowAddSectionModal(true)}
              onBack={handleWizardBack}
              onNext={handleWizardNext}
              onSkip={() => setSkipConfirmModal(true)}
              isFirstStep={activeWizardIndex === 0}
              isLastStep={activeWizardIndex === wizardSteps.length - 1}
              runningTotals={runningTotals}
              isSaving={isAutoSaving}
            />

            {/* Render Active Wizard Section */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-5 shadow-card">
              {/* Section 4A B2B */}
              {activeStep.id === "b2b" && (
                <OneLineInvoiceGrid
                  token={token}
                  section="b2b"
                  sectionTitle="Section 4A: B2B Invoices (Business-to-Business)"
                  supplierStateCode={context.header.stateCode}
                  returnPeriod={context.header.returnPeriod}
                  turnoverSlab={context.header.turnoverSlab}
                  invoices={gstr1.b2b || []}
                  stickyDefaults={formData.sticky_defaults}
                  onUpdateStickyDefaults={(defs) => {
                    const updated = {
                      ...formData,
                      sticky_defaults: { ...formData.sticky_defaults, ...defs },
                    };
                    triggerAutoSave(updated);
                  }}
                  onChange={(invoices: GridInvoiceRow[]) => {
                    const updatedGstr1 = { ...gstr1, b2b: invoices };
                    const updated3b = updateGstr3BFromGstr1(updatedGstr1, gstr3b, context.header.stateCode);
                    triggerAutoSave({ ...formData, gstr1: updatedGstr1, gstr3b: updated3b });
                  }}
                />
              )}

              {/* Section 5 B2C Large */}
              {activeStep.id === "b2cl" && (
                <OneLineInvoiceGrid
                  token={token}
                  section="b2cl"
                  sectionTitle="Section 5: Large B2C Invoices (> ₹1 Lakh Inter-State)"
                  supplierStateCode={context.header.stateCode}
                  returnPeriod={context.header.returnPeriod}
                  turnoverSlab={context.header.turnoverSlab}
                  invoices={gstr1.b2cl || []}
                  stickyDefaults={formData.sticky_defaults}
                  onUpdateStickyDefaults={(defs) => {
                    const updated = {
                      ...formData,
                      sticky_defaults: { ...formData.sticky_defaults, ...defs },
                    };
                    triggerAutoSave(updated);
                  }}
                  onChange={(invoices: GridInvoiceRow[]) => {
                    const updatedGstr1 = { ...gstr1, b2cl: invoices };
                    const updated3b = updateGstr3BFromGstr1(updatedGstr1, gstr3b, context.header.stateCode);
                    triggerAutoSave({ ...formData, gstr1: updatedGstr1, gstr3b: updated3b });
                  }}
                />
              )}

              {/* Section 7 B2C Others */}
              {activeStep.id === "b2cs" && (
                <B2COthersGrid
                  token={token}
                  supplierStateCode={context.header.stateCode}
                  rows={gstr1.b2cs || []}
                  onChange={(rows: B2CSRow[]) => {
                    const updatedGstr1 = { ...gstr1, b2cs: rows };
                    const updated3b = updateGstr3BFromGstr1(updatedGstr1, gstr3b, context.header.stateCode);
                    triggerAutoSave({ ...formData, gstr1: updatedGstr1, gstr3b: updated3b });
                  }}
                />
              )}

              {/* Section 8 Nil Rated */}
              {activeStep.id === "nil" && (
                <Section8NilRated
                  token={token}
                  rows={gstr1.nil || []}
                  onSaveRows={(rows: any[]) => {
                    const updatedGstr1 = { ...gstr1, nil: rows };
                    const updated3b = updateGstr3BFromGstr1(updatedGstr1, gstr3b, context.header.stateCode);
                    triggerAutoSave({ ...formData, gstr1: updatedGstr1, gstr3b: updated3b });
                  }}
                  onBackToDashboard={() => setActiveWizardIndex(Math.max(0, activeWizardIndex - 1))}
                />
              )}

              {/* Section 9B Registered Credit/Debit Notes */}
              {activeStep.id === "cdnr" && (
                <OneLineInvoiceGrid
                  token={token}
                  section="cdnr"
                  sectionTitle="Section 9B: Credit / Debit Notes to Registered Businesses (CDNR)"
                  supplierStateCode={context.header.stateCode}
                  returnPeriod={context.header.returnPeriod}
                  turnoverSlab={context.header.turnoverSlab}
                  invoices={gstr1.cdnr || []}
                  stickyDefaults={formData.sticky_defaults}
                  onUpdateStickyDefaults={(defs) => {
                    const updated = {
                      ...formData,
                      sticky_defaults: { ...formData.sticky_defaults, ...defs },
                    };
                    triggerAutoSave(updated);
                  }}
                  onChange={(notes: GridInvoiceRow[]) => {
                    const updatedGstr1 = { ...gstr1, cdnr: notes };
                    const updated3b = updateGstr3BFromGstr1(updatedGstr1, gstr3b, context.header.stateCode);
                    triggerAutoSave({ ...formData, gstr1: updatedGstr1, gstr3b: updated3b });
                  }}
                />
              )}

              {/* Section 9B Unregistered Credit/Debit Notes */}
              {activeStep.id === "cdnur" && (
                <OneLineInvoiceGrid
                  token={token}
                  section="cdnur"
                  sectionTitle="Section 9B: Credit / Debit Notes to Unregistered Consumers (CDNUR)"
                  supplierStateCode={context.header.stateCode}
                  returnPeriod={context.header.returnPeriod}
                  turnoverSlab={context.header.turnoverSlab}
                  invoices={gstr1.cdnur || []}
                  stickyDefaults={formData.sticky_defaults}
                  onUpdateStickyDefaults={(defs) => {
                    const updated = {
                      ...formData,
                      sticky_defaults: { ...formData.sticky_defaults, ...defs },
                    };
                    triggerAutoSave(updated);
                  }}
                  onChange={(notes: GridInvoiceRow[]) => {
                    const updatedGstr1 = { ...gstr1, cdnur: notes };
                    const updated3b = updateGstr3BFromGstr1(updatedGstr1, gstr3b, context.header.stateCode);
                    triggerAutoSave({ ...formData, gstr1: updatedGstr1, gstr3b: updated3b });
                  }}
                />
              )}

              {/* Section 12 HSN Summary */}
              {activeStep.id === "hsn" && (
                <HsnAutoStep
                  token={token}
                  supplierStateCode={context.header.stateCode}
                  turnoverSlab={context.header.turnoverSlab}
                  hsnB2b={gstr1.hsn_b2b || []}
                  hsnB2c={gstr1.hsn_b2c || []}
                  onChangeHsnB2b={(items: HsnItem[]) => {
                    const updatedGstr1 = { ...gstr1, hsn_b2b: items };
                    triggerAutoSave({ ...formData, gstr1: updatedGstr1 });
                  }}
                  onChangeHsnB2c={(items: HsnItem[]) => {
                    const updatedGstr1 = { ...gstr1, hsn_b2c: items };
                    triggerAutoSave({ ...formData, gstr1: updatedGstr1 });
                  }}
                  targetB2bTotal={targetB2bTotal}
                  targetB2cTotal={targetB2cTotal}
                  onAutoDerive={handleTriggerAutoDeriveHsn}
                  isDeriving={isDerivingHsn}
                />
              )}

              {/* Section 13 Documents Issued */}
              {activeStep.id === "doc_issue" && (
                <DocumentsAutoStep
                  docIssue={gstr1.doc_issue || []}
                  onChange={(sections: NatureSection[]) => {
                    const updatedGstr1 = { ...gstr1, doc_issue: sections };
                    triggerAutoSave({ ...formData, gstr1: updatedGstr1 });
                  }}
                  onAutoDerive={handleTriggerAutoDeriveDocs}
                  isDeriving={isDerivingDocs}
                />
              )}

              {/* GSTR-3B Steps */}
              {["3b_sales", "itc", "rchrg_purchase", "exempt_purchase", "interest_late_fee"].includes(
                activeStep.id
              ) && (
                <Gstr3BWizardSteps
                  token={token}
                  activeSection={
                    activeStep.id === "3b_sales"
                      ? "3b_sales"
                      : activeStep.id === "rchrg_purchase"
                      ? "rchrg_purchase"
                      : activeStep.id === "exempt_purchase"
                      ? "exempt_purchase"
                      : activeStep.id === "interest_late_fee"
                      ? "interest_late_fee"
                      : "itc"
                  }
                  table3_1={gstr3b.table3_1 || {}}
                  table3_2={gstr3b.table3_2 || []}
                  table4={gstr3b.table4 || {}}
                  table5={gstr3b.table5 || {}}
                  table5_1={gstr3b.table5_1 || {}}
                  onChangeTable4={(t4) => {
                    const updated3b = { ...gstr3b, table4: t4 };
                    triggerAutoSave({ ...formData, gstr3b: updated3b });
                  }}
                  onChangeTable3_1_d={(isup_rev) => {
                    const updated3b = {
                      ...gstr3b,
                      table3_1: { ...gstr3b.table3_1, isup_rev },
                    };
                    triggerAutoSave({ ...formData, gstr3b: updated3b });
                  }}
                  onChangeTable5={(t5) => {
                    const updated3b = { ...gstr3b, table5: t5 };
                    triggerAutoSave({ ...formData, gstr3b: updated3b });
                  }}
                  onChangeTable5_1={(t5_1) => {
                    const updated3b = { ...gstr3b, table5_1: t5_1 };
                    triggerAutoSave({ ...formData, gstr3b: updated3b });
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Summary Page & Final Submit */}
        {currentStep === "summary" && (
          <GstSummaryPage
            payload={formData}
            header={context.header}
            selectedSections={formData.selected_sections || []}
            validationReport={validationReport}
            onEditSection={(secKey) => {
              // Find matching index in wizard
              const matchingIdx = wizardSteps.findIndex((s) => s.id === secKey);
              if (matchingIdx >= 0) {
                setActiveWizardIndex(matchingIdx);
              } else {
                setActiveWizardIndex(0);
              }
              setCurrentStep("wizard");
            }}
            onSubmitReturn={handleSubmitReturn}
            isSubmitting={isSubmitting}
            onBackTo3B={() => {
              if (wizardSteps.length > 0) {
                setActiveWizardIndex(wizardSteps.length - 1);
                setCurrentStep("wizard");
              } else {
                setCurrentStep("step0");
              }
            }}
            onUpdateVerification={(verification) => {
              const updated = {
                ...formData,
                gstr3b: {
                  ...formData.gstr3b,
                  verification,
                },
              };
              setFormData(updated);
              triggerAutoSave(updated);
              runValidation(updated);
            }}
          />
        )}
      </main>

      {/* Skip Confirmation Modal */}
      {skipConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#dde2e8] dark:border-[#334155] p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Skip this section?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                You can return to <strong>{activeStep?.title}</strong> anytime from the stepper or Summary page. Any unsaved entries in this section will not be submitted.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setSkipConfirmModal(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmSkip}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-xs"
              >
                Yes, Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "+ Add a Section" Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#dde2e8] dark:border-[#334155] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#31719B]" />
                Manage Included Sections
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Check additional sections to include them in your form wizard. Unchecking a section that already contains records will keep your records in draft.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {SECTION_ORDER.filter((s) => !["hsn", "doc_issue", "3b_sales"].includes(s.id)).map((sec) => {
                const isSelected = (formData.selected_sections || []).includes(sec.id);
                return (
                  <label
                    key={sec.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#31719B] bg-blue-50/40 dark:bg-blue-950/20"
                        : "border-[#dde2e8] dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const cur = new Set(formData.selected_sections || []);
                        if (e.target.checked) cur.add(sec.id);
                        else cur.delete(sec.id);
                        const arr = Array.from(cur);
                        triggerAutoSave({ ...formData, selected_sections: arr });
                      }}
                      className="mt-0.5 rounded text-[#31719B] focus:ring-[#31719B]"
                    />
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {sec.title}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {sec.tableTag}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="px-4 py-2 rounded-lg bg-[#31719B] text-white text-xs font-semibold hover:bg-[#275a7c] transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
