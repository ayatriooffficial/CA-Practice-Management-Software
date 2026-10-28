"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { organizationApi, OrganizationDetails } from "@/services/organizationApi";
import { useAuth } from "../auth/AuthContext";
import { OnboardingHeader } from "./tabs/OnboardingHeader";
import { OnboardingStepper } from "./tabs/OnboardingStepper";
import { OrganizationProfileTab } from "./tabs/OrganizationProfileTab";
import { BankAccountTab } from "./tabs/BankAccountTab";
import { BrandingTab, DEFAULT_DOCUMENT_COLORS, DocumentColorSetting } from "./tabs/BrandingTab";
import { InvoiceSettingsTab } from "./tabs/InvoiceSettingsTab";
import { InvoiceSharingTab } from "./tabs/InvoiceSharingTab";
import { BusinessHoursTab } from "./tabs/BusinessHoursTab";
import { IntegrationTab } from "./tabs/IntegrationTab";
import { DaySchedule, DEFAULT_DAYS } from "./tabs/types";
import { CompletionModal } from "./tabs/CompletionModal";

export const OnboardingWizard: React.FC = () => {
  const { currentUser, refreshProfile } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState<boolean>(false);

  // --- Section 1: Firm Details (Organization Profile) State ---
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [currency, setCurrency] = useState("Rupees INR ₹");
  const [businessEntity, setBusinessEntity] = useState("Partnership Firm");
  const [businessType, setBusinessType] = useState("Chartered Accountant (CA)");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Karnataka");
  const [pincode, setPincode] = useState("");
  const [isGstRegistered, setIsGstRegistered] = useState(true);
  const [gstin, setGstin] = useState("");
  const [cinNumber, setCinNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [tanNumber, setTanNumber] = useState("");
  const [udyamNumber, setUdyamNumber] = useState("");
  const [msmeCategory, setMsmeCategory] = useState("Micro");
  const [professionalTaxNumber, setProfessionalTaxNumber] = useState("");
  const [providentFundNumber, setProvidentFundNumber] = useState("");
  const [esiRegistrationNumber, setEsiRegistrationNumber] = useState("");

  // --- Section 2: Bank & Payments State ---
  const [bankName, setBankName] = useState("");
  const [accountBusinessName, setAccountBusinessName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [accountType, setAccountType] = useState("Savings");
  const [bankDescription, setBankDescription] = useState("");
  const [upiId, setUpiId] = useState("");

  // --- Section 3: Branding State (Matches Image 4 & 5) ---
  const [template, setTemplate] = useState<"classic" | "modern" | "minimal">("modern");
  const [documentColors, setDocumentColors] = useState<DocumentColorSetting[]>(DEFAULT_DOCUMENT_COLORS);
  const [firmLogoUrl, setFirmLogoUrl] = useState<string | null>(null);
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState<string | null>(null);
  const [showCaLogo, setShowCaLogo] = useState<boolean>(true);

  // --- Section 4: Document Settings State ---
  const [invoiceGenMode, setInvoiceGenMode] = useState<"Automatically" | "Manually">("Automatically");
  const [invoicePrefix, setInvoicePrefix] = useState("MA");
  const [invoiceFY, setInvoiceFY] = useState("2024-25");
  const [invoiceNextNum, setInvoiceNextNum] = useState("001");
  const [showQuantity, setShowQuantity] = useState<boolean>(true);
  const [showHsnSac, setShowHsnSac] = useState<boolean>(true);
  const [defaultInvoiceNote, setDefaultInvoiceNote] = useState(
    "Thank you for your business. Please make payment within the due date."
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    "1. Interest @ 18% p.a. will be levied on overdue payments.\n2. All disputes are subject to local jurisdiction.\n3. Payment should be made in favor of our primary bank account or via UPI."
  );
  const [defaultDueDays, setDefaultDueDays] = useState("15");

  // --- Section 5: Invoice Sharing State ---
  const [autoReminder, setAutoReminder] = useState<boolean>(true);
  const [ccInvoiceMail, setCcInvoiceMail] = useState("");
  const [enableWhatsAppSharing, setEnableWhatsAppSharing] = useState<boolean>(true);
  const [enableClientPortal, setEnableClientPortal] = useState<boolean>(true);

  // --- Section 6: Business Hours State ---
  const [shiftName, setShiftName] = useState("General Shift");
  const [schedules, setSchedules] = useState<DaySchedule[]>(DEFAULT_DAYS);
  const [gracePeriod, setGracePeriod] = useState("15");
  const [enableAutoLogout, setEnableAutoLogout] = useState<boolean>(false);
  const [autoLogoutAfter, setAutoLogoutAfter] = useState("06:30 PM");

  // --- Section 7: Integrations State ---
  const [selectedApp, setSelectedApp] = useState<"gmail" | "outlook">("gmail");
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);

  // Computed total weekly & monthly hours
  const totalWeeklyHours = useMemo(() => {
    return schedules
      .filter((s) => s.enabled)
      .reduce((acc, curr) => acc + (curr.hours || 0), 0);
  }, [schedules]);

  const totalMonthlyHours = useMemo(() => {
    return Math.round(totalWeeklyHours * 4.33 * 10) / 10;
  }, [totalWeeklyHours]);

  // Load existing organization and invoice settings on mount
  useEffect(() => {
    let isMounted = true;
    const fetchOrg = async () => {
      try {
        setIsLoading(true);
        const res = await organizationApi.getOrganization();
        if (isMounted && res.data) {
          const org = res.data;
          setBusinessName(org.name || currentUser?.firmName || "Medappa & Associates");
          setBusinessEmail(org.email || currentUser?.email || "");
          setContactNumber(org.mobile || currentUser?.mobile || "");
          if (org.currency) setCurrency(org.currency);
          if (org.businessEntity) setBusinessEntity(org.businessEntity);
          if (org.businessType) setBusinessType(org.businessType);

          if (org.addressDetails) {
            setAddressLine1(org.addressDetails.addressLine1 || org.address || "");
            setAddressLine2(org.addressDetails.addressLine2 || "");
            setCity(org.addressDetails.city || "");
            setState(org.addressDetails.state || "Karnataka");
            setPincode(org.addressDetails.pincode || "");
            if (org.addressDetails.country) setCountry(org.addressDetails.country);
          }

          if (org.gstin) {
            setGstin(org.gstin);
            setIsGstRegistered(true);
          }
          if (org.pan) setPanNumber(org.pan);
          if (org.cinNumber) setCinNumber(org.cinNumber);
          if (org.tanNumber) setTanNumber(org.tanNumber);
          if (org.udyamNumber) setUdyamNumber(org.udyamNumber);
          if (org.msmeCategory) setMsmeCategory(org.msmeCategory);
          if (org.professionalTaxNumber) setProfessionalTaxNumber(org.professionalTaxNumber);
          if (org.providentFundNumber) setProvidentFundNumber(org.providentFundNumber);
          if (org.esiRegistrationNumber) setEsiRegistrationNumber(org.esiRegistrationNumber);

          // Bank Details
          const bank = org.paymentDetails?.bankDetails;
          if (bank) {
            setBankName(bank.bankName === "Not Added" ? "" : bank.bankName || "");
            setAccountBusinessName(
              bank.accountHolderName === "Not Added"
                ? org.name || "Medappa & Associates"
                : bank.accountHolderName || org.name || ""
            );
            setIfscCode(bank.ifscCode === "Not Added" ? "" : bank.ifscCode || "");
            setAccountNumber(bank.accountNumber === "Not Added" ? "" : bank.accountNumber || "");
            setBranchAddress(bank.branchName === "Not Added" ? "" : bank.branchName || "");
            setAccountType(bank.accountType === "N/A" ? "Savings" : bank.accountType || "Savings");
            setUpiId(bank.upiId === "N/A" ? "" : bank.upiId || "");
          } else {
            setAccountBusinessName(org.name || "Medappa & Associates");
          }

          // Compute suggested invoice prefix from firm initials
          const initials = (org.name || "Medappa & Associates")
            .split(" ")
            .map((w) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();
          if (initials) setInvoicePrefix(initials);

          // Restore Invoice & Branding Settings if previously saved
          const invSettings = org.invoiceSettings;
          if (invSettings) {
            if (invSettings.template) setTemplate(invSettings.template);
            if (Array.isArray(invSettings.documentColors)) setDocumentColors(invSettings.documentColors);
            if (invSettings.firmLogoUrl) setFirmLogoUrl(invSettings.firmLogoUrl);
            if (invSettings.digitalSignatureUrl) setDigitalSignatureUrl(invSettings.digitalSignatureUrl);
            if (typeof invSettings.showCaLogo === "boolean") setShowCaLogo(invSettings.showCaLogo);
            if (invSettings.invoiceGenMode) setInvoiceGenMode(invSettings.invoiceGenMode);
            if (invSettings.invoicePrefix) setInvoicePrefix(invSettings.invoicePrefix);
            if (invSettings.invoiceFY) setInvoiceFY(invSettings.invoiceFY);
            if (invSettings.invoiceNextNum) setInvoiceNextNum(invSettings.invoiceNextNum);
            if (typeof invSettings.showQuantity === "boolean") setShowQuantity(invSettings.showQuantity);
            if (typeof invSettings.showHsnSac === "boolean") setShowHsnSac(invSettings.showHsnSac);
            if (invSettings.defaultInvoiceNote) setDefaultInvoiceNote(invSettings.defaultInvoiceNote);
            if (invSettings.termsAndConditions) setTermsAndConditions(invSettings.termsAndConditions);
            if (invSettings.defaultDueDays) setDefaultDueDays(invSettings.defaultDueDays);
            if (typeof invSettings.autoReminder === "boolean") setAutoReminder(invSettings.autoReminder);
            if (invSettings.ccInvoiceMail) setCcInvoiceMail(invSettings.ccInvoiceMail);
            if (typeof invSettings.enableWhatsAppSharing === "boolean")
              setEnableWhatsAppSharing(invSettings.enableWhatsAppSharing);
            if (typeof invSettings.enableClientPortal === "boolean")
              setEnableClientPortal(invSettings.enableClientPortal);
          }

          // Restore Business Hours
          const bh = org.businessHours;
          if (bh) {
            if (bh.shiftName) setShiftName(bh.shiftName);
            if (Array.isArray(bh.schedules)) setSchedules(bh.schedules);
            if (bh.gracePeriod) setGracePeriod(bh.gracePeriod);
            if (typeof bh.enableAutoLogout === "boolean") setEnableAutoLogout(bh.enableAutoLogout);
            if (bh.autoLogoutAfter) setAutoLogoutAfter(bh.autoLogoutAfter);
          }

          // Restore Integrations
          const integ = org.integrations;
          if (integ) {
            if (integ.selectedApp) setSelectedApp(integ.selectedApp);
            if (typeof integ.isGoogleConnected === "boolean") setIsGoogleConnected(integ.isGoogleConnected);
          }

          if (org.onboardingStep) {
            const step = Math.min(Math.max(org.onboardingStep, 1), 7);
            setCurrentStep(step);
            setCompletedSteps(Array.from({ length: step - 1 }, (_, i) => i + 1));
          }
        }
      } catch (err) {
        console.warn("Could not fetch organization details:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOrg();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Derived progress percentage & steps remaining for 7 sections
  const progressPercent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return 14;
      case 2:
        return 28;
      case 3:
        return 43;
      case 4:
        return 57;
      case 5:
        return 71;
      case 6:
        return 86;
      case 7:
        return 100;
      default:
        return 100;
    }
  }, [currentStep]);

  const stepsRemaining = useMemo(() => {
    return Math.max(0, 8 - currentStep);
  }, [currentStep]);

  // Helper to compile full invoiceSettings payload
  const buildInvoiceSettingsPayload = () => ({
    template,
    documentColors,
    firmLogoUrl,
    digitalSignatureUrl,
    showCaLogo,
    invoiceGenMode,
    invoicePrefix,
    invoiceFY,
    invoiceNextNum,
    showQuantity,
    showHsnSac,
    defaultInvoiceNote,
    termsAndConditions,
    defaultDueDays,
    autoReminder,
    ccInvoiceMail,
    enableWhatsAppSharing,
    enableClientPortal,
  });

  // Handle saving Step 1: Firm Details (Organization Profile)
  const handleSaveOrganization = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const payload: Partial<OrganizationDetails> = {
        name: businessName.trim() || "Medappa & Associates",
        email: businessEmail.trim().toLowerCase(),
        mobile: contactNumber.trim(),
        currency,
        businessEntity,
        businessType,
        address: `${addressLine1} ${addressLine2}`.trim(),
        addressDetails: {
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: country.trim(),
        },
        gstin: isGstRegistered ? gstin.trim().toUpperCase() : "",
        isGstRegistered,
        cinNumber: cinNumber.trim().toUpperCase(),
        pan: panNumber.trim().toUpperCase(),
        tanNumber: tanNumber.trim().toUpperCase(),
        udyamNumber: udyamNumber.trim().toUpperCase(),
        msmeCategory,
        professionalTaxNumber: professionalTaxNumber.trim(),
        providentFundNumber: providentFundNumber.trim(),
        esiRegistrationNumber: esiRegistrationNumber.trim(),
        invoiceSettings: buildInvoiceSettingsPayload(),
        onboardingStep: 2,
      };

      await organizationApi.updateOrganization(payload);
      await refreshProfile();
      setCompletedSteps((prev) => Array.from(new Set([...prev, 1])));
      setSuccessNotice("Firm details saved successfully.");
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save firm details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving Step 2: Bank Account
  const handleSaveBankAccount = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const payload: Partial<OrganizationDetails> = {
        paymentDetails: {
          paymentMode: "Bank Transfer",
          currency: currency.includes("INR") ? "INR" : "INR",
          terms: `Payment due within ${defaultDueDays} days of invoice date.`,
          isDefault: true,
          bankDetails: {
            bankName: bankName.trim(),
            accountHolderName: accountBusinessName.trim() || businessName,
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode.trim().toUpperCase(),
            branchName: branchAddress.trim(),
            accountType,
            upiId: upiId.trim(),
            qrCodeUrl: "",
          },
        },
        invoiceSettings: buildInvoiceSettingsPayload(),
        onboardingStep: 3,
      };

      await organizationApi.updateOrganization(payload);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 2])));
      setSuccessNotice("Bank account details saved successfully.");
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save bank account details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving Step 3: Branding
  const handleSaveBranding = async (advanceToNext: boolean = false) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const payload: Partial<OrganizationDetails> = {
        invoiceSettings: buildInvoiceSettingsPayload(),
        onboardingStep: advanceToNext ? 4 : 3,
      };

      await organizationApi.updateOrganization(payload);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 3])));
      setSuccessNotice("Professional branding preferences saved successfully.");
      if (advanceToNext) {
        setCurrentStep(4);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save branding preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving Step 4: Document Settings
  const handleSaveDocumentSettings = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const payload: Partial<OrganizationDetails> = {
        invoiceSettings: buildInvoiceSettingsPayload(),
        onboardingStep: 5,
      };

      await organizationApi.updateOrganization(payload);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 4])));
      setSuccessNotice("Document & numbering settings saved successfully.");
      setCurrentStep(5);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save document settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving Step 5: Invoice Sharing
  const handleSaveInvoiceSharingAndNext = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const payload: Partial<OrganizationDetails> = {
        invoiceSettings: buildInvoiceSettingsPayload(),
        onboardingStep: 6,
      };

      await organizationApi.updateOrganization(payload);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 5])));
      setSuccessNotice("Invoice sharing preferences saved successfully.");
      setCurrentStep(6);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save invoice sharing settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving Step 6: Business Hours
  const handleSaveBusinessHoursAndNext = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const payload: Partial<OrganizationDetails> = {
        businessHours: {
          shiftName,
          schedules,
          gracePeriod,
          enableAutoLogout,
          autoLogoutAfter,
          totalWeeklyHours,
          totalMonthlyHours,
        },
        onboardingStep: 7,
      };

      await organizationApi.updateOrganization(payload);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 6])));
      setSuccessNotice("Business hours and shifts saved successfully.");
      setCurrentStep(7);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save business hours. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle final completion in Step 7: Integrations
  const handleFinalSubmit = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      await organizationApi.updateOrganization({
        integrations: {
          selectedApp,
          isGoogleConnected,
        },
        onboardingStep: 7,
        onboardingCompleted: true,
      });
      setCompletedSteps([1, 2, 3, 4, 5, 6, 7]);
      setIsCompletedModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete onboarding. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-muted)] font-medium">Loading profile details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--bg-app)] text-[var(--text-main)]  flex flex-col justify-between font-sans">
      <div className="w-full mx-auto space-y-6">
        {/* Top Progress Banner Card */}
        <OnboardingHeader
          businessName={businessName}
          // progressPercent={progressPercent}
          stepsRemaining={stepsRemaining}
        />

        {/* Section Navigation Pill Bar matching Image 1 */}
        <OnboardingStepper
          currentStep={currentStep}
          onSelectStep={(stepId) => setCurrentStep(stepId)}
          completedSteps={completedSteps}
        />

        {/* Global Feedback Banners */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs font-medium text-rose-800 dark:text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Active Section Content Container */}
        <div className="bg-[var(--bg-surface)] rounded-sm border border-[var(--border-subtle)] p-5 sm:p-8 shadow-xl">
          {/* Section 1: 🏢 Firm Details */}
          {currentStep === 1 && (
            <OrganizationProfileTab
              businessName={businessName}
              setBusinessName={setBusinessName}
              businessEmail={businessEmail}
              setBusinessEmail={setBusinessEmail}
              contactNumber={contactNumber}
              setContactNumber={setContactNumber}
              currency={currency}
              setCurrency={setCurrency}
              businessEntity={businessEntity}
              setBusinessEntity={setBusinessEntity}
              businessType={businessType}
              setBusinessType={setBusinessType}
              addressLine1={addressLine1}
              setAddressLine1={setAddressLine1}
              addressLine2={addressLine2}
              setAddressLine2={setAddressLine2}
              city={city}
              setCity={setCity}
              country={country}
              setCountry={setCountry}
              state={state}
              setState={setState}
              pincode={pincode}
              setPincode={setPincode}
              isGstRegistered={isGstRegistered}
              setIsGstRegistered={setIsGstRegistered}
              gstin={gstin}
              setGstin={setGstin}
              cinNumber={cinNumber}
              setCinNumber={setCinNumber}
              panNumber={panNumber}
              setPanNumber={setPanNumber}
              tanNumber={tanNumber}
              setTanNumber={setTanNumber}
              udyamNumber={udyamNumber}
              setUdyamNumber={setUdyamNumber}
              msmeCategory={msmeCategory}
              setMsmeCategory={setMsmeCategory}
              professionalTaxNumber={professionalTaxNumber}
              setProfessionalTaxNumber={setProfessionalTaxNumber}
              providentFundNumber={providentFundNumber}
              setProvidentFundNumber={setProvidentFundNumber}
              esiRegistrationNumber={esiRegistrationNumber}
              setEsiRegistrationNumber={setEsiRegistrationNumber}
              isSaving={isSaving}
              onSave={handleSaveOrganization}
              onSkip={() => setCurrentStep(2)}
            />
          )}

          {/* Section 2: 💳 Bank & Payments */}
          {currentStep === 2 && (
            <BankAccountTab
              bankName={bankName}
              setBankName={setBankName}
              accountBusinessName={accountBusinessName}
              setAccountBusinessName={setAccountBusinessName}
              ifscCode={ifscCode}
              setIfscCode={setIfscCode}
              accountNumber={accountNumber}
              setAccountNumber={setAccountNumber}
              branchAddress={branchAddress}
              setBranchAddress={setBranchAddress}
              accountType={accountType}
              setAccountType={setAccountType}
              bankDescription={bankDescription}
              setBankDescription={setBankDescription}
              upiId={upiId}
              setUpiId={setUpiId}
              isSaving={isSaving}
              onPrevious={() => setCurrentStep(1)}
              onSkip={() => setCurrentStep(3)}
              onSave={handleSaveBankAccount}
            />
          )}

          {/* Section 3: 🎨 Branding (Matches Image 4 & 5) */}
          {currentStep === 3 && (
            <BrandingTab
              firmName={businessName}
              template={template}
              setTemplate={(val) => {
                setTemplate(val);
                organizationApi.updateOrganization({
                  invoiceSettings: {
                    ...buildInvoiceSettingsPayload(),
                    template: val,
                  },
                }).catch((err) => console.warn("Auto-saving invoice template failed:", err));
              }}
              documentColors={documentColors}
              setDocumentColors={setDocumentColors}
              firmLogoUrl={firmLogoUrl}
              setFirmLogoUrl={setFirmLogoUrl}
              digitalSignatureUrl={digitalSignatureUrl}
              setDigitalSignatureUrl={setDigitalSignatureUrl}
              showCaLogo={showCaLogo}
              setShowCaLogo={setShowCaLogo}
              isSaving={isSaving}
              onSave={() => handleSaveBranding(false)}
              onPrevious={() => setCurrentStep(2)}
              onNext={() => handleSaveBranding(true)}
            />
          )}

          {/* Section 4: 📄 Document Settings */}
          {currentStep === 4 && (
            <InvoiceSettingsTab
              invoiceGenMode={invoiceGenMode}
              setInvoiceGenMode={setInvoiceGenMode}
              invoicePrefix={invoicePrefix}
              setInvoicePrefix={setInvoicePrefix}
              invoiceFY={invoiceFY}
              setInvoiceFY={setInvoiceFY}
              invoiceNextNum={invoiceNextNum}
              setInvoiceNextNum={setInvoiceNextNum}
              showQuantity={showQuantity}
              setShowQuantity={setShowQuantity}
              showHsnSac={showHsnSac}
              setShowHsnSac={setShowHsnSac}
              defaultInvoiceNote={defaultInvoiceNote}
              setDefaultInvoiceNote={setDefaultInvoiceNote}
              termsAndConditions={termsAndConditions}
              setTermsAndConditions={setTermsAndConditions}
              defaultDueDays={defaultDueDays}
              setDefaultDueDays={setDefaultDueDays}
              onPrevious={() => setCurrentStep(3)}
              onNext={handleSaveDocumentSettings}
            />
          )}

          {/* Section 5: 🔗 Invoice Sharing */}
          {currentStep === 5 && (
            <InvoiceSharingTab
              autoReminder={autoReminder}
              setAutoReminder={setAutoReminder}
              ccInvoiceMail={ccInvoiceMail}
              setCcInvoiceMail={setCcInvoiceMail}
              enableWhatsAppSharing={enableWhatsAppSharing}
              setEnableWhatsAppSharing={setEnableWhatsAppSharing}
              enableClientPortal={enableClientPortal}
              setEnableClientPortal={setEnableClientPortal}
              onPrevious={() => setCurrentStep(4)}
              onComplete={handleSaveInvoiceSharingAndNext}
              isSaving={isSaving}
            />
          )}

          {/* Section 6: 🕒 Business Hours */}
          {currentStep === 6 && (
            <BusinessHoursTab
              shiftName={shiftName}
              setShiftName={setShiftName}
              schedules={schedules}
              setSchedules={setSchedules}
              totalWeeklyHours={totalWeeklyHours}
              totalMonthlyHours={totalMonthlyHours}
              gracePeriod={gracePeriod}
              setGracePeriod={setGracePeriod}
              enableAutoLogout={enableAutoLogout}
              setEnableAutoLogout={setEnableAutoLogout}
              autoLogoutAfter={autoLogoutAfter}
              setAutoLogoutAfter={setAutoLogoutAfter}
              onPrevious={() => setCurrentStep(5)}
              onSkip={() => setCurrentStep(7)}
              onNext={handleSaveBusinessHoursAndNext}
            />
          )}

          {/* Section 7: 🔌 Integrations */}
          {currentStep === 7 && (
            <IntegrationTab
              selectedApp={selectedApp}
              setSelectedApp={setSelectedApp}
              isGoogleConnected={isGoogleConnected}
              setIsGoogleConnected={setIsGoogleConnected}
              isSaving={isSaving}
              onPrevious={() => setCurrentStep(6)}
              onSkip={handleFinalSubmit}
              onSubmit={handleFinalSubmit}
            />
          )}
        </div>
      </div>

      {/* Completion Modal */}
      <CompletionModal
        isOpen={isCompletedModalOpen}
        onClose={() => setIsCompletedModalOpen(false)}
      />
    </div>
  );
};
