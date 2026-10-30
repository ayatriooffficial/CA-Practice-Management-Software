import {Response } from 'express';
import { FinancialService } from './workdone.service';
export class FinancialController {
  static async getWorkDoneClient(_:any, res: Response): Promise<void> {
    try {
      const data = await FinancialService.workDoneClient();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal Server Error',
      });
    }
  }
}