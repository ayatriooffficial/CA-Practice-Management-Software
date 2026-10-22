import { Request, Response } from 'express';
import { CounterService } from './counter.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';

export class CounterController {
  static getAllCounters = asyncHandler(async (_req: Request, res: Response) => {
    const counters = await CounterService.getAllCounters();
    return ApiResponse.success(res, counters, 'Dedicated counters retrieved successfully');
  });

  static getCounter = asyncHandler(async (req: Request, res: Response) => {
    const name = String(req.params.name);
    const seq = await CounterService.getCurrentSequence(name);
    return ApiResponse.success(res, { counter: name, currentSeq: seq }, 'Counter sequence retrieved');
  });

  static syncCounters = asyncHandler(async (_req: Request, res: Response) => {
    await CounterService.initializeCounters();
    const counters = await CounterService.getAllCounters();
    return ApiResponse.success(res, counters, 'Counters synchronized with database records');
  });
}
