import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";
import {
  loadConversationForOutbound,
  sendEmailConversationMessage,
  sendInstagramConversationMessage,
  sendWhatsAppConversationMessage,
} from "@/lib/inbox/outbound";

interface SendMessageBody {
  conversa_id?: string;
  tenant_id?: string;
  conteudo?: string;
  assunto?: string;
  reply_to_mensagem_id?: string;
}

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function POST(request: NextRequest) {
  const authClient = await createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const isFormData = contentType.includes("multipart/form-data");

  let conversaId = "";
  let tenantId = "";
  let conteudo = "";
  let assunto = "";
  let file: File | null = null;
  let replyToMensagemId: string | undefined;

  if (isFormData) {
    const formData = await request.formData();
    conversaId = String(formData.get("conversa_id") ?? "");
    tenantId = String(formData.get("tenant_id") ?? "");
    conteudo = String(formData.get("conteudo") ?? "");
    assunto = String(formData.get("assunto") ?? "");
    file = formData.get("file") as File | null;
    replyToMensagemId = (formData.get("reply_to_mensagem_id") as string | null) ?? undefined;
  } else {
    const body = (await request.json().catch(() => ({}))) as SendMessageBody;
    conversaId = body.conversa_id ?? "";
    tenantId = body.tenant_id ?? "";
    conteudo = body.conteudo ?? "";
    assunto = body.assunto ?? "";
    replyToMensagemId = body.reply_to_mensagem_id;
  }

  if (!conversaId || !tenantId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!file && !conteudo.trim()) {
    return NextResponse.json({ error: "Conteudo vazio" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conversation = await loadConversationForOutbound(admin, conversaId);
  if (!conversation || conversation.tenant_id !== tenantId) {
    return NextResponse.json({ error: "Conversa nao encontrada" }, { status: 404 });
  }

  if (file && conversation.canal !== "whatsapp") {
    return NextResponse.json({ error: "Anexos estao disponiveis apenas para conversas de WhatsApp por enquanto" }, { status: 400 });
  }

  switch (conversation.canal) {
    case "whatsapp": {
      const result = await sendWhatsAppConversationMessage(admin, conversation, conteudo.trim(), file, replyToMensagemId);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ status: "sent", canal: "whatsapp" });
    }
    case "email": {
      const result = await sendEmailConversationMessage(admin, conversation, conteudo.trim(), assunto);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ status: "sent", canal: "email" });
    }
    case "instagram": {
      const result = await sendInstagramConversationMessage(admin, conversation, conteudo.trim());
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ status: "sent", canal: "instagram" });
    }
    default:
      return NextResponse.json({
        error: `O canal ${conversation.canal} ja entra no Inbox, mas a resposta ativa ainda nao foi habilitada nesta etapa.`,
      }, { status: 400 });
  }
}
