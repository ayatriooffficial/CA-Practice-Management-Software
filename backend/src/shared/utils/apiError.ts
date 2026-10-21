import { HttpStatusCode, HttpStatus } from '../../constants/httpStatusCodes';

export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly isOperational: boolean;
  public readonly errors?: unknown;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    errors?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: unknown): AppError {
    return new AppError(message, HttpStatus.BAD_REQUEST, true, errors);
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(message, HttpStatus.FORBIDDEN);
  }

  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, HttpStatus.NOT_FOUND);
  }

  static conflict(message: string): AppError {
    return new AppError(message, HttpStatus.CONFLICT);
  }

  static unprocessable(message: string, errors?: unknown): AppError {
    return new AppError(message, HttpStatus.UNPROCESSABLE_ENTITY, true, errors);
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, false);
  }
}
