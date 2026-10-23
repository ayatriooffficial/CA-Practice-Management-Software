import {
  ATTENDANCE_CONSTANTS,
} from './attendance.constants';
import {
  toISTDateString,
  getISTMinutesSinceMidnight,
  parseTimeToMinutes,
  formatISTTimeDisplay,
  toISTTimeString,
} from '../../shared/utils/istDate';
import { DailyAttendanceBadge, AttendancePunctuality } from './attendance.interface';

export interface UserContext {
  id: string;
  name: string;
  joiningDate?: string | Date | null;
  resignationDate?: string | Date | null;
  shiftStart?: string; // e.g. "09:30" or "09:30 AM"
  shiftEnd?: string;   // e.g. "18:30" or "06:30 PM"
}

export interface DayStatusEvaluationResult {
  counted: boolean;
  badge: DailyAttendanceBadge;
  punctuality: AttendancePunctuality;
  clockInText: string;
  clockOutText: string;
  totalHoursText: string;
  inTime: string;  // e.g. "09:25"
  outTime: string; // e.g. "18:30"
  durationMinutes: number;
  leaveType?: string;
  holidayName?: string;
}

/**
 * Pure evaluation function for daily attendance status.
 * Order of evaluation:
 * 1. Before joining date or after resignation => not counted.
 * 2. Holiday
 * 3. Week Off (Sunday)
 * 4. On Leave / Half Day (approved leave)
 * 5. Present (punch-in exists) -> On Time vs Late (shiftStart + 15m grace)
 * 6. Otherwise Absent for past working days, "-" for today before shift ends, and nothing for future dates.
 */
export function evaluateDailyStatus(params: {
  user: UserContext;
  dateStr: string; // "YYYY-MM-DD"
  punchRecord?: {
    punchIn?: Date | null;
    punchOut?: Date | null;
    breakMinutes?: number;
    totalMinutes?: number;
  } | null;
  holiday?: { name: string } | null;
  approvedLeave?: { leaveType: string; days: number } | null;
  serverNow?: Date;
}): DayStatusEvaluationResult {
  const { user, dateStr, punchRecord, holiday, approvedLeave } = params;
  const now = params.serverNow || new Date();
  const todayIST = toISTDateString(now);

  // Default result
  const result: DayStatusEvaluationResult = {
    counted: true,
    badge: '-',
    punctuality: '-',
    clockInText: '00:00',
    clockOutText: '00:00',
    totalHoursText: '00h:00m',
    inTime: '00:00',
    outTime: '00:00',
    durationMinutes: 0,
  };

  // 1. Joining and Resignation checks
  if (user.joiningDate) {
    const joinStr = typeof user.joiningDate === 'string'
      ? user.joiningDate.slice(0, 10)
      : toISTDateString(user.joiningDate);
    if (dateStr < joinStr) {
      result.counted = false;
      result.badge = '-';
      return result;
    }
  }

  if (user.resignationDate) {
    const resignStr = typeof user.resignationDate === 'string'
      ? user.resignationDate.slice(0, 10)
      : toISTDateString(user.resignationDate);
    if (dateStr > resignStr) {
      result.counted = false;
      result.badge = '-';
      return result;
    }
  }

  // 2. Holiday
  if (holiday) {
    result.badge = 'Holiday';
    result.holidayName = holiday.name;
    return result;
  }

  // 3. Week Off (Sunday by default)
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  if (dayOfWeek === ATTENDANCE_CONSTANTS.DEFAULT_WEEK_OFF_DAY) {
    result.badge = 'Week Off';
    return result;
  }

  // 4. On Leave / Half Day (Approved Leave)
  if (approvedLeave) {
    if (approvedLeave.days === 0.5) {
      result.badge = 'Half Day';
    } else {
      result.badge = 'On Leave';
    }
    result.leaveType = approvedLeave.leaveType;
    return result;
  }

  // 5. Present (if punchIn exists)
  if (punchRecord && punchRecord.punchIn) {
    result.badge = 'Present';

    const pIn = new Date(punchRecord.punchIn);
    const inMins = getISTMinutesSinceMidnight(pIn);
    const shiftStartMins = parseTimeToMinutes(
      user.shiftStart || ATTENDANCE_CONSTANTS.DEFAULT_SHIFT_START
    );
    const thresholdMins = shiftStartMins + ATTENDANCE_CONSTANTS.GRACE_PERIOD_MINUTES;

    result.punctuality = inMins <= thresholdMins ? 'On Time' : 'Late';
    result.clockInText = formatISTTimeDisplay(pIn);
    result.inTime = toISTTimeString(pIn).slice(0, 5);

    if (punchRecord.punchOut) {
      const pOut = new Date(punchRecord.punchOut);
      result.clockOutText = formatISTTimeDisplay(pOut);
      result.outTime = toISTTimeString(pOut).slice(0, 5);

      const diffMs = Math.max(0, pOut.getTime() - pIn.getTime());
      const breakMs = (punchRecord.breakMinutes || 0) * 60 * 1000;
      const effectiveMs = Math.max(0, diffMs - breakMs);
      const effectiveMins = Math.floor(effectiveMs / 60000);

      result.durationMinutes = effectiveMins;
      const hours = Math.floor(effectiveMins / 60);
      const mins = effectiveMins % 60;
      result.totalHoursText = `${String(hours).padStart(2, '0')}h:${String(mins).padStart(2, '0')}m`;
    } else {
      // Open session
      result.clockOutText = '-';
      result.outTime = '-';
      if (dateStr === todayIST) {
        // Active today
        const diffMs = Math.max(0, now.getTime() - pIn.getTime());
        const breakMs = (punchRecord.breakMinutes || 0) * 60 * 1000;
        const effectiveMs = Math.max(0, diffMs - breakMs);
        const effectiveMins = Math.floor(effectiveMs / 60000);
        result.durationMinutes = effectiveMins;
        const hours = Math.floor(effectiveMins / 60);
        const mins = effectiveMins % 60;
        result.totalHoursText = `${String(hours).padStart(2, '0')}h:${String(mins).padStart(2, '0')}m`;
      } else {
        // Missed punch-out from a previous day
        result.clockOutText = 'Missed';
        result.outTime = 'Missed';
      }
    }
    return result;
  }

  // 6. Otherwise: Absent for past working days, "-" for today before shift ends, nothing for future dates
  if (dateStr > todayIST) {
    // Future date
    result.badge = '-';
    return result;
  }

  if (dateStr === todayIST) {
    const shiftEndMins = parseTimeToMinutes(
      user.shiftEnd || ATTENDANCE_CONSTANTS.DEFAULT_SHIFT_END
    );
    const nowMins = getISTMinutesSinceMidnight(now);
    if (nowMins < shiftEndMins) {
      result.badge = '-'; // shift has not ended yet
    } else {
      result.badge = 'Absent';
    }
    return result;
  }

  // Past working day without punch
  result.badge = 'Absent';
  return result;
}
