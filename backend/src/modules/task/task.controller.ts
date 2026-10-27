import { Request, Response } from 'express';
import { TaskService } from './task.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ResponseMessages } from '../../constants/messages';
import { HttpStatus } from '../../constants/httpStatusCodes';
import { QueryOptions } from '../../shared/utils/queryBuilder';
import { AppError } from '../../shared/utils/apiError';
import { DocumentCategory } from '../drive/drive.interface';
import { getUserContextFromRequest } from '../../shared/utils/auth.helper';
import { FinancialService } from '../financials/financial.service';

export class TaskController {
  static getAllTasks = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const queryOptions: QueryOptions & {
      category?: string;
      quickFilter?: string;
      status?: string;
      assigneeName?: string;
      department?: string;
      financialYear?: string;
      period?: string;
      clientId?: string;
      clientFileNo?: string;
      clientName?: string;
    } = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      search: req.query.search as string,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      category: req.query.category as string,
      quickFilter: req.query.quickFilter as string,
      status: req.query.status as string,
      assigneeName: req.query.assigneeName as string,
      department: req.query.department as string,
      financialYear: req.query.financialYear as string,
      period: req.query.period as string,
      clientId: req.query.clientId as string,
      clientFileNo: req.query.clientFileNo as string,
      clientName: req.query.clientName as string,
    };

    const { items, pagination } = await TaskService.getAllTasks(queryOptions, userCtx);
    return ApiResponse.paginated(res, items, pagination, ResponseMessages.SUCCESS);
  });

  static getTaskStats = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const category = req.query.category as string | undefined;
    const stats = await TaskService.getTaskStats(category, userCtx);
    return ApiResponse.success(res, stats, ResponseMessages.SUCCESS);
  });

  static getTaskSummaryMatrix = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const groupBy = (req.query.groupBy as string) || 'Assigned To';
    const search = req.query.search as string | undefined;
    const matrix = await TaskService.getTaskSummaryMatrix(groupBy, search, userCtx);
    return ApiResponse.success(res, matrix, ResponseMessages.SUCCESS);
  });

  static getProfitabilityReport = asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as { from: string; to: string };
    if (from > to) throw AppError.badRequest('Start date must be on or before end date');
    const userCtx = getUserContextFromRequest(req);
    if (!userCtx.userId || !userCtx.orgId) throw AppError.unauthorized('An authenticated organization user is required');
    const report = await FinancialService.getProfitabilityReport(from, to, {
      userId: userCtx.userId,
      orgId: userCtx.orgId,
      role: userCtx.role,
    });
    return ApiResponse.success(res, report, ResponseMessages.SUCCESS);
  });

  static getTaskById = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const task = await TaskService.getTaskById(id);
    return ApiResponse.success(res, task, ResponseMessages.SUCCESS);
  });

  static createTask = asyncHandler(async (req: Request, res: Response) => {

    const userCtx = getUserContextFromRequest(req);
    const task = await TaskService.createTask(req.body, userCtx);
    return ApiResponse.success(res, task, ResponseMessages.TASK_CREATED, HttpStatus.CREATED);
  });

  static updateTask = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const task = await TaskService.updateTaskById(id, req.body);
    return ApiResponse.success(res, task, ResponseMessages.TASK_UPDATED);
  });

  static deleteTask = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    await TaskService.deleteTaskById(id);
    return ApiResponse.success(res, null, ResponseMessages.TASK_DELETED);
  });

  static addComment = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const task = await TaskService.addComment(id, req.body);
    return ApiResponse.success(res, task, 'Comment added successfully');
  });

  static toggleSubTask = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const subTaskId = String(req.params.subTaskId);
    const task = await TaskService.toggleSubTask(id, subTaskId);
    return ApiResponse.success(res, task, 'Subtask updated');
  });

  static toggleChecklist = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const itemId = String(req.params.itemId);
    const task = await TaskService.toggleChecklist(id, itemId);
    return ApiResponse.success(res, task, 'Checklist item updated');
  });

  static toggleDocumentRequest = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const docId = String(req.params.docId);
    const task = await TaskService.toggleDocumentRequest(id, docId, req.body.status);
    return ApiResponse.success(res, task, 'Document request status updated');
  });

  static uploadTaskDocument = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const docId = String(req.params.docId);
    const file = req.file;
    if (!file) {
      throw AppError.badRequest('No file provided for upload');
    }
    const documentName = req.body.documentName as string | undefined;
    const result = await TaskService.uploadTaskDocument(id, docId, file, documentName);
    return ApiResponse.success(res, result, 'Document uploaded to Google Drive successfully');
  });

  static uploadGeneralTaskDocument = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const file = req.file;
    if (!file) {
      throw AppError.badRequest('No file provided for upload');
    }
    const title = (req.body.title as string) || file.originalname;
    const category = req.body.category as DocumentCategory | undefined;
    const description = req.body.description as string | undefined;
    const result = await TaskService.uploadGeneralTaskDocument(id, file, title, category, description);
    return ApiResponse.success(res, result, 'Task document uploaded to Google Drive successfully');
  });

  static linkEmail = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const task = await TaskService.linkEmail(id, req.body);
    return ApiResponse.success(res, task, 'Email linked to task successfully');
  });

  static unlinkEmail = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const messageId = String(req.params.messageId);
    const task = await TaskService.unlinkEmail(id, messageId);
    return ApiResponse.success(res, task, 'Email unlinked from task successfully');
  });

  static getAllTemplates = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const frequency = req.query.frequency as string | undefined;
    const templates = await TaskService.getAllTemplates({ search, category, frequency }, userCtx);
    return ApiResponse.success(res, templates, ResponseMessages.SUCCESS);
  });

  static getTemplateById = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const id = String(req.params.id);
    const template = await TaskService.getTemplateById(id, userCtx);
    return ApiResponse.success(res, template, ResponseMessages.SUCCESS);
  });

  static createTemplate = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const template = await TaskService.createTemplate(req.body, userCtx);
    return ApiResponse.success(res, template, 'Task template created successfully', HttpStatus.CREATED);
  });

  static updateTemplate = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const id = String(req.params.id);
    const template = await TaskService.updateTemplate(id, req.body, userCtx);
    return ApiResponse.success(res, template, 'Task template updated successfully');
  });

  static deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const id = String(req.params.id);
    await TaskService.deleteTemplate(id, userCtx);
    return ApiResponse.success(res, null, 'Task template deleted successfully');
  });
}
