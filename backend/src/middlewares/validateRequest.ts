import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { HttpStatus } from '../constants/httpStatusCodes';

interface ValidationSchema {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validateRequest = (schema: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as any;
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        const detailSummary = formattedErrors
          .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
          .join(', ');

        res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          success: false,
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: detailSummary ? `Validation failed (${detailSummary})` : 'Validation failed for request data',
          errors: formattedErrors,
        });
        return;
      }
      next(error);
    }
  };
};
