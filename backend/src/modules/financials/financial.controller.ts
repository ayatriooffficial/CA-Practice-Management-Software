import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/utils/apiError';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { FinancialService, FinancialUserContext } from './financial.service';

function getContext(req: Request): FinancialUserContext {
  let userId = req.user?.userId;
  let orgId = req.user?.orgId;

  if (process.env.NODE_ENV !== 'production') {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      userId = '6ad9e23bf460aa2e6102c0c8';
    }
    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      orgId = '6ad9e23bf460aa2e6102c0c6';
    }
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId) || !orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
    throw AppError.unauthorized('An authenticated organization user is required');
  }
  return { userId, orgId, role: req.user?.role || 'admin' };
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

  static createInvoice = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.created(res, await FinancialService.createInvoice(req.body, getContext(req)), 'Invoice saved'));

  static voidInvoice = asyncHandler(async (req: Request, res: Response) =>
    ApiResponse.success(res, await FinancialService.voidInvoice(String(req.params.id), req.body.reason, getContext(req)), 'Invoice voided'));

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
}
