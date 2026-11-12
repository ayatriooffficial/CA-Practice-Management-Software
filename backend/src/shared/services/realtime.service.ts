import { Response } from 'express';
import { EventEmitter } from 'events';
import { getRedisClient, getRedisSubscriber, isRedisAvailable } from '../../config/redis';
import { logger } from '../../config/logger';

export interface EntityChangeEvent {
  entity: 'client' | 'task' | 'invoice' | 'leads' | 'groups' | 'compliance' | 'team' | 'home';
  action: 'create' | 'update' | 'delete' | 'invalidate';
  entityId?: string;
  firmId?: string;
  timestamp: number;
}

const REDIS_CHANNEL = 'turia_entity_updates';

class RealtimeService {
  private localEmitter = new EventEmitter();
  private sseClients = new Set<Response>();
  private isSubscribed = false;

  constructor() {
    this.localEmitter.setMaxListeners(200);
  }

  /**
   * Initializes Redis subscription for multi-instance realtime fan-out.
   */
  public initSubscription(): void {
    if (this.isSubscribed) return;

    const subscriber = getRedisSubscriber();
    if (subscriber && isRedisAvailable()) {
      subscriber.subscribe(REDIS_CHANNEL, (err) => {
        if (err) {
          logger.warn(`[RealtimeService] Failed to subscribe to Redis channel: ${err.message}`);
        } else {
          this.isSubscribed = true;
          logger.info(`📡 Realtime service subscribed to Redis channel: "${REDIS_CHANNEL}"`);
        }
      });

      subscriber.on('message', (channel, message) => {
        if (channel === REDIS_CHANNEL) {
          try {
            const event: EntityChangeEvent = JSON.parse(message);
            this.broadcastToSseClients(event);
          } catch (err: any) {
            logger.warn(`[RealtimeService] Message parse error: ${err.message}`);
          }
        }
      });
    }

    // Local fallback listener
    this.localEmitter.on('local_change', (event: EntityChangeEvent) => {
      this.broadcastToSseClients(event);
    });
  }

  /**
   * Publishes an entity change to Redis (for all server replicas) and local SSE clients.
   */
  public async publishChange(
    entity: EntityChangeEvent['entity'],
    action: EntityChangeEvent['action'],
    metadata?: { entityId?: string; firmId?: string }
  ): Promise<void> {
    const event: EntityChangeEvent = {
      entity,
      action,
      entityId: metadata?.entityId,
      firmId: metadata?.firmId,
      timestamp: Date.now(),
    };

    const redis = getRedisClient();
    if (redis && isRedisAvailable()) {
      try {
        await redis.publish(REDIS_CHANNEL, JSON.stringify(event));
        return;
      } catch (err: any) {
        logger.warn(`[RealtimeService] Redis publish error: ${err.message}. Emitting locally.`);
      }
    }

    // If Redis is not available or disconnected, broadcast locally
    this.localEmitter.emit('local_change', event);
  }

  /**
   * Registers a client SSE connection.
   */
  public registerSseClient(res: Response): void {
    this.sseClients.add(res);

    // Initial heartbeat
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  /**
   * Broadcasts the change event to all active SSE browser connections.
   */
  private broadcastToSseClients(event: EntityChangeEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.sseClients.size;
  }
}

export const realtimeService = new RealtimeService();

