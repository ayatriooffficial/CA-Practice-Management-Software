"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Smartphone, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { authService } from "./authService";
import { OtpInput } from "./OtpInput";
import { useAuth, computeInitials } from "./AuthContext";
import { User, AuthMode } from "./authTypes";

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [mode, setMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Check for prefilled email from signup redirection
  useEffect(() => {
    const prefillEmail = searchParams?.get("email");
    if (prefillEmail) {
      setEmail(prefillEmail);
      setMode("email");
      setSuccessNotice("Organization created successfully! Please enter your OTP to login.");
    }
  }, [searchParams]);

  // Email format validation
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Mobile format validation (10 digits starting with 6-9)
  const cleanMobile = mobile.replace(/\D/g, "");
  const isValidMobile = /^[6-9]\d{9}$/.test(cleanMobile);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const target = mode === "email" ? email.trim() : cleanMobile;
    if (!target) return;

    setIsSendingOtp(true);
    try {
      // Look up user in database
      const existing = await authService.lookupUser(target, mode);
      if (!existing) {
        setErrorMessage("Account not found. Please register first or verify your email/mobile.");
        return;
      }

      setPendingUser(existing);
      await authService.sendOtp(target, mode);
      setIsOtpStep(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    const target = mode === "email" ? email.trim() : cleanMobile;
    const res = await authService.verifyOtp(target, code);

    if (res.success && res.user) {
      login(res.user);
      setTimeout(() => {
        router.push("/");
      }, 700);
      return { success: true };
    }

    return {
      success: false,
      message: res.message || "Invalid OTP code. Please try again.",
    };
  };

  const handleResendOtp = async () => {
    const target = mode === "email" ? email.trim() : cleanMobile;
    await authService.sendOtp(target, mode);
  };

  const maskedTarget =
    mode === "email"
      ? email
      : `+91 ••••••${cleanMobile.slice(-4)}`;

  return (
    <div className="w-full">
      {/* Notice banner (e.g. from Signup redirection) */}
      {successNotice && (
        <div className="mb-5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Form Content */}
      {!isOtpStep ? (
        <form
          onSubmit={handleSendOtp}
          className={`flex flex-col ${errorMessage ? "gap-[20px]" : "gap-[28px]"}`}
        >
          {mode === "email" ? (
            /* Email Input */
            <div className="flex flex-col gap-[8px]">
              <label
                htmlFor="login-email"
                className="block text-[15px] font-medium text-[#374151] dark:text-gray-300"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Enter your email"
                  className="w-full h-[44px] pl-10 pr-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14.5px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
          ) : (
            /* Mobile Input */
            <div className="flex flex-col gap-[8px]">
              <label
                htmlFor="login-mobile"
                className="block text-[15px] font-medium text-[#374151] dark:text-gray-300"
              >
                Mobile Number
              </label>
              <div className="relative flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden focus-within:border-[#6d55f4] focus-within:ring-2 focus-within:ring-[#6d55f4]/20 transition-all shadow-2xs">
                <span className="inline-flex items-center px-3.5 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-[14.5px] font-medium text-gray-500 dark:text-gray-400">
                  +91
                </span>
                <input
                  id="login-mobile"
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, ""));
                    setErrorMessage(null);
                  }}
                  placeholder="9876543210"
                  className="w-full h-[44px] px-3.5 bg-transparent text-[14.5px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
          )}

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Link
                href="/signup"
                className="font-semibold text-[#6d55f4] hover:underline shrink-0"
              >
                Create Organization &rarr;
              </Link>
            </div>
          )}

          {/* Action Buttons: 20px gap between Get OTP and Toggle button */}
          <div className="flex flex-col gap-[20px]">
            {/* Get OTP Button */}
            <button
              type="submit"
              disabled={
                (mode === "email" ? !isValidEmail : !isValidMobile) || isSendingOtp
              }
              className={`w-full h-[47px] rounded-lg text-[14.5px] font-medium text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${(mode === "email" ? !isValidEmail : !isValidMobile) || isSendingOtp
                  ? "bg-[#b8b5fa] cursor-not-allowed"
                  : "bg-[#6d55f4] hover:bg-[#5b42e6] shadow-xs hover:shadow"
                }`}
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <span>Get OTP</span>
              )}
            </button>

            {/* Toggle between Email and Mobile Login */}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "email" ? "mobile" : "email");
                setErrorMessage(null);
              }}
              className="w-full h-[47px] rounded-lg border border-[#6d55f4] text-[#6d55f4] dark:text-[#8b79f6] dark:border-[#8b79f6] text-[14.5px] font-medium hover:bg-[#6d55f4]/5 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {mode === "email" ? (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>Login via Mobile</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Login via Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* OTP Step */
        <div className="flex flex-col gap-[24px]">
          <OtpInput
            targetDescription={maskedTarget}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
            onChangeTarget={() => {
              setIsOtpStep(false);
              setErrorMessage(null);
            }}
            targetLabel="Change"
          />
        </div>
      )}

      {/* Footer Link: 32px below buttons */}
      <div className="mt-[32px] text-center text-[14.5px] text-[#475569] dark:text-gray-400">
        New firm?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#6d55f4] hover:text-[#5841e2] hover:underline"
        >
          Create Organization
        </Link>
      </div>

      {/* Floating Demo Accounts Helper Pill (Unobtrusive) */}
      <aside aria-label="Demo credentials helper" className="fixed bottom-4 right-4 z-30 max-w-xs bg-white/95 dark:bg-gray-800/95 backdrop-blur-xs border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-[11px] text-gray-500">
        <span className="font-semibold text-gray-700 dark:text-gray-200 block mb-1">Quick-Fill:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEmail("sahanidipak777@gmail.com");
              setMode("email");
              setErrorMessage(null);
            }}
            className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[#6d55f4] hover:bg-purple-50 font-medium cursor-pointer"
          >
            Admin (Dipak)
          </button>
          <button
            type="button"
            onClick={() => {
              setMobile("8080014895");
              setMode("mobile");
              setErrorMessage(null);
            }}
            className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[#6d55f4] hover:bg-purple-50 font-medium cursor-pointer"
          >
            Mobile (8080014895)
          </button>
        </div>
      </aside>
    </div>
  );
};