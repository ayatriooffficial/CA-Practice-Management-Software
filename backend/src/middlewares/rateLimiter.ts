import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { HttpStatus } from '../constants/httpStatusCodes';

/**
 * Standard API rate limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Stricter rate limiter for resource creation/sensitive operations
 */
export const mutationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 write ops per min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Write operations limit exceeded. Please wait a moment before trying again.',
  },
});
