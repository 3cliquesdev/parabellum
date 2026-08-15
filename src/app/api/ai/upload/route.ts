import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "../embed/route";
import { assertTenantMember } from "@/lib/auth/guard";
import { consumeApiRateLimit } from "@/lib/security/rate-limit";

const MAX_CHUNKS = 100;

interface PdfParseResult {
  text: string;
}

type PdfParser = (input: Buffer) => Promise<PdfParseResult>;

function chunkText(text: string, size = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 80) chunks.push(chunk);
    start += size - overlap;
  }

  return chunks;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule = await import("pdf-parse");
  const moduleWithDefault = pdfParseModule as unknown as { default?: PdfParser };
  const pdfParse = moduleWithDefault.default ?? (pdfParseModule as unknown as PdfParser);
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const tenantId = formData.get("tenant_id");

  if (!(file instanceof File) || typeof tenantId !== "string") {
    return NextResponse.json({ error: "file e tenant_id sao obrigatorios" }, { status: 400 });
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Arquivo muito grande. Maximo: 10MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const supported = ["pdf", "txt", "docx", "doc"];
  if (!ext || !supported.includes(ext)) {
    return NextResponse.json({ error: "Formato nao suportado. Use PDF, DOCX ou TXT" }, { status: 400 });
  }

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  if (!await consumeApiRateLimit(admin, `ai:upload:${auth.user.id}`, 10, 600)) {
    return NextResponse.json({ error: "Limite de uploads excedido. Tente novamente mais tarde." }, { status: 429 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (ext === "pdf") {
      text = await extractPdfText(buffer);
    } else if (ext === "docx" || ext === "doc") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      text = buffer.toString("utf-8");
    }

    text = text.replace(/\s{3,}/g, "\n\n").trim();
    if (text.length < 50) {
      return NextResponse.json({ error: "Nao foi possivel extrair texto do arquivo" }, { status: 400 });
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const category = `Documento: ${baseName}`;
    const chunks = chunkText(text).slice(0, MAX_CHUNKS);
    let created = 0;

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const title = chunks.length === 1 ? baseName : `${baseName} - parte ${index + 1}`;

      try {
        const embedding = await generateEmbedding(`${title}\n\n${chunk}`);
        await admin.from("knowledge_base").insert({
          tenant_id: tenantId,
          titulo: title,
          conteudo: chunk,
          categoria: category,
          tags: [baseName, ext, "upload"],
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
      nome_arquivo: file.name,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
