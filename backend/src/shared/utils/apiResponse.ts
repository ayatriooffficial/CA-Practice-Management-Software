import { Response } from 'express';
import { HttpStatusCode, HttpStatus } from '../../constants/httpStatusCodes';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalDocs: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class ApiResponse {
  /**
   * Standard single item or generic success response
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: HttpStatusCode = HttpStatus.OK,
    meta?: Record<string, unknown>
  ): Response {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      ...(meta && { meta }),
    });
  }

  /**
   * Created (201) success response
   */
  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): Response {
    return ApiResponse.success(res, data, message, HttpStatus.CREATED);
  }

  /**
   * Paginated response helper
   */
  static paginated<T>(
    res: Response,
    items: T[],
    pagination: PaginationMeta,
    message: string = 'Data retrieved successfully'
  ): Response {
    return res.status(HttpStatus.OK).json({
      success: true,
      statusCode: HttpStatus.OK,
      message,
      data: items,
      pagination,
    });
  }

  /**
   * No content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * Standard error response helper
   */
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: HttpStatusCode = HttpStatus.BAD_REQUEST,
    errors?: unknown
  ): Response {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...(errors ? { errors } : {}),
    });
  }
}

export { HttpStatus, HttpStatusCode };
