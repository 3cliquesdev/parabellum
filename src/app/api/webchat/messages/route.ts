import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { consumeApiRateLimit } from "@/lib/security/rate-limit";

interface ConversaRow {
  id: string;
  tenant_id: string;
  lead_id: string;
}

interface IdentityRow {
  lead_id: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  const conversaId = searchParams.get("conversa_id");
  const visitorId = searchParams.get("visitor_id");

  if (!tenantId || !conversaId || !visitorId) {
    return NextResponse.json({ error: "tenant_id, conversa_id e visitor_id sao obrigatorios" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!await consumeApiRateLimit(admin, `webchat:poll:${visitorId}`, 60, 60)) {
    return NextResponse.json({ error: "Muitas requisicoes. Aguarde um momento." }, { status: 429 });
  }

  const { data: conversa } = await admin
    .from("conversas")
    .select("id, tenant_id, lead_id")
    .eq("id", conversaId)
    .maybeSingle();
  const conv = conversa as unknown as ConversaRow | null;
  if (!conv || conv.tenant_id !== tenantId) {
    return NextResponse.json({ error: "Conversa nao encontrada" }, { status: 404 });
  }

  const { data: identity } = await admin
    .from("lead_identities")
    .select("lead_id")
    .eq("tenant_id", tenantId)
    .eq("canal", "webchat")
    .eq("external_id", visitorId)
    .maybeSingle();
  const identityRow = identity as unknown as IdentityRow | null;
  if (!identityRow || identityRow.lead_id !== conv.lead_id) {
    return NextResponse.json({ error: "Acesso negado a esta conversa" }, { status: 403 });
  }

  const { data: mensagens } = await admin
    .from("mensagens")
    .select("id, remetente, conteudo, created_at")
    .eq("conversa_id", conversaId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ mensagens: mensagens ?? [] });
}
