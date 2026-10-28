'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Check,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { authService } from '../auth/authService';
import { EmploymentRequestItem } from '../auth/authTypes';
import { Pagination } from '../ui/Pagination';
import { AddEmployeeWizard } from './AddEmployeeWizard';
import { getPresetPermissions } from './permissionsConfig';
import { teamStore } from './teamStore';
import { EmployeeRecord } from './types';

function formatTimeIST(dateString: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(dateString));
  } catch {
    return '—';
  }
}

function formatDateIST(dateString: string): string {
  try {
    const d = new Date(dateString);
    const day = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit' }).format(d);
    const month = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: '2-digit' }).format(d);
    const year = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(d);
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
}

export const EmploymentRequestView: React.FC = () => {
  const [requests, setRequests] = useState<EmploymentRequestItem[]>([]);
  const [counts, setCounts] = useState({ accepted: 0, rejected: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Accept wizard state
  const [activeRequestToAccept, setActiveRequestToAccept] = useState<EmploymentRequestItem | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Reject confirmation modal state
  const [requestToReject, setRequestToReject] = useState<EmploymentRequestItem | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authService.getEmploymentRequests({
        status: filterStatus || undefined,
        page: currentPage,
        limit: pageSize,
      });
      setRequests(res.requests || []);
      setCounts(res.counts || { accepted: 0, rejected: 0, pending: 0, total: 0 });
      setTotalItems(res.pagination?.total || 0);
    } catch {
      // Fallback
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, currentPage, pageSize]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCardClick = (status: 'accepted' | 'rejected' | 'pending') => {
    if (filterStatus === status) {
      setFilterStatus(null);
    } else {
      setFilterStatus(status);
    }
    setCurrentPage(1);
  };

  const handleOpenAccept = (req: EmploymentRequestItem) => {
    setActiveRequestToAccept(req);
    setIsWizardOpen(true);
  };

  const handleSaveAccept = async (
    data: Omit<EmployeeRecord, 'id' | 'createdAt' | 'initials' | 'clientsCount' | 'tasksCount' | 'recurringCount'>
  ) => {
    if (!activeRequestToAccept) return;
    try {
      const res = await authService.acceptEmploymentRequest(activeRequestToAccept._id, {
        mobile: data.mobile,
        designation: data.designation,
        department: data.department,
        role: data.role,
        permissions: data.permissions,
        joiningDate: data.joiningDate,
      });

      if (res.success) {
        setIsWizardOpen(false);
        setActiveRequestToAccept(null);
        await fetchRequests();
        await teamStore.loadEmployeesFromBackend();
      } else {
        alert(res.message || 'Failed to accept employment request.');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to accept request.');
    }
  };

  const handleConfirmReject = async () => {
    if (!requestToReject) return;
    setIsRejecting(true);
    try {
      const res = await authService.rejectEmploymentRequest(requestToReject._id);
      if (res.success) {
        setRequestToReject(null);
        await fetchRequests();
      } else {
        alert(res.message || 'Failed to reject request.');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to reject request.');
    } finally {
      setIsRejecting(false);
    }
  };

  const displayedRequests = requests.filter((r) => {
    if (!filterStatus) return true;
    return r.status === filterStatus;
  });

  const effectiveTotal = filterStatus
    ? (counts[filterStatus] ?? displayedRequests.length)
    : (totalItems || requests.length);

  return (
    <div className="w-full flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Header & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-[#000000] dark:text-white">
          Employment Requests ({effectiveTotal})
        </h2>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus || 'all'}
            onChange={(e) => {
              const v = e.target.value;
              setFilterStatus(v === 'all' ? null : (v as 'pending' | 'accepted' | 'rejected'));
              setCurrentPage(1);
            }}
            className="h-10 px-3 text-xs rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#31719B]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending ({counts.pending})</option>
            <option value="accepted">Accepted ({counts.accepted})</option>
            <option value="rejected">Rejected ({counts.rejected})</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="border border-[#dde2e8] dark:border-[#334155] rounded-none overflow-x-auto bg-white dark:bg-[#1e293b]">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: "var(--orange-havy-light)" }}>
            <tr>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">NAME</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">EMAIL ID</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">STATUS</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">TIME</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">DATE</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-[#dde2e8] dark:border-[#334155] text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="text-xs text-gray-700 dark:text-gray-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#31719B]" />
                    <span>Loading employment requests...</span>
                  </div>
                </td>
              </tr>
            ) : displayedRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  No {filterStatus ? filterStatus : ''} employment requests found.
                </td>
              </tr>
            ) : (
              displayedRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isAccepted = req.status === 'accepted';
                const isRejected = req.status === 'rejected';

                return (
                  <tr
                    key={req._id}
                    className="hover:bg-gray-50/60 dark:hover:bg-[#162032]/40 transition-colors"
                  >
                    {/* NAME */}
                    <td className="py-2.5 px-3.5 font-medium text-gray-900 dark:text-white whitespace-nowrap border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      {req.name}
                    </td>

                    {/* EMAIL ID */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      {req.email}
                    </td>

                    {/* STATUS */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      {isPending && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                          Pending
                        </span>
                      )}
                      {isAccepted && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                          Accepted
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300">
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* TIME (IST) */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono text-[11px] border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      {formatTimeIST(req.statusChangedAt || req.requestedAt)}
                    </td>

                    {/* DATE (IST) */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono text-[11px] border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      {formatDateIST(req.statusChangedAt || req.requestedAt)}
                    </td>

                    {/* ACTION */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-center border-b border-[#dde2e8] dark:border-[#334155]">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Accept Button */}
                        <button
                          type="button"
                          onClick={() => isPending && handleOpenAccept(req)}
                          disabled={!isPending}
                          title={isPending ? 'Accept Request' : 'Decision already recorded'}
                          aria-label={`Accept request from ${req.name}`}
                          className={`p-1.5 rounded-md transition-colors ${
                            isPending
                              ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer'
                              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-40'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>

                        {/* Reject Button */}
                        <button
                          type="button"
                          onClick={() => isPending && setRequestToReject(req)}
                          disabled={!isPending}
                          title={isPending ? 'Reject Request' : 'Decision already recorded'}
                          aria-label={`Reject request from ${req.name}`}
                          className={`p-1.5 rounded-md transition-colors ${
                            isPending
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer'
                              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-40'
                          }`}
                        >
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={effectiveTotal}
        onPageChange={setCurrentPage}
        showPageSize={true}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50]}
      />

      {/* 3. Accept Employee Wizard */}
      {isWizardOpen && activeRequestToAccept && (
        <AddEmployeeWizard
          isOpen={isWizardOpen}
          mode="acceptRequest"
          onClose={() => {
            setIsWizardOpen(false);
            setActiveRequestToAccept(null);
          }}
          onSave={handleSaveAccept}
          initialData={{
            id: '',
            firstName: activeRequestToAccept.name.trim().split(/\s+/)[0] || '',
            lastName: activeRequestToAccept.name.trim().split(/\s+/).slice(1).join(' ') || '',
            name: activeRequestToAccept.name,
            email: activeRequestToAccept.email,
            mobile: '',
            role: 'Employee',
            department: 'Audit & Taxation',
            shift: 'General (09:30 AM - 06:30 PM)',
            designation: '',
            status: 'Active',
            initials: '',
            clientsCount: 0,
            tasksCount: 0,
            recurringCount: 0,
            permissions: getPresetPermissions('Employee'),
            createdAt: new Date().toISOString(),
          }}
        />
      )}

      {/* 4. Reject Confirmation Modal */}
      {requestToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-none max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-[#334155] space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Reject Employment Request
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Permanent action
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Reject the request from <strong className="text-gray-900 dark:text-white">{requestToReject.name}</strong>? They will not be able to log in or request again.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRequestToReject(null)}
                disabled={isRejecting}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Reject Request</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
