import { Request, Response } from 'express';
import { TaskService } from './task.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ResponseMessages } from '../../constants/messages';
import { HttpStatus } from '../../constants/httpStatusCodes';
import { QueryOptions } from '../../shared/utils/queryBuilder';

export class TaskController {
  static getAllTasks = asyncHandler(async (req: Request, res: Response) => {
    const queryOptions: QueryOptions & {
      category?: string;
      quickFilter?: string;
      status?: string;
      assigneeName?: string;
      department?: string;
      financialYear?: string;
      period?: string;
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
    };

    const { items, pagination } = await TaskService.getAllTasks(queryOptions);
    return ApiResponse.paginated(res, items, pagination, ResponseMessages.SUCCESS);
  });

  static getTaskStats = asyncHandler(async (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    const stats = await TaskService.getTaskStats(category);
    return ApiResponse.success(res, stats, ResponseMessages.SUCCESS);
  });

  static getTaskSummaryMatrix = asyncHandler(async (req: Request, res: Response) => {
    const groupBy = (req.query.groupBy as string) || 'Assigned To';
    const search = req.query.search as string | undefined;
    const matrix = await TaskService.getTaskSummaryMatrix(groupBy, search);
    return ApiResponse.success(res, matrix, ResponseMessages.SUCCESS);
  });

  static getTaskById = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const task = await TaskService.getTaskById(id);
    return ApiResponse.success(res, task, ResponseMessages.SUCCESS);
  });

  static createTask = asyncHandler(async (req: Request, res: Response) => {
    const task = await TaskService.createTask(req.body);
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
}
