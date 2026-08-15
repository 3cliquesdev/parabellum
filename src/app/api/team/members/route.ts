import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember } from "@/lib/auth/guard";

interface TenantMemberRow {
  id: string;
  role: string;
  user_id: string;
  created_at: string;
  availability_status: string;
  max_concurrent_chats: number;
}

interface EnrichedTenantMember extends TenantMemberRow {
  email: string | null;
  name: string | null;
  department_ids: string[];
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ members: [] });

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return NextResponse.json({ members: [] });

  const admin = auth.admin;
  const { data: members } = await admin
    .from("tenant_members")
    .select("id, role, user_id, created_at, availability_status, max_concurrent_chats")
    .eq("tenant_id", tenantId);

  const { data: deptLinks } = await admin
    .from("agent_departments")
    .select("user_id, department_id")
    .eq("tenant_id", tenantId);

  const deptsByUser = new Map<string, string[]>();
  for (const link of (deptLinks ?? []) as unknown as Array<{ user_id: string; department_id: string }>) {
    const list = deptsByUser.get(link.user_id) ?? [];
    list.push(link.department_id);
    deptsByUser.set(link.user_id, list);
  }

  const enriched = await Promise.all(
    ((members ?? []) as unknown as TenantMemberRow[]).map(async (member) => {
      const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
      return {
        ...member,
        email: authUser.user?.email ?? null,
        name: (authUser.user?.user_metadata?.full_name as string | undefined) ?? null,
        department_ids: deptsByUser.get(member.user_id) ?? [],
      } satisfies EnrichedTenantMember;
    })
  );

  return NextResponse.json({ members: enriched });
}
