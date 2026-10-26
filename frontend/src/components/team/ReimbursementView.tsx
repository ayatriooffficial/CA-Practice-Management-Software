'use client';

import React, { useEffect, useState } from 'react';
import { ReimbursementClaim } from './types';
import { teamStore } from './teamStore';
import { financialApi, FinancialExpenseRecord } from '@/services/financialApi';
import { taskApi } from '@/services/taskApi';
import { TaskItem } from '@/data/taskData';

function expenseToClaim(expense: FinancialExpenseRecord): ReimbursementClaim {
  const employee = typeof expense.employeeId === 'string' ? null : expense.employeeId;
  return {
    id: expense._id,
    type: 'task',
    applicant: expense.employeeName || employee?.name || 'Employee',
    employeeId: employee?._id || (typeof expense.employeeId === 'string' ? expense.employeeId : ''),
    particulars: expense.particulars,
    date: expense.incurredDate,
    amount: expense.amountPaise / 100,
    paidBy: '',
    task: expense.taskId,
    status: expense.state === 'approved' ? 'Approved' : expense.state === 'rejected' ? 'Rejected' : 'Applied',
    paid: false,
  };
}

export const ReimbursementView: React.FC = () => {
  const [activeType, setActiveType] = useState<'internal' | 'task'>('internal');
  const [claims, setClaims] = useState<ReimbursementClaim[]>(() => teamStore.getReimbursements());
  const [taskClaims, setTaskClaims] = useState<ReimbursementClaim[]>([]);
  const [expenseTasks, setExpenseTasks] = useState<TaskItem[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseTaskId, setExpenseTaskId] = useState('');
  const [expenseParticulars, setExpenseParticulars] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseError, setExpenseError] = useState('');
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('This FY');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedClaims = activeType === 'task' ? taskClaims : claims.filter((claim) => claim.type === 'internal');
  const currentClaims = selectedClaims.filter((c) => {
    const matchesSearch =
      !searchQuery.trim() ||
      c.applicant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.particulars && c.particulars.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.client && c.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.task && c.task.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All Status' ||
      (statusFilter === 'Paid' && c.paid) ||
      (statusFilter === 'Not Paid' && !c.paid) ||
      c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const reloadTaskExpenses = async () => {
    try {
      const records = await financialApi.listExpenses();
      setTaskClaims(records.map(expenseToClaim));
      setExpenseError('');
    } catch {
      setExpenseError('Task expenses could not be loaded from the backend.');
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void reloadTaskExpenses(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleApproveClaim = (id: string) => {
    if (activeType === 'task') {
      void financialApi.setExpenseState(id, 'approved').then(() => reloadTaskExpenses()).catch(() => setExpenseError('Expense approval failed.'));
      return;
    }
    teamStore.updateReimbursementStatus(id, 'Approved', true);
    setClaims(teamStore.getReimbursements());
  };

  const handleRejectClaim = (id: string) => {
    if (activeType === 'task') {
      void financialApi.setExpenseState(id, 'rejected').then(() => reloadTaskExpenses()).catch(() => setExpenseError('Expense rejection failed.'));
      return;
    }
    teamStore.updateReimbursementStatus(id, 'Rejected', false);
    setClaims(teamStore.getReimbursements());
  };

  const openExpenseForm = async () => {
    setExpenseError('');
    try {
      const response = await taskApi.getTasks({ limit: 100 });
      setExpenseTasks(response.data || []);
      setShowExpenseForm(true);
    } catch {
      setExpenseError('Tasks could not be loaded.');
    }
  };

  const submitTaskExpense = async () => {
    const amountPaise = Math.round(Number(expenseAmount) * 100);
    if (!expenseTaskId || !expenseParticulars.trim() || !Number.isSafeInteger(amountPaise) || amountPaise <= 0 || !expenseDate) {
      setExpenseError('Select a task and enter the expense details and amount.');
      return;
    }
    setExpenseLoading(true);
    try {
      await financialApi.createExpense({
        taskId: expenseTaskId,
        particulars: expenseParticulars.trim(),
        incurredDate: expenseDate,
        amountPaise,
        idempotencyKey: crypto.randomUUID(),
      });
      setShowExpenseForm(false);
      setExpenseParticulars('');
      setExpenseAmount('');
      setExpenseTaskId('');
      await reloadTaskExpenses();
    } catch (error) {
      setExpenseError(error instanceof Error ? error.message : 'Expense submission failed.');
    } finally {
      setExpenseLoading(false);
    }
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
    <div className="w-full flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Type Pills */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveType('internal')}
            style={activeType === 'internal' ? { backgroundColor: 'var(--premium-blue-dark)' } : undefined}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeType === 'internal'
                ? 'text-white shadow-sm'
                : 'bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#162032]'
            }`}
          >
            Internal
          </button>
          <button
            onClick={() => setActiveType('task')}
            style={activeType === 'task' ? { backgroundColor: 'var(--premium-blue-dark)' } : undefined}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeType === 'task'
                ? 'text-white shadow-sm'
                : 'bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#162032]'
            }`}
          >
            Task Expense
          </button>
        </div>

        {activeType === 'task' && (
          <button
            type="button"
            onClick={() => void openExpenseForm()}
            style={{ backgroundColor: 'var(--premium-blue-dark)' }}
            className="h-10 px-4 rounded-md text-xs font-semibold text-white hover:opacity-90 cursor-pointer shadow-sm"
          >
            + Add Task Expense
          </button>
        )}
      </div>

      {expenseError && <div role="alert" className="rounded-md border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">{expenseError}</div>}
      {showExpenseForm && <section className="grid grid-cols-1 gap-3 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 sm:grid-cols-2 shadow-sm" aria-label="Submit task expense">
        <label className="flex flex-col gap-1 text-xs text-gray-700 dark:text-gray-300">Task<select value={expenseTaskId} onChange={(event) => setExpenseTaskId(event.target.value)} className="h-10 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white px-2"><option value="">Select task</option>{expenseTasks.map((task) => <option key={task.taskId} value={task.taskId}>{task.taskId} · {task.clientName} · {task.serviceName}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs text-gray-700 dark:text-gray-300">Particulars<input value={expenseParticulars} onChange={(event) => setExpenseParticulars(event.target.value)} maxLength={300} className="h-10 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white px-2" /></label>
        <label className="flex flex-col gap-1 text-xs text-gray-700 dark:text-gray-300">Incurred date<input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} className="h-10 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white px-2" /></label>
        <label className="flex flex-col gap-1 text-xs text-gray-700 dark:text-gray-300">Amount (₹)<input type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} className="h-10 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white px-2" /></label>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setShowExpenseForm(false)} className="h-9 px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#162032] text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-50 dark:hover:bg-[#334155] cursor-pointer">Cancel</button><button type="button" disabled={expenseLoading} onClick={() => void submitTaskExpense()} style={{ backgroundColor: 'var(--premium-blue-dark)' }} className="h-9 px-3 rounded-md text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">{expenseLoading ? 'Submitting…' : 'Submit expense'}</button></div>
      </section>}

      {/* Date Filter, Status Filter & Search toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setDateFilterOpen(!dateFilterOpen)}
              className="h-10 flex items-center gap-2 px-3 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#475569] rounded-md shadow-2xs hover:bg-gray-50 dark:hover:bg-[#162032] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{selectedRange}</span>
              <span className="text-gray-400">▾</span>
            </button>

            {/* Date Range Dropdown Popover */}
            {dateFilterOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-[#1e293b] rounded-md shadow-xl border border-[#dde2e8] dark:border-[#334155] py-1.5 z-30 animate-fadeIn">
                {ranges.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setSelectedRange(r);
                      setDateFilterOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${selectedRange === r
                        ? 'bg-[#EEF2FF] dark:bg-[#162032] text-[#31719B] dark:text-[#60a5fa] font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#334155]'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 text-xs rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#31719B]"
          >
            <option value="All Status">All Status</option>
            <option value="Applied">Applied</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Paid">Paid</option>
            <option value="Not Paid">Not Paid</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search claims..."
              className="h-10 w-64 text-xs pl-9 pr-3 border border-[#dde2e8] dark:border-[#475569] rounded-md bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#31719B]"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Reimbursement Table */}
      <div className="border border-[#dde2e8] dark:border-[#334155] rounded-lg overflow-x-auto bg-white dark:bg-[#1e293b]">
        <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
          <thead style={{ backgroundColor: "var(--orange-havy-light)" }}>
            <tr>
              <th className="py-3 px-3.5 w-8 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-[#31719B] cursor-pointer" />
              </th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Date</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Particulars</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Amount</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Method</th>
              {activeType === 'internal' ? (
                <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Paid By</th>
              ) : (
                <>
                  <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Client</th>
                  <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Task</th>
                </>
              )}
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Status</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Paid</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Linked To</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Remarks</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-b border-[#dde2e8] dark:border-[#334155]">Attachments</th>
              <th className="py-3 px-3.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-[#dde2e8] dark:border-[#334155] text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
              {currentClaims.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                    No {activeType} reimbursement records found for the selected period.
                  </td>
                </tr>
              ) : (
                currentClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50/60 dark:hover:bg-[#131d30] transition-colors">
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-[#31719B] cursor-pointer" />
                    </td>
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300">{claim.date}</td>
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white max-w-xs truncate" title={claim.particulars}>
                      {claim.particulars}
                    </td>
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-bold text-gray-900 dark:text-white">
                      ₹{claim.amount.toLocaleString('en-IN')}.00
                    </td>
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-400">{claim.method || 'UPI'}</td>

                    {activeType === 'internal' ? (
                      <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 font-medium">{claim.paidBy}</td>
                    ) : (
                      <>
                        <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-900 dark:text-white font-medium">{claim.client || '-'}</td>
                        <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-400">{claim.task || '-'}</td>
                      </>
                    )}

                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-medium text-[11px] border ${claim.status === 'Approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                            : claim.status === 'Rejected'
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/40'
                              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40'
                          }`}
                      >
                        {claim.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      {claim.paid ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          No
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-400">{claim.linkedTo || '-'}</td>
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-500 dark:text-gray-400 max-w-xs truncate" title={claim.remarks}>
                      {claim.remarks || '-'}
                    </td>
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      {claim.attachments ? (
                        <span className="text-[#31719B] dark:text-[#60a5fa] font-medium hover:underline cursor-pointer flex items-center gap-1">
                          📎 {claim.attachments}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                      {claim.status === 'Applied' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleApproveClaim(claim.id)}
                            title="Approve & Mark Paid"
                            className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRejectClaim(claim.id)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
};
