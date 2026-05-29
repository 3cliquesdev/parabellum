"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen, Search, CheckCircle, Circle, Zap, Trash2, Edit2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

interface KBArticle {
  id: string; titulo: string; conteudo: string; categoria: string;
  tags: string[]; publicado: boolean; embedding: boolean; created_at: string;
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
  const [candidates, setCandidates] = useState<any[]>([]);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  async function fetchArticles() {
    if (!tenantId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("knowledge_base").select("id, titulo, conteudo, categoria, tags, publicado, embedding, created_at")
      .eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setArticles((data ?? []).map((a: any) => ({ ...a, embedding: !!a.embedding })));
    setLoading(false);
  }

  async function fetchCandidates() {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase.from("knowledge_candidates").select("*").eq("tenant_id", tenantId).eq("status", "pendente").order("created_at", { ascending: false });
    setCandidates(data ?? []);
  }

  useEffect(() => { if (tenantId) { fetchArticles(); fetchCandidates(); } }, [tenantId]);

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

  async function approveCandidate(c: any) {
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
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>
            {articles.length} artigos · {published} publicados · {withEmbedding} com embedding
          </p>
        </div>
        <div className="flex gap-2">
          {articles.some(a => !a.embedding) && (
            <button onClick={generateAllEmbeddings} disabled={embeddingId === "all"}
              className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold transition-all"
              style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
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

      {/* Tabs */}
      <div className="flex gap-2">
        {[["artigos", "Artigos"], ["candidatos", `Candidatos (${candidates.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            className="px-4 h-8 rounded-xl text-xs font-bold"
            style={tab === v ? { background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }
              : { background: "rgba(255,255,255,0.04)", color: "#939da4", border: "1px solid rgba(255,255,255,0.06)" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab === "artigos" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#939da4" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artigos..."
            className="w-full h-9 pl-9 pr-4 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          <h2 className="text-sm font-bold text-white">{editing ? "Editar artigo" : "Novo artigo"}</h2>
          <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título do artigo"
            className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} placeholder="Conteúdo completo do artigo..." rows={6}
            className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className="h-10 px-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
              {CATEGORIAS.map(c => <option key={c} value={c} style={{ background: "#111" }}>{c}</option>)}
            </select>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (separadas por vírgula)"
              className="h-10 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 h-9 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Cancelar</button>
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
          <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(147,157,164,0.3)" }} />
            <p className="text-sm" style={{ color: "#939da4" }}>Nenhum artigo ainda.</p>
            <p className="text-xs mt-1" style={{ color: "rgba(147,157,164,0.4)" }}>Adicione artigos para a IA usar nas respostas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => (
              <div key={a.id} className="rounded-xl p-4 flex items-start gap-4" style={cardStyle}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white truncate">{a.titulo}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>{a.categoria}</span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: "#939da4" }}>{a.conteudo}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.embedding
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>✓ Embedding</span>
                    : <button onClick={() => generateEmbedding(a)} disabled={embeddingId === a.id}
                        className="text-[10px] px-2 py-1 rounded-full font-bold transition-all"
                        style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>
                        {embeddingId === a.id ? "..." : "Gerar embedding"}
                      </button>}
                  <button onClick={() => togglePublish(a.id, a.publicado)} title={a.publicado ? "Despublicar" : "Publicar"}>
                    {a.publicado ? <CheckCircle className="w-4 h-4" style={{ color: "#9aea62" }} /> : <Circle className="w-4 h-4" style={{ color: "#939da4" }} />}
                  </button>
                  <button onClick={() => { setEditing(a); setForm({ titulo: a.titulo, conteudo: a.conteudo, categoria: a.categoria, tags: a.tags.join(", ") }); setShowForm(true); }}>
                    <Edit2 className="w-4 h-4" style={{ color: "#939da4" }} />
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
          <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm" style={{ color: "#939da4" }}>Nenhum candidato pendente.</p>
            <p className="text-xs mt-1" style={{ color: "rgba(147,157,164,0.4)" }}>Quando leads fecham negócio, a IA extrai conhecimento automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map(c => (
              <div key={c.id} className="rounded-xl p-5" style={cardStyle}>
                <p className="text-xs font-bold mb-1" style={{ color: "#9aea62" }}>Pergunta</p>
                <p className="text-sm text-white mb-3">{c.pergunta}</p>
                <p className="text-xs font-bold mb-1" style={{ color: "#939da4" }}>Resposta sugerida</p>
                <p className="text-sm mb-4" style={{ color: "#939da4" }}>{c.resposta}</p>
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
