"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Lock, Check } from "lucide-react";

export interface IntegrationTabProps {
  selectedApp: "gmail" | "outlook";
  setSelectedApp: (val: "gmail" | "outlook") => void;
  isGoogleConnected: boolean;
  setIsGoogleConnected: (val: boolean) => void;
  isSaving: boolean;
  onPrevious: () => void;
  onSkip: () => void;
  onSubmit: () => void;
}

export const IntegrationTab: React.FC<IntegrationTabProps> = ({
  selectedApp,
  setSelectedApp,
  isGoogleConnected,
  setIsGoogleConnected,
  isSaving,
  onPrevious,
  onSkip,
  onSubmit,
}) => {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[var(--text-main)]">Available Apps</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Connect your favorite apps to automate your workflow
        </p>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gmail Card */}
        <div
          onClick={() => setSelectedApp("gmail")}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
            selectedApp === "gmail"
              ? "border-[#635BFF] bg-purple-50/30 dark:bg-purple-950/20 ring-2 ring-[#635BFF]/20"
              : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z"
                  fill="#EA4335"
                  fillOpacity="0.2"
                />
                <path
                  d="M22 6L12 13L2 6"
                  stroke="#EA4335"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="#EA4335" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-main)]">Gmail</h4>
              <span className="text-[11px] text-[var(--text-muted)]">by Google</span>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Send automated emails and manage communications through Gmail integration.
              </p>
            </div>
          </div>

          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
              selectedApp === "gmail"
                ? "border-[#635BFF] bg-[#635BFF]"
                : "border-[var(--border-subtle)]"
            }`}
          >
            {selectedApp === "gmail" && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </div>

        {/* Outlook Card */}
        <div
          onClick={() => setSelectedApp("outlook")}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
            selectedApp === "outlook"
              ? "border-[#635BFF] bg-purple-50/30 dark:bg-purple-950/20 ring-2 ring-[#635BFF]/20"
              : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="2"
                  fill="#0078D4"
                  fillOpacity="0.2"
                  stroke="#0078D4"
                  strokeWidth="2"
                />
                <circle cx="12" cy="12" r="4" stroke="#0078D4" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-main)]">Outlook</h4>
              <span className="text-[11px] text-[var(--text-muted)]">by Microsoft</span>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Send automated emails and manage communications through Outlook integration.
              </p>
            </div>
          </div>

          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
              selectedApp === "outlook"
                ? "border-[#635BFF] bg-[#635BFF]"
                : "border-[var(--border-subtle)]"
            }`}
          >
            {selectedApp === "outlook" && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </div>
      </div>

      {/* Sign in with Google Button */}
      <div className="flex flex-col items-center justify-center pt-2 space-y-3">
        <button
          type="button"
          onClick={() => setIsGoogleConnected(true)}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2.5 cursor-pointer ${
            isGoogleConnected
              ? "bg-emerald-600 text-white"
              : "bg-[#635BFF] hover:bg-[#5349e0] text-white"
          }`}
        >
          {isGoogleConnected ? (
            <>
              <Check className="w-4 h-4" />
              <span>Google Account Connected ✓</span>
            </>
          ) : (
            <>
              {/* Google G Logo */}
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </span>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>You&apos;ll be redirected to authenticate your account securely</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] space-y-1.5">
        <span className="font-semibold text-[var(--text-main)] italic block">Disclaimer</span>
        <p className="italic">
          Turia does not send emails to your clients or save your files in our server. Turia lets you
          connect your Gmail to send emails and Google Drive for file storage.
        </p>
        <p className="italic">
          Turia&apos;s does not share or transfer information received from Google APIs to any other
          app. The app adheres to{" "}
          <span className="underline text-[var(--text-main)]">
            Google API Services User Data Policy
          </span>
          , including the Limited Use requirements.
        </p>
      </div>

      {/* Step 5 Actions */}
      <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          Previous
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onSubmit}
            className="px-6 py-2.5 rounded-lg bg-[#635BFF] hover:bg-[#5349e0] text-sm font-semibold text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>Save & Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
