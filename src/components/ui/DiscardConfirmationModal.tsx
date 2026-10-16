'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface DiscardConfirmationModalProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
  title?: string;
  message?: string;
}

export default function DiscardConfirmationModal({
  isOpen,
  onKeepEditing,
  onDiscard,
  title = "Discard Changes?",
  message = "You have unsaved changes. Are you sure you want to close?",
}: DiscardConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    /* Outer Overlay */
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      {/* Modal Card */}
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1e293b] p-6 shadow-2xl transition-all border border-[#dde2e8] dark:border-[#334155] animate-in zoom-in-95 duration-150 relative">
        {/* Close X */}
        <button
          type="button"
          onClick={onKeepEditing}
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
          {/* Secondary Button: Keep Editing */}
          <button
            type="button"
            onClick={onKeepEditing}
            className="w-full sm:w-auto rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e293b] px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer shadow-xs"
          >
            Keep Editing
          </button>

          {/* Primary/Destructive Button: Discard */}
          <button
            type="button"
            onClick={onDiscard}
            className="w-full sm:w-auto rounded-sm bg-[#e8655a] hover:bg-[#d85247] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#e8655a] focus:ring-offset-2 cursor-pointer"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export { DiscardConfirmationModal };
