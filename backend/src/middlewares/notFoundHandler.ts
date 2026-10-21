import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/utils/apiError';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(AppError.notFound(`Cannot find route ${req.method} ${req.originalUrl} on this server`));
};
