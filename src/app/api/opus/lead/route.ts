import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { nome, empresa, email, telefone, equipe, observacoes } = await req.json();

    if (!nome?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "nome e email são obrigatórios" }, { status: 400 });
    }

    const tenant_id = process.env.OPUS_LEAD_TENANT_ID;
    if (!tenant_id) {
      return NextResponse.json({ error: "configuração interna ausente" }, { status: 500 });
    }

    // Verifica duplicata por email
    const { data: existing } = await admin()
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
      observacoes ? `Mensagem: ${observacoes}` : null,
      `Origem: Página Liberty Opus — Agendar Apresentação`,
    ].filter(Boolean).join("\n");

    const { error } = await admin().from("leads").insert({
      tenant_id,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: telefone?.trim() || null,
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
