import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { consumeApiRateLimit } from "@/lib/security/rate-limit";

function admin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { nome, empresa, email, telefone, equipe, instagram, site, observacoes } = await req.json();

    if (!nome?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "nome e email são obrigatórios" }, { status: 400 });
    }

    const tenant_id = process.env.OPUS_LEAD_TENANT_ID;
    if (!tenant_id) {
      return NextResponse.json({ error: "configuração interna ausente" }, { status: 500 });
    }

    const client = admin();
    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientKey = forwardedFor ?? req.headers.get("x-real-ip") ?? "unknown";
    if (!await consumeApiRateLimit(client, `lead:opus:${clientKey}`, 5, 3600)) {
      return NextResponse.json({ error: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
    }

    // Verifica duplicata por email
    const { data: existing } = await client
      .from("leads")
      .select("id")
      .eq("tenant_id", tenant_id)
      .ilike("email", email.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const obs = [
      empresa ? `Empresa: ${empresa}` : null,
      equipe ? `Tamanho da equipe: ${equipe}` : null,
      site ? `Site: ${site.trim()}` : null,
      observacoes ? `Mensagem: ${observacoes}` : null,
      `Origem: Página Liberty Opus — Agendar Apresentação`,
    ].filter(Boolean).join("\n");

    const { error } = await client.from("leads").insert({
      tenant_id,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: telefone?.trim() || null,
      instagram: instagram?.trim().replace(/^@/, "") || null,
      servico_interesse: "Liberty Opus — CRM Exclusivo",
      observacoes: obs,
      status: "qualificado",
      utm_source: "opus_landing",
      utm_medium: "organic",
    });

    if (error) {
      console.error("Erro ao criar lead Opus:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro inesperado:", err);
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  }
}
