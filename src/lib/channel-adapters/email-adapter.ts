/**
 * Sprint 5: Email Channel Adapter
 * Normaliza eventos de email para o formato unificado
 */

import type { 
  ChannelAdapter, 
  ChannelAdapterEvent, 
  NormalizedMessage,
  AdapterConfig 
} from './types';

export class EmailAdapter implements ChannelAdapter {
  provider = 'email';
  
  parseInbound(rawEvent: unknown): ChannelAdapterEvent | null {
    if (!rawEvent || typeof rawEvent !== 'object') return null;
    
    const e = rawEvent as Record<string, unknown>;
    
    // Validar que é um evento de email
    if (!(e.from || e.sender) && !(e.to || e.recipient)) {
      return null;
    }
    
    // Extrair dados do remetente
    const from = parseEmailAddress(e.from || e.sender);
    const to = parseEmailAddress(e.to || e.recipient);
    
    // Extrair conteúdo
    const text = typeof e.text === 'string' ? e.text : '';
    const html = typeof e.html === 'string' ? e.html : undefined;
    const subject = typeof e.subject === 'string' ? e.subject : undefined;
    
    // Extrair ID externo
    const externalMsgId = 
      typeof e.messageId === 'string' ? e.messageId :
      typeof e.message_id === 'string' ? e.message_id :
      `email_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // Determinar direção
    const direction = detectEmailDirection(e);
    
    // Thread key para agrupar respostas
    const threadKey = 
      typeof e.inReplyTo === 'string' ? e.inReplyTo :
      typeof e.in_reply_to === 'string' ? e.in_reply_to :
      typeof e.threadId === 'string' ? e.threadId :
      typeof e.references === 'string' ? e.references.split(/\s+/)[0] :
      undefined;
    
    return {
      provider: 'email',
      externalMsgId,
      direction,
      payload: {
        text,
        html,
        subject,
        from: {
          email: from.email,
          name: from.name
        },
        to: {
          email: to.email,
          name: to.name
        },
        threadKey,
        metadata: {
          raw_subject: subject,
          has_html: !!html
        }
      },
      receivedAt: new Date().toISOString(),
      rawEvent
    };
  }
  
  formatOutbound(message: NormalizedMessage): unknown {
    // Formatar para envio via Resend ou outro provider
    return {
      to: message.content.text, // Será substituído pelo email real
      subject: message.content.subject || 'Resposta do Suporte',
      html: message.content.html || `<p>${message.content.text}</p>`,
      text: message.content.text,
      metadata: {
        conversation_id: message.conversationId,
        contact_id: message.contactId,
        message_id: message.externalMsgId
      }
    };
  }
}

// ========== HELPERS ==========

interface ParsedEmail {
  email: string;
  name?: string;
}

function parseEmailAddress(input: unknown): ParsedEmail {
  if (!input) return { email: '' };
  
  // Já é objeto com email
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;
    return {
      email: typeof obj.email === 'string' ? obj.email : 
             typeof obj.address === 'string' ? obj.address : '',
      name: typeof obj.name === 'string' ? obj.name : undefined
    };
  }
  
  // String no formato "Name <email@example.com>" ou apenas "email@example.com"
  if (typeof input === 'string') {
    const match = input.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return { email: match[2].trim(), name: match[1].trim() };
    }
    return { email: input.trim() };
  }
  
  return { email: '' };
}

function detectEmailDirection(event: Record<string, unknown>): 'inbound' | 'outbound' {
  // Verificar flag explícita
  if (event.direction === 'outbound' || event.type === 'sent') return 'outbound';
  if (event.direction === 'inbound' || event.type === 'received') return 'inbound';
  
  // Verificar se veio de webhook de recebimento
  if (event.webhook_type === 'inbound' || event.source === 'inbound') return 'inbound';
  
  // Default: inbound (emails vindos de clientes)
  return 'inbound';
}

// Factory function
export function createEmailAdapter(_config?: AdapterConfig): EmailAdapter {
  return new EmailAdapter();
}

export default EmailAdapter;
