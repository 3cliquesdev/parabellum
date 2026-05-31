import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("impersonation_session");

  if (sessionCookie) {
    try {
      const { session_id } = JSON.parse(sessionCookie.value);
      if (session_id) {
        const admin = createServerClient<any>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { cookies: { getAll: () => [], setAll: () => {} } }
        );
        await admin
          .from("impersonation_sessions")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", session_id);
      }
    } catch { /* cookie inválido, continua */ }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("impersonation_session");
  return response;
}
