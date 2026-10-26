import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './config/logger';
import { AgentSchedulerService } from './modules/agentCenter/scheduler.service';

const startWorker = async (): Promise<void> => {
  try {
    logger.info('====================================================');
    logger.info('🤖 Ayatrio Dedicated Background Scheduler Worker');
    logger.info('====================================================');

    await connectDatabase();
    logger.info(' Connected to MongoDB');

    const interval = Number(process.env.AGENT_SCHEDULER_INTERVAL_MS) || 60000;
    AgentSchedulerService.start(interval);

    logger.info(`⚡ Worker is actively processing scheduled agents every ${interval}ms`);
  } catch (error) {
    logger.error('❌ Failed to launch scheduler worker:', error);
    process.exit(1);
  }
};

const handleShutdown = async (signal: string) => {
  logger.warn(`🛑 Received ${signal}. Stopping scheduler worker...`);
  AgentSchedulerService.stop();
  await disconnectDatabase();
  logger.info('👋 Scheduler worker gracefully stopped.');
  process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startWorker();
