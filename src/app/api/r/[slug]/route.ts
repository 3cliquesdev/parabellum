import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
  // Incrementar clicks
  const { data: link } = await admin.from("agency_referral_links").select("id, clicks").eq("slug", slug).single() as { data: any };
  if (link) {
    await admin.from("agency_referral_links").update({ clicks: (link.clicks ?? 0) + 1 }).eq("id", link.id);
  }
  return NextResponse.json({ ok: true });
}
