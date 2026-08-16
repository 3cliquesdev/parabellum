import type { AdminClient } from "@/lib/auth/guard";

// Round-robin por "menor carga atual": entre os vendedores online desse
// pipeline, escolhe quem tem menos negocios abertos no momento. Sem
// ponteiro rotativo salvo em banco - cada chamada reconta na hora, entao
// nunca desalinha mesmo se alguem for adicionado/removido da equipe.
export async function escolherVendedorMenosCarregado(admin: AdminClient, pipelineId: string): Promise<string | null> {
  const { data: equipe } = await admin
    .from("pipeline_vendedores")
    .select("user_id")
    .eq("pipeline_id", pipelineId);

  const userIds = ((equipe ?? []) as { user_id: string }[]).map((v) => v.user_id);
  if (userIds.length === 0) return null;

  const { data: membros } = await admin
    .from("tenant_members")
    .select("user_id, availability_status")
    .in("user_id", userIds);

  const online = ((membros ?? []) as { user_id: string; availability_status: string | null }[])
    .filter((m) => m.availability_status === "online")
    .map((m) => m.user_id);

  const candidatos = online.length > 0 ? online : userIds;

  const { data: negociosAbertos } = await admin
    .from("negocios")
    .select("assigned_to")
    .eq("pipeline_id", pipelineId)
    .eq("estagio", "aberto")
    .in("assigned_to", candidatos);

  const cargaPorUsuario = new Map<string, number>(candidatos.map((id) => [id, 0]));
  for (const row of (negociosAbertos ?? []) as { assigned_to: string | null }[]) {
    if (row.assigned_to) cargaPorUsuario.set(row.assigned_to, (cargaPorUsuario.get(row.assigned_to) ?? 0) + 1);
  }

  let escolhido = candidatos[0];
  let menorCarga = Infinity;
  for (const id of candidatos) {
    const carga = cargaPorUsuario.get(id) ?? 0;
    if (carga < menorCarga) {
      menorCarga = carga;
      escolhido = id;
    }
  }
  return escolhido;
}
