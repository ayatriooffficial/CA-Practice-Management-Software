"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Building2,
  Check,
} from "lucide-react";
import { authService } from "./authService";
import { OtpInput } from "./OtpInput";

export const SignupForm: React.FC = () => {
  const router = useRouter();

  // Form inputs
  const [firmName, setFirmName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  // Email verification state
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Mobile verification state
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isVerifyingMobileOtp, setIsVerifyingMobileOtp] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);

  // Overall form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    conflictingFields: string[];
    message: string;
  } | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    firmName: string;
    name: string;
    email: string;
    mobile: string;
  } | null>(null);

  // Form validations
  const isValidEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const cleanMobile = mobile.replace(/\D/g, "");
  const isValidMobileFormat = /^[6-9]\d{9}$/.test(cleanMobile);

  const isFormComplete =
    firmName.trim().length > 0 &&
    name.trim().length > 0 &&
    isEmailVerified &&
    isMobileVerified;

  // Handle triggering email verification OTP
  const handleStartEmailVerify = async () => {
    if (!isValidEmailFormat || isEmailVerified) return;
    setEmailError(null);

    // Check 4-field conflicts for email
    const dupCheck = authService.checkOrganizationDuplicates({
      firmName,
      name,
      email,
      mobile: cleanMobile,
    });
    if (dupCheck.hasConflict && dupCheck.conflictingFields.includes("Email")) {
      setConflictModal({
        isOpen: true,
        conflictingFields: dupCheck.conflictingFields,
        message: dupCheck.message,
      });
      return;
    }

    await authService.sendOtp(email.trim(), "email");
    setIsVerifyingEmailOtp(true);
  };

  // Handle email OTP verification
  const handleVerifyEmailCode = async (code: string) => {
    const res = await authService.verifyOtp(email.trim(), code);
    if (res.success) {
      setIsEmailVerified(true);
      setIsVerifyingEmailOtp(false);
      setEmailError(null);
      return { success: true };
    }
    return { success: false, message: res.message };
  };

  // Handle triggering mobile verification OTP
  const handleStartMobileVerify = async () => {
    if (!isValidMobileFormat || isMobileVerified || !isEmailVerified) return;
    setMobileError(null);

    // Check 4-field conflicts for mobile
    const dupCheck = authService.checkOrganizationDuplicates({
      firmName,
      name,
      email,
      mobile: cleanMobile,
    });
    if (dupCheck.hasConflict && dupCheck.conflictingFields.includes("Contact Number")) {
      setConflictModal({
        isOpen: true,
        conflictingFields: dupCheck.conflictingFields,
        message: dupCheck.message,
      });
      return;
    }

    await authService.sendOtp(cleanMobile, "mobile");
    setIsVerifyingMobileOtp(true);
  };

  // Handle mobile OTP verification
  const handleVerifyMobileCode = async (code: string) => {
    const res = await authService.verifyOtp(cleanMobile, code);
    if (res.success) {
      setIsMobileVerified(true);
      setIsVerifyingMobileOtp(false);
      setMobileError(null);
      return { success: true };
    }
    return { success: false, message: res.message };
  };

  // Handle final registration submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // 4-field duplicate check (Person name, Org name, Contact number, Email)
    const dupCheck = authService.checkOrganizationDuplicates({
      firmName: firmName.trim(),
      name: name.trim(),
      email: email.trim(),
      mobile: cleanMobile,
    });

    if (dupCheck.hasConflict) {
      setConflictModal({
        isOpen: true,
        conflictingFields: dupCheck.conflictingFields,
        message: dupCheck.message,
      });
      return;
    }

    if (!isFormComplete || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const res = await authService.registerOrganization({
        firmName: firmName.trim(),
        name: name.trim(),
        email: email.trim(),
        mobile: cleanMobile,
      });

      if (res.success) {
        setConfirmationData({
          firmName: firmName.trim(),
          name: name.trim(),
          email: email.trim(),
          mobile: cleanMobile,
        });
      } else {
        if (res.conflictingFields && res.conflictingFields.length > 0) {
          setConflictModal({
            isOpen: true,
            conflictingFields: res.conflictingFields,
            message: res.message,
          });
        } else {
          setSubmitError(res.message);
        }
      }
    } catch {
      setSubmitError("Failed to register organization. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If organization registered, show confirmation step card
  if (confirmationData) {
    return (
      <div className="w-full bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center space-y-6 shadow-xs animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Registration Completed
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
            Organization Created!
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Your firm account is now ready. Continue to login with your verified email.
          </p>
        </div>

        {/* Firm Details Box */}
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 text-left border border-gray-200 dark:border-gray-700/60 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">Firm Name</span>
            <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#6d55f4]" />
              {confirmationData.firmName}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">Primary Contact</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {confirmationData.name}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">Verified Email</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {confirmationData.email} ✓
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Verified Mobile</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              +91 {confirmationData.mobile} ✓
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            router.push(`/login?email=${encodeURIComponent(confirmationData.email)}`);
          }}
          className="w-full h-11 rounded-lg text-sm font-semibold text-white bg-[#6d55f4] hover:bg-[#5b42e6] transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Continue to Login</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-[24px]">
      {/* 1. Firm Name Field */}
      <div className="flex flex-col gap-[8px]">
        <label
          htmlFor="signup-firm"
          className="block text-[15px] font-medium text-[#374151] dark:text-gray-300"
        >
          Firm Name <span className="text-red-500">*</span>
        </label>
        <input
          id="signup-firm"
          type="text"
          value={firmName}
          onChange={(e) => setFirmName(e.target.value)}
          placeholder="ABC & Associates"
          className="w-full h-[44px] px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14.5px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
          required
        />
      </div>

      {/* 2. Name Field */}
      <div className="flex flex-col gap-[8px]">
        <label
          htmlFor="signup-name"
          className="block text-[15px] font-medium text-[#374151] dark:text-gray-300"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          className="w-full h-[44px] px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14.5px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
          required
        />
      </div>

      {/* 3. Email Field with Verify Link / Verified Badge */}
      <div className="flex flex-col gap-[8px]">
        <label
          htmlFor="signup-email"
          className="block text-[15px] font-medium text-[#374151] dark:text-gray-300"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <div className="relative flex items-center">
          <input
            id="signup-email"
            type="email"
            value={email}
            disabled={isEmailVerified || isVerifyingEmailOtp}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
            placeholder="john.deo@gmail.com"
            className={`w-full h-[44px] pl-3.5 pr-24 rounded-lg border border-gray-200 dark:border-gray-700 text-[14.5px] placeholder-gray-400 focus:outline-hidden transition-all shadow-2xs ${
              isEmailVerified
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 text-gray-900 dark:text-white font-medium"
                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20"
            }`}
            required
          />

          {/* Right Action: Verify Link or Verified Badge */}
          <div className="absolute right-3.5 flex items-center">
            {isEmailVerified ? (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  Verified
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEmailVerified(false);
                    setIsVerifyingEmailOtp(false);
                    // Also lock mobile again if email is unverified
                    setIsMobileVerified(false);
                    setIsVerifyingMobileOtp(false);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline ml-1 cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!isValidEmailFormat || isVerifyingEmailOtp}
                onClick={handleStartEmailVerify}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-all cursor-pointer ${
                  isValidEmailFormat && !isVerifyingEmailOtp
                    ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 shadow-[0_0_10px_rgba(34,197,94,0.35)] animate-pulse"
                    : "text-[#a5a3f6] cursor-not-allowed"
                }`}
              >
                Verify
              </button>
            )}
          </div>
        </div>

        {/* Email error message */}
        {emailError && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{emailError}</span>
          </div>
        )}

        {/* Inline Email OTP verification panel */}
        {isVerifyingEmailOtp && !isEmailVerified && (
          <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
            <OtpInput
              targetDescription={email}
              isCompact
              onVerify={handleVerifyEmailCode}
              onResend={handleStartEmailVerify}
              onChangeTarget={() => setIsVerifyingEmailOtp(false)}
              targetLabel="Cancel"
            />
          </div>
        )}
      </div>

      {/* 4. Mobile Number Field (Locked until email verified) */}
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center justify-between">
          <label
            htmlFor="signup-mobile"
            className="block text-[15px] font-medium text-[#374151] dark:text-gray-300"
          >
            Mobile Number <span className="text-red-500">*</span>
          </label>
          {!isEmailVerified && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
              <Lock className="w-3 h-3" />
              Verify your email first
            </span>
          )}
        </div>

        <div
          className={`relative flex items-center rounded-lg border transition-all shadow-2xs ${
            !isEmailVerified
              ? "bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed"
              : isMobileVerified
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 text-gray-900 dark:text-white font-medium"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-within:border-[#6d55f4] focus-within:ring-2 focus-within:ring-[#6d55f4]/20"
          }`}
        >
          <span className="inline-flex items-center px-3.5 border-r border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80 text-[14.5px] font-medium text-gray-500 dark:text-gray-400">
            +91
          </span>
          <input
            id="signup-mobile"
            type="tel"
            maxLength={10}
            disabled={!isEmailVerified || isMobileVerified || isVerifyingMobileOtp}
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value.replace(/\D/g, ""));
              setMobileError(null);
            }}
            placeholder="9876543210"
            className="w-full h-[44px] pl-3.5 pr-24 bg-transparent text-[14.5px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden"
            required
          />

          {/* Right Action: Verify Link or Verified Badge */}
          {isEmailVerified && (
            <div className="absolute right-3.5 flex items-center">
              {isMobileVerified ? (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    Verified
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileVerified(false);
                      setIsVerifyingMobileOtp(false);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline ml-1 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!isValidMobileFormat || isVerifyingMobileOtp}
                  onClick={handleStartMobileVerify}
                  className={`text-xs font-semibold px-2.5 py-1 rounded transition-all cursor-pointer ${
                    isValidMobileFormat && !isVerifyingMobileOtp
                      ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 shadow-[0_0_10px_rgba(34,197,94,0.35)] animate-pulse"
                      : "text-[#a5a3f6] cursor-not-allowed"
                  }`}
                >
                  Verify
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile error message */}
        {mobileError && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{mobileError}</span>
          </div>
        )}

        {/* Inline Mobile OTP verification panel */}
        {isVerifyingMobileOtp && !isMobileVerified && (
          <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
            <OtpInput
              targetDescription={`+91 ${cleanMobile}`}
              isCompact
              onVerify={handleVerifyMobileCode}
              onResend={handleStartMobileVerify}
              onChangeTarget={() => setIsVerifyingMobileOtp(false)}
              targetLabel="Cancel"
            />
          </div>
        )}
      </div>

      {/* Global submission error */}
      {submitError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Submit Button aligned to RIGHT: 30px from mobile input, 47px height */}
      <div className="mt-[30px] flex justify-end">
        <button
          type="submit"
          disabled={!isFormComplete || isSubmitting}
          className={`px-8 h-[47px] rounded-lg text-[14.5px] font-medium text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${
            !isFormComplete || isSubmitting
              ? "bg-[#b8b5fa] cursor-not-allowed"
              : "bg-[#6d55f4] hover:bg-[#5b42e6] shadow-xs hover:shadow"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <span>Submit</span>
          )}
        </button>
      </div>

      {/* Footer Link: exactly 32px below Submit */}
      <div className="mt-[32px] text-center text-[14.5px] text-[#475569] dark:text-gray-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#6d55f4] hover:text-[#5841e2] hover:underline"
        >
          Login
        </Link>
      </div>

      {/* Duplicate Conflict Message Box / Modal */}
      {conflictModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Account Details Already In Use
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                {conflictModal.message}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 py-1">
              {conflictModal.conflictingFields.map((f) => (
                <span
                  key={f}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  {f}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                Edit Information
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6d55f4] hover:bg-[#5b42e6] rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
