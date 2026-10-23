import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { AttendanceService, getHomeViewMode } from './attendance.service';
import { getNowIST } from '../../shared/utils/istDate';

export class AttendanceController {
  /**
   * Server clock endpoint for client-side timer calibration
   */
  static getServerTime(_req: Request, res: Response) {
    const now = getNowIST();
    return ApiResponse.success(res, {
      serverTime: now.toISOString(),
      timestampMs: now.getTime(),
      timezone: 'Asia/Kolkata',
    });
  }

  /**
   * Live punch status for logged-in user
   */
  static async getLiveStatus(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const status = await AttendanceService.getLivePunchStatus(user.orgId, user.userId);
      return ApiResponse.success(res, status);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch live punch status', err.statusCode || 500);
    }
  }

  /**
   * Punch In
   */
  static async punchIn(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const { geo } = req.body || {};
      const record = await AttendanceService.punchIn({
        firmId: user.orgId,
        userId: user.userId,
        geo,
      });

      return ApiResponse.success(res, record, 'Punched in successfully.', HTTP_STATUS.CREATED);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to punch in', err.statusCode || 500);
    }
  }

  /**
   * Punch Out
   */
  static async punchOut(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const record = await AttendanceService.punchOut({
        firmId: user.orgId,
        userId: user.userId,
      });

      return ApiResponse.success(res, record, 'Punched out successfully.');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to punch out', err.statusCode || 500);
    }
  }

  /**
   * Summary Cards (Role-appropriate)
   */
  static async getSummary(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const period = req.query.period === 'year' ? 'year' : 'month';
      const summary = await AttendanceService.getSummary({
        firmId: user.orgId,
        userId: user.userId,
        role: user.role || 'employee',
        period,
      });

      return ApiResponse.success(res, summary);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch attendance summary', err.statusCode || 500);
    }
  }

  /**
   * Admin: Today's Attendance Table (Strict 403 for non-admins)
   */
  static async getTodayAttendance(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const mode = getHomeViewMode({ role: user.role });
      if (mode !== 'admin') {
        return ApiResponse.error(
          res,
          'Access forbidden. Only administrators can view firm-wide attendance records.',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const dateStr = typeof req.query.date === 'string' ? req.query.date : undefined;
      const data = await AttendanceService.getTodayAttendanceAdmin({
        firmId: user.orgId,
        dateStr,
      });

      return ApiResponse.success(res, data);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch today attendance', err.statusCode || 500);
    }
  }

  /**
   * Employee: Monthly Attendance Records (Caller's own data only)
   */
  static async getMonthlyRecords(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const month = typeof req.query.month === 'string' ? req.query.month : undefined;
      const data = await AttendanceService.getMonthlyAttendanceUser({
        firmId: user.orgId,
        userId: user.userId, // Strictly use verified userId from token!
        month,
      });

      return ApiResponse.success(res, data);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch monthly records', err.statusCode || 500);
    }
  }

  /**
   * Upcoming Holidays
   */
  static async getUpcomingHolidays(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const holidays = await AttendanceService.getUpcomingHolidays(user.orgId);
      return ApiResponse.success(res, holidays);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch upcoming holidays', err.statusCode || 500);
    }
  }

  /**
   * Admin: Upcoming Employee Leaves (Strict 403 for non-admins)
   */
  static async getUpcomingLeaves(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const mode = getHomeViewMode({ role: user.role });
      if (mode !== 'admin') {
        return ApiResponse.error(
          res,
          'Access forbidden. Only administrators can view upcoming employee leave applications.',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const leaves = await AttendanceService.getUpcomingLeaves(user.orgId);
      return ApiResponse.success(res, leaves);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch upcoming leaves', err.statusCode || 500);
    }
  }

  /**
   * Office Notices: Read (Everyone)
   */
  static async getNotices(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const notices = await AttendanceService.getOfficeNotices(user.orgId);
      return ApiResponse.success(res, notices);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch notices', err.statusCode || 500);
    }
  }

  /**
   * Office Notices: Create (Admin Only)
   */
  static async createNotice(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const mode = getHomeViewMode({ role: user.role });
      if (mode !== 'admin') {
        return ApiResponse.error(
          res,
          'Access forbidden. Only administrators can post notice board announcements.',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const { title, body } = req.body || {};
      if (!title || !body) {
        return ApiResponse.error(res, 'Title and notice content are required', HTTP_STATUS.BAD_REQUEST);
      }

      const notice = await AttendanceService.createOfficeNotice({
        firmId: user.orgId,
        author: {
          id: user.userId,
          name: user.name || 'Admin',
          role: user.role || 'admin',
        },
        title,
        body,
      });

      return ApiResponse.success(res, notice, 'Notice published successfully.', HTTP_STATUS.CREATED);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to create notice', err.statusCode || 500);
    }
  }

  /**
   * Office Notices: Delete (Admin Only)
   */
  static async deleteNotice(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const mode = getHomeViewMode({ role: user.role });
      if (mode !== 'admin') {
        return ApiResponse.error(
          res,
          'Access forbidden. Only administrators can delete notice board announcements.',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const noticeId = String(req.params.id);
      const success = await AttendanceService.deleteOfficeNotice(user.orgId, noticeId);

      if (!success) {
        return ApiResponse.error(res, 'Notice not found or already deleted', HTTP_STATUS.NOT_FOUND);
      }

      return ApiResponse.success(res, { deleted: true }, 'Notice deleted successfully.');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to delete notice', err.statusCode || 500);
    }
  }
}
