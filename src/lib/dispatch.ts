import { createServerClient } from "@supabase/ssr";

function adminClient() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

/**
 * Round-robin dispatcher: atribui a conversa ao próximo agente disponível
 * no departamento correto. Se nenhum disponível, coloca na fila.
 */
export async function dispatchConversation(
  tenantId: string,
  conversaId: string,
  departamento: "vendas" | "suporte",
  motivo: string
): Promise<{ atribuido: boolean; agente_id?: string; na_fila?: boolean }> {
  const supabase = adminClient();

  // 1. Buscar agente disponível via round-robin
  // Ordena por ultima_atribuicao ASC NULLS FIRST = quem há mais tempo sem receber
  const { data: agentes } = await supabase
    .from("tenant_members")
    .select("user_id, ultima_atribuicao, max_conversas")
    .eq("tenant_id", tenantId)
    .eq("disponivel", true)
    .in("departamento", [departamento, "todos"])
    .order("ultima_atribuicao", { ascending: true, nullsFirst: true }) as { data: any[] };

  let agenteEscolhido: string | null = null;

  for (const agente of agentes ?? []) {
    // Verificar capacidade: contar conversas ativas atribuídas a ele
    const { count } = await supabase
      .from("conversas")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", agente.user_id)
      .eq("dispatch_status", "atribuido")
      .eq("status", "ativo") as any;

    if ((count ?? 0) < (agente.max_conversas ?? 10)) {
      agenteEscolhido = agente.user_id;
      break;
    }
  }

  if (agenteEscolhido) {
    // 2A. Atribuir ao agente
    await supabase.from("conversas").update({
      assigned_to: agenteEscolhido,
      dispatch_status: "atribuido",
      assigned_at: new Date().toISOString(),
      departamento_alvo: departamento,
      ai_mode: "disabled",
      ia_ativa: false,
    }).eq("id", conversaId);

    // Atualizar ultima_atribuicao para round-robin correto
    await supabase.from("tenant_members").update({
      ultima_atribuicao: new Date().toISOString(),
    }).eq("tenant_id", tenantId).eq("user_id", agenteEscolhido);

    return { atribuido: true, agente_id: agenteEscolhido };
  } else {
    // 2B. Nenhum disponível → fila
    await supabase.from("conversas").update({
      dispatch_status: "fila",
      departamento_alvo: departamento,
      ai_mode: "disabled",
      ia_ativa: false,
    }).eq("id", conversaId);

    await supabase.from("conversation_queue").upsert({
      tenant_id: tenantId,
      conversa_id: conversaId,
      departamento,
      motivo,
      prioridade: motivo === "sentimento_negativo" ? 1 : 0,
    }, { onConflict: "conversa_id" });

    return { atribuido: false, na_fila: true };
  }
}

/**
 * Quando agente fica disponível, processa a fila do seu departamento
 */
export async function processQueueForAgent(tenantId: string, agentId: string) {
  const supabase = adminClient();

  // Buscar departamento do agente
  const { data: member } = await supabase
    .from("tenant_members")
    .select("departamento, max_conversas")
    .eq("tenant_id", tenantId)
    .eq("user_id", agentId)
    .single() as { data: any };

  if (!member) return;

  // Verificar capacidade atual
  const { count: atual } = await supabase
    .from("conversas")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", agentId)
    .eq("dispatch_status", "atribuido")
    .eq("status", "ativo") as any;

  const slots = (member.max_conversas ?? 10) - (atual ?? 0);
  if (slots <= 0) return;

  // Buscar próximas conversas na fila
  const depts = member.departamento === "todos" ? ["vendas", "suporte"] : [member.departamento];
  const { data: fila } = await supabase
    .from("conversation_queue")
    .select("id, conversa_id")
    .eq("tenant_id", tenantId)
    .in("departamento", depts)
    .is("assigned_at", null)
    .order("prioridade", { ascending: false })
    .order("queued_at", { ascending: true })
    .limit(slots) as { data: any[] };

  for (const item of fila ?? []) {
    await supabase.from("conversas").update({
      assigned_to: agentId,
      dispatch_status: "atribuido",
      assigned_at: new Date().toISOString(),
    }).eq("id", item.conversa_id);

    await supabase.from("conversation_queue").update({
      assigned_at: new Date().toISOString(),
    }).eq("id", item.id);
  }

  if ((fila ?? []).length > 0) {
    await supabase.from("tenant_members").update({
      ultima_atribuicao: new Date().toISOString(),
    }).eq("tenant_id", tenantId).eq("user_id", agentId);
  }
}
