import type { AdminClient } from "@/lib/auth/guard";

type TipoEvento = "criado" | "mudanca_etapa" | "ganho" | "perdido";

interface RegistrarEventoParams {
  negocioId: string;
  tenantId: string;
  tipo: TipoEvento;
  etapaAnteriorId?: string | null;
  etapaNovaId?: string | null;
  usuarioId?: string | null;
  origem?: string | null;
}

// Log de auditoria do negocio: quem/quando/de-onde-pra-onde em cada
// transicao. Base pra medir SLA por etapa depois (tempo entre eventos
// consecutivos do mesmo negocio) - se nao capturar na hora da mudanca, nao
// da pra reconstruir isso retroativamente.
export async function registrarEventoNegocio(admin: AdminClient, params: RegistrarEventoParams) {
  await admin.from("negocio_eventos").insert({
    negocio_id: params.negocioId,
    tenant_id: params.tenantId,
    tipo: params.tipo,
    etapa_anterior_id: params.etapaAnteriorId ?? null,
    etapa_nova_id: params.etapaNovaId ?? null,
    usuario_id: params.usuarioId ?? null,
    origem: params.origem ?? null,
  });
}
