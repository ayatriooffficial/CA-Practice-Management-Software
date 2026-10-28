import morgan, { StreamOptions } from 'morgan';
import { logger } from '../config/logger';
import { env } from '../config/env';

// Custom token to mask large JWT tokens and sensitive parameters from console / HTTP logs
morgan.token('sanitized-url', (req: any) => {
  const rawUrl = req.originalUrl || req.url || '';
  return rawUrl.replace(/([?&](token|access_token|auth|password|secret)=)[^&]+/gi, '$1***');
});

const stream: StreamOptions = {
  write: (message: string) => logger.http(message.trim()),
};

const skip = () => {
  return env.NODE_ENV === 'test';
};

export const requestLogger = morgan(
  env.NODE_ENV === 'development'
    ? ':method :sanitized-url :status :res[content-length] - :response-time ms'
    : ':remote-addr - :remote-user [:date[clf]] ":method :sanitized-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms',
  { stream, skip }
);
