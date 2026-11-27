"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Mail,
  Building2,
  Phone,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authService } from "./authService";
import { useAuth } from "./AuthContext";
import { navigationProgress } from "@/services/navigationProgress";

type SignupMode = "employment" | "organization";

export const SignupForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  // Mode selection: "employment" (request to join) or "organization" (create new firm)
  const initialMode = searchParams?.get("mode") === "register" || searchParams?.get("mode") === "org" ? "organization" : "employment";
  const [mode, setMode] = useState<SignupMode>(initialMode);

  // Form inputs
  const [firmName, setFirmName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Pre-fill email from query param if available
  useEffect(() => {
    const qEmail = searchParams?.get("email");
    if (qEmail) {
      setEmail(qEmail);
    }
  }, [searchParams]);

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
    mode === "organization"
      ? firmName.trim().length >= 2 &&
        name.trim().length > 0 &&
        isValidEmailFormat &&
        mobile.trim().length >= 10 &&
        isValidPassword &&
        passwordsMatch
      : name.trim().length > 0 &&
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
    navigationProgress.start("/signup", { immediate: true, force: true });
    navigationProgress.setLoading("signup_submit", true);

    try {
      if (mode === "organization") {
        const res = await authService.registerOrganization({
          firmName: firmName.trim(),
          name: name.trim(),
          email: cleanEmail,
          mobile: mobile.trim(),
          password: password.trim(),
        });

        if (res.success && res.user) {
          login(res.user);
          navigationProgress.setLoading("signup_submit", false);
          router.push("/");
          return;
        } else {
          setSubmitError(res.message || "Failed to register organization.");
        }
      } else {
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
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
      navigationProgress.setLoading("signup_submit", false);
      navigationProgress.forceFinish();
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

        <Button
          type="button"
          onClick={() => {
            router.push(`/login?email=${encodeURIComponent(confirmationData.email)}`);
          }}
          className="w-full h-11 rounded-lg text-sm font-semibold text-white bg-[#3D6A9E] hover:bg-[#3D6A9E] transition-all shadow-sm hover:shadow justify-center text-center"
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-[18px]">
      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl text-xs font-medium border border-gray-200/80 dark:border-gray-700/80">
        <button
          type="button"
          onClick={() => {
            setMode("employment");
            setSubmitError(null);
          }}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mode === "employment"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold shadow-xs"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Join Practice</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("organization");
            setSubmitError(null);
          }}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mode === "organization"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold shadow-xs"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Register Firm</span>
        </button>
      </div>

      {/* Firm Name Field (for Organization Registration) */}
      {mode === "organization" && (
        <Input
          id="signup-firm-name"
          type="text"
          label="CA Firm / Organization Name"
          value={firmName}
          onChange={(e) => {
            setFirmName(e.target.value);
            setSubmitError(null);
          }}
          placeholder="e.g. Jain & Associates Chartered Accountants"
          leftIcon={<Building2 className="w-4 h-4" />}
          className="h-[44px] text-[14px] rounded-lg"
          required
        />
      )}

      {/* Name Field */}
      <Input
        id="signup-name"
        type="text"
        label={mode === "organization" ? "Principal / Partner Name" : "Full Name"}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSubmitError(null);
        }}
        placeholder="e.g. John Doe"
        leftIcon={<User className="w-4 h-4" />}
        className="h-[44px] text-[14px] rounded-lg"
        required
      />

      {/* Email Field */}
      <Input
        id="signup-email"
        type="email"
        label="Work Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setSubmitError(null);
        }}
        placeholder="name@example.com"
        leftIcon={<Mail className="w-4 h-4" />}
        className="h-[44px] text-[14px] rounded-lg"
        required
      />

      {/* Mobile Field (for Organization Registration) */}
      {mode === "organization" && (
        <Input
          id="signup-mobile"
          type="tel"
          label="Mobile Number (10 digits)"
          value={mobile}
          onChange={(e) => {
            setMobile(e.target.value);
            setSubmitError(null);
          }}
          placeholder="e.g. 9876543210"
          leftIcon={<Phone className="w-4 h-4" />}
          className="h-[44px] text-[14px] rounded-lg"
          required
        />
      )}

      {/* Password Field */}
      <Input
        id="signup-password"
        type="password"
        label="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setSubmitError(null);
        }}
        placeholder="Min. 6 characters"
        leftIcon={<Lock className="w-4 h-4" />}
        className="h-[44px] text-[14px] rounded-lg"
        required
      />

      {/* Confirm Password Field */}
      <Input
        id="signup-confirm-password"
        type="password"
        label="Confirm Password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          setSubmitError(null);
        }}
        placeholder="Re-enter your password"
        leftIcon={<Lock className="w-4 h-4" />}
        error={confirmPassword && !passwordsMatch ? "Passwords do not match" : undefined}
        className="h-[44px] text-[14px] rounded-lg"
        required
      />

      {/* Global Error Banner */}
      {submitError && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Submit Action */}
      <Button
        type="submit"
        disabled={!isFormComplete || isSubmitting}
        loading={isSubmitting}
        rightIcon={<ArrowRight className="w-4 h-4 ml-0.5" />}
        className="w-full h-[46px] rounded-lg text-[14.5px] font-medium text-white shadow-xs bg-[#3D6A9E] hover:bg-[#3D6A9E] justify-center text-center"
      >
        {mode === "organization" ? "Register Practice Workspace" : "Request Employment"}
      </Button>

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
