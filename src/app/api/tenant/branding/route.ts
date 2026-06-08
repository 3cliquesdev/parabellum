import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailTheme, LooseDatabase } from "@/types/database";

interface BrandingBody {
  tenant_id?: string;
  nome_fantasia?: string;
  cor_primaria?: string;
  logo_url?: string;
  email_theme?: EmailTheme;
}

interface TenantBrandingRow {
  nome_fantasia: string | null;
  cor_primaria: string | null;
  logo_url: string | null;
  email_theme: EmailTheme;
  white_label: boolean | null;
}

interface TenantMemberRow {
  role: string;
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase client environment variables are missing");
  }

  return { url, anonKey, serviceRoleKey };
}

async function createAuthClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient<LooseDatabase>(url, anonKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
}

function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing on the server");
  }

  return createServerClient<LooseDatabase>(url, serviceRoleKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

async function getCurrentUser() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getTenantMembership(tenantId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .limit(1);

  const members = (data ?? []) as unknown as TenantMemberRow[];
  return members[0] ?? null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getTenantMembership(tenantId, user.id);
    if (!membership) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const { data, error } = await createAdminClient()
      .from("tenants")
      .select("nome_fantasia, cor_primaria, logo_url, email_theme, white_label")
      .eq("id", tenantId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ branding: data as unknown as TenantBrandingRow | null });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as BrandingBody;
    if (!body.tenant_id) {
      return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
    }

    const membership = await getTenantMembership(body.tenant_id, user.id);
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const { error } = await createAdminClient()
      .from("tenants")
      .update({
        nome_fantasia: body.nome_fantasia || null,
        cor_primaria: body.cor_primaria || "#9aea62",
        logo_url: body.logo_url || null,
        email_theme: body.email_theme === "light" ? "light" : "dark",
      })
      .eq("id", body.tenant_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
