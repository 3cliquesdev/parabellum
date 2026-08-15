"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending:  { label: "Aguardando aprovação", color: "#facc15" },
  approved: { label: "Aprovado", color: "#10B981" },
  rejected: { label: "Rejeitado", color: "#f87171" },
  disabled: { label: "Desativado", color: "#939da4" },
};

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "#fb923c", UTILITY: "#60a5fa", AUTHENTICATION: "#a78bfa",
};

interface BroadcastTemplate {
  id: string;
  status: string;
  category: string;
  template_name: string;
  language_code: string;
  variables_count: number;
  body_text: string;
  footer_text?: string | null;
}

export default function BroadcastTemplatesPage() {
  const { tenantId } = useTenant();
  const [templates, setTemplates] = useState<BroadcastTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ template_name: "", category: "UTILITY", body_text: "", footer_text: "", header_type: "NONE", variables_schema: "" });
  const [saving, setSaving] = useState(false);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/broadcast/templates?tenant_id=${tenantId}`)
      .then(r => r.json()).then(d => { setTemplates(d.templates ?? []); setLoading(false); });
  }, [tenantId]);

  async function save() {
    if (!tenantId || !form.template_name || !form.body_text) return;
    setSaving(true);
    const vars_count = (form.body_text.match(/\{\{\d+\}\}/g) ?? []).length;
    const r = await fetch("/api/broadcast/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tenant_id: tenantId, variables_count: vars_count }),
    });
    const d = await r.json(); setSaving(false);
    if (d.template) { setTemplates(t => [d.template, ...t]); setShowForm(false); setForm({ template_name: "", category: "UTILITY", body_text: "", footer_text: "", header_type: "NONE", variables_schema: "" }); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir template?")) return;
    await fetch("/api/broadcast/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template_id: id }) });
    setTemplates(t => t.filter(x => x.id !== id));
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/broadcasts" className="flex items-center gap-1.5 text-xs" style={{ color: "#939da4" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-[-0.03em]">Templates</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Templates aprovados pela Meta para envio em massa</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "#10B981", color: "#0a0a0a" }}>
          <Plus className="w-4 h-4" /> Novo template
        </button>
      </div>

      {/* Aviso importante */}
      <div className="rounded-xl p-4" style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.2)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "#facc15" }}>Pré-requisito: Aprovar templates na Meta</p>
        <p className="text-xs" style={{ color: "#939da4" }}>
          Antes de disparar, crie os templates no <strong style={{ color: "#fff" }}>Meta Business Manager → WhatsApp Manager → Modelos de mensagens</strong> e aguarde aprovação (24-48h). Depois cadastre aqui com o mesmo nome exato.
        </p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl p-6 space-y-4" style={cardStyle}>
          <h2 className="text-sm font-bold text-white">Cadastrar template</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#939da4" }}>Nome (igual no Meta, snake_case)</label>
              <input value={form.template_name} onChange={e => setForm(f => ({ ...f, template_name: e.target.value.toLowerCase().replace(/\s/g, "_") }))}
                placeholder="broadcast_novidade_utility"
                className="w-full h-9 px-3 rounded-xl text-sm text-white outline-none font-mono"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#939da4" }}>Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
                <option value="UTILITY" style={{ background: "#111" }}>UTILITY (aprovação mais rápida)</option>
                <option value="MARKETING" style={{ background: "#111" }}>MARKETING</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "#939da4" }}>
              Corpo da mensagem (use {`{{1}}`}, {`{{2}}`} para variáveis)
            </label>
            <textarea value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} rows={4}
              placeholder={`Olá {{1}}, temos uma novidade para você: {{2}}\n\nPara saber mais, basta responder esta mensagem.`}
              className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>
              Variáveis detectadas: {(form.body_text.match(/\{\{\d+\}\}/g) ?? []).length} — mapeie para campos do lead ao criar a campanha
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "#939da4" }}>Footer (opcional)</label>
            <input value={form.footer_text} onChange={e => setForm(f => ({ ...f, footer_text: e.target.value }))}
              placeholder="3Cliques CRM" className="w-full h-9 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 h-9 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Cancelar</button>
            <button onClick={save} disabled={saving || !form.template_name || !form.body_text}
              className="px-5 h-9 rounded-xl text-sm font-bold" style={{ background: "#10B981", color: "#0a0a0a", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando..." : "Cadastrar template"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
        : templates.length === 0 ? (
          <div className="py-12 text-center rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm" style={{ color: "#939da4" }}>Nenhum template cadastrado.</p>
            <p className="text-xs mt-1" style={{ color: "rgba(147,157,164,0.4)" }}>Crie templates no Meta e depois cadastre aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(t => {
              const st = STATUS_BADGE[t.status] ?? STATUS_BADGE.pending;
              return (
                <div key={t.id} className="rounded-xl p-5" style={cardStyle}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${CATEGORY_COLORS[t.category]}15`, color: CATEGORY_COLORS[t.category] }}>
                        {t.category.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white font-mono">{t.template_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold" style={{ color: CATEGORY_COLORS[t.category] }}>{t.category}</span>
                          <span className="text-[10px]" style={{ color: "#939da4" }}>· {t.language_code}</span>
                          <span className="text-[10px]" style={{ color: "#939da4" }}>· {t.variables_count} variável(is)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: `${st.color}15` }}>{st.label}</span>
                      <button onClick={() => remove(t.id)}><Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.5)" }} /></button>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "#939da4" }}>{t.body_text}</p>
                  {t.footer_text && <p className="text-[10px] mt-2" style={{ color: "rgba(147,157,164,0.4)" }}>{t.footer_text}</p>}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
