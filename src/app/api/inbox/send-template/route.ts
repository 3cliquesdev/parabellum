import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";
import { findOrCreateConversation } from "@/lib/inbox/service";
import { loadConversationForOutbound, sendWhatsAppTemplateConversationMessage } from "@/lib/inbox/outbound";

interface SendTemplateBody {
  tenantId?: string;
  conversaId?: string;
  leadId?: string;
  negocioId?: string;
  templateName?: string;
  languageCode?: string;
  variables?: Record<string, string>;
  bodyText?: string;
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

function renderPreview(bodyText: string, variables: Record<string, string>): string {
  return bodyText.replace(/\{\{(\d+)\}\}/g, (_match, key: string) => variables[key] ?? `{{${key}}}`);
}

export async function POST(request: NextRequest) {
  const authClient = await createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as SendTemplateBody;
  const { tenantId, conversaId, leadId, negocioId, templateName, languageCode, variables } = body;

  if (!tenantId || !templateName || !languageCode) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!conversaId && !leadId) {
    return NextResponse.json({ error: "conversaId ou leadId obrigatorio" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: template } = await admin
    .from("meta_templates")
    .select("body_text")
    .eq("tenant_id", tenantId)
    .eq("template_name", templateName)
    .eq("language_code", languageCode)
    .eq("status", "approved")
    .maybeSingle();

  const templateBody = (template as { body_text?: string } | null)?.body_text;
  if (!templateBody) {
    return NextResponse.json({ error: "Template nao encontrado ou nao aprovado" }, { status: 404 });
  }
  const previewText = renderPreview(templateBody, variables ?? {});

  let isNewConversationFlow = false;
  let conversationId = conversaId ?? "";
  let leadIdForAtividade: string | null = null;

  if (!conversationId) {
    isNewConversationFlow = true;

    const { data: negocio } = negocioId
      ? await admin.from("negocios").select("id, assigned_to, lead_id").eq("id", negocioId).eq("tenant_id", tenantId).maybeSingle()
      : { data: null };
    const negocioRow = negocio as { assigned_to: string | null; lead_id: string } | null;
    const resolvedLeadId = leadId ?? negocioRow?.lead_id;
    if (!resolvedLeadId) return NextResponse.json({ error: "leadId obrigatorio" }, { status: 400 });
    leadIdForAtividade = resolvedLeadId;

    const assignedTo = negocioRow?.assigned_to ?? null;

    let whatsappConfigId: string | null = null;
    if (assignedTo) {
      const { data: dedicado } = await admin
        .from("whatsapp_configs")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("dedicado_para_user_id", assignedTo)
        .eq("active", true)
        .maybeSingle();
      whatsappConfigId = (dedicado as { id?: string } | null)?.id ?? null;
    }
    if (!whatsappConfigId) {
      const { data: universal } = await admin
        .from("whatsapp_configs")
        .select("id")
        .eq("tenant_id", tenantId)
        .is("dedicado_para_user_id", null)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      whatsappConfigId = (universal as { id?: string } | null)?.id ?? null;
    }

    const conversation = await findOrCreateConversation(admin, tenantId, resolvedLeadId, "whatsapp", {
      assignedTo,
      whatsappConfigId,
    });
    conversationId = conversation.id;
  }

  const fullConversation = await loadConversationForOutbound(admin, conversationId);
  if (!fullConversation || fullConversation.tenant_id !== tenantId) {
    return NextResponse.json({ error: "Conversa nao encontrada" }, { status: 404 });
  }

  const result = await sendWhatsAppTemplateConversationMessage(
    admin,
    fullConversation,
    templateName,
    languageCode,
    variables ?? {},
    previewText,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, metaErrorCode: "metaErrorCode" in result ? result.metaErrorCode : undefined }, { status: 400 });
  }

  if (isNewConversationFlow && leadIdForAtividade) {
    await admin.from("atividades").insert({
      tenant_id: tenantId,
      lead_id: leadIdForAtividade,
      tipo: "whatsapp",
      titulo: "Conversa iniciada via WhatsApp",
      descricao: `Template "${templateName}" enviado: ${previewText}`,
      concluida: true,
      concluida_em: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, conversaId: conversationId });
}
