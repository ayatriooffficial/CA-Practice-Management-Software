'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  KeyRound,
  FileText,
  ChevronDown,
  ChevronUp,
  History,
  Download,
  AlertTriangle,
} from 'lucide-react';
import {
  pdfSignerApi,
  SignedDocItem,
  VerificationResponse,
  AuditTrailItem,
} from '@/services/pdfSignerApi';

interface VerifyDrawerProps {
  isOpen: boolean;
  document: SignedDocItem | null;
  onClose: () => void;
}

export const VerifyDrawer: React.FC<VerifyDrawerProps> = ({
  isOpen,
  document,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'verification' | 'audit'>('verification');
  const [report, setReport] = useState<VerificationResponse | null>(null);
  const [audits, setAudits] = useState<AuditTrailItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    if (!isOpen || !document) {
      setReport(null);
      setAudits([]);
      setErrorMessage(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setErrorMessage(null);

    const docId = document.id || (document as any)._id;

    Promise.all([
      pdfSignerApi.verifyDocument(docId),
      pdfSignerApi.getAuditTrail(docId),
    ])
      .then(([verifyRes, auditRes]) => {
        if (!active) return;
        if (verifyRes.data) {
          setReport(verifyRes.data);
        } else {
          setErrorMessage(verifyRes.message || 'Failed to verify document signature');
        }
        if (auditRes.data) {
          setAudits(auditRes.data);
        }
      })
      .catch((err) => {
        if (!active) return;
        setErrorMessage(err?.message || 'Error occurred during verification');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white dark:bg-[#1e293b] border-l border-[#dde2e8] dark:border-[#334155] shadow-2xl flex flex-col text-[#111827] dark:text-[#f8fafc] animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-none flex items-center justify-center text-white shrink-0 font-bold"
                style={{ backgroundColor: 'var(--premium-blue-dark, #31719B)' }}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  Digital Signature Verification
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs" title={document.fileName}>
                  {document.fileName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-none border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-tab navigation */}
          <div className="flex border-b border-[#dde2e8] dark:border-[#334155] px-6 gap-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('verification')}
              className={`py-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'verification'
                  ? 'border-[#31719B] text-[#31719B] dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Signature Report</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`py-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'audit'
                  ? 'border-[#31719B] text-[#31719B] dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail ({audits.length})</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-[#31719B] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Verifying cryptographic ByteRange and CMS signature...
                </p>
              </div>
            ) : errorMessage ? (
              <div className="p-4 rounded-none border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-start gap-3 text-xs">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Verification Error</h4>
                  <p className="mt-0.5 text-rose-700 dark:text-rose-400">{errorMessage}</p>
                </div>
              </div>
            ) : activeTab === 'verification' && report ? (
              <div className="space-y-4">
                {/* 1. Overall Integrity Banner */}
                <div
                  className={`p-4 rounded-none border flex items-start gap-3 ${
                    report.isValid
                      ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/30'
                      : 'border-rose-200 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/30'
                  }`}
                >
                  {report.isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {report.isValid
                        ? 'Signature is VALID & Document Unaltered'
                        : 'Signature INVALID or Content Modified'}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {report.isValid
                        ? 'The cryptographic signature over the designated byte range is intact and matches the embedded signer certificate.'
                        : report.tamperReason ||
                          (report.contentTampered
                            ? 'Document byte tampering detected! The document content hash does not match the signed digest.'
                            : 'The cryptographic signature could not be verified with the embedded public key.')}
                    </p>
                  </div>
                </div>

                {/* Tamper / Failure Root Cause Analysis */}
                {(!report.isValid || report.contentTampered || report.signatureTampered || !report.isSigned) && (
                  <div className="p-4 rounded-none border border-rose-300 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/40 text-xs space-y-3">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Tamper Analysis & Root Cause</span>
                    </div>

                    <div className="space-y-2 text-gray-800 dark:text-gray-200">
                      {/* 1. Hashing Check */}
                      <div className="flex items-start gap-2.5 p-2 rounded-none bg-white dark:bg-[#1e293b] border border-rose-200 dark:border-rose-900/60">
                        <div className="mt-0.5">
                          {report.contentTampered ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold block">SHA-256 Content Byte Digest:</span>
                          {report.contentTampered ? (
                            <span className="text-rose-700 dark:text-rose-400 text-[11px]">
                              🚨 <strong>Hash Mismatch (Tampered):</strong> The document text, numbers, or pages were altered after signing. The SHA-256 digest recomputed over the byte range does not match the sealed cryptographic digest.
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                              ✅ Document content byte range matches the signed digest.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. RSA Signature Check */}
                      <div className="flex items-start gap-2.5 p-2 rounded-none bg-white dark:bg-[#1e293b] border border-rose-200 dark:border-rose-900/60">
                        <div className="mt-0.5">
                          {report.signatureTampered ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold block">RSA Public Key Signature:</span>
                          {report.signatureTampered ? (
                            <span className="text-rose-700 dark:text-rose-400 text-[11px]">
                              🚨 <strong>Cryptographic Signature Broken:</strong> The signature failed mathematical verification with the signer&apos;s public key. The signature bytes were corrupted or forged.
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                              ✅ Digital signature mathematically verified with signer&apos;s public key.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3. Envelope / Structure Check */}
                      {!report.isSigned && (
                        <div className="flex items-start gap-2.5 p-2 rounded-none bg-white dark:bg-[#1e293b] border border-rose-200 dark:border-rose-900/60">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Format / Envelope Stripped:</span>
                            <span className="text-amber-800 dark:text-amber-300 text-[11px]">
                              ⚠️ No valid PKCS#7 signature dictionary found. If this document was converted to Word and back to PDF, the digital signature was stripped during export.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}


                {/* 2. Whole-File Coverage Check */}
                <div className="p-3.5 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-gray-50/60 dark:bg-gray-800/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Whole-File Coverage:
                    </span>
                  </div>
                  <div>
                    {report.coversWholeFile ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete File Covered</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Bytes appended after signature</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Signer Certificate Details */}
                {report.signer && (
                  <div className="rounded-none border border-[#dde2e8] dark:border-[#334155] p-4 space-y-3 bg-white dark:bg-[#1e293b]">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#31719B] dark:text-blue-400" />
                      <span>Signer Information</span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-500">Signer Name:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {report.signer.commonName}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-500">Serial Number:</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {report.signer.serialNumber}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-500">Signing Time:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {report.signingTime ? new Date(report.signingTime).toLocaleString() : 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-500">Valid From:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {new Date(report.signer.validFrom).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-500">Valid To:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {new Date(report.signer.validTo).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Validity at Signing:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {report.signer.isValidAtSigningTime ? 'Valid' : 'Expired at signing time'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Trust Status */}
                <div className="p-3.5 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-gray-50/60 dark:bg-gray-800/30 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Trust Chain:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-none text-[10.5px] ${
                        report.trust.status === 'trusted'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {report.trust.status === 'trusted' ? 'Trusted Root' : 'Unknown Signer'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {report.trust.description}
                  </p>
                </div>

                {/* 5. Cryptographic Details (Collapsible) */}
                <div className="border border-[#dde2e8] dark:border-[#334155] rounded-none overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="w-full px-4 py-2.5 flex items-center justify-between bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                  >
                    <span>Cryptographic Details</span>
                    {showTechnicalDetails ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {showTechnicalDetails && report.details && (
                    <div className="p-4 space-y-3 bg-white dark:bg-[#1e293b] font-mono text-[11px] border-t border-[#dde2e8] dark:border-[#334155]">
                      <div>
                        <span className="text-gray-400 block mb-0.5">ByteRange Array:</span>
                        <code className="text-[#31719B] dark:text-blue-400 block bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-none">
                          [{report.details.byteRange.join(', ')}]
                        </code>
                      </div>

                      <div>
                        <span className="text-gray-400 block mb-0.5">Computed SHA-256 Digest:</span>
                        <code className="text-gray-800 dark:text-gray-200 block bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-none break-all">
                          {report.details.computedDigestHex}
                        </code>
                      </div>

                      <div>
                        <span className="text-gray-400 block mb-0.5">CMS Authenticated messageDigest:</span>
                        <code className="text-gray-800 dark:text-gray-200 block bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-none break-all">
                          {report.details.expectedDigestHex}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'audit' ? (
              <div className="space-y-3">
                {audits.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-10">
                    No audit records logged yet.
                  </p>
                ) : (
                  audits.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-none border border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-gray-800/20 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-none text-[10px] uppercase tracking-wide ${
                            item.action === 'sign_success'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : item.action === 'sign_failure'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : item.action === 'verify'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {item.action.replace('_', ' ')}
                        </span>
                        <span className="text-gray-400 text-[10.5px]">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-gray-600 dark:text-gray-400 text-[11px]">
                        User: <span className="font-mono text-gray-800 dark:text-gray-200">{item.userId}</span>
                      </div>

                      {item.signedSha256 && (
                        <div className="text-gray-500 dark:text-gray-400 text-[10.5px] truncate font-mono">
                          SHA: {item.signedSha256}
                        </div>
                      )}

                      {item.errorDetail && (
                        <p className="text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                          Error: {item.errorDetail}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#dde2e8] dark:border-[#334155] flex justify-end bg-gray-50/50 dark:bg-gray-800/40">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-none text-xs font-semibold bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
