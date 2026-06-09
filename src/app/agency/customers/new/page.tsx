"use client";

import { useState } from "react";
import { ArrowLeft, Building2, Mail, CheckCircle, Copy, Check } from "lucide-react";
import Link from "next/link";
import {
  agencyCardStrongStyle,
  agencyCardStyle,
  agencyGhostButtonStyle,
  agencyInputClass,
  agencyInputStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPrimaryButtonStyle,
} from "@/app/agency/theme";

export default function NewCustomerPage() {
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [invited, setInvited] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app";

  async function create() {
    if (!form.name) {
      setError("Nome é obrigatório");
      return;
    }

    setSaving(true);
    setError("");

    const response = await fetch("/api/agency/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();

    setSaving(false);
    if (payload.success) {
      setCreated({ id: payload.tenant.id, name: payload.tenant.name });
      setInviteEmail(form.email);
      return;
    }

    setError(payload.error ?? "Erro ao criar cliente");
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

  if (created) {
    return (
      <div className="p-8 max-w-xl space-y-6" style={agencyPageStyle}>
        <div className="rounded-2xl p-6 space-y-5 text-center" style={agencyCardStrongStyle}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--primary-bg)" }}>
            <CheckCircle className="w-7 h-7" style={{ color: "var(--status-ganho)" }} />
          </div>

          <div>
            <h2 className="text-xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Workspace criado!</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>{created.name}</strong> está pronto. Agora envie o acesso ao cliente.
            </p>
          </div>

          {!invited ? (
            <div className="space-y-3 text-left">
              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Enviar acesso por email</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="email@cliente.com"
                  className={`${agencyInputClass} flex-1`}
                  style={agencyInputStyle}
                />
                <button
                  onClick={sendInvite}
                  disabled={sending || !inviteEmail}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold"
                  style={{ ...agencyPrimaryButtonStyle, opacity: !inviteEmail ? 0.5 : 1 }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  {sending ? "Enviando..." : "Enviar convite"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={agencyOutlineButtonStyle("#9aea62")}>
              <CheckCircle className="w-4 h-4" style={{ color: "#9aea62" }} />
              <p className="text-xs font-bold" style={{ color: "#9aea62" }}>
                Convite enviado para {inviteEmail}!
              </p>
            </div>
          )}

          <div className="text-left space-y-2">
            <p className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Ou copie o link de captação da agência</p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={agencyCardStyle}>
              <span className="flex-1 text-xs font-mono truncate" style={{ color: "var(--status-ganho)" }}>
                {siteUrl}/r/...
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${siteUrl}/agency/links`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={agencyOutlineButtonStyle("#9aea62")}
              >
                {copied ? <><Check className="w-3 h-3 inline" /> Copiado</> : <><Copy className="w-3 h-3 inline" /> Copiar</>}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Link
              href={`/agency/customers/${created.id}`}
              className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center"
              style={agencyPrimaryButtonStyle}
            >
              Ver cliente →
            </Link>
            <Link
              href="/agency/customers/new"
              onClick={() => {
                setCreated(null);
                setForm({ name: "", email: "" });
                setInvited(false);
              }}
              className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center"
              style={agencyGhostButtonStyle}
            >
              + Criar outro
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl space-y-6" style={agencyPageStyle}>
      <div className="flex items-center gap-3">
        <Link href="/agency/customers" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Clientes
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Novo cliente</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Crie um workspace CRM para seu cliente</p>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={agencyCardStyle}>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Nome da empresa *</label>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ex: Empresa do João"
            className={`${agencyInputClass} h-10`}
            style={agencyInputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Email do responsável</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="cliente@empresa.com"
            className={`${agencyInputClass} h-10`}
            style={agencyInputStyle}
          />
          <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>O convite será enviado após criar o workspace</p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg text-xs font-medium" style={agencyOutlineButtonStyle("#f87171")}>
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Link href="/agency/customers" className="px-4 h-9 rounded-xl text-sm inline-flex items-center" style={agencyGhostButtonStyle}>
            Cancelar
          </Link>
          <button
            onClick={create}
            disabled={saving || !form.name}
            className="px-5 h-9 rounded-xl text-sm font-bold flex items-center gap-2"
            style={{ ...agencyPrimaryButtonStyle, opacity: saving || !form.name ? 0.5 : 1 }}
          >
            <Building2 className="w-4 h-4" />
            {saving ? "Criando..." : "Criar workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
