import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";
import {
  buildInstagramLeadName,
  fetchInstagramSenderProfile,
  isGenericInstagramLeadName,
  normalizeInstagramUsername,
} from "@/lib/instagram-profiles";

type LeadIdentityCandidate = {
  id: string;
  lead_id: string;
  valor: string | null;
  valor_normalizado: string | null;
  external_id: string | null;
  updated_at: string;
  leads:
    | {
        id: string;
        nome: string | null;
        instagram: string | null;
      }
    | {
        id: string;
        nome: string | null;
        instagram: string | null;
      }[]
    | null;
};

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
  const {
    data: { user },
  } = await auth.auth.getUser();

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

function singleLead(
  leads: LeadIdentityCandidate["leads"],
): { id: string; nome: string | null; instagram: string | null } | null {
  return Array.isArray(leads) ? leads[0] ?? null : leads;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { tenant_id?: string };
  if (!body.tenant_id) {
    return NextResponse.json({ error: "tenant_id obrigatorio" }, { status: 400 });
  }

  const tenantId = body.tenant_id.trim();
  const authz = await ensureAdminMembership(tenantId);
  if (authz.error) return authz.error;

  const admin = authz.admin!;
  const { data: config } = await admin
    .from("instagram_configs")
    .select("access_token, active")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .maybeSingle();

  const instagramConfig = config as { access_token?: string | null; active?: boolean | null } | null;
  if (!instagramConfig?.active || !instagramConfig.access_token) {
    return NextResponse.json({ error: "Instagram nao configurado para este tenant" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("lead_identities")
    .select("id, lead_id, valor, valor_normalizado, external_id, updated_at, leads(id, nome, instagram)")
    .eq("tenant_id", tenantId)
    .eq("canal", "instagram")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as LeadIdentityCandidate[];
  const latestByLead = new Map<string, LeadIdentityCandidate>();

  for (const row of rows) {
    if (!latestByLead.has(row.lead_id)) {
      latestByLead.set(row.lead_id, row);
    }
  }

  let scanned = 0;
  let updated = 0;
  let renamed = 0;
  let usernamesSynced = 0;
  let skippedWithoutExternalId = 0;
  let unresolved = 0;

  for (const row of latestByLead.values()) {
    scanned += 1;
    const lead = singleLead(row.leads);
    if (!lead) continue;

    const needsName = isGenericInstagramLeadName(lead.nome);
    const needsUsername = !normalizeInstagramUsername(lead.instagram) && !normalizeInstagramUsername(row.valor);

    if (!needsName && !needsUsername) {
      continue;
    }

    if (!row.external_id) {
      skippedWithoutExternalId += 1;
      continue;
    }

    const profile = await fetchInstagramSenderProfile(instagramConfig.access_token, row.external_id);
    const username = normalizeInstagramUsername(profile?.username);
    const name = buildInstagramLeadName(row.external_id, profile);
    const hasRealData = Boolean(profile?.name?.trim() || username);

    if (!hasRealData) {
      unresolved += 1;
      continue;
    }

    const leadPatch: Record<string, string> = {};
    if (needsName && isGenericInstagramLeadName(name) === false) {
      leadPatch.nome = name;
    }
    if (username && normalizeInstagramUsername(lead.instagram) !== username) {
      leadPatch.instagram = username;
    }

    if (Object.keys(leadPatch).length > 0) {
      const { error: updateLeadError } = await admin.from("leads").update(leadPatch).eq("id", lead.id);
      if (!updateLeadError) {
        updated += 1;
        if (leadPatch.nome) renamed += 1;
        if (leadPatch.instagram) usernamesSynced += 1;
      }
    }

    if (username && normalizeInstagramUsername(row.valor) !== username) {
      await admin
        .from("lead_identities")
        .update({
          valor: username,
          valor_normalizado: username.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({
    success: true,
    scanned,
    updated,
    renamed,
    usernames_synced: usernamesSynced,
    skipped_without_external_id: skippedWithoutExternalId,
    unresolved,
  });
}
