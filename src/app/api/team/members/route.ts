import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface TenantMemberRow {
  id: string;
  role: string;
  user_id: string;
  created_at: string;
}

interface EnrichedTenantMember extends TenantMemberRow {
  email: string | null;
  name: string | null;
}

async function createAuthClient() {
  const cookieStore = await cookies();

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

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ members: [] });

  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ members: [] });

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("tenant_members")
    .select("id, role, user_id, created_at")
    .eq("tenant_id", tenantId);

  const enriched = await Promise.all(
    ((members ?? []) as unknown as TenantMemberRow[]).map(async (member) => {
      const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
      return {
        ...member,
        email: authUser.user?.email ?? null,
        name: (authUser.user?.user_metadata?.full_name as string | undefined) ?? null,
      } satisfies EnrichedTenantMember;
    })
  );

  return NextResponse.json({ members: enriched });
}
