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
    supportsOutbound: false,
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

  if (lead && canal !== "interno") {
    const directValue = getLeadDirectIdentity(lead, canal);
    if (directValue) return formatIdentityLabel(canal, directValue);
  }

  return CHANNEL_META[canal].emptyLabel;
}
