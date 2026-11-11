import { logger } from '../../config/logger';

export interface SendWhatsAppOptions {
  to: string; // E.164 formatted phone number e.g. +919876543210
  message?: string;
  templateName?: string;
  languageCode?: string;
  templateParameters?: Array<{ type: string; text?: string; [key: string]: unknown }>;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  status: 'accepted' | 'delivered' | 'failed';
  error?: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export class WhatsAppService {
  /**
   * Dispatch a message via WhatsApp Business Cloud API if configured.
   * Supports both approved template messages and customer-care session text messages.
   * Distinguishes provider acceptance ('accepted') from confirmed delivery ('delivered').
   */
  public static async sendMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
    const configured = isWhatsAppConfigured();
    const cleanNumber = options.to.replace(/[^\d+]/g, '');
    const cleanDigits = options.to.replace(/[^\d]/g, '');

    if (cleanDigits.length < 7 || cleanDigits.length > 15) {
      return {
        success: false,
        status: 'failed',
        error: `Invalid E.164 phone number format for recipient "${options.to}".`,
      };
    }

    if (!configured) {
      logger.warn(`📱 [WHATSAPP NOT CONFIGURED] To: ${cleanNumber} | Message: ${(options.message || options.templateName || '').slice(0, 60)}...`);
      return {
        success: false,
        status: 'failed',
        error: 'WhatsApp Business API provider credentials not configured in environment (WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID required).',
      };
    }

    try {
      const token = process.env.WHATSAPP_API_TOKEN!;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
      const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

      let requestBody: Record<string, unknown>;

      if (options.templateName) {
        requestBody = {
          messaging_product: 'whatsapp',
          to: cleanDigits,
          type: 'template',
          template: {
            name: options.templateName,
            language: {
              code: options.languageCode || 'en',
            },
            ...(options.templateParameters && options.templateParameters.length ? {
              components: [
                {
                  type: 'body',
                  parameters: options.templateParameters,
                },
              ],
            } : {}),
          },
        };
      } else {
        if (!options.message?.trim()) {
          return {
            success: false,
            status: 'failed',
            error: 'Either templateName or non-empty message content is required for WhatsApp dispatch.',
          };
        }
        requestBody = {
          messaging_product: 'whatsapp',
          to: cleanDigits,
          type: 'text',
          text: {
            preview_url: false,
            body: options.message,
          },
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json().catch(() => ({}))) as Record<string, any>;
      if (!response.ok) {
        const errorMsg = data?.error?.message || `WhatsApp API responded with status ${response.status}`;
        logger.error(`❌ WhatsApp delivery rejected for ${cleanNumber}:`, errorMsg);
        return {
          success: false,
          status: 'failed',
          error: errorMsg,
        };
      }

      const messageId = data?.messages?.[0]?.id;
      if (!messageId || typeof messageId !== 'string') {
        logger.error(`❌ WhatsApp API accepted request for ${cleanNumber} but returned no provider message ID.`);
        return {
          success: false,
          status: 'failed',
          error: 'WhatsApp Business API accepted request but returned no provider message ID.',
        };
      }

      logger.info(`✅ Meta WhatsApp API accepted message for ${cleanNumber} (Provider ID: ${messageId})`);
      return {
        success: true,
        status: 'accepted',
        messageId,
      };
    } catch (err: any) {
      logger.error(`❌ Failed to send WhatsApp message to ${cleanNumber}:`, err);
      return {
        success: false,
        status: 'failed',
        error: err?.message || 'Network error communicating with WhatsApp Cloud API',
      };
    }
  }

  /**
   * Retrieve metadata (download URL, mime type, size) for an uploaded media attachment from Meta Graph API.
   */
  public static async getMediaMetadata(mediaId: string): Promise<{ url: string; mime_type: string; file_size?: number } | null> {
    const token = process.env.WHATSAPP_API_TOKEN;
    if (!token || !mediaId) return null;
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as { url: string; mime_type: string; file_size?: number };
    } catch (err: any) {
      logger.error(`❌ Failed to get WhatsApp media metadata for ${mediaId}:`, err);
      return null;
    }
  }

  /**
   * Download the binary payload of an incoming media attachment from Meta CDN.
   */
  public static async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const meta = await this.getMediaMetadata(mediaId);
    if (!meta || !meta.url) return null;
    const token = process.env.WHATSAPP_API_TOKEN;
    try {
      const res = await fetch(meta.url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuf),
        mimeType: meta.mime_type,
      };
    } catch (err: any) {
      logger.error(`❌ Failed to download WhatsApp media ${mediaId}:`, err);
      return null;
    }
  }
}
