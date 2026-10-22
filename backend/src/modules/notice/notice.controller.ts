import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { getNoticeSummary, getNotices, getNoticeClientsRows, getCalendarEvents, getCredits, updateNoticeStatus } from './notice.service';
import { NoticeQueryInput, noticeStatusUpdateSchema } from './notice.validation';
import { Portal } from './notice.interface';

export class NoticeController {
  /** GET /notices/summary */
  static getSummary = asyncHandler(async (req: Request, res: Response) => {
    const portalValue = req.query.portal as Portal | 'ALL' | undefined;
    const portal = portalValue === 'ALL' ? undefined : portalValue;
    const summary = await getNoticeSummary(portal);
    return ApiResponse.success(res, summary, 'Notice summary fetched');
  });

  /** GET /notices/clients */
  static getClients = asyncHandler(async (req: Request, res: Response) => {
    const portalValue = req.query.portal as Portal | 'ALL' | undefined;
    const portal = portalValue === 'ALL' ? undefined : portalValue;
    const search = req.query.search as string | undefined;
    const filter = (req.query.filter as 'all' | 'notices' | 'issues') || 'all';
    const result = await getNoticeClientsRows({ portal, search, filter });
    return ApiResponse.success(res, result, 'Notice clients fetched');
  });

  /** GET /notices */
  static getNotices = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as NoticeQueryInput;
    const result = await getNotices(q);
    return ApiResponse.paginated(res, result.data as any[], result.pagination, 'Notices fetched');
  });

  /** GET /notices/calendar */
  static getCalendar = asyncHandler(async (req: Request, res: Response) => {
    const month = req.query.month as string | undefined;
    const portalValue = req.query.portal as Portal | 'ALL' | undefined;
    const portal = portalValue === 'ALL' ? undefined : portalValue;
    const statusValue = req.query.status as string | undefined;
    const status = statusValue === 'ALL' ? undefined : statusValue;
    const by = req.query.by as 'notice_date' | 'due_date' | undefined;
    const events = await getCalendarEvents({ month, portal, status, by });
    return ApiResponse.success(res, events, 'Calendar events fetched');
  });

  /** GET /notices/credits */
  static getCredits = asyncHandler(async (_req: Request, res: Response) => {
    const credits = await getCredits();
    return ApiResponse.success(res, credits, 'Credits fetched');
  });

  static updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const parsed = noticeStatusUpdateSchema.parse(req.body);
    const notice = await updateNoticeStatus(String(req.params.id), parsed.status);
    return ApiResponse.success(res, notice, 'Notice status updated');
  });
}
