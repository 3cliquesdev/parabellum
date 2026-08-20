import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember } from "@/lib/auth/guard";

interface ConversaSlaRow {
  id: string;
  created_at: string;
  primeira_resposta_em: string | null;
  resolvido_em: string | null;
  department_id: string | null;
  assigned_to: string | null;
}

interface GrupoAcumulado {
  totalConversas: number;
  somaPrimeiraRespostaMs: number;
  contPrimeiraResposta: number;
  somaResolucaoMs: number;
  contResolucao: number;
}

function novoGrupo(): GrupoAcumulado {
  return { totalConversas: 0, somaPrimeiraRespostaMs: 0, contPrimeiraResposta: 0, somaResolucaoMs: 0, contResolucao: 0 };
}

function acumular(grupo: GrupoAcumulado, row: ConversaSlaRow) {
  grupo.totalConversas += 1;
  if (row.primeira_resposta_em) {
    grupo.somaPrimeiraRespostaMs += new Date(row.primeira_resposta_em).getTime() - new Date(row.created_at).getTime();
    grupo.contPrimeiraResposta += 1;
  }
  if (row.resolvido_em) {
    grupo.somaResolucaoMs += new Date(row.resolvido_em).getTime() - new Date(row.created_at).getTime();
    grupo.contResolucao += 1;
  }
}

function finalizarGrupo(nome: string, id: string, grupo: GrupoAcumulado) {
  return {
    id,
    nome,
    total_conversas: grupo.totalConversas,
    tempo_medio_primeira_resposta_min: grupo.contPrimeiraResposta > 0 ? Math.round(grupo.somaPrimeiraRespostaMs / grupo.contPrimeiraResposta / 60000) : null,
    tempo_medio_resolucao_min: grupo.contResolucao > 0 ? Math.round(grupo.somaResolucaoMs / grupo.contResolucao / 60000) : null,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;

  const de = searchParams.get("de") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ate = searchParams.get("ate") ?? new Date().toISOString();

  const { data, error } = await auth.admin
    .from("conversas")
    .select("id, created_at, primeira_resposta_em, resolvido_em, department_id, assigned_to")
    .eq("tenant_id", tenantId)
    .gte("created_at", de)
    .lte("created_at", ate)
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as ConversaSlaRow[];

  const geral = novoGrupo();
  const porDepartamento = new Map<string, GrupoAcumulado>();
  const porAgente = new Map<string, GrupoAcumulado>();

  for (const row of rows) {
    acumular(geral, row);
    if (row.department_id) {
      if (!porDepartamento.has(row.department_id)) porDepartamento.set(row.department_id, novoGrupo());
      acumular(porDepartamento.get(row.department_id)!, row);
    }
    if (row.assigned_to) {
      if (!porAgente.has(row.assigned_to)) porAgente.set(row.assigned_to, novoGrupo());
      acumular(porAgente.get(row.assigned_to)!, row);
    }
  }

  const departmentIds = [...porDepartamento.keys()];
  const agentIds = [...porAgente.keys()];

  const [departmentRows, agentEmails] = await Promise.all([
    departmentIds.length > 0
      ? auth.admin.from("departments").select("id, name").in("id", departmentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    Promise.all(agentIds.map(async (id) => {
      const { data: userData } = await auth.admin.auth.admin.getUserById(id);
      return [id, userData.user?.email ?? "atendente"] as const;
    })),
  ]);

  const deptNameById = new Map(((departmentRows.data ?? []) as Array<{ id: string; name: string }>).map((d) => [d.id, d.name]));
  const emailById = new Map(agentEmails);

  return NextResponse.json({
    periodo: { de, ate },
    geral: finalizarGrupo("Geral", "geral", geral),
    por_departamento: [...porDepartamento.entries()].map(([id, grupo]) => finalizarGrupo(deptNameById.get(id) ?? "Departamento", id, grupo)),
    por_agente: [...porAgente.entries()].map(([id, grupo]) => finalizarGrupo(emailById.get(id) ?? "Atendente", id, grupo)),
  });
}
