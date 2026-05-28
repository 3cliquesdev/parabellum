import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const META_APP_ID = "1524032985369366";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // Verificar sessão
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, tenant_id } = await request.json();
  if (!code || !tenant_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Trocar code por access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `client_id=${META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&code=${code}`,
    { method: "GET" }
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Token exchange error:", err);
    return NextResponse.json({ error: "Falha ao obter token da Meta" }, { status: 500 });
  }

  const tokenData = await tokenRes.json();
  const accessToken: string = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.json({ error: "Token não retornado pela Meta" }, { status: 500 });
  }

  // Buscar os WhatsApp Business Accounts do usuário
  const wabaRes = await fetch(
    `https://graph.facebook.com/v20.0/me/businesses?access_token=${accessToken}&fields=id,name,whatsapp_business_accounts`
  );
  const wabaData = await wabaRes.json();

  // Buscar phone numbers do primeiro WABA
  let phoneNumbers: { id: string; display_phone_number: string; verified_name: string }[] = [];
  let wabaId = "";

  const businesses = wabaData.data ?? [];
  for (const business of businesses) {
    const wabas = business.whatsapp_business_accounts?.data ?? [];
    for (const waba of wabas) {
      wabaId = waba.id;
      const phoneRes = await fetch(
        `https://graph.facebook.com/v20.0/${waba.id}/phone_numbers?access_token=${accessToken}&fields=id,display_phone_number,verified_name`
      );
      const phoneData = await phoneRes.json();
      phoneNumbers = [...phoneNumbers, ...(phoneData.data ?? [])];
    }
  }

  if (phoneNumbers.length === 0) {
    return NextResponse.json({ error: "Nenhum número encontrado nesta conta Meta", code: "no_phones" }, { status: 400 });
  }

  // Se apenas 1 número, salva automaticamente
  if (phoneNumbers.length === 1) {
    const phone = phoneNumbers[0];
    const admin = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    await admin.from("whatsapp_configs").upsert({
      tenant_id,
      phone_number_id: phone.id,
      waba_id: wabaId,
      access_token: accessToken,
      verify_token: "liberty-crm",
      active: true,
    }, { onConflict: "tenant_id" });

    return NextResponse.json({
      status: "connected",
      phone_number: phone.display_phone_number,
      verified_name: phone.verified_name,
    });
  }

  // Múltiplos números — retorna lista para seleção
  return NextResponse.json({
    status: "select_phone",
    phones: phoneNumbers,
    access_token: accessToken,
    waba_id: wabaId,
  });
}

// Salvar número específico após seleção
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenant_id, phone_number_id, access_token, waba_id } = await request.json();

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  await admin.from("whatsapp_configs").upsert({
    tenant_id, phone_number_id, waba_id, access_token,
    verify_token: "liberty-crm", active: true,
  }, { onConflict: "tenant_id" });

  return NextResponse.json({ status: "connected" });
}

// Desconectar WhatsApp
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenant_id } = await request.json();

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  await admin.from("whatsapp_configs").update({ active: false }).eq("tenant_id", tenant_id);
  return NextResponse.json({ status: "disconnected" });
}
