"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, BookOpen, Search, CheckCircle, Circle, Zap, Trash2, Edit2, Globe, FileText, PenLine, Upload, X } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

interface KBArticle {
  id: string; titulo: string; conteudo: string; categoria: string;
  tags: string[]; publicado: boolean; embedding: boolean; created_at: string;
}

interface KBArticleRecord extends Omit<KBArticle, "embedding"> {
  embedding: unknown;
}

interface KBCandidate {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string;
}

const CATEGORIAS = ["Geral", "Serviços", "Preços", "FAQ", "Objeções", "Casos de Sucesso", "Suporte", "Processos"];

export default function KnowledgePage() {
  const { tenantId } = useTenant();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"artigos" | "candidatos">("artigos");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KBArticle | null>(null);
  const [form, setForm] = useState({ titulo: "", conteudo: "", categoria: "Geral", tags: "" });
  const [saving, setSaving] = useState(false);
  const [embeddingId, setEmbeddingId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<KBCandidate[]>([]);
  // Importação
  const [importMode, setImportMode] = useState<"url" | "file" | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };

  const fetchArticles = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("knowledge_base").select("id, titulo, conteudo, categoria, tags, publicado, embedding, created_at")
      .eq("tenant_id", tenantId).order("created_at", { ascending: false });
    const records = (data ?? []) as unknown as KBArticleRecord[];
    setArticles(records.map((article) => ({ ...article, embedding: Boolean(article.embedding) })));
    setLoading(false);
  }, [tenantId]);

  const fetchCandidates = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase.from("knowledge_candidates").select("*").eq("tenant_id", tenantId).eq("status", "pendente").order("created_at", { ascending: false });
    setCandidates((data ?? []) as unknown as KBCandidate[]);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;

    queueMicrotask(() => {
      void fetchArticles();
      void fetchCandidates();
    });
  }, [fetchArticles, fetchCandidates, tenantId]);

  async function saveArticle() {
    if (!tenantId || !form.titulo || !form.conteudo) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { tenant_id: tenantId, titulo: form.titulo, conteudo: form.conteudo, categoria: form.categoria, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) };
    if (editing) {
      await supabase.from("knowledge_base").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("knowledge_base").insert({ ...payload, publicado: false });
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({ titulo: "", conteudo: "", categoria: "Geral", tags: "" });
    fetchArticles();
  }

  async function togglePublish(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("knowledge_base").update({ publicado: !current }).eq("id", id);
    fetchArticles();
  }

  async function deleteArticle(id: string) {
    if (!confirm("Excluir este artigo?")) return;
    const supabase = createClient();
    await supabase.from("knowledge_base").delete().eq("id", id);
    fetchArticles();
  }

  async function generateEmbedding(article: KBArticle) {
    setEmbeddingId(article.id);
    await fetch("/api/ai/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `${article.titulo}\n\n${article.conteudo}`, article_id: article.id }),
    });
    setEmbeddingId(null);
    fetchArticles();
  }

  async function generateAllEmbeddings() {
    if (!tenantId) return;
    setEmbeddingId("all");
    await fetch(`/api/ai/embed?batch=true&tenant_id=${tenantId}`);
    setEmbeddingId(null);
    fetchArticles();
  }

  async function importFromUrl() {
    if (!tenantId || !importUrl) return;
    setImporting(true); setImportResult(null);
    try {
      const r = await fetch("/api/ai/crawl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: importUrl, tenant_id: tenantId }) });
      const d = await r.json();
      if (d.success) { setImportResult({ ok: true, msg: `${d.artigos_criados} artigos criados de ${d.domain}` }); setImportUrl(""); setImportMode(null); fetchArticles(); }
      else setImportResult({ ok: false, msg: d.error ?? "Erro ao importar" });
    } catch { setImportResult({ ok: false, msg: "Erro de conexão" }); }
    setImporting(false);
  }

  async function importFromFile() {
    if (!tenantId || !importFile) return;
    setImporting(true); setImportResult(null);
    try {
      const fd = new FormData(); fd.append("file", importFile); fd.append("tenant_id", tenantId);
      const r = await fetch("/api/ai/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) { setImportResult({ ok: true, msg: `${d.artigos_criados} artigos criados de "${d.nome_arquivo}"` }); setImportFile(null); setImportMode(null); fetchArticles(); }
      else setImportResult({ ok: false, msg: d.error ?? "Erro ao processar arquivo" });
    } catch { setImportResult({ ok: false, msg: "Erro de conexão" }); }
    setImporting(false);
  }

  async function approveCandidate(c: KBCandidate) {
    const supabase = createClient();
    await supabase.from("knowledge_base").insert({ tenant_id: tenantId, titulo: c.pergunta, conteudo: c.resposta, categoria: c.categoria, publicado: false });
    await supabase.from("knowledge_candidates").update({ status: "aprovado" }).eq("id", c.id);
    fetchCandidates(); fetchArticles();
  }

  async function rejectCandidate(id: string) {
    const supabase = createClient();
    await supabase.from("knowledge_candidates").update({ status: "rejeitado" }).eq("id", id);
    fetchCandidates();
  }

  const filtered = articles.filter(a => a.titulo.toLowerCase().includes(search.toLowerCase()) || a.conteudo.toLowerCase().includes(search.toLowerCase()));
  const withEmbedding = articles.filter(a => a.embedding).length;
  const published = articles.filter(a => a.publicado).length;

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Base de Conhecimento</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {articles.length} artigos · {published} publicados · {withEmbedding} com embedding
          </p>
        </div>
        <div className="flex gap-2">
          {articles.some(a => !a.embedding) && (
            <button onClick={generateAllEmbeddings} disabled={embeddingId === "all"}
              className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold transition-all"
              style={{ background: "rgba(154,234,98,0.1)", color: "var(--status-ganho)", border: "1px solid rgba(154,234,98,0.2)" }}>
              <Zap className="w-4 h-4" />
              {embeddingId === "all" ? "Gerando..." : "Gerar todos embeddings"}
            </button>
          )}
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ titulo: "", conteudo: "", categoria: "Geral", tags: "" }); }}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
            style={{ background: "#9aea62", color: "#0a0a0a" }}>
            <Plus className="w-4 h-4" /> Novo artigo
          </button>
        </div>
      </div>

      {/* Card de Importação */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs font-bold text-white mb-3">Importar conhecimento</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {([
            { id: "url", icon: Globe, label: "Via URL", desc: "Importar site ou página" },
            { id: "file", icon: FileText, label: "PDF / DOCX", desc: "Upload de documento" },
            { id: "write", icon: PenLine, label: "Escrever", desc: "Adicionar manualmente" },
          ] as const).map(({ id, icon: Icon, label, desc }) => (
            <button key={id}
              onClick={() => { if (id === "write") { setShowForm(true); setEditing(null); setForm({ titulo: "", conteudo: "", categoria: "Geral", tags: "" }); setImportMode(null); } else setImportMode(importMode === id ? null : id); }}
              className="flex flex-col items-start gap-1.5 p-3.5 rounded-xl text-left transition-all"
              style={(importMode === id || (id === "write" && showForm))
                ? { background: "rgba(154,234,98,0.08)", border: "1px solid rgba(154,234,98,0.25)" }
                : { background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
              <Icon className="w-4 h-4" style={{ color: (importMode === id || (id === "write" && showForm)) ? "#9aea62" : "#939da4" }} />
              <span className="text-xs font-bold" style={{ color: (importMode === id || (id === "write" && showForm)) ? "#9aea62" : "var(--text-primary)" }}>{label}</span>
              <span className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>{desc}</span>
            </button>
          ))}
        </div>

        {/* URL import panel */}
        {importMode === "url" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input value={importUrl} onChange={e => setImportUrl(e.target.value)}
                placeholder="https://meusite.com.br/sobre"
                className="flex-1 h-9 px-3 rounded-xl text-sm text-white outline-none font-mono"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
              <button onClick={importFromUrl} disabled={importing || !importUrl}
                className="px-4 h-9 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                style={{ background: importing ? "rgba(154,234,98,0.1)" : "#9aea62", color: importing ? "#9aea62" : "#0a0a0a", opacity: !importUrl ? 0.5 : 1 }}>
                {importing ? <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Importando...</> : <><Globe className="w-3 h-3" /> Importar</>}
              </button>
            </div>
            <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.4)" }}>O conteúdo da página será extraído, dividido em chunks e indexado com embeddings automaticamente.</p>
          </div>
        )}

        {/* File upload panel */}
        {importMode === "file" && (
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
              style={{ background: "var(--surface-soft)", border: `1px dashed ${importFile ? "rgba(154,234,98,0.4)" : "var(--border-strong)"}` }}>
              <Upload className="w-4 h-4 shrink-0" style={{ color: importFile ? "#9aea62" : "#939da4" }} />
              <div className="flex-1 min-w-0">
                {importFile
                  ? <p className="text-xs font-bold truncate" style={{ color: "var(--status-ganho)" }}>{importFile.name}</p>
                  : <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Clique para selecionar PDF, DOCX ou TXT (máx. 10MB)</p>}
              </div>
              {importFile && <button onClick={e => { e.preventDefault(); setImportFile(null); }}><X className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} /></button>}
              <input type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={e => setImportFile(e.target.files?.[0] ?? null)} />
            </label>
            <button onClick={importFromFile} disabled={importing || !importFile}
              className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ background: importing ? "rgba(154,234,98,0.1)" : "#9aea62", color: importing ? "#9aea62" : "#0a0a0a", opacity: !importFile ? 0.5 : 1 }}>
              {importing ? <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processando documento...</> : <><FileText className="w-3 h-3" /> Processar e indexar</>}
            </button>
          </div>
        )}

        {/* Resultado */}
        {importResult && (
          <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2"
            style={{ background: importResult.ok ? "rgba(154,234,98,0.06)" : "rgba(248,113,113,0.06)", border: `1px solid ${importResult.ok ? "rgba(154,234,98,0.2)" : "rgba(248,113,113,0.2)"}` }}>
            <span className="text-xs font-bold" style={{ color: importResult.ok ? "#9aea62" : "#f87171" }}>{importResult.ok ? "✓" : "✗"}</span>
            <span className="text-xs" style={{ color: importResult.ok ? "#9aea62" : "#f87171" }}>{importResult.msg}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[["artigos", "Artigos"], ["candidatos", `Candidatos (${candidates.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            className="px-4 h-8 rounded-xl text-xs font-bold"
            style={tab === v ? { background: "rgba(154,234,98,0.1)", color: "var(--status-ganho)", border: "1px solid rgba(154,234,98,0.2)" }
              : { background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab === "artigos" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artigos..."
            className="w-full h-9 pl-9 pr-4 rounded-xl text-sm text-white outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          <h2 className="text-sm font-bold text-white">{editing ? "Editar artigo" : "Novo artigo"}</h2>
          <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título do artigo"
            className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          <textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} placeholder="Conteúdo completo do artigo..." rows={6}
            className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className="h-10 px-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
              {CATEGORIAS.map(c => <option key={c} value={c} style={{ background: "var(--surface-solid)" }}>{c}</option>)}
            </select>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (separadas por vírgula)"
              className="h-10 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 h-9 rounded-xl text-sm" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>Cancelar</button>
            <button onClick={saveArticle} disabled={saving} className="px-5 h-9 rounded-xl text-sm font-bold" style={{ background: "#9aea62", color: "#0a0a0a" }}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Articles list */}
      {tab === "artigos" && (
        loading ? <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
        : filtered.length === 0 ? (
          <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid var(--border-subtle)", background: "var(--surface)" }}>
            <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(147,157,164,0.3)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum artigo ainda.</p>
            <p className="text-xs mt-1" style={{ color: "rgba(147,157,164,0.4)" }}>Adicione artigos para a IA usar nas respostas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => (
              <div key={a.id} className="rounded-xl p-4 flex items-start gap-4" style={cardStyle}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white truncate">{a.titulo}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>{a.categoria}</span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>{a.conteudo}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.embedding
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(154,234,98,0.1)", color: "var(--status-ganho)" }}>✓ Embedding</span>
                    : <button onClick={() => generateEmbedding(a)} disabled={embeddingId === a.id}
                        className="text-[10px] px-2 py-1 rounded-full font-bold transition-all"
                        style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>
                        {embeddingId === a.id ? "..." : "Gerar embedding"}
                      </button>}
                  <button onClick={() => togglePublish(a.id, a.publicado)} title={a.publicado ? "Despublicar" : "Publicar"}>
                    {a.publicado ? <CheckCircle className="w-4 h-4" style={{ color: "var(--status-ganho)" }} /> : <Circle className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />}
                  </button>
                  <button onClick={() => { setEditing(a); setForm({ titulo: a.titulo, conteudo: a.conteudo, categoria: a.categoria, tags: a.tags.join(", ") }); setShowForm(true); }}>
                    <Edit2 className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                  </button>
                  <button onClick={() => deleteArticle(a.id)}>
                    <Trash2 className="w-4 h-4" style={{ color: "rgba(248,113,113,0.5)" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Candidates */}
      {tab === "candidatos" && (
        candidates.length === 0 ? (
          <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid var(--border-subtle)", background: "var(--surface)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum candidato pendente.</p>
            <p className="text-xs mt-1" style={{ color: "rgba(147,157,164,0.4)" }}>Quando leads fecham negócio, a IA extrai conhecimento automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map(c => (
              <div key={c.id} className="rounded-xl p-5" style={cardStyle}>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--status-ganho)" }}>Pergunta</p>
                <p className="text-sm text-white mb-3">{c.pergunta}</p>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Resposta sugerida</p>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{c.resposta}</p>
                <div className="flex gap-2">
                  <button onClick={() => approveCandidate(c)} className="px-4 h-8 rounded-xl text-xs font-bold" style={{ background: "#9aea62", color: "#0a0a0a" }}>Aprovar</button>
                  <button onClick={() => rejectCandidate(c.id)} className="px-4 h-8 rounded-xl text-xs font-bold" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>Rejeitar</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
