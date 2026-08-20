"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enrichConversaRows, type ConversaRow, type ConversaWithLead } from "@/hooks/useConversas";

// Busca server-side, direta ao banco - nao filtra o array ja carregado pelo
// useConversas (que so traz as 100 conversas mais recentes). Sem isso, buscar
// um protocolo/telefone antigo nunca acharia nada mesmo a conversa existindo,
// exatamente o problema que o Parabellum ja documentou e resolveu do mesmo
// jeito (hook de busca dedicado, nao filtro em memoria).
function normalizarTelefone(termo: string): string[] {
  const digitos = termo.replace(/\D/g, "");
  const variantes = [digitos];
  if (digitos.startsWith("55") && digitos.length > 10) variantes.push(digitos.slice(2));
  return variantes;
}

function pareceProtocolo(termo: string): number | null {
  const limpo = termo.replace(/^#/, "").trim();
  return /^\d+$/.test(limpo) && limpo.length <= 6 ? Number(limpo) : null;
}

function pareceTelefone(termo: string): boolean {
  return termo.replace(/\D/g, "").length >= 6;
}

interface AuthContext {
  userId: string | null;
  role: string;
  deptIds: string[];
}

async function loadAuthContext(tenantId: string): Promise<AuthContext> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: "atendente", deptIds: [] };

  const { data: memberData } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = (memberData as { role?: string } | null)?.role ?? "atendente";

  let deptIds: string[] = [];
  if (role !== "owner" && role !== "gerente") {
    const { data: deptRows } = await supabase
      .from("agent_departments")
      .select("department_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id);
    deptIds = ((deptRows ?? []) as unknown as Array<{ department_id: string }>).map((d) => d.department_id);
  }

  return { userId: user.id, role, deptIds };
}

// Mesma regra de visibilidade do useConversas: gerente/owner veem tudo,
// qualquer outro cargo so ve o que e dele ou o que ainda nao tem dono.
function filtroVisibilidade(auth: AuthContext): string | null {
  if (!auth.userId || auth.role === "owner" || auth.role === "gerente") return null;
  const unassignedOr = ["ia_ativa.eq.true", "department_id.is.null"];
  if (auth.deptIds.length > 0) unassignedOr.push(`department_id.in.(${auth.deptIds.join(",")})`);
  return `assigned_to.eq.${auth.userId},and(assigned_to.is.null,or(${unassignedOr.join(",")}))`;
}

export function useConversasSearch(tenantId: string | null, termoBruto: string) {
  const [resultados, setResultados] = useState<ConversaWithLead[]>([]);
  const [buscando, setBuscando] = useState(false);
  const termo = termoBruto.trim();
  const ativa = termo.length >= 2;
  const requestId = useRef(0);

  useEffect(() => {
    if (!tenantId || !ativa) {
      return;
    }
    const tid = tenantId;

    const idDestaBusca = ++requestId.current;
    const timeout = setTimeout(async () => {
      setBuscando(true);
      try {
        const supabase = createClient();
        const auth = await loadAuthContext(tid);
        const visibilidade = filtroVisibilidade(auth);

        async function buscarConversas(filtro: { protocolo: number } | { leadIds: string[] }): Promise<ConversaRow[]> {
          let query = supabase
            .from("conversas")
            .select("*, leads(id, nome, whatsapp, email, instagram, eh_cliente)")
            .eq("tenant_id", tid);
          query = "protocolo" in filtro ? query.eq("protocolo", filtro.protocolo) : query.in("lead_id", filtro.leadIds);
          if (visibilidade) query = query.or(visibilidade);
          const { data } = await query.order("updated_at", { ascending: false }).limit(200);
          return (data ?? []) as unknown as ConversaRow[];
        }

        let rows: ConversaRow[] = [];
        const protocolo = pareceProtocolo(termo);

        if (protocolo !== null) {
          rows = await buscarConversas({ protocolo });
        } else if (pareceTelefone(termo)) {
          const variantes = normalizarTelefone(termo);
          const { data: leadRows } = await supabase
            .from("leads")
            .select("id")
            .eq("tenant_id", tid)
            .or(variantes.map((v) => `whatsapp.ilike.%${v}%`).join(","))
            .limit(200);
          const leadIds = ((leadRows ?? []) as Array<{ id: string }>).map((l) => l.id);
          if (leadIds.length > 0) rows = await buscarConversas({ leadIds });
        } else {
          const { data: leadRows } = await supabase
            .from("leads")
            .select("id")
            .eq("tenant_id", tid)
            .or(`nome.ilike.%${termo}%,email.ilike.%${termo}%,whatsapp.ilike.%${termo}%`)
            .limit(200);
          const leadIds = ((leadRows ?? []) as Array<{ id: string }>).map((l) => l.id);
          if (leadIds.length > 0) rows = await buscarConversas({ leadIds });
        }

        const enriquecidas = await enrichConversaRows(supabase, tid, rows);
        if (idDestaBusca === requestId.current) setResultados(enriquecidas);
      } catch (e) {
        console.error("useConversasSearch:", e);
        if (idDestaBusca === requestId.current) setResultados([]);
      } finally {
        if (idDestaBusca === requestId.current) setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [tenantId, termo, ativa]);

  return { resultados: ativa ? resultados : [], buscando, ativa };
}
