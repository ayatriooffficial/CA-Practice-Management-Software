import { Request, Response, NextFunction } from 'express';
import { DocumentService } from './document.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { DocumentCategory } from '../drive/drive.interface';

export class DocumentController {
  /**
   * Search people across clients and team members
   */
  public static async searchPeople(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const type = (req.query.type as 'all' | 'client' | 'team') || 'all';
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const userCtx = (req as any).user ? {
        orgId: (req as any).user.orgId,
        userId: (req as any).user.userId,
      } : undefined;

      const result = await DocumentService.searchPeople(
        { search, type, page, limit },
        userCtx
      );

      ApiResponse.success(
        res,
        result.people,
        'People retrieved successfully',
        HTTP_STATUS.OK,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get full details of a specific person with associated documents
   */
  public static async getPersonDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await DocumentService.getPersonDetails(id);
      ApiResponse.success(res, result, 'Person details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload and associate a new document for a specific person
   */
  public static async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const file = req.file;
      if (!file) {
        ApiResponse.error(res, 'No file provided for upload', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const category = (req.body?.category as DocumentCategory) || DocumentCategory.GENERAL;
      const description = req.body?.description || '';
      const tags = Array.isArray(req.body?.tags)
        ? req.body.tags
        : typeof req.body?.tags === 'string'
        ? req.body.tags.split(',').map((t: string) => t.trim())
        : [];
      const uploadedBy = (req as any).user?.name || req.body?.uploadedBy || 'Practice Staff';
      const requirementId = req.body?.requirementId || undefined;
      const taskDocId = req.body?.taskDocId || undefined;
      const taskId = req.body?.taskId || undefined;

      const document = await DocumentService.uploadDocumentForPerson(id, file, {
        category,
        description,
        tags,
        uploadedBy,
        requirementId,
        taskDocId,
        taskId,
      });

      ApiResponse.created(res, document, 'Document uploaded successfully');
    } catch (error) {
      next(error);
    }
  }
}
