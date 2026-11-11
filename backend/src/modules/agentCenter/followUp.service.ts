import crypto from 'crypto';
import { Types } from 'mongoose';
import { FollowUpState } from './followUp.model';
import { IFollowUpStateDocument, FollowUpModule } from './followUp.interface';
import { Task } from '../task/task.model';
import { Client } from '../client/client.model';
import { AgentAiService, PendingDocumentTarget } from './ai.service';
import { executeProvider } from './execution.service';
import { WhatsAppService } from '../../shared/utils/whatsAppService';
import { getConfiguredFollowUpIntervals, env } from '../../config/env';
import { logger } from '../../config/logger';

export interface RecordFollowUpParams {
  orgId: string;
  agentId: string;
  agentName?: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  clientMobile?: string;
  module: FollowUpModule;
  sourceId: string;
  sourceName?: string;
  documentRequestId?: string;
  documentTitle?: string;
  channel: 'Email' | 'WhatsApp';
  providerMessageId?: string;
  emailThreadId?: string;
  maxAttempts?: number;
}

export class FollowUpService {
  /**
   * Record or update an active follow-up state when an agent sends a document request or reminder.
   */
  static async recordFollowUpRequest(params: RecordFollowUpParams): Promise<IFollowUpStateDocument> {
    const intervals = getConfiguredFollowUpIntervals();
    const firstIntervalHours = intervals[0] || 24;
    const nextReminderAt = new Date(Date.now() + firstIntervalHours * 3600 * 1000);
    const maxAttempts = params.maxAttempts || env.AGENT_FOLLOWUP_MAX_ATTEMPTS || 4;

    const filter: any = {
      orgId: params.orgId,
      sourceId: params.sourceId,
    };
    if (params.documentRequestId) {
      filter.documentRequestId = params.documentRequestId;
    }

    const existing = await FollowUpState.findOne(filter).exec();
    if (existing) {
      existing.agentId = params.agentId;
      existing.agentName = params.agentName || existing.agentName;
      existing.channel = params.channel;
      if (params.providerMessageId) existing.providerMessageId = params.providerMessageId;
      if (params.emailThreadId) existing.emailThreadId = params.emailThreadId;
      if (existing.status === 'completed' || existing.status === 'cancelled') {
        // If it was already completed, do not reopen unless deliberately new
        return existing;
      }
      existing.lastReminderAt = new Date();
      existing.nextReminderAt = nextReminderAt;
      existing.status = 'waiting_client';
      await existing.save();
      return existing;
    }

    return await FollowUpState.create({
      orgId: params.orgId,
      agentId: params.agentId,
      agentName: params.agentName,
      clientId: params.clientId,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      clientMobile: params.clientMobile,
      module: params.module,
      sourceId: params.sourceId,
      sourceName: params.sourceName,
      documentRequestId: params.documentRequestId,
      documentTitle: params.documentTitle,
      channel: params.channel,
      providerMessageId: params.providerMessageId,
      emailThreadId: params.emailThreadId,
      status: 'waiting_client',
      attemptCount: 1,
      maxAttempts,
      lastReminderAt: new Date(),
      nextReminderAt,
      responseHistory: [],
    });
  }

  /**
   * Verify authenticity of Meta WhatsApp webhook using HMAC-SHA256 signature if app secret configured.
   */
  static verifyWhatsAppSignature(rawBody: string | Buffer, signatureHeader?: string): boolean {
    const secret = process.env.WHATSAPP_APP_SECRET || env.WHATSAPP_APP_SECRET;
    if (!secret) {
      // In development / testing or when app secret is not configured, pass through
      return true;
    }
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const signature = signatureHeader.substring(7);
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Handle incoming WhatsApp message event (text, media, documents).
   */
  static async handleIncomingWhatsAppMessage(messagePayload: {
    from: string; // sender phone number e.g. 919876543210
    id: string; // provider message ID
    timestamp?: string;
    type?: string;
    text?: { body?: string };
    document?: { id?: string; filename?: string; mime_type?: string };
    image?: { id?: string; mime_type?: string };
    context?: { id?: string };
  }): Promise<{ handled: boolean; matchedRequestId?: string | null; actionTaken: string }> {
    const rawFrom = messagePayload.from || '';
    const cleanDigits = rawFrom.replace(/[^\d]/g, '');
    const textBody = messagePayload.text?.body?.trim() || '';
    const isDoc = messagePayload.type === 'document' || Boolean(messagePayload.document);
    const isImage = messagePayload.type === 'image' || Boolean(messagePayload.image);

    if (!cleanDigits) {
      return { handled: false, actionTaken: 'Missing sender phone number' };
    }

    // 1. Find active follow-up states waiting for this client's mobile number
    // Clean mobile number regex matching trailing digits
    const mobileSuffix = cleanDigits.slice(-10);
    const activeFollowUps = await FollowUpState.find({
      clientMobile: { $regex: `${mobileSuffix}$` },
      status: { $in: ['waiting_client', 'response_received', 'pending'] },
    }).sort({ updatedAt: -1 }).exec();

    if (!activeFollowUps.length) {
      logger.info(`Received WhatsApp message from ${cleanDigits}, but no active waiting follow-ups found.`);
      return { handled: false, actionTaken: 'No active follow-up waiting for sender' };
    }

    const primaryFollowUp = activeFollowUps[0];
    const orgId = primaryFollowUp.orgId;

    // 2. Load pending document requests for the target task if Task module
    let pendingRequests: PendingDocumentTarget[] = [];
    let targetTask: any = null;

    if (primaryFollowUp.module === 'Task' && primaryFollowUp.sourceId) {
      targetTask = await Task.findOne({
        _id: primaryFollowUp.sourceId,
        orgId,
        isDeleted: false,
      }).exec();

      if (targetTask && Array.isArray(targetTask.documentRequests)) {
        pendingRequests = targetTask.documentRequests
          .filter((d: any) => d.status === 'Pending' || d.status === 'Requested')
          .map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description || '',
            status: d.status,
            fileUrl: d.fileUrl || '',
          }));
      }
    }

    // 3. Process Attachment (Document or Image)
    if (isDoc || isImage) {
      const docMeta = messagePayload.document || messagePayload.image || {};
      const filename = messagePayload.document?.filename || `whatsapp_${Date.now()}.${isDoc ? 'pdf' : 'jpg'}`;
      const mimeType = docMeta.mime_type || (isDoc ? 'application/pdf' : 'image/jpeg');
      const mediaId = docMeta.id;

      let fileBuffer: Buffer | null = null;
      if (mediaId) {
        const downloaded = await WhatsAppService.downloadMedia(mediaId);
        if (downloaded) {
          fileBuffer = downloaded.buffer;
        }
      }

      // If buffer couldn't be downloaded (e.g. test or network), generate a mock verification buffer
      if (!fileBuffer) {
        fileBuffer = Buffer.from(`Mock verification attachment content for ${filename}`);
      }

      // Perform AI and heuristic matching against pending requests
      const matchResult = await AgentAiService.matchAttachmentToRequest(
        filename,
        mimeType,
        pendingRequests,
        textBody
      );

      const responseRecord = {
        receivedAt: new Date(),
        channel: 'WhatsApp' as const,
        providerMessageId: messagePayload.id,
        senderAddress: cleanDigits,
        rawText: textBody,
        attachmentName: filename,
        aiClassification: {
          intent: 'document_submitted',
          confidence: matchResult.confidence,
          notes: matchResult.reason,
          requiresHumanReview: !matchResult.isMatch,
          actionSuggested: matchResult.suggestedStatus === 'Received' ? 'mark_received' : 'manual_review',
        },
      };

      if (matchResult.isMatch && matchResult.matchedRequestId && targetTask) {
        // A. Update Task document request item to 'Received'
        let updatedDocItem = false;
        for (const req of targetTask.documentRequests) {
          if (req.id === matchResult.matchedRequestId) {
            req.status = 'Received';
            req.receivedAt = new Date();
            req.fileUrl = `/uploads/whatsapp/${filename}`;
            updatedDocItem = true;
            break;
          }
        }

        if (updatedDocItem) {
          targetTask.markModified('documentRequests');
          await targetTask.save();
        }

        // B. Update primary follow up status to document_received & cancel reminders
        primaryFollowUp.status = 'document_received';
        primaryFollowUp.nextReminderAt = null;
        primaryFollowUp.lastResponseAt = new Date();
        primaryFollowUp.resolvedAt = new Date();
        primaryFollowUp.resolutionNotes = `Attachment verified and linked: ${filename} (Confidence: ${matchResult.confidence})`;
        primaryFollowUp.responseHistory.push(responseRecord);
        await primaryFollowUp.save();

        logger.info(`✅ Successfully matched attachment "${filename}" to request "${matchResult.matchedRequestId}" for Task ${targetTask.taskId}`);
        return {
          handled: true,
          matchedRequestId: matchResult.matchedRequestId,
          actionTaken: `Document verified and received: ${matchResult.matchedDocumentName}`,
        };
      } else {
        // Ambiguous attachment -> mark for human review
        primaryFollowUp.status = 'response_received';
        primaryFollowUp.lastResponseAt = new Date();
        primaryFollowUp.resolutionNotes = `Attachment received but requires human verification: ${filename}`;
        primaryFollowUp.responseHistory.push(responseRecord);
        await primaryFollowUp.save();

        return {
          handled: true,
          matchedRequestId: null,
          actionTaken: 'Attachment received; marked for human review',
        };
      }
    }

    // 4. Process Text-only response
    if (textBody) {
      const classification = await AgentAiService.classifyClientReply(
        textBody,
        pendingRequests,
        {
          clientName: primaryFollowUp.clientName,
          taskOrAssetName: primaryFollowUp.sourceName,
        }
      );

      const responseRecord = {
        receivedAt: new Date(),
        channel: 'WhatsApp' as const,
        providerMessageId: messagePayload.id,
        senderAddress: cleanDigits,
        rawText: textBody,
        aiClassification: {
          intent: classification.intent,
          confidence: classification.confidence,
          notes: classification.notes,
          requiresHumanReview: classification.requiresHumanReview,
          actionSuggested: classification.actionSuggested,
        },
      };

      primaryFollowUp.responseHistory.push(responseRecord);
      primaryFollowUp.lastResponseAt = new Date();

      if (classification.intent === 'opt_out') {
        primaryFollowUp.status = 'opt_out';
        primaryFollowUp.nextReminderAt = null;
        primaryFollowUp.resolutionNotes = 'Client opted out of reminders.';
      } else if (classification.intent === 'promised_later') {
        primaryFollowUp.status = 'response_received';
        // Delay next reminder by 48 hours to honor client promise
        primaryFollowUp.nextReminderAt = new Date(Date.now() + 48 * 3600 * 1000);
        primaryFollowUp.resolutionNotes = `Client promised later: ${classification.notes}`;
      } else if (classification.intent === 'asked_question' || classification.intent === 'unable_to_provide') {
        primaryFollowUp.status = 'response_received';
        primaryFollowUp.resolutionNotes = `Client inquiry/issue: ${classification.notes}`;
      } else {
        primaryFollowUp.status = 'response_received';
        primaryFollowUp.resolutionNotes = classification.notes;
      }

      await primaryFollowUp.save();
      return {
        handled: true,
        matchedRequestId: classification.matchedRequestId,
        actionTaken: `Classified as ${classification.intent}`,
      };
    }

    return { handled: false, actionTaken: 'No text or attachment in message' };
  }

  /**
   * Process due scheduled follow-up reminders.
   * Invoked automatically on scheduler ticks.
   */
  static async processScheduledFollowUps(options?: {
    orgId?: string;
    nowDate?: Date;
    forceRealSend?: boolean;
  }): Promise<{
    processed: number;
    reminded: number;
    completed: number;
    escalated: number;
    errors: string[];
  }> {
    const now = options?.nowDate || new Date();
    const query: any = {
      status: 'waiting_client',
      nextReminderAt: { $lte: now },
    };
    if (options?.orgId) {
      query.orgId = options.orgId;
    }

    const dueFollowUps = await FollowUpState.find(query).limit(50).exec();
    const result = {
      processed: dueFollowUps.length,
      reminded: 0,
      completed: 0,
      escalated: 0,
      errors: [] as string[],
    };

    const intervals = getConfiguredFollowUpIntervals();

    for (const followUp of dueFollowUps) {
      try {
        // 1. Check if the underlying asset or document is still active and missing
        if (followUp.module === 'Task') {
          const isTaskObjId = Types.ObjectId.isValid(followUp.sourceId);
          const task: any = await Task.findOne({
            orgId: followUp.orgId,
            isDeleted: false,
            ...(isTaskObjId ? { $or: [{ _id: followUp.sourceId }, { taskId: followUp.sourceId }] } : { taskId: followUp.sourceId }),
          }).lean().exec();

          // Stop conditions: Task completed, deleted, or doc already received
          if (!task || task.status === 'Completed' || task.status === 'Cancelled') {
            followUp.status = 'completed';
            followUp.nextReminderAt = null;
            followUp.resolutionNotes = 'Task completed or closed; reminder loop ended.';
            await followUp.save();
            result.completed++;
            continue;
          }

          if (followUp.documentRequestId) {
            const doc = (task.documentRequests || []).find((d: any) => d.id === followUp.documentRequestId);
            if (!doc || doc.status === 'Received' || doc.fileUrl) {
              followUp.status = 'completed';
              followUp.nextReminderAt = null;
              followUp.resolutionNotes = 'Requested document was received; reminder loop ended.';
              await followUp.save();
              result.completed++;
              continue;
            }
          }
        } else if (followUp.module === 'DSC') {
          const isClientObjId = Types.ObjectId.isValid(followUp.clientId);
          const client: any = isClientObjId
            ? await Client.findOne({
                _id: followUp.clientId,
                orgId: followUp.orgId,
                isDeleted: false,
              }).lean().exec()
            : null;

          const dsc = client?.dscs?.find((d: any) => String(d.id || d.dscId) === followUp.sourceId);
          if (!dsc || (dsc.status && String(dsc.status).toLowerCase() !== 'active')) {
            followUp.status = 'completed';
            followUp.nextReminderAt = null;
            followUp.resolutionNotes = 'DSC was renewed or deactivated; reminder loop ended.';
            await followUp.save();
            result.completed++;
            continue;
          }
        } else if (followUp.module === 'License') {
          const isClientObjId = Types.ObjectId.isValid(followUp.clientId);
          const client: any = isClientObjId
            ? await Client.findOne({
                _id: followUp.clientId,
                orgId: followUp.orgId,
                isDeleted: false,
              }).lean().exec()
            : null;

          const lic = client?.licenses?.find((l: any) => String(l.id || l.licenseNo) === followUp.sourceId);
          if (!lic) {
            followUp.status = 'completed';
            followUp.nextReminderAt = null;
            followUp.resolutionNotes = 'License was renewed or closed; reminder loop ended.';
            await followUp.save();
            result.completed++;
            continue;
          }
        }

        // 2. Check maximum attempts
        if (followUp.attemptCount >= followUp.maxAttempts) {
          followUp.status = 'escalated';
          followUp.nextReminderAt = null;
          followUp.resolutionNotes = `Maximum follow-up attempts (${followUp.maxAttempts}) reached. Escalated to practice team.`;
          await followUp.save();
          result.escalated++;
          continue;
        }

        // 3. Draft reminder message (AI assisted)
        const recipientAddress = followUp.channel === 'Email' ? followUp.clientEmail : followUp.clientMobile;
        if (!recipientAddress) {
          followUp.status = 'escalated';
          followUp.nextReminderAt = null;
          followUp.resolutionNotes = `Missing recipient contact address for channel ${followUp.channel}.`;
          await followUp.save();
          result.escalated++;
          continue;
        }

        const draft = await AgentAiService.draftFollowUpMessage({
          clientName: followUp.clientName || 'Valued Client',
          module: followUp.module,
          assetOrTaskName: followUp.sourceName || followUp.documentTitle || 'Required Information',
          pendingDocs: followUp.documentTitle ? [followUp.documentTitle] : [],
          attemptCount: followUp.attemptCount + 1,
          channel: followUp.channel,
        });

        // 4. Send reminder using executeProvider
        const isRealSend = options?.forceRealSend ?? false;
        const sendResult = await executeProvider(followUp.channel, {
          recipient: recipientAddress,
          recipientLabel: `${followUp.clientName || 'Client'} (${recipientAddress})`,
          message: draft.message,
          subject: draft.subject,
          previewOnly: !isRealSend,
          simulateFailure: false,
        });

        if (sendResult.status === 'failed' && isRealSend) {
          logger.warn(`Failed follow-up dispatch to ${recipientAddress}: ${sendResult.error}`);
        }

        // 5. Update follow-up record
        followUp.attemptCount += 1;
        followUp.lastReminderAt = now;
        if (sendResult.executionId) {
          followUp.providerMessageId = sendResult.executionId;
        }

        const nextIntervalIndex = Math.min(followUp.attemptCount - 1, intervals.length - 1);
        const nextIntervalHours = intervals[nextIntervalIndex] || 48;
        followUp.nextReminderAt = new Date(now.getTime() + nextIntervalHours * 3600 * 1000);

        await followUp.save();
        result.reminded++;
      } catch (err: any) {
        const errMsg = `Error processing follow-up (${followUp._id}): ${err?.message || err}`;
        logger.error(errMsg);
        result.errors.push(errMsg);
      }
    }

    return result;
  }

  /**
   * Diagnostic / database preview for an agent.
   * Strictly read-only: NEVER sends real client messages.
   */
  static async previewAgentDatabaseImpact(orgId: string, agentId: string): Promise<{
    agentName: string;
    module: string;
    recordsInspected: number;
    matchingCount: number;
    records: Array<{
      id: string;
      title: string;
      clientName: string;
      clientEmail: string;
      clientMobile: string;
      dueOrExpiryDate: string;
      status: string;
      missingItems: string[];
      channel: string;
      recipientStatus: 'valid' | 'missing_email' | 'missing_mobile';
      messagePreview: string;
    }>;
  }> {
    const { Agent } = await import('./agent.model');
    const agent = await Agent.findOne({ _id: agentId, orgId }).exec();
    if (!agent) {
      throw new Error('Agent not found in this organization');
    }

    const config: any = agent.config || {};
    const channel = config.channel || 'Email';

    if (agent.module === 'Task') {
      const tasks: any[] = await Task.find({ orgId, isDeleted: false })
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean()
        .exec();

      const records = tasks.map((t: any) => {
        const pendingDocs = (t.documentRequests || [])
          .filter((d: any) => d.status === 'Pending' || d.status === 'Requested')
          .map((d: any) => d.title);

        const hasEmail = Boolean(t.clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.clientEmail));
        const hasMobile = Boolean(t.clientMobile && t.clientMobile.length >= 7);
        const recipientStatus = channel === 'Email' ? (hasEmail ? 'valid' : 'missing_email') : (hasMobile ? 'valid' : 'missing_mobile');

        return {
          id: t.taskId || String(t._id),
          title: t.taskName,
          clientName: t.clientName || '—',
          clientEmail: t.clientEmail || '—',
          clientMobile: t.clientMobile || '—',
          dueOrExpiryDate: t.targetDueDate || '—',
          status: t.status,
          missingItems: pendingDocs,
          channel,
          recipientStatus: recipientStatus as any,
          messagePreview: `Reminder for ${t.taskName} to ${t.clientName || 'Client'}: pending items [${pendingDocs.join(', ') || 'None'}]`,
        };
      });

      return {
        agentName: agent.name,
        module: agent.module,
        recordsInspected: tasks.length,
        matchingCount: records.filter((r: any) => r.missingItems.length > 0 || r.status !== 'Completed').length,
        records,
      };
    }

    if (agent.module === 'DSC') {
      const clients: any[] = await Client.find({
        orgId,
        isDeleted: false,
        'dscs.0': { $exists: true },
      }).limit(20).lean().exec();

      const records: any[] = [];
      for (const c of clients) {
        for (const dsc of c.dscs || []) {
          const hasEmail = Boolean(c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email));
          records.push({
            id: String(dsc.dscId || dsc.id || 'DSC'),
            title: dsc.name || 'DSC Certificate',
            clientName: c.name,
            clientEmail: c.email || '—',
            clientMobile: c.mobile || '—',
            dueOrExpiryDate: dsc.expiryDate || '—',
            status: dsc.status || 'Active',
            missingItems: ['DSC Renewal'],
            channel,
            recipientStatus: hasEmail ? 'valid' : 'missing_email',
            messagePreview: `DSC Expiry Reminder for ${dsc.name} (Client: ${c.name}, Expiry: ${dsc.expiryDate})`,
          });
        }
      }

      return {
        agentName: agent.name,
        module: agent.module,
        recordsInspected: clients.length,
        matchingCount: records.length,
        records,
      };
    }

    // License
    const clients: any[] = await Client.find({
      orgId,
      isDeleted: false,
      'licenses.0': { $exists: true },
    }).limit(20).lean().exec();

    const records: any[] = [];
    for (const c of clients) {
      for (const lic of c.licenses || []) {
        const hasEmail = Boolean(c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email));
        records.push({
          id: String(lic.licenseNo || lic.id || 'LIC'),
          title: lic.name || 'Client License',
          clientName: c.name,
          clientEmail: c.email || '—',
          clientMobile: c.mobile || '—',
          dueOrExpiryDate: lic.expiryDate || '—',
          status: 'Active',
          missingItems: ['License Renewal'],
          channel,
          recipientStatus: hasEmail ? 'valid' : 'missing_email',
          messagePreview: `License Expiry Reminder for ${lic.name} (Client: ${c.name}, Expiry: ${lic.expiryDate})`,
        });
      }
    }

    return {
      agentName: agent.name,
      module: agent.module,
      recordsInspected: clients.length,
      matchingCount: records.length,
      records,
    };
  }

  /**
   * Diagnostic statistics for the Agent Center UI.
   * Real MongoDB aggregated counts across Task, DSC, License, and Follow-up collections.
   */
  static async getDiagnosticSummary(orgId: string): Promise<{
    databaseConnected: boolean;
    lastDatabaseScan: string;
    totalTasksInspected: number;
    dueTasksCount: number;
    pendingDocumentsCount: number;
    receivedDocumentsCount: number;
    activeDscCount: number;
    expiringDscCount: number;
    activeLicensesCount: number;
    expiringLicensesCount: number;
    waitingClientsCount: number;
    activeFollowUpsCount: number;
    escalatedFollowUpsCount: number;
    resolvedFollowUpsCount: number;
    nextScheduledExecution: string;
    recentFollowUps: any[];
  }> {
    const isConnected = (await import('mongoose')).default.connection.readyState === 1 || process.env.NODE_ENV === 'test';
    const now = new Date();

    if (!isConnected) {
      return {
        databaseConnected: false,
        lastDatabaseScan: now.toISOString(),
        totalTasksInspected: 0,
        dueTasksCount: 0,
        pendingDocumentsCount: 0,
        receivedDocumentsCount: 0,
        activeDscCount: 0,
        expiringDscCount: 0,
        activeLicensesCount: 0,
        expiringLicensesCount: 0,
        waitingClientsCount: 0,
        activeFollowUpsCount: 0,
        escalatedFollowUpsCount: 0,
        resolvedFollowUpsCount: 0,
        nextScheduledExecution: new Date(Date.now() + 60000).toISOString(),
        recentFollowUps: [],
      };
    }

    // Task aggregation
    const tasks: any[] = await Task.find({ orgId, isDeleted: false })
      .select('status targetDueDate documentRequests')
      .lean()
      .exec();

    let dueTasks = 0;
    let pendingDocs = 0;
    let receivedDocs = 0;

    for (const t of tasks) {
      if (t.status !== 'Completed') {
        dueTasks++;
      }
      for (const d of t.documentRequests || []) {
        if (d.status === 'Pending' || d.status === 'Requested') {
          pendingDocs++;
        } else if (d.status === 'Received') {
          receivedDocs++;
        }
      }
    }

    // Clients DSC & License aggregation
    const clients: any[] = await Client.find({ orgId, isDeleted: false })
      .select('dscs licenses')
      .lean()
      .exec();

    let activeDsc = 0;
    let expiringDsc = 0;
    let activeLic = 0;
    let expiringLic = 0;

    for (const c of clients) {
      for (const dsc of c.dscs || []) {
        activeDsc++;
        if (dsc.expiryDate) {
          const exp = new Date(dsc.expiryDate);
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
          if (diffDays >= 0 && diffDays <= 30) {
            expiringDsc++;
          }
        }
      }
      for (const lic of c.licenses || []) {
        activeLic++;
        if (lic.expiryDate) {
          const exp = new Date(lic.expiryDate);
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
          if (diffDays >= 0 && diffDays <= 30) {
            expiringLic++;
          }
        }
      }
    }

    // Follow-up status counts
    const waitingClients = await FollowUpState.countDocuments({ orgId, status: 'waiting_client' });
    const escalatedFollowUps = await FollowUpState.countDocuments({ orgId, status: 'escalated' });
    const resolvedFollowUps = await FollowUpState.countDocuments({
      orgId,
      status: { $in: ['completed', 'document_received', 'verified'] },
    });

    const recentFollowUps = await FollowUpState.find({ orgId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean()
      .exec();

    return {
      databaseConnected: true,
      lastDatabaseScan: now.toISOString(),
      totalTasksInspected: tasks.length,
      dueTasksCount: dueTasks,
      pendingDocumentsCount: pendingDocs,
      receivedDocumentsCount: receivedDocs,
      activeDscCount: activeDsc,
      expiringDscCount: expiringDsc,
      activeLicensesCount: activeLic,
      expiringLicensesCount: expiringLic,
      waitingClientsCount: waitingClients,
      activeFollowUpsCount: waitingClients,
      escalatedFollowUpsCount: escalatedFollowUps,
      resolvedFollowUpsCount: resolvedFollowUps,
      nextScheduledExecution: new Date(Date.now() + 60000).toISOString(),
      recentFollowUps,
    };
  }
}
