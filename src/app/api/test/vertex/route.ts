import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

export async function GET() {
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
        contents: [{ role: "user", parts: [{ text: "Responda apenas: Vertex AI funcionando no Liberty CRM!" }] }],
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
