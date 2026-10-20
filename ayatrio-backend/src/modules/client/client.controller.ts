import { Request, Response } from 'express';
import { ClientService } from './client.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ResponseMessages } from '../../constants/messages';

export class ClientController {
  /**
   * Create new client
   * POST /api/v1/clients
   */
  static createClient = asyncHandler(async (req: Request, res: Response) => {
    const client = await ClientService.createClient(req.body);
    return ApiResponse.created(res, client, ResponseMessages.CLIENT_CREATED);
  });

  /**
   * Get all clients with pagination, filters, and search
   * GET /api/v1/clients
   */
  static getAllClients = asyncHandler(async (req: Request, res: Response) => {
    const { items, pagination } = await ClientService.getAllClients(req.query);
    return ApiResponse.paginated(res, items, pagination, 'Clients fetched successfully');
  });

  /**
   * Get client analytics and summary
   * GET /api/v1/clients/stats
   */
  static getClientStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await ClientService.getClientStats();
    return ApiResponse.success(res, stats, 'Client analytics fetched successfully');
  });

  /**
   * Get single client by ID
   * GET /api/v1/clients/:id
   */
  static getClientById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const includeDeleted = req.query.includeDeleted === 'true';
    const client = await ClientService.getClientById(id, includeDeleted);
    return ApiResponse.success(res, client, 'Client details retrieved successfully');
  });

  /**
   * Update client details
   * PATCH /api/v1/clients/:id
   */
  static updateClient = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updatedClient = await ClientService.updateClientById(id, req.body);
    return ApiResponse.success(res, updatedClient, ResponseMessages.CLIENT_UPDATED);
  });

  /**
   * Soft-delete client
   * DELETE /api/v1/clients/:id
   */
  static softDeleteClient = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const deletedBy = (req.headers['x-user-id'] as string) || 'system';
    const result = await ClientService.softDeleteClient(id, deletedBy);
    return ApiResponse.success(res, result, ResponseMessages.CLIENT_DELETED);
  });

  /**
   * Restore soft-deleted client
   * PATCH /api/v1/clients/:id/restore
   */
  static restoreClient = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const restored = await ClientService.restoreClient(id);
    return ApiResponse.success(res, restored, ResponseMessages.CLIENT_RESTORED);
  });

  /**
   * Permanently hard-delete client
   * DELETE /api/v1/clients/:id/permanent
   */
  static permanentDeleteClient = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await ClientService.permanentDeleteClient(id);
    return ApiResponse.success(res, null, ResponseMessages.PERMANENT_DELETED);
  });

  /**
   * Add item to customer files (promoter, statutory, recurring)
   * POST /api/v1/clients/:id/files/:fileType
   */
  static addCustomerFileItem = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const fileType = req.params.fileType as 'promoter' | 'statutory' | 'recurring';
    const updatedClient = await ClientService.addCustomerFileItem(id, fileType, req.body);
    return ApiResponse.success(res, updatedClient, ResponseMessages.CLIENT_FILE_ADDED);
  });

  /**
   * Remove item from customer files
   * DELETE /api/v1/clients/:id/files/:fileType/:itemId
   */
  static removeCustomerFileItem = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const fileType = req.params.fileType as 'promoter' | 'statutory' | 'recurring';
    const itemId = req.params.itemId as string;
    const updatedClient = await ClientService.removeCustomerFileItem(id, fileType, itemId);
    return ApiResponse.success(res, updatedClient, ResponseMessages.CLIENT_FILE_REMOVED);
  });
}
