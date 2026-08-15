import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";
import { sanitizeMetaAccessToken } from "@/lib/meta-channel";

interface InstagramConfigBody {
  tenant_id?: string;
  page_id?: string;
  instagram_business_account_id?: string;
  access_token?: string;
}

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

async function ensureAdminMembership(tenantId: string) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const member = membership as { role?: string | null } | null;
  if (!member || !["owner", "gerente"].includes(member.role ?? "")) {
    return { error: NextResponse.json({ error: "Sem permissao" }, { status: 403 }) };
  }

  return { admin };
}

async function fetchInstagramUsername(instagramBusinessAccountId: string, accessToken: string) {
  try {
    const sanitizedToken = sanitizeMetaAccessToken(accessToken);
    const response = await fetch(`https://graph.facebook.com/v20.0/${instagramBusinessAccountId}?fields=username&access_token=${sanitizedToken}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      const raw = await response.text();
      if (raw.includes('"code":190') || raw.includes("Invalid OAuth access token")) {
        throw new Error("Access token do Instagram invalido ou mal formatado.");
      }
      throw new Error("Nao foi possivel validar a conta do Instagram com esse token.");
    }

    const data = (await response.json()) as { username?: string };
    return data.username?.trim() ?? null;
  } catch {
    throw new Error("Access token do Instagram invalido ou mal formatado.");
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as InstagramConfigBody;
  if (!body.tenant_id || !body.page_id || !body.instagram_business_account_id || !body.access_token) {
    return NextResponse.json({ error: "tenant_id, page_id, instagram_business_account_id e access_token sao obrigatorios" }, { status: 400 });
  }

  const tenantId = body.tenant_id.trim();
  const pageId = body.page_id.trim();
  const instagramBusinessAccountId = body.instagram_business_account_id.trim();
  const accessToken = sanitizeMetaAccessToken(body.access_token);

  const authz = await ensureAdminMembership(tenantId);
  if (authz.error) return authz.error;

  const admin = authz.admin!;
  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN ?? "liberty-instagram";
  let username: string | null = null;

  try {
    username = await fetchInstagramUsername(instagramBusinessAccountId, accessToken);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Access token do Instagram invalido ou mal formatado.",
    }, { status: 400 });
  }

  const { data, error } = await admin
    .from("instagram_configs")
    .upsert({
      tenant_id: tenantId,
      page_id: pageId,
      instagram_business_account_id: instagramBusinessAccountId,
      access_token: accessToken,
      verify_token: verifyToken,
      username,
      active: true,
    }, { onConflict: "tenant_id" })
    .select("tenant_id, page_id, instagram_business_account_id, username, active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, config: data });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { tenant_id?: string };
  if (!body.tenant_id) {
    return NextResponse.json({ error: "tenant_id obrigatorio" }, { status: 400 });
  }

  const authz = await ensureAdminMembership(body.tenant_id);
  if (authz.error) return authz.error;

  const { error } = await authz.admin!
    .from("instagram_configs")
    .update({ active: false })
    .eq("tenant_id", body.tenant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
