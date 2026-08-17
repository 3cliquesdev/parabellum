import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import type { AdminClient } from "@/lib/auth/guard";
import { dispatchConversation } from "@/lib/dispatch";
import { sendMail } from "@/lib/mailer";

interface ConversaTravadaRow {
  id: string;
  assigned_to: string | null;
  department_id: string | null;
  ultima_mensagem_em: string | null;
}

const MENSAGEM_TRANQUILIZACAO =
  "Ainda estamos localizando um atendente disponível pra te ajudar. Você será atendido em breve, obrigado pela paciência!";

const ROLES_GESTOR = ["owner", "gerente", "gerente_suporte", "gerente_cs", "gerente_geral", "gerente_financeiro"];

// Avisa quem administra o tenant que uma conversa ficou sem resposta de humano
// e nao foi possivel reatribuir pra ninguem disponivel agora.
async function notificarGestores(admin: AdminClient, tenantId: string, conversaId: string) {
  const { data: gestores } = await admin
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .in("role", ROLES_GESTOR);

  const userIds = ((gestores ?? []) as unknown as Array<{ user_id: string }>).map((g) => g.user_id);
  if (userIds.length === 0) return;

  for (const userId of userIds) {
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data.user?.email;
    if (!email) continue;
    await sendMail({
      to: email,
      subject: "Conversa sem resposta - precisa de atenção",
      html: `<p>Uma conversa atribuída a um atendente está há um tempo sem resposta e não foi possível encontrar outro atendente disponível agora.</p><p>Conversa: ${conversaId}</p>`,
      fromName: "3Cliques CRM",
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;

  const { data: tenantConfig } = await admin
    .from("tenants")
    .select("auto_close_inatividade_minutos")
    .eq("id", tenantId)
    .maybeSingle();
  const minutosPadrao = (tenantConfig as { auto_close_inatividade_minutos: number | null } | null)?.auto_close_inatividade_minutos ?? 5;

  const { data, error } = await admin
    .from("conversas")
    .select("id, assigned_to, department_id, ultima_mensagem_em")
    .eq("tenant_id", tenantId)
    .eq("status", "ativo")
    .eq("ia_ativa", false)
    .eq("dispatch_status", "atribuido")
    .not("assigned_to", "is", null)
    .eq("ultima_mensagem_remetente", "lead")
    .not("ultima_mensagem_em", "is", null)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const candidatas = (data ?? []) as ConversaTravadaRow[];
  if (candidatas.length === 0) return NextResponse.json({ processadas: 0 });

  const departmentIds = [...new Set(candidatas.map((c) => c.department_id).filter((id): id is string => Boolean(id)))];
  const { data: deptRows } = departmentIds.length > 0
    ? await admin.from("departments").select("id, auto_close_minutos").in("id", departmentIds)
    : { data: [] as Array<{ id: string; auto_close_minutos: number | null }> };
  const minutosPorDept = new Map(
    ((deptRows ?? []) as Array<{ id: string; auto_close_minutos: number | null }>).map((d) => [d.id, d.auto_close_minutos]),
  );

  const agora = Date.now();
  const travadas = candidatas.filter((c) => {
    const minutos = (c.department_id && minutosPorDept.get(c.department_id)) || minutosPadrao;
    const limite = agora - minutos * 60 * 1000;
    return new Date(c.ultima_mensagem_em as string).getTime() < limite;
  });

  if (travadas.length === 0) return NextResponse.json({ processadas: 0 });

  let reatribuidas = 0;
  let avisosEnviados = 0;

  for (const conversa of travadas) {
    let reatribuida = false;

    if (conversa.department_id) {
      const resultado = await dispatchConversation(
        tenantId,
        conversa.id,
        conversa.department_id,
        "agente_nao_respondeu",
        conversa.assigned_to ?? undefined,
      );
      reatribuida = resultado.atribuido === true;
    }

    if (!reatribuida) {
      await notificarGestores(admin, tenantId, conversa.id);
      avisosEnviados += 1;
    } else {
      reatribuidas += 1;
    }

    await admin.from("mensagens").insert({
      conversa_id: conversa.id,
      tenant_id: tenantId,
      remetente: "ia",
      conteudo: MENSAGEM_TRANQUILIZACAO,
      enviada: true,
    });
    await admin
      .from("conversas")
      .update({ ultima_mensagem_remetente: "ia", ultima_mensagem_em: new Date().toISOString() })
      .eq("id", conversa.id);
  }

  return NextResponse.json({ processadas: travadas.length, reatribuidas, avisos_enviados: avisosEnviados });
}
