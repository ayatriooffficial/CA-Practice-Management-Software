"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Smartphone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { authService } from "./authService";
import { OtpInput } from "./OtpInput";
import { useAuth, computeInitials } from "./AuthContext";
import { User, AuthMode } from "./authTypes";
import {
  getDeviceCredential,
  listVerifiedAccounts,
  StoredCredential,
} from "../../services/deviceCredential";

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [mode, setMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Stored verified accounts on this browser
  const [savedAccounts, setSavedAccounts] = useState<StoredCredential[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setSavedAccounts(listVerifiedAccounts());
  }, []);

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
  const cleanEmail = email.trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // Mobile format validation (10 digits starting with 6-9)
  const cleanMobile = mobile.replace(/\D/g, "");
  const isValidMobile = /^[6-9]\d{9}$/.test(cleanMobile);

  // Check if current entered email is already verified on this device
  const verifiedCredential = useMemo(() => {
    if (!isMounted || mode !== "email" || !cleanEmail || !isValidEmail) return null;
    return getDeviceCredential(cleanEmail);
  }, [isMounted, mode, cleanEmail, isValidEmail]);

  const isVerifiedOnDevice = !!verifiedCredential;

  // Handle Form Submission: Passwordless Device Login for returning users, or OTP for first-time
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (mode === "email") {
      if (!isValidEmail) return;

      // Returning User: Authenticate with verified device token without requesting OTP
      if (isVerifiedOnDevice) {
        setIsLoading(true);
        try {
          const res = await authService.loginWithDevice(cleanEmail);
          if (res.success && res.user) {
            setSuccessNotice(`Welcome back, ${res.user.name}!`);
            login(res.user);
            setTimeout(() => {
              router.push("/");
            }, 600);
            return;
          }
          // If device token was revoked or expired, gracefully fall back to OTP
          setErrorMessage(res.message || "Device session expired. Please verify with OTP.");
          await triggerSendOtp();
        } catch (err: any) {
          setErrorMessage(err.message || "Authentication failed. Sending verification OTP...");
          await triggerSendOtp();
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // First-time login / New Gmail address: Trigger OTP verification
      await triggerSendOtp();
    } else {
      // Mobile Login: Standard OTP
      if (!isValidMobile) return;
      await triggerSendOtp();
    }
  };

  const triggerSendOtp = async () => {
    const target = mode === "email" ? cleanEmail : cleanMobile;
    if (!target) return;

    setIsLoading(true);
    try {
      // Look up user if exists (optional check)
      const existing = await authService.lookupUser(target, mode);
      if (existing) {
        setPendingUser(existing);
      }

      await authService.sendOtp(target, mode);
      setIsOtpStep(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to send verification OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    const target = mode === "email" ? cleanEmail : cleanMobile;
    const res = await authService.verifyOtp(target, code);

    if (res.success && res.user) {
      setSavedAccounts(listVerifiedAccounts());
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
    const target = mode === "email" ? cleanEmail : cleanMobile;
    await authService.sendOtp(target, mode);
  };

  const handleSelectSavedAccount = async (account: StoredCredential) => {
    setMode("email");
    setEmail(account.email);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authService.loginWithDevice(account.email);
      if (res.success && res.user) {
        setSuccessNotice(`Welcome back, ${res.user.name}!`);
        login(res.user);
        setTimeout(() => {
          router.push("/");
        }, 500);
        return;
      }
      setErrorMessage("Device verification expired for this account. Please verify with OTP.");
      await triggerSendOtp();
    } catch {
      await triggerSendOtp();
    } finally {
      setIsLoading(false);
    }
  };

  const maskedTarget =
    mode === "email"
      ? cleanEmail
      : `+91 ••••••${cleanMobile.slice(-4)}`;

  return (
    <div className="w-full">
      {/* Success banner */}
      {successNotice && (
        <div className="mb-5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Form Content */}
      {!isOtpStep ? (
        <div className="flex flex-col gap-[24px]">
          {/* Multi-Account Quick Switcher (if returning verified accounts exist) */}
          {isMounted && savedAccounts.length > 0 && mode === "email" && (
            <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-gray-800/60 border border-purple-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Accounts on this Device
                </span>
                <span className="text-[10px] text-gray-400">Passwordless</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {savedAccounts.slice(0, 3).map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectSavedAccount(acc)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 hover:border-[#6d55f4] dark:hover:border-[#6d55f4] hover:shadow-2xs transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#6d55f4] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {acc.name ? computeInitials(acc.name) : "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#6d55f4]">
                          {acc.name || acc.email}
                        </div>
                        <div className="text-[10.5px] text-gray-500 truncate">
                          {acc.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {acc.role && (
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {acc.role}
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#6d55f4] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`flex flex-col ${errorMessage ? "gap-[18px]" : "gap-[24px]"}`}
          >
            {mode === "email" ? (
              /* Email Input */
              <div className="flex flex-col gap-[8px]">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-email"
                    className="block text-[15px] font-medium text-[#374151] dark:text-gray-300"
                  >
                    Email Address
                  </label>
                  {isVerifiedOnDevice && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Device
                    </span>
                  )}
                </div>

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
                    placeholder="name@company.com or Gmail"
                    className="w-full h-[44px] pl-10 pr-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14.5px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
                    autoComplete="email"
                    required
                  />
                </div>

                {/* Subtext info for device authorization */}
                <p className="text-[11.5px] text-gray-500 dark:text-gray-400">
                  {isVerifiedOnDevice
                    ? "✓ You have verified this email on this device. Sign in directly without OTP."
                    : "First time with this email? You will verify via OTP once to remember this device."}
                </p>
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
                  Register &rarr;
                </Link>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-[14px]">
              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={
                  (mode === "email" ? !isValidEmail : !isValidMobile) || isLoading
                }
                className={`w-full h-[47px] rounded-lg text-[14.5px] font-medium text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${(mode === "email" ? !isValidEmail : !isValidMobile) || isLoading
                    ? "bg-[#b8b5fa] cursor-not-allowed"
                    : isVerifiedOnDevice
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-xs hover:shadow"
                    : "bg-[#6d55f4] hover:bg-[#5b42e6] shadow-xs hover:shadow"
                  }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : isVerifiedOnDevice ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Sign In (Passwordless)</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Get Verification OTP</span>
                  </>
                )}
              </button>

              {/* Secondary Option: Verify with OTP even if verified */}
              {isVerifiedOnDevice && (
                <button
                  type="button"
                  onClick={triggerSendOtp}
                  disabled={isLoading}
                  className="text-xs text-gray-500 hover:text-[#6d55f4] dark:hover:text-[#8b79f6] text-center font-medium cursor-pointer"
                >
                  Or sign in with a new OTP code &rarr;
                </button>
              )}

              {/* Toggle between Email and Mobile Login */}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "email" ? "mobile" : "email");
                  setErrorMessage(null);
                }}
                className="w-full h-[44px] rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[14px] font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {mode === "email" ? (
                  <>
                    <Smartphone className="w-4 h-4 text-gray-500" />
                    <span>Login via Mobile</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>Login via Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
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

      {/* Footer Link */}
      <div className="mt-[28px] text-center text-[14px] text-[#475569] dark:text-gray-400">
        New firm?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#6d55f4] hover:text-[#5841e2] hover:underline"
        >
          Create Organization
        </Link>
      </div>

      {/* Quick-Fill Helpers for testing */}
      <aside
        aria-label="Demo credentials helper"
        className="fixed bottom-4 right-4 z-30 max-w-xs bg-white/95 dark:bg-gray-800/95 backdrop-blur-xs border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-[11px] text-gray-500"
      >
        <span className="font-semibold text-gray-700 dark:text-gray-200 block mb-1">
          Quick-Fill:
        </span>
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
              setEmail("vikram@ayatrio.com");
              setMode("email");
              setErrorMessage(null);
            }}
            className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[#6d55f4] hover:bg-purple-50 font-medium cursor-pointer"
          >
            Employee (Vikram)
          </button>
        </div>
      </aside>
    </div>
  );
};