import mongoose from 'mongoose';
import {
  AttendanceModel,
  HolidayModel,
  OfficeNoticeModel,
  LeaveModel,
} from './attendance.model';
import { UserModel } from '../auth/user.model';
import {
  toISTDateString,
  getNowIST,
  offsetISTDate,
  getISTMinutesSinceMidnight,
  parseTimeToMinutes,
} from '../../shared/utils/istDate';
import {
  ATTENDANCE_CONSTANTS,
  calculateDistanceMeters,
} from './attendance.constants';
import { evaluateDailyStatus, UserContext } from './attendance.status';

export type HomeViewMode = 'admin' | 'employee';

export function getHomeViewMode(user: { role?: string }): HomeViewMode {
  const role = (user.role || '').toLowerCase();
  if (role === 'admin') {
    return 'admin';
  }
  // Partner, Manager, and Employee currently use employee view per specification
  return 'employee';
}

export class AttendanceService {
  /**
   * PUNCH IN (Caller only, server clock is sole source of truth)
   */
  static async punchIn(params: {
    firmId: string;
    userId: string;
    geo?: { lat: number; lng: number; accuracy?: number };
  }) {
    const now = getNowIST();
    const todayStr = toISTDateString(now);

    const firmObjId = new mongoose.Types.ObjectId(params.firmId);
    const userObjId = new mongoose.Types.ObjectId(params.userId);

    // Check existing punch for today
    const existing = await AttendanceModel.findOne({
      userId: userObjId,
      date: todayStr,
    });

    if (existing) {
      throw {
        statusCode: 409,
        message: 'You have already punched in for today.',
      };
    }

    // Lookup user shift details
    const user = await UserModel.findById(userObjId);
    if (!user) {
      throw { statusCode: 404, message: 'User record not found.' };
    }

    // Distance calculation
    let distanceM: number | null = null;
    let workLocation = 'Office';
    if (params.geo && typeof params.geo.lat === 'number' && typeof params.geo.lng === 'number') {
      distanceM = calculateDistanceMeters(
        params.geo.lat,
        params.geo.lng,
        ATTENDANCE_CONSTANTS.OFFICE.lat,
        ATTENDANCE_CONSTANTS.OFFICE.lng
      );
      if (distanceM > ATTENDANCE_CONSTANTS.OFFICE.radiusM) {
        workLocation = 'Field / Outside Office';
      }
    }

    // Punctuality check (shift start + 15 min grace)
    const inMins = getISTMinutesSinceMidnight(now);
    const shiftStartMins = parseTimeToMinutes(ATTENDANCE_CONSTANTS.DEFAULT_SHIFT_START);
    const thresholdMins = shiftStartMins + ATTENDANCE_CONSTANTS.GRACE_PERIOD_MINUTES;
    const punctuality = inMins <= thresholdMins ? 'On Time' : 'Late';

    const record = await AttendanceModel.create({
      firmId: firmObjId,
      userId: userObjId,
      date: todayStr,
      punchIn: now,
      punchOut: null,
      breakMinutes: 0,
      totalMinutes: 0,
      geo: params.geo,
      officeId: ATTENDANCE_CONSTANTS.OFFICE.id,
      distanceM: distanceM,
      source: 'punch',
      status: punctuality,
      workLocation,
    });

    return record;
  }

  /**
   * PUNCH OUT (Caller only)
   */
  static async punchOut(params: { firmId: string; userId: string }) {
    const now = getNowIST();
    const todayStr = toISTDateString(now);

    const userObjId = new mongoose.Types.ObjectId(params.userId);

    const record = await AttendanceModel.findOne({
      userId: userObjId,
      date: todayStr,
    });

    if (!record) {
      throw {
        statusCode: 409,
        message: 'No punch-in session found for today. Please punch in first.',
      };
    }

    if (record.punchOut) {
      throw {
        statusCode: 409,
        message: 'You have already punched out for today.',
      };
    }

    record.punchOut = now;
    const diffMs = Math.max(0, now.getTime() - record.punchIn.getTime());
    const breakMs = (record.breakMinutes || 0) * 60 * 1000;
    record.totalMinutes = Math.floor(Math.max(0, diffMs - breakMs) / 60000);

    await record.save();
    return record;
  }

  /**
   * Automatically check out employee on logout if currently punched in without punch-out
   */
  static async autoCheckoutOnLogout(userId: string) {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;

    const now = getNowIST();
    const todayStr = toISTDateString(now);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const record = await AttendanceModel.findOne({
      userId: userObjId,
      date: todayStr,
    });

    if (record && !record.punchOut && record.punchIn) {
      record.punchOut = now;
      const diffMs = Math.max(0, now.getTime() - record.punchIn.getTime());
      const breakMs = (record.breakMinutes || 0) * 60 * 1000;
      record.totalMinutes = Math.floor(Math.max(0, diffMs - breakMs) / 60000);
      await record.save();
      return record;
    }

    return null;
  }

  /**
   * GET CURRENT STATUS FOR LOGGED IN USER (FOR LIVE PUNCH CARD)
   */
  static async getLivePunchStatus(_firmId: string, userId: string) {
    const now = getNowIST();
    const todayStr = toISTDateString(now);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const todayRecord = await AttendanceModel.findOne({
      userId: userObjId,
      date: todayStr,
    });

    return {
      serverTime: now.toISOString(),
      todayDate: todayStr,
      hasPunchedIn: !!todayRecord,
      hasPunchedOut: !!(todayRecord && todayRecord.punchOut),
      punchIn: todayRecord?.punchIn || null,
      punchOut: todayRecord?.punchOut || null,
      breakMinutes: todayRecord?.breakMinutes || 0,
      totalMinutes: todayRecord?.totalMinutes || 0,
      status: todayRecord?.status || '-',
      shiftHours: ATTENDANCE_CONSTANTS.STANDARD_SHIFT_HOURS,
    };
  }

  /**
   * SUMMARY CARDS (Admin Firm-Wide vs Employee Own)
   */
  static async getSummary(params: {
    firmId: string;
    userId: string;
    role: string;
    period?: 'month' | 'year';
  }) {
    const mode = getHomeViewMode({ role: params.role });
    const now = getNowIST();
    const todayStr = toISTDateString(now);
    const yesterdayStr = offsetISTDate(todayStr, -1);
    const firmObjId = new mongoose.Types.ObjectId(params.firmId);

    if (mode === 'admin') {
      // 1. Total Employees: active users count
      const activeUsers = await UserModel.find({
        orgId: firmObjId,
        status: { $in: ['active', 'Active'] },
      }).lean();

      const totalEmployeesCount = activeUsers.length;

      // Comparison: vs last month (users created or resigned prior to current month)
      const thisMonthPrefix = todayStr.slice(0, 7); // "YYYY-MM"

      // Active employees joined before this month
      const prevMonthCount = activeUsers.filter((u: any) => {
        const createdDate = toISTDateString(u.createdAt || new Date(0));
        return createdDate < `${thisMonthPrefix}-01`;
      }).length || totalEmployeesCount;

      const employeeDelta = totalEmployeesCount - prevMonthCount;
      const employeeDeltaText = employeeDelta >= 0 ? `+${employeeDelta}` : `${employeeDelta}`;

      // Fetch today's punches
      const todayPunches = await AttendanceModel.find({
        firmId: firmObjId,
        date: todayStr,
      }).lean();

      // Fetch yesterday's punches
      const yesterdayPunches = await AttendanceModel.find({
        firmId: firmObjId,
        date: yesterdayStr,
      }).lean();

      // Fetch today's approved leaves
      const todayLeaves = await LeaveModel.find({
        firmId: firmObjId,
        status: 'Approved',
        startDate: { $lte: todayStr },
        endDate: { $gte: todayStr },
      }).lean();

      // Attendance Rate: present today ÷ expected to work today × 100
      const onLeaveCount = todayLeaves.length;
      const expectedWorkingToday = Math.max(1, totalEmployeesCount - onLeaveCount);
      const presentToday = todayPunches.filter((p) => !!p.punchIn).length;
      const attendanceRateToday = Math.round((presentToday / expectedWorkingToday) * 100);

      // Yesterday Attendance Rate
      const yesterdayPresent = yesterdayPunches.filter((p) => !!p.punchIn).length;
      const yesterdayRate = Math.round((yesterdayPresent / expectedWorkingToday) * 100);
      const rateDiff = attendanceRateToday - yesterdayRate;

      // On Time & Late counts
      const onTimeToday = todayPunches.filter((p) => p.status === 'On Time').length;
      const onTimeYesterday = yesterdayPunches.filter((p) => p.status === 'On Time').length;
      const onTimeDiff = onTimeToday - onTimeYesterday;

      const lateToday = todayPunches.filter((p) => p.status === 'Late').length;
      const lateYesterday = yesterdayPunches.filter((p) => p.status === 'Late').length;
      const lateDiff = lateToday - lateYesterday;

      return {
        mode: 'admin',
        cards: [
          {
            id: 'total_employees',
            title: 'Total Employees',
            value: String(totalEmployeesCount).padStart(2, '0'),
            badge: '+100%',
            bar: `${employeeDeltaText} compared to last month`,
          },
          {
            id: 'attendance_rate',
            title: 'Attendance Rate',
            value: String(attendanceRateToday).padStart(2, '0'),
            badge: '+100%',
            bar: `${rateDiff >= 0 ? '+' + rateDiff : rateDiff} compared to yesterday`,
          },
          {
            id: 'on_time',
            title: 'On Time',
            value: String(onTimeToday).padStart(2, '0'),
            badge: '+100%',
            bar: `${onTimeDiff >= 0 ? '+' + onTimeDiff : onTimeDiff} compared to yesterday`,
          },
          {
            id: 'late_clock_in',
            title: 'Late Clock In',
            value: String(lateToday).padStart(2, '0'),
            badge: '+100%',
            bar: `${lateDiff >= 0 ? '+' + lateDiff : lateDiff} compared to yesterday`,
          },
        ],
      };
    } else {
      // EMPLOYEE VIEW (3 cards only, with month / year toggle)
      const userObjId = new mongoose.Types.ObjectId(params.userId);
      const period = params.period === 'year' ? 'year' : 'month';

      const currentYear = todayStr.slice(0, 4);
      const currentMonth = todayStr.slice(0, 7);

      const startDateCurrent = period === 'year' ? `${currentYear}-01-01` : `${currentMonth}-01`;
      const endDateCurrent = todayStr;

      // Previous period for fair comparison (same elapsed range)
      let startDatePrev: string;
      let endDatePrev: string;
      let compareLabel: string;

      if (period === 'year') {
        const prevYear = String(parseInt(currentYear, 10) - 1);
        startDatePrev = `${prevYear}-01-01`;
        endDatePrev = `${prevYear}${todayStr.slice(4)}`; // same month-day in previous year
        compareLabel = 'compared to last year';
      } else {
        const prevMonthDate = offsetISTDate(todayStr, -30);
        const prevMonth = prevMonthDate.slice(0, 7);
        const dayOfMonth = todayStr.slice(8, 10);
        startDatePrev = `${prevMonth}-01`;
        endDatePrev = `${prevMonth}-${dayOfMonth}`;
        compareLabel = 'compared to last month';
      }

      // Fetch user records for current and previous period
      const currentRecords = await AttendanceModel.find({
        userId: userObjId,
        date: { $gte: startDateCurrent, $lte: endDateCurrent },
      }).lean();

      const prevRecords = await AttendanceModel.find({
        userId: userObjId,
        date: { $gte: startDatePrev, $lte: endDatePrev },
      }).lean();

      // Calculate working days elapsed
      const workingDaysCurrent = currentRecords.length || 1;
      const onTimeCurrent = currentRecords.filter((r) => r.status === 'On Time').length;
      const lateCurrent = currentRecords.filter((r) => r.status === 'Late').length;
      const rateCurrent = Math.round(((onTimeCurrent + lateCurrent) / workingDaysCurrent) * 100);

      const workingDaysPrev = prevRecords.length || 1;
      const onTimePrev = prevRecords.filter((r) => r.status === 'On Time').length;
      const latePrev = prevRecords.filter((r) => r.status === 'Late').length;
      const ratePrev = Math.round(((onTimePrev + latePrev) / workingDaysPrev) * 100);

      const rateDiff = rateCurrent - ratePrev;
      const onTimeDiff = onTimeCurrent - onTimePrev;
      const lateDiff = lateCurrent - latePrev;

      return {
        mode: 'employee',
        period,
        cards: [
          {
            id: 'attendance_rate',
            title: 'Attendance Rate',
            value: String(rateCurrent).padStart(2, '0'),
            badge: '+100%',
            bar: `${rateDiff >= 0 ? '+' + rateDiff : rateDiff} ${compareLabel}`,
          },
          {
            id: 'on_time',
            title: 'On Time',
            value: String(onTimeCurrent).padStart(2, '0'),
            badge: '+100%',
            bar: `${onTimeDiff >= 0 ? '+' + onTimeDiff : onTimeDiff} ${compareLabel}`,
          },
          {
            id: 'late_clock_in',
            title: 'Late Clock In',
            value: String(lateCurrent).padStart(2, '0'),
            badge: '+100%',
            bar: `${lateDiff >= 0 ? '+' + lateDiff : lateDiff} ${compareLabel}`,
          },
        ],
      };
    }
  }

  /**
   * TODAY'S ATTENDANCE TABLE (ADMIN ONLY)
   */
  static async getTodayAttendanceAdmin(params: {
    firmId: string;
    dateStr?: string;
  }) {
    const firmObjId = new mongoose.Types.ObjectId(params.firmId);
    const dateStr = params.dateStr || toISTDateString(getNowIST());

    // 1. All active employees of the firm
    const users = await UserModel.find({
      orgId: firmObjId,
      status: { $in: ['active', 'Active'] },
    }).lean();

    // 2. Punches on that date
    const punches = await AttendanceModel.find({
      firmId: firmObjId,
      date: dateStr,
    }).lean();
    const punchMap = new Map(punches.map((p) => [String(p.userId), p]));

    // 3. Holidays on that date
    const holiday = await HolidayModel.findOne({
      firmId: firmObjId,
      date: dateStr,
    }).lean();

    // 4. Approved leaves covering that date
    const leaves = await LeaveModel.find({
      firmId: firmObjId,
      status: 'Approved',
      startDate: { $lte: dateStr },
      endDate: { $gte: dateStr },
    }).lean();
    const leaveMap = new Map(leaves.map((l) => [String(l.userId), l]));

    // Evaluate for each user
    const rows = users.map((u: any) => {
      const uContext: UserContext = {
        id: String(u._id),
        name: u.name,
        joiningDate: u.createdAt,
        shiftStart: ATTENDANCE_CONSTANTS.DEFAULT_SHIFT_START,
        shiftEnd: ATTENDANCE_CONSTANTS.DEFAULT_SHIFT_END,
      };

      const punch = punchMap.get(String(u._id));
      const leave = leaveMap.get(String(u._id));

      const evaluation = evaluateDailyStatus({
        user: uContext,
        dateStr,
        punchRecord: punch,
        holiday,
        approvedLeave: leave ? { leaveType: leave.leaveType, days: leave.days } : null,
      });

      return {
        id: String(u._id),
        employee: {
          id: String(u._id),
          name: u.name,
          initials: u.initials || 'U',
          email: u.email,
        },
        attendanceBadge: evaluation.badge,
        status: evaluation.punctuality,
        clockInAndOut: {
          inTime: evaluation.inTime,
          totalHours: evaluation.totalHoursText,
          outTime: evaluation.outTime,
        },
        location: punch?.workLocation || '-',
        nameOfTheLocation: ATTENDANCE_CONSTANTS.OFFICE.name,
        geoLocation: punch?.geo
          ? `${punch.geo.lat.toFixed(4)}, ${punch.geo.lng.toFixed(4)}`
          : '-',
        officeLocation: ATTENDANCE_CONSTANTS.OFFICE.name,
        distanceRadius: punch?.distanceM != null ? `${punch.distanceM}m` : '-',
        breakMinutes: punch?.breakMinutes ? `${punch.breakMinutes}m` : '00:00',
      };
    });

    return {
      date: dateStr,
      totalEmployees: rows.length,
      rows,
    };
  }

  /**
   * MONTHLY ATTENDANCE RECORDS (EMPLOYEE'S OWN DATA ONLY)
   */
  static async getMonthlyAttendanceUser(params: {
    firmId: string;
    userId: string;
    month?: string; // 'YYYY-MM'
  }) {
    const firmObjId = new mongoose.Types.ObjectId(params.firmId);
    const userObjId = new mongoose.Types.ObjectId(params.userId);
    const now = getNowIST();
    const todayStr = toISTDateString(now);

    const yearMonth = params.month || todayStr.slice(0, 7);

    const user = await UserModel.findById(userObjId).lean();
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    // Exactly previous 5 days and today (no future days per specification)
    const startDate = offsetISTDate(todayStr, -5);
    const endDate = todayStr;

    // Punches in range
    const punches = await AttendanceModel.find({
      userId: userObjId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();
    const punchMap = new Map(punches.map((p) => [p.date, p]));

    // Holidays in range
    const holidays = await HolidayModel.find({
      firmId: firmObjId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();
    const holidayMap = new Map(holidays.map((h) => [h.date, h]));

    // Approved leaves in range
    const leaves = await LeaveModel.find({
      firmId: firmObjId,
      userId: userObjId,
      status: 'Approved',
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    }).lean();

    const uContext: UserContext = {
      id: String(user._id),
      name: user.name,
      joiningDate: user.createdAt,
      shiftStart: ATTENDANCE_CONSTANTS.DEFAULT_SHIFT_START,
      shiftEnd: ATTENDANCE_CONSTANTS.DEFAULT_SHIFT_END,
    };

    const days = [];
    let curDate = startDate;
    while (curDate <= endDate) {
      const punch = punchMap.get(curDate);
      const holiday = holidayMap.get(curDate);
      const leave = leaves.find((l) => l.startDate <= curDate && l.endDate >= curDate);

      const evaluation = evaluateDailyStatus({
        user: uContext,
        dateStr: curDate,
        punchRecord: punch,
        holiday,
        approvedLeave: leave ? { leaveType: leave.leaveType, days: leave.days } : null,
      });

      const [y, m, dayNum] = curDate.split('-').map(Number);
      const dayOfWeekName = new Date(Date.UTC(y, m - 1, dayNum, 12, 0, 0)).toLocaleDateString('en-US', {
        weekday: 'short',
      });

      days.push({
        date: curDate,
        day: dayOfWeekName,
        attendanceBadge: evaluation.badge,
        status: evaluation.punctuality,
        clockIn: evaluation.clockInText,
        clockOut: evaluation.clockOutText,
        totalHours: evaluation.totalHoursText,
        location: punch?.workLocation || '-',
        breakMinutes: punch?.breakMinutes ? `${punch.breakMinutes}m` : '00:00',
        isFuture: false,
      });

      curDate = offsetISTDate(curDate, 1);
    }

    return {
      month: yearMonth,
      user: {
        id: String(user._id),
        name: user.name,
      },
      records: days,
    };
  }

  /**
   * UPCOMING HOLIDAYS
   */
  static async getUpcomingHolidays(firmId: string) {
    const firmObjId = new mongoose.Types.ObjectId(firmId);
    const todayStr = toISTDateString(getNowIST());

    const holidays = await HolidayModel.find({
      firmId: firmObjId,
      date: { $gte: todayStr },
    })
      .sort({ date: 1 })
      .limit(20)
      .lean();

    return holidays.map((h) => {
      const [y, m, d] = h.date.split('-').map(Number);
      const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('en-US', {
        weekday: 'long',
      });
      return {
        id: String(h._id),
        date: h.date,
        holiday: h.name,
        day: dayOfWeek,
        description: h.description || '-',
      };
    });
  }

  /**
   * UPCOMING LEAVES (ADMIN ONLY)
   */
  static async getUpcomingLeaves(firmId: string) {
    const firmObjId = new mongoose.Types.ObjectId(firmId);
    const todayStr = toISTDateString(getNowIST());

    const leaves = await LeaveModel.find({
      firmId: firmObjId,
      status: 'Approved',
      endDate: { $gte: todayStr },
    })
      .sort({ startDate: 1 })
      .limit(20)
      .lean();

    return leaves.map((l) => {
      const [y, m, d] = l.startDate.split('-').map(Number);
      const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('en-US', {
        weekday: 'short',
      });
      return {
        id: String(l._id),
        date: l.startDate,
        name: l.applicant,
        leaveType: l.leaveType,
        day: dayOfWeek,
        status: l.status,
        duration: `${l.days} ${l.days === 1 ? 'day' : 'days'}`,
      };
    });
  }

  /**
   * OFFICE NOTICES (OFFICE NOTICE BOARD)
   */
  static async getOfficeNotices(firmId: string) {
    const firmObjId = new mongoose.Types.ObjectId(firmId);
    const notices = await OfficeNoticeModel.find({ firmId: firmObjId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return notices.map((n) => ({
      id: String(n._id),
      title: n.title,
      body: n.body,
      createdBy: n.createdBy,
      createdAt: n.createdAt,
    }));
  }

  static async createOfficeNotice(params: {
    firmId: string;
    author: { id: string; name: string; role: string };
    title: string;
    body: string;
  }) {
    const firmObjId = new mongoose.Types.ObjectId(params.firmId);
    const notice = await OfficeNoticeModel.create({
      firmId: firmObjId,
      title: params.title.trim(),
      body: params.body.trim(),
      createdBy: params.author,
      createdAt: new Date(),
    });
    return notice;
  }

  static async deleteOfficeNotice(firmId: string, noticeId: string) {
    const firmObjId = new mongoose.Types.ObjectId(firmId);
    const res = await OfficeNoticeModel.deleteOne({
      _id: new mongoose.Types.ObjectId(noticeId),
      firmId: firmObjId,
    });
    return res.deletedCount > 0;
  }
}
