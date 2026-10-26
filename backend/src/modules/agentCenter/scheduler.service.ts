import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { Agent } from './agent.model';
import { AgentRun } from './agentRun.model';
import { AgentConfig, IAgentDocument } from './agent.interface';
import { AgentExecutionService } from './execution.service';
import { Task as TaskModel } from '../task/task.model';
import { Client as ClientModel } from '../client/client.model';

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

export function isAutomaticExpiryRemindersEnabled(): boolean {
  if (process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED !== undefined) {
    const raw = process.env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED.trim().toLowerCase();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }
  return env.AUTOMATIC_EXPIRY_REMINDERS_ENABLED === true;
}

export function isAutomaticRemindersRealSendEnabled(): boolean {
  if (process.env.AUTOMATIC_REMINDERS_REAL_SEND !== undefined) {
    const raw = process.env.AUTOMATIC_REMINDERS_REAL_SEND.trim().toLowerCase();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }
  return env.AUTOMATIC_REMINDERS_REAL_SEND === true;
}

export class AgentSchedulerService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  static isSchedulerActive(): boolean {
    return this.timer !== null;
  }

  static start(intervalMs = Number(process.env.AGENT_SCHEDULER_INTERVAL_MS) || 60000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick().catch((err) => logger.error('Agent scheduler error during tick:', err));
    }, intervalMs);
    // Initial run after short startup delay
    setTimeout(() => {
      void this.tick().catch((err) => logger.error('Agent scheduler initial tick error:', err));
    }, 5000);
    logger.info(`⏰ Agent background scheduler started (polling every ${intervalMs}ms)`);
  }

  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('🛑 Agent background scheduler stopped');
    }
  }

  /**
   * Retrieves an existing published agent for the module or creates a standard system reminder agent.
   */
  static async getOrCreateSystemAgent(orgId: string, module: 'DSC' | 'License'): Promise<IAgentDocument> {
    const existing = await Agent.findOne({ orgId, module, status: 'published' }).sort({ createdAt: 1 }).exec();
    if (existing) return existing;

    const name = `Automatic ${module} Expiry Reminders`;
    let systemAgent = await Agent.findOne({ orgId, module, name }).exec();
    if (!systemAgent) {
      systemAgent = await Agent.create({
        orgId,
        name,
        module,
        status: 'published',
        description: `Automated daily ${module} expiry reminder agent (dispatches at 15 and 10 calendar days before expiry).`,
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
    return systemAgent;
  }

  /**
   * Processes automatic DSC and License expiry reminders against real MongoDB Client records.
   * - Timezone: Asia/Kolkata
   * - Milestones: Exactly 15 and 10 calendar days before expiry
   * - Missed run handling without burst of duplicates
   * - Idempotent persistent runKey tracking
   */
  static async processAutomaticExpiryReminders(
    nowDate: Date = new Date(),
    options?: { forceEnable?: boolean; forceRealSend?: boolean }
  ): Promise<ExpiryReminderBatchResult> {
    const todayKolkataYMD = getKolkataYMD(nowDate);
    const isEnabled = options?.forceEnable !== undefined ? options.forceEnable : isAutomaticExpiryRemindersEnabled();
    const isRealSend = options?.forceRealSend !== undefined ? options.forceRealSend : isAutomaticRemindersRealSendEnabled();

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

          // Skip if more than 15 calendar days away
          if (daysLeft > 15) {
            continue;
          }

          // Deterministic milestone selection:
          // - 15-day milestone: 11 <= daysLeft <= 15
          // - 10-day milestone: 0 <= daysLeft <= 10
          // If a run was missed and daysLeft is <= 10, fire ONLY 10d (do not send a duplicate burst with 15d)
          let milestone: '15d' | '10d' | null = null;
          if (daysLeft > 10 && daysLeft <= 15) {
            milestone = '15d';
          } else if (daysLeft >= 0 && daysLeft <= 10) {
            milestone = '10d';
          }

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
            // Prevents concurrent worker races on new records, failed retries, and stale in-progress reclaims
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

          // Skip if more than 15 calendar days away
          if (daysLeft > 15) {
            continue;
          }

          let milestone: '15d' | '10d' | null = null;
          if (daysLeft > 10 && daysLeft <= 15) {
            milestone = '15d';
          } else if (daysLeft >= 0 && daysLeft <= 10) {
            milestone = '10d';
          }

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
            // Prevents concurrent worker races on new records, failed retries, and stale in-progress reclaims
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
   */
  static async tick(nowDate: Date = new Date()): Promise<SchedulerTickResult> {
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

    this.isRunning = true;
    const errors: string[] = [];
    let dispatchedRuns = 0;
    let evaluatedAgents = 0;

    try {
      const todayKolkataYMD = getKolkataYMD(nowDate);

      // Part 1: Process automatic DSC and License expiry reminders (if enabled)
      const autoRemindersResult = await this.processAutomaticExpiryReminders(nowDate);
      dispatchedRuns += autoRemindersResult.dispatchedReminders;
      if (autoRemindersResult.errors.length) {
        errors.push(...autoRemindersResult.errors);
      }

      // Part 2: Load all published user agents across tenant organizations for user-defined task triggers
      const publishedAgents = await Agent.find({ status: 'published' }).exec();
      evaluatedAgents = publishedAgents.length;

      for (const agent of publishedAgents) {
        const orgId = String(agent.orgId);
        const config = agent.config as AgentConfig;
        const trigger = (config?.trigger || '').trim();
        const normTrigger = trigger.toLowerCase();

        try {
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
                const targetYMD = parseDateToYMD(task.targetDueDate);
                if (!targetYMD) continue;
                const daysLeft = diffInCalendarDays(targetYMD, todayKolkataYMD);

                if (daysLeft >= 0 && daysLeft <= daysBeforeDue) {
                  const runKey = `sched:task-due:${String(agent._id)}:${String(task._id)}:${task.targetDueDate}:${todayKolkataYMD}`;
                  const existing = await AgentRun.findOne({ orgId, runKey }).select('_id').lean().exec();
                  if (!existing) {
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
                const targetYMD = parseDateToYMD(task.targetDueDate);
                if (!targetYMD) continue;
                const daysLeft = diffInCalendarDays(targetYMD, todayKolkataYMD);

                if (daysLeft < 0) {
                  const runKey = `sched:task-overdue:${String(agent._id)}:${String(task._id)}:${todayKolkataYMD}`;
                  const existing = await AgentRun.findOne({ orgId, runKey }).select('_id').lean().exec();
                  if (!existing) {
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
                const pendingDocs = (task.documentRequests || []).filter((d) => d.status === 'Pending');
                if (!pendingDocs.length) continue;

                const runKey = `sched:task-doc-repeat:${String(agent._id)}:${String(task._id)}:${todayKolkataYMD}`;
                const existing = await AgentRun.findOne({ orgId, runKey }).select('_id').lean().exec();
                if (!existing) {
                  const lastRun = await AgentRun.findOne({
                    orgId,
                    agentId: agent._id,
                    runKey: new RegExp(`^sched:task-doc-repeat:${String(agent._id)}:${String(task._id)}:`),
                  }).sort({ createdAt: -1 }).select('createdAt').lean().exec();

                  if (lastRun) {
                    const daysSinceLast = diffInCalendarDays(todayKolkataYMD, getKolkataYMD(new Date(lastRun.createdAt)));
                    if (daysSinceLast < repeatDays) continue;
                  }

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
                      pendingDocumentsCount: pendingDocs.length,
                      pendingDocumentNames: pendingDocs.map((d) => d.title).join(', '),
                    },
                    runType: 'actual',
                    idempotencyKey: runKey,
                  });
                  dispatchedRuns++;
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
      this.isRunning = false;
    }
  }
}
