import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { env, getConfiguredExpiryMilestones } from '../../config/env';
import { Agent } from './agent.model';
import { AgentRun } from './agentRun.model';
import { SchedulerLock } from './schedulerLock.model';
import { AgentConfig, IAgentDocument } from './agent.interface';
import { AgentExecutionService, isEmailConfigured } from './execution.service';
import { Task as TaskModel } from '../task/task.model';
import { Client as ClientModel } from '../client/client.model';
import { MailService } from '../../shared/utils/mailService';

export interface SchedulerTickResult {
  ran: boolean;
  timestamp: string;
  evaluatedAgents: number;
  dispatchedRuns: number;
  automaticReminders?: ExpiryReminderBatchResult;
  errors: string[];
}

export interface ExpiryReminderBatchResult {
  ran: boolean;
  timestamp: string;
  todayKolkataYMD: string;
  processedClients: number;
  processedDscs: number;
  processedLicenses: number;
  dispatchedReminders: number;
  skippedMissingRecipient: number;
  skippedInvalidDate: number;
  skippedAlreadyHandled: number;
  errors: string[];
}

/**
 * Returns YYYY-MM-DD for a given Date in Asia/Kolkata timezone.
 */
export function getKolkataYMD(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Parses any date string (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, Month Name, etc.)
 * into a normalized YYYY-MM-DD calendar string.
 */
export function parseDateToYMD(dateStr?: string | null): string | null {
  if (!dateStr || dateStr === '—' || dateStr === '-' || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(Number(ymdMatch[2])).padStart(2, '0');
    const d = String(Number(ymdMatch[3])).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = String(Number(dmyMatch[1])).padStart(2, '0');
    const m = String(Number(dmyMatch[2])).padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Pattern 3: standard Date parsing (e.g. "22 Oct 2031", "October 22, 2031", ISO strings)
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return getKolkataYMD(parsed);
  }

  return null;
}

/**
 * Calculates calendar days between two YYYY-MM-DD dates:
 * diff = targetDate - baseDate (positive if target is in the future).
 */
export function diffInCalendarDays(targetYMD: string, baseYMD: string): number {
  const [tY, tM, tD] = targetYMD.split('-').map(Number);
  const [bY, bM, bD] = baseYMD.split('-').map(Number);
  const tUtc = Date.UTC(tY, tM - 1, tD);
  const bUtc = Date.UTC(bY, bM - 1, bD);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((tUtc - bUtc) / msPerDay);
}

// Backward compatibility helpers
export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(dateStr: string): Date | null {
  if (!dateStr || dateStr === '—' || dateStr === '-') return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function diffInDays(target: Date, base: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const utcBase = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate());
  return Math.round((utcTarget - utcBase) / msPerDay);
}

/**
 * Resolves milestone string (e.g. '15d', '10d', '30d', '7d') for a given daysLeft.
 * Defaults to [15, 10] if not specified:
 * - 15-day milestone: 11 <= daysLeft <= 15
 * - 10-day milestone: 0 <= daysLeft <= 10
 * For custom milestones e.g. [30, 15, 10, 7]:
 * - 30d: 16 <= daysLeft <= 30
 * - 15d: 11 <= daysLeft <= 15
 * - 10d: 8 <= daysLeft <= 10
 * - 7d: 0 <= daysLeft <= 7
 */
export function resolveExpiryMilestone(
  daysLeft: number,
  milestones: number[] = [15, 10]
): string | null {
  if (daysLeft < 0) return null;
  const sorted = [...new Set(milestones)].sort((a, b) => b - a);
  for (let i = 0; i < sorted.length; i++) {
    const high = sorted[i];
    const low = i < sorted.length - 1 ? sorted[i + 1] : 0;
    if (i === sorted.length - 1) {
      if (daysLeft >= 0 && daysLeft <= high) {
        return `${high}d`;
      }
    } else {
      if (daysLeft > low && daysLeft <= high) {
        return `${high}d`;
      }
    }
  }
  return null;
}

export function isAutomaticExpiryRemindersEnabled(): boolean {
  if (process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED !== undefined) {
    const raw = process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED.trim().toLowerCase();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }
  if (env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED === true) return true;
  return process.env.NODE_ENV === 'production';
}

export async function isAutomaticRemindersRealSendEnabledAsync(): Promise<boolean> {
  if (process.env.AUTOMATIC_REMINDERS_REAL_SEND !== undefined) {
    const raw = process.env.AUTOMATIC_REMINDERS_REAL_SEND.trim().toLowerCase();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }
  if (env.AUTOMATIC_REMINDERS_REAL_SEND === true) return true;
  if (process.env.NODE_ENV === 'production') {
    const mailStatus = await MailService.getStatus();
    return mailStatus.authorized;
  }
  return false;
}

export function isAutomaticRemindersRealSendEnabled(): boolean {
  if (process.env.AUTOMATIC_REMINDERS_REAL_SEND !== undefined) {
    const raw = process.env.AUTOMATIC_REMINDERS_REAL_SEND.trim().toLowerCase();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }
  if (env.AUTOMATIC_REMINDERS_REAL_SEND === true) return true;
  if (process.env.NODE_ENV === 'production') {
    return isEmailConfigured();
  }
  return false;
}

export class AgentSchedulerService {
  private static timer: NodeJS.Timeout | null = null;
  private static initialTimer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static instanceId = randomUUID();

  static getInstanceId(): string {
    return this.instanceId;
  }

  static isSchedulerActive(): boolean {
    return this.timer !== null;
  }

  /**
   * Distributed single-owner leader lock between API server and background workers.
   */
  static async acquireLeaderLock(leaseDurationMs = 60000): Promise<boolean> {
    if (mongoose.connection.readyState !== 1) return false;
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

    try {
      const lock = await SchedulerLock.findOneAndUpdate(
        {
          _id: 'agent-center-scheduler-leader',
          $or: [
            { leaseExpiresAt: { $lt: now } },
            { instanceId: this.instanceId },
          ],
        },
        {
          $set: {
            instanceId: this.instanceId,
            leaseExpiresAt,
            updatedAt: now,
          },
        },
        { upsert: true, new: true }
      ).exec();

      return lock?.instanceId === this.instanceId;
    } catch (err: any) {
      if (err?.code === 11000) {
        return false;
      }
      logger.warn('Error acquiring scheduler leader lock:', err?.message || err);
      return false;
    }
  }

  /**
   * Heartbeat to extend the leader lease during active execution.
   */
  static async renewLeaderLock(leaseDurationMs = 60000): Promise<boolean> {
    if (mongoose.connection.readyState !== 1) return false;
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

    try {
      const lock = await SchedulerLock.findOneAndUpdate(
        {
          _id: 'agent-center-scheduler-leader',
          instanceId: this.instanceId,
        },
        {
          $set: {
            leaseExpiresAt,
            updatedAt: now,
          },
        },
        { new: true }
      ).exec();

      return lock?.instanceId === this.instanceId;
    } catch (err: any) {
      logger.warn('Error renewing scheduler leader lock heartbeat:', err?.message || err);
      return false;
    }
  }

  static async releaseLeaderLock(): Promise<void> {
    if (mongoose.connection.readyState !== 1) return;
    try {
      await SchedulerLock.deleteOne({
        _id: 'agent-center-scheduler-leader',
        instanceId: this.instanceId,
      }).exec();
    } catch {
      // Ignore release errors on shutdown
    }
  }

  static start(intervalMs = Number(process.env.AGENT_SCHEDULER_INTERVAL_MS) || 60000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick().catch((err) => logger.error('Agent scheduler error during tick:', err));
    }, intervalMs);
    // Initial run after short startup delay
    this.initialTimer = setTimeout(() => {
      this.initialTimer = null;
      void this.tick().catch((err) => logger.error('Agent scheduler initial tick error:', err));
    }, 5000);
    logger.info(`⏰ Agent background scheduler started (polling every ${intervalMs}ms)`);
  }

  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.initialTimer) {
      clearTimeout(this.initialTimer);
      this.initialTimer = null;
    }
    void this.releaseLeaderLock();
    logger.info('🛑 Agent background scheduler stopped');
  }

  /**
   * Retrieves or creates a dedicated system reminder agent.
   * STRICT ISOLATION: System agents are tagged with isSystem: true and a unique systemKey.
   * User-created agents are never selected or hijacked.
   */
  static async getOrCreateSystemAgent(orgId: string, module: 'DSC' | 'License'): Promise<IAgentDocument> {
    const systemKey = `system:${module.toLowerCase()}:expiry-reminder`;
    const existing = await Agent.findOne({ orgId, isSystem: true, systemKey }).exec();
    if (existing) return existing;

    const name = `Automatic ${module} Expiry Reminders`;
    const legacy = await Agent.findOne({ orgId, module, name }).exec();
    if (legacy) {
      legacy.isSystem = true;
      legacy.systemKey = systemKey;
      return await legacy.save();
    }

    return await Agent.create({
      orgId,
      name,
      module,
      status: 'published',
      isSystem: true,
      systemKey,
      description: `Automated daily ${module} expiry reminder agent (dispatches configurable milestones before expiry).`,
      config: module === 'DSC' ? {
        trigger: 'DSC Expiry Approaching',
        conditions: { daysBeforeExpiry: 15 },
        recipient: ['Client'],
        channel: 'Email',
        action: 'Send expiry reminder',
        templateId: 'custom',
        subject: 'Expiry Reminder: Digital Signature for {{dsc.holder}} expires in {{daysLeft}} days',
        message: 'Dear {{client.name}},\n\nThis is an automated reminder that your Digital Signature Certificate (DSC ID: {{dsc.dscId}}, Holder: {{dsc.holder}}) will expire on {{dsc.expiryDate}} ({{daysLeft}} days remaining).\n\nPlease contact our office to initiate the renewal process.\n\nRegards,\nCA Practice Management',
      } : {
        trigger: 'License Expiry Approaching',
        conditions: { daysBeforeExpiry: 15 },
        recipient: ['Client'],
        channel: 'Email',
        action: 'Send renewal reminder',
        templateId: 'custom',
        subject: 'Expiry Reminder: License {{license.name}} expires in {{daysLeft}} days',
        message: 'Dear {{client.name}},\n\nThis is an automated reminder that your license {{license.name}} (No: {{license.licenseNo}}) will expire on {{license.expiryDate}} ({{daysLeft}} days remaining).\n\nPlease arrange for timely renewal to avoid compliance penalties.\n\nRegards,\nCA Practice Management',
      },
    });
  }

  /**
   * Processes automatic DSC and License expiry reminders against real MongoDB Client records.
   * - Timezone: Asia/Kolkata
   * - Milestones: Configurable milestones (defaults to 15 and 10 calendar days)
   * - Missed run handling without burst of duplicates
   * - Idempotent persistent runKey tracking with atomic CAS claims
   */
  static async processAutomaticExpiryReminders(
    nowDate: Date = new Date(),
    options?: { forceEnable?: boolean; forceRealSend?: boolean; milestones?: number[]; isLockLost?: () => boolean }
  ): Promise<ExpiryReminderBatchResult> {
    const todayKolkataYMD = getKolkataYMD(nowDate);
    const isEnabled = options?.forceEnable !== undefined ? options.forceEnable : isAutomaticExpiryRemindersEnabled();
    const isRealSend = options?.forceRealSend !== undefined
      ? options.forceRealSend
      : await isAutomaticRemindersRealSendEnabledAsync();
    const milestones = options?.milestones && options.milestones.length
      ? options.milestones
      : getConfiguredExpiryMilestones();
    const maxMilestone = Math.max(...milestones);

    const result: ExpiryReminderBatchResult = {
      ran: false,
      timestamp: nowDate.toISOString(),
      todayKolkataYMD,
      processedClients: 0,
      processedDscs: 0,
      processedLicenses: 0,
      dispatchedReminders: 0,
      skippedMissingRecipient: 0,
      skippedInvalidDate: 0,
      skippedAlreadyHandled: 0,
      errors: [],
    };

    if (!isEnabled) {
      result.errors.push('Automatic expiry reminders are disabled by configuration (AUTOMATIC_EXPIRY_REMINDERS_ENABLED=false).');
      return result;
    }

    if (mongoose.connection.readyState !== 1) {
      result.errors.push('MongoDB not connected');
      return result;
    }

    result.ran = true;

    try {
      const clients = await ClientModel.find({
        isDeleted: false,
        $or: [
          { 'dscs.0': { $exists: true } },
          { 'licenses.0': { $exists: true } },
        ],
      }).lean().exec();

      result.processedClients = clients.length;

      for (const client of clients) {
        if (options?.isLockLost && options.isLockLost()) {
          const lockMsg = 'processAutomaticExpiryReminders halted: scheduler leader lock lease was lost.';
          logger.warn(lockMsg);
          result.errors.push(lockMsg);
          break;
        }

        const clientOrgId = String(client.orgId || 'default');
        const clientEmail = (client.email || '').trim().toLowerCase();
        const hasValidEmail = Boolean(clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail));

        // 1. Process DSC records
        for (const dsc of client.dscs || []) {
          result.processedDscs++;
          if (dsc.status && String(dsc.status).toLowerCase() !== 'active') {
            continue;
          }

          const expYMD = parseDateToYMD(dsc.expiryDate);
          if (!expYMD) {
            result.skippedInvalidDate++;
            logger.warn(`Skipping DSC reminder for "${dsc.name || dsc.dscId}" on client "${client.name}" (${client._id}): Invalid or missing expiryDate "${dsc.expiryDate}".`);
            continue;
          }

          const daysLeft = diffInCalendarDays(expYMD, todayKolkataYMD);

          // Skip if already expired (pre-expiry reminders are only for unexpired assets)
          if (daysLeft < 0) {
            continue;
          }

          // Skip if beyond the maximum reminder window
          if (daysLeft > maxMilestone) {
            continue;
          }

          const milestone = resolveExpiryMilestone(daysLeft, milestones);
          if (!milestone) continue;

          const dscKey = String(dsc.dscId || dsc.id || dsc.name || 'default').trim();
          const runKey = `remind:dsc-expiry:${milestone}:${String(client._id)}:${dscKey}:${expYMD}`;

          if (!hasValidEmail) {
            result.skippedMissingRecipient++;
            logger.warn(`Skipping ${milestone} DSC reminder for "${dsc.name || dscKey}" on client "${client.name}" (${client._id}): Missing valid client email.`);
            continue;
          }

          try {
            const agent = await AgentSchedulerService.getOrCreateSystemAgent(clientOrgId, 'DSC');

            // ATOMIC COMPARE-AND-SWAP CLAIM:
            const claimResult = await AgentExecutionService.acquireAtomicClaim({
              orgId: clientOrgId,
              agentId: agent._id,
              agentName: agent.name,
              agentModule: 'DSC',
              runKey,
              isRealSend,
              triggerData: { milestone, daysLeft, dscKey, expYMD },
            });

            if (!claimResult.acquired) {
              result.skippedAlreadyHandled++;
              continue;
            }

            await AgentExecutionService.run(String(agent._id), {
              orgId: clientOrgId,
              event: {
                clientId: String(client._id),
                clientName: client.name,
                clientEmail,
                dsc: {
                  id: dsc.id,
                  dscId: dsc.dscId || '—',
                  holder: dsc.name,
                  name: dsc.name,
                  expiryDate: dsc.expiryDate,
                  vendor: dsc.vendor || '—',
                  certificateClass: dsc.class || 'Class 3',
                  location: dsc.location || 'CA Office',
                },
                daysLeft,
                daysToExpiry: daysLeft,
                milestone,
              },
              runType: isRealSend ? 'actual' : 'test',
              idempotencyKey: runKey,
              claimedRun: claimResult.run,
            });
            result.dispatchedReminders++;
          } catch (execErr: any) {
            const errStr = `Error dispatching DSC reminder (${milestone}) for "${dsc.name}" on client "${client.name}": ${execErr?.message || execErr}`;
            logger.error(errStr);
            result.errors.push(errStr);
          }
        }

        // 2. Process License records
        for (const lic of client.licenses || []) {
          result.processedLicenses++;

          const expYMD = parseDateToYMD(lic.expiryDate);
          if (!expYMD) {
            result.skippedInvalidDate++;
            logger.warn(`Skipping License reminder for "${lic.name || lic.licenseNo}" on client "${client.name}" (${client._id}): Invalid or missing expiryDate "${lic.expiryDate}".`);
            continue;
          }

          const daysLeft = diffInCalendarDays(expYMD, todayKolkataYMD);

          // Skip if already expired
          if (daysLeft < 0) {
            continue;
          }

          // Skip if beyond the maximum reminder window
          if (daysLeft > maxMilestone) {
            continue;
          }

          const milestone = resolveExpiryMilestone(daysLeft, milestones);
          if (!milestone) continue;

          const licKey = String(lic.licenseNo || lic.id || lic.name || 'default').trim();
          const runKey = `remind:lic-expiry:${milestone}:${String(client._id)}:${licKey}:${expYMD}`;

          if (!hasValidEmail) {
            result.skippedMissingRecipient++;
            logger.warn(`Skipping ${milestone} License reminder for "${lic.name || licKey}" on client "${client.name}" (${client._id}): Missing valid client email.`);
            continue;
          }

          try {
            const agent = await AgentSchedulerService.getOrCreateSystemAgent(clientOrgId, 'License');

            // ATOMIC COMPARE-AND-SWAP CLAIM:
            const claimResult = await AgentExecutionService.acquireAtomicClaim({
              orgId: clientOrgId,
              agentId: agent._id,
              agentName: agent.name,
              agentModule: 'License',
              runKey,
              isRealSend,
              triggerData: { milestone, daysLeft, licKey, expYMD },
            });

            if (!claimResult.acquired) {
              result.skippedAlreadyHandled++;
              continue;
            }

            await AgentExecutionService.run(String(agent._id), {
              orgId: clientOrgId,
              event: {
                clientId: String(client._id),
                clientName: client.name,
                clientEmail,
                license: {
                  id: lic.id,
                  licenseNo: lic.licenseNo || '—',
                  name: lic.name,
                  owner: client.name,
                  expiryDate: lic.expiryDate,
                },
                daysLeft,
                daysToExpiry: daysLeft,
                milestone,
              },
              runType: isRealSend ? 'actual' : 'test',
              idempotencyKey: runKey,
              claimedRun: claimResult.run,
            });
            result.dispatchedReminders++;
          } catch (execErr: any) {
            const errStr = `Error dispatching License reminder (${milestone}) for "${lic.name}" on client "${client.name}": ${execErr?.message || execErr}`;
            logger.error(errStr);
            result.errors.push(errStr);
          }
        }
      }
    } catch (err: any) {
      const errStr = `Critical error in processAutomaticExpiryReminders: ${err?.message || err}`;
      logger.error(errStr);
      result.errors.push(errStr);
    }

    return result;
  }

  /**
   * Main scheduler execution tick.
   * Accepts a deterministic `now` Date for unit and integration testing.
   * Uses leader lock to ensure only one worker processes ticks across distributed nodes.
   */
  static async tick(nowDate: Date = new Date(), options?: { skipLock?: boolean }): Promise<SchedulerTickResult> {
    if (mongoose.connection.readyState !== 1) {
      return {
        ran: false,
        timestamp: nowDate.toISOString(),
        evaluatedAgents: 0,
        dispatchedRuns: 0,
        errors: ['MongoDB not connected'],
      };
    }

    if (this.isRunning) {
      return {
        ran: false,
        timestamp: nowDate.toISOString(),
        evaluatedAgents: 0,
        dispatchedRuns: 0,
        errors: ['Scheduler tick skipped: previous tick is still active.'],
      };
    }

    if (!options?.skipLock) {
      const isLeader = await this.acquireLeaderLock();
      if (!isLeader) {
        return {
          ran: false,
          timestamp: nowDate.toISOString(),
          evaluatedAgents: 0,
          dispatchedRuns: 0,
          errors: ['Scheduler tick skipped: another instance holds leader lock.'],
        };
      }
    }

    this.isRunning = true;
    const errors: string[] = [];
    let dispatchedRuns = 0;
    let evaluatedAgents = 0;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let lockOwnershipLost = false;

    if (!options?.skipLock) {
      heartbeatTimer = setInterval(() => {
        void this.renewLeaderLock().then((renewed) => {
          if (!renewed) {
            lockOwnershipLost = true;
            logger.warn('Scheduler leader lock lease lost during execution tick.');
          }
        }).catch(() => {
          lockOwnershipLost = true;
        });
      }, 20000);
    }

    try {
      const todayKolkataYMD = getKolkataYMD(nowDate);

      // Part 1: Process automatic DSC and License expiry reminders (if enabled)
      const autoRemindersResult = await this.processAutomaticExpiryReminders(nowDate, {
        isLockLost: () => lockOwnershipLost,
      });
      dispatchedRuns += autoRemindersResult.dispatchedReminders;
      if (autoRemindersResult.errors.length) {
        errors.push(...autoRemindersResult.errors);
      }

      // Part 1b: Process active client follow-up reminder cycles and stop conditions
      try {
        const { FollowUpService } = await import('./followUp.service');
        const followUpResults = await FollowUpService.processScheduledFollowUps({
          nowDate,
          forceRealSend: await isAutomaticRemindersRealSendEnabledAsync(),
          isLockLost: () => lockOwnershipLost,
        });
        dispatchedRuns += followUpResults.reminded;
        if (followUpResults.errors.length) {
          errors.push(...followUpResults.errors);
        }

        // Part 1c: Process inbound Gmail replies if configured
        if (env.GMAIL_INBOUND_ENABLED || process.env.GMAIL_INBOUND_ENABLED === 'true') {
          const gmailInboundResults = await FollowUpService.processInboundGmailReplies();
          if (gmailInboundResults.errors.length) {
            errors.push(...gmailInboundResults.errors);
          }
        }
      } catch (fErr: any) {
        logger.warn(`Follow-up scheduler cycle error: ${fErr?.message || fErr}`);
      }

      // Part 2: Load all published user agents across tenant organizations for user-defined task/dsc/license triggers
      const publishedAgents = await Agent.find({ status: 'published' }).exec();
      evaluatedAgents = publishedAgents.length;

      for (const agent of publishedAgents) {
        if (lockOwnershipLost) {
          const errStr = 'Halted tick execution: scheduler leader lock ownership was lost.';
          logger.warn(errStr);
          errors.push(errStr);
          break;
        }
        if (agent.isSystem) continue; // Dedicated system agents are handled in Part 1
        const orgId = String(agent.orgId);
        const config = agent.config as AgentConfig;
        const trigger = (config?.trigger || '').trim();
        const normTrigger = trigger.toLowerCase();

        try {
          // --- TASK MODULE TRIGGERS ---
          if (agent.module === 'Task') {
            // Task: Due Date Approaching / Task due soon
            if (normTrigger === 'due date approaching' || normTrigger === 'task due soon') {
              const daysBeforeDue = config.conditions?.daysBeforeDue ?? 2;
              const tasks = await TaskModel.find({
                orgId,
                status: { $ne: 'Completed' },
                isDeleted: false,
                targetDueDate: { $exists: true, $ne: '' },
              }).lean().exec();

              for (const task of tasks) {
                if (lockOwnershipLost) break;
                const targetYMD = parseDateToYMD(task.targetDueDate);
                if (!targetYMD) continue;
                const daysLeft = diffInCalendarDays(targetYMD, todayKolkataYMD);

                if (daysLeft >= 0 && daysLeft <= daysBeforeDue) {
                  const runKey = `sched:task-due:${String(agent._id)}:${String(task._id)}:${task.targetDueDate}:${todayKolkataYMD}`;
                  const claimResult = await AgentExecutionService.acquireAtomicClaim({
                    orgId,
                    agentId: agent._id,
                    agentName: agent.name,
                    agentModule: 'Task',
                    runKey,
                    isRealSend: true,
                    triggerData: { targetYMD, daysLeft, taskId: task.taskId },
                  });

                  if (claimResult.acquired) {
                    await AgentExecutionService.run(String(agent._id), {
                      orgId,
                      event: {
                        id: String(task._id),
                        taskId: task.taskId || String(task._id),
                        taskName: task.taskName,
                        clientId: task.clientId ? String(task.clientId) : '',
                        clientName: task.clientName || '',
                        status: task.status,
                        priority: task.priority,
                        targetDueDate: task.targetDueDate,
                        assigneeId: task.assigneeId ? String(task.assigneeId) : '',
                        assigneeName: task.assigneeName || '',
                        daysUntilDue: daysLeft,
                      },
                      runType: 'actual',
                      idempotencyKey: runKey,
                      claimedRun: claimResult.run,
                    });
                    dispatchedRuns++;
                  }
                }
              }
            }

            // Task: Task Overdue
            if (normTrigger === 'task overdue') {
              const tasks = await TaskModel.find({
                orgId,
                status: { $ne: 'Completed' },
                isDeleted: false,
                targetDueDate: { $exists: true, $ne: '' },
              }).lean().exec();

              for (const task of tasks) {
                if (lockOwnershipLost) break;
                const targetYMD = parseDateToYMD(task.targetDueDate);
                if (!targetYMD) continue;
                const daysLeft = diffInCalendarDays(targetYMD, todayKolkataYMD);

                if (daysLeft < 0) {
                  const runKey = `sched:task-overdue:${String(agent._id)}:${String(task._id)}:${todayKolkataYMD}`;
                  const claimResult = await AgentExecutionService.acquireAtomicClaim({
                    orgId,
                    agentId: agent._id,
                    agentName: agent.name,
                    agentModule: 'Task',
                    runKey,
                    isRealSend: true,
                    triggerData: { targetYMD, daysLeft, taskId: task.taskId },
                  });

                  if (claimResult.acquired) {
                    await AgentExecutionService.run(String(agent._id), {
                      orgId,
                      event: {
                        id: String(task._id),
                        taskId: task.taskId || String(task._id),
                        taskName: task.taskName,
                        clientId: task.clientId ? String(task.clientId) : '',
                        clientName: task.clientName || '',
                        status: task.status,
                        priority: task.priority,
                        targetDueDate: task.targetDueDate,
                        assigneeId: task.assigneeId ? String(task.assigneeId) : '',
                        assigneeName: task.assigneeName || '',
                        overdueDays: Math.abs(daysLeft),
                      },
                      runType: 'actual',
                      idempotencyKey: runKey,
                      claimedRun: claimResult.run,
                    });
                    dispatchedRuns++;
                  }
                }
              }
            }

            // Task: Document Request (Repeating)
            if (normTrigger === 'document request (repeating)') {
              const repeatDays = config.conditions?.repeatIntervalDays ?? 3;
              const tasks = await TaskModel.find({
                orgId,
                status: { $ne: 'Completed' },
                isDeleted: false,
                'documentRequests.status': 'Pending',
              }).lean().exec();

              for (const task of tasks) {
                if (lockOwnershipLost) break;
                const pendingDocs = (task.documentRequests || []).filter((d) => d.status === 'Pending');
                if (!pendingDocs.length) continue;

                const runKey = `sched:task-doc-repeat:${String(agent._id)}:${String(task._id)}:${todayKolkataYMD}`;
                const lastRun = await AgentRun.findOne({
                  orgId,
                  agentId: agent._id,
                  runKey: new RegExp(`^sched:task-doc-repeat:${String(agent._id)}:${String(task._id)}:`),
                }).sort({ createdAt: -1 }).select('createdAt').lean().exec();

                if (lastRun) {
                  const daysSinceLast = diffInCalendarDays(todayKolkataYMD, getKolkataYMD(new Date(lastRun.createdAt)));
                  if (daysSinceLast < repeatDays) continue;
                }

                const claimResult = await AgentExecutionService.acquireAtomicClaim({
                  orgId,
                  agentId: agent._id,
                  agentName: agent.name,
                  agentModule: 'Task',
                  runKey,
                  isRealSend: true,
                  triggerData: { pendingDocsCount: pendingDocs.length },
                });

                if (claimResult.acquired) {
                  await AgentExecutionService.run(String(agent._id), {
                    orgId,
                    event: {
                      id: String(task._id),
                      taskId: task.taskId || String(task._id),
                      taskName: task.taskName,
                      clientId: task.clientId ? String(task.clientId) : '',
                      clientName: task.clientName || '',
                      status: task.status,
                      priority: task.priority,
                      targetDueDate: task.targetDueDate,
                      documentRequestId: pendingDocs[0]?.id,
                      documentTitle: pendingDocs[0]?.title,
                      pendingDocumentsCount: pendingDocs.length,
                      pendingDocumentNames: pendingDocs.map((d) => d.title).join(', '),
                    },
                    runType: 'actual',
                    idempotencyKey: runKey,
                    claimedRun: claimResult.run,
                  });
                  dispatchedRuns++;
                }
              }
            }
          }

          // --- DSC MODULE USER AGENT TRIGGERS ---
          if (agent.module === 'DSC') {
            const isApproaching = normTrigger === 'dsc expiry approaching' || normTrigger === 'renewal required';
            const isExpired = normTrigger === 'dsc expired';

            if (isApproaching || isExpired) {
              const thresholdDays = config.conditions?.daysBeforeExpiry ?? 30;
              const clients = await ClientModel.find({
                orgId,
                isDeleted: false,
                'dscs.0': { $exists: true },
              }).lean().exec();

              for (const client of clients) {
                if (lockOwnershipLost) break;
                const clientEmail = (client.email || '').trim().toLowerCase();
                for (const dsc of client.dscs || []) {
                  if (dsc.status && String(dsc.status).toLowerCase() !== 'active') continue;
                  const expYMD = parseDateToYMD(dsc.expiryDate);
                  if (!expYMD) continue;
                  const daysLeft = diffInCalendarDays(expYMD, todayKolkataYMD);
                  const dscKey = String(dsc.dscId || dsc.id || dsc.name || 'default').trim();

                  let shouldTrigger = false;
                  let runKey = '';

                  if (isApproaching && daysLeft >= 0 && daysLeft <= thresholdDays) {
                    shouldTrigger = true;
                    runKey = `sched:user-dsc-due:${String(agent._id)}:${String(client._id)}:${dscKey}:${expYMD}:${todayKolkataYMD}`;
                  } else if (isExpired && daysLeft < 0 && daysLeft >= -7) {
                    shouldTrigger = true;
                    runKey = `sched:user-dsc-exp:${String(agent._id)}:${String(client._id)}:${dscKey}:${expYMD}`;
                  }

                  if (shouldTrigger && runKey) {
                    const claimResult = await AgentExecutionService.acquireAtomicClaim({
                      orgId,
                      agentId: agent._id,
                      agentName: agent.name,
                      agentModule: 'DSC',
                      runKey,
                      isRealSend: true,
                      triggerData: { daysLeft, expYMD, dscKey },
                    });

                    if (claimResult.acquired) {
                      await AgentExecutionService.run(String(agent._id), {
                        orgId,
                        event: {
                          clientId: String(client._id),
                          clientName: client.name,
                          clientEmail,
                          dsc: {
                            id: dsc.id,
                            dscId: dsc.dscId || '—',
                            holder: dsc.name,
                            name: dsc.name,
                            expiryDate: dsc.expiryDate,
                            vendor: dsc.vendor || '—',
                            certificateClass: dsc.class || 'Class 3',
                            location: dsc.location || 'CA Office',
                          },
                          daysLeft,
                          daysToExpiry: daysLeft,
                          expired: daysLeft < 0,
                        },
                        runType: 'actual',
                        idempotencyKey: runKey,
                        claimedRun: claimResult.run,
                      });
                      dispatchedRuns++;
                    }
                  }
                }
              }
            }
          }

          // --- LICENSE MODULE USER AGENT TRIGGERS ---
          if (agent.module === 'License') {
            const isApproaching = normTrigger === 'license expiry approaching' || normTrigger === 'renewal required';
            const isExpired = normTrigger === 'license expired';

            if (isApproaching || isExpired) {
              const thresholdDays = config.conditions?.daysBeforeExpiry ?? 30;
              const clients = await ClientModel.find({
                orgId,
                isDeleted: false,
                'licenses.0': { $exists: true },
              }).lean().exec();

              for (const client of clients) {
                if (lockOwnershipLost) break;
                const clientEmail = (client.email || '').trim().toLowerCase();
                for (const lic of client.licenses || []) {
                  const expYMD = parseDateToYMD(lic.expiryDate);
                  if (!expYMD) continue;
                  const daysLeft = diffInCalendarDays(expYMD, todayKolkataYMD);
                  const licKey = String(lic.licenseNo || lic.id || lic.name || 'default').trim();

                  let shouldTrigger = false;
                  let runKey = '';

                  if (isApproaching && daysLeft >= 0 && daysLeft <= thresholdDays) {
                    shouldTrigger = true;
                    runKey = `sched:user-lic-due:${String(agent._id)}:${String(client._id)}:${licKey}:${expYMD}:${todayKolkataYMD}`;
                  } else if (isExpired && daysLeft < 0 && daysLeft >= -7) {
                    shouldTrigger = true;
                    runKey = `sched:user-lic-exp:${String(agent._id)}:${String(client._id)}:${licKey}:${expYMD}`;
                  }

                  if (shouldTrigger && runKey) {
                    const claimResult = await AgentExecutionService.acquireAtomicClaim({
                      orgId,
                      agentId: agent._id,
                      agentName: agent.name,
                      agentModule: 'License',
                      runKey,
                      isRealSend: true,
                      triggerData: { daysLeft, expYMD, licKey },
                    });

                    if (claimResult.acquired) {
                      await AgentExecutionService.run(String(agent._id), {
                        orgId,
                        event: {
                          clientId: String(client._id),
                          clientName: client.name,
                          clientEmail,
                          license: {
                            id: lic.id,
                            licenseNo: lic.licenseNo || '—',
                            name: lic.name,
                            owner: client.name,
                            expiryDate: lic.expiryDate,
                          },
                          daysLeft,
                          daysToExpiry: daysLeft,
                          expired: daysLeft < 0,
                        },
                        runType: 'actual',
                        idempotencyKey: runKey,
                        claimedRun: claimResult.run,
                      });
                      dispatchedRuns++;
                    }
                  }
                }
              }
            }
          }
        } catch (agentErr: any) {
          const errStr = `Error evaluating agent "${agent.name}" (${agent._id}): ${agentErr?.message || agentErr}`;
          logger.error(errStr);
          errors.push(errStr);
        }
      }

      return {
        ran: true,
        timestamp: nowDate.toISOString(),
        evaluatedAgents,
        dispatchedRuns,
        automaticReminders: autoRemindersResult,
        errors,
      };
    } finally {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      this.isRunning = false;
    }
  }
}
