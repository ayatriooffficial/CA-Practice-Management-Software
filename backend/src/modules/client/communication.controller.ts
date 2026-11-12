import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { GmailSyncService } from '../../shared/utils/gmailSyncService';
import { ClientCommunicationModel } from './clientCommunication.model';

export class CommunicationController {
  /**
   * GET /api/v1/communications/sync
   * Triggers an automated scan and sync of recent incoming emails from company Gmail to CRM Clients
   */
  static syncCommunications = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const result = await GmailSyncService.syncEmailsToClients(isNaN(limit) ? 20 : limit);
    return ApiResponse.success(res, result, 'Inbox emails synchronized with CRM clients');
  });

  /**
   * GET /api/v1/communications
   * Retrieves list of all client communications with optional pagination and filtering
   */
  static getCommunications = asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const search = req.query.search ? String(req.query.search).trim() : '';
    const clientId = req.query.clientId ? String(req.query.clientId).trim() : '';

    const filter: Record<string, any> = {};
    if (clientId) {
      filter.clientId = clientId;
    }
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { senderEmail: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { snippet: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, totalDocs] = await Promise.all([
      ClientCommunicationModel.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ClientCommunicationModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalDocs / limit) || 1;

    return ApiResponse.paginated(
      res,
      items,
      {
        page,
        limit,
        totalDocs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      'Communications fetched successfully'
    );
  });

  /**
   * GET /api/v1/communications/client/:clientId
   * Retrieves communications linked to a specific client
   */
  static getCommunicationsByClient = asyncHandler(async (req: Request, res: Response) => {
    const clientId = req.params.clientId;
    const communications = await ClientCommunicationModel.find({ clientId })
      .sort({ date: -1 })
      .limit(50)
      .lean();

    return ApiResponse.success(res, communications, 'Client communications retrieved');
  });
}

