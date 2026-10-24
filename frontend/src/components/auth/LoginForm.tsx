"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { authService } from "./authService";
import { useAuth } from "./AuthContext";

type LoginStep = "email" | "password";

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, login, workdaySession, resumeWorkdaySession } = useAuth();

  useEffect(() => {
    if (currentUser) {
      router.push("/");
    }
  }, [currentUser, router]);

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUserNotFound, setIsUserNotFound] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Check for prefilled email from signup redirection or active workday session on this device
  useEffect(() => {
    const prefillEmail = searchParams?.get("email");
    if (prefillEmail) {
      setEmail(prefillEmail);
    } else if (workdaySession?.user?.email) {
      setEmail(workdaySession.user.email);
    }
  }, [searchParams, workdaySession]);

  // Focus password input when advancing to password step
  useEffect(() => {
    if (step === "password") {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const cleanEmail = email.trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // Active workday session exists on this device/browser for this email
  const isWorkdayMatched = Boolean(
    workdaySession?.user &&
    cleanEmail === workdaySession.user.email.toLowerCase()
  );

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsUserNotFound(false);

    if (!isValidEmail) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    // If an active workday session exists for this email on this device, log in immediately without asking password!
    if (isWorkdayMatched) {
      setIsLoading(true);
      try {
        const success = resumeWorkdaySession();
        if (success) {
          router.push("/");
          return;
        }
      } finally {
        setIsLoading(false);
      }
    }

    // New session on this device/browser: proceed to password page
    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsUserNotFound(false);

    if (!password.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const res = await authService.loginWithPassword(cleanEmail, password);

      if (res.success && res.user) {
        login(res.user);
        router.push("/");
        return;
      }

      if (res.notFound) {
        setIsUserNotFound(true);
        setErrorMessage("No account found with this email. Please verify your email or create an organization.");
      } else {
        setErrorMessage(res.message || "Incorrect password. Please verify and try again.");
      }
    } catch (err: any) {
      const msg = err?.message || "";
      const notFound =
        err?.statusCode === 404 ||
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("no account found");

      if (notFound) {
        setIsUserNotFound(true);
        setErrorMessage("No account found with this email. Please check your email or create a new organization.");
      } else {
        setErrorMessage(msg || "Unable to sign in. Please check your credentials and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-[22px]">
        {/* Step 1: Email View */}
        {step === "email" && (
          <div className="flex flex-col gap-[22px] animate-fadeIn">
            {/* Header */}
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                Sign In to CA Practice
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Enter your registered work email to access your firm workspace.
              </p>
            </div>

            <form
              onSubmit={handleEmailSubmit}
              className={`flex flex-col ${errorMessage ? "gap-[16px]" : "gap-[20px]"}`}
            >
              {/* Email Input */}
              <div className="flex flex-col gap-[7px]">
                <label
                  htmlFor="login-email"
                  className="block text-[14px] font-medium text-gray-700 dark:text-gray-300"
                >
                  Work Email Address
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
                      setIsUserNotFound(false);
                    }}
                    placeholder="name@firm.com or Gmail"
                    className="w-full h-[44px] pl-10 pr-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Status helper when session exists */}
              {isWorkdayMatched && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Active session recognized on this device. You can log in directly without entering your password.
                  </span>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Button: "Log In" if session exists, "Enter Password" if new session */}
              <div className="flex flex-col gap-[12px]">
                <button
                  type="submit"
                  disabled={!isValidEmail || isLoading}
                  className={`w-full h-[46px] rounded-lg text-[14.5px] font-medium text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                    !isValidEmail || isLoading
                      ? "bg-[#b8b5fa] cursor-not-allowed"
                      : "bg-[#6d55f4] hover:bg-[#5b42e6] hover:shadow"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Logging In...</span>
                    </>
                  ) : isWorkdayMatched ? (
                    <>
                      <span>Log In</span>
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </>
                  ) : (
                    <>
                      <span>Enter Password</span>
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Password View */}
        {step === "password" && (
          <div className="flex flex-col gap-[22px] animate-fadeIn">
            {/* Header */}
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                Enter Password
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Enter your password to sign in to your workspace.
              </p>
            </div>

            {/* Email Pill with Change option */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-xs">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate pr-2">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="font-medium truncate">{cleanEmail}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setPassword("");
                  setErrorMessage(null);
                  setIsUserNotFound(false);
                }}
                className="text-xs font-semibold text-[#6d55f4] hover:text-[#5841e2] hover:underline cursor-pointer shrink-0"
              >
                Change
              </button>
            </div>

            <form
              onSubmit={handlePasswordSubmit}
              className={`flex flex-col ${errorMessage ? "gap-[16px]" : "gap-[20px]"}`}
            >
              {/* Password Input */}
              <div className="flex flex-col gap-[7px]">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-[14px] font-medium text-gray-700 dark:text-gray-300"
                  >
                    Password
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    ref={passwordInputRef}
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                      setIsUserNotFound(false);
                    }}
                    placeholder="Enter your password"
                    className="w-full h-[44px] pl-10 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* User Not Found Prompt to Create Org */}
              {isUserNotFound && (
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-col gap-2.5 animate-fadeIn">
                  <div className="flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200 font-medium">
                    <Building2 className="w-4 h-4 text-[#6d55f4] shrink-0 mt-0.5" />
                    <span>
                      No firm or user is registered with <strong>{cleanEmail}</strong>. Would you like to create your firm workspace?
                    </span>
                  </div>
                  <Link
                    href={`/signup?email=${encodeURIComponent(cleanEmail)}`}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#6d55f4] hover:bg-[#5b42e6] rounded-lg text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <span>Create Organization</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Standard Error Message */}
              {errorMessage && !isUserNotFound && (
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-[10px]">
                <button
                  type="submit"
                  disabled={!password.trim() || isLoading}
                  className={`w-full h-[46px] rounded-lg text-[14.5px] font-medium text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                    !password.trim() || isLoading
                      ? "bg-[#b8b5fa] cursor-not-allowed"
                      : "bg-[#6d55f4] hover:bg-[#5b42e6] hover:shadow"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setErrorMessage(null);
                    setIsUserNotFound(false);
                  }}
                  className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Email</span>
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 text-center flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Persistent session keeps you logged in securely throughout the workday</span>
        </div>
      </div>

      {/* Footer Link */}
      <div className="mt-[24px] text-center text-[13.5px] text-[#475569] dark:text-gray-400">
        New firm?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#6d55f4] hover:text-[#5841e2] hover:underline"
        >
          Create Organization
        </Link>
      </div>
    </div>
  );
};