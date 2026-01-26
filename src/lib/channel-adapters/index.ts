/**
 * Channel Adapters - Index
 * Exporta todos os adapters e helpers
 */

export * from './types';
export { WhatsAppAdapter, createWhatsAppAdapter } from './whatsapp-adapter';
export { MetaWhatsAppAdapter, createMetaWhatsAppAdapter } from './meta-whatsapp-adapter';
export { WebChatAdapter, createWebChatAdapter } from './webchat-adapter';
export { EmailAdapter, createEmailAdapter } from './email-adapter';

import type { ChannelAdapter, AdapterConfig } from './types';
import { createWhatsAppAdapter } from './whatsapp-adapter';
import { createMetaWhatsAppAdapter } from './meta-whatsapp-adapter';
import { createWebChatAdapter } from './webchat-adapter';
import { createEmailAdapter } from './email-adapter';

/**
 * Factory para criar adapter baseado no provider
 */
export function createAdapter(provider: string, config: AdapterConfig): ChannelAdapter | null {
  switch (provider) {
    case 'whatsapp':
      return createWhatsAppAdapter(config);
    case 'meta_whatsapp':
      return createMetaWhatsAppAdapter(config);
    case 'web_chat':
      return createWebChatAdapter(config);
    case 'email':
      return createEmailAdapter(config);
    // case 'instagram':
    //   return createInstagramAdapter(config);
    default:
      console.warn(`Adapter não implementado para: ${provider}`);
      return null;
  }
}
