/**
 * Meta WhatsApp Cloud API Channel Adapter
 * Normaliza eventos da API oficial do Meta para o formato unificado
 */

import type { 
  ChannelAdapter, 
  ChannelAdapterEvent, 
  NormalizedMessage,
  AdapterConfig 
} from './types';
import { normalizePhoneE164 } from './types';

interface MetaWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "contacts" | "button" | "interactive";
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string };
  video?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename: string; caption?: string };
  sticker?: { id: string; mime_type: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  button?: { payload: string; text: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
}

interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: MetaWebhookMessage[];
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export class MetaWhatsAppAdapter implements ChannelAdapter {
  provider = 'meta_whatsapp';
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  parseInbound(rawEvent: unknown): ChannelAdapterEvent | null {
    const payload = rawEvent as MetaWebhookPayload;
    
    if (payload.object !== 'whatsapp_business_account') {
      return null;
    }

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const messages = value.messages;
        
        if (!messages || messages.length === 0) continue;

        const msg = messages[0];
        const contactInfo = value.contacts?.[0];
        
        // Extrair conteúdo
        let text: string | undefined;
        let mediaId: string | undefined;
        let mediaType: 'image' | 'audio' | 'video' | 'document' | undefined;

        switch (msg.type) {
          case 'text':
            text = msg.text?.body;
            break;
          case 'image':
            text = msg.image?.caption;
            mediaType = 'image';
            mediaId = msg.image?.id;
            break;
          case 'audio':
            mediaType = 'audio';
            mediaId = msg.audio?.id;
            break;
          case 'video':
            text = msg.video?.caption;
            mediaType = 'video';
            mediaId = msg.video?.id;
            break;
          case 'document':
            text = msg.document?.caption;
            mediaType = 'document';
            mediaId = msg.document?.id;
            break;
          case 'button':
            text = msg.button?.text || msg.button?.payload;
            break;
          case 'interactive':
            text = msg.interactive?.button_reply?.title || 
                   msg.interactive?.list_reply?.title;
            break;
          case 'location':
            text = `📍 ${msg.location?.name || 'Localização'}: ${msg.location?.latitude}, ${msg.location?.longitude}`;
            break;
          default:
            text = `[${msg.type}]`;
        }

        return {
          provider: 'meta_whatsapp',
          externalMsgId: msg.id,
          direction: 'inbound',
          payload: {
            text,
            mediaUrl: mediaId ? `meta:${mediaId}` : undefined, // Needs to be fetched via Meta API
            mediaType,
            from: {
              phoneE164: normalizePhoneE164(msg.from),
              name: contactInfo?.profile?.name || ''
            },
            to: {
              phoneE164: value.metadata.display_phone_number
            },
            metadata: {
              phoneNumberId: value.metadata.phone_number_id,
              timestamp: msg.timestamp,
              messageType: msg.type
            }
          },
          receivedAt: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
          rawEvent
        };
      }
    }

    return null;
  }

  formatOutbound(message: NormalizedMessage): Record<string, unknown> {
    const basePayload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.recipientPhone?.replace(/\D/g, '')
    };

    // Text message
    if (message.contentType === 'text' && message.content.text) {
      return {
        ...basePayload,
        type: 'text',
        text: { body: message.content.text }
      };
    }

    // Media message
    if (message.content.mediaId) {
      const mediaPayload: Record<string, unknown> = {};
      
      if (message.content.mediaId.startsWith('http')) {
        mediaPayload.link = message.content.mediaId;
      } else {
        mediaPayload.id = message.content.mediaId;
      }

      if (message.content.text && ['image', 'video', 'document'].includes(message.contentType)) {
        mediaPayload.caption = message.content.text;
      }

      return {
        ...basePayload,
        type: message.contentType,
        [message.contentType]: mediaPayload
      };
    }

    return basePayload;
  }

  async verifySignature(headers: Record<string, string>, body: string): Promise<boolean> {
    const signature = headers['x-hub-signature-256'];
    const appSecret = this.config.webhookSecret;

    if (!appSecret) {
      console.warn('[MetaWhatsAppAdapter] No app secret configured');
      return true;
    }

    if (!signature) {
      console.error('[MetaWhatsAppAdapter] Missing x-hub-signature-256 header');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(appSecret);
      const messageData = encoder.encode(body);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return expectedSignature === signature;
    } catch (error) {
      console.error('[MetaWhatsAppAdapter] Signature verification error:', error);
      return false;
    }
  }
}

// Factory function
export function createMetaWhatsAppAdapter(config: AdapterConfig): MetaWhatsAppAdapter {
  return new MetaWhatsAppAdapter(config);
}
