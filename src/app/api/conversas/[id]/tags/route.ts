import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember } from "@/lib/auth/guard";

interface TagBody {
  tenant_id?: string;
  tag_nome?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversaId } = await params;
  const body = (await request.json().catch(() => ({}))) as TagBody;
  const { tenant_id, tag_nome } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!tag_nome) return NextResponse.json({ error: "tag_nome required" }, { status: 400 });

  const auth = await assertTenantMember(tenant_id);
  if (!auth.ok) return auth.response;

  const { data: conversa } = await auth.admin
    .from("conversas")
    .select("id")
    .eq("id", conversaId)
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  if (!conversa) return NextResponse.json({ error: "conversa nao encontrada" }, { status: 404 });

  const { data: tag } = await auth.admin
    .from("tags")
    .select("id")
    .eq("tenant_id", tenant_id)
    .eq("nome", tag_nome)
    .maybeSingle();
  const tagRow = tag as { id: string } | null;
  if (!tagRow) return NextResponse.json({ error: `tag_nome '${tag_nome}' nao existe para este tenant` }, { status: 400 });

  const { error } = await auth.admin
    .from("conversation_tags")
    .upsert({ conversa_id: conversaId, tag_id: tagRow.id }, { onConflict: "conversa_id,tag_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversaId } = await params;
  const body = (await request.json().catch(() => ({}))) as { tenant_id?: string; tag_id?: string };
  const { tenant_id, tag_id } = body;
  if (!tenant_id || !tag_id) return NextResponse.json({ error: "tenant_id e tag_id sao obrigatorios" }, { status: 400 });

  const auth = await assertTenantMember(tenant_id);
  if (!auth.ok) return auth.response;

  const { error } = await auth.admin
    .from("conversation_tags")
    .delete()
    .eq("conversa_id", conversaId)
    .eq("tag_id", tag_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
