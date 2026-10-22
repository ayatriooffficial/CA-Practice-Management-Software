import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { NoticeController } from './notice.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { noticeQuerySchema, calendarQuerySchema } from './notice.validation';
import { ZodError } from 'zod';

const validateNoticeQuery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    req.query = (await noticeQuerySchema.parseAsync(req.query)) as unknown as typeof req.query;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, statusCode: 400, message: 'Invalid notice query', errors: error.errors });
      return;
    }
    next(error);
  }
};

const router = Router();

/** GET /notices/credits */
router.get('/credits', NoticeController.getCredits);
router.patch('/:id', NoticeController.updateStatus);
router.get('/groups', NoticeController.getNotices);
router.get('/counts', NoticeController.getSummary);

/** GET /notices/summary?portal=GST */
router.get('/summary', NoticeController.getSummary);

/** GET /notices/clients?portal=GST&search=...&filter=all */
router.get('/clients', NoticeController.getClients);

/** GET /notices/calendar?month=2026-10&portal=GST */
router.get(
  '/calendar',
  validateRequest({ query: calendarQuerySchema }),
  NoticeController.getCalendar
);

/** GET /notices?portal=GST&search=...&page=1&limit=50&groupBy=client */
router.get(
  '/',
  validateNoticeQuery,
  NoticeController.getNotices
);

export const noticeRoutes = router;
