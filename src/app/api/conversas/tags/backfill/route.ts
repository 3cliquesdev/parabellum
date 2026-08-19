import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { isInternalRequest } from "@/lib/security/internal-auth";

export const maxDuration = 60;

const TAG_INICIAL_CONVERSA = "0.00 Em atendimento";
const PAGE_SIZE = 500;

// Backfill idempotente para o acervo ja existente. A tag de entrada convive
// com a tag de motivo de encerramento e nunca remove classificacoes manuais.
export async function POST(request: NextRequest) {
  if (!isInternalRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenant_id: tenantId } = await request.json().catch(() => ({})) as { tenant_id?: string };
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const admin = createAdminClient();
  let { data: tag, error: tagError } = await admin
    .from("tags")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("nome", TAG_INICIAL_CONVERSA)
    .maybeSingle();

  if (tagError) return NextResponse.json({ error: tagError.message }, { status: 500 });
  if (!tag) {
    const created = await admin
      .from("tags")
      .insert({ tenant_id: tenantId, nome: TAG_INICIAL_CONVERSA, cor: "#3b82f6" })
      .select("id")
      .single();
    if (created.error || !created.data) return NextResponse.json({ error: created.error?.message ?? "tag nao criada" }, { status: 500 });
    tag = created.data;
  }

  const tagId = (tag as { id: string }).id;
  let offset = 0;
  let vinculadas = 0;
  while (true) {
    const { data: conversas, error } = await admin
      .from("conversas")
      .select("id")
      .eq("tenant_id", tenantId)
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!conversas || conversas.length === 0) break;

    const { error: linkError } = await admin
      .from("conversation_tags")
      .upsert(conversas.map((conversa) => ({ conversa_id: conversa.id, tag_id: tagId })), { onConflict: "conversa_id,tag_id" });
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

    vinculadas += conversas.length;
    if (conversas.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return NextResponse.json({ success: true, tag: TAG_INICIAL_CONVERSA, conversas_processadas: vinculadas });
}
