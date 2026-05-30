import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateEmbedding } from "../embed/route";

// Extrai texto limpo de HTML — remove scripts, estilos, nav, footer
function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Divide texto em chunks com overlap
function chunkText(text: string, size = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 100) chunks.push(chunk);
    start += size - overlap;
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, tenant_id } = await request.json();
  if (!url || !tenant_id) return NextResponse.json({ error: "url e tenant_id são obrigatórios" }, { status: 400 });

  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  try {
    // Fetch da URL com timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LibertyCRM/1.0; +https://libertycrm.com.br)" },
    });
    clearTimeout(timeout);

    if (!res.ok) return NextResponse.json({ error: `Erro ao acessar URL: ${res.status}` }, { status: 400 });

    const html = await res.text();
    const text = extractText(html);

    if (text.length < 100) {
      return NextResponse.json({ error: "Não foi possível extrair conteúdo útil desta URL" }, { status: 400 });
    }

    const domain = parsedUrl.hostname.replace("www.", "");
    const chunks = chunkText(text);
    const categoria = `Crawled: ${domain}`;
    let criados = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const titulo = `${domain} — parte ${i + 1}`;

      try {
        const embedding = await generateEmbedding(`${titulo}\n\n${chunk}`);
        await admin.from("knowledge_base").insert({
          tenant_id,
          titulo,
          conteudo: chunk,
          categoria,
          tags: [domain, "crawled"],
          publicado: true,
          embedding: `[${embedding.join(",")}]`,
        });
        criados++;
        // Rate limit: 200ms entre chunks
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 200));
      } catch {
        // Continua mesmo se um chunk falhar
      }
    }

    return NextResponse.json({
      success: true,
      artigos_criados: criados,
      chars_processados: text.length,
      chunks_total: chunks.length,
      domain,
    });
  } catch (err: any) {
    if (err.name === "AbortError") return NextResponse.json({ error: "Timeout ao acessar a URL (15s)" }, { status: 408 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
