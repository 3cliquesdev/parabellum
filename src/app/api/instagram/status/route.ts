import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) {
    return NextResponse.json({ connected: false });
  }

  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ connected: false });
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ connected: false });
  }

  const { data } = await admin
    .from("instagram_configs")
    .select("page_id, instagram_business_account_id, username, verify_token, active")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .maybeSingle();

  const config = data as {
    page_id?: string | null;
    instagram_business_account_id?: string | null;
    username?: string | null;
    verify_token?: string | null;
    active?: boolean | null;
  } | null;

  if (!config?.active) {
    return NextResponse.json({
      connected: false,
      webhook_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/webhooks/instagram`,
      verify_token: process.env.INSTAGRAM_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN ?? "liberty-instagram",
    });
  }

  return NextResponse.json({
    connected: true,
    username: config.username ?? null,
    page_id: config.page_id ?? null,
    instagram_business_account_id: config.instagram_business_account_id ?? null,
    webhook_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/webhooks/instagram`,
    verify_token: config.verify_token ?? process.env.INSTAGRAM_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN ?? "liberty-instagram",
  });
}
