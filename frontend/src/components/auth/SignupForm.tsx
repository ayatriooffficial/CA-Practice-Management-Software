"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { authService } from "./authService";

export const SignupForm: React.FC = () => {
  const router = useRouter();

  // Form inputs
  const [firmName, setFirmName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  const cleanEmail = email.trim().toLowerCase();
  const isValidEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const cleanMobile = mobile.replace(/\D/g, "");
  const isValidMobileFormat = /^[6-9]\d{9}$/.test(cleanMobile);
  const isValidPassword = password.length >= 6;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isFormComplete =
    firmName.trim().length > 0 &&
    name.trim().length > 0 &&
    isValidEmailFormat &&
    isValidMobileFormat &&
    isValidPassword &&
    passwordsMatch;

  // Handle final registration submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match. Please verify.");
      return;
    }

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters.");
      return;
    }

    // 4-field duplicate check (Person name, Org name, Contact number, Email)
    const dupCheck = authService.checkOrganizationDuplicates({
      firmName: firmName.trim(),
      name: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password,
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
        email: cleanEmail,
        mobile: cleanMobile,
        password: password.trim(),
      });

      if (res.success) {
        setConfirmationData({
          firmName: firmName.trim(),
          name: name.trim(),
          email: cleanEmail,
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
            Your firm workspace and administrator account are ready. Sign in with your email and password.
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
            <span className="text-gray-500">Registered Email</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {confirmationData.email}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Contact Number</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              +91 {confirmationData.mobile}
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
          <span>Sign In to Your Workspace</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-[20px]">
      {/* 1. Firm Name Field */}
      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="signup-firm"
          className="block text-[14px] font-medium text-[#374151] dark:text-gray-300"
        >
          Firm Name <span className="text-red-500">*</span>
        </label>
        <input
          id="signup-firm"
          type="text"
          value={firmName}
          onChange={(e) => setFirmName(e.target.value)}
          placeholder="ABC & Associates"
          className="w-full h-[44px] px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
          required
        />
      </div>

      {/* 2. Contact Name Field */}
      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="signup-name"
          className="block text-[14px] font-medium text-[#374151] dark:text-gray-300"
        >
          Contact Person Name <span className="text-red-500">*</span>
        </label>
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CA John Doe"
          className="w-full h-[44px] px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
          required
        />
      </div>

      {/* 3. Email Field */}
      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="signup-email"
          className="block text-[14px] font-medium text-[#374151] dark:text-gray-300"
        >
          Work Email <span className="text-red-500">*</span>
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSubmitError(null);
          }}
          placeholder="name@firm.com or Gmail"
          className="w-full h-[44px] px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
          required
        />
      </div>

      {/* 4. Mobile Number Field */}
      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="signup-mobile"
          className="block text-[14px] font-medium text-[#374151] dark:text-gray-300"
        >
          Mobile Number <span className="text-red-500">*</span>
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-gray-400 font-medium text-[14px] select-none">
            +91
          </span>
          <input
            id="signup-mobile"
            type="tel"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            placeholder="9876543210"
            className="w-full h-[44px] pl-12 pr-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
            required
          />
        </div>
      </div>

      {/* 5. Password Field */}
      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="signup-password"
          className="block text-[14px] font-medium text-[#374151] dark:text-gray-300"
        >
          Create Password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setSubmitError(null);
            }}
            placeholder="Min. 6 characters"
            className="w-full h-[44px] pl-10 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 6. Confirm Password Field */}
      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="signup-confirm-password"
          className="block text-[14px] font-medium text-[#374151] dark:text-gray-300"
        >
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="signup-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setSubmitError(null);
            }}
            placeholder="Re-enter your password"
            className={`w-full h-[44px] pl-10 pr-10 rounded-lg border text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden transition-all shadow-2xs ${
              confirmPassword && !passwordsMatch
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-white dark:bg-gray-800"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20"
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmPassword && !passwordsMatch && (
          <p className="text-[12px] text-red-500 mt-0.5">Passwords do not match</p>
        )}
      </div>

      {/* Global Error Banner */}
      {submitError && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Submit Action */}
      <button
        type="submit"
        disabled={!isFormComplete || isSubmitting}
        className={`w-full h-[46px] rounded-lg text-[14.5px] font-medium text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
          !isFormComplete || isSubmitting
            ? "bg-[#b8b5fa] cursor-not-allowed"
            : "bg-[#6d55f4] hover:bg-[#5b42e6] hover:shadow"
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating Organization...</span>
          </>
        ) : (
          <span>Create Organization</span>
        )}
      </button>

      {/* Switch to Login Link */}
      <div className="text-center text-[13.5px] text-[#475569] dark:text-gray-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#6d55f4] hover:text-[#5841e2] hover:underline"
        >
          Sign In
        </Link>
      </div>

      {/* Conflict Modal */}
      {conflictModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Account Conflict
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Existing details detected in system
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {conflictModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                Change Details
              </button>
              <Link
                href={`/login?email=${encodeURIComponent(cleanEmail)}`}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6d55f4] hover:bg-[#5b42e6] rounded-lg transition-colors shadow-xs"
              >
                Sign In Instead
              </Link>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
