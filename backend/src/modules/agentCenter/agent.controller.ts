import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AgentCenterService } from './agent.service';
import { AgentExecutionService } from './execution.service';
import { isWhatsAppConfigured } from '../../shared/utils/whatsAppService';
import { AgentSchedulerService } from './scheduler.service';
import { getPublicDefinitions } from './definitions';
import { AppError } from '../../shared/utils/apiError';
import { MailService } from '../../shared/utils/mailService';
import { FollowUpService } from './followUp.service';
import { FollowUpState } from './followUp.model';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

function organizationId(req: Request): string {
  if (!req.user?.orgId) throw AppError.unauthorized('Organization context is required.');
  return String(req.user.orgId);
}

export class AgentCenterController {
  static definitions = asyncHandler(async (_req: Request, res: Response) => {
    const defs = getPublicDefinitions();
    const emailStatus = await MailService.getStatus();
    const whatsappConfigured = isWhatsAppConfigured();
    const withIntegrations = {
      ...defs,
      integrations: {
        email: {
          configured: emailStatus.authorized,
          statusText: emailStatus.statusText,
          provider: emailStatus.provider,
          email: emailStatus.email,
          needsReconnect: emailStatus.needsReconnect,
          error: emailStatus.error,
        },
        whatsapp: {
          configured: whatsappConfigured,
          statusText: whatsappConfigured ? 'Connected' : 'Kindly integrate WhatsApp',
        },
      },
    };
    return ApiResponse.success(res, withIntegrations, 'Agent definitions fetched successfully');
  });

  static integrationsStatus = asyncHandler(async (_req: Request, res: Response) => {
    const emailStatus = await MailService.getStatus();
    const whatsappConfigured = isWhatsAppConfigured();
    return ApiResponse.success(res, {
      email: {
        configured: emailStatus.authorized,
        statusText: emailStatus.statusText,
        provider: emailStatus.provider,
        email: emailStatus.email,
        needsReconnect: emailStatus.needsReconnect,
        error: emailStatus.error,
      },
      whatsapp: {
        configured: whatsappConfigured,
        statusText: whatsappConfigured ? 'Connected' : 'Kindly integrate WhatsApp',
      },
    }, 'Integration statuses retrieved');
  });

  static schedulerTick = asyncHandler(async (req: Request, res: Response) => {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;
    const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
    const isUserAuthorized = Boolean(req.user?.orgId);

    if (!isCronAuthorized && !isUserAuthorized) {
      throw AppError.unauthorized('Unauthorized scheduler invocation.');
    }

    const summary = await AgentSchedulerService.tick();
    return ApiResponse.success(res, summary, 'Scheduler tick executed');
  });

  static list = asyncHandler(async (req: Request, res: Response) => {
    const items = await AgentCenterService.list(organizationId(req), {
      module: typeof req.query.module === 'string' ? req.query.module as 'Task' | 'DSC' | 'License' : undefined,
      status: typeof req.query.status === 'string' ? req.query.status as 'draft' | 'published' | 'disabled' : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    return ApiResponse.success(res, items, 'Agents fetched successfully');
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.create(req.body as Record<string, unknown>, organizationId(req));
    return ApiResponse.created(res, agent, 'Agent saved as draft');
  });

  static get = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.get(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, agent, 'Agent details retrieved successfully');
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.update(req.params.id as string, req.body as Record<string, unknown>, organizationId(req));
    return ApiResponse.success(res, agent, 'Draft agent updated successfully');
  });

  static publish = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.publish(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, agent, 'Agent published successfully');
  });

  static disable = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.disable(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, agent, 'Agent disabled successfully');
  });

  static deleteDraft = asyncHandler(async (req: Request, res: Response) => {
    const result = await AgentCenterService.deleteDraft(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, result, 'Draft agent deleted successfully');
  });

  static testRun = asyncHandler(async (req: Request, res: Response) => {
    const idempotencyKey = req.get('Idempotency-Key') || undefined;
    const { failRecipient, mode, testEmail, messageId } = req.body || {};
    const isLive = mode === 'live' || Boolean(testEmail) || Boolean(messageId);

    const run = await AgentExecutionService.run(req.params.id as string, {
      idempotencyKey,
      failRecipient: typeof failRecipient === 'string' ? failRecipient : undefined,
      orgId: organizationId(req),
      runType: isLive ? 'actual' : 'test',
      testRecipientEmail: typeof testEmail === 'string' ? testEmail.trim() : undefined,
      externalExecutionId: typeof messageId === 'string' ? messageId.trim() : undefined,
    });

    const isTestEmailSend = Boolean(testEmail);
    const message = isTestEmailSend
      ? run.status === 'success'
        ? `Test email successfully dispatched to ${testEmail}.`
        : `Execution recorded: ${run.errorMessage || run.result?.message || 'Email delivery failed.'}`
      : isLive
        ? run.status === 'success'
          ? 'Live agent execution completed.'
          : `Execution recorded: ${run.errorMessage || run.result?.message || 'Execution failed.'}`
        : 'Simulated test run recorded. No real notification was sent.';

    return ApiResponse.created(res, run, message);
  });

  static agentHistory = asyncHandler(async (req: Request, res: Response) => {
    // A read through get() ensures an unknown agent consistently returns 404.
    await AgentCenterService.get(req.params.id as string, organizationId(req));
    const runs = await AgentExecutionService.forAgent(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, runs, 'Agent execution history retrieved successfully');
  });

  static globalHistory = asyncHandler(async (req: Request, res: Response) => {
    const limit = typeof req.query.limit === 'number' ? req.query.limit : typeof req.query.limit === 'string' ? Number(req.query.limit) : 100;
    const history = await AgentExecutionService.list(organizationId(req), limit, true);
    return ApiResponse.success(res, history, 'Agent history retrieved successfully');
  });

  /**
   * GET /api/v1/agent-center/whatsapp/webhook
   * Meta WhatsApp Cloud API webhook challenge verification.
   */
  static verifyWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'ayatrio_practice_whatsapp_verify_token';

    if (mode === 'subscribe' && token === expectedToken) {
      logger.info('WhatsApp webhook verified successfully');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  });

  /**
   * POST /api/v1/agent-center/whatsapp/webhook
   * Meta WhatsApp Cloud API delivery status webhook.
   * Transitions agent runs to 'delivered', 'read', or 'failed'.
   */
  /**
   * POST /api/v1/agent-center/whatsapp/webhook
   * Meta WhatsApp Cloud API delivery status & incoming client message webhook.
   * Handles delivery updates, client text messages, and uploaded document attachments.
   */
  static handleWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'] as string | undefined;

    if (!FollowUpService.verifyWhatsAppSignature(rawBody, signature)) {
      logger.warn('Unauthorized WhatsApp webhook: signature verification failed.');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const body = req.body;
    if (body?.object === 'whatsapp_business_account' || body?.entry) {
      const entries = Array.isArray(body.entry) ? body.entry : [];
      for (const entry of entries) {
        const changes = Array.isArray(entry?.changes) ? entry.changes : [];
        for (const change of changes) {
          const value = change?.value;
          // 1. Process delivery receipts
          const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
          for (const statusObj of statuses) {
            const messageId = statusObj?.id;
            const status = statusObj?.status; // 'sent' | 'delivered' | 'read' | 'failed'
            const errors = statusObj?.errors ? statusObj.errors.map((e: any) => `${e?.code}: ${e?.title || e?.message}`) : undefined;
            if (messageId && status) {
              await AgentExecutionService.updateWhatsAppDeliveryStatus(messageId, status, errors);
            }
          }

          // 2. Process incoming client messages (text, media, documents)
          const messages = Array.isArray(value?.messages) ? value.messages : [];
          for (const msg of messages) {
            await FollowUpService.handleIncomingWhatsAppMessage(msg);
          }
        }
      }
    }
    return res.status(200).json({ status: 'ok' });
  });

  /**
   * GET /api/v1/agent-center/diagnostics/summary
   * Provides real MongoDB aggregated statistics for the Agent Center interface.
   */
  static diagnosticSummary = asyncHandler(async (req: Request, res: Response) => {
    const orgId = organizationId(req);
    const summary = await FollowUpService.getDiagnosticSummary(orgId);
    return ApiResponse.success(res, summary, 'Agent Center diagnostic summary retrieved');
  });

  /**
   * POST /api/v1/agent-center/agents/:id/preview-impact
   * Evaluates real database records to preview agent execution without sending any client notifications.
   */
  static previewAgentImpact = asyncHandler(async (req: Request, res: Response) => {
    const orgId = organizationId(req);
    const id = String(req.params.id);
    const preview = await FollowUpService.previewAgentDatabaseImpact(orgId, id);
    return ApiResponse.success(res, preview, 'Database-backed agent impact preview generated');
  });

  /**
   * GET /api/v1/agent-center/follow-ups
   * Lists active client follow-up reminder cycles and document collection state.
   */
  static listFollowUps = asyncHandler(async (req: Request, res: Response) => {
    const orgId = organizationId(req);
    const status = req.query.status as string | undefined;
    const filter: any = { orgId };
    if (status) filter.status = status;
    const followUps = await FollowUpState.find(filter).sort({ updatedAt: -1 }).limit(100).lean().exec();
    return ApiResponse.success(res, followUps, 'Follow-up records retrieved');
  });

  /**
   * POST /api/v1/agent-center/follow-ups/process-tick
   * Triggers follow-up retry checks and evaluates stop conditions.
   */
  static processFollowUpTick = asyncHandler(async (req: Request, res: Response) => {
    const orgId = organizationId(req);
    const forceRealSend = req.body?.forceRealSend === true;
    const result = await FollowUpService.processScheduledFollowUps({ orgId, forceRealSend });
    return ApiResponse.success(res, result, 'Follow-up tick processed successfully');
  });
}
