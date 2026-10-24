import http from 'http';
import dns from 'dns';

// Ensure reliable DNS resolution for MongoDB Atlas SRV records on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Use system default if restricted
}

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { CounterService } from './modules/counter/counter.service';
import { initializeFinancialIndexes } from './modules/financials/financial.model';
import { AuthService } from './modules/auth/auth.service';

let server: http.Server | null = null;

const startServer = async (): Promise<void> => {
  try {
    // 1. Establish Database Connection
    await connectDatabase();

    // 2. Ensure admin account & seed data
    await AuthService.ensureSeedData();

    // 3. Ensure financial uniqueness and query indexes (production disables autoIndex)
    await initializeFinancialIndexes();

    // 4. Initialize Dedicated Counters Collection
    await CounterService.initializeCounters();

    // 5. Initialize Express Application
    const app = createApp();

    // 3. Start HTTP Server
    server = http.createServer(app);

    server.listen(env.PORT, () => {
      logger.info('====================================================');
      logger.info(`🚀 Ayatrio Production API Server is LIVE!`);
      logger.info(`📡 Port:        ${env.PORT}`);
      logger.info(`🌐 Environment: ${env.NODE_ENV}`);
      logger.info(`🩺 Health:     http://localhost:${env.PORT}${env.API_PREFIX}/health`);
      logger.info(`👥 Clients:    http://localhost:${env.PORT}${env.API_PREFIX}/clients`);
      logger.info(`🎯 Leads:      http://localhost:${env.PORT}${env.API_PREFIX}/leads`);
      logger.info('====================================================');
    });
  } catch (error) {
    logger.error('❌ Failed to launch server:', error);
    process.exit(1);
  }
};

// Graceful Shutdown Handler
const handleGracefulShutdown = (signal: string) => {
  logger.warn(`🛑 Received ${signal}. Starting graceful shutdown procedure...`);

  if (server) {
    server.close(async () => {
      logger.info('🛑 HTTP server closed.');
      await disconnectDatabase();
      logger.info('👋 Graceful shutdown process completed. Exiting.');
      process.exit(0);
    });

    // Force close after 10 seconds if hanging
    setTimeout(() => {
      logger.error('⚠️ Forcefully terminating process due to shutdown timeout.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Process Event Listeners
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('💥 Uncaught Exception detected:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('💥 Unhandled Promise Rejection detected:', reason);
  process.exit(1);
});

// Launch Server
startServer();
