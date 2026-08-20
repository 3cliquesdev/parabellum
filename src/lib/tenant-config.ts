import type { AdminClient } from "@/lib/auth/guard";
import { cached, invalidateCache } from "@/lib/redis";

export interface TenantOperationalConfig {
  horario_atendimento_inicio: string | null;
  horario_atendimento_fim: string | null;
  horario_atendimento_dias: number[] | null;
  auto_close_inatividade_ativo: boolean;
  auto_close_inatividade_minutos: number;
}

const TTL_SEGUNDOS = 300;

function tenantConfigKey(tenantId: string) {
  return `tenant-config:${tenantId}`;
}

/**
 * Config operacional do tenant (horario comercial + auto-close por
 * inatividade) muda raramente mas e lida em quase toda mensagem/cron
 * (transferir, inativas, travadas). Cacheada por 5min no Redis com fallback
 * direto pro Supabase se o cache estiver indisponivel ou vazio.
 */
export async function getTenantOperationalConfig(admin: AdminClient, tenantId: string): Promise<TenantOperationalConfig> {
  return cached(tenantConfigKey(tenantId), TTL_SEGUNDOS, async () => {
    const { data } = await admin
      .from("tenants")
      .select("horario_atendimento_inicio, horario_atendimento_fim, horario_atendimento_dias, auto_close_inatividade_ativo, auto_close_inatividade_minutos")
      .eq("id", tenantId)
      .maybeSingle();

    const row = data as Partial<TenantOperationalConfig> | null;
    return {
      horario_atendimento_inicio: row?.horario_atendimento_inicio ?? null,
      horario_atendimento_fim: row?.horario_atendimento_fim ?? null,
      horario_atendimento_dias: row?.horario_atendimento_dias ?? null,
      auto_close_inatividade_ativo: row?.auto_close_inatividade_ativo ?? false,
      auto_close_inatividade_minutos: row?.auto_close_inatividade_minutos ?? 5,
    };
  });
}

export async function invalidateTenantOperationalConfig(tenantId: string): Promise<void> {
  await invalidateCache(tenantConfigKey(tenantId));
}
