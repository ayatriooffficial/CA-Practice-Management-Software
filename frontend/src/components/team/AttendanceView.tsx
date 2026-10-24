'use client';

import React, { useState } from 'react';
import {
  TodayAttendanceRecord,
  RegularizationRecord,
  AttendanceStatus,
} from './types';
import { teamStore } from './teamStore';

type AttendanceSubTab = 'today' | 'weekly' | 'monthly' | 'regularization';

export const AttendanceView: React.FC = () => {
  const [subTab, setSubTab] = useState<AttendanceSubTab>('today');
  const [todayRecords, setTodayRecords] = useState<TodayAttendanceRecord[]>(() => teamStore.getTodayAttendance());
  const [regularizations, setRegularizations] = useState<RegularizationRecord[]>(() => teamStore.getRegularizations());
  const [selectedDate, setSelectedDate] = useState('2026-10-21');

  React.useEffect(() => {
    teamStore.syncTodayAttendanceFromBackend().then((recs) => {
      if (recs && recs.length > 0) setTodayRecords(recs);
    });
  }, []);

  const employees = teamStore.getEmployees().filter((e) => e.status === 'Active');

  const handleApproveReg = (id: string) => {
    teamStore.updateRegularizationStatus(id, 'Approved');
    setRegularizations(teamStore.getRegularizations());
  };

  const handleRejectReg = (id: string) => {
    teamStore.updateRegularizationStatus(id, 'Rejected');
    setRegularizations(teamStore.getRegularizations());
  };

  // Weekly data generator for Oct 18 - Oct 24, 2026
  const weekDays = [
    { date: 18, day: 'Sun', isWeekend: true },
    { date: 19, day: 'Mon', isWeekend: false },
    { date: 20, day: 'Tue', isWeekend: false },
    { date: 21, day: 'Wed', isWeekend: false, isToday: true },
    { date: 22, day: 'Thu', isWeekend: false, isFuture: true },
    { date: 23, day: 'Fri', isWeekend: false, isFuture: true },
    { date: 24, day: 'Sat', isWeekend: true, isFuture: true },
  ];

  const getWeeklyStatus = (empId: string, day: typeof weekDays[0]): AttendanceStatus => {
    if (day.isWeekend) return 'WK';
    if (day.isFuture) return 'future';
    return 'P';
  };

  const renderBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'P':
        return (
          <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[10px] inline-flex items-center justify-center">
            P
          </span>
        );
      case 'A':
        return (
          <span className="w-6 h-6 rounded-full bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[10px] inline-flex items-center justify-center">
            A
          </span>
        );
      case 'WK':
        return (
          <span className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold text-[9px] inline-flex items-center justify-center">
            WK
          </span>
        );
      case 'HLY':
        return (
          <span className="w-6 h-6 rounded-full bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 font-bold text-[8px] inline-flex items-center justify-center">
            HLY
          </span>
        );
      case '1st-half':
        return (
          <span className="w-6 h-6 rounded-full bg-gray-900 dark:bg-gray-700 text-white font-bold text-[8px] inline-flex items-center justify-center">
            ½
          </span>
        );
      case '2nd-half':
        return (
          <span className="w-6 h-6 rounded-full bg-gray-700 dark:bg-gray-600 text-white font-bold text-[8px] inline-flex items-center justify-center">
            ½
          </span>
        );
      case 'future':
        return (
          <span className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600 inline-flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Sub Tabs Pill Bar */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#162032] p-1 rounded-xl w-fit border border-transparent dark:border-[#334155]">
        <button
          onClick={() => setSubTab('today')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${subTab === 'today'
              ? 'bg-[#EEF2FF] dark:bg-[#1e293b] text-[#3D6A9E] dark:text-[#60a5fa] shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          Today's Attendance
        </button>
        <button
          onClick={() => setSubTab('weekly')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${subTab === 'weekly'
              ? 'bg-[#EEF2FF] dark:bg-[#1e293b] text-[#3D6A9E] dark:text-[#60a5fa] shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          Weekly Attendance
        </button>
        <button
          onClick={() => setSubTab('monthly')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${subTab === 'monthly'
              ? 'bg-[#EEF2FF] dark:bg-[#1e293b] text-[#3D6A9E] dark:text-[#60a5fa] shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          Monthly Attendance
        </button>
        <button
          onClick={() => setSubTab('regularization')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${subTab === 'regularization'
              ? 'bg-[#EEF2FF] dark:bg-[#1e293b] text-[#3D6A9E] dark:text-[#60a5fa] shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
          Regularization
        </button>
      </div>

      {/* 1. TODAY'S ATTENDANCE */}
      {subTab === 'today' && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] overflow-hidden shadow-2xs transition-colors">
          {/* Header Controls */}
          <div className="p-4 border-b border-gray-200 dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Today Attendance List ({todayRecords.length})
            </h3>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs px-3 py-1.5 border border-gray-300 dark:border-[#475569] rounded-lg bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#3D6A9E]"
              />
              <button
                title="Download report"
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-[#475569] rounded-lg hover:bg-gray-50 dark:hover:bg-[#162032] transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-[#162032] text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-[#334155]">
                <tr>
                  <th className="py-3 px-4">Team Members</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Clock In</th>
                  <th className="py-3 px-3">Clock Out</th>
                  <th className="py-3 px-3">Total Hours</th>
                  <th className="py-3 px-3">Work Location</th>
                  <th className="py-3 px-3">In</th>
                  <th className="py-3 px-3">Out</th>
                  <th className="py-3 px-3">Distance (Radius)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
                {todayRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-[#131d30] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#EEF2FF] dark:bg-[#0f172a] text-[#3D6A9E] dark:text-[#60a5fa] font-bold text-[11px] flex items-center justify-center border border-[#3D6A9E]/20">
                          {r.initials}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {r.status === 'P' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          Present
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40">
                          Absent
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{r.clockIn}</td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{r.clockOut}</td>
                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{r.totalHours}</td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{r.workLocation}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{r.inTime}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{r.outTime}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{r.distanceRadius}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. WEEKLY ATTENDANCE */}
      {subTab === 'weekly' && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] overflow-hidden shadow-2xs p-6 space-y-6 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Weekly Attendance
              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#162032] text-gray-600 dark:text-gray-400 text-xs font-semibold border border-transparent dark:border-[#334155]">
                {employees.length}
              </span>
            </h3>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#0f172a] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#475569]">
                <button className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">‹</button>
                <span>Oct 18 - Oct 24, 2026</span>
                <button className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">›</button>
              </div>
              <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-[#475569] rounded-lg hover:bg-gray-50 dark:hover:bg-[#162032] transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-[#334155] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#162032] text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-[#334155]">
                <tr>
                  <th className="py-3 px-4 w-64">Employee Name</th>
                  {weekDays.map((d) => (
                    <th key={d.date} className="py-3 px-3 text-center">
                      <div>{d.date}</div>
                      <div className="text-[10px] text-gray-400 lowercase">{d.day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-[#131d30] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#EEF2FF] dark:bg-[#0f172a] text-[#3D6A9E] dark:text-[#60a5fa] font-bold text-[11px] flex items-center justify-center border border-[#3D6A9E]/20">
                            {emp.initials}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">{emp.name}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-[#162032] text-gray-600 dark:text-gray-400 font-medium border border-transparent dark:border-[#334155]">
                          Active
                        </span>
                      </div>
                    </td>

                    {weekDays.map((d) => (
                      <td key={d.date} className="py-3.5 px-3 text-center">
                        {renderBadge(getWeeklyStatus(emp.id, d))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-gray-100 dark:border-[#334155] text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[9px] flex items-center justify-center">P</span>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[9px] flex items-center justify-center">A</span>
              <span>Absent/Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-900 dark:bg-gray-700 text-white font-bold text-[8px] flex items-center justify-center">½</span>
              <span>1st half Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-700 dark:bg-gray-600 text-white font-bold text-[8px] flex items-center justify-center">½</span>
              <span>2nd half Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold text-[8px] flex items-center justify-center">WK</span>
              <span>Week Off</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 font-bold text-[8px] flex items-center justify-center">HLY</span>
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-400 flex items-center justify-center text-[9px]">⏱</span>
              <span>Future Date</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONTHLY ATTENDANCE */}
      {subTab === 'monthly' && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] overflow-hidden shadow-2xs p-6 space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Monthly Attendance (October 2026)
            </h3>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#0f172a] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#475569]">
              <button className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">‹</button>
              <span>October 2026</span>
              <button className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">›</button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-[#334155] rounded-xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-[#162032] text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-[#334155]">
                <tr>
                  <th className="py-3 px-4 sticky left-0 bg-gray-50 dark:bg-[#162032] z-10 border-r border-gray-200 dark:border-[#334155]">Employee Name</th>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <th key={d} className="py-3 px-2 text-center w-8">
                      {d}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">Present</th>
                  <th className="py-3 px-3 text-center bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300">Absent</th>
                  <th className="py-3 px-3 text-center bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">Week Off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
                {employees.map((emp) => {
                  let presentCount = 0;
                  let absentCount = 0;
                  let wkCount = 0;

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-[#131d30] transition-colors">
                      <td className="py-3 px-4 sticky left-0 bg-white dark:bg-[#1e293b] font-medium text-gray-900 dark:text-white shadow-xs border-r border-gray-100 dark:border-[#334155]">
                        {emp.name}
                      </td>
                      {Array.from({ length: 31 }, (_, i) => {
                        const dayNum = i + 1;
                        let st: AttendanceStatus = 'future';
                        if (dayNum > 21) {
                          st = 'future';
                        } else if ([4, 11, 18, 25].includes(dayNum)) {
                          st = 'WK';
                          wkCount++;
                        } else {
                          st = 'P';
                          presentCount++;
                        }

                        return (
                          <td key={dayNum} className="py-3 px-1 text-center">
                            {renderBadge(st)}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20">{presentCount}</td>
                      <td className="py-3 px-3 text-center font-bold text-red-700 dark:text-red-400 bg-red-50/40 dark:bg-red-950/20">{absentCount}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20">{wkCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. REGULARIZATION */}
      {subTab === 'regularization' && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] overflow-hidden shadow-2xs transition-colors">
          <div className="p-4 border-b border-gray-200 dark:border-[#334155] flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Regularization Requests ({regularizations.length})
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Review and approve employee punch regularization requests
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-[#162032] text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-[#334155]">
                <tr>
                  <th className="py-3 px-4 text-center w-24">Actions</th>
                  <th className="py-3 px-3">Approval Status</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Punch In</th>
                  <th className="py-3 px-3">Punch Out</th>
                  <th className="py-3 px-3">Total Hours</th>
                  <th className="py-3 px-3">Work Location</th>
                  <th className="py-3 px-3">Punch In Loc</th>
                  <th className="py-3 px-3">Punch Out Loc</th>
                  <th className="py-3 px-4">Office Location</th>
                  <th className="py-3 px-3">Radius</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
                {regularizations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50/60 dark:hover:bg-[#131d30] transition-colors">
                    {/* Actions Column in First Position matching screenshot */}
                    <td className="py-3 px-4 text-center">
                      {reg.approvalStatus === 'Pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleApproveReg(reg.id)}
                            title="Approve"
                            className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRejectReg(reg.id)}
                            title="Reject"
                            className="p-1 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-medium text-[11px] border ${reg.approvalStatus === 'Approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                            : reg.approvalStatus === 'Rejected'
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/40'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
                          }`}
                      >
                        {reg.approvalStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300 max-w-xs truncate" title={reg.reason}>
                      {reg.reason}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{reg.employeeName}</td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{reg.date}</td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{reg.punchIn}</td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{reg.punchOut}</td>
                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{reg.totalHours}</td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{reg.workLocation}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{reg.punchInLocation}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{reg.punchOutLocation}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{reg.officeLocation}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{reg.distanceRadius}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
