"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, CheckCircle, Eye, EyeOff, FileText, Webhook, Plus, Trash2, Send } from "lucide-react";

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
    smtp_host: "", smtp_port: "587", smtp_user: "",
    smtp_pass: "", smtp_from: "", smtp_from_name: "",
  });
  const [legalForm, setLegalForm] = useState({ terms_url: "", privacy_url: "", docs_url: "" });
  const [savingLegal, setSavingLegal] = useState(false); const [savedLegal, setSavedLegal] = useState(false);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [showWHForm, setShowWHForm] = useState(false);
  const [whForm, setWhForm] = useState({ nome: "", url: "", eventos: [] as string[] });
  const [savingWH, setSavingWH] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showPass, setShowPass] = useState(false);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("agency_users")
        .select("agency_id, agencies(smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_from_name, terms_url, privacy_url, docs_url)")
        .eq("user_id", user.id).single()
        .then(({ data }: { data: any }) => {
          if (!data) return;
          setAgencyId(data.agency_id);
          const a = data.agencies as any;
          if (a) {
            setForm({ smtp_host: a.smtp_host ?? "", smtp_port: String(a.smtp_port ?? 587), smtp_user: a.smtp_user ?? "", smtp_pass: a.smtp_pass ?? "", smtp_from: a.smtp_from ?? "", smtp_from_name: a.smtp_from_name ?? "" });
            setLegalForm({ terms_url: a.terms_url ?? "", privacy_url: a.privacy_url ?? "", docs_url: a.docs_url ?? "" });
          }
        });
    });
    fetch("/api/agency/webhooks").then(r => r.json()).then(d => setWebhooks(d.webhooks ?? []));
  }, []);

  async function saveLegal() {
    if (!agencyId) return; setSavingLegal(true);
    await createClient().from("agencies").update({ terms_url: legalForm.terms_url || null, privacy_url: legalForm.privacy_url || null, docs_url: legalForm.docs_url || null }).eq("id", agencyId);
    setSavingLegal(false); setSavedLegal(true); setTimeout(() => setSavedLegal(false), 3000);
  }

  async function saveWebhook() {
    if (!whForm.nome || !whForm.url || !whForm.eventos.length) return; setSavingWH(true);
    const r = await fetch("/api/agency/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(whForm) });
    const d = await r.json(); setSavingWH(false);
    if (d.webhook) { setWebhooks(w => [d.webhook, ...w]); setShowWHForm(false); setWhForm({ nome: "", url: "", eventos: [] }); }
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Remover webhook?")) return;
    await fetch("/api/agency/webhooks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhook_id: id }) });
    setWebhooks(w => w.filter(x => x.id !== id));
  }

  function toggleEvento(id: string) {
    setWhForm(f => ({ ...f, eventos: f.eventos.includes(id) ? f.eventos.filter(e => e !== id) : [...f.eventos, id] }));
  }

  async function save() {
    if (!agencyId) return;
    setSaving(true);
    await createClient().from("agencies").update({
      smtp_host: form.smtp_host || null,
      smtp_port: parseInt(form.smtp_port) || 587,
      smtp_user: form.smtp_user || null,
      smtp_pass: form.smtp_pass || null,
      smtp_from: form.smtp_from || null,
      smtp_from_name: form.smtp_from_name || null,
    }).eq("id", agencyId);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  async function testSmtp() {
    if (!form.smtp_host || !form.smtp_user || !form.smtp_pass) {
      setTestResult({ ok: false, msg: "Preencha host, usuário e senha antes de testar" });
      return;
    }
    setTesting(true); setTestResult(null);
    const r = await fetch("/api/agency/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, agency_id: agencyId }),
    });
    const d = await r.json();
    setTesting(false);
    setTestResult({ ok: d.success, msg: d.message ?? (d.success ? "Email enviado com sucesso!" : "Falhou") });
  }

  const inputClass = "w-full h-9 px-3 rounded-xl text-sm text-white outline-none";
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <div className="p-8 space-y-6 max-w-xl" style={{ fontFamily: "var(--font-sans)" }}>
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Configurações</h1>
        <p className="text-sm mt-1" style={{ color: "#939da4" }}>Email e outras configurações da agência</p>
      </div>

      {/* SMTP */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4" style={{ color: "#9aea62" }} />
          <h2 className="text-sm font-bold text-white">SMTP Customizado</h2>
        </div>
        <p className="text-xs" style={{ color: "#939da4" }}>
          Emails de convite e notificações saem do seu servidor. Sem configuração, usa o Resend da Liberty CRM.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Servidor SMTP</label>
            <input value={form.smtp_host} onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))}
              placeholder="smtp.seudominio.com.br" className={inputClass} style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Porta</label>
            <input value={form.smtp_port} onChange={e => setForm(f => ({ ...f, smtp_port: e.target.value }))}
              placeholder="587" className={inputClass} style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Usuário</label>
            <input value={form.smtp_user} onChange={e => setForm(f => ({ ...f, smtp_user: e.target.value }))}
              placeholder="noreply@agencia.com.br" className={inputClass} style={inputStyle} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Senha</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={form.smtp_pass}
                onChange={e => setForm(f => ({ ...f, smtp_pass: e.target.value }))}
                placeholder="••••••••" className={`${inputClass} pr-9`} style={inputStyle} />
              <button onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPass ? <EyeOff className="w-3.5 h-3.5" style={{ color: "#939da4" }} /> : <Eye className="w-3.5 h-3.5" style={{ color: "#939da4" }} />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Email remetente</label>
            <input value={form.smtp_from} onChange={e => setForm(f => ({ ...f, smtp_from: e.target.value }))}
              placeholder="noreply@agencia.com.br" className={inputClass} style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Nome remetente</label>
            <input value={form.smtp_from_name} onChange={e => setForm(f => ({ ...f, smtp_from_name: e.target.value }))}
              placeholder="Agência Digital" className={inputClass} style={inputStyle} />
          </div>
        </div>

        {testResult && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: testResult.ok ? "rgba(154,234,98,0.06)" : "rgba(248,113,113,0.06)", border: `1px solid ${testResult.ok ? "rgba(154,234,98,0.2)" : "rgba(248,113,113,0.2)"}` }}>
            {testResult.ok && <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#9aea62" }} />}
            <span className="text-xs font-medium" style={{ color: testResult.ok ? "#9aea62" : "#f87171" }}>{testResult.msg}</span>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={testSmtp} disabled={testing}
            className="px-4 h-8 rounded-xl text-xs font-bold"
            style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
            {testing ? "Testando..." : "Testar conexão"}
          </button>
          <button onClick={save} disabled={saving}
            className="px-5 h-8 rounded-xl text-xs font-bold"
            style={{ background: saved ? "rgba(154,234,98,0.1)" : "#9aea62", color: saved ? "#9aea62" : "#0a0a0a" }}>
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar SMTP"}
          </button>
        </div>
      </div>
      {/* Termos, Privacidade e Docs */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4" style={{ color: "#9aea62" }} />
          <h2 className="text-sm font-bold text-white">Páginas legais e documentação</h2>
        </div>
        <p className="text-xs" style={{ color: "#939da4" }}>Links exibidos nas páginas de login e rodapés do sistema.</p>
        {[
          { key: "terms_url", label: "URL de Termos de Uso", placeholder: "https://agencia.com.br/termos" },
          { key: "privacy_url", label: "URL de Privacidade", placeholder: "https://agencia.com.br/privacidade" },
          { key: "docs_url", label: "URL de Documentação", placeholder: "https://docs.agencia.com.br" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>{label}</label>
            <input value={(legalForm as any)[key]} onChange={e => setLegalForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder} className={inputClass} style={inputStyle} />
          </div>
        ))}
        <div className="flex justify-end pt-1">
          <button onClick={saveLegal} disabled={savingLegal}
            className="px-5 h-8 rounded-xl text-xs font-bold"
            style={{ background: savedLegal ? "rgba(154,234,98,0.1)" : "#9aea62", color: savedLegal ? "#9aea62" : "#0a0a0a" }}>
            {savingLegal ? "Salvando..." : savedLegal ? "Salvo!" : "Salvar links"}
          </button>
        </div>
      </div>

      {/* Webhooks por agência */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4" style={{ color: "#9aea62" }} />
            <h2 className="text-sm font-bold text-white">Webhooks da agência</h2>
          </div>
          <button onClick={() => setShowWHForm(!showWHForm)} className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-bold"
            style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
            <Plus className="w-3 h-3" /> Novo
          </button>
        </div>
        <p className="text-xs" style={{ color: "#939da4" }}>Receba notificações quando seus clientes atingem eventos importantes.</p>

        {showWHForm && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <input value={whForm.nome} onChange={e => setWhForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do webhook"
              className={inputClass} style={inputStyle} />
            <input value={whForm.url} onChange={e => setWhForm(f => ({ ...f, url: e.target.value }))} placeholder="https://meuservidor.com/webhook"
              className={`${inputClass} font-mono`} style={inputStyle} />
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#939da4" }}>Eventos:</p>
              <div className="flex flex-wrap gap-2">
                {AGENCY_EVENTS.map(ev => (
                  <button key={ev.id} onClick={() => toggleEvento(ev.id)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={whForm.eventos.includes(ev.id)
                      ? { background: "rgba(154,234,98,0.15)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.3)" }
                      : { background: "rgba(255,255,255,0.04)", color: "#939da4", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowWHForm(false)} className="px-4 h-8 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Cancelar</button>
              <button onClick={saveWebhook} disabled={savingWH || !whForm.nome || !whForm.url || !whForm.eventos.length}
                className="px-5 h-8 rounded-xl text-xs font-bold" style={{ background: "#9aea62", color: "#0a0a0a", opacity: savingWH ? 0.6 : 1 }}>
                {savingWH ? "Salvando..." : "Salvar webhook"}
              </button>
            </div>
          </div>
        )}

        {webhooks.length === 0 && !showWHForm ? (
          <p className="text-xs text-center py-4" style={{ color: "rgba(147,157,164,0.4)" }}>Nenhum webhook configurado.</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map(wh => (
              <div key={wh.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <p className="text-xs font-bold text-white">{wh.nome}</p>
                  <p className="text-[10px] font-mono truncate max-w-xs" style={{ color: "#939da4" }}>{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(wh.eventos ?? []).map((ev: string) => (
                      <span key={ev} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(154,234,98,0.08)", color: "#9aea62" }}>
                        {AGENCY_EVENTS.find(e => e.id === ev)?.label ?? ev}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => deleteWebhook(wh.id)}>
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.5)" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
