import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestLogger } from './middlewares/requestLogger';
import { apiRateLimiter } from './middlewares/rateLimiter';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';
import { appRouter } from './routes';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Trust Reverse Proxy (Cloudflare, Nginx, AWS ALB, etc.)
  app.set('trust proxy', 1);

  // 2. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 3. CORS Configuration
  const corsOrigins = env.CORS_ORIGIN.includes(',')
    ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : env.CORS_ORIGIN;

  app.use(
    cors({
      origin: corsOrigins === '*' ? true : corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-User-Id', 'X-User-Role', 'X-Org-Id'],
      credentials: true,
      maxAge: 86400, // 24 hours
    })
  );

  // 4. Response Compression (Gzip / Brotli)
  app.use(compression());

  // 5. Body & Cookie Parsing
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. HTTP Parameter Pollution Protection
  app.use(hpp());

  // 7. HTTP Request Logging (Morgan + Winston)
  app.use(requestLogger);

  // 8. Global API Rate Limiter
  app.use(env.API_PREFIX, apiRateLimiter);

  // 9. Root route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Ayatrio CRM API',
      version: '1.0.0',
      status: 'active',
      documentation: `${env.API_PREFIX}/health`,
    });
  });

  // 10. Mount API Routes
  app.use(env.API_PREFIX, appRouter);

  // 11. Handle 404 Route Not Found
  app.use(notFoundHandler);

  // 12. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
