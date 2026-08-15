import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { createAdminClient, getSessionUser } from "@/lib/auth/guard";
import { consumeApiRateLimit } from "@/lib/security/rate-limit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!await consumeApiRateLimit(admin, `vertex:test:${user.id}`, 5, 600)) {
    return NextResponse.json({ error: "Limite de testes excedido." }, { status: 429 });
  }

  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json({ error: "GOOGLE_SERVICE_ACCOUNT_JSON não configurado" }, { status: 500 });
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token!;

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/adsliberty/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Responda apenas: Vertex AI funcionando no 3Cliques CRM!" }] }],
        generationConfig: { maxOutputTokens: 50 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: "Vertex AI error", details: err }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sem resposta";

    return NextResponse.json({ status: "ok", reply });
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Erro interno",
    }, { status: 500 });
  }
}
