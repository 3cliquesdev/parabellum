import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateEmbedding } from "../embed/route";
import type { LooseDatabase } from "@/types/database";

interface CrawlBody {
  url?: string;
  tenant_id?: string;
}

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
    .replace(/&quot;/g, "\"")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export async function POST(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as CrawlBody;
  if (!body.url || !body.tenant_id) {
    return NextResponse.json({ error: "url e tenant_id sao obrigatorios" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
  } catch {
    return NextResponse.json({ error: "URL invalida" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(body.url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LibertyCRM/1.0; +https://libertycrm.com.br)" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: `Erro ao acessar URL: ${response.status}` }, { status: 400 });
    }

    const html = await response.text();
    const text = extractText(html);
    if (text.length < 100) {
      return NextResponse.json({ error: "Nao foi possivel extrair conteudo util desta URL" }, { status: 400 });
    }

    const domain = parsedUrl.hostname.replace("www.", "");
    const chunks = chunkText(text);
    const category = `Crawled: ${domain}`;
    let created = 0;

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const title = `${domain} - parte ${index + 1}`;

      try {
        const embedding = await generateEmbedding(`${title}\n\n${chunk}`);
        await admin.from("knowledge_base").insert({
          tenant_id: body.tenant_id,
          titulo: title,
          conteudo: chunk,
          categoria: category,
          tags: [domain, "crawled"],
          publicado: true,
          embedding: `[${embedding.join(",")}]`,
        });
        created++;
        if (index < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch {
        // Continua mesmo se um chunk falhar.
      }
    }

    return NextResponse.json({
      success: true,
      artigos_criados: created,
      chars_processados: text.length,
      chunks_total: chunks.length,
      domain,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Timeout ao acessar a URL (15s)" }, { status: 408 });
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
