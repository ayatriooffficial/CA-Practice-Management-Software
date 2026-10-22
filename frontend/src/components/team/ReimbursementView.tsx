'use client';

import React, { useState } from 'react';
import { ReimbursementClaim } from './types';
import { teamStore } from './teamStore';

export const ReimbursementView: React.FC = () => {
  const [activeType, setActiveType] = useState<'internal' | 'task'>('internal');
  const [claims, setClaims] = useState<ReimbursementClaim[]>(() => teamStore.getReimbursements());
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('This FY');
  const [searchQuery, setSearchQuery] = useState('');

  const currentClaims = claims.filter((c) => c.type === activeType && (
    !searchQuery.trim() ||
    c.applicant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.particulars && c.particulars.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.client && c.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.task && c.task.toLowerCase().includes(searchQuery.toLowerCase()))
  ));

  // Compute stat totals
  const totalAmount = currentClaims.reduce((acc, c) => acc + c.amount, 0);
  const appliedAmount = currentClaims.filter((c) => c.status === 'Applied').reduce((acc, c) => acc + c.amount, 0);
  const appliedCount = currentClaims.filter((c) => c.status === 'Applied').length;
  const approvedAmount = currentClaims.filter((c) => c.status === 'Approved').reduce((acc, c) => acc + c.amount, 0);
  const approvedCount = currentClaims.filter((c) => c.status === 'Approved').length;
  const rejectedAmount = currentClaims.filter((c) => c.status === 'Rejected').reduce((acc, c) => acc + c.amount, 0);
  const rejectedCount = currentClaims.filter((c) => c.status === 'Rejected').length;
  const paidAmount = currentClaims.filter((c) => c.paid).reduce((acc, c) => acc + c.amount, 0);
  const paidCount = currentClaims.filter((c) => c.paid).length;
  const notPaidAmount = currentClaims.filter((c) => !c.paid).reduce((acc, c) => acc + c.amount, 0);
  const notPaidCount = currentClaims.filter((c) => !c.paid).length;

  const handleApproveClaim = (id: string) => {
    teamStore.updateReimbursementStatus(id, 'Approved', true);
    setClaims(teamStore.getReimbursements());
  };

  const handleRejectClaim = (id: string) => {
    teamStore.updateReimbursementStatus(id, 'Rejected', false);
    setClaims(teamStore.getReimbursements());
  };

  const ranges = [
    'Today',
    'This Week',
    'This Month',
    'Last Month',
    'This Quarter',
    'This FY',
    'Last FY',
    'Custom Range',
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Type Pills */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveType('internal')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${activeType === 'internal'
              ? 'bg-[#3D6A9E] text-white shadow-sm shadow-[#3D6A9E]/20'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          Internal
        </button>
        <button
          onClick={() => setActiveType('task')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${activeType === 'task'
              ? 'bg-[#3D6A9E] text-white shadow-sm shadow-[#3D6A9E]/20'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          Task
        </button>
      </div>

      {/* 6 Summary Stat Cards Matching Screenshot 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-[#3D6A9E]">₹{totalAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 font-medium">Total ({currentClaims.length})</div>
          </div>
          <div className="w-7 h-7 rounded bg-[#EEF2FF] text-[#3D6A9E] flex items-center justify-center text-xs">
            ₹
          </div>
        </div>

        {/* Applied */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-indigo-600">₹{appliedAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 font-medium">Applied ({appliedCount})</div>
          </div>
          <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
            ⏳
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-emerald-600">₹{approvedAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 font-medium">Approved ({approvedCount})</div>
          </div>
          <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
            ✓
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-red-600">₹{rejectedAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 font-medium">Rejected ({rejectedCount})</div>
          </div>
          <div className="w-7 h-7 rounded bg-red-50 text-red-600 flex items-center justify-center text-xs">
            ✕
          </div>
        </div>

        {/* Paid */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-teal-600">₹{paidAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 font-medium">Paid ({paidCount})</div>
          </div>
          <div className="w-7 h-7 rounded bg-teal-50 text-teal-600 flex items-center justify-center text-xs">
            💳
          </div>
        </div>

        {/* Not Paid */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-amber-600">₹{notPaidAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 font-medium">Not Paid ({notPaidCount})</div>
          </div>
          <div className="w-7 h-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
            ⏱
          </div>
        </div>
      </div>

      {/* Date Filter & Search toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
        <div className="relative">
          <button
            onClick={() => setDateFilterOpen(!dateFilterOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#3D6A9E] bg-white border border-[#3D6A9E]/40 rounded-lg shadow-sm hover:bg-[#EEF2FF]/40 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-[#3D6A9E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{selectedRange}</span>
            <span className="text-gray-400">˅</span>
          </button>

          {/* Date Range Dropdown Popover */}
          {dateFilterOpen && (
            <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-30 animate-fadeIn">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setSelectedRange(r);
                    setDateFilterOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${selectedRange === r
                      ? 'bg-[#EEF2FF] text-[#3D6A9E] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search claims..."
              className="w-56 text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
            />
            <svg
              className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Reimbursement Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input type="checkbox" className="rounded border-gray-300 text-[#3D6A9E]" />
                </th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4">Particulars</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Method</th>
                {activeType === 'internal' ? (
                  <th className="py-3 px-4">Paid By</th>
                ) : (
                  <>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Task</th>
                  </>
                )}
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Paid</th>
                <th className="py-3 px-4">Linked To</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-3">Attachments</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentClaims.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-400">
                    No {activeType} reimbursement records found for the selected period.
                  </td>
                </tr>
              ) : (
                currentClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <input type="checkbox" className="rounded border-gray-300 text-[#3D6A9E]" />
                    </td>
                    <td className="py-3 px-3 text-gray-700">{claim.date}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900 max-w-xs truncate" title={claim.particulars}>
                      {claim.particulars}
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-900">
                      ₹{claim.amount.toLocaleString('en-IN')}.00
                    </td>
                    <td className="py-3 px-3 text-gray-600">{claim.method || 'UPI'}</td>

                    {activeType === 'internal' ? (
                      <td className="py-3 px-4 text-gray-700 font-medium">{claim.paidBy}</td>
                    ) : (
                      <>
                        <td className="py-3 px-4 text-gray-900 font-medium">{claim.client || '-'}</td>
                        <td className="py-3 px-4 text-gray-600">{claim.task || '-'}</td>
                      </>
                    )}

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-medium text-[11px] border ${claim.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : claim.status === 'Rejected'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                      >
                        {claim.status}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {claim.paid ? (
                        <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          No
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-gray-600">{claim.linkedTo || '-'}</td>
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={claim.remarks}>
                      {claim.remarks || '-'}
                    </td>
                    <td className="py-3 px-3">
                      {claim.attachments ? (
                        <span className="text-[#3D6A9E] font-medium hover:underline cursor-pointer flex items-center gap-1">
                          📎 {claim.attachments}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {claim.status === 'Applied' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleApproveClaim(claim.id)}
                            title="Approve & Mark Paid"
                            className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRejectClaim(claim.id)}
                            title="Reject"
                            className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
