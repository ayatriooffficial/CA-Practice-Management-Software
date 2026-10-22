import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

// Set public DNS servers to resolve MongoDB SRV records reliably across all platforms/routers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignore if custom DNS cannot be applied in restricted environments
}

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    mongoose.set('strictQuery', true);

    const connection = await mongoose.connect(env.MONGODB_URI, {
      dbName: 'ayatrio_crm',
      autoIndex: env.NODE_ENV !== 'production', // Don't auto-build indexes in production for high performance
      maxPoolSize: 50, // Optimal pool size for high concurrency
      minPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB Connected successfully to host: ${mongoose.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected successfully.');
    });

    return connection;
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error);
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
