"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CHANNEL_META, resolveConversationIdentity, type LeadIdentitySnapshot } from "@/lib/inbox/channels";
import type { Conversa, ConversaCanal } from "@/types/database";

export interface ConversaWithLead extends Conversa {
  assigned_to?: string | null;
  dispatch_status?: string | null;
  lead_nome: string;
  lead_whatsapp: string | null;
  lead_email: string | null;
  lead_instagram: string | null;
  lead_identifier: string;
  canal_label: string;
  canal_color: string;
  supports_outbound: boolean;
  supports_attachments: boolean;
  ai_mode: "autopilot" | "copilot" | "disabled";
  ai_suggestion: string | null;
}

interface LeadRow {
  id: string;
  nome?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  instagram?: string | null;
}

interface IdentityRow {
  lead_id: string;
  canal: Exclude<ConversaCanal, "interno">;
  valor?: string | null;
  valor_normalizado?: string | null;
  external_id?: string | null;
}

interface ConversaRow extends Conversa {
  assigned_to?: string | null;
  dispatch_status?: string | null;
  ai_mode?: "autopilot" | "copilot" | "disabled" | null;
  ai_suggestion?: string | null;
  leads?: LeadRow | null;
}

export function useConversas(tenantId: string | null) {
  const [conversas, setConversas] = useState<ConversaWithLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversas = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("conversas")
        .select("*, leads(id, nome, whatsapp, email, instagram)")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

      const rows = (data ?? []) as unknown as ConversaRow[];
      const leadIds = rows
        .map((row) => row.leads?.id)
        .filter((leadId): leadId is string => Boolean(leadId));

      const identitiesByLead = new Map<string, LeadIdentitySnapshot[]>();
      if (leadIds.length > 0) {
        const { data: identityData, error: identityError } = await supabase
          .from("lead_identities")
          .select("lead_id, canal, valor, valor_normalizado, external_id")
          .eq("tenant_id", tenantId)
          .in("lead_id", leadIds);

        if (identityError) {
          console.warn("useConversas identities:", identityError.message);
        } else {
          for (const identity of (identityData ?? []) as unknown as IdentityRow[]) {
            const list = identitiesByLead.get(identity.lead_id) ?? [];
            list.push({
              canal: identity.canal,
              valor: identity.valor ?? null,
              valor_normalizado: identity.valor_normalizado ?? null,
              external_id: identity.external_id ?? null,
            });
            identitiesByLead.set(identity.lead_id, list);
          }
        }
      }

      const list = rows.map((row) => {
        const lead = row.leads ?? null;
        const identities = lead?.id ? identitiesByLead.get(lead.id) ?? [] : [];
        const channelMeta = CHANNEL_META[row.canal];
        const safeLead = lead
          ? {
              whatsapp: lead.whatsapp ?? null,
              email: lead.email ?? null,
              instagram: lead.instagram ?? null,
            }
          : null;

        return {
          ...row,
          lead_nome: lead?.nome ?? "Desconhecido",
          lead_whatsapp: lead?.whatsapp ?? null,
          lead_email: lead?.email ?? null,
          lead_instagram: lead?.instagram ?? null,
          lead_identifier: resolveConversationIdentity(row.canal, safeLead, identities),
          canal_label: channelMeta.label,
          canal_color: channelMeta.accent,
          supports_outbound: channelMeta.supportsOutbound,
          supports_attachments: channelMeta.supportsAttachments,
          ai_mode: row.ai_mode ?? "autopilot",
          ai_suggestion: row.ai_suggestion ?? null,
        };
      });

      setConversas(list);
    } catch (e) {
      console.error("useConversas:", e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchConversas();
    });
    if (!tenantId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("conversas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversas", filter: `tenant_id=eq.${tenantId}` },
        () => fetchConversas(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchConversas]);

  return { conversas, loading, refetch: fetchConversas };
}
