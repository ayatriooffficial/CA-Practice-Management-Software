import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { GroupService } from './group.service';

export class GroupController {
  static listGroups = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = {
      userId: (req as any).user?.id || (req.headers['x-user-id'] as string),
      role: (req as any).user?.role || (req.headers['x-user-role'] as string),
      orgId: (req as any).user?.orgId || (req.headers['x-org-id'] as string),
    };

    const filters = {
      search: req.query.search as string,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 25,
    };

    const result = await GroupService.listGroups(filters, userCtx);
    return ApiResponse.paginated(
      res,
      result.groups,
      {
        page: result.page,
        limit: result.limit,
        totalDocs: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPrevPage: result.page > 1,
      },
      'Groups fetched successfully'
    );
  });

  static getGroupById = asyncHandler(async (req: Request, res: Response) => {
    const group = await GroupService.getGroupById(String(req.params.id));
    return ApiResponse.success(res, group, 'Group details fetched successfully');
  });

  static createGroup = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = {
      userId: (req as any).user?.id || (req.headers['x-user-id'] as string),
      orgId: (req as any).user?.orgId || (req.headers['x-org-id'] as string),
    };

    const group = await GroupService.createGroup(req.body, userCtx);
    return ApiResponse.created(res, group, 'Group created successfully');
  });

  static updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const group = await GroupService.updateGroup(String(req.params.id), req.body);
    return ApiResponse.success(res, group, 'Group updated successfully');
  });

  static deleteGroup = asyncHandler(async (req: Request, res: Response) => {
    await GroupService.deleteGroup(String(req.params.id));
    return ApiResponse.success(res, null, 'Group deleted successfully');
  });

  static updateGroupPoc = asyncHandler(async (req: Request, res: Response) => {
    const group = await GroupService.updateGroupPoc(String(req.params.id), req.body.pocClientId);
    return ApiResponse.success(res, group, 'Group POC updated successfully');
  });

  static removeClientFromGroup = asyncHandler(async (req: Request, res: Response) => {
    const group = await GroupService.removeClientFromGroup(String(req.params.id), String(req.params.clientId));
    return ApiResponse.success(res, group, 'Client removed from group successfully');
  });

  static getGroupContacts = asyncHandler(async (req: Request, res: Response) => {
    const contacts = await GroupService.getGroupContacts(String(req.params.id));
    return ApiResponse.success(res, contacts, 'Group contacts fetched successfully');
  });
}
