import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface EventoRow {
  id: string;
  tipo: "criado" | "mudanca_etapa" | "ganho" | "perdido";
  etapa_anterior_id: string | null;
  etapa_nova_id: string | null;
  usuario_id: string | null;
  origem: string | null;
  created_at: string;
}

const ORIGEM_LABEL: Record<string, string> = {
  drag_kanban: "arrastado no Kanban",
  manual: "edição manual",
  acao_em_massa: "ação em massa",
  kiwify_webhook: "automação Kiwify",
  kiwify: "Kiwify",
  whatsapp: "WhatsApp",
  webchat: "Chat do site",
  instagram: "Instagram",
  telegram: "Telegram",
  email: "E-mail",
};

function formatarDuracao(ms: number): string {
  const minutos = Math.floor(ms / 60000);
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  return `${dias}d`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: negocioId } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data: eventos, error } = await auth.admin
    .from("negocio_eventos")
    .select("id, tipo, etapa_anterior_id, etapa_nova_id, usuario_id, origem, created_at")
    .eq("negocio_id", negocioId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (eventos ?? []) as EventoRow[];

  const etapaIds = [...new Set(rows.flatMap((r) => [r.etapa_anterior_id, r.etapa_nova_id]).filter(Boolean))] as string[];
  const usuarioIds = [...new Set(rows.map((r) => r.usuario_id).filter(Boolean))] as string[];

  const { data: etapas } = etapaIds.length
    ? await auth.admin.from("pipeline_etapas").select("id, nome").in("id", etapaIds)
    : { data: [] as { id: string; nome: string }[] };
  const nomeEtapa = new Map(((etapas ?? []) as { id: string; nome: string }[]).map((e) => [e.id, e.nome]));

  const emailUsuario = new Map<string, string>();
  for (const userId of usuarioIds) {
    const { data } = await auth.admin.auth.admin.getUserById(userId);
    if (data.user?.email) emailUsuario.set(userId, data.user.email);
  }

  const linhas = rows.map((row, i) => {
    const anterior = rows[i - 1];
    const duracaoNaEtapaAnterior = anterior
      ? formatarDuracao(new Date(row.created_at).getTime() - new Date(anterior.created_at).getTime())
      : null;

    const quem = row.usuario_id ? (emailUsuario.get(row.usuario_id) ?? "usuário") : (ORIGEM_LABEL[row.origem ?? ""] ?? "automação");

    let titulo = "";
    let detalhe: string | null = null;

    if (row.tipo === "criado") {
      titulo = "Negócio criado";
      detalhe = row.origem ? `Origem: ${ORIGEM_LABEL[row.origem] ?? row.origem}` : null;
    } else if (row.tipo === "mudanca_etapa") {
      const de = row.etapa_anterior_id ? (nomeEtapa.get(row.etapa_anterior_id) ?? "?") : "?";
      const para = row.etapa_nova_id ? (nomeEtapa.get(row.etapa_nova_id) ?? "?") : "?";
      titulo = `${de} → ${para}`;
      detalhe = `${quem}${duracaoNaEtapaAnterior ? ` — ${duracaoNaEtapaAnterior} em "${de}"` : ""}`;
    } else if (row.tipo === "ganho") {
      titulo = "Negócio ganho";
      detalhe = `${quem}${duracaoNaEtapaAnterior ? ` — ${duracaoNaEtapaAnterior} em "${row.etapa_anterior_id ? nomeEtapa.get(row.etapa_anterior_id) ?? "?" : "?"}"` : ""}`;
    } else if (row.tipo === "perdido") {
      titulo = "Negócio perdido";
      detalhe = quem;
    }

    return { id: row.id, tipo: row.tipo, titulo, detalhe, data: row.created_at };
  });

  // Tempo total desde a criacao ate o primeiro evento terminal (ganho/perdido) - metrica de tempo-de-fechamento.
  const criado = rows.find((r) => r.tipo === "criado");
  const terminal = rows.find((r) => r.tipo === "ganho" || r.tipo === "perdido");
  const tempoTotalFechamento = criado && terminal
    ? formatarDuracao(new Date(terminal.created_at).getTime() - new Date(criado.created_at).getTime())
    : null;

  return NextResponse.json({ eventos: linhas, tempo_total_fechamento: tempoTotalFechamento });
}
