import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { IntegrationModel } from '../../modules/integration/integration.model';
import { Client } from '../../modules/client/client.model';
import { ClientCommunicationModel } from '../../modules/client/clientCommunication.model';

export interface GmailMessageItem {
  messageId: string;
  threadId?: string;
  from: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  snippet: string;
  date: Date;
  rawDate?: string;
}

export interface SyncEmailsResult {
  success: boolean;
  totalFetched: number;
  matchedCount: number;
  newLinkedCount: number;
  skippedDuplicates: number;
  unmatchedCount: number;
  unmatchedEmails: Array<{
    senderEmail: string;
    subject: string;
    messageId: string;
  }>;
  linkedCommunications: Array<{
    clientId: string;
    clientName: string;
    subject: string;
    senderEmail: string;
    date: Date;
    messageId: string;
  }>;
  error?: string;
}

export class GmailSyncService {
  /**
   * Initializes the Google OAuth2 client using credentials from Integration model or environment
   */
  public static async getOAuth2Client(): Promise<OAuth2Client | null> {
    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_DRIVE_CLIENT_ID ||
      env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret =
      process.env.GOOGLE_CLIENT_SECRET ||
      env.GOOGLE_CLIENT_SECRET ||
      process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
      env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3000/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      logger.warn('⚠️ [GmailSyncService] Google OAuth2 credentials (Client ID / Secret) not configured in environment.');
      return null;
    }

    // Prioritize refresh token stored in MongoDB Integration collection (from OAuth flow)
    let refreshToken = (
      process.env.GOOGLE_REFRESH_TOKEN ||
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
      env.GOOGLE_DRIVE_REFRESH_TOKEN ||
      ''
    ).trim();
    let accessToken: string | undefined;

    try {
      const integration = await IntegrationModel.findOne({ provider: 'google' }).lean();
      if (integration?.refreshToken) {
        refreshToken = integration.refreshToken.trim();
      }
      if (integration?.accessToken) {
        accessToken = integration.accessToken.trim();
      }
    } catch (err: any) {
      logger.warn(`[GmailSyncService] Could not retrieve Google Integration document from DB: ${err?.message}`);
    }

    if (!refreshToken) {
      logger.warn('⚠️ [GmailSyncService] Google Refresh Token not found in database or environment variables.');
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    // Automatically synchronize refreshed access tokens into MongoDB Integration collection
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await IntegrationModel.updateOne(
          { provider: 'google' },
          {
            $set: {
              accessToken: tokens.access_token,
              ...(tokens.expiry_date ? { expiryDate: tokens.expiry_date } : {}),
            },
          }
        ).exec().catch(() => {});
      }
    });

    return oauth2Client;
  }

  /**
   * Fetches recent inbox emails via Gmail API
   */
  public static async fetchRecentEmails(limit = 20): Promise<GmailMessageItem[]> {
    const auth = await this.getOAuth2Client();
    if (!auth) {
      logger.warn('⚠️ [GmailSyncService] Cannot fetch Gmail messages: Google OAuth2 client not configured.');
      return [];
    }

    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox',
        maxResults: Math.min(Math.max(1, limit), 100),
      });

      const messageHeaders = listResponse.data.messages || [];
      if (!messageHeaders.length) {
        logger.info('ℹ️ [GmailSyncService] No recent messages found in INBOX.');
        return [];
      }

      const results: GmailMessageItem[] = [];

      for (const msg of messageHeaders) {
        if (!msg.id) continue;
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date', 'To'],
          });

          const headers = detail.data.payload?.headers || [];
          const fromValue = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
          const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
          const dateStr = headers.find((h) => h.name?.toLowerCase() === 'date')?.value || '';
          const snippet = detail.data.snippet || '';

          // Extract clean email address from "From: Full Name <user@domain.com>" or "user@domain.com"
          const emailMatch =
            fromValue.match(/<([^>]+)>/) ||
            fromValue.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const senderEmail = emailMatch
            ? emailMatch[1].trim().toLowerCase()
            : fromValue.trim().toLowerCase();

          let senderName = fromValue;
          if (fromValue.includes('<')) {
            senderName = fromValue.split('<')[0].replace(/["']/g, '').trim();
          }

          const parsedDate = dateStr
            ? new Date(dateStr)
            : new Date(Number(detail.data.internalDate || Date.now()));
          const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

          results.push({
            messageId: msg.id,
            threadId: msg.threadId || undefined,
            from: fromValue,
            senderEmail,
            senderName: senderName || senderEmail,
            subject,
            snippet,
            date: validDate,
            rawDate: dateStr,
          });
        } catch (detailErr: any) {
          logger.warn(`[GmailSyncService] Failed to retrieve message details for ID ${msg.id}: ${detailErr?.message}`);
        }
      }

      logger.info(`✅ [GmailSyncService] Fetched ${results.length} recent messages from Gmail INBOX.`);
      return results;
    } catch (err: any) {
      logger.error('❌ [GmailSyncService] Failed to fetch emails from Gmail API:', err);
      return [];
    }
  }

  /**
   * Fetches recent emails and links them to CRM Clients by sender email address
   */
  public static async syncEmailsToClients(limit = 20): Promise<SyncEmailsResult> {
    const emails = await this.fetchRecentEmails(limit);

    if (!emails.length) {
      return {
        success: true,
        totalFetched: 0,
        matchedCount: 0,
        newLinkedCount: 0,
        skippedDuplicates: 0,
        unmatchedCount: 0,
        unmatchedEmails: [],
        linkedCommunications: [],
      };
    }

    let matchedCount = 0;
    let newLinkedCount = 0;
    let skippedDuplicates = 0;
    const unmatchedEmails: SyncEmailsResult['unmatchedEmails'] = [];
    const linkedCommunications: SyncEmailsResult['linkedCommunications'] = [];

    for (const email of emails) {
      if (!email.senderEmail || !email.senderEmail.includes('@')) {
        unmatchedEmails.push({
          senderEmail: email.senderEmail,
          subject: email.subject,
          messageId: email.messageId,
        });
        continue;
      }

      try {
        // Query Client by primary email, contact email, or promoter email
        const client = await Client.findOne({
          $or: [
            { email: email.senderEmail },
            { 'contacts.email': email.senderEmail },
            { 'customerFiles.promoter.email': email.senderEmail },
          ],
          isDeleted: false,
        }).lean();

        if (!client) {
          unmatchedEmails.push({
            senderEmail: email.senderEmail,
            subject: email.subject,
            messageId: email.messageId,
          });
          continue;
        }

        matchedCount++;

        // Deduplication check using Google messageId
        const existingComm = await ClientCommunicationModel.findOne({
          messageId: email.messageId,
        }).lean();

        if (existingComm) {
          skippedDuplicates++;
          continue;
        }

        // Save email metadata into ClientCommunication collection
        await ClientCommunicationModel.create({
          clientId: client._id,
          clientName: client.name || '',
          clientFileNo: client.fileNo || '',
          messageId: email.messageId,
          threadId: email.threadId || '',
          senderEmail: email.senderEmail,
          senderName: email.senderName,
          from: email.from,
          subject: email.subject,
          snippet: email.snippet,
          date: email.date,
          channel: 'email',
          direction: 'inbound',
          status: 'synced',
        });

        newLinkedCount++;
        linkedCommunications.push({
          clientId: String(client._id),
          clientName: client.name,
          subject: email.subject,
          senderEmail: email.senderEmail,
          date: email.date,
          messageId: email.messageId,
        });
      } catch (err: any) {
        logger.error(
          `❌ [GmailSyncService] Error linking email ${email.messageId} (sender: ${email.senderEmail}):`,
          err
        );
      }
    }

    logger.info(
      `📊 [GmailSyncService] Sync summary: ${emails.length} fetched | ${matchedCount} matched | ${newLinkedCount} newly linked | ${skippedDuplicates} duplicate(s) skipped | ${unmatchedEmails.length} unmatched.`
    );

    return {
      success: true,
      totalFetched: emails.length,
      matchedCount,
      newLinkedCount,
      skippedDuplicates,
      unmatchedCount: unmatchedEmails.length,
      unmatchedEmails,
      linkedCommunications,
    };
  }
}

