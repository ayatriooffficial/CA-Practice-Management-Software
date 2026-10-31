"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  User,
  Mail,
} from "lucide-react";
import { authService } from "./authService";

export const SignupForm: React.FC = () => {
  const router = useRouter();

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    name: string;
    email: string;
  } | null>(null);

  // Validations
  const cleanEmail = email.trim().toLowerCase();
  const isValidEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const isValidPassword = password.length >= 6;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isFormComplete =
    name.trim().length > 0 &&
    isValidEmailFormat &&
    isValidPassword &&
    passwordsMatch;

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

    if (!isFormComplete || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const res = await authService.requestEmployment({
        name: name.trim(),
        email: cleanEmail,
        password: password.trim(),
      });

      if (res.success) {
        setConfirmationData({
          name: name.trim(),
          email: cleanEmail,
        });
      } else {
        setSubmitError(res.message);
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit employment request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If request submitted, show confirmation card
  if (confirmationData) {
    return (
      <div className="w-full bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center space-y-6 shadow-xs animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Request Submitted
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
            Employment Request Sent!
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
            Your employment request has been sent to the administrator. You can sign in with your email and password to track the status of your request.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 text-left border border-gray-200 dark:border-gray-700/60 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">Applicant Name</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {confirmationData.name}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Email Address</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {confirmationData.email}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            router.push(`/login?email=${encodeURIComponent(confirmationData.email)}`);
          }}
          className="w-full h-11 rounded-lg text-sm font-semibold text-white bg-[#3D6A9E] hover:bg-[#3D6A9E] transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Go to Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-[20px]">
      {/* 1. Name Field */}
      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="signup-name"
          className="block text-[14px] font-medium text-[#374151] dark:text-gray-300"
        >
          Full Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <User className="w-4 h-4" />
          </div>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSubmitError(null);
            }}
            placeholder="e.g. John Doe"
            className="w-full h-[44px] pl-10 pr-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#3D6A9E] focus:ring-2 focus:ring-[#3D6A9E]/20 transition-all shadow-2xs"
            required
          />
        </div>
      </div>

      {/* 2. Email Field */}
      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="signup-email"
          className="block text-[14px] font-medium text-[#374151] dark:text-gray-300"
        >
          Work Email <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Mail className="w-4 h-4" />
          </div>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSubmitError(null);
            }}
            placeholder="name@example.com"
            className="w-full h-[44px] pl-10 pr-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#3D6A9E] focus:ring-2 focus:ring-[#3D6A9E]/20 transition-all shadow-2xs"
            required
          />
        </div>
      </div>

      {/* 3. Password Field */}
      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="signup-password"
          className="block text-[14px] font-medium text-[#374151] dark:text-gray-300"
        >
          Password <span className="text-red-500">*</span>
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
            className="w-full h-[44px] pl-10 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#3D6A9E] focus:ring-2 focus:ring-[#3D6A9E]/20 transition-all shadow-2xs"
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

      {/* 4. Confirm Password Field */}
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
            className={`w-full h-[44px] pl-10 pr-10 rounded-lg border text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden transition-all shadow-2xs ${confirmPassword && !passwordsMatch
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-white dark:bg-gray-800"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-[#3D6A9E] focus:ring-2 focus:ring-[#3D6A9E]/20"
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
        className={`w-full h-[46px] rounded-lg text-[14.5px] font-medium text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${!isFormComplete || isSubmitting
          ? "bg-[#3D6A9E] cursor-not-allowed"
          : "bg-[#3D6A9E] hover:bg-[#5b42e6] hover:shadow"
          }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Submitting Request...</span>
          </>
        ) : (
          <span>Request Employment</span>
        )}
      </button>

      {/* Switch to Login Link */}
      <div className="text-center text-[13.5px] text-[#475569] dark:text-gray-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#3D6A9E] hover:text-[#3D6A9E] hover:underline"
        >
          Sign In
        </Link>
      </div>
    </form>
  );
};
