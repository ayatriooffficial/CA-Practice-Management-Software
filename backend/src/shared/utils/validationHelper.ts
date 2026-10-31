// validationHelper.ts
// Utility to validate request bodies using Zod schemas.

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Returns an Express middleware that validates `req.body` against the provided Zod schema.
 * If validation passes, `next()` is called. Otherwise, a 400 response with error details is sent.
 */
export const validate = (schema: ZodSchema<any>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Parse will throw ZodError if validation fails.
            schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                res.status(400).json({
                    message: 'Validation failed',
                    errors: err.errors,
                });
            } else {
                // Unexpected error – pass to global error handler.
                next(err);
            }
        }
    };
};
