import { NextRequest, NextResponse } from "next/server";
import { processQueueForAgent } from "@/lib/dispatch";

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-internal-key");
  if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenant_id, agent_id } = await request.json();
  await processQueueForAgent(tenant_id, agent_id);
  return NextResponse.json({ success: true });
}
