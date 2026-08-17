"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CHANNEL_META, resolveConversationIdentity, type LeadIdentitySnapshot } from "@/lib/inbox/channels";
import type { Conversa, ConversaCanal } from "@/types/database";

export interface ConversaTagInfo {
  id: string;
  nome: string;
  cor: string;
}

export interface ConversaWithLead extends Conversa {
  assigned_to?: string | null;
  dispatch_status?: string | null;
  department_id?: string | null;
  resolvido_por?: string | null;
  protocolo: number;
  ultima_mensagem_remetente?: "lead" | "humano" | "ia" | null;
  ultima_mensagem_em?: string | null;
  ultima_mensagem_lead_em?: string | null;
  agente_respondeu: boolean;
  lead_nome: string;
  lead_whatsapp: string | null;
  lead_email: string | null;
  lead_instagram: string | null;
  lead_identifier: string;
  eh_cliente: boolean;
  canal_label: string;
  canal_color: string;
  supports_outbound: boolean;
  supports_attachments: boolean;
  ai_mode: "autopilot" | "copilot" | "disabled";
  ai_suggestion: string | null;
  tags: ConversaTagInfo[];
}

interface LeadRow {
  id: string;
  nome?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  instagram?: string | null;
  eh_cliente?: boolean | null;
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
  department_id?: string | null;
  resolvido_por?: string | null;
  protocolo: number;
  ultima_mensagem_remetente?: "lead" | "humano" | "ia" | null;
  ultima_mensagem_em?: string | null;
  ultima_mensagem_lead_em?: string | null;
  agente_respondeu: boolean;
  ai_mode?: "autopilot" | "copilot" | "disabled" | null;
  ai_suggestion?: string | null;
  leads?: LeadRow | null;
}

interface ConversationTagRow {
  conversa_id: string;
  tags: { id: string; nome: string; cor: string } | { id: string; nome: string; cor: string }[] | null;
}

interface AuthContext {
  userId: string | null;
  role: string;
  deptIds: string[];
}

export function useConversas(tenantId: string | null) {
  const [conversas, setConversas] = useState<ConversaWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  // Role e departamentos do usuario mudam raramente - carregar isso uma vez
  // por tenant (nao a cada evento realtime) evita 2-3 round trips extras
  // toda vez que uma mensagem chega, que e o que deixava o app inteiro mais
  // lento a cada novo evento, nao so o Inbox.
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);

  useEffect(() => {
    function resetAuthContext() {
      setAuthContext(null);
    }
    resetAuthContext();

    if (!tenantId) {
      function marcarSemTenant() {
        setLoading(false);
      }
      marcarSemTenant();
      return;
    }
    let cancelled = false;
    const tid = tenantId;

    async function loadAuthContext() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setAuthContext({ userId: null, role: "atendente", deptIds: [] });
        return;
      }

      const { data: memberData } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("tenant_id", tid)
        .eq("user_id", user.id)
        .maybeSingle();
      const role = (memberData as { role?: string } | null)?.role ?? "atendente";

      let deptIds: string[] = [];
      if (role !== "owner" && role !== "gerente") {
        const { data: deptRows } = await supabase
          .from("agent_departments")
          .select("department_id")
          .eq("tenant_id", tid)
          .eq("user_id", user.id);
        deptIds = ((deptRows ?? []) as unknown as Array<{ department_id: string }>).map((d) => d.department_id);
      }

      if (!cancelled) setAuthContext({ userId: user.id, role, deptIds });
    }

    void loadAuthContext();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const fetchConversas = useCallback(async () => {
    if (!tenantId || !authContext) {
      if (!tenantId) setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      let query = supabase
        .from("conversas")
        .select("*, leads(id, nome, whatsapp, email, instagram, eh_cliente)")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

      // Gerente/dono veem tudo; qualquer outro cargo so ve o que e dele ou o
      // que ainda nao tem dono (fila da IA, ou nao-atribuido do proprio
      // departamento/sem departamento) - mesma logica ja usada na referencia
      // (Parabellum) pra nao expor a fila inteira do tenant pra todo mundo.
      if (authContext.userId && authContext.role !== "owner" && authContext.role !== "gerente") {
        const unassignedOr = ["ia_ativa.eq.true", "department_id.is.null"];
        if (authContext.deptIds.length > 0) unassignedOr.push(`department_id.in.(${authContext.deptIds.join(",")})`);

        query = query.or(`assigned_to.eq.${authContext.userId},and(assigned_to.is.null,or(${unassignedOr.join(",")}))`);
      }

      const { data } = await query;

      const rows = (data ?? []) as unknown as ConversaRow[];
      const conversaIds = rows.map((row) => row.id);
      const tagsByConversa = new Map<string, ConversaTagInfo[]>();
      if (conversaIds.length > 0) {
        const { data: tagRows } = await supabase
          .from("conversation_tags")
          .select("conversa_id, tags(id, nome, cor)")
          .in("conversa_id", conversaIds);

        for (const row of (tagRows ?? []) as unknown as ConversationTagRow[]) {
          const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
          if (!tag) continue;
          const list = tagsByConversa.get(row.conversa_id) ?? [];
          list.push(tag);
          tagsByConversa.set(row.conversa_id, list);
        }
      }

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
          eh_cliente: lead?.eh_cliente ?? false,
          canal_label: channelMeta.label,
          canal_color: channelMeta.accent,
          supports_outbound: channelMeta.supportsOutbound,
          supports_attachments: channelMeta.supportsAttachments,
          ai_mode: row.ai_mode ?? "autopilot",
          ai_suggestion: row.ai_suggestion ?? null,
          tags: tagsByConversa.get(row.id) ?? [],
        };
      });

      setConversas(list);
    } catch (e) {
      console.error("useConversas:", e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, authContext]);

  useEffect(() => {
    if (!tenantId || !authContext) return;
    queueMicrotask(() => {
      void fetchConversas();
    });

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
  }, [tenantId, authContext, fetchConversas]);

  return { conversas, loading, refetch: fetchConversas };
}
