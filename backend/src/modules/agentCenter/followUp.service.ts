import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { FollowUpState } from './followUp.model';
import { InboundMessageLog } from './inboundMessage.model';
import { IntegrationModel } from '../integration/integration.model';
import { IFollowUpStateDocument, FollowUpModule } from './followUp.interface';
import { Task } from '../task/task.model';
import { Client } from '../client/client.model';
import { AgentAiService, PendingDocumentTarget } from './ai.service';
import { executeProvider } from './execution.service';
import { WhatsAppService } from '../../shared/utils/whatsAppService';
import { DriveService } from '../drive/drive.service';
import { DocumentCategory } from '../drive/drive.interface';
import { GmailSyncService } from '../../shared/utils/gmailSyncService';
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
  metadata?: Record<string, any>;
}

export class FollowUpService {
  /**
   * Record or update an active follow-up state when an agent sends a document request or reminder.
   * Enforces permanent opt-out suppression: never silently reopens an opted-out client record.
   */
  static async recordFollowUpRequest(params: RecordFollowUpParams): Promise<IFollowUpStateDocument> {
    const intervals = getConfiguredFollowUpIntervals();
    const firstIntervalHours = intervals[0] || 24;
    const nextReminderAt = new Date(Date.now() + firstIntervalHours * 3600 * 1000);
    const maxAttempts = params.maxAttempts || env.AGENT_FOLLOWUP_MAX_ATTEMPTS || 4;

    // Phase 4.A: Check if client has previously opted out on this channel in this organization
    const optedOutRecord =
      mongoose.connection.readyState === 1 && params.clientId
        ? await FollowUpState.findOne({
            orgId: params.orgId,
            clientId: params.clientId,
            channel: params.channel,
            status: 'opt_out',
          }).exec()
        : null;

    if (optedOutRecord) {
      logger.warn(`Client "${params.clientId}" is opted out on channel "${params.channel}". Suppressing follow-up creation.`);
      return optedOutRecord;
    }

    const filter: any = {
      orgId: params.orgId,
      sourceId: params.sourceId,
      module: params.module,
      channel: params.channel,
    };
    if (params.clientId) {
      filter.clientId = params.clientId;
    }
    if (params.documentRequestId) {
      filter.documentRequestId = params.documentRequestId;
    }

    const existing = await FollowUpState.findOne(filter).exec();
    if (existing) {
      // Opt-out is a terminal suppression state: NEVER reopen it automatically
      if (existing.status === 'opt_out') {
        return existing;
      }
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
      if (params.metadata) {
        existing.metadata = { ...(existing.metadata || {}), ...params.metadata };
      }
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
      metadata: params.metadata || {},
    });
  }

  /**
   * Verify authenticity of Meta WhatsApp webhook using HMAC-SHA256 signature against raw request bytes.
   * Fails closed in production if WHATSAPP_APP_SECRET is not configured.
   */
  static verifyWhatsAppSignature(rawBody: string | Buffer, signatureHeader?: string): boolean {
    const secret = process.env.WHATSAPP_APP_SECRET || env.WHATSAPP_APP_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';
    if (!secret) {
      if (isProduction) {
        logger.error('❌ WHATSAPP_APP_SECRET is not configured in production. Failing closed.');
        return false;
      }
      // Non-production test/dev fallback
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
   * Helper to immediately resolve an active follow-up when a task document is uploaded via application UI.
   * Cancels future reminders (nextReminderAt = null) and records receipt.
   */
  static async completeFollowUpForDocument(params: {
    orgId: string;
    taskId: string;
    documentRequestId: string;
    fileUrl?: string;
    receivedAt?: Date | null;
  }): Promise<boolean> {
    try {
      const isTaskObjId = Types.ObjectId.isValid(params.taskId);
      const filter: any = {
        orgId: params.orgId,
        status: { $in: ['waiting_client', 'response_received', 'pending'] },
        documentRequestId: params.documentRequestId,
        ...(isTaskObjId ? { $or: [{ sourceId: params.taskId }] } : { sourceId: params.taskId }),
      };
      let followUps: any[] = [];
      if (typeof FollowUpState.find === 'function' && (mongoose.connection.readyState === 1 || FollowUpState.find !== mongoose.Model.find)) {
        const queryRes = await FollowUpState.find(filter).exec();
        followUps = Array.isArray(queryRes) ? queryRes : (queryRes ? [queryRes] : []);
      }
      if (followUps.length === 0 && typeof FollowUpState.findOne === 'function' && (mongoose.connection.readyState === 1 || FollowUpState.findOne !== mongoose.Model.findOne)) {
        const single = await FollowUpState.findOne(filter).exec();
        if (single) followUps = [single];
      }

      if (followUps && followUps.length > 0) {
        for (const followUp of followUps) {
          followUp.status = 'document_received';
          followUp.nextReminderAt = null;
          followUp.resolvedAt = params.receivedAt || new Date();
          followUp.resolutionNotes = `Document received via application upload (${params.fileUrl || 'file uploaded'}).`;
          if (params.fileUrl) {
            followUp.responseHistory.push({
              receivedAt: params.receivedAt || new Date(),
              channel: followUp.channel,
              rawText: 'Document uploaded via task interface',
              attachmentUrl: params.fileUrl,
              aiClassification: {
                intent: 'document_submitted',
                confidence: 1.0,
                notes: 'Direct application upload',
                requiresHumanReview: false,
                actionSuggested: 'mark_received',
              },
            });
          }
          await followUp.save();
          logger.info(`✅ Closed active follow-up (${followUp._id}) for task document ${params.documentRequestId}`);
        }
        return true;
      }
      return false;
    } catch (err: any) {
      logger.warn(`Failed to complete follow-up for document: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Handle incoming WhatsApp message event (text, media, documents).
   * Enforces multi-tenant isolation, unique client matching, real media storage, and permanent opt-out.
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

    // Phase 6: Deduplicate incoming WhatsApp messages using InboundMessageLog
    if (mongoose.connection.readyState === 1 && messagePayload.id) {
      const alreadyProcessed = await InboundMessageLog.exists({
        provider: 'whatsapp',
        messageId: messagePayload.id,
      });
      if (alreadyProcessed) {
        logger.info(`Duplicate WhatsApp message ${messagePayload.id} already processed. Skipping.`);
        return { handled: true, actionTaken: 'Duplicate message already processed' };
      }
    }

    // 1. Resolve matching clients and enforce tenant safety
    let primaryFollowUp: IFollowUpStateDocument | null = null;

    // Check context reply message ID first if client quoted our outbound WhatsApp message
    if (messagePayload.context?.id) {
      const candidateContext = await FollowUpState.findOne({
        providerMessageId: messagePayload.context.id,
        status: { $in: ['waiting_client', 'response_received', 'pending'] },
      }).exec();

      if (candidateContext) {
        // Phase 6: Cross-verify context reply ID against sender client phone to prevent forged quote routing
        const clientMobileDigits = (candidateContext.clientMobile || '').replace(/[^\d]/g, '').slice(-10);
        const senderDigits = cleanDigits.slice(-10);
        if (clientMobileDigits && senderDigits && clientMobileDigits !== senderDigits) {
          logger.warn(`WhatsApp context reply ID ${messagePayload.context.id} sender mismatch (${senderDigits} vs expected ${clientMobileDigits}). Rejecting quoted context.`);
        } else {
          primaryFollowUp = candidateContext;
        }
      }
    }

    if (!primaryFollowUp) {
      const mobileSuffix = cleanDigits.slice(-10);
      const matchingClients = await Client.find({
        mobile: { $regex: `${mobileSuffix}$` },
        isDeleted: false,
      }).lean().exec();

      if (!matchingClients.length) {
        logger.info(`Received WhatsApp message from ${cleanDigits}, but no registered client found.`);
        return { handled: false, actionTaken: 'No registered client found for sender phone number' };
      }

      // Check organization uniqueness to prevent cross-tenant message routing
      const uniqueOrgIds = [...new Set(matchingClients.map((c: any) => String(c.orgId || 'default')))];
      if (uniqueOrgIds.length > 1) {
        logger.warn(`⚠️ WhatsApp sender ${cleanDigits} matches clients in multiple organizations (${uniqueOrgIds.join(', ')}). Routing to manual review.`);
        return {
          handled: false,
          actionTaken: 'Ambiguous cross-tenant sender phone number; manual review required to prevent cross-tenant leak',
        };
      }

      const orgId = uniqueOrgIds[0];
      const clientIds = matchingClients.map((c: any) => String(c._id));

      const activeFollowUps = await FollowUpState.find({
        orgId,
        clientId: { $in: clientIds },
        status: { $in: ['waiting_client', 'response_received', 'pending'] },
      }).sort({ updatedAt: -1 }).exec();

      if (!activeFollowUps.length) {
        logger.info(`Received WhatsApp message from ${cleanDigits}, but no active waiting follow-ups found in organization ${orgId}.`);
        return { handled: false, actionTaken: 'No active follow-up waiting for sender' };
      }

      if (activeFollowUps.length === 1) {
        primaryFollowUp = activeFollowUps[0];
      } else {
        // Disambiguate if message text or filename matches a specific document title or task name
        const candidateMatch = activeFollowUps.find((fu: any) => {
          const docTitle = (fu.documentTitle || '').toLowerCase();
          const taskName = (fu.sourceName || '').toLowerCase();
          const incomingText = (textBody || messagePayload.document?.filename || '').toLowerCase();
          return (docTitle && incomingText.includes(docTitle)) || (taskName && incomingText.includes(taskName));
        });

        if (candidateMatch) {
          primaryFollowUp = candidateMatch;
        } else {
          logger.warn(`Ambiguous WhatsApp sender ${cleanDigits} has ${activeFollowUps.length} active follow-ups. Routing to manual review.`);
          return {
            handled: false,
            actionTaken: `Ambiguous request: sender has ${activeFollowUps.length} active follow-ups; manual review required`,
          };
        }
      }
    }

    const orgId = primaryFollowUp.orgId;

    // 2. Load pending document requests for the target task if Task module
    let pendingRequests: PendingDocumentTarget[] = [];
    let targetTask: any = null;

    if (primaryFollowUp.module === 'Task' && primaryFollowUp.sourceId) {
      const isTaskObjId = Types.ObjectId.isValid(primaryFollowUp.sourceId);
      targetTask = await Task.findOne({
        orgId,
        isDeleted: false,
        ...(isTaskObjId
          ? { $or: [{ _id: primaryFollowUp.sourceId }, { taskId: primaryFollowUp.sourceId }] }
          : { taskId: primaryFollowUp.sourceId }),
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

    // 3. Process Attachment (Document or Image) - Never mock, download and store genuine buffer
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

      // If buffer couldn't be downloaded, DO NOT fabricate mock bytes or mark received
      if (!fileBuffer) {
        logger.error(`❌ Could not download WhatsApp media (${mediaId}) for ${filename}. Marking for manual review.`);
        const failureRecord = {
          receivedAt: new Date(),
          channel: 'WhatsApp' as const,
          providerMessageId: messagePayload.id,
          senderAddress: cleanDigits,
          rawText: textBody,
          attachmentName: filename,
          aiClassification: {
            intent: 'document_submitted',
            confidence: 0,
            notes: 'WhatsApp media download failed or returned empty payload from Meta CDN.',
            requiresHumanReview: true,
            actionSuggested: 'manual_review',
          },
        };
        primaryFollowUp.status = 'response_received';
        primaryFollowUp.lastResponseAt = new Date();
        primaryFollowUp.resolutionNotes = `Attachment notification received, but media payload could not be downloaded (${filename}).`;
        primaryFollowUp.responseHistory.push(failureRecord);
        await primaryFollowUp.save();

        return {
          handled: true,
          matchedRequestId: null,
          actionTaken: 'Attachment download failed; marked for human review',
        };
      }

      // Validate file size limit (< 25MB)
      if (fileBuffer.length > 25 * 1024 * 1024) {
        logger.warn(`Attachment ${filename} exceeds 25MB limit (${fileBuffer.length} bytes). Marking for manual review.`);
        primaryFollowUp.status = 'response_received';
        primaryFollowUp.lastResponseAt = new Date();
        primaryFollowUp.resolutionNotes = `Attachment ${filename} exceeds allowed 25MB limit.`;
        primaryFollowUp.responseHistory.push({
          receivedAt: new Date(),
          channel: 'WhatsApp' as const,
          providerMessageId: messagePayload.id,
          senderAddress: cleanDigits,
          rawText: textBody,
          attachmentName: filename,
          aiClassification: {
            intent: 'document_submitted',
            confidence: 0,
            notes: 'Attachment exceeds maximum allowed size (25MB).',
            requiresHumanReview: true,
            actionSuggested: 'manual_review',
          },
        });
        await primaryFollowUp.save();
        return { handled: true, matchedRequestId: null, actionTaken: 'Attachment exceeds size limit; flagged for review' };
      }

      // Store genuine buffer via DriveService
      let persistentFileUrl = '';
      try {
        const multerFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: filename,
          encoding: '7bit',
          mimetype: mimeType,
          buffer: fileBuffer,
          size: fileBuffer.length,
          destination: '',
          filename,
          path: '',
          stream: null as any,
        };

        const uploaded = await DriveService.uploadDocument(multerFile, {
          category: DocumentCategory.GENERAL,
          description: `WhatsApp Inbound Document: ${filename} from ${cleanDigits}`,
          clientId: primaryFollowUp.clientId,
          clientName: primaryFollowUp.clientName,
          subFolder: primaryFollowUp.sourceId,
          customFileName: filename,
          tags: ['WhatsApp-Inbound', primaryFollowUp.sourceId],
          uploadedBy: 'Client via WhatsApp',
        });

        persistentFileUrl = uploaded.webViewLink || uploaded.previewUrl || `/api/v1/drive/${uploaded._id}/download`;
      } catch (storageErr: any) {
        logger.error(`❌ Failed to store WhatsApp attachment ${filename} to Drive:`, storageErr);
        primaryFollowUp.status = 'response_received';
        primaryFollowUp.lastResponseAt = new Date();
        primaryFollowUp.resolutionNotes = `Attachment received but failed to persist to storage: ${storageErr?.message || storageErr}`;
        primaryFollowUp.responseHistory.push({
          receivedAt: new Date(),
          channel: 'WhatsApp' as const,
          providerMessageId: messagePayload.id,
          senderAddress: cleanDigits,
          rawText: textBody,
          attachmentName: filename,
          aiClassification: {
            intent: 'document_submitted',
            confidence: 0,
            notes: `Storage failure: ${storageErr?.message || storageErr}`,
            requiresHumanReview: true,
            actionSuggested: 'manual_review',
          },
        });
        await primaryFollowUp.save();
        return { handled: true, matchedRequestId: null, actionTaken: 'Attachment storage failed; flagged for review' };
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
        attachmentUrl: persistentFileUrl,
        aiClassification: {
          intent: 'document_submitted',
          confidence: matchResult.confidence,
          notes: matchResult.reason,
          requiresHumanReview: !matchResult.isMatch,
          actionSuggested: matchResult.suggestedStatus === 'Received' ? 'mark_received' : 'manual_review',
        },
      };

      if (matchResult.isMatch && matchResult.matchedRequestId && targetTask) {
        let updatedDocItem = false;
        for (const req of targetTask.documentRequests) {
          if (req.id === matchResult.matchedRequestId) {
            req.status = 'Received';
            req.receivedAt = new Date();
            req.fileUrl = persistentFileUrl;
            updatedDocItem = true;
            break;
          }
        }

        if (updatedDocItem) {
          targetTask.markModified('documentRequests');
          await targetTask.save();

          primaryFollowUp.status = 'document_received';
          primaryFollowUp.nextReminderAt = null;
          primaryFollowUp.lastResponseAt = new Date();
          primaryFollowUp.resolvedAt = new Date();
          primaryFollowUp.resolutionNotes = `Attachment verified and linked: ${filename} (Confidence: ${matchResult.confidence})`;
          primaryFollowUp.responseHistory.push(responseRecord);
          await primaryFollowUp.save();

          if (messagePayload.id && mongoose.connection.readyState === 1) {
            try {
              await InboundMessageLog.create({
                provider: 'whatsapp',
                messageId: messagePayload.id,
                sender: cleanDigits,
                orgId,
                followUpId: primaryFollowUp._id,
                status: 'processed',
                rawPayloadSnippet: `Verified attachment: ${filename}`,
              });
            } catch {}
          }

          logger.info(`✅ Successfully matched attachment "${filename}" to request "${matchResult.matchedRequestId}" for Task ${targetTask.taskId}`);
          return {
            handled: true,
            matchedRequestId: matchResult.matchedRequestId,
            actionTaken: `Document verified and received: ${matchResult.matchedDocumentName}`,
          };
        } else {
          // Phase 8: Never close follow-up if updatedDocItem === false
          primaryFollowUp.status = 'response_received';
          primaryFollowUp.lastResponseAt = new Date();
          primaryFollowUp.resolutionNotes = `Attachment received but matching task document request could not be updated: ${filename}`;
          responseRecord.aiClassification.requiresHumanReview = true;
          responseRecord.aiClassification.actionSuggested = 'manual_review';
          primaryFollowUp.responseHistory.push(responseRecord);
          await primaryFollowUp.save();

          if (messagePayload.id && mongoose.connection.readyState === 1) {
            try {
              await InboundMessageLog.create({
                provider: 'whatsapp',
                messageId: messagePayload.id,
                sender: cleanDigits,
                orgId,
                followUpId: primaryFollowUp._id,
                status: 'processed',
                rawPayloadSnippet: `Attachment unlinked: ${filename}`,
              });
            } catch {}
          }

          return {
            handled: true,
            matchedRequestId: null,
            actionTaken: 'Attachment received; task item update failed; marked for human review',
          };
        }
      } else {
        primaryFollowUp.status = 'response_received';
        primaryFollowUp.lastResponseAt = new Date();
        primaryFollowUp.resolutionNotes = `Attachment received but requires human verification: ${filename}`;
        primaryFollowUp.responseHistory.push(responseRecord);
        await primaryFollowUp.save();

        if (messagePayload.id && mongoose.connection.readyState === 1) {
          try {
            await InboundMessageLog.create({
              provider: 'whatsapp',
              messageId: messagePayload.id,
              sender: cleanDigits,
              orgId,
              followUpId: primaryFollowUp._id,
              status: 'processed',
              rawPayloadSnippet: `Attachment unverified: ${filename}`,
            });
          } catch {}
        }

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

        // Cascade opt-out across all active follow-ups for this client and channel in this org
        await FollowUpState.updateMany(
          {
            orgId,
            clientId: primaryFollowUp.clientId,
            channel: 'WhatsApp',
            status: { $in: ['waiting_client', 'response_received', 'pending'] },
          },
          {
            $set: {
              status: 'opt_out',
              nextReminderAt: null,
              resolutionNotes: 'Client opted out of WhatsApp reminders; cascaded across active requests.',
            },
          }
        );
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

      if (messagePayload.id && mongoose.connection.readyState === 1) {
        try {
          await InboundMessageLog.create({
            provider: 'whatsapp',
            messageId: messagePayload.id,
            sender: cleanDigits,
            orgId,
            followUpId: primaryFollowUp._id,
            status: 'processed',
            rawPayloadSnippet: textBody.slice(0, 200),
          });
        } catch {}
      }

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
   * Rechecks actual database source records (Task, DSC, License) and handles promised-later state.
   */
  static async processScheduledFollowUps(options?: {
    orgId?: string;
    nowDate?: Date;
    forceRealSend?: boolean;
    isLockLost?: () => boolean;
  }): Promise<{
    processed: number;
    reminded: number;
    completed: number;
    escalated: number;
    errors: string[];
  }> {
    const now = options?.nowDate || new Date();
    // Query both waiting_client and eligible promised_later (response_received) records
    const query: any = {
      status: { $in: ['waiting_client', 'response_received'] },
      nextReminderAt: { $lte: now, $ne: null },
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
      if (options?.isLockLost && options.isLockLost()) {
        logger.warn('Stopping follow-up reminder loop: scheduler leader lock ownership was lost.');
        break;
      }

      try {
        // If status is response_received, verify that the last recorded intent was promised_later
        if (followUp.status === 'response_received') {
          const lastResp = followUp.responseHistory[followUp.responseHistory.length - 1];
          if (lastResp?.aiClassification?.intent !== 'promised_later') {
            // Not a promised_later response; requires human action, do not send automated reminder
            continue;
          }
        }

        // Check permanent opt-out suppression for this client/channel
        const hasOptedOut =
          mongoose.connection.readyState === 1 && followUp.clientId
            ? await FollowUpState.exists({
                orgId: followUp.orgId,
                clientId: followUp.clientId,
                channel: followUp.channel,
                status: 'opt_out',
              })
            : false;
        if (hasOptedOut) {
          followUp.status = 'opt_out';
          followUp.nextReminderAt = null;
          followUp.resolutionNotes = 'Client opted out of communications on this channel; reminder loop terminated.';
          await followUp.save();
          result.completed++;
          continue;
        }

        // 1. Recheck the underlying asset or task source record
        if (followUp.module === 'Task') {
          const isTaskObjId = Types.ObjectId.isValid(followUp.sourceId);
          const task: any = await Task.findOne({
            orgId: followUp.orgId,
            isDeleted: false,
            ...(isTaskObjId
              ? { $or: [{ _id: followUp.sourceId }, { taskId: followUp.sourceId }] }
              : { taskId: followUp.sourceId }),
          }).lean().exec();

          // Stop conditions: Task completed, deleted, cancelled
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
          // If DSC deleted, deactivated, or expiry changed (renewed), terminate reminder
          if (!dsc || (dsc.status && String(dsc.status).toLowerCase() !== 'active')) {
            followUp.status = 'completed';
            followUp.nextReminderAt = null;
            followUp.resolutionNotes = 'DSC was renewed or deactivated; reminder loop ended.';
            await followUp.save();
            result.completed++;
            continue;
          }
          if (followUp.metadata?.originalExpiryDate && dsc.expiryDate !== followUp.metadata.originalExpiryDate) {
            followUp.status = 'completed';
            followUp.nextReminderAt = null;
            followUp.resolutionNotes = 'DSC expiry date updated (certificate renewed); reminder loop ended.';
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
          // If license deleted, closed, or expiry changed (renewed), terminate reminder
          if (!lic || (lic.status && String(lic.status).toLowerCase() !== 'active')) {
            followUp.status = 'completed';
            followUp.nextReminderAt = null;
            followUp.resolutionNotes = 'License was renewed or closed; reminder loop ended.';
            await followUp.save();
            result.completed++;
            continue;
          }
          if (followUp.metadata?.originalExpiryDate && lic.expiryDate !== followUp.metadata.originalExpiryDate) {
            followUp.status = 'completed';
            followUp.nextReminderAt = null;
            followUp.resolutionNotes = 'License expiry date updated (license renewed); reminder loop ended.';
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

        if (!isRealSend) {
          // Phase 13: Dry-run / preview only: DO NOT increment attemptCount and DO NOT advance nextReminderAt
          logger.info(`[Dry-Run] Follow-up reminder preview generated for ${recipientAddress} (${followUp.channel}).`);
          result.reminded++;
        } else if (sendResult.status === 'failed') {
          // Phase 13: Delivery retry handling with capped exponential backoff (15m, 30m, 60m, 120m, 240m)
          const currentRetries = Number(followUp.metadata?.deliveryRetryCount || 0) + 1;
          logger.warn(`Failed follow-up dispatch to ${recipientAddress} (delivery retry #${currentRetries}): ${sendResult.error}`);

          if (currentRetries >= 5) {
            followUp.status = 'escalated';
            followUp.nextReminderAt = null;
            followUp.resolutionNotes = `Delivery failed permanently after ${currentRetries} retries: ${sendResult.error}`;
            followUp.metadata = {
              ...(followUp.metadata || {}),
              deliveryRetryCount: currentRetries,
              lastDeliveryError: sendResult.error,
            };
            await followUp.save();
            result.escalated++;
            continue;
          }

          const backoffMinutes = Math.min(15 * Math.pow(2, currentRetries - 1), 240);
          followUp.nextReminderAt = new Date(now.getTime() + backoffMinutes * 60 * 1000);
          followUp.metadata = {
            ...(followUp.metadata || {}),
            deliveryRetryCount: currentRetries,
            lastDeliveryError: sendResult.error,
          };
          await followUp.save();
        } else {
          // Phase 13: Successful real send: increment attemptCount, clear delivery retry count, schedule next reminder
          followUp.attemptCount += 1;
          followUp.lastReminderAt = now;
          if (sendResult.executionId) {
            followUp.providerMessageId = sendResult.executionId;
          }
          followUp.metadata = {
            ...(followUp.metadata || {}),
            deliveryRetryCount: 0,
            lastDeliveryError: undefined,
          };

          const nextIntervalIndex = Math.min(followUp.attemptCount - 1, intervals.length - 1);
          const nextIntervalHours = intervals[nextIntervalIndex] || 48;
          followUp.nextReminderAt = new Date(now.getTime() + nextIntervalHours * 3600 * 1000);
          await followUp.save();
          result.reminded++;
        }
      } catch (err: any) {
        const errMsg = `Error processing follow-up (${followUp._id}): ${err?.message || err}`;
        logger.error(errMsg);
        result.errors.push(errMsg);
      }
    }

    return result;
  }

  /**
   * Process incoming Gmail replies and document attachments when GMAIL_INBOUND_ENABLED=true.
   * Matches replies against active follow-up records via threadId, inReplyTo, or unique client email.
   */
  static async processInboundGmailReplies(options?: {
    orgId?: string;
    limit?: number;
  }): Promise<{
    processed: number;
    matched: number;
    errors: string[];
  }> {
    const isEnabled = env.GMAIL_INBOUND_ENABLED || process.env.GMAIL_INBOUND_ENABLED === 'true';
    if (!isEnabled) {
      return { processed: 0, matched: 0, errors: [] };
    }

    // Phase 3: Check Google OAuth integration read scopes and retrieve connected practice email
    let practiceEmail = '';
    if (mongoose.connection.readyState === 1) {
      try {
        const integration = await IntegrationModel.findOne({ provider: 'google' }).lean().exec();
        if (integration) {
          practiceEmail = (integration.email || '').trim().toLowerCase();
          const scope = (integration.scope || '').toLowerCase();
          const hasReadScope =
            scope.includes('gmail.readonly') ||
            scope.includes('mail.google.com') ||
            scope.includes('gmail.modify') ||
            scope.includes('gmail');
          if (!hasReadScope) {
            const scopeErr = 'Google OAuth credentials missing Gmail read scope (e.g. gmail.readonly or mail.google.com). Inbound processing halted.';
            logger.warn(`⚠️ [FollowUpService] ${scopeErr}`);
            return { processed: 0, matched: 0, errors: [scopeErr] };
          }
        }
      } catch (err: any) {
        logger.warn(`Could not check Google Integration scopes: ${err?.message || err}`);
      }
    }

    const auth = await GmailSyncService.getOAuth2Client();
    if (!auth) {
      return { processed: 0, matched: 0, errors: ['Google OAuth client not configured or missing refresh token.'] };
    }

    const { google } = await import('googleapis');
    const gmail = google.gmail({ version: 'v1', auth });
    const limit = options?.limit || 20;
    const errors: string[] = [];
    let processed = 0;
    let matched = 0;

    try {
      const listRes = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox',
        maxResults: limit,
      });

      const messages = listRes.data.messages || [];
      for (const msgSummary of messages) {
        if (!msgSummary.id) continue;

        // Phase 3: Deduplicate using InboundMessageLog
        if (mongoose.connection.readyState === 1) {
          const alreadyProcessed = await InboundMessageLog.exists({
            provider: 'gmail',
            messageId: msgSummary.id,
          });
          if (alreadyProcessed) {
            continue;
          }
        }

        processed++;

        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msgSummary.id,
            format: 'full',
          });

          const payload = detail.data.payload;
          if (!payload) continue;

          const headers = payload.headers || [];
          const getHeader = (name: string) =>
            headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

          const fromValue = getHeader('From');
          const subjectValue = getHeader('Subject');
          const inReplyToHeader = getHeader('In-Reply-To');
          const referencesHeader = getHeader('References');
          const threadId = detail.data.threadId || msgSummary.threadId;

          const emailMatch =
            fromValue.match(/<([^>]+)>/) ||
            fromValue.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const senderEmail = emailMatch ? emailMatch[1].trim().toLowerCase() : fromValue.trim().toLowerCase();

          // Phase 3: Filter out self-sent practice emails
          if (practiceEmail && senderEmail === practiceEmail) {
            continue;
          }

          // 1. Correlation order:
          // Priority A: Exact stored emailThreadId
          // Priority B: inReplyTo / references matching providerMessageId
          // Priority C: Verified client email with unique active follow-up
          let followUp: IFollowUpStateDocument | null = null;
          if (threadId) {
            followUp = await FollowUpState.findOne({
              emailThreadId: threadId,
              status: { $in: ['waiting_client', 'response_received', 'pending'] },
              ...(options?.orgId ? { orgId: options.orgId } : {}),
            }).exec();
          }

          if (!followUp && (inReplyToHeader || referencesHeader)) {
            const refIds = [inReplyToHeader, ...(referencesHeader ? referencesHeader.split(/\s+/) : [])].filter(Boolean);
            followUp = await FollowUpState.findOne({
              providerMessageId: { $in: refIds },
              status: { $in: ['waiting_client', 'response_received', 'pending'] },
              ...(options?.orgId ? { orgId: options.orgId } : {}),
            }).exec();
          }

          if (!followUp && senderEmail) {
            const candidateFollowUps = await FollowUpState.find({
              clientEmail: senderEmail,
              status: { $in: ['waiting_client', 'response_received', 'pending'] },
              ...(options?.orgId ? { orgId: options.orgId } : {}),
            }).exec();

            if (candidateFollowUps.length === 1) {
              followUp = candidateFollowUps[0];
            } else if (candidateFollowUps.length > 1) {
              // Disambiguate if subject or snippet matches documentTitle or sourceName
              const candidateMatch = candidateFollowUps.find((fu: any) => {
                const docTitle = (fu.documentTitle || '').toLowerCase();
                const taskName = (fu.sourceName || '').toLowerCase();
                const textContent = `${subjectValue} ${detail.data.snippet || ''}`.toLowerCase();
                return (docTitle && textContent.includes(docTitle)) || (taskName && textContent.includes(taskName));
              });

              if (candidateMatch) {
                followUp = candidateMatch;
              } else {
                logger.warn(`Ambiguous Gmail reply from ${senderEmail}: matches ${candidateFollowUps.length} active follow-ups. Routing for manual review.`);
                if (mongoose.connection.readyState === 1) {
                  try {
                    await InboundMessageLog.create({
                      provider: 'gmail',
                      messageId: msgSummary.id,
                      sender: senderEmail,
                      orgId: options?.orgId,
                      status: 'failed',
                      rawPayloadSnippet: `Ambiguous reply matching ${candidateFollowUps.length} active follow-ups`,
                    });
                  } catch {}
                }
                continue;
              }
            }
          }

          if (!followUp) {
            // Message does not correlate to an active agent follow-up
            continue;
          }

          matched++;

          // Extract text body
          let bodyText = '';
          const extractText = (part: any) => {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              bodyText += Buffer.from(part.body.data, 'base64url').toString('utf-8');
            } else if (part.parts && Array.isArray(part.parts)) {
              for (const subPart of part.parts) extractText(subPart);
            }
          };
          extractText(payload);
          if (!bodyText && detail.data.snippet) {
            bodyText = detail.data.snippet;
          }

          // Check for attachments
          const attachmentParts: Array<{ filename: string; mimeType: string; attachmentId: string; size: number }> = [];
          const findAttachments = (part: any) => {
            if (part.filename && part.body?.attachmentId) {
              attachmentParts.push({
                filename: part.filename,
                mimeType: part.mimeType || 'application/octet-stream',
                attachmentId: part.body.attachmentId,
                size: Number(part.body.size || 0),
              });
            }
            if (part.parts && Array.isArray(part.parts)) {
              for (const subPart of part.parts) findAttachments(subPart);
            }
          };
          findAttachments(payload);

          // Handle Attachment if present
          if (attachmentParts.length > 0 && followUp.module === 'Task' && followUp.sourceId) {
            const att = attachmentParts[0];
            try {
              const attData = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: msgSummary.id,
                id: att.attachmentId,
              });

              if (attData.data.data) {
                const fileBuffer = Buffer.from(attData.data.data, 'base64url');
                const multerFile: Express.Multer.File = {
                  fieldname: 'file',
                  originalname: att.filename,
                  encoding: '7bit',
                  mimetype: att.mimeType,
                  buffer: fileBuffer,
                  size: fileBuffer.length,
                  destination: '',
                  filename: att.filename,
                  path: '',
                  stream: null as any,
                };

                const uploaded = await DriveService.uploadDocument(multerFile, {
                  category: DocumentCategory.GENERAL,
                  description: `Gmail Inbound Attachment: ${att.filename} from ${senderEmail}`,
                  clientId: followUp.clientId,
                  clientName: followUp.clientName,
                  subFolder: followUp.sourceId,
                  customFileName: att.filename,
                  tags: ['Gmail-Inbound', followUp.sourceId],
                  uploadedBy: 'Client via Email',
                });

                const fileUrl = uploaded.webViewLink || uploaded.previewUrl || `/api/v1/drive/${uploaded._id}/download`;

                // Update Task document request
                const targetTask = await Task.findOne({
                  orgId: followUp.orgId,
                  isDeleted: false,
                  ...(Types.ObjectId.isValid(followUp.sourceId)
                    ? { $or: [{ _id: followUp.sourceId }, { taskId: followUp.sourceId }] }
                    : { taskId: followUp.sourceId }),
                }).exec();

                let updatedDocItem = false;
                if (targetTask && followUp.documentRequestId) {
                  const docReq = (targetTask.documentRequests || []).find((d: any) => d.id === followUp.documentRequestId);
                  if (docReq) {
                    docReq.status = 'Received';
                    docReq.fileUrl = fileUrl;
                    docReq.receivedAt = new Date();
                    targetTask.markModified('documentRequests');
                    await targetTask.save();
                    updatedDocItem = true;
                  }
                }

                if (updatedDocItem) {
                  followUp.status = 'document_received';
                  followUp.nextReminderAt = null;
                  followUp.resolvedAt = new Date();
                  followUp.resolutionNotes = `Attachment downloaded from Gmail and verified: ${att.filename}`;
                  followUp.responseHistory.push({
                    receivedAt: new Date(),
                    channel: 'Email',
                    providerMessageId: msgSummary.id,
                    senderAddress: senderEmail,
                    rawText: bodyText,
                    attachmentName: att.filename,
                    attachmentUrl: fileUrl,
                    aiClassification: {
                      intent: 'document_submitted',
                      confidence: 0.95,
                      notes: 'Genuine Gmail attachment verified and saved to Drive',
                      requiresHumanReview: false,
                      actionSuggested: 'mark_received',
                    },
                  });
                  await followUp.save();

                  if (mongoose.connection.readyState === 1) {
                    try {
                      await InboundMessageLog.create({
                        provider: 'gmail',
                        messageId: msgSummary.id,
                        sender: senderEmail,
                        orgId: followUp.orgId,
                        followUpId: followUp._id,
                        status: 'processed',
                        rawPayloadSnippet: `Verified attachment: ${att.filename}`,
                      });
                    } catch {}
                  }
                  continue;
                } else {
                  // Phase 5: Never mark document_received if task item was not updated
                  followUp.status = 'response_received';
                  followUp.lastResponseAt = new Date();
                  followUp.resolutionNotes = `Attachment downloaded from Gmail (${att.filename}), but task document request item was not updated. Routed for manual review.`;
                  followUp.responseHistory.push({
                    receivedAt: new Date(),
                    channel: 'Email',
                    providerMessageId: msgSummary.id,
                    senderAddress: senderEmail,
                    rawText: bodyText,
                    attachmentName: att.filename,
                    attachmentUrl: fileUrl,
                    aiClassification: {
                      intent: 'document_submitted',
                      confidence: 0.5,
                      notes: 'Attachment downloaded to Drive, but no matching task document request item found or updated.',
                      requiresHumanReview: true,
                      actionSuggested: 'manual_review',
                    },
                  });
                  await followUp.save();

                  if (mongoose.connection.readyState === 1) {
                    try {
                      await InboundMessageLog.create({
                        provider: 'gmail',
                        messageId: msgSummary.id,
                        sender: senderEmail,
                        orgId: followUp.orgId,
                        followUpId: followUp._id,
                        status: 'processed',
                        rawPayloadSnippet: `Unlinked attachment: ${att.filename}`,
                      });
                    } catch {}
                  }
                  continue;
                }
              }
            } catch (attErr: any) {
              logger.warn(`Failed to process Gmail attachment for message ${msgSummary.id}:`, attErr?.message || attErr);
            }
          }

          // Handle text body classification
          if (bodyText) {
            const classification = await AgentAiService.classifyClientReply(bodyText, [], {
              clientName: followUp.clientName,
              taskOrAssetName: followUp.sourceName,
            });

            followUp.lastResponseAt = new Date();
            followUp.responseHistory.push({
              receivedAt: new Date(),
              channel: 'Email',
              providerMessageId: msgSummary.id,
              senderAddress: senderEmail,
              rawText: bodyText,
              aiClassification: {
                intent: classification.intent,
                confidence: classification.confidence,
                notes: classification.notes,
                requiresHumanReview: classification.requiresHumanReview,
                actionSuggested: classification.actionSuggested,
              },
            });

            if (classification.intent === 'opt_out') {
              followUp.status = 'opt_out';
              followUp.nextReminderAt = null;
              followUp.resolutionNotes = 'Client opted out via email reply.';
              await FollowUpState.updateMany(
                {
                  orgId: followUp.orgId,
                  clientId: followUp.clientId,
                  channel: 'Email',
                  status: { $in: ['waiting_client', 'response_received', 'pending'] },
                },
                {
                  $set: {
                    status: 'opt_out',
                    nextReminderAt: null,
                    resolutionNotes: 'Client opted out of email reminders; cascaded across active requests.',
                  },
                }
              );
            } else if (classification.intent === 'promised_later') {
              followUp.status = 'response_received';
              followUp.nextReminderAt = new Date(Date.now() + 48 * 3600 * 1000);
              followUp.resolutionNotes = `Client promised later via email: ${classification.notes}`;
            } else {
              followUp.status = 'response_received';
              followUp.resolutionNotes = `Client email response: ${classification.notes}`;
            }

            await followUp.save();

            if (mongoose.connection.readyState === 1) {
              try {
                await InboundMessageLog.create({
                  provider: 'gmail',
                  messageId: msgSummary.id,
                  sender: senderEmail,
                  orgId: followUp.orgId,
                  followUpId: followUp._id,
                  status: 'processed',
                  rawPayloadSnippet: bodyText.slice(0, 200),
                });
              } catch {}
            }
          }
        } catch (msgErr: any) {
          logger.warn(`Error processing Gmail message ${msgSummary.id}:`, msgErr?.message || msgErr);
          errors.push(msgErr?.message || String(msgErr));
        }
      }
    } catch (err: any) {
      logger.error('Error fetching Gmail messages for inbound processing:', err);
      errors.push(err?.message || String(err));
    }

    return { processed, matched, errors };
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
