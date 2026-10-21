import { Request, Response } from 'express';
import { ServiceService } from './service.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ResponseMessages } from '../../constants/messages';

export class ServiceController {
  /**
   * Create new service master entry
   * POST /api/v1/services
   */
  static createService = asyncHandler(async (req: Request, res: Response) => {
    const service = await ServiceService.createService(req.body);
    return ApiResponse.created(res, service, ResponseMessages.SERVICE_CREATED);
  });

  /**
   * Get all services with pagination, filters, and search
   * GET /api/v1/services
   */
  static getAllServices = asyncHandler(async (req: Request, res: Response) => {
    const { items, pagination } = await ServiceService.getAllServices(req.query);
    return ApiResponse.paginated(res, items, pagination, 'Services fetched successfully');
  });

  /**
   * Get service catalog analytics and summary
   * GET /api/v1/services/stats
   */
  static getServiceStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await ServiceService.getServiceStats();
    return ApiResponse.success(res, stats, 'Service analytics fetched successfully');
  });

  /**
   * Get single service by ID
   * GET /api/v1/services/:id
   */
  static getServiceById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const includeDeleted = req.query.includeDeleted === 'true';
    const service = await ServiceService.getServiceById(id, includeDeleted);
    return ApiResponse.success(res, service, 'Service details retrieved successfully');
  });

  /**
   * Update service entry
   * PATCH /api/v1/services/:id
   */
  static updateService = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updated = await ServiceService.updateServiceById(id, req.body);
    return ApiResponse.success(res, updated, ResponseMessages.SERVICE_UPDATED);
  });

  /**
   * Soft-delete service
   * DELETE /api/v1/services/:id
   */
  static softDeleteService = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await ServiceService.softDeleteService(id);
    return ApiResponse.success(res, null, ResponseMessages.SERVICE_DELETED);
  });

  /**
   * Restore soft-deleted service
   * PATCH /api/v1/services/:id/restore
   */
  static restoreService = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const restored = await ServiceService.restoreService(id);
    return ApiResponse.success(res, restored, ResponseMessages.SERVICE_RESTORED);
  });

  /**
   * Permanently delete service
   * DELETE /api/v1/services/:id/hard
   */
  static hardDeleteService = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await ServiceService.hardDeleteService(id);
    return ApiResponse.success(res, null, ResponseMessages.PERMANENT_DELETED);
  });

  /**
   * Sync service subtasks, checklists, and document requests to active tasks
   * POST /api/v1/services/:id/sync
   */
  static syncServiceToTasks = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await ServiceService.syncServiceToTasks(id);
    return ApiResponse.success(res, result, 'Service templates synced to active tasks');
  });
}
