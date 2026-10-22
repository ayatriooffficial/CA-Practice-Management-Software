import { Request, Response } from 'express';
import { LeadService } from './lead.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AppError } from '../../shared/utils/apiError';
import { ResponseMessages } from '../../constants/messages';
import { getUserContextFromRequest } from '../../shared/utils/auth.helper';

export class LeadController {
  /**
   * Create new lead
   * POST /api/v1/leads
   */
  static createLead = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const lead = await LeadService.createLead(req.body, userCtx);
    return ApiResponse.created(res, lead, ResponseMessages.LEAD_CREATED);
  });

  /**
   * Get all leads with pagination, filters, and search
   * GET /api/v1/leads
   */
  static getAllLeads = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const { items, pagination } = await LeadService.getAllLeads(req.query, userCtx);
    return ApiResponse.paginated(res, items, pagination, 'Leads fetched successfully');
  });

  /**
   * Get lead statistics
   * GET /api/v1/leads/stats
   */
  static getLeadStats = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContextFromRequest(req);
    const stats = await LeadService.getLeadStats(userCtx);
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

  /**
   * Upload and verify Lead Profile Photo to Google Drive
   * POST /api/v1/leads/:id/photo
   */
  static uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    if (!req.file) {
      throw AppError.badRequest('Photo file is required in field "file"');
    }
    const result = await LeadService.uploadLeadPhoto(id, req.file);
    return ApiResponse.success(res, result, 'Lead photo verified and synced with Google Drive');
  });

  /**
   * Upload identity attachment (PAN, Aadhaar, DIN) to Google Drive
   * POST /api/v1/leads/:id/attachment/:field
   */
  static uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const field = req.params.field as 'panAttachment' | 'aadhaarAttachment' | 'dinAttachment';
    if (!['panAttachment', 'aadhaarAttachment', 'dinAttachment'].includes(field)) {
      throw AppError.badRequest('Field must be panAttachment, aadhaarAttachment, or dinAttachment');
    }
    if (!req.file) {
      throw AppError.badRequest('Attachment file is required in field "file"');
    }
    const lead = await LeadService.uploadLeadAttachment(id, req.file, field);
    return ApiResponse.success(
      res,
      lead,
      `${field} document verified and uploaded to Google Drive`
    );
  });

  /**
   * Upload general document for a lead
   * POST /api/v1/leads/:id/documents
   */
  static uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    if (!req.file) {
      throw AppError.badRequest('Document file is required in field "file"');
    }
    const category = req.body.category || 'KYC_IDENTITY';
    const { description, tags } = req.body;
    const doc = await LeadService.uploadLeadDocument(
      id,
      req.file,
      category,
      description,
      Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : []
    );
    return ApiResponse.created(
      res,
      doc,
      'Lead document verified and uploaded to Google Drive'
    );
  });
}

