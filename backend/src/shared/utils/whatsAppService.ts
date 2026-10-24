import { logger } from '../../config/logger';

export interface SendWhatsAppOptions {
  to: string; // E.164 formatted phone number e.g. +919876543210
  message: string;
  templateName?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  status: 'delivered' | 'failed' | 'accepted';
  error?: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export class WhatsAppService {
  /**
   * Dispatch a message via WhatsApp Business Cloud API if configured.
   */
  public static async sendMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
    const configured = isWhatsAppConfigured();
    const cleanNumber = options.to.replace(/[^\d+]/g, '');

    if (!configured) {
      logger.warn(`📱 [WHATSAPP NOT CONFIGURED] To: ${cleanNumber} | Message: ${options.message.slice(0, 60)}...`);
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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanNumber.replace('+', ''),
          type: 'text',
          text: {
            preview_url: false,
            body: options.message,
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as Record<string, any>;
      if (!response.ok) {
        const errorMsg = data?.error?.message || `WhatsApp API responded with status ${response.status}`;
        logger.error(`❌ WhatsApp delivery failed to ${cleanNumber}:`, errorMsg);
        return {
          success: false,
          status: 'failed',
          error: errorMsg,
        };
      }

      const messageId = data?.messages?.[0]?.id || `wamid.${Date.now()}`;
      logger.info(`✅ Successfully dispatched WhatsApp message to ${cleanNumber} (ID: ${messageId})`);
      return {
        success: true,
        status: 'delivered',
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
}
