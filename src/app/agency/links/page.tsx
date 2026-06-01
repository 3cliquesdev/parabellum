"use client";

import { useEffect, useState } from "react";
import { Link2, Plus, Copy, Check, Trash2, MousePointer, UserCheck } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app";

export default function LinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    fetch("/api/agency/referral-links").then(r => r.json()).then(d => { setLinks(d.links ?? []); setLoading(false); });
  }, []);

  async function createLink() {
    if (!form.slug) return; setSaving(true);
    const r = await fetch("/api/agency/referral-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json(); setSaving(false);
    if (d.link) { setLinks(l => [d.link, ...l]); setShowForm(false); setForm({ nome: "", slug: "" }); }
    else alert(d.error ?? "Erro ao criar link");
  }

  async function deleteLink(id: string) {
    if (!confirm("Desativar este link?")) return;
    await fetch("/api/agency/referral-links", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ link_id: id }) });
    setLinks(l => l.filter(x => x.id !== id));
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${SITE_URL}/r/${slug}`);
    setCopied(slug); setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Links de captação</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Compartilhe esses links para atrair novos clientes já vinculados à sua agência</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
          <Plus className="w-4 h-4" /> Novo link
        </button>
      </div>

      {/* Como funciona */}
      <div className="rounded-xl p-4" style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.1)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "#9aea62" }}>Como funciona</p>
        <p className="text-xs" style={{ color: "#939da4" }}>
          Quando um prospect clica no seu link e se cadastra, o workspace dele é automaticamente vinculado à sua agência.
          Você verá o novo cliente no dashboard e pode configurar a cobrança imediatamente.
        </p>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
          <h2 className="text-sm font-bold text-white">Novo link de captação</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: "#939da4" }}>Nome do link</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Link do Instagram"
                className="w-full h-9 px-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: "#939da4" }}>Slug (aparece na URL)</label>
              <div className="flex items-center gap-1 h-9 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xs shrink-0" style={{ color: "rgba(147,157,164,0.5)" }}>/r/</span>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                  placeholder="minha-agencia" className="flex-1 text-sm text-white outline-none bg-transparent" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 h-8 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Cancelar</button>
            <button onClick={createLink} disabled={saving || !form.slug} className="px-5 h-8 rounded-xl text-xs font-bold"
              style={{ background: "#9aea62", color: "#0a0a0a", opacity: !form.slug ? 0.5 : 1 }}>
              {saving ? "Criando..." : "Criar link"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de links */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
      ) : links.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <Link2 className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(147,157,164,0.3)" }} />
          <p className="text-sm" style={{ color: "#939da4" }}>Nenhum link ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{link.nome ?? link.slug}</p>
                  <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "#9aea62" }}>
                    {SITE_URL}/r/{link.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button onClick={() => copyLink(link.slug)} className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                    {copied === link.slug ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar</>}
                  </button>
                  <button onClick={() => deleteLink(link.id)}><Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.4)" }} /></button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1.5">
                  <MousePointer className="w-3 h-3" style={{ color: "#939da4" }} />
                  <span className="text-xs" style={{ color: "#939da4" }}>{link.clicks ?? 0} cliques</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3" style={{ color: "#9aea62" }} />
                  <span className="text-xs font-bold" style={{ color: "#9aea62" }}>{link.conversions ?? 0} cadastros</span>
                </div>
                <span className="text-[10px] ml-auto" style={{ color: "rgba(147,157,164,0.4)" }}>
                  {new Date(link.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
