import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/whatsapp/send-admin
 *
 * Rota exclusiva para alertas operacionais internos (monitor de fluxos, etc.).
 * Busca membros da equipe com 'receber_alertas_operacionais' ativo
 * e envia para o whatsapp configurado no perfil deles.
 *
 * Corpo esperado:
 *   { tenant_id: string, conteudo: string, tipo?: string }
 *
 * Autenticação: apenas chamadas internas (x-internal-key).
 */

interface SendAdminBody {
  tenant_id?: string;
  conteudo?: string;
  tipo?: string;
}

interface WhatsAppConfigRow {
  phone_number_id: string;
  access_token: string;
}

interface MetaSendMessageResponse {
  messages?: Array<{ id?: string }>;
}

export async function POST(request: NextRequest) {
  // Bloqueia qualquer chamada que não seja interna
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as SendAdminBody;
  const { tenant_id, conteudo } = body;

  if (!tenant_id || !conteudo) {
    return NextResponse.json(
      { error: "tenant_id e conteudo são obrigatórios" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Busca quem deve receber alerta
  const { data: membersAlert } = await supabase
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", tenant_id)
    .eq("receber_alertas_operacionais", true);

  const userIds = membersAlert?.map((m) => m.user_id) || [];
  let numbersToSend: string[] = [];

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("whatsapp")
      .in("user_id", userIds);
    
    numbersToSend = (profiles || [])
      .map((p) => (p as any).whatsapp?.replace(/\\D/g, ""))
      .filter(Boolean);
  }

  // Fallback pra env caso ngm na equipe tenha configurado
  const fallbackNumber = process.env.ADMIN_WHATSAPP_NUMBER?.replace(/\\D/g, "");
  if (fallbackNumber && numbersToSend.length === 0) {
    numbersToSend.push(fallbackNumber);
  }

  if (numbersToSend.length === 0) {
    return NextResponse.json(
      { error: "Nenhum número de admin configurado (via equipe ou ADMIN_WHATSAPP_NUMBER)" },
      { status: 400 }
    );
  }

  // Busca o primeiro número WhatsApp ativo do tenant
  const { data: configData } = await supabase
    .from("whatsapp_configs")
    .select("phone_number_id, access_token")
    .eq("tenant_id", tenant_id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const config = configData as WhatsAppConfigRow | null;
  if (!config) {
    return NextResponse.json(
      { error: "Nenhum número WhatsApp ativo encontrado para o tenant" },
      { status: 400 }
    );
  }

  const results = [];
  let someSuccess = false;

  for (const adminNumber of numbersToSend) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.access_token}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: adminNumber,
            type: "text",
            text: { body: conteudo },
          }),
        }
      );

      if (response.ok) {
        someSuccess = true;
        const responseData = (await response.json()) as MetaSendMessageResponse;
        results.push({ number: adminNumber, status: "sent", message_id: responseData.messages?.[0]?.id });
      } else {
        const errText = await response.text().catch(() => "");
        results.push({ number: adminNumber, status: "failed", error: errText });
      }
    } catch (err: any) {
      results.push({ number: adminNumber, status: "failed", error: err.message });
    }
  }

  if (!someSuccess) {
    return NextResponse.json({ error: "Falha ao enviar para todos os admins", details: results }, { status: 500 });
  }

  return NextResponse.json({ status: "sent_to_some_or_all", results });
}
