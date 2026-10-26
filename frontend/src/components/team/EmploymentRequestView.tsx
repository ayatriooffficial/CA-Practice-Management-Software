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
    <div className="space-y-4">
      {/* 1. Three Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 pt-6">
        {/* Accepted Card */}
        <div
          onClick={() => handleCardClick('accepted')}
          className={`bg-white dark:bg-[#1e293b] rounded-xl border p-4 shadow-2xs flex items-center justify-between transition-all cursor-pointer hover:shadow-xs select-none ${
            filterStatus === 'accepted'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-gray-100 dark:border-[#334155]'
          }`}
        >
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
              {counts.accepted}
            </div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              Accepted Requests
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Rejected Card */}
        <div
          onClick={() => handleCardClick('rejected')}
          className={`bg-white dark:bg-[#1e293b] rounded-xl border p-4 shadow-2xs flex items-center justify-between transition-all cursor-pointer hover:shadow-xs select-none ${
            filterStatus === 'rejected'
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-gray-100 dark:border-[#334155]'
          }`}
        >
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 leading-tight">
              {counts.rejected}
            </div>
            <div className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">
              Rejected Requests
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Card */}
        <div
          onClick={() => handleCardClick('pending')}
          className={`bg-white dark:bg-[#1e293b] rounded-xl border p-4 shadow-2xs flex items-center justify-between transition-all cursor-pointer hover:shadow-xs select-none ${
            filterStatus === 'pending'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-gray-100 dark:border-[#334155]'
          }`}
        >
          <div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 leading-tight">
              {counts.pending}
            </div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
              Pending Requests
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Main Table Card */}
      <div className="px-6">
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#334155] bg-gray-50/70 dark:bg-[#162032] text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-6">NAME</th>
                  <th className="py-3 px-6">EMAIL ID</th>
                  <th className="py-3 px-6">STATUS</th>
                  <th className="py-3 px-6">TIME</th>
                  <th className="py-3 px-6">DATE</th>
                  <th className="py-3 px-6 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60 text-xs text-gray-700 dark:text-gray-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#3D6A9E]" />
                        <span>Loading employment requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
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
                        <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {req.name}
                        </td>

                        {/* EMAIL ID */}
                        <td className="py-3.5 px-6 whitespace-nowrap text-gray-600 dark:text-gray-300">
                          {req.email}
                        </td>

                        {/* STATUS */}
                        <td className="py-3.5 px-6 whitespace-nowrap">
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
                        <td className="py-3.5 px-6 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                          {formatTimeIST(req.statusChangedAt || req.requestedAt)}
                        </td>

                        {/* DATE (IST) */}
                        <td className="py-3.5 px-6 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                          {formatDateIST(req.statusChangedAt || req.requestedAt)}
                        </td>

                        {/* ACTION */}
                        <td className="py-3.5 px-6 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
            pageSizeOptions={[10]}
          />
        </div>
      </div>

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
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-[#334155] space-y-4">
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
