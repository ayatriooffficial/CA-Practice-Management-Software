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
  const [searchQuery, setSearchQuery] = useState('');

  const selectedClaims = activeType === 'task' ? taskClaims : claims.filter((claim) => claim.type === 'internal');
  const currentClaims = selectedClaims.filter((c) => (
    !searchQuery.trim() ||
    c.applicant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.particulars && c.particulars.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.client && c.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.task && c.task.toLowerCase().includes(searchQuery.toLowerCase()))
  ));

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
    <div className="p-6 space-y-5">
      {/* Type Pills */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveType('internal')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${activeType === 'internal'
              ? 'bg-[#3D6A9E] text-white shadow-sm shadow-[#3D6A9E]/20'
              : 'bg-white dark:bg-[#1e293b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#162032]'
            }`}
        >
          Internal
        </button>
        <button
          onClick={() => setActiveType('task')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${activeType === 'task'
              ? 'bg-[#3D6A9E] text-white shadow-sm shadow-[#3D6A9E]/20'
              : 'bg-white dark:bg-[#1e293b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#162032]'
            }`}
        >
          Task
        </button>
      </div>

      {activeType === 'task' && <div className="flex justify-end"><button type="button" onClick={() => void openExpenseForm()} className="rounded-lg bg-[#3D6A9E] hover:bg-[#315782] px-4 py-2 text-xs font-semibold text-white cursor-pointer">Add task expense</button></div>}
      {expenseError && <div role="alert" className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">{expenseError}</div>}
      {showExpenseForm && <section className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 sm:grid-cols-2 shadow-2xs" aria-label="Submit task expense">
        <label className="flex flex-col gap-1 text-xs text-gray-700 dark:text-gray-300">Task<select value={expenseTaskId} onChange={(event) => setExpenseTaskId(event.target.value)} className="h-10 rounded-lg border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white px-2"><option value="">Select task</option>{expenseTasks.map((task) => <option key={task.taskId} value={task.taskId}>{task.taskId} · {task.clientName} · {task.serviceName}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs text-gray-700 dark:text-gray-300">Particulars<input value={expenseParticulars} onChange={(event) => setExpenseParticulars(event.target.value)} maxLength={300} className="h-10 rounded-lg border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white px-2" /></label>
        <label className="flex flex-col gap-1 text-xs text-gray-700 dark:text-gray-300">Incurred date<input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} className="h-10 rounded-lg border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white px-2" /></label>
        <label className="flex flex-col gap-1 text-xs text-gray-700 dark:text-gray-300">Amount (₹)<input type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} className="h-10 rounded-lg border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white px-2" /></label>
        <p className="text-xs text-gray-500 dark:text-gray-400 sm:col-span-2">Submitted expenses are pending approval and do not affect report profit until approved.</p>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setShowExpenseForm(false)} className="rounded-lg border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#162032] text-gray-700 dark:text-gray-300 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-[#334155] cursor-pointer">Cancel</button><button type="button" disabled={expenseLoading} onClick={() => void submitTaskExpense()} className="rounded-lg bg-[#3D6A9E] hover:bg-[#315782] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">{expenseLoading ? 'Submitting…' : 'Submit expense'}</button></div>
      </section>}

      {/* 6 Summary Stat Cards Matching Screenshot 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-[#334155] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-[#3D6A9E] dark:text-[#60a5fa]">₹{totalAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Total ({currentClaims.length})</div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#0f172a] text-[#3D6A9E] dark:text-[#60a5fa] flex items-center justify-center text-xs font-bold">
            ₹
          </div>
        </div>

        {/* Applied */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-[#334155] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">₹{appliedAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Applied ({appliedCount})</div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
            ⏳
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-[#334155] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{approvedAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Approved ({approvedCount})</div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
            ✓
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-[#334155] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-red-600 dark:text-red-400">₹{rejectedAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Rejected ({rejectedCount})</div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center text-xs">
            ✕
          </div>
        </div>

        {/* Paid */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-[#334155] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-teal-600 dark:text-teal-400">₹{paidAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Paid ({paidCount})</div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs">
            💳
          </div>
        </div>

        {/* Not Paid */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-[#334155] p-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">₹{notPaidAmount.toLocaleString('en-IN')}.00</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Not Paid ({notPaidCount})</div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
            ⏱
          </div>
        </div>
      </div>

      {/* Date Filter & Search toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
        <div className="relative">
          <button
            onClick={() => setDateFilterOpen(!dateFilterOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#3D6A9E] dark:text-[#60a5fa] bg-white dark:bg-[#1e293b] border border-[#3D6A9E]/40 dark:border-[#475569] rounded-lg shadow-2xs hover:bg-[#EEF2FF]/40 dark:hover:bg-[#162032] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#3D6A9E] dark:text-[#60a5fa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{selectedRange}</span>
            <span className="text-gray-400">˅</span>
          </button>

          {/* Date Range Dropdown Popover */}
          {dateFilterOpen && (
            <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-gray-200 dark:border-[#334155] py-1.5 z-30 animate-fadeIn">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setSelectedRange(r);
                    setDateFilterOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${selectedRange === r
                      ? 'bg-[#EEF2FF] dark:bg-[#162032] text-[#3D6A9E] dark:text-[#60a5fa] font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#334155]'
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
              className="w-56 text-xs pl-8 pr-3 py-1.5 border border-gray-300 dark:border-[#475569] rounded-lg bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
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

          <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#162032] transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Reimbursement Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] overflow-hidden shadow-2xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#162032] text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-[#334155]">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] cursor-pointer" />
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
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
              {currentClaims.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-400">
                    No {activeType} reimbursement records found for the selected period.
                  </td>
                </tr>
              ) : (
                currentClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50/60 dark:hover:bg-[#131d30] transition-colors">
                    <td className="py-3 px-3">
                      <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] cursor-pointer" />
                    </td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{claim.date}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white max-w-xs truncate" title={claim.particulars}>
                      {claim.particulars}
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                      ₹{claim.amount.toLocaleString('en-IN')}.00
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{claim.method || 'UPI'}</td>

                    {activeType === 'internal' ? (
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">{claim.paidBy}</td>
                    ) : (
                      <>
                        <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{claim.client || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{claim.task || '-'}</td>
                      </>
                    )}

                    <td className="py-3 px-3">
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

                    <td className="py-3 px-3">
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

                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{claim.linkedTo || '-'}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 max-w-xs truncate" title={claim.remarks}>
                      {claim.remarks || '-'}
                    </td>
                    <td className="py-3 px-3">
                      {claim.attachments ? (
                        <span className="text-[#3D6A9E] dark:text-[#60a5fa] font-medium hover:underline cursor-pointer flex items-center gap-1">
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
    </div>
  );
};
