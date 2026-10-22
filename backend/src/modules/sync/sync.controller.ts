import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ApiResponse } from '../../shared/utils/apiResponse';
import {
  getSyncEntitlement,
  runSync,
  getSyncJobs,
  getActivityLogs,
  getSyncSummary,
  getSyncEligibility,
} from './sync.service';
import { SyncClientsInput, SyncJobQueryInput, ActivityQueryInput } from './sync.validation';

export class SyncController {
  /** GET /sync/entitlement */
  static getEntitlement = asyncHandler(async (_req: Request, res: Response) => {
    const data = await getSyncEntitlement();
    return ApiResponse.success(res, data, 'Sync entitlement fetched');
  });

  /** POST /sync/clients */
  static syncClients = asyncHandler(async (req: Request, res: Response) => {
    const job = await runSync(req.body as SyncClientsInput);
    return ApiResponse.created(res, job, 'Sync job started');
  });

  /** GET /sync/jobs */
  static getJobs = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as SyncJobQueryInput;
    const result = await getSyncJobs(q);
    return ApiResponse.paginated(res, result.data as any[], result.pagination, 'Sync jobs fetched');
  });

  /** GET /sync/activity */
  static getActivity = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ActivityQueryInput;
    const result = await getActivityLogs(q);
    return ApiResponse.paginated(res, result.data as any[], result.pagination, 'Activity logs fetched');
  });

  static getSummary = asyncHandler(async (_req: Request, res: Response) => {
    return ApiResponse.success(res, await getSyncSummary(), 'Sync summary fetched');
  });

  static getEligibility = asyncHandler(async (_req: Request, res: Response) => {
    return ApiResponse.success(res, await getSyncEligibility(), 'Sync eligibility fetched');
  });
}
