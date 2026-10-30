import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { FinancialService } from './workdone.service';
export class FinancialController {
  static getWorkDoneClient = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await FinancialService.workDoneClient();
    res.status(200).json({
      success: true,
      data,
    });
  });
}