"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl border border-[var(--border-subtle)] animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h3 className="text-xl font-bold text-[var(--text-main)]">Profile Setup Complete!</h3>
        <p className="text-xs text-[var(--text-muted)]">
          Your organization profile, bank account, and firm preferences are now active in CA Practice
          Practice.
        </p>

        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/");
          }}
          className="w-full py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-sm font-semibold text-white shadow transition-all cursor-pointer"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};
