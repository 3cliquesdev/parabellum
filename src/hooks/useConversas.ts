"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversa } from "@/types/database";

export interface ConversaWithLead extends Conversa {
  lead_nome: string;
  lead_whatsapp: string | null;
  ultima_mensagem?: string;
  ultima_mensagem_em?: string;
}

export function useConversas(tenantId: string | null) {
  const [conversas, setConversas] = useState<ConversaWithLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversas = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("conversas")
        .select("*, leads(nome, whatsapp)")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

      const list = (data ?? []).map((c: any) => ({
        ...c,
        lead_nome: c.leads?.nome ?? "Desconhecido",
        lead_whatsapp: c.leads?.whatsapp ?? null,
      }));
      setConversas(list);
    } catch (e) {
      console.error("useConversas:", e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchConversas();

    if (!tenantId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("conversas-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversas",
        filter: `tenant_id=eq.${tenantId}`,
      }, () => fetchConversas())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchConversas]);

  return { conversas, loading, refetch: fetchConversas };
}
