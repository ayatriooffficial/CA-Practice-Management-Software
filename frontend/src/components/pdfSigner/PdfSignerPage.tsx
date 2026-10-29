'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  pdfSignerApi,
  SignedDocItem,
  SignerStatusResponse,
} from '@/services/pdfSignerApi';
import { clientApi } from '@/services/clientApi';
import { Client, GlobalDsc } from '@/data/crmData';
import { DocumentsToSignCard } from './DocumentsToSignCard';
import { SigningDetailsCard, SigningDetailsState } from './SigningDetailsCard';
import { SignedDocumentsTable } from './SignedDocumentsTable';
import { VerifyDrawer } from './VerifyDrawer';
import { ToastNotification } from '@/components/ui/ToastNotification';

export const PdfSignerPage: React.FC = () => {
  // Signer provider status
  const [status, setStatus] = useState<SignerStatusResponse | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Clients & registered DSCs
  const [clients, setClients] = useState<Client[]>([]);
  const [dscList, setDscList] = useState<GlobalDsc[]>([]);

  // Staged documents for signing
  const [stagedDocs, setStagedDocs] = useState<SignedDocItem[]>([]);
  const [selectedStagedIds, setSelectedStagedIds] = useState<string[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [stagedFilesMap, setStagedFilesMap] = useState<Record<string, File>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Signing form state
  const [signingState, setSigningState] = useState<SigningDetailsState>({
    dscRecordId: '',
    reason: 'Approved and sealed',
    location: 'New Delhi, India',
    page: 'First',
    customPages: '',
    placement: {
      xPct: 65,
      yPct: 75,
      wPct: 30,
      hPct: 15,
    },
    appearance: {
      showSignerName: true,
      showDateTime: true,
      showReasonLocation: true,
    },
  });
  const [isSigning, setIsSigning] = useState(false);

  // History / Signed documents
  const [historyDocs, setHistoryDocs] = useState<SignedDocItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Verification drawer
  const [verifyingDoc, setVerifyingDoc] = useState<SignedDocItem | null>(null);
  const [isVerifyDrawerOpen, setIsVerifyDrawerOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{
    message: string | null;
    type: 'success' | 'error' | 'info';
  }>({
    message: null,
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // 1. Fetch provider status
  const fetchStatus = useCallback(async () => {
    setIsStatusLoading(true);
    try {
      const res = await pdfSignerApi.getStatus();
      if (res && res.data) {
        setStatus(res.data);
      }
    } catch (err: any) {
      console.warn('Could not fetch signer status:', err);
      setStatus({
        provider: 'software',
        available: false,
        detail: err.message || 'Failed to reach signer service',
        certificates: [],
      });
    } finally {
      setIsStatusLoading(false);
    }
  }, []);

  // 2. Fetch clients and global DSCs
  const fetchClientsAndDscs = useCallback(async () => {
    try {
      const [clientsRes, dscsRes] = await Promise.allSettled([
        clientApi.getClients({ limit: 100 }),
        clientApi.getAllGlobalDscs(),
      ]);

      if (clientsRes.status === 'fulfilled' && clientsRes.value?.data) {
        setClients(clientsRes.value.data);
      }
      if (dscsRes.status === 'fulfilled' && dscsRes.value?.data) {
        setDscList(dscsRes.value.data);
        // Pre-select first non-expired DSC if available
        if (dscsRes.value.data.length > 0 && !signingState.dscRecordId) {
          const firstValid = dscsRes.value.data.find((d) => d.status !== 'Expired');
          if (firstValid) {
            setSigningState((prev) => ({
              ...prev,
              dscRecordId: firstValid.id || `${firstValid.clientId}-${firstValid.name}`,
            }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load clients or DSCs:', err);
    }
  }, [signingState.dscRecordId]);

  // 3. Fetch documents list (both staging and history)
  const fetchDocuments = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const res = await pdfSignerApi.listDocuments({ limit: 100 });
      if (res && res.data?.items) {
        const all = res.data.items;

        // History items are Signed, Verified, Tampered, Unsigned, or Failed
        const history = all.filter(
          (d) =>
            d.status === 'Signed' ||
            d.status === 'Verified' ||
            d.status === 'Tampered' ||
            d.status === 'Unsigned' ||
            d.status === 'Failed'
        );
        setHistoryDocs(history);

        // Staged items are Ready or Password protected
        const staged = all.filter((d) => d.status === 'Ready' || d.status === 'Password protected');
        setStagedDocs(staged);

        // Direct staging support: check query parameter for stagedId
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const targetStagedId = urlParams?.get('stagedId');

        if (targetStagedId) {
          const matched = staged.find((d) => d.id === targetStagedId || d._id === targetStagedId);
          if (matched) {
            setActiveDocId(matched.id);
            setSelectedStagedIds([matched.id]);
          } else if (staged.length > 0 && !activeDocId) {
            setActiveDocId(staged[0].id);
          }
        } else if (staged.length > 0 && !activeDocId) {
          setActiveDocId(staged[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [activeDocId]);

  useEffect(() => {
    fetchStatus();
    fetchClientsAndDscs();
    fetchDocuments();
  }, [fetchStatus, fetchClientsAndDscs, fetchDocuments]);

  // Auto-fetch active document binary for interactive placement preview if not present in memory
  useEffect(() => {
    if (activeDocId && !stagedFilesMap[activeDocId]) {
      const activeDoc = stagedDocs.find((d) => d.id === activeDocId);
      if (activeDoc && activeDoc.status !== 'Password protected') {
        const downloadUrl = pdfSignerApi.getDownloadUrl(activeDocId);
        fetch(downloadUrl, { credentials: 'include' })
          .then((res) => {
            if (res.ok) return res.blob();
            throw new Error('Failed to load active PDF bytes');
          })
          .then((blob) => {
            const file = new File([blob], activeDoc.fileName, { type: 'application/pdf' });
            setStagedFilesMap((prev) => ({ ...prev, [activeDocId]: file }));
          })
          .catch((err) => {
            console.warn('Could not load staged PDF file for placement canvas:', err);
          });
      }
    }
  }, [activeDocId, stagedDocs, stagedFilesMap]);

  // Upload handler for Signing mode
  const handleUploadFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      const res = await pdfSignerApi.uploadDocuments(files);
      if (res && res.data) {
        const newUploaded = res.data;
        showToast(
          `Successfully staged ${newUploaded.length} ${
            newUploaded.length === 1 ? 'document' : 'documents'
          } for signing.`,
          'success'
        );

        // Store file instances for interactive preview
        const mapUpdate = { ...stagedFilesMap };
        newUploaded.forEach((doc, idx) => {
          if (files[idx]) {
            mapUpdate[doc.id] = files[idx];
          }
        });
        setStagedFilesMap(mapUpdate);

        // Refresh documents
        await fetchDocuments();

        // Select all new uploaded files by default
        const newIds = newUploaded.map((d) => d.id);
        setSelectedStagedIds((prev) => Array.from(new Set([...prev, ...newIds])));
        if (newUploaded.length > 0) {
          setActiveDocId(newUploaded[0].id);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload PDF files.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload handler for Verification mode
  const handleVerifyUploadFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      let lastDoc: SignedDocItem | null = null;
      for (const file of files) {
        const res = await pdfSignerApi.verifyUploadedFile(file);
        if (res?.data) {
          lastDoc = res.data.document;
        }
      }
      await fetchDocuments();
      if (lastDoc) {
        if (lastDoc.status === 'Verified') {
          showToast(`Verified: "${lastDoc.fileName}" is cryptographically valid & intact!`, 'success');
        } else if (lastDoc.status === 'Tampered') {
          showToast(`Tamper detected in "${lastDoc.fileName}"! Check diagnosis report below.`, 'error');
        } else {
          showToast(`"${lastDoc.fileName}" contains no digital signature (or signature was stripped).`, 'info');
        }
        setVerifyingDoc(lastDoc);
        setIsVerifyDrawerOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Verification upload failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Stage documents chosen from Cloud Drive
  const handleStageFromDrive = async (docIds: string[]) => {
    setIsUploading(true);
    try {
      let count = 0;
      for (const driveId of docIds) {
        const res = await pdfSignerApi.stageFromDrive(driveId);
        if (res && res.data) {
          count++;
        }
      }
      await fetchDocuments();
      showToast(
        `Successfully imported & staged ${count} document${count === 1 ? '' : 's'} from Cloud Drive!`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to import documents from Drive.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Verify an already staged document and transfer it to the verified table
  const handleVerifyStagedDocument = async (id: string) => {
    try {
      const res = await pdfSignerApi.verifyStagedDocument(id);
      if (res?.data) {
        const { document: doc } = res.data;
        // Remove from staged selection
        setSelectedStagedIds((prev) => prev.filter((i) => i !== id));
        await fetchDocuments();
        if (doc.status === 'Verified') {
          showToast(`Verified: "${doc.fileName}" is cryptographically valid & intact!`, 'success');
        } else if (doc.status === 'Tampered') {
          showToast(`Tamper detected in "${doc.fileName}"! Check diagnosis report below.`, 'error');
        } else {
          showToast(`"${doc.fileName}" contains no digital signature.`, 'info');
        }
        setVerifyingDoc(doc);
        setIsVerifyDrawerOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to verify staged document.', 'error');
    }
  };


  // Client assignment update
  const handleUpdateClient = async (
    docId: string,
    clientId: string,
    clientName: string
  ) => {
    try {
      await pdfSignerApi.updateClient(docId, { clientId, clientName });
      setStagedDocs((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, clientId, clientName } : d))
      );
      showToast(`Document assigned to ${clientName}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to assign client.', 'error');
    }
  };

  // Selection handlers for staging card
  const handleToggleSelectStaged = (id: string) => {
    setSelectedStagedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllStaged = () => {
    if (selectedStagedIds.length === stagedDocs.length) {
      setSelectedStagedIds([]);
    } else {
      setSelectedStagedIds(stagedDocs.map((d) => d.id));
    }
  };

  // Remove single document from staging
  const handleRemoveDocument = async (id: string) => {
    try {
      await pdfSignerApi.deleteDocument(id);
      setStagedDocs((prev) => prev.filter((d) => d.id !== id && (d as any)._id !== id));
      setSelectedStagedIds((prev) => prev.filter((i) => i !== id));
      setStagedFilesMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeDocId === id) {
        const remaining = stagedDocs.filter((d) => d.id !== id && (d as any)._id !== id);
        setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
      }
      showToast('Document removed from staging.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove document.', 'error');
    }
  };

  // Batch Sign action

  const handleSignBatch = async () => {
    if (selectedStagedIds.length === 0) {
      showToast('Please select at least one document to sign.', 'error');
      return;
    }
    if (!signingState.dscRecordId) {
      showToast('Please select a Digital Signature Certificate.', 'error');
      return;
    }

    setIsSigning(true);
    try {
      let customPagesParsed: number[] | undefined = undefined;
      if (signingState.page === 'Custom' && signingState.customPages.trim()) {
        customPagesParsed = signingState.customPages
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n) && n > 0);
      }

      const res = await pdfSignerApi.signBatch({
        documentIds: selectedStagedIds,
        dscRecordId: signingState.dscRecordId,
        reason: signingState.reason,
        location: signingState.location,
        page: signingState.page,
        customPages: customPagesParsed,
        placement: signingState.placement,
        appearance: signingState.appearance,
      });

      if (res && res.data) {
        const { successful, failed, total } = res.data;
        if (failed === 0) {
          showToast(
            `Successfully signed ${successful} ${
              successful === 1 ? 'document' : 'documents'
            }!`,
            'success'
          );
        } else if (successful > 0) {
          showToast(
            `Batch completed: ${successful} signed, ${failed} failed. Check table below.`,
            'info'
          );
        } else {
          showToast(`Signing failed for all ${total} selected documents.`, 'error');
        }

        // Optimistically remove signed docs from staged table and clear selection
        const successfulIds = new Set(
          res.data.results.filter((r) => r.success).map((r) => r.documentId)
        );
        setStagedDocs((prev) => prev.filter((d) => !successfulIds.has(d.id)));
        setSelectedStagedIds([]);

        // Background sync to ensure full consistency with server records
        void fetchDocuments();
      }
    } catch (err: any) {
      showToast(err.message || 'Batch signing error occurred.', 'error');
    } finally {
      setIsSigning(false);
    }
  };

  // Retry single document
  const handleRetryDocument = async (doc: SignedDocItem) => {
    setRetryingId(doc.id);
    try {
      const res = await pdfSignerApi.retryDocument(doc.id);
      if (res && res.data) {
        const result = res.data.results?.[0];
        if (result?.success) {
          showToast(`Successfully re-signed "${doc.fileName}".`, 'success');
        } else {
          showToast(
            `Retry failed: ${result?.error || 'Unknown error occurred'}`,
            'error'
          );
        }
        await fetchDocuments();
      }
    } catch (err: any) {
      showToast(err.message || 'Retry failed.', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  // Single file download
  const handleDownloadDoc = (doc: SignedDocItem) => {
    const url = pdfSignerApi.getDownloadUrl(doc.id);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Signed_${doc.fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download ZIP archive of selected documents
  const handleDownloadZip = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    setDownloadingZip(true);
    try {
      const blob = await pdfSignerApi.downloadZip(selectedIds);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Signed_PDFs_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast(
        `Downloaded ZIP archive containing ${selectedIds.length} signed files.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to download ZIP archive.', 'error');
    } finally {
      setDownloadingZip(false);
    }
  };

  // Active file for placement preview
  const activeFile = activeDocId ? stagedFilesMap[activeDocId] : null;

  return (
    <div className="w-full flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white py-2">
              PDF Signer
            </h1>
            {/* Real truthful status pill */}
            <div className="inline-flex items-center gap-2">
              {isStatusLoading ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Checking signer...
                </span>
              ) : status?.available ? (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm"
                  title={status.detail}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {status.provider === 'software'
                    ? 'Software signer ready (Dev PFX)'
                    : 'USB Token connector ready'}
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  title={status?.detail || 'Signer is not available'}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Signer unavailable (Check provider)
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sign client documents with a registered DSC, then send or verify them in one place.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-3 py-2">
          <button
            type="button"
            onClick={() => {
              fetchStatus();
              fetchDocuments();
            }}
            className="flex items-center gap-1.5 h-10 px-3 rounded-none text-xs font-semibold border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
            title="Refresh documents and signer status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            href="/dsc"
            className="flex items-center gap-1.5 h-10 px-4 rounded-none text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
          >
            <KeyRound className="w-4 h-4" />
            <span>Manage DSCs</span>
          </Link>
        </div>
      </div>

      {/* Two Column Section: Documents to Sign (Left) & Signing Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left column: Upload & staging */}
        <div className="lg:col-span-7">
          <DocumentsToSignCard
            documents={stagedDocs}
            clients={clients}
            selectedIds={selectedStagedIds}
            activeDocumentId={activeDocId}
            isUploading={isUploading}
            onSelectDocument={(id) => setActiveDocId(id)}
            onToggleSelect={handleToggleSelectStaged}
            onToggleSelectAll={handleToggleSelectAllStaged}
            onUploadFiles={handleUploadFiles}
            onVerifyUploadFiles={handleVerifyUploadFiles}
            onVerifyStaged={handleVerifyStagedDocument}
            onUpdateClient={handleUpdateClient}
            onRemoveDocument={handleRemoveDocument}
            onStageFromDrive={handleStageFromDrive}
          />


        </div>

        {/* Right column: Signing parameters & placement */}
        <div className="lg:col-span-5">
          <SigningDetailsCard
            dscList={dscList}
            selectedCount={selectedStagedIds.length}
            isSigning={isSigning}
            state={signingState}
            selectedPdfFile={activeFile}
            onChangeState={(updater) => setSigningState(updater)}
            onSignBatch={handleSignBatch}
          />
        </div>
      </div>

      {/* History Table: Signed & Failed Documents */}
      <div>
        <SignedDocumentsTable
          documents={historyDocs}
          isLoading={isHistoryLoading}
          onVerify={(doc) => {
            setVerifyingDoc(doc);
            setIsVerifyDrawerOpen(true);
          }}
          onDownload={handleDownloadDoc}
          onRetry={handleRetryDocument}
          onDownloadZip={handleDownloadZip}
          retryingId={retryingId}
          downloadingZip={downloadingZip}
        />
      </div>

      {/* Verification & Audit Trail Drawer */}
      <VerifyDrawer
        isOpen={isVerifyDrawerOpen}
        document={verifyingDoc}
        onClose={() => {
          setIsVerifyDrawerOpen(false);
          setVerifyingDoc(null);
        }}
      />

      {/* Toast Notification */}
      <ToastNotification
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: 'success' })}
      />
    </div>
  );
};
