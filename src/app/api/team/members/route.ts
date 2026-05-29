import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ members: [] });

  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ members: [] });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: members } = await admin
    .from("tenant_members")
    .select("id, role, user_id, created_at")
    .eq("tenant_id", tenantId);

  // Enriquecer com emails dos usuários
  const enriched = await Promise.all((members ?? []).map(async (m: any) => {
    const { data: authUser } = await admin.auth.admin.getUserById(m.user_id);
    return { ...m, email: authUser?.user?.email ?? null, name: authUser?.user?.user_metadata?.full_name ?? null };
  }));

  return NextResponse.json({ members: enriched });
}
