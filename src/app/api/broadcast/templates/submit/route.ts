import { NextRequest, NextResponse } from "next/server";
import { assertTenantAdmin } from "@/lib/auth/guard";

type TemplateCategory = "UTILITY" | "MARKETING";

interface SubmitTemplateBody {
  tenant_id?: string;
  template_name?: string;
  category?: TemplateCategory;
  language_code?: string;
  body_text?: string;
  body_examples?: string[];
  footer_text?: string;
  quick_reply_text?: string;
}

interface MetaTemplateResponse {
  id?: string;
  status?: string;
  category?: string;
  error?: {
    message?: string;
    error_user_title?: string;
    error_user_msg?: string;
  };
}

const STATUS_MAP: Record<string, string> = {
  APPROVED: "approved",
  REJECTED: "rejected",
  PENDING: "pending",
};

function countVariables(text: string): number {
  return new Set(text.match(/\{\{\d+\}\}/g) ?? []).size;
}

function metaErrorMessage(payload: MetaTemplateResponse): string {
  return payload.error?.error_user_msg
    ?? payload.error?.error_user_title
    ?? payload.error?.message
    ?? "A Meta recusou o envio do template";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as SubmitTemplateBody;
  const tenantId = body.tenant_id?.trim();
  const templateName = body.template_name?.trim().toLowerCase();
  const bodyText = body.body_text?.trim();
  const category = body.category ?? "UTILITY";
  const languageCode = body.language_code ?? "pt_BR";
  const footerText = body.footer_text?.trim() || null;
  const quickReplyText = body.quick_reply_text?.trim() || null;

  if (!tenantId || !templateName || !bodyText) {
    return NextResponse.json({ error: "tenant_id, template_name e body_text são obrigatórios" }, { status: 400 });
  }
  if (!/^[a-z0-9_]+$/.test(templateName)) {
    return NextResponse.json({ error: "O nome deve usar apenas letras minúsculas, números e sublinhado" }, { status: 400 });
  }
  if (!(["UTILITY", "MARKETING"] as string[]).includes(category)) {
    return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
  }

  const auth = await assertTenantAdmin(tenantId);
  if (!auth.ok) return auth.response;

  const { data: config } = await auth.admin
    .from("whatsapp_configs")
    .select("waba_id, access_token")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .not("waba_id", "is", null)
    .limit(1)
    .maybeSingle();

  const whatsappConfig = config as { waba_id: string | null; access_token: string | null } | null;
  if (!whatsappConfig?.waba_id || !whatsappConfig.access_token) {
    return NextResponse.json({ error: "Nenhuma conta WhatsApp Business ativa está conectada" }, { status: 400 });
  }

  const variablesCount = countVariables(bodyText);
  const bodyComponent: Record<string, unknown> = { type: "BODY", text: bodyText };
  if (variablesCount > 0) {
    const examples = Array.from({ length: variablesCount }, (_, index) =>
      body.body_examples?.[index]?.trim() || `Exemplo ${index + 1}`,
    );
    bodyComponent.example = { body_text: [examples] };
  }

  const components: Array<Record<string, unknown>> = [bodyComponent];
  if (footerText) components.push({ type: "FOOTER", text: footerText });
  if (quickReplyText) {
    components.push({
      type: "BUTTONS",
      buttons: [{ type: "QUICK_REPLY", text: quickReplyText }],
    });
  }

  const metaResponse = await fetch(
    `https://graph.facebook.com/v20.0/${whatsappConfig.waba_id}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsappConfig.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: templateName,
        language: languageCode,
        category,
        components,
      }),
    },
  );
  const metaPayload = (await metaResponse.json()) as MetaTemplateResponse;
  if (!metaResponse.ok || !metaPayload.id) {
    return NextResponse.json({ error: metaErrorMessage(metaPayload) }, { status: 502 });
  }

  const normalizedCategory = metaPayload.category ?? category;
  const normalizedStatus = STATUS_MAP[metaPayload.status ?? "PENDING"] ?? "pending";
  const buttons = quickReplyText ? [{ type: "QUICK_REPLY", text: quickReplyText }] : [];

  const { data: template, error: dbError } = await auth.admin
    .from("meta_templates")
    .upsert(
      {
        tenant_id: tenantId,
        template_name: templateName,
        language_code: languageCode,
        category: normalizedCategory,
        meta_template_id: metaPayload.id,
        status: normalizedStatus,
        header_type: "NONE",
        body_text: bodyText,
        footer_text: footerText,
        buttons,
        variables_count: variablesCount,
        variables_schema: body.body_examples ?? [],
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,template_name,language_code" },
    )
    .select()
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: "Template enviado à Meta, mas não foi registrado no CRM. Sincronize os templates da Meta.", meta_template_id: metaPayload.id },
      { status: 502 },
    );
  }

  return NextResponse.json({ template, meta: metaPayload }, { status: 201 });
}
