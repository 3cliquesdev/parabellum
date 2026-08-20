import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";

interface ClientErrorBody {
  tipo?: string;
  mensagem?: string;
  stack?: string;
  url?: string;
  tenant_id?: string;
}

const MAX_LEN = 4000;
const RATE_LIMIT_JANELA_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const contadorPorIp = new Map<string, { count: number; resetAt: number }>();

// Endpoint publico (pode receber erro de tela de login, sem sessao) que so
// grava - nunca expoe dado de volta. Rate limit simples em memoria pra um
// loop de erro no cliente nao virar flood de inserts no banco.
function passouRateLimit(ip: string): boolean {
  const agora = Date.now();
  const atual = contadorPorIp.get(ip);
  if (!atual || agora > atual.resetAt) {
    contadorPorIp.set(ip, { count: 1, resetAt: agora + RATE_LIMIT_JANELA_MS });
    return true;
  }
  atual.count += 1;
  return atual.count <= RATE_LIMIT_MAX;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  if (!passouRateLimit(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as ClientErrorBody;
  if (!body.mensagem) return NextResponse.json({ error: "mensagem required" }, { status: 400 });

  const admin = createAdminClient();

  await admin.from("client_error_logs").insert({
    tenant_id: body.tenant_id ?? null,
    tipo: body.tipo?.slice(0, 100) ?? "erro_desconhecido",
    mensagem: body.mensagem.slice(0, MAX_LEN),
    stack: body.stack?.slice(0, MAX_LEN) ?? null,
    url: body.url?.slice(0, 500) ?? null,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  });

  return NextResponse.json({ ok: true });
}
