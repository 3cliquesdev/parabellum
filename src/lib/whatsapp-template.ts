import { createServerClient } from "@supabase/ssr";
import type { LooseDatabase } from "@/types/database";

interface WhatsAppConfigRow {
  phone_number_id: string;
  access_token?: string | null;
}

interface MetaTemplateParameter {
  type: "text";
  text: string;
}

interface MetaTemplateComponent {
  type: "body";
  parameters: MetaTemplateParameter[];
}

interface MetaTemplatePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: MetaTemplateComponent[];
  };
}

interface MetaErrorPayload {
  error?: {
    message?: string;
    code?: number;
  };
}

interface MetaSuccessPayload {
  messages?: Array<{
    id?: string;
  }>;
}

type MetaApiError = Error & {
  code?: number;
  response?: {
    data: MetaErrorPayload;
    status: number;
  };
};

interface SendTemplateParams {
  tenant_id: string;
  phone_number: string;
  template_name: string;
  language_code: string;
  variables: Record<string, string>;
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function sendWhatsAppTemplate(params: SendTemplateParams): Promise<{ message_id: string }> {
  const supabase = createAdminClient();

  const { data: waConfig } = await supabase
    .from("whatsapp_configs")
    .select("phone_number_id, access_token")
    .eq("tenant_id", params.tenant_id)
    .eq("active", true)
    .single();

  const config = waConfig as unknown as WhatsAppConfigRow | null;
  if (!config?.phone_number_id || !config.access_token) {
    throw new Error("WhatsApp nao configurado para este tenant");
  }

  const bodyParams: MetaTemplateParameter[] = Object.entries(params.variables)
    .sort(([left], [right]) => Number.parseInt(left, 10) - Number.parseInt(right, 10))
    .map(([, value]) => ({ type: "text", text: value }));

  const payload: MetaTemplatePayload = {
    messaging_product: "whatsapp",
    to: params.phone_number.replace(/\D/g, ""),
    type: "template",
    template: {
      name: params.template_name,
      language: { code: params.language_code },
      components: bodyParams.length > 0 ? [{ type: "body", parameters: bodyParams }] : undefined,
    },
  };

  const response = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = (await response.json()) as MetaErrorPayload;
    const metaError = new Error(errorPayload.error?.message ?? "Meta API error") as MetaApiError;
    metaError.code = errorPayload.error?.code;
    metaError.response = { data: errorPayload, status: response.status };
    throw metaError;
  }

  const data = (await response.json()) as MetaSuccessPayload;
  return { message_id: data.messages?.[0]?.id ?? "" };
}

export async function incrementQuotaUsage(tenant_id: string) {
  const supabase = createAdminClient();

  const { data: waConfig } = await supabase
    .from("whatsapp_configs")
    .select("phone_number_id")
    .eq("tenant_id", tenant_id)
    .eq("active", true)
    .single();

  const config = waConfig as Pick<WhatsAppConfigRow, "phone_number_id"> | null;
  if (!config?.phone_number_id) return;

  await supabase.rpc("increment_quota_usage", {
    p_tenant_id: tenant_id,
    p_phone_number_id: config.phone_number_id,
  });
}
