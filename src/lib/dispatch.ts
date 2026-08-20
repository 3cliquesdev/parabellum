import { createServerClient } from "@supabase/ssr";
import type { LooseDatabase } from "@/types/database";

interface CandidateRow {
  user_id: string;
  ultima_atribuicao: string | null;
  max_concurrent_chats: number;
}

interface QueueItemRow {
  id: string;
  conversa_id: string;
}

function adminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function candidatosDoDepartamento(
  supabase: ReturnType<typeof adminClient>,
  tenantId: string,
  departmentId: string,
  excludeAgentId?: string,
): Promise<CandidateRow[]> {
  const { data: vinculos } = await supabase
    .from("agent_departments")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("department_id", departmentId);

  const userIds = ((vinculos ?? []) as unknown as Array<{ user_id: string }>)
    .map((v) => v.user_id)
    .filter((id) => id !== excludeAgentId);
  if (userIds.length === 0) return [];

  const { data: membros } = await supabase
    .from("tenant_members")
    .select("user_id, availability_status, max_concurrent_chats, ultima_atribuicao")
    .eq("tenant_id", tenantId)
    .eq("availability_status", "online")
    .in("user_id", userIds);

  return ((membros ?? []) as unknown as Array<{ user_id: string; max_concurrent_chats: number; ultima_atribuicao: string | null }>).map((m) => ({
    user_id: m.user_id,
    ultima_atribuicao: m.ultima_atribuicao,
    max_concurrent_chats: m.max_concurrent_chats,
  }));
}

/**
 * Resolve o UUID real de um departamento a partir do slug (ex: "suporte_pedidos")
 * pro tenant. Usar sempre que uma string de departamento vier de fora (IA, flow
 * builder) antes de passar pra dispatchConversation, que espera um UUID de
 * verdade - nunca aceitar "vendas"/"suporte" como se fossem department_id.
 */
export async function resolveDepartmentIdBySlug(tenantId: string, slug: string): Promise<string | null> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("departments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Round-robin com menor carga primeiro (empate por quem esta ha mais tempo sem
 * receber), igual ao algoritmo "round_robin_least_loaded" ja usado em producao
 * pela Parabellum. Se o departamento e filho (ex: Suporte Pedidos) e ninguem
 * disponivel, cai pro departamento pai (Suporte) como fallback.
 */
const MAX_TENTATIVAS_CAS = 3;

export async function dispatchConversation(
  tenantId: string,
  conversaId: string,
  departmentId: string,
  motivo: string,
  excludeAgentId?: string,
  tentativa = 1,
): Promise<{ atribuido: boolean; agente_id?: string; na_fila?: boolean; conflito?: boolean }> {
  const supabase = adminClient();

  // Le o estado atual pra usar como condicao do CAS no update final: se
  // alguem (resolver, outro transferir, assumir manual) mexeu na conversa
  // entre essa leitura e a escrita, lock_version nao vai bater e o UPDATE
  // abaixo afeta 0 linhas - em vez de sobrescrever cegamente uma decisao
  // concorrente (ex: transferir uma conversa que acabou de ser resolvida).
  const { data: estadoAntes } = await supabase
    .from("conversas")
    .select("status, lock_version")
    .eq("id", conversaId)
    .maybeSingle();
  const estado = estadoAntes as { status: string; lock_version: number } | null;
  if (!estado || estado.status === "resolvido") {
    return { atribuido: false, conflito: true };
  }

  let candidatos = await candidatosDoDepartamento(supabase, tenantId, departmentId, excludeAgentId);

  if (candidatos.length === 0) {
    const { data: dept } = await supabase.from("departments").select("parent_id").eq("id", departmentId).maybeSingle();
    const parentId = (dept as { parent_id?: string | null } | null)?.parent_id;
    if (parentId) candidatos = await candidatosDoDepartamento(supabase, tenantId, parentId, excludeAgentId);
  }

  let agenteEscolhido: string | null = null;
  let escolhidoUltimaAtribuicao: string | null = null;
  let menorCarga = Infinity;

  for (const candidato of candidatos) {
    const { count } = await supabase
      .from("conversas")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", candidato.user_id)
      .eq("dispatch_status", "atribuido")
      .eq("status", "ativo");

    const carga = count ?? 0;
    if (carga >= candidato.max_concurrent_chats) continue;

    if (
      carga < menorCarga ||
      (carga === menorCarga && (
        !candidato.ultima_atribuicao ||
        (escolhidoUltimaAtribuicao !== null && candidato.ultima_atribuicao < escolhidoUltimaAtribuicao)
      ))
    ) {
      menorCarga = carga;
      agenteEscolhido = candidato.user_id;
      escolhidoUltimaAtribuicao = candidato.ultima_atribuicao;
    }
  }

  if (agenteEscolhido) {
    const { data: atualizado } = await supabase.from("conversas").update({
      assigned_to: agenteEscolhido,
      dispatch_status: "atribuido",
      assigned_at: new Date().toISOString(),
      department_id: departmentId,
      ai_mode: "disabled",
      ia_ativa: false,
      agente_respondeu: false,
    })
      .eq("id", conversaId)
      .eq("lock_version", estado.lock_version)
      .neq("status", "resolvido")
      .select("id")
      .maybeSingle();

    if (!atualizado) {
      if (tentativa >= MAX_TENTATIVAS_CAS) return { atribuido: false, conflito: true };
      return dispatchConversation(tenantId, conversaId, departmentId, motivo, excludeAgentId, tentativa + 1);
    }

    await supabase.from("tenant_members").update({
      ultima_atribuicao: new Date().toISOString(),
    }).eq("tenant_id", tenantId).eq("user_id", agenteEscolhido);

    return { atribuido: true, agente_id: agenteEscolhido };
  }

  const { data: atualizadoFila } = await supabase.from("conversas").update({
    dispatch_status: "fila",
    department_id: departmentId,
    ai_mode: "disabled",
    ia_ativa: false,
    assigned_to: null,
  })
    .eq("id", conversaId)
    .eq("lock_version", estado.lock_version)
    .neq("status", "resolvido")
    .select("id")
    .maybeSingle();

  if (!atualizadoFila) {
    if (tentativa >= MAX_TENTATIVAS_CAS) return { atribuido: false, conflito: true };
    return dispatchConversation(tenantId, conversaId, departmentId, motivo, excludeAgentId, tentativa + 1);
  }

  await supabase.from("conversation_queue").upsert({
    tenant_id: tenantId,
    conversa_id: conversaId,
    department_id: departmentId,
    motivo,
    prioridade: motivo === "sentimento_negativo" ? 1 : 0,
  }, { onConflict: "conversa_id" });

  return { atribuido: false, na_fila: true };
}

/**
 * Quando um agente fica offline, redistribui as conversas que estavam
 * atribuidas a ele (ainda ativas) - usa o mesmo dispatchConversation de
 * sempre, que so considera agentes com availability_status "online", entao
 * o proprio agente que acabou de ficar offline nunca e escolhido de volta.
 */
export async function reassignAgentActiveConversations(tenantId: string, agentId: string) {
  const supabase = adminClient();

  const { data } = await supabase
    .from("conversas")
    .select("id, department_id")
    .eq("tenant_id", tenantId)
    .eq("assigned_to", agentId)
    .eq("dispatch_status", "atribuido")
    .eq("status", "ativo");

  const conversasAtivas = (data ?? []) as unknown as Array<{ id: string; department_id: string | null }>;
  let redistribuidas = 0;

  for (const conversa of conversasAtivas) {
    if (!conversa.department_id) continue;
    await dispatchConversation(tenantId, conversa.id, conversa.department_id, "agente_ficou_offline");
    redistribuidas += 1;
  }

  return { redistribuidas };
}

/**
 * Quando um agente fica disponivel, processa a fila dos departamentos dele
 * (do mais prioritario/antigo pro mais novo) ate esgotar a capacidade.
 */
export async function processQueueForAgent(tenantId: string, agentId: string) {
  const supabase = adminClient();

  const { data: member } = await supabase
    .from("tenant_members")
    .select("max_concurrent_chats")
    .eq("tenant_id", tenantId)
    .eq("user_id", agentId)
    .maybeSingle();

  const currentMember = member as unknown as { max_concurrent_chats: number } | null;
  if (!currentMember) return;

  const { count: atual } = await supabase
    .from("conversas")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", agentId)
    .eq("dispatch_status", "atribuido")
    .eq("status", "ativo");

  const slots = currentMember.max_concurrent_chats - (atual ?? 0);
  if (slots <= 0) return;

  const { data: deptRows } = await supabase.from("agent_departments").select("department_id").eq("tenant_id", tenantId).eq("user_id", agentId);
  const departmentIds = ((deptRows ?? []) as unknown as Array<{ department_id: string }>).map((d) => d.department_id);
  if (departmentIds.length === 0) return;

  const { data: fila } = await supabase
    .from("conversation_queue")
    .select("id, conversa_id")
    .eq("tenant_id", tenantId)
    .in("department_id", departmentIds)
    .is("assigned_at", null)
    .order("prioridade", { ascending: false })
    .order("queued_at", { ascending: true })
    .limit(slots);

  const queueItems = (fila ?? []) as unknown as QueueItemRow[];

  for (const item of queueItems) {
    await supabase.from("conversas").update({
      assigned_to: agentId,
      dispatch_status: "atribuido",
      assigned_at: new Date().toISOString(),
      agente_respondeu: false,
    }).eq("id", item.conversa_id);

    await supabase.from("conversation_queue").update({
      assigned_at: new Date().toISOString(),
    }).eq("id", item.id);
  }

  if (queueItems.length > 0) {
    await supabase.from("tenant_members").update({
      ultima_atribuicao: new Date().toISOString(),
    }).eq("tenant_id", tenantId).eq("user_id", agentId);
  }
}
