"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Copy } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

const DEFAULTS = [
  { titulo: "Saudação inicial", atalho: "!ola", conteudo: "Olá! Tudo bem? Sou a [Nome], da [Empresa]. Como posso te ajudar hoje?", categoria: "Apresentação" },
  { titulo: "Solicitar contato", atalho: "!contato", conteudo: "Para eu te ajudar melhor, pode me passar seu nome completo e melhor horário para contato?", categoria: "Qualificação" },
  { titulo: "Enviar proposta", atalho: "!proposta", conteudo: "Ótimo! Vou preparar uma proposta personalizada para você. Posso enviar ainda hoje. Qual o melhor e-mail?", categoria: "Proposta" },
  { titulo: "Aguardar retorno", atalho: "!followup", conteudo: "Oi! Só passando para saber se você teve chance de analisar nossa proposta. Ficou alguma dúvida?", categoria: "Follow-up" },
  { titulo: "Fechar negócio", atalho: "!fechar", conteudo: "Que ótimo! Vamos dar início ao processo. Vou te enviar o contrato e as instruções para o próximo passo.", categoria: "Fechamento" },
];

export default function ResponsesPage() {
  const { tenantId } = useTenant();
  const [responses, setResponses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ titulo: "", atalho: "", conteudo: "", categoria: "Geral" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  async function fetchResponses() {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase.from("respostas_rapidas").select("*").eq("tenant_id", tenantId).order("uso_count", { ascending: false });
    setResponses(data ?? []);
  }

  useEffect(() => { if (tenantId) fetchResponses(); }, [tenantId]);

  async function saveResponse() {
    if (!tenantId || !form.titulo || !form.conteudo) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { tenant_id: tenantId, ...form, atalho: form.atalho ? (form.atalho.startsWith("!") ? form.atalho : `!${form.atalho}`) : null };
    if (editing) await supabase.from("respostas_rapidas").update(payload).eq("id", editing.id);
    else await supabase.from("respostas_rapidas").insert(payload);
    setSaving(false); setShowForm(false); setEditing(null);
    setForm({ titulo: "", atalho: "", conteudo: "", categoria: "Geral" });
    fetchResponses();
  }

  async function deleteResponse(id: string) {
    const supabase = createClient();
    await supabase.from("respostas_rapidas").delete().eq("id", id);
    fetchResponses();
  }

  async function addDefaults() {
    if (!tenantId) return;
    const supabase = createClient();
    await supabase.from("respostas_rapidas").insert(DEFAULTS.map(d => ({ ...d, tenant_id: tenantId })));
    fetchResponses();
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const categorias = [...new Set(responses.map(r => r.categoria))];

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Respostas Rápidas</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>
            {responses.length} templates · Digite "!" no inbox para usar
          </p>
        </div>
        <div className="flex gap-2">
          {responses.length === 0 && (
            <button onClick={addDefaults} className="px-4 h-9 rounded-xl text-sm font-bold"
              style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
              Adicionar padrões
            </button>
          )}
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ titulo: "", atalho: "", conteudo: "", categoria: "Geral" }); }}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
            style={{ background: "#9aea62", color: "#0a0a0a" }}>
            <Plus className="w-4 h-4" /> Nova resposta
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          <h2 className="text-sm font-bold text-white">{editing ? "Editar resposta" : "Nova resposta rápida"}</h2>
          <div className="grid grid-cols-3 gap-3">
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título"
              className="h-10 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <input value={form.atalho} onChange={e => setForm(f => ({ ...f, atalho: e.target.value }))} placeholder="!atalho"
              className="h-10 px-3 rounded-xl text-sm text-white outline-none font-mono"
              style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.12)" }} />
            <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Categoria"
              className="h-10 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} rows={3}
            placeholder="Conteúdo da resposta..." className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 h-9 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Cancelar</button>
            <button onClick={saveResponse} disabled={saving} className="px-5 h-9 rounded-xl text-sm font-bold" style={{ background: "#9aea62", color: "#0a0a0a" }}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* By category */}
      {responses.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-sm" style={{ color: "#939da4" }}>Nenhuma resposta rápida ainda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categorias.map(cat => (
            <div key={cat}>
              <p className="section-label mb-3">{cat}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {responses.filter(r => r.categoria === cat).map(r => (
                  <div key={r.id} className="rounded-xl p-4 group" style={cardStyle}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{r.titulo}</span>
                        {r.atalho && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold"
                            style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>{r.atalho}</span>
                        )}
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyText(r.id, r.conteudo)}>
                          <Copy className="w-3.5 h-3.5" style={{ color: copied === r.id ? "#9aea62" : "#939da4" }} />
                        </button>
                        <button onClick={() => { setEditing(r); setForm({ titulo: r.titulo, atalho: r.atalho ?? "", conteudo: r.conteudo, categoria: r.categoria }); setShowForm(true); }}>
                          <Edit2 className="w-3.5 h-3.5" style={{ color: "#939da4" }} />
                        </button>
                        <button onClick={() => deleteResponse(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.5)" }} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: "#939da4" }}>{r.conteudo}</p>
                    {r.uso_count > 0 && (
                      <p className="text-[10px] mt-2" style={{ color: "rgba(147,157,164,0.4)" }}>Usada {r.uso_count}x</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
