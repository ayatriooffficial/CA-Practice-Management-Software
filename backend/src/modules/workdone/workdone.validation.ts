// src/modules/workdone/workdone.validation.ts

import { asyncHandler } from '../../shared/utils/asyncHandler';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Zod schema for validating query parameters of the GET /client-work-done endpoint.
 * - `page`   : optional positive integer (default handled by controller)
 * - `limit`  : optional positive integer
 * - `search` : optional string, trimmed
 */
const workDoneQuerySchema = z.object({
    page: z.string().optional().transform((val) => Number(val)).refine((num) => Number.isInteger(num) && num > 0, {
        message: 'page must be a positive integer',
    }),
    limit: z.string().optional().transform((val) => Number(val)).refine((num) => Number.isInteger(num) && num > 0, {
        message: 'limit must be a positive integer',
    }),
    search: z.string().optional().transform((val) => typeof val === 'string' ? val.trim() : val),
});

/**
 * Middleware to validate query parameters using Zod.
 * On validation failure, responds with 400 and a formatted error object.
 */
export const validateWorkDone = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = workDoneQuerySchema.safeParse(req.query);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: 'Invalid query parameters',
            errors: result.error.format(),
        });
    }
    // Overwrite req.query with the parsed and typed values for downstream use
    req.query = result.data as any;
    next();
});
