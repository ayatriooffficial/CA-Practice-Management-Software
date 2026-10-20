import morgan, { StreamOptions } from 'morgan';
import { logger } from '../config/logger';
import { env } from '../config/env';

const stream: StreamOptions = {
  write: (message: string) => logger.http(message.trim()),
};

const skip = () => {
  return env.NODE_ENV === 'test';
};

export const requestLogger = morgan(
  env.NODE_ENV === 'development'
    ? ':method :url :status :res[content-length] - :response-time ms'
    : ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms',
  { stream, skip }
);
