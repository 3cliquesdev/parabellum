import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

const META_APP_ID = "2016623082257479";

interface EmbeddedSignupBody {
  code?: string;
  tenant_id?: string;
}

interface EmbeddedSignupSelectionBody {
  tenant_id?: string;
  phone_number_id?: string;
  access_token?: string;
  waba_id?: string;
}

interface MetaPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
}

interface MetaWaba {
  id: string;
}

interface MetaBusiness {
  whatsapp_business_accounts?: {
    data?: MetaWaba[];
  };
}

function createAuthClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createAuthClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as EmbeddedSignupBody;
  if (!body.code || !body.tenant_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&code=${body.code}`,
    { method: "GET" }
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Token exchange error:", err);
    return NextResponse.json({ error: "Falha ao obter token da Meta" }, { status: 500 });
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.json({ error: "Token não retornado pela Meta" }, { status: 500 });
  }

  const wabaRes = await fetch(
    `https://graph.facebook.com/v20.0/me/businesses?access_token=${accessToken}&fields=id,name,whatsapp_business_accounts`
  );
  const wabaData = (await wabaRes.json()) as { data?: MetaBusiness[] };

  let phoneNumbers: MetaPhoneNumber[] = [];
  let wabaId = "";

  for (const business of (wabaData.data ?? [])) {
    for (const waba of (business.whatsapp_business_accounts?.data ?? [])) {
      wabaId = waba.id;
      const phoneRes = await fetch(
        `https://graph.facebook.com/v20.0/${waba.id}/phone_numbers?access_token=${accessToken}&fields=id,display_phone_number,verified_name`
      );
      const phoneData = (await phoneRes.json()) as { data?: MetaPhoneNumber[] };
      phoneNumbers = [...phoneNumbers, ...(phoneData.data ?? [])];
    }
  }

  if (phoneNumbers.length === 0) {
    return NextResponse.json({ error: "Nenhum número encontrado nesta conta Meta", code: "no_phones" }, { status: 400 });
  }

  if (phoneNumbers.length === 1) {
    const phone = phoneNumbers[0];
    const admin = createAdminClient();

    await admin.from("whatsapp_configs").upsert({
      tenant_id: body.tenant_id,
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

  return NextResponse.json({
    status: "select_phone",
    phones: phoneNumbers,
    access_token: accessToken,
    waba_id: wabaId,
  });
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createAuthClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as EmbeddedSignupSelectionBody;
  const admin = createAdminClient();

  await admin.from("whatsapp_configs").upsert({
    tenant_id: body.tenant_id,
    phone_number_id: body.phone_number_id,
    waba_id: body.waba_id,
    access_token: body.access_token,
    verify_token: "liberty-crm",
    active: true,
  }, { onConflict: "tenant_id" });

  return NextResponse.json({ status: "connected" });
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createAuthClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { tenant_id?: string };
  if (!body.tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  const admin = createAdminClient();

  await admin.from("whatsapp_configs").update({ active: false }).eq("tenant_id", body.tenant_id);
  return NextResponse.json({ status: "disconnected" });
}
