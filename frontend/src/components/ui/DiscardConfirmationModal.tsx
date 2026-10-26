'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface DiscardConfirmationModalProps {
  isOpen: boolean;
  onKeepEditing?: () => void;
  onDiscard?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
}

export default function DiscardConfirmationModal({
  isOpen,
  onKeepEditing,
  onDiscard,
  onCancel,
  onConfirm,
  title = "Discard Changes?",
  message = "You have unsaved changes. Are you sure you want to close?",
  confirmText,
  cancelText,
  confirmVariant = 'danger',
}: DiscardConfirmationModalProps) {
  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (onKeepEditing) onKeepEditing();
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    else if (onDiscard) onDiscard();
  };

  const resolvedConfirmText = confirmText || (onConfirm && !onDiscard ? "Confirm" : "Discard");
  const resolvedCancelText = cancelText || (onCancel && !onKeepEditing ? "Cancel" : "Keep Editing");

  return (
    /* Outer Overlay */
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      {/* Modal Card */}
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1e293b] p-6 shadow-2xl transition-all border border-[#dde2e8] dark:border-[#334155] animate-in zoom-in-95 duration-150 relative">
        {/* Close X */}
        <button
          type="button"
          onClick={handleCancel}
          className="absolute top-5 right-5 p-1 rounded-sm text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 flex items-center justify-center text-[#e8655a] shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#111827] dark:text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          {/* Secondary Button */}
          <button
            type="button"
            onClick={handleCancel}
            className="w-full sm:w-auto rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e293b] px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer shadow-xs"
          >
            {resolvedCancelText}
          </button>

          {/* Primary/Destructive Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className={`w-full sm:w-auto rounded-sm px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${
              confirmVariant === 'danger'
                ? "bg-[#e8655a] hover:bg-[#d85247] focus:ring-[#e8655a]"
                : "bg-[#31719B] hover:bg-[#285d80] focus:ring-[#31719B]"
            }`}
          >
            {resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export { DiscardConfirmationModal, DiscardConfirmationModal as ConfirmationModal };
