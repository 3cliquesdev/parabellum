import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAdmin } from "@/lib/auth/internal-or-tenant";

interface MetaTemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: unknown[];
}

interface MetaTemplateItem {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: MetaTemplateComponent[];
}

interface MetaTemplatesResponse {
  data?: MetaTemplateItem[];
  paging?: { next?: string };
  error?: { message?: string };
}

const STATUS_MAP: Record<string, string> = {
  APPROVED: "approved",
  REJECTED: "rejected",
  PENDING: "pending",
  PAUSED: "disabled",
  DISABLED: "disabled",
  IN_APPEAL: "pending",
};

function countVariables(text: string | undefined): number {
  return text ? (text.match(/\{\{\d+\}\}/g) ?? []).length : 0;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { tenant_id?: string };
  const { tenant_id } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAdmin(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: config } = await auth.admin
    .from("whatsapp_configs")
    .select("waba_id, access_token")
    .eq("tenant_id", tenant_id)
    .eq("active", true)
    .not("waba_id", "is", null)
    .limit(1)
    .maybeSingle();

  const wabaConfig = config as { waba_id: string | null; access_token: string | null } | null;
  if (!wabaConfig?.waba_id || !wabaConfig.access_token) {
    return NextResponse.json({ error: "Nenhum numero de WhatsApp conectado com WABA configurado pra esse tenant" }, { status: 400 });
  }

  let url: string | null =
    `https://graph.facebook.com/v20.0/${wabaConfig.waba_id}/message_templates?fields=id,name,language,category,status,components&limit=100&access_token=${wabaConfig.access_token}`;

  const templates: MetaTemplateItem[] = [];
  let paginas = 0;
  while (url && paginas < 20) {
    const response = await fetch(url);
    const payload = (await response.json()) as MetaTemplatesResponse;
    if (!response.ok) {
      return NextResponse.json({ error: payload.error?.message ?? "Falha ao consultar templates na Meta" }, { status: 502 });
    }
    templates.push(...(payload.data ?? []));
    url = payload.paging?.next ?? null;
    paginas += 1;
  }

  let sincronizados = 0;
  for (const template of templates) {
    const header = template.components.find((c) => c.type === "HEADER");
    const bodyComponent = template.components.find((c) => c.type === "BODY");
    const footer = template.components.find((c) => c.type === "FOOTER");
    const buttonsComponent = template.components.find((c) => c.type === "BUTTONS");
    const bodyText = bodyComponent?.text ?? "";

    const { error } = await auth.admin.from("meta_templates").upsert(
      {
        tenant_id,
        template_name: template.name,
        language_code: template.language,
        category: template.category,
        meta_template_id: template.id,
        status: STATUS_MAP[template.status] ?? "pending",
        header_type: header?.format ?? "NONE",
        header_text: header?.format === "TEXT" ? (header?.text ?? null) : null,
        body_text: bodyText,
        footer_text: footer?.text ?? null,
        buttons: buttonsComponent?.buttons ?? [],
        variables_count: countVariables(bodyText),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,template_name,language_code" },
    );
    if (!error) sincronizados += 1;
  }

  return NextResponse.json({ sincronizados, total_na_meta: templates.length });
}
