import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const sqls = [
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS nome_fantasia text`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url text`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cor_primaria text DEFAULT '#9aea62'`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS white_label boolean DEFAULT false`,
  ];

  const results: { sql: string; ok: boolean; error?: string }[] = [];

  for (const sql of sqls) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/run_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({ sql }),
      });
      const body = await res.text();
      // Se a coluna já existe, Supabase retorna erro mas é ok
      const ok = res.ok || body.includes("already exists");
      results.push({ sql: sql.slice(0, 70), ok, error: ok ? undefined : body.slice(0, 100) });
    } catch (e: any) {
      results.push({ sql: sql.slice(0, 70), ok: false, error: e.message });
    }
  }

  // Verificar se as colunas existem agora
  const check = await fetch(`${url}/rest/v1/tenants?select=nome_fantasia&limit=1`, {
    headers: { "apikey": key, "Authorization": `Bearer ${key}` },
  });
  const checkOk = check.ok;

  return NextResponse.json({ results, columns_exist: checkOk, status: checkOk ? "success" : "need_manual_migration" });
}
