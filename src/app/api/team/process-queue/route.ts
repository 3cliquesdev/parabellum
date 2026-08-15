import { NextRequest, NextResponse } from "next/server";
import { processQueueForAgent } from "@/lib/dispatch";
import { isInternalRequest } from "@/lib/security/internal-auth";

export async function POST(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenant_id, agent_id } = await request.json();
  await processQueueForAgent(tenant_id, agent_id);
  return NextResponse.json({ success: true });
}
