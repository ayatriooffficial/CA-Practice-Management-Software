"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Send,
} from "lucide-react";
import { authService } from "./authService";
import { OtpInput } from "./OtpInput";
import { useAuth } from "./AuthContext";
import { getDeviceCredential } from "../../services/deviceCredential";

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, switchToUser } = useAuth();

  const [email, setEmail] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check for prefilled email from signup redirection
  useEffect(() => {
    const prefillEmail = searchParams?.get("email");
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [searchParams]);

  // Email format validation
  const cleanEmail = email.trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // Check if current entered email is already verified on this device
  const verifiedCredential = useMemo(() => {
    if (!isMounted || !cleanEmail || !isValidEmail) return null;
    return getDeviceCredential(cleanEmail);
  }, [isMounted, cleanEmail, isValidEmail]);

  const isVerifiedOnDevice = !!verifiedCredential;

  const triggerSendOtp = async () => {
    if (!cleanEmail || !isValidEmail) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.sendOtp(cleanEmail, "email");
      setIsOtpStep(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to send verification email. Please check your email and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Form Submission: Passwordless Device Login for returning users, or OTP for first-time
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!isValidEmail) return;

    // Returning User: Authenticate with verified device token without requesting OTP
    if (isVerifiedOnDevice) {
      setIsLoading(true);
      try {
        const res = await authService.loginWithDevice(cleanEmail);
        if (res.success && res.user) {
          login(res.user);
          router.push("/");
          return;
        }
        // If device token was revoked or expired, fall back to email OTP
        setErrorMessage(res.message || "Device session expired. Sending a new verification code...");
        await triggerSendOtp();
      } catch (err: any) {
        setErrorMessage(err.message || "Sending verification code...");
        await triggerSendOtp();
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // First-time login on this device: Trigger Email OTP
    await triggerSendOtp();
  };

  const handleVerifyOtp = async (code: string) => {
    const res = await authService.verifyOtp(cleanEmail, code);

    if (res.success && res.user) {
      login(res.user);
      setTimeout(() => {
        router.push("/");
      }, 500);
      return { success: true };
    }

    return {
      success: false,
      message: res.message || "Invalid or expired verification code. Please try again.",
    };
  };

  const handleResendOtp = async () => {
    await authService.sendOtp(cleanEmail, "email");
  };

  return (
    <div className="w-full">
      {/* Main Form Content */}
      {!isOtpStep ? (
        <div className="flex flex-col gap-[22px]">
          {/* Header */}
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Sign In to CA Practice
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Enter your work email address. We will send a secure verification code to your inbox.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
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
                  }}
                  placeholder="name@firm.com or Gmail"
                  className="w-full h-[44px] pl-10 pr-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/20 transition-all shadow-2xs"
                  autoComplete="email"
                  required
                />
              </div>

              {isVerifiedOnDevice && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Trusted device recognized &bull; Instant passwordless sign-in</span>
                </div>
              )}
            </div>

            {/* Inline Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center justify-between gap-2">
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
                    <span>Please wait...</span>
                  </>
                ) : isVerifiedOnDevice ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Instant Sign In</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 text-center flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Persistent session remains active for 60 days on this device</span>
          </div>
        </div>
      ) : (
        /* OTP Step */
        <div className="flex flex-col gap-[22px]">
          <OtpInput
            targetDescription={cleanEmail}
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