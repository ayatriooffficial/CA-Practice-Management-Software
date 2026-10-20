import { Request, Response } from 'express';
import { LeadService } from './lead.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ResponseMessages } from '../../constants/messages';

export class LeadController {
  /**
   * Create new lead
   * POST /api/v1/leads
   */
  static createLead = asyncHandler(async (req: Request, res: Response) => {
    const lead = await LeadService.createLead(req.body);
    return ApiResponse.created(res, lead, ResponseMessages.LEAD_CREATED);
  });

  /**
   * Get all leads with pagination, filters, and search
   * GET /api/v1/leads
   */
  static getAllLeads = asyncHandler(async (req: Request, res: Response) => {
    const { items, pagination } = await LeadService.getAllLeads(req.query);
    return ApiResponse.paginated(res, items, pagination, 'Leads fetched successfully');
  });

  /**
   * Get lead statistics
   * GET /api/v1/leads/stats
   */
  static getLeadStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await LeadService.getLeadStats();
    return ApiResponse.success(res, stats, 'Lead statistics fetched successfully');
  });

  /**
   * Get single lead by ID
   * GET /api/v1/leads/:id
   */
  static getLeadById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const includeDeleted = req.query.includeDeleted === 'true';
    const lead = await LeadService.getLeadById(id, includeDeleted);
    return ApiResponse.success(res, lead, 'Lead details retrieved successfully');
  });

  /**
   * Update lead by ID
   * PATCH /api/v1/leads/:id
   */
  static updateLead = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updatedLead = await LeadService.updateLeadById(id, req.body);
    return ApiResponse.success(res, updatedLead, ResponseMessages.LEAD_UPDATED);
  });

  /**
   * Soft-delete lead
   * DELETE /api/v1/leads/:id
   */
  static softDeleteLead = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const deletedBy = (req.headers['x-user-id'] as string) || 'system';
    const result = await LeadService.softDeleteLead(id, deletedBy);
    return ApiResponse.success(res, result, ResponseMessages.LEAD_DELETED);
  });

  /**
   * Restore soft-deleted lead
   * PATCH /api/v1/leads/:id/restore
   */
  static restoreLead = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const restored = await LeadService.restoreLead(id);
    return ApiResponse.success(res, restored, ResponseMessages.LEAD_RESTORED);
  });

  /**
   * Permanently delete lead
   * DELETE /api/v1/leads/:id/permanent
   */
  static permanentDeleteLead = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await LeadService.permanentDeleteLead(id);
    return ApiResponse.success(res, null, ResponseMessages.PERMANENT_DELETED);
  });

  /**
   * Convert Lead to Client
   * POST /api/v1/leads/:id/convert
   */
  static convertLead = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await LeadService.convertLeadToClient(id, req.body);
    return ApiResponse.created(res, result, ResponseMessages.LEAD_CONVERTED);
  });
}
