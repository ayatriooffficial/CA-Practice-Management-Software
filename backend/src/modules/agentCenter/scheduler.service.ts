import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { Agent } from './agent.model';
import { AgentRun } from './agentRun.model';
import { AgentConfig } from './agent.interface';
import { AgentExecutionService } from './execution.service';
import { Task as TaskModel } from '../task/task.model';
import { Client as ClientModel } from '../client/client.model';

export interface SchedulerTickResult {
  ran: boolean;
  timestamp: string;
  evaluatedAgents: number;
  dispatchedRuns: number;
  errors: string[];
}

export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(dateStr: string): Date | null {
  if (!dateStr || dateStr === '—' || dateStr === '-') return null;
  // Handle YYYY-MM-DD
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
      const todayYMD = formatDateYMD(nowDate);

      // Load all published agents across all tenant organizations
      const publishedAgents = await Agent.find({ status: 'published' }).exec();
      evaluatedAgents = publishedAgents.length;

      for (const agent of publishedAgents) {
        const orgId = String(agent.orgId);
        const config = agent.config as AgentConfig;
        const trigger = (config?.trigger || '').trim();
        const normTrigger = trigger.toLowerCase();

        try {
          if (agent.module === 'Task') {
            // 1. Task: Due Date Approaching / Task due soon
            if (normTrigger === 'due date approaching' || normTrigger === 'task due soon') {
              const daysBeforeDue = config.conditions?.daysBeforeDue ?? 2;
              const tasks = await TaskModel.find({
                orgId,
                status: { $ne: 'Completed' },
                isDeleted: false,
                targetDueDate: { $exists: true, $ne: '' },
              }).lean().exec();

              for (const task of tasks) {
                const targetDate = parseDateOnly(task.targetDueDate);
                if (!targetDate) continue;
                const daysLeft = diffInDays(targetDate, nowDate);

                // Matches if due date is within [0, daysBeforeDue]
                if (daysLeft >= 0 && daysLeft <= daysBeforeDue) {
                  const runKey = `sched:task-due:${String(agent._id)}:${String(task._id)}:${task.targetDueDate}:${todayYMD}`;
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

            // 2. Task: Task Overdue
            if (normTrigger === 'task overdue') {
              const tasks = await TaskModel.find({
                orgId,
                status: { $ne: 'Completed' },
                isDeleted: false,
                targetDueDate: { $exists: true, $ne: '' },
              }).lean().exec();

              for (const task of tasks) {
                const targetDate = parseDateOnly(task.targetDueDate);
                if (!targetDate) continue;
                const daysLeft = diffInDays(targetDate, nowDate);

                // Overdue: targetDueDate is in the past
                if (daysLeft < 0) {
                  const runKey = `sched:task-overdue:${String(agent._id)}:${String(task._id)}:${todayYMD}`;
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

            // 3. Task: Document Request (Repeating)
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

                // Idempotency: fire every N days
                const runKey = `sched:task-doc-repeat:${String(agent._id)}:${String(task._id)}:${todayYMD}`;
                const existing = await AgentRun.findOne({ orgId, runKey }).select('_id').lean().exec();
                if (!existing) {
                  // Check if a previous run happened within repeatDays
                  const lastRun = await AgentRun.findOne({
                    orgId,
                    agentId: agent._id,
                    runKey: new RegExp(`^sched:task-doc-repeat:${String(agent._id)}:${String(task._id)}:`),
                  }).sort({ createdAt: -1 }).select('createdAt').lean().exec();

                  if (lastRun) {
                    const daysSinceLast = diffInDays(nowDate, new Date(lastRun.createdAt));
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

          if (agent.module === 'DSC') {
            // 4. DSC: DSC Expiry Approaching / Renewal required
            if (normTrigger.includes('approaching') || normTrigger.includes('renewal')) {
              const daysBeforeExpiry = config.conditions?.daysBeforeExpiry ?? 30;
              const clients = await ClientModel.find({
                orgId,
                isDeleted: false,
                'dscs.0': { $exists: true },
              }).lean().exec();

              for (const client of clients) {
                for (const dsc of client.dscs || []) {
                  if (dsc.status && dsc.status !== 'Active') continue;
                  const expDate = parseDateOnly(dsc.expiryDate);
                  if (!expDate) continue;
                  const daysLeft = diffInDays(expDate, nowDate);

                  if (daysLeft >= 0 && daysLeft <= daysBeforeExpiry) {
                    const dscKey = dsc.dscId || dsc.id || dsc.name;
                    const runKey = `sched:dsc-expiry:${String(agent._id)}:${String(client._id)}:${dscKey}:${dsc.expiryDate}:${todayYMD}`;
                    const existing = await AgentRun.findOne({ orgId, runKey }).select('_id').lean().exec();
                    if (!existing) {
                      await AgentExecutionService.run(String(agent._id), {
                        orgId,
                        event: {
                          clientId: String(client._id),
                          clientName: client.name,
                          dsc: {
                            id: dsc.id,
                            dscId: dsc.dscId,
                            holder: dsc.name,
                            expiryDate: dsc.expiryDate,
                            vendor: dsc.vendor || '—',
                            certificateClass: dsc.class || 'Class 3',
                            location: dsc.location || 'CA Office',
                          },
                          daysToExpiry: daysLeft,
                        },
                        runType: 'actual',
                        idempotencyKey: runKey,
                      });
                      dispatchedRuns++;
                    }
                  }
                }
              }
            }

            // 5. DSC: DSC Expired
            if (normTrigger.includes('expired')) {
              const clients = await ClientModel.find({
                orgId,
                isDeleted: false,
                'dscs.0': { $exists: true },
              }).lean().exec();

              for (const client of clients) {
                for (const dsc of client.dscs || []) {
                  const expDate = parseDateOnly(dsc.expiryDate);
                  if (!expDate) continue;
                  const daysLeft = diffInDays(expDate, nowDate);

                  if (daysLeft < 0) {
                    const dscKey = dsc.dscId || dsc.id || dsc.name;
                    const runKey = `sched:dsc-expired:${String(agent._id)}:${String(client._id)}:${dscKey}:${todayYMD}`;
                    const existing = await AgentRun.findOne({ orgId, runKey }).select('_id').lean().exec();
                    if (!existing) {
                      await AgentExecutionService.run(String(agent._id), {
                        orgId,
                        event: {
                          clientId: String(client._id),
                          clientName: client.name,
                          dsc: {
                            id: dsc.id,
                            dscId: dsc.dscId,
                            holder: dsc.name,
                            expiryDate: dsc.expiryDate,
                            vendor: dsc.vendor || '—',
                            certificateClass: dsc.class || 'Class 3',
                            location: dsc.location || 'CA Office',
                          },
                          expired: true,
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
            }
          }

          if (agent.module === 'License') {
            // 6. License: License Expiry Approaching / Renewal required
            if (normTrigger.includes('approaching') || normTrigger.includes('renewal')) {
              const daysBeforeExpiry = config.conditions?.daysBeforeExpiry ?? 30;
              const clients = await ClientModel.find({
                orgId,
                isDeleted: false,
                'licenses.0': { $exists: true },
              }).lean().exec();

              for (const client of clients) {
                for (const lic of client.licenses || []) {
                  const expDate = parseDateOnly(lic.expiryDate || '');
                  if (!expDate) continue;
                  const daysLeft = diffInDays(expDate, nowDate);

                  if (daysLeft >= 0 && daysLeft <= daysBeforeExpiry) {
                    const licKey = lic.licenseNo || lic.id || lic.name;
                    const runKey = `sched:lic-expiry:${String(agent._id)}:${String(client._id)}:${licKey}:${lic.expiryDate}:${todayYMD}`;
                    const existing = await AgentRun.findOne({ orgId, runKey }).select('_id').lean().exec();
                    if (!existing) {
                      await AgentExecutionService.run(String(agent._id), {
                        orgId,
                        event: {
                          clientId: String(client._id),
                          clientName: client.name,
                          license: {
                            id: lic.id,
                            licenseNo: lic.licenseNo || '—',
                            name: lic.name,
                            owner: client.name,
                            expiryDate: lic.expiryDate,
                          },
                          daysToExpiry: daysLeft,
                        },
                        runType: 'actual',
                        idempotencyKey: runKey,
                      });
                      dispatchedRuns++;
                    }
                  }
                }
              }
            }

            // 7. License: License Expired
            if (normTrigger.includes('expired')) {
              const clients = await ClientModel.find({
                orgId,
                isDeleted: false,
                'licenses.0': { $exists: true },
              }).lean().exec();

              for (const client of clients) {
                for (const lic of client.licenses || []) {
                  const expDate = parseDateOnly(lic.expiryDate || '');
                  if (!expDate) continue;
                  const daysLeft = diffInDays(expDate, nowDate);

                  if (daysLeft < 0) {
                    const licKey = lic.licenseNo || lic.id || lic.name;
                    const runKey = `sched:lic-expired:${String(agent._id)}:${String(client._id)}:${licKey}:${todayYMD}`;
                    const existing = await AgentRun.findOne({ orgId, runKey }).select('_id').lean().exec();
                    if (!existing) {
                      await AgentExecutionService.run(String(agent._id), {
                        orgId,
                        event: {
                          clientId: String(client._id),
                          clientName: client.name,
                          license: {
                            id: lic.id,
                            licenseNo: lic.licenseNo || '—',
                            name: lic.name,
                            owner: client.name,
                            expiryDate: lic.expiryDate,
                          },
                          expired: true,
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
            }
          }
        } catch (agentErr: any) {
          const errStr = `Error evaluating agent "${agent.name}" (${agent._id}): ${agentErr?.message || agentErr}`;
          logger.error(errStr);
          errors.push(errStr);
        }
      }
    } finally {
      this.isRunning = false;
    }

    return {
      ran: true,
      timestamp: nowDate.toISOString(),
      evaluatedAgents,
      dispatchedRuns,
      errors,
    };
  }
}
