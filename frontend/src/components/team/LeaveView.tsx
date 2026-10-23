'use client';

import React, { useState } from 'react';
import { LeaveApplication, LeaveSummaryRecord, LeaveType } from './types';
import { teamStore } from './teamStore';

export const LeaveView: React.FC = () => {
  const [subTab, setSubTab] = useState<'applications' | 'summary'>('applications');
  const [applications, setApplications] = useState<LeaveApplication[]>(() => teamStore.getLeaveApplications());
  const [summaryList] = useState<LeaveSummaryRecord[]>(() => teamStore.getLeaveSummary());
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // New leave modal fields
  const [assignee, setAssignee] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual Leave');
  const [dateOfLeave, setDateOfLeave] = useState('');
  const [daysCount, setDaysCount] = useState('1');
  const [leaveReason, setLeaveReason] = useState('');

  const employees = teamStore.getEmployees().filter((e) => e.status === 'Active');

  const handleApprove = (id: string) => {
    teamStore.updateLeaveStatus(id, 'Approved');
    setApplications(teamStore.getLeaveApplications());
  };

  const handleReject = (id: string) => {
    const remark = prompt('Enter rejection reason:') || 'Leave request not approved';
    teamStore.updateLeaveStatus(id, 'Rejected', remark);
    setApplications(teamStore.getLeaveApplications());
  };

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateOfLeave.trim() || !leaveReason.trim()) {
      alert('Please fill out the date and reason.');
      return;
    }

    const newApp: LeaveApplication = {
      id: `lv_${Date.now()}`,
      applicant: assignee,
      employeeId: employees.find((em) => em.name === assignee)?.id || 'emp_001',
      leaveType,
      dateOfApplication: new Date().toISOString().split('T')[0],
      dateOfLeave,
      daysApplied: Number(daysCount) || 1,
      leavesTaken: 2,
      leaveBalance: 8,
      reason: leaveReason,
      status: 'Approved',
      lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    const updated = [newApp, ...applications];
    teamStore.saveLeaveApplications(updated);
    setApplications(updated);
    setIsAssignModalOpen(false);
    setDateOfLeave('');
    setLeaveReason('');
  };

  return (
    <div className="p-6 space-y-4">
      {/* Sub Tabs Pill Bar */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#162032] p-1 rounded-xl w-fit border border-transparent dark:border-[#334155]">
        <button
          onClick={() => setSubTab('applications')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${subTab === 'applications'
            ? 'bg-[#EEF2FF] dark:bg-[#1e293b] text-[#3D6A9E] dark:text-[#60a5fa] shadow-xs'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          All Applications
        </button>
        <button
          onClick={() => setSubTab('summary')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${subTab === 'summary'
            ? 'bg-[#EEF2FF] dark:bg-[#1e293b] text-[#3D6A9E] dark:text-[#60a5fa] shadow-xs'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          Summary
        </button>
      </div>

      {/* 1. ALL APPLICATIONS */}
      {subTab === 'applications' && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] overflow-hidden shadow-2xs transition-colors">
          <div className="p-4 border-b border-gray-200 dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Leave Applications ({applications.length})
            </h3>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#3D6A9E] hover:bg-[#315782] rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Assign Leave</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-[#162032] text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-[#334155]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] cursor-pointer" />
                  </th>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-3">Leave Type</th>
                  <th className="py-3 px-3">Date Of Application</th>
                  <th className="py-3 px-3">Date Of Leave</th>
                  <th className="py-3 px-3 text-center">Days</th>
                  <th className="py-3 px-3 text-center">Leaves Taken</th>
                  <th className="py-3 px-3 text-center">Balance</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Rejection Remarks</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/60 dark:hover:bg-[#131d30] transition-colors">
                    <td className="py-3 px-3">
                      <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] cursor-pointer" />
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{app.applicant}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                        {app.leaveType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{app.dateOfApplication}</td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-medium">{app.dateOfLeave}</td>
                    <td className="py-3 px-3 text-center font-bold text-gray-900 dark:text-white">{app.daysApplied}</td>
                    <td className="py-3 px-3 text-center text-gray-700 dark:text-gray-300">{app.leavesTaken}</td>
                    <td className="py-3 px-3 text-center text-gray-700 dark:text-gray-300">{app.leaveBalance}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300 max-w-xs truncate" title={app.reason}>{app.reason}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-medium text-[11px] border ${app.status === 'Approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                          : app.status === 'Rejected'
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/40'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
                          }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{app.rejectionRemarks || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      {app.status === 'Pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleApprove(app.id)}
                            title="Approve"
                            className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            title="Reject"
                            className="p-1 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SUMMARY */}
      {subTab === 'summary' && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] overflow-hidden shadow-2xs p-6 space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Employee Leave Balances
            </h3>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-300 dark:border-[#475569] rounded-lg bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#3D6A9E]"
            >
              <option value="2026-2027">Financial Year 2026 - 2027</option>
              <option value="2025-2026">Financial Year 2025 - 2026</option>
            </select>
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-[#334155] rounded-xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-[#162032] text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-[#334155]">
                <tr>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4 text-center">Total Available</th>
                  <th className="py-3 px-4 text-center">Leaves Taken</th>
                  <th className="py-3 px-4 text-center">Balance Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
                {summaryList.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-[#131d30] transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{s.applicant}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{s.leaveType}</td>
                    <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300 font-medium">{s.totalAvailable}</td>
                    <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">{s.totalLeaveTaken}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{s.balanceAvailable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Leave Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <form
            onSubmit={handleSaveLeave}
            className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#334155] max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#334155]">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign / Apply Leave</h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Employee</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
              >
                <option value="">Select Employee</option>
                {employees.map((em) => (
                  <option key={em.id} value={em.name}>{em.name} ({em.designation})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Earned Leave">Earned Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Leave</label>
                <input
                  type="text"
                  placeholder="e.g. 25/10/2026 - 26/10/2026"
                  value={dateOfLeave}
                  onChange={(e) => setDateOfLeave(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Days Count</label>
                <input
                  type="number"
                  min="1"
                  value={daysCount}
                  onChange={(e) => setDaysCount(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Reason</label>
              <textarea
                rows={3}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Brief reason for leave application..."
                className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#334155]">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#162032] rounded-lg hover:bg-gray-200 dark:hover:bg-[#334155] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#3D6A9E] hover:bg-[#315782] rounded-lg shadow-sm cursor-pointer"
              >
                Submit Application
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
