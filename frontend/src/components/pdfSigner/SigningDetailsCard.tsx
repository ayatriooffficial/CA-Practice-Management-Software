'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { KeyRound, ShieldAlert, AlertTriangle, Lock, PenTool, ExternalLink } from 'lucide-react';
import { GlobalDsc } from '@/data/crmData';
import { PlacementPreview, PlacementCoords } from './PlacementPreview';

export interface SigningDetailsState {
  dscRecordId: string;
  reason: string;
  location: string;
  page: 'First' | 'Last' | 'Custom';
  customPages: string;
  placement: PlacementCoords;
  appearance: {
    showSignerName: boolean;
    showDateTime: boolean;
    showReasonLocation: boolean;
  };
}

interface SigningDetailsCardProps {
  dscList: GlobalDsc[];
  selectedCount: number;
  isSigning: boolean;
  state: SigningDetailsState;
  selectedPdfFile?: File | null;
  onChangeState: (updater: (prev: SigningDetailsState) => SigningDetailsState) => void;
  onSignBatch: () => void;
}

// Client-side robust date evaluation mirroring backend dateParser
function evaluateDscExpiry(expiryStr?: string, statusStr?: string) {
  if (!expiryStr || expiryStr.trim() === '' || expiryStr.trim() === '-') {
    const isManExpired = statusStr?.trim().toLowerCase() === 'expired';
    return { isExpired: isManExpired, isExpiringSoon: false, daysLeft: null, label: expiryStr || '-' };
  }

  const clean = expiryStr.trim();
  let parsed: Date | null = null;

  const match = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const y = parseInt(match[3], 10);
    parsed = new Date(y, m, d, 23, 59, 59);
  } else {
    const fallback = new Date(clean);
    if (!isNaN(fallback.getTime())) parsed = fallback;
  }

  const isManExpired = statusStr?.trim().toLowerCase() === 'expired';

  if (!parsed || isNaN(parsed.getTime())) {
    return { isExpired: isManExpired, isExpiringSoon: false, daysLeft: null, label: clean };
  }

  const now = new Date();
  const diffDays = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = isManExpired || diffDays < 0;
  const isExpiringSoon = !isExpired && diffDays >= 0 && diffDays <= 30;

  return { isExpired, isExpiringSoon, daysLeft: diffDays, label: clean };
}

export const SigningDetailsCard: React.FC<SigningDetailsCardProps> = ({
  dscList,
  selectedCount,
  isSigning,
  state,
  selectedPdfFile,
  onChangeState,
  onSignBatch,
}) => {
  // Evaluated DSC records with Expiry Guard
  const evaluatedDscs = useMemo(() => {
    return dscList.map((d) => {
      const id = d.id || (d as any)._id || d.dscId || '';
      const meta = evaluateDscExpiry(d.expiryDate, d.status);
      return {
        ...d,
        computedId: id,
        meta,
      };
    });
  }, [dscList]);

  // Active selected DSC
  const selectedDsc = useMemo(() => {
    return evaluatedDscs.find((d) => d.computedId === state.dscRecordId) || evaluatedDscs[0] || null;
  }, [evaluatedDscs, state.dscRecordId]);

  const isSelectedExpired = selectedDsc?.meta.isExpired ?? false;
  const isSelectedExpiringSoon = selectedDsc?.meta.isExpiringSoon ?? false;

  const canSign = selectedCount > 0 && selectedDsc && !isSelectedExpired && !isSigning;

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-none border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          Signing details
        </h2>
        <Link
          href="/dsc"
          className="text-xs font-semibold text-[#31719B] dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <span>Manage DSCs</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-4 flex flex-col gap-3.5 text-xs">
        {/* Certificate Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-gray-700 dark:text-gray-300">
            Sign with certificate
          </label>

          {evaluatedDscs.length === 0 ? (
            <div className="p-3 rounded-none border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>No DSC registered. Please add a DSC in the DSC tab first.</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedDsc?.computedId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onChangeState((prev) => ({ ...prev, dscRecordId: val }));
                }}
                className="w-full h-10 px-3 rounded-none border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white font-medium outline-none focus:border-[#31719B]"
              >
                {evaluatedDscs.map((d) => (
                  <option
                    key={d.computedId}
                    value={d.computedId}
                    disabled={d.meta.isExpired}
                  >
                    {d.name} ({d.vendor || 'DSC'} · {d.class || 'Class III'} · {d.binNumber ? `Bin ${d.binNumber}` : ''}) — {d.meta.isExpired ? `EXPIRED (${d.meta.label})` : `Valid till ${d.meta.label}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Certificate Card Summary */}
          {selectedDsc && (
            <div
              className={`p-3 rounded-none border flex items-center justify-between gap-3 ${
                isSelectedExpired
                  ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/30'
                  : isSelectedExpiringSoon
                  ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/30'
                  : 'border-[#dde2e8] dark:border-[#334155] bg-gray-50/60 dark:bg-gray-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-none flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: isSelectedExpired ? '#e11d48' : '#31719B' }}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">
                    {selectedDsc.name}
                  </p>
                  <p className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate">
                    {selectedDsc.vendor} · {selectedDsc.class} · {selectedDsc.binNumber ? `Bin ${selectedDsc.binNumber}` : 'No bin'} · Valid till {selectedDsc.meta.label}
                  </p>
                </div>
              </div>

              <div>
                {isSelectedExpired ? (
                  <span className="inline-block px-2 py-0.5 rounded-none text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                    Expired
                  </span>
                ) : isSelectedExpiringSoon ? (
                  <span className="inline-block px-2 py-0.5 rounded-none text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    {selectedDsc.meta.daysLeft}d left
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded-none text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Active
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Inline Expiry Warnings / Error Guard */}
          {isSelectedExpired && (
            <div className="p-2.5 rounded-none bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-[11px]">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                <strong>Signing Blocked:</strong> This certificate is expired. Please select an active certificate or renew the token.
              </span>
            </div>
          )}

          {isSelectedExpiringSoon && !isSelectedExpired && (
            <div className="p-2 rounded-none bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 flex items-center gap-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Expiry Notice:</strong> This certificate will expire in {selectedDsc?.meta.daysLeft} days.
              </span>
            </div>
          )}
        </div>

        {/* Reason and Location Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-700 dark:text-gray-300">
              Reason
            </label>
            <input
              type="text"
              value={state.reason}
              onChange={(e) => onChangeState((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Approved for filing"
              className="h-10 px-3 rounded-none border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-700 dark:text-gray-300">
              Location
            </label>
            <input
              type="text"
              value={state.location}
              onChange={(e) => onChangeState((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="e.g. Kalyan, Maharashtra"
              className="h-10 px-3 rounded-none border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
            />
          </div>
        </div>

        {/* Signature on Pages (Segmented Switcher) */}
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-gray-700 dark:text-gray-300">
            Signature on pages
          </label>
          <div className="grid grid-cols-4 rounded-none border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
            {(['First', 'Last', 'All', 'Custom'] as const).map((mode) => {
              const isAll = mode === 'All';
              const isSelected = state.page === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  disabled={isAll}
                  onClick={() => {
                    if (!isAll) {
                      onChangeState((prev) => ({ ...prev, page: mode }));
                    }
                  }}
                  title={
                    isAll
                      ? 'In PAdES signatures, a single digital signature validates the entire document. Multi-page widget duplication triggers Adobe Reader validation warnings.'
                      : undefined
                  }
                  className={`py-1.5 text-xs font-semibold rounded-none transition-all ${
                    isAll
                      ? 'opacity-40 cursor-not-allowed text-gray-400'
                      : isSelected
                      ? 'bg-[#31719B] text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white cursor-pointer'
                  }`}
                >
                  {mode}
                  {isAll && <span className="text-[9px] block text-gray-400">(N/A)</span>}
                </button>
              );
            })}
          </div>

          {state.page === 'Custom' && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-gray-500">Page number:</span>
              <input
                type="number"
                min={1}
                value={state.customPages || '1'}
                onChange={(e) => onChangeState((prev) => ({ ...prev, customPages: e.target.value }))}
                className="w-20 h-8 px-2 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-xs font-mono outline-none"
              />
            </div>
          )}
        </div>

        {/* Placement and Appearance */}
        <div className="flex flex-col gap-2 pt-1 border-t border-[#dde2e8] dark:border-[#334155]">
          <label className="font-semibold text-gray-700 dark:text-gray-300">
            Placement and appearance
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Visual Canvas Preview */}
            <PlacementPreview
              pdfFile={selectedPdfFile}
              signerName={selectedDsc?.name || 'Signer Name'}
              reason={state.reason}
              location={state.location}
              showSignerName={state.appearance.showSignerName}
              showDateTime={state.appearance.showDateTime}
              showReasonLocation={state.appearance.showReasonLocation}
              placement={state.placement}
              onChangePlacement={(placement) => onChangeState((prev) => ({ ...prev, placement }))}
            />

            {/* Stamp Checkboxes (Deliberate diff: Signature Image removed per prompt) */}
            <div className="flex flex-col justify-center gap-2.5 p-3 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-gray-800/20">
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-[11px] mb-1">
                Stamp Contents:
              </p>

              <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={state.appearance.showSignerName}
                  onChange={(e) =>
                    onChangeState((prev) => ({
                      ...prev,
                      appearance: { ...prev.appearance, showSignerName: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded-none text-[#31719B] accent-[#31719B] cursor-pointer"
                />
                <span>Signer name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={state.appearance.showDateTime}
                  onChange={(e) =>
                    onChangeState((prev) => ({
                      ...prev,
                      appearance: { ...prev.appearance, showDateTime: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded-none text-[#31719B] accent-[#31719B] cursor-pointer"
                />
                <span>Date and time</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={state.appearance.showReasonLocation}
                  onChange={(e) =>
                    onChangeState((prev) => ({
                      ...prev,
                      appearance: { ...prev.appearance, showReasonLocation: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded-none text-[#31719B] accent-[#31719B] cursor-pointer"
                />
                <span>Reason and location</span>
              </label>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2 flex flex-col gap-1.5">
          <button
            type="button"
            disabled={!canSign}
            onClick={onSignBatch}
            className={`w-full h-10 rounded-none text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2 transition-all ${
              canSign
                ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                : 'opacity-50 cursor-not-allowed bg-gray-400'
            }`}
            style={{
              backgroundColor: canSign ? 'var(--premium-blue-dark, #31719B)' : undefined,
            }}
          >
            {isSigning ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Digitally signing {selectedCount} {selectedCount === 1 ? 'document' : 'documents'}...</span>
              </div>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>
                  Sign {selectedCount} {selectedCount === 1 ? 'document' : 'documents'}
                </span>
              </>
            )}
          </button>

          <p className="text-center text-[10.5px] text-gray-400 dark:text-gray-500">
            The token will ask for the PIN. It is never stored here.
          </p>
        </div>
      </div>
    </div>
  );
};
