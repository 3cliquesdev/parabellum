import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "../embed/route";
import { assertTenantMember } from "@/lib/auth/guard";
import { readTextWithLimit, safePublicFetch } from "@/lib/security/safe-fetch";
import { consumeApiRateLimit } from "@/lib/security/rate-limit";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_CHUNKS = 100;

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export async function POST(request: NextRequest) {
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

  const auth = await assertTenantMember(body.tenant_id);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  if (!await consumeApiRateLimit(admin, `ai:crawl:${auth.user.id}`, 5, 600)) {
    return NextResponse.json({ error: "Limite de crawls excedido. Tente novamente mais tarde." }, { status: 429 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await safePublicFetch(body.url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; 3CliquesCRM/1.0; +https://3cliques.net)" },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json({ error: `Erro ao acessar URL: ${response.status}` }, { status: 400 });
    }

    const html = await readTextWithLimit(response, MAX_RESPONSE_BYTES);
    const text = extractText(html);
    if (text.length < 100) {
      return NextResponse.json({ error: "Nao foi possivel extrair conteudo util desta URL" }, { status: 400 });
    }

    const domain = parsedUrl.hostname.replace("www.", "");
    const chunks = chunkText(text).slice(0, MAX_CHUNKS);
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
