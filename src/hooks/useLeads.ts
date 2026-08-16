"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "@/types/database";

export function useLeads(tenantId: string | null) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!tenantId) {
      setLoading(false); // resolve mesmo sem tenantId
      return;
    }
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      const leadsData = (data as unknown as Lead[]) ?? [];

      // Tag de situacao de pagamento no card do Kanban: venda Kiwify mais
      // recente ainda nao paga (carrinho abandonado/cartao recusado/
      // aguardando pagamento) de quem ainda nao virou cliente - so
      // informativo, nao muda leads.status nem cria coluna nova.
      const { data: vendasPendentes } = await supabase
        .from("vendas")
        .select("lead_id, status, created_at")
        .eq("tenant_id", tenantId)
        .in("status", ["carrinho_abandonado", "cartao_recusado", "aguardando_pagamento"])
        .not("lead_id", "is", null)
        .order("created_at", { ascending: false });

      const situacaoPorLead = new Map<string, Lead["situacao_pagamento"]>();
      for (const venda of (vendasPendentes ?? []) as unknown as { lead_id: string; status: string }[]) {
        if (!situacaoPorLead.has(venda.lead_id)) {
          situacaoPorLead.set(venda.lead_id, venda.status as Lead["situacao_pagamento"]);
        }
      }

      setLeads(leadsData.map((lead) => ({
        ...lead,
        situacao_pagamento: lead.eh_cliente ? null : (situacaoPorLead.get(lead.id) ?? null),
      })));
    } catch (e) {
      console.error("useLeads error:", e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchLeads();
    });
  }, [fetchLeads]);

  return { leads, loading, refetch: fetchLeads };
}

export function useUpdateLeadStatus() {
  const updateStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    const supabase = createClient();
    await supabase.from("leads").update({ status }).eq("id", leadId);
  }, []);
  return { updateStatus };
}

export function useCreateLead() {
  const createLead = useCallback(async (data: Partial<Lead>) => {
    const supabase = createClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .insert(data)
      .select()
      .single();
    return { lead: lead as unknown as Lead | null, error };
  }, []);
  return { createLead };
}
