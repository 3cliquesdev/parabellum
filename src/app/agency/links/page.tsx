"use client";

import { useEffect, useState } from "react";
import { Link2, Plus, Copy, Check, Trash2, MousePointer, UserCheck } from "lucide-react";
import {
  agencyCardStyle,
  agencyGhostButtonStyle,
  agencyInputClass,
  agencyInputStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPanelStyle,
  agencyPrimaryButtonStyle,
  agencyPrimaryPanelStyle,
} from "@/app/agency/theme";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app";

export default function LinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agency/referral-links").then((response) => response.json()).then((payload) => {
      setLinks(payload.links ?? []);
      setLoading(false);
    });
  }, []);

  async function createLink() {
    if (!form.slug) return;

    setSaving(true);
    const response = await fetch("/api/agency/referral-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    setSaving(false);

    if (payload.link) {
      setLinks((current) => [payload.link, ...current]);
      setShowForm(false);
      setForm({ nome: "", slug: "" });
      return;
    }

    alert(payload.error ?? "Erro ao criar link");
  }

  async function deleteLink(id: string) {
    if (!confirm("Desativar este link?")) return;

    await fetch("/api/agency/referral-links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link_id: id }),
    });
    setLinks((current) => current.filter((link) => link.id !== id));
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${siteUrl}/r/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-8 space-y-6" style={agencyPageStyle}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Links de captação</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Compartilhe esses links para atrair novos clientes já vinculados à sua agência
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold" style={agencyOutlineButtonStyle("#9aea62")}>
          <Plus className="w-4 h-4" />
          Novo link
        </button>
      </div>

      <div className="rounded-xl p-4" style={agencyPrimaryPanelStyle}>
        <p className="text-xs font-bold mb-1" style={{ color: "var(--status-ganho)" }}>Como funciona</p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Quando um prospect clica no seu link e se cadastra, o workspace dele é automaticamente vinculado à sua agência.
          Você verá o novo cliente no dashboard e pode configurar a cobrança imediatamente.
        </p>
      </div>

      {showForm && (
        <div className="rounded-2xl p-5 space-y-3" style={agencyCardStyle}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Novo link de captação</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Nome do link</label>
              <input
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Ex: Link do Instagram"
                className={agencyInputClass}
                style={agencyInputStyle}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Slug (aparece na URL)</label>
              <div className="flex items-center gap-1 h-9 px-3 rounded-xl" style={agencyInputStyle}>
                <span className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>/r/</span>
                <input
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                  placeholder="minha-agencia"
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 h-8 rounded-xl text-xs" style={agencyGhostButtonStyle}>Cancelar</button>
            <button onClick={createLink} disabled={saving || !form.slug} className="px-5 h-8 rounded-xl text-xs font-bold" style={{ ...agencyPrimaryButtonStyle, opacity: !form.slug ? 0.5 : 1 }}>
              {saving ? "Criando..." : "Criar link"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--text-secondary)" }} />
        </div>
      ) : links.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={agencyPanelStyle}>
          <Link2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum link ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="rounded-2xl p-5" style={agencyCardStyle}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{link.nome ?? link.slug}</p>
                  <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "var(--status-ganho)" }}>
                    {siteUrl}/r/{link.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button onClick={() => copyLink(link.slug)} className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-bold" style={agencyOutlineButtonStyle("#9aea62")}>
                    {copied === link.slug ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar</>}
                  </button>
                  <button onClick={() => deleteLink(link.id)} style={agencyGhostButtonStyle}>
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-1.5">
                  <MousePointer className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{link.clicks ?? 0} cliques</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3" style={{ color: "var(--status-ganho)" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>{link.conversions ?? 0} cadastros</span>
                </div>
                <span className="text-[10px] ml-auto" style={{ color: "var(--text-faint)" }}>
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
