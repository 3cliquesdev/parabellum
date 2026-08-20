import type { ConversaCanal, Lead } from "@/types/database";

export type InboxExternalCanal = Exclude<ConversaCanal, "interno">;

export interface LeadIdentitySnapshot {
  canal: InboxExternalCanal;
  valor: string | null;
  valor_normalizado?: string | null;
  external_id?: string | null;
}

export const CHANNEL_META: Record<ConversaCanal, {
  label: string;
  accent: string;
  emptyLabel: string;
  supportsOutbound: boolean;
  supportsAttachments: boolean;
}> = {
  whatsapp: {
    label: "WhatsApp",
    accent: "#25D366",
    emptyLabel: "Sem número",
    supportsOutbound: true,
    supportsAttachments: true,
  },
  email: {
    label: "Email",
    accent: "#60a5fa",
    emptyLabel: "Sem email",
    supportsOutbound: true,
    supportsAttachments: false,
  },
  instagram: {
    label: "Instagram",
    accent: "#E1306C",
    emptyLabel: "Sem @",
    supportsOutbound: true,
    supportsAttachments: false,
  },
  telegram: {
    label: "Telegram",
    accent: "#229ED9",
    emptyLabel: "Sem @",
    supportsOutbound: false,
    supportsAttachments: false,
  },
  facebook_messenger: {
    label: "Messenger",
    accent: "#0084FF",
    emptyLabel: "Sem perfil",
    supportsOutbound: false,
    supportsAttachments: false,
  },
  webchat: {
    label: "Chat do site",
    accent: "#9aea62",
    emptyLabel: "Visitante",
    supportsOutbound: true,
    supportsAttachments: false,
  },
  interno: {
    label: "Interno",
    accent: "#939da4",
    emptyLabel: "Conversa interna",
    supportsOutbound: false,
    supportsAttachments: false,
  },
};

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length > 11) return digits.slice(2);
  return digits;
}

// Celular brasileiro pode aparecer com ou sem o 9º dígito dependendo de onde
// veio (WhatsApp sempre manda com o 9; formulário de checkout da Kiwify às
// vezes não), entao comparar o numero inteiro por igualdade/substring perde
// casos legitimos. Os ultimos 8 digitos (o numero de assinante em si, sem
// DDD nem o 9) sao estaveis nas duas origens - usar como chave de comparacao.
export function phoneSuffix8(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = normalizePhone(raw);
  if (!normalized || normalized.length < 8) return null;
  return normalized.slice(-8);
}

export function normalizeChannelIdentity(canal: InboxExternalCanal, raw: string | null | undefined) {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  switch (canal) {
    case "whatsapp":
      return normalizePhone(value);
    case "email":
      return value.toLowerCase();
    case "instagram":
    case "telegram":
      return value.replace(/^@/, "").toLowerCase();
    case "facebook_messenger":
      return value.toLowerCase();
    default:
      return value;
  }
}

export function getLeadDirectIdentity(lead: Pick<Lead, "whatsapp" | "email" | "instagram">, canal: InboxExternalCanal) {
  switch (canal) {
    case "whatsapp":
      return lead.whatsapp;
    case "email":
      return lead.email;
    case "instagram":
      return lead.instagram;
    default:
      return null;
  }
}

export function formatIdentityLabel(canal: ConversaCanal, value: string | null | undefined) {
  if (!value) return CHANNEL_META[canal].emptyLabel;

  if (canal === "instagram" || canal === "telegram") {
    return value.startsWith("@") ? value : `@${value}`;
  }

  return value;
}

export function resolveConversationIdentity(
  canal: ConversaCanal,
  lead: Pick<Lead, "whatsapp" | "email" | "instagram"> | null | undefined,
  identities: LeadIdentitySnapshot[] = [],
) {
  const channelIdentity = canal === "interno"
    ? null
    : identities.find((identity) => identity.canal === canal);

  if (channelIdentity?.valor) {
    return formatIdentityLabel(canal, channelIdentity.valor);
  }

  if (channelIdentity?.external_id) {
    const suffix = channelIdentity.external_id.slice(-6);
    if (canal === "instagram") return `Instagram #${suffix}`;
    if (canal === "telegram") return `Telegram #${suffix}`;
    if (canal === "facebook_messenger") return `Messenger #${suffix}`;
    return channelIdentity.external_id;
  }

  if (lead && canal !== "interno") {
    const directValue = getLeadDirectIdentity(lead, canal);
    if (directValue) return formatIdentityLabel(canal, directValue);
  }

  return CHANNEL_META[canal].emptyLabel;
}
