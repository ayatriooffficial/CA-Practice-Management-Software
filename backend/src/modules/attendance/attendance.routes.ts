import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

// Server time is public/unprotected for timer synchronization
router.get('/time', AttendanceController.getServerTime);

// All other attendance endpoints require authentication
router.use(authenticate);

// Live punch status & actions (caller only)
router.get('/live', AttendanceController.getLiveStatus);
router.post('/punch-in', AttendanceController.punchIn);
router.post('/punch-out', AttendanceController.punchOut);

// Summary metrics (Role-based: firm-wide for admin, personal for employee)
router.get('/summary', AttendanceController.getSummary);

// Admin: Today's Attendance Table (Strict 403 on non-admin)
router.get('/today', AttendanceController.getTodayAttendance);

// Employee: Monthly Attendance Records (Strictly caller's records)
router.get('/me', AttendanceController.getMonthlyRecords);

// Upcoming items
router.get('/holidays/upcoming', AttendanceController.getUpcomingHolidays);
router.get('/leaves/upcoming', AttendanceController.getUpcomingLeaves); // Admin only

// Office Notice Board (Read for everyone, Create/Delete admin only)
router.get('/office-notices', AttendanceController.getNotices);
router.post('/office-notices', AttendanceController.createNotice);
router.delete('/office-notices/:id', AttendanceController.deleteNotice);

export const attendanceRoutes = router;
