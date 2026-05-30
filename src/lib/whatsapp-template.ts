import { createServerClient } from "@supabase/ssr";

function adminClient() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

interface SendTemplateParams {
  tenant_id: string;
  phone_number: string;
  template_name: string;
  language_code: string;
  variables: Record<string, string>; // { "1": "João", "2": "Oferta X" }
}

export async function sendWhatsAppTemplate(params: SendTemplateParams): Promise<{ message_id: string }> {
  const supabase = adminClient();

  // Buscar configuração WhatsApp do tenant
  const { data: waConfig } = await supabase
    .from("whatsapp_configs")
    .select("phone_number_id, access_token")
    .eq("tenant_id", params.tenant_id)
    .eq("active", true)
    .single() as { data: any };

  if (!waConfig) throw new Error("WhatsApp não configurado para este tenant");

  // Montar componentes de variáveis
  const bodyParams = Object.entries(params.variables)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([, value]) => ({ type: "text", text: value }));

  const body: any = {
    messaging_product: "whatsapp",
    to: params.phone_number.replace(/\D/g, ""),
    type: "template",
    template: {
      name: params.template_name,
      language: { code: params.language_code },
      components: bodyParams.length > 0 ? [{ type: "body", parameters: bodyParams }] : undefined,
    },
  };

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${waConfig.access_token}` },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    const error = err.error;
    const e: any = new Error(error?.message ?? "Meta API error");
    e.code = error?.code;
    e.response = { data: err, status: res.status };
    throw e;
  }

  const data = await res.json();
  return { message_id: data.messages?.[0]?.id ?? "" };
}

// Incrementar uso diário de quota
export async function incrementQuotaUsage(tenant_id: string) {
  const supabase = adminClient();
  const { data: waConfig } = await supabase
    .from("whatsapp_configs")
    .select("phone_number_id")
    .eq("tenant_id", tenant_id)
    .eq("active", true)
    .single() as { data: any };

  if (!waConfig) return;

  await supabase.rpc("increment_quota_usage", {
    p_tenant_id: tenant_id,
    p_phone_number_id: waConfig.phone_number_id,
  });
}
