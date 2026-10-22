import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ApiResponse } from '../../shared/utils/apiResponse';
import {
  getCategories,
  getComplianceGrid,
  upsertComplianceEntry,
  refreshComplianceItems,
  getComplianceCalendar,
} from './compliance.service';
import {
  ComplianceGridQueryInput,
  ComplianceEntryUpsertInput,
  ComplianceItemRefreshInput,
} from './compliance.validation';

export class ComplianceController {
  /** GET /compliance/categories */
  static getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const cats = await getCategories();
    return ApiResponse.success(res, cats, 'Compliance categories fetched');
  });

  /** GET /compliance/grid?categoryId=cat-gst&fy=FY 2025-2026&frequency=monthly */
  static getGrid = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ComplianceGridQueryInput;
    const grid = await getComplianceGrid(q);
    return ApiResponse.success(res, grid, 'Compliance grid fetched');
  });

  /** PUT /compliance/entries - manual category entry update */
  static upsertEntry = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ComplianceEntryUpsertInput;
    const entry = await upsertComplianceEntry(input);
    return ApiResponse.success(res, entry, 'Compliance entry updated');
  });

  /** POST /compliance/items/refresh */
  static refreshItems = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ComplianceItemRefreshInput;
    const result = await refreshComplianceItems(input);
    return ApiResponse.success(res, result, 'Compliance items refreshed');
  });

  static getCalendar = asyncHandler(async (req: Request, res: Response) => {
    return ApiResponse.success(res, await getComplianceCalendar(req.query.month as string | undefined), 'Compliance calendar fetched');
  });
}
