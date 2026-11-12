import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/utils/apiError';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { getUserContextFromRequest } from '../../shared/utils/auth.helper';
import { FinancialService, FinancialUserContext } from './financial.service';
import { realtimeService } from '../../shared/services/realtime.service';
import { cacheService } from '../../shared/services/cache.service';

function getContext(req: Request): FinancialUserContext {
  const userCtx = getUserContextFromRequest(req);
  let userId = userCtx.userId;
  let orgId = userCtx.orgId;
  const role = (userCtx.role || req.user?.role || 'admin').toLowerCase();

  const DEV_FALLBACK_USER_ID = '6ae086fb665d0e6ed6a61015';
  const DEV_FALLBACK_ORG_ID = '6adb442c6ceca77f153c0ba3';

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    userId = DEV_FALLBACK_USER_ID;
  }
  if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
    orgId = DEV_FALLBACK_ORG_ID;
  }

  return { userId, orgId, role };
}

export class FinancialController {
  static getReport = asyncHandler(async (req: Request, res: Response) => {
    const ctx = getContext(req);
    const { from, to, clientId, view, search } = req.query as {
      from: string;
      to: string;
      clientId?: string;
      view?: 'list' | 'client' | 'employee';
      search?: string;
    };
    if (from > to) throw AppError.badRequest('Start date must be on or before end date');
    return ApiResponse.success(res, await FinancialService.getProfitabilityReport(from, to, ctx, { clientId, view, search }));
  });

  static getInvoicingSummary = asyncHandler(async (req: Request, res: Response) => {
    const ctx = getContext(req);
    return ApiResponse.success(res, await FinancialService.getInvoicingSummary(ctx));
  });

  static getReportPdf = asyncHandler(async (req: Request, res: Response) => {
    const ctx = getContext(req);
    const { from, to, clientId, view, search } = req.query as {
      from: string;
      to: string;
      clientId?: string;
      view?: 'list' | 'client' | 'employee';
      search?: string;
    };
    if (from > to) throw AppError.badRequest('Start date must be on or before end date');
    const pdfBuffer = await FinancialService.getProfitabilityReportPdf(from, to, ctx, { clientId, view, search });

    const sanitizedClient = clientId ? clientId.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const filename = sanitizedClient
      ? `client-profitability-report-${sanitizedClient}-${from}-to-${to}.pdf`
      : `profitability-report-${from}-to-${to}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  });

  static listInvoices = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.success(res, await FinancialService.listInvoices(getContext(req))));

  static createInvoice = asyncHandler(async (req: Request, res: Response) => {
    const result = await FinancialService.createInvoice(req.body, getContext(req));
    void cacheService.delPattern('home:*');
    void cacheService.delPattern('invoice:*');
    void realtimeService.publishChange('invoice', 'create', { entityId: (result as any)?._id || (result as any)?.id });
    void realtimeService.publishChange('home', 'invalidate');
    return ApiResponse.created(res, result, 'Invoice saved');
  });

  static updateInvoice = asyncHandler(async (req: Request, res: Response) => {
    const result = await FinancialService.updateInvoice(String(req.params.id), req.body, getContext(req));
    void cacheService.delPattern('home:*');
    void cacheService.delPattern('invoice:*');
    void realtimeService.publishChange('invoice', 'update', { entityId: String(req.params.id) });
    void realtimeService.publishChange('home', 'invalidate');
    return ApiResponse.success(res, result, 'Invoice updated');
  });

  static voidInvoice = asyncHandler(async (req: Request, res: Response) => {
    const result = await FinancialService.voidInvoice(String(req.params.id), req.body.reason, getContext(req));
    void cacheService.delPattern('home:*');
    void cacheService.delPattern('invoice:*');
    void realtimeService.publishChange('invoice', 'update', { entityId: String(req.params.id) });
    void realtimeService.publishChange('home', 'invalidate');
    return ApiResponse.success(res, result, 'Invoice voided');
  });

  static listTimeEntries = asyncHandler(async (req: Request, res: Response) => {
    const taskId = String(req.query.taskId || '');
    if (!taskId) throw AppError.badRequest('Task ID is required');
    return ApiResponse.success(res, await FinancialService.listTimeEntries(taskId, getContext(req)));
  });

  static createTimeEntry = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.created(res, await FinancialService.createTimeEntry(req.body, getContext(req)), 'Task time recorded'));

  static listExpenses = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.success(res, await FinancialService.listExpenses(getContext(req))));

  static createExpense = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.created(res, await FinancialService.createExpense(req.body, getContext(req)), 'Expense submitted'));

  static setExpenseState = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.success(res, await FinancialService.setExpenseState(String(req.params.id), req.body.state, getContext(req)), 'Expense reviewed'));

  static setEmployeeCostRate = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.success(res, await FinancialService.setEmployeeCostRate(String(req.params.id), req.body.internalCostRatePaisePerHour, getContext(req)), 'Internal cost rate saved'));

  static listEmployeeCostRates = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.success(res, await FinancialService.listEmployeeCostRates(getContext(req))));

  static convertProforma = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.success(
      res,
      await FinancialService.convertProformaToInvoice(String(req.params.id), req.body?.newNumber, getContext(req)),
      'Proforma converted to Invoice'
    ));

  static listReceipts = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.success(res, await FinancialService.listReceipts(getContext(req))));

  static createReceipt = asyncHandler(async (req: Request, res: Response) => 
    ApiResponse.created(res, await FinancialService.createReceipt(req.body, getContext(req)), 'Payment receipt recorded'));
}
