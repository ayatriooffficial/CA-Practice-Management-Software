import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { FinancialService } from './workdone.service';
import { ResponseMessages } from '../../constants/messages';
import { ApiResponse } from '../../shared/utils/apiResponse';

export class FinancialController {
  static getWorkDoneClient = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { items, pagination } = await FinancialService.workDoneClient(req.query as any);
    ApiResponse.paginated(res, items, pagination, ResponseMessages.SUCCESS);
  });
}
