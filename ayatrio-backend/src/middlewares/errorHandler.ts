import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../shared/utils/apiError';
import { HttpStatus } from '../constants/httpStatusCodes';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let errors: unknown = undefined;

  // 1. AppError (Operational)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }
  // 2. Mongoose Invalid ObjectId (CastError)
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = `Invalid format for resource identifier '${err.path}': ${err.value}`;
  }
  // 3. Mongoose Validation Error
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
    message = 'Validation error occurred on database constraints';
    errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
  }
  // 4. Mongoose Duplicate Key Error (Code 11000)
  else if ((err as any).code === 11000) {
    statusCode = HttpStatus.CONFLICT;
    const duplicatedFields = Object.keys((err as any).keyValue || {}).join(', ');
    message = `Duplicate entry detected for unique field(s): ${duplicatedFields}`;
  }
  // 5. Express JSON body parsing error
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = 'Malformed JSON payload in request body';
  } else {
    // Non-operational unknown internal errors
    logger.error(`💥 Unhandled Exception at [${req.method} ${req.originalUrl}]:`, {
      message: err.message,
      stack: err.stack,
    });
  }

  const responsePayload: Record<string, unknown> = {
    success: false,
    statusCode,
    message,
    ...(errors !== undefined && { errors }),
    ...(env.NODE_ENV === 'development' && {
      stack: err.stack,
      rawError: err.message,
    }),
  };

  res.status(statusCode).json(responsePayload);
};
