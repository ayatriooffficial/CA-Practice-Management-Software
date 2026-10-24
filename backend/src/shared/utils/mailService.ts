import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

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

export class MailService {
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
