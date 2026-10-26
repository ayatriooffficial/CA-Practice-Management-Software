import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { IntegrationModel } from '../../modules/integration/integration.model';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.SMTP_USER || env.SMTP_USER;
  const pass = process.env.SMTP_PASS || env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  if (!transporter) {
    const isGmail = (process.env.SMTP_HOST || env.SMTP_HOST || '').includes('gmail') || user.includes('@gmail.com');
    transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: {
              user,
              pass,
            },
          }
        : {
            host: process.env.SMTP_HOST || env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || env.SMTP_PORT) || 465,
            secure: (process.env.SMTP_SECURE || String(env.SMTP_SECURE)) === 'true',
            auth: {
              user,
              pass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          }
    );
  }

  return transporter;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string;
  inReplyTo?: string;
  references?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: 'gmail' | 'smtp';
}

export interface MailServiceStatus {
  connected: boolean;
  authorized: boolean;
  provider: 'gmail' | 'smtp' | 'none';
  email: string | null;
  needsReconnect: boolean;
  statusText: string;
  error?: string;
}

export function getGoogleOAuthCredentials(): { clientId?: string; clientSecret?: string } {
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
  return { clientId, clientSecret };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken?: string;
  expiryDate?: number;
  error?: string;
}> {
  const { clientId, clientSecret } = getGoogleOAuthCredentials();
  if (!clientId || !clientSecret) {
    return {
      error: 'Google OAuth client credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in backend/.env',
    };
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok) {
      return {
        error: data.error_description || data.error || `Token refresh failed with HTTP ${res.status}`,
      };
    }

    const accessToken = data.access_token as string;
    const expiryDate = data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : Date.now() + 3600 * 1000;

    // Update MongoDB integration document with newly minted access token
    await IntegrationModel.updateOne(
      { provider: 'google' },
      { $set: { accessToken, expiryDate } }
    ).exec();

    logger.info('🔄 Successfully refreshed Google OAuth access token and updated database.');
    return { accessToken, expiryDate };
  } catch (err: any) {
    logger.warn(`Failed to refresh Google OAuth access token: ${err?.message}`);
    return { error: err?.message || 'Token refresh network error' };
  }
}

function buildRawEmail(params: {
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  cc?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const isHtml = Boolean(params.html);
  const content = params.html || (params.body ? `<p style="white-space: pre-wrap;">${params.body}</p>` : '');
  const encodedSubject = /^[\x00-\x7F]*$/.test(params.subject || '')
    ? params.subject
    : `=?UTF-8?B?${Buffer.from(params.subject || '').toString('base64')}?=`;

  const headers: string[] = [
    `From: ${params.from}`,
    `To: ${params.to}`,
  ];

  if (params.cc?.trim()) {
    headers.push(`Cc: ${params.cc.trim()}`);
  }

  headers.push(
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    'Content-Transfer-Encoding: 8bit',
  );

  if (params.inReplyTo) headers.push(`In-Reply-To: ${params.inReplyTo}`);
  if (params.references) headers.push(`References: ${params.references}`);

  return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${content}`)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export class MailService {
  /**
   * Determine the current email configuration and authorization status.
   * Checks Google OAuth integration (MongoDB) and SMTP settings honestly.
   */
  public static async getStatus(): Promise<MailServiceStatus> {
    const hasSmtp = Boolean(
      (process.env.SMTP_USER || env.SMTP_USER) &&
      (process.env.SMTP_PASS || env.SMTP_PASS)
    );

    let googleIntegration: any = null;
    try {
      googleIntegration = await IntegrationModel.findOne({ provider: 'google' }).lean().exec();
    } catch (err: any) {
      logger.warn(`Failed to retrieve Google integration settings from database: ${err?.message}`);
    }

    if (googleIntegration?.email) {
      const email = googleIntegration.email;
      const isExpired = googleIntegration.expiryDate ? Date.now() >= googleIntegration.expiryDate - 30000 : true;

      // If access token is still within validity window, test or report active
      if (!isExpired && googleIntegration.accessToken) {
        return {
          connected: true,
          authorized: true,
          provider: 'gmail',
          email,
          needsReconnect: false,
          statusText: `Connected (${email})`,
        };
      }

      // If expired, attempt transparent refresh using refresh token and client credentials
      if (googleIntegration.refreshToken) {
        const refreshResult = await refreshGoogleAccessToken(googleIntegration.refreshToken);
        if (refreshResult.accessToken) {
          return {
            connected: true,
            authorized: true,
            provider: 'gmail',
            email,
            needsReconnect: false,
            statusText: `Connected (${email})`,
          };
        }
      }

      // If Google refresh was not possible, but SMTP is configured, SMTP can deliver
      if (hasSmtp) {
        const smtpUser = process.env.SMTP_USER || env.SMTP_USER || null;
        return {
          connected: true,
          authorized: true,
          provider: 'smtp',
          email: smtpUser,
          needsReconnect: false,
          statusText: `Connected via SMTP (${smtpUser})`,
        };
      }

      // Otherwise report honest authorization required status
      return {
        connected: true,
        authorized: false,
        provider: 'gmail',
        email,
        needsReconnect: true,
        statusText: `Authorization required (${email} expired)`,
        error: 'Gmail access token expired. Please reconnect Gmail at /email.',
      };
    }

    if (hasSmtp) {
      const smtpUser = process.env.SMTP_USER || env.SMTP_USER || null;
      return {
        connected: true,
        authorized: true,
        provider: 'smtp',
        email: smtpUser,
        needsReconnect: false,
        statusText: `Connected via SMTP (${smtpUser})`,
      };
    }

    return {
      connected: false,
      authorized: false,
      provider: 'none',
      email: null,
      needsReconnect: false,
      statusText: 'Not connected (reconnect at /email)',
      error: 'Email delivery provider credentials not configured (Gmail OAuth or SMTP required).',
    };
  }

  /**
   * Send a general transactional or notification email using the configured
   * practice email account (via Google OAuth / Gmail API or SMTP transporter).
   */
  public static async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const toRecipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    // 1. Fetch practice Google integration from database if available
    let googleIntegration: any = null;
    try {
      googleIntegration = await IntegrationModel.findOne({ provider: 'google' }).lean().exec();
    } catch (err: any) {
      logger.warn(`Failed to retrieve Google integration settings from database: ${err?.message}`);
    }

    const defaultSenderEmail =
      googleIntegration?.email ||
      process.env.SMTP_USER ||
      env.SMTP_USER ||
      'searchaicloud@gmail.com';
    const from =
      options.from ||
      process.env.SMTP_FROM ||
      env.SMTP_FROM ||
      `"CA Practice Management" <${defaultSenderEmail}>`;

    // 2. Priority 1: If Google integration document exists, attempt sending via Gmail API
    if (googleIntegration?.email) {
      let accessToken = googleIntegration.accessToken;
      const isExpired = googleIntegration.expiryDate ? Date.now() >= googleIntegration.expiryDate - 30000 : true;

      // If token expired, refresh first
      if (isExpired && googleIntegration.refreshToken) {
        const refreshResult = await refreshGoogleAccessToken(googleIntegration.refreshToken);
        if (refreshResult.accessToken) {
          accessToken = refreshResult.accessToken;
        }
      }

      if (accessToken) {
        try {
          const raw = buildRawEmail({
            to: toRecipients,
            from: defaultSenderEmail,
            subject: options.subject,
            body: options.text || '',
            html: options.html,
            cc: options.cc,
            inReplyTo: options.inReplyTo,
            references: options.references,
          });

          let res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw }),
          });

          // Handle 401: attempt token refresh retry once
          if (res.status === 401 && googleIntegration.refreshToken) {
            logger.warn('Gmail API returned 401; attempting refresh token retry...');
            const retryRefresh = await refreshGoogleAccessToken(googleIntegration.refreshToken);
            if (retryRefresh.accessToken) {
              accessToken = retryRefresh.accessToken;
              res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw }),
              });
            }
          }

          if (res.ok) {
            const json = (await res.json().catch(() => ({}))) as Record<string, any>;
            const messageId = json.id as string;
            if (messageId) {
              logger.info(`✅ Successfully dispatched email via Gmail API to ${toRecipients} (MessageId: ${messageId})`);
              return {
                success: true,
                messageId,
                provider: 'gmail',
              };
            }
          }

          const errJson = (await res.json().catch(() => ({}))) as Record<string, any>;
          const errMsg = errJson.error?.message || `Gmail API HTTP error ${res.status}`;
          logger.warn(`Gmail API dispatch failed: ${errMsg}`);

          // If error is 401 and refresh wasn't possible, report honest error
          if (res.status === 401) {
            const smtpFallback = getTransporter();
            if (!smtpFallback) {
              return {
                success: false,
                error: 'Gmail authorization expired or missing client credentials. Please reconnect Gmail via /email.',
                provider: 'gmail',
              };
            }
          }
        } catch (gmailErr: any) {
          logger.warn(`Gmail API invocation exception: ${gmailErr?.message}`);
        }
      }
    }

    // 3. Priority 2: Use SMTP transporter if configured
    const client = getTransporter();
    if (client) {
      try {
        const info = await client.sendMail({
          from,
          to: toRecipients,
          subject: options.subject,
          text: options.text || (options.html ? options.html.replace(/<[^>]+>/g, '') : ''),
          html: options.html || (options.text ? `<p style="white-space: pre-wrap;">${options.text}</p>` : ''),
        });

        logger.info(`✅ Successfully dispatched email via SMTP to ${toRecipients} (MessageId: ${info.messageId})`);
        return {
          success: true,
          messageId: info.messageId,
          provider: 'smtp',
        };
      } catch (err: any) {
        logger.error(`❌ Failed to send email via SMTP to ${toRecipients}:`, err);
        return {
          success: false,
          error: err?.message || 'SMTP transmission failure',
          provider: 'smtp',
        };
      }
    }

    // 4. Provider not available or unauthenticated
    const msg = googleIntegration?.email
      ? 'Gmail authorization expired or missing credentials. Please reconnect practice email at /email.'
      : 'Email delivery provider credentials not configured in environment (SMTP or Gmail required).';
    logger.warn(`📧 [MAIL SERVICE NOT CONFIGURED] To: ${toRecipients} | Subject: ${options.subject}`);
    return { success: false, error: msg };
  }

  /**
   * Send single-use OTP verification email
   */
  public static async sendOtpEmail(toEmail: string, otpCode: string, userName?: string): Promise<boolean> {
    const cleanEmail = toEmail.trim().toLowerCase();
    const displayName = userName || cleanEmail.split('@')[0];
    const client = getTransporter();

    // If SMTP credentials are not yet configured in .env, log to terminal and proceed
    if (!client) {
      logger.info('====================================================');
      logger.info(`📧 [DEV EMAIL SIMULATOR] To: ${cleanEmail}`);
      logger.info(`🔑 Verification OTP Code: [ ${otpCode} ]`);
      logger.info('💡 Note: Set SMTP_USER and SMTP_PASS in backend/.env to send real emails via Gmail');
      logger.info('====================================================');
      return true;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Verification Code</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background: #6d55f4; padding: 28px 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">CA Practice Management System</h1>
              <p style="color: #e0e7ff; margin: 6px 0 0; font-size: 13px;">Secure Identity Verification</p>
            </div>
            
            <div style="padding: 32px 32px 28px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">Hello <strong>${displayName}</strong>,</p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #475569; line-height: 1.6;">Use the following single-use verification code to sign in to your firm workspace:</p>
              
              <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #6d55f4; font-family: 'Courier New', Courier, monospace;">${otpCode}</span>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 12.5px; color: #64748b; line-height: 1.5;">
                ⏱️ This code will expire in <strong>10 minutes</strong>.<br>
                🛡️ Do not share this code with anyone. Our support team will never ask for your code.
              </p>
              
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
                <p style="margin: 0; font-size: 11.5px; color: #94a3b8; line-height: 1.4;">
                  If you did not request this login code, you can safely ignore this email.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await client.sendMail({
        from: process.env.SMTP_FROM || env.SMTP_FROM || `"CA Practice Management" <${process.env.SMTP_USER || env.SMTP_USER}>`,
        to: cleanEmail,
        subject: `${otpCode} is your CA Practice verification code`,
        text: `Your verification code is: ${otpCode}. It will expire in 10 minutes.`,
        html: htmlContent,
      });

      logger.info(`✅ Successfully dispatched OTP email to ${cleanEmail}`);
      return true;
    } catch (err: any) {
      logger.error(`❌ Failed to send email via SMTP to ${cleanEmail}:`, err);
      // Fallback: log to console so developer is not blocked if internet/SMTP is temporarily down
      logger.warn(`🔑 Fallback OTP for ${cleanEmail}: [ ${otpCode} ]`);
      return false;
    }
  }
}
