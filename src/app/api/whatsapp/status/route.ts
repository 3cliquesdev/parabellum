import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false });

  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ connected: false });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data } = await admin
    .from("whatsapp_configs")
    .select("phone_number_id, access_token, active")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .single();

  if (!data) return NextResponse.json({ connected: false });

  // Buscar info do número via Meta API
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${data.phone_number_id}?fields=display_phone_number,verified_name&access_token=${data.access_token ?? ""}`,
    );
    if (res.ok) {
      const info = await res.json();
      return NextResponse.json({
        connected: true,
        phone_number: info.display_phone_number,
        verified_name: info.verified_name,
      });
    }
  } catch { /* ignore */ }

  return NextResponse.json({ connected: true, phone_number: "", verified_name: "" });
}
