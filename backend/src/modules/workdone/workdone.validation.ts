// src/modules/workdone/workdone.validation.ts

import { asyncHandler } from '../../shared/utils/asyncHandler';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Zod schema for validating query parameters of the GET /client-work-done endpoint.
 * - `page`   : optional positive integer (default handled by controller)
 * - `limit`  : optional positive integer
 * - `search` : optional string, trimmed, filters out "undefined" or "null" literals
 */
const workDoneQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional().transform((val) => {
        if (!val || typeof val !== 'string') return undefined;
        const trimmed = val.trim();
        if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
            return undefined;
        }
        return trimmed;
    }),
});

/**
 * Middleware to validate query parameters using Zod.
 * On validation failure, responds with 400 and a formatted error object.
 */
export const validateWorkDone = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = workDoneQuerySchema.safeParse(req.query);
    if (!result.success) {
        res.status(400).json({
            success: false,
            message: 'Invalid query parameters',
            errors: result.error.format(),
        });
        return;
    }
    // Overwrite req.query with the parsed and typed values for downstream use
    req.query = result.data as any;
    return next();
});
