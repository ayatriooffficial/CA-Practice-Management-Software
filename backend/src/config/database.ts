import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

type MongoFailureCategory = 'authentication' | 'DNS' | 'network access' | 'configuration' | 'unknown';

function describeMongoFailure(error: unknown): { category: MongoFailureCategory; message: string; rawError: string } {
  const value = error instanceof Error ? error : new Error(String(error));
  const code = 'code' in value ? String(value.code) : '';
  const name = value.name || '';
  const rawError = value.message || String(error);
  const diagnostic = `${name} ${code} ${rawError}`;

  if (code === '18' || /authentication failed|bad auth|auth failed|not authorized|sasl|scram/i.test(diagnostic)) {
    return {
      category: 'authentication',
      message: 'MongoDB rejected authentication. Check database username/password in MONGODB_URI in backend/.env.',
      rawError,
    };
  }
  if (/ENOTFOUND|ENODATA|ESERVFAIL|querySrv|EAI_AGAIN|getaddrinfo/i.test(diagnostic)) {
    return {
      category: 'DNS',
      message: 'MongoDB host DNS lookup failed. Atlas cluster hostname could not be resolved. Check your internet connection or cluster hostname.',
      rawError,
    };
  }
  if (/MongoParseError|ERR_INVALID_URL|Invalid scheme|URI malformed|MONGODB_URI/i.test(diagnostic)) {
    return {
      category: 'configuration',
      message: 'MongoDB URI is missing or malformed. Check MONGODB_URI in backend/.env.',
      rawError,
    };
  }
  if (/server selection|MongooseServerSelectionError|ECONNREFUSED|ETIMEDOUT|ECONNRESET|network|no reachable servers|whitelist/i.test(diagnostic)) {
    return {
      category: 'network access',
      message: 'MongoDB Atlas could not be reached. Most common causes:\n  1) Your IP address is not whitelisted in MongoDB Atlas (Go to cloud.mongodb.com -> Network Access -> Add IP -> allow 0.0.0.0/0 or your current IP).\n  2) Your Atlas free tier cluster is paused (Go to cloud.mongodb.com -> click Resume).\n  3) Outbound connection to Atlas port 27017 or DNS is blocked by firewall/ISP.',
      rawError,
    };
  }
  return {
    category: 'unknown',
    message: `MongoDB connection error: ${rawError}`,
    rawError,
  };
}

export const connectDatabase = async (): Promise<typeof mongoose> => {
  const tryConnect = async () => {
    mongoose.set('strictQuery', true);
    return await mongoose.connect(env.MONGODB_URI, {
      dbName: 'ayatrio_crm',
      autoIndex: env.NODE_ENV !== 'production',
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
  };

  try {
    const connection = await tryConnect();
    logger.info('✅ MongoDB connected successfully.');

    mongoose.connection.on('error', (err) => {
      const failure = describeMongoFailure(err);
      logger.error(`❌ MongoDB error (${failure.category}): ${failure.message}\n🔍 Details: ${failure.rawError}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected successfully.');
    });

    return connection;
  } catch (firstError: any) {
    // If connection failed on SRV DNS resolution, attempt fallback DNS
    const isSrv = env.MONGODB_URI.startsWith('mongodb+srv://');
    const isDnsError = /querySrv|ENOTFOUND|ESERVFAIL|getaddrinfo/i.test(String(firstError?.message || ''));

    if (isSrv && isDnsError) {
      try {
        logger.warn('⚠️ MongoDB DNS SRV lookup failed with default DNS. Retrying with fallback DNS (8.8.8.8)...');
        const dns = await import('dns');
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const connection = await tryConnect();
        logger.info('✅ MongoDB connected successfully via fallback DNS.');
        return connection;
      } catch (fallbackError) {
        // Fall through to failure logging below
      }
    }

    const failure = describeMongoFailure(firstError);
    logger.error(`❌ MongoDB connection failed (${failure.category}): ${failure.message}`);
    logger.error(`🔍 Details: ${failure.rawError}`);
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
