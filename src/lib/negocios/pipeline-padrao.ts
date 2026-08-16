import type { AdminClient } from "@/lib/auth/guard";

// Quando quem cria o negocio nao escolhe pipeline/etapa (ex: automacao da
// Kiwify, criacao manual pelo Inbox), cai no pipeline padrao do tenant +
// primeira etapa dele - nunca fica sem pipeline.
export async function resolvePipelinePadrao(admin: AdminClient, tenantId: string) {
  const { data: pipeline } = await admin
    .from("pipelines")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_default", true)
    .maybeSingle();
  if (!pipeline) return { pipelineId: null, etapaId: null };

  const { data: etapa } = await admin
    .from("pipeline_etapas")
    .select("id")
    .eq("pipeline_id", (pipeline as { id: string }).id)
    .order("posicao", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { pipelineId: (pipeline as { id: string }).id, etapaId: (etapa as { id: string } | null)?.id ?? null };
}
