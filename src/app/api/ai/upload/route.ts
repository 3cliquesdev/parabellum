import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateEmbedding } from "../embed/route";

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

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const tenant_id = formData.get("tenant_id") as string | null;

  if (!file || !tenant_id) return NextResponse.json({ error: "file e tenant_id são obrigatórios" }, { status: 400 });

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Arquivo muito grande. Máximo: 10MB" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  const supported = ["pdf", "txt", "docx", "doc"];
  if (!ext || !supported.includes(ext)) {
    return NextResponse.json({ error: "Formato não suportado. Use PDF, DOCX ou TXT" }, { status: 400 });
  }

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (ext === "pdf") {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (ext === "docx" || ext === "doc") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      // .txt
      text = buffer.toString("utf-8");
    }

    text = text.replace(/\s{3,}/g, "\n\n").trim();

    if (text.length < 50) {
      return NextResponse.json({ error: "Não foi possível extrair texto do arquivo" }, { status: 400 });
    }

    const nomeBase = file.name.replace(/\.[^.]+$/, "");
    const categoria = `Documento: ${nomeBase}`;
    const chunks = chunkText(text);
    let criados = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const titulo = chunks.length === 1 ? nomeBase : `${nomeBase} — parte ${i + 1}`;

      try {
        const embedding = await generateEmbedding(`${titulo}\n\n${chunk}`);
        await admin.from("knowledge_base").insert({
          tenant_id,
          titulo,
          conteudo: chunk,
          categoria,
          tags: [nomeBase, ext, "upload"],
          publicado: true,
          embedding: `[${embedding.join(",")}]`,
        });
        criados++;
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 200));
      } catch {
        // Continua mesmo se um chunk falhar
      }
    }

    return NextResponse.json({
      success: true,
      artigos_criados: criados,
      chars_processados: text.length,
      nome_arquivo: file.name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
