import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

type MongoFailureCategory = 'authentication' | 'DNS' | 'network access' | 'configuration' | 'unknown';

function describeMongoFailure(error: unknown): { category: MongoFailureCategory; message: string } {
  const value = error instanceof Error ? error : new Error(String(error));
  const code = 'code' in value ? String(value.code) : '';
  const diagnostic = `${value.name} ${code} ${value.message}`;

  if (code === '18' || /authentication failed|bad auth|auth failed|not authorized|sasl|scram/i.test(diagnostic)) {
    return { category: 'authentication', message: 'MongoDB rejected authentication. Check the rotated Atlas database user credentials in backend/.env.' };
  }
  if (/ENOTFOUND|ENODATA|ESERVFAIL|querySrv|DNS|EAI_AGAIN|getaddrinfo/i.test(diagnostic)) {
    return { category: 'DNS', message: 'MongoDB host lookup failed. Check the Atlas cluster hostname and the Mac network DNS configuration.' };
  }
  if (/MongoParseError|ERR_INVALID_URL|Invalid scheme|URI malformed|MONGODB_URI/i.test(diagnostic)) {
    return { category: 'configuration', message: 'MongoDB URI is missing or malformed. Check MONGODB_URI in backend/.env.' };
  }
  if (/server selection|ECONNREFUSED|ETIMEDOUT|ECONNRESET|network|no reachable servers/i.test(diagnostic)) {
    return { category: 'network access', message: 'MongoDB could not be reached. Check Atlas Network Access and outbound connectivity.' };
  }
  return { category: 'unknown', message: 'MongoDB connection failed. Check backend/.env and Atlas availability.' };
}

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    if (env.MONGODB_URI.startsWith('mongodb+srv://')) {
      const dns = await import('dns');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }

    mongoose.set('strictQuery', true);

    const connection = await mongoose.connect(env.MONGODB_URI, {
      dbName: 'ayatrio_crm',
      autoIndex: env.NODE_ENV !== 'production', // Don't auto-build indexes in production for high performance
      maxPoolSize: 50, // Optimal pool size for high concurrency
      minPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    logger.info('✅ MongoDB connected successfully.');

    mongoose.connection.on('error', (err) => {
      const failure = describeMongoFailure(err);
      logger.error(`❌ MongoDB connection error (${failure.category}): ${failure.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected successfully.');
    });

    return connection;
  } catch (error) {
    const failure = describeMongoFailure(error);
    logger.error(`❌ MongoDB connection failed (${failure.category}): ${failure.message}`);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close(false);
    logger.info('🔌 MongoDB connection closed gracefully.');
  } catch (error) {
    logger.error('❌ Error while closing MongoDB connection:', error);
  }
};
