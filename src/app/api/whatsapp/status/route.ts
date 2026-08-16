import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ connected: false });

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return NextResponse.json({ connected: false });
  const admin = auth.admin;

  // Com varios numeros por tenant, este painel (OAuth "Continuar com
  // Facebook") continua mostrando/gerenciando so o primeiro conectado - os
  // demais aparecem na lista "Numeros conectados" logo abaixo.
  const { data } = await admin
    .from("whatsapp_configs")
    .select("phone_number_id, access_token, active")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

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
