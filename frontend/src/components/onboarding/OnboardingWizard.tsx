"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { organizationApi, OrganizationDetails } from "@/services/organizationApi";
import { useAuth } from "../auth/AuthContext";
import { DaySchedule, DEFAULT_DAYS } from "./tabs/types";
import { OnboardingHeader } from "./tabs/OnboardingHeader";
import { OnboardingStepper } from "./tabs/OnboardingStepper";
import { OrganizationProfileTab } from "./tabs/OrganizationProfileTab";
import { BankAccountTab } from "./tabs/BankAccountTab";
import { InvoiceSettingsTab } from "./tabs/InvoiceSettingsTab";
import { BusinessHoursTab } from "./tabs/BusinessHoursTab";
import { IntegrationTab } from "./tabs/IntegrationTab";
import { CompletionModal } from "./tabs/CompletionModal";

export const OnboardingWizard: React.FC = () => {
  const { currentUser, refreshProfile } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState<boolean>(false);

  // --- Step 1: Organization Profile State ---
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

  // --- Step 2: Bank Account State ---
  const [bankName, setBankName] = useState("");
  const [accountBusinessName, setAccountBusinessName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [accountType, setAccountType] = useState("Savings");
  const [bankDescription, setBankDescription] = useState("");
  const [upiId, setUpiId] = useState("");

  // --- Step 3: Invoice Settings State ---
  const [invoiceGenMode, setInvoiceGenMode] = useState<"Automatically" | "Manually">("Automatically");
  const [invoicePrefix, setInvoicePrefix] = useState("MA");
  const [invoiceFY, setInvoiceFY] = useState("25-26");
  const [invoiceNextNum, setInvoiceNextNum] = useState("001");
  const [showQuantity, setShowQuantity] = useState(true);
  const [showHsnSac, setShowHsnSac] = useState(true);
  const [invoiceSignatureUrl, setInvoiceSignatureUrl] = useState<string | null>(null);
  const [defaultInvoiceNote, setDefaultInvoiceNote] = useState("");
  const [autoReminder, setAutoReminder] = useState(false);
  const [ccInvoiceMail, setCcInvoiceMail] = useState("");

  // --- Step 4: Business Hours State ---
  const [shiftName, setShiftName] = useState("General Shift");
  const [schedules, setSchedules] = useState<DaySchedule[]>(DEFAULT_DAYS);
  const [gracePeriod, setGracePeriod] = useState("15");
  const [enableAutoLogout, setEnableAutoLogout] = useState(true);
  const [autoLogoutAfter, setAutoLogoutAfter] = useState("08:00 PM");

  // --- Step 5: Integration State ---
  const [selectedApp, setSelectedApp] = useState<"gmail" | "outlook">("gmail");
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Load existing organization profile on mount
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

          // Compute suggested invoice prefix from firm name
          const initials = (org.name || "Medappa & Associates")
            .split(" ")
            .map((w) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();
          if (initials) setInvoicePrefix(initials);
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

  // Derived progress percentage & steps remaining
  const progressPercent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return 0;
      case 2:
        return 20;
      case 3:
        return 40;
      case 4:
        return 60;
      case 5:
        return 80;
      default:
        return 100;
    }
  }, [currentStep]);

  const stepsRemaining = useMemo(() => {
    return Math.max(0, 6 - currentStep);
  }, [currentStep]);

  // Derived business hours calculations
  const totalWeeklyHours = useMemo(() => {
    return schedules
      .filter((s) => s.enabled)
      .reduce((acc, curr) => acc + (curr.hours || 0), 0);
  }, [schedules]);

  const totalMonthlyHours = useMemo(() => {
    return Math.round(totalWeeklyHours * 4.333);
  }, [totalWeeklyHours]);

  // Handle saving Step 1: Organization Profile
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
        onboardingStep: 2,
      };

      await organizationApi.updateOrganization(payload);
      await refreshProfile();
      setSuccessNotice("Organization profile saved successfully.");
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save organization profile. Please try again.");
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
          terms: "Payment due within 15 days of invoice date.",
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
        onboardingStep: 3,
      };

      await organizationApi.updateOrganization(payload);
      setSuccessNotice("Bank account details saved successfully.");
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save bank account details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle final completion
  const handleFinalSubmit = async () => {
    setIsSaving(true);
    try {
      await organizationApi.updateOrganization({
        onboardingStep: 5,
        onboardingCompleted: true,
      });
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
          <div className="w-8 h-8 border-2 border-[#635BFF] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-muted)] font-medium">Loading profile details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--bg-app)] text-[var(--text-main)] p-4 sm:p-6 md:p-8 flex flex-col justify-between font-sans">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        {/* Top Progress Banner Card */}
        <OnboardingHeader
          businessName={businessName}
          progressPercent={progressPercent}
          stepsRemaining={stepsRemaining}
        />

        {/* Horizontal Stepper */}
        <OnboardingStepper
          currentStep={currentStep}
          onSelectStep={(stepId) => setCurrentStep(stepId)}
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

        {/* Active Step Content Container */}
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-6 sm:p-8 shadow-xs">
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

          {currentStep === 3 && (
            <InvoiceSettingsTab
              accountBusinessName={accountBusinessName}
              bankName={bankName}
              accountNumber={accountNumber}
              ifscCode={ifscCode}
              upiId={upiId}
              accountType={accountType}
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
              invoiceSignatureUrl={invoiceSignatureUrl}
              setInvoiceSignatureUrl={setInvoiceSignatureUrl}
              defaultInvoiceNote={defaultInvoiceNote}
              setDefaultInvoiceNote={setDefaultInvoiceNote}
              autoReminder={autoReminder}
              setAutoReminder={setAutoReminder}
              ccInvoiceMail={ccInvoiceMail}
              setCcInvoiceMail={setCcInvoiceMail}
              onPrevious={() => setCurrentStep(2)}
              onSkip={() => setCurrentStep(4)}
              onNext={() => setCurrentStep(4)}
            />
          )}

          {currentStep === 4 && (
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
              onPrevious={() => setCurrentStep(3)}
              onSkip={() => setCurrentStep(5)}
              onNext={() => setCurrentStep(5)}
            />
          )}

          {currentStep === 5 && (
            <IntegrationTab
              selectedApp={selectedApp}
              setSelectedApp={setSelectedApp}
              isGoogleConnected={isGoogleConnected}
              setIsGoogleConnected={setIsGoogleConnected}
              isSaving={isSaving}
              onPrevious={() => setCurrentStep(4)}
              onSkip={() => handleFinalSubmit()}
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
