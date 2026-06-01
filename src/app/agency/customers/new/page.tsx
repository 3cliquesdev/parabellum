"use client";

import { useState } from "react";
import { ArrowLeft, Building2, Mail, CheckCircle, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function NewCustomerPage() {
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [invited, setInvited] = useState(false);
  const [copied, setCopied] = useState(false);

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app";
  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  async function create() {
    if (!form.name) { setError("Nome é obrigatório"); return; }
    setSaving(true); setError("");
    const r = await fetch("/api/agency/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (d.success) {
      setCreated({ id: d.tenant.id, name: d.tenant.name });
      setInviteEmail(form.email);
    } else {
      setError(d.error ?? "Erro ao criar cliente");
    }
  }

  async function sendInvite() {
    if (!created || !inviteEmail) return;
    setSending(true);
    await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: "owner", tenant_id: created.id }),
    });
    setSending(false);
    setInvited(true);
  }

  // Tela de sucesso pós-criação
  if (created) {
    return (
      <div className="p-8 max-w-xl space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
        <div className="rounded-2xl p-6 space-y-5 text-center" style={{ ...cardStyle, border: "1px solid rgba(154,234,98,0.2)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "rgba(154,234,98,0.1)" }}>
            <CheckCircle className="w-7 h-7" style={{ color: "#9aea62" }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-[-0.03em]">Workspace criado!</h2>
            <p className="text-sm mt-1" style={{ color: "#939da4" }}>
              <strong className="text-white">{created.name}</strong> está pronto. Agora envie o acesso ao cliente.
            </p>
          </div>

          {/* Enviar convite por email */}
          {!invited ? (
            <div className="space-y-3 text-left">
              <p className="text-xs font-bold text-white">Enviar acesso por email</p>
              <div className="flex gap-2">
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@cliente.com"
                  className="flex-1 h-9 px-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                <button onClick={sendInvite} disabled={sending || !inviteEmail}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold"
                  style={{ background: "#9aea62", color: "#0a0a0a", opacity: !inviteEmail ? 0.5 : 1 }}>
                  <Mail className="w-3.5 h-3.5" />
                  {sending ? "Enviando..." : "Enviar convite"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: "rgba(154,234,98,0.06)", border: "1px solid rgba(154,234,98,0.2)" }}>
              <CheckCircle className="w-4 h-4" style={{ color: "#9aea62" }} />
              <p className="text-xs font-bold" style={{ color: "#9aea62" }}>
                Convite enviado para {inviteEmail}!
              </p>
            </div>
          )}

          <div className="text-left space-y-2">
            <p className="text-xs font-bold" style={{ color: "#939da4" }}>Ou copie o link de captação da agência</p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="flex-1 text-xs font-mono truncate" style={{ color: "#9aea62" }}>
                {SITE_URL}/r/...
              </span>
              <button onClick={() => { navigator.clipboard.writeText(`${SITE_URL}/agency/links`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                {copied ? <><Check className="w-3 h-3 inline" /> Copiado</> : <><Copy className="w-3 h-3 inline" /> Copiar</>}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Link href={`/agency/customers/${created.id}`}
              className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center"
              style={{ background: "#9aea62", color: "#0a0a0a" }}>
              Ver cliente →
            </Link>
            <Link href="/agency/customers/new"
              onClick={() => { setCreated(null); setForm({ name: "", email: "" }); setInvited(false); }}
              className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
              + Criar outro
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-center gap-3">
        <Link href="/agency/customers" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#939da4" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Clientes
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Novo cliente</h1>
        <p className="text-sm mt-1" style={{ color: "#939da4" }}>Crie um workspace CRM para seu cliente</p>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Nome da empresa *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Empresa do João"
            className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Email do responsável</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="cliente@empresa.com"
            className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>O convite será enviado após criar o workspace</p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Link href="/agency/customers" className="px-4 h-9 rounded-xl text-sm inline-flex items-center" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
            Cancelar
          </Link>
          <button onClick={create} disabled={saving || !form.name}
            className="px-5 h-9 rounded-xl text-sm font-bold flex items-center gap-2"
            style={{ background: saving || !form.name ? "rgba(154,234,98,0.3)" : "#9aea62", color: "#0a0a0a" }}>
            <Building2 className="w-4 h-4" />
            {saving ? "Criando..." : "Criar workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
