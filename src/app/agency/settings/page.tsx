"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, CheckCircle, Eye, EyeOff, FileText, Webhook, Plus, Trash2 } from "lucide-react";
import {
  agencyCardStyle,
  agencyGhostButtonStyle,
  agencyInputClass,
  agencyInputStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPrimaryButtonStyle,
  agencySoftPanelStyle,
} from "@/app/agency/theme";

const AGENCY_EVENTS = [
  { id: "tenant.created", label: "Cliente criado" },
  { id: "tenant.suspended", label: "Cliente suspenso" },
  { id: "user.invited", label: "Usuário convidado" },
  { id: "limit.exceeded", label: "Limite atingido" },
  { id: "login_as", label: "Acesso de suporte iniciado" },
];

export default function AgencySettingsPage() {
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
    smtp_from_name: "",
  });
  const [legalForm, setLegalForm] = useState({ terms_url: "", privacy_url: "", docs_url: "" });
  const [savingLegal, setSavingLegal] = useState(false);
  const [savedLegal, setSavedLegal] = useState(false);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [showWHForm, setShowWHForm] = useState(false);
  const [whForm, setWhForm] = useState({ nome: "", url: "", eventos: [] as string[] });
  const [savingWH, setSavingWH] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from("agency_users")
        .select("agency_id, agencies(smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_from_name, terms_url, privacy_url, docs_url)")
        .eq("user_id", user.id)
        .single()
        .then(({ data }: { data: any }) => {
          if (!data) return;

          setAgencyId(data.agency_id);
          const agency = data.agencies as any;
          if (!agency) return;

          setForm({
            smtp_host: agency.smtp_host ?? "",
            smtp_port: String(agency.smtp_port ?? 587),
            smtp_user: agency.smtp_user ?? "",
            smtp_pass: agency.smtp_pass ?? "",
            smtp_from: agency.smtp_from ?? "",
            smtp_from_name: agency.smtp_from_name ?? "",
          });
          setLegalForm({
            terms_url: agency.terms_url ?? "",
            privacy_url: agency.privacy_url ?? "",
            docs_url: agency.docs_url ?? "",
          });
        });
    });

    fetch("/api/agency/webhooks").then((response) => response.json()).then((payload) => setWebhooks(payload.webhooks ?? []));
  }, []);

  async function saveLegal() {
    if (!agencyId) return;

    setSavingLegal(true);
    await createClient().from("agencies").update({
      terms_url: legalForm.terms_url || null,
      privacy_url: legalForm.privacy_url || null,
      docs_url: legalForm.docs_url || null,
    }).eq("id", agencyId);
    setSavingLegal(false);
    setSavedLegal(true);
    setTimeout(() => setSavedLegal(false), 3000);
  }

  async function saveWebhook() {
    if (!whForm.nome || !whForm.url || !whForm.eventos.length) return;

    setSavingWH(true);
    const response = await fetch("/api/agency/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(whForm),
    });
    const payload = await response.json();
    setSavingWH(false);
    if (payload.webhook) {
      setWebhooks((current) => [payload.webhook, ...current]);
      setShowWHForm(false);
      setWhForm({ nome: "", url: "", eventos: [] });
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Remover webhook?")) return;
    await fetch("/api/agency/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhook_id: id }),
    });
    setWebhooks((current) => current.filter((webhook) => webhook.id !== id));
  }

  function toggleEvento(id: string) {
    setWhForm((current) => ({
      ...current,
      eventos: current.eventos.includes(id)
        ? current.eventos.filter((eventId) => eventId !== id)
        : [...current.eventos, id],
    }));
  }

  async function save() {
    if (!agencyId) return;

    setSaving(true);
    await createClient().from("agencies").update({
      smtp_host: form.smtp_host || null,
      smtp_port: parseInt(form.smtp_port, 10) || 587,
      smtp_user: form.smtp_user || null,
      smtp_pass: form.smtp_pass || null,
      smtp_from: form.smtp_from || null,
      smtp_from_name: form.smtp_from_name || null,
    }).eq("id", agencyId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function testSmtp() {
    if (!form.smtp_host || !form.smtp_user || !form.smtp_pass) {
      setTestResult({ ok: false, msg: "Preencha host, usuário e senha antes de testar" });
      return;
    }

    setTesting(true);
    setTestResult(null);
    const response = await fetch("/api/agency/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, agency_id: agencyId }),
    });
    const payload = await response.json();
    setTesting(false);
    setTestResult({
      ok: payload.success,
      msg: payload.message ?? (payload.success ? "Email enviado com sucesso!" : "Falhou"),
    });
  }

  return (
    <div className="p-8 space-y-6 max-w-xl" style={agencyPageStyle}>
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Configurações</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Email e outras configurações da agência</p>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={agencyCardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>SMTP Customizado</h2>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Emails de convite e notificações saem do seu servidor. Sem configuração, usa o Resend da Liberty CRM.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Servidor SMTP</label>
            <input value={form.smtp_host} onChange={(event) => setForm((current) => ({ ...current, smtp_host: event.target.value }))} placeholder="smtp.seudominio.com.br" className={agencyInputClass} style={agencyInputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Porta</label>
            <input value={form.smtp_port} onChange={(event) => setForm((current) => ({ ...current, smtp_port: event.target.value }))} placeholder="587" className={agencyInputClass} style={agencyInputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Usuário</label>
            <input value={form.smtp_user} onChange={(event) => setForm((current) => ({ ...current, smtp_user: event.target.value }))} placeholder="noreply@agencia.com.br" className={agencyInputClass} style={agencyInputStyle} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Senha</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={form.smtp_pass} onChange={(event) => setForm((current) => ({ ...current, smtp_pass: event.target.value }))} placeholder="••••••••" className={`${agencyInputClass} pr-9`} style={agencyInputStyle} />
              <button onClick={() => setShowPass((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPass ? <EyeOff className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} /> : <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Email remetente</label>
            <input value={form.smtp_from} onChange={(event) => setForm((current) => ({ ...current, smtp_from: event.target.value }))} placeholder="noreply@agencia.com.br" className={agencyInputClass} style={agencyInputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Nome remetente</label>
            <input value={form.smtp_from_name} onChange={(event) => setForm((current) => ({ ...current, smtp_from_name: event.target.value }))} placeholder="Agência Digital" className={agencyInputClass} style={agencyInputStyle} />
          </div>
        </div>

        {testResult && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={agencyOutlineButtonStyle(testResult.ok ? "#9aea62" : "#f87171")}>
            {testResult.ok && <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#9aea62" }} />}
            <span className="text-xs font-medium" style={{ color: testResult.ok ? "#9aea62" : "#f87171" }}>{testResult.msg}</span>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={testSmtp} disabled={testing} className="px-4 h-8 rounded-xl text-xs font-bold" style={agencyGhostButtonStyle}>
            {testing ? "Testando..." : "Testar conexão"}
          </button>
          <button onClick={save} disabled={saving} className="px-5 h-8 rounded-xl text-xs font-bold" style={saved ? agencyOutlineButtonStyle("#9aea62") : agencyPrimaryButtonStyle}>
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar SMTP"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={agencyCardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Páginas legais e documentação</h2>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Links exibidos nas páginas de login e rodapés do sistema.</p>

        {[
          { key: "terms_url", label: "URL de Termos de Uso", placeholder: "https://agencia.com.br/termos" },
          { key: "privacy_url", label: "URL de Privacidade", placeholder: "https://agencia.com.br/privacidade" },
          { key: "docs_url", label: "URL de Documentação", placeholder: "https://docs.agencia.com.br" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>{label}</label>
            <input value={(legalForm as any)[key]} onChange={(event) => setLegalForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className={agencyInputClass} style={agencyInputStyle} />
          </div>
        ))}

        <div className="flex justify-end pt-1">
          <button onClick={saveLegal} disabled={savingLegal} className="px-5 h-8 rounded-xl text-xs font-bold" style={savedLegal ? agencyOutlineButtonStyle("#9aea62") : agencyPrimaryButtonStyle}>
            {savingLegal ? "Salvando..." : savedLegal ? "Salvo!" : "Salvar links"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={agencyCardStyle}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Webhooks da agência</h2>
          </div>
          <button onClick={() => setShowWHForm(!showWHForm)} className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-bold" style={agencyOutlineButtonStyle("#9aea62")}>
            <Plus className="w-3 h-3" />
            Novo
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Receba notificações quando seus clientes atingem eventos importantes.</p>

        {showWHForm && (
          <div className="rounded-xl p-4 space-y-3" style={agencySoftPanelStyle}>
            <input value={whForm.nome} onChange={(event) => setWhForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Nome do webhook" className={agencyInputClass} style={agencyInputStyle} />
            <input value={whForm.url} onChange={(event) => setWhForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://meuservidor.com/webhook" className={`${agencyInputClass} font-mono`} style={agencyInputStyle} />
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "var(--text-secondary)" }}>Eventos:</p>
              <div className="flex flex-wrap gap-2">
                {AGENCY_EVENTS.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => toggleEvento(event.id)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={
                      whForm.eventos.includes(event.id)
                        ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }
                        : agencyGhostButtonStyle
                    }
                  >
                    {event.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowWHForm(false)} className="px-4 h-8 rounded-xl text-xs" style={agencyGhostButtonStyle}>Cancelar</button>
              <button onClick={saveWebhook} disabled={savingWH || !whForm.nome || !whForm.url || !whForm.eventos.length} className="px-5 h-8 rounded-xl text-xs font-bold" style={{ ...agencyPrimaryButtonStyle, opacity: savingWH ? 0.6 : 1 }}>
                {savingWH ? "Salvando..." : "Salvar webhook"}
              </button>
            </div>
          </div>
        )}

        {webhooks.length === 0 && !showWHForm ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-faint)" }}>Nenhum webhook configurado.</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="rounded-xl px-4 py-3 flex items-center justify-between" style={agencySoftPanelStyle}>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{webhook.nome}</p>
                  <p className="text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>{webhook.url}</p>
                </div>
                <button onClick={() => deleteWebhook(webhook.id)} style={agencyGhostButtonStyle}>
                  <Trash2 className="w-4 h-4" style={{ color: "#f87171" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
