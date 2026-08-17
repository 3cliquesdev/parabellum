import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { isInternalRequest } from "@/lib/security/internal-auth";

interface ConversaRow {
  id: string;
  tenant_id: string;
  lead_id: string;
}

// Resolve tenant_id/lead_id a partir do conversa_id, com autoridade do
// servidor - usado pelos sub-workflows de agente especialista (n8n) pra
// nunca precisar confiar no que o LLM digitar como tenant_id/lead_id.
// So o conversa_id (um valor estavel, ja conhecido pelo agente supervisor)
// precisa passar pela "digitacao" do modelo; os outros dois IDs sao
// derivados aqui, nunca aceitos como input.
export async function GET(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversaId = request.nextUrl.searchParams.get("conversa_id");
  if (!conversaId) return NextResponse.json({ found: false, error: "conversa_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("conversas")
    .select("id, tenant_id, lead_id")
    .eq("id", conversaId)
    .maybeSingle();

  if (!data) return NextResponse.json({ found: false, error: "Conversa nao encontrada" }, { status: 404 });

  const conversa = data as unknown as ConversaRow;
  return NextResponse.json({ found: true, tenant_id: conversa.tenant_id, lead_id: conversa.lead_id, conversa_id: conversa.id });
}
