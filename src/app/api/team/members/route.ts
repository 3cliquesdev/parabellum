import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember } from "@/lib/auth/guard";

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

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ members: [] });

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return NextResponse.json({ members: [] });

  const admin = auth.admin;
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
