"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function AgencySettingsPage() {
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    smtp_host: "", smtp_port: "587", smtp_user: "",
    smtp_pass: "", smtp_from: "", smtp_from_name: "",
  });
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
        .select("agency_id, agencies(smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_from_name)")
        .eq("user_id", user.id).single()
        .then(({ data }: { data: any }) => {
          if (!data) return;
          setAgencyId(data.agency_id);
          const a = data.agencies as any;
          if (a) setForm({
            smtp_host: a.smtp_host ?? "",
            smtp_port: String(a.smtp_port ?? 587),
            smtp_user: a.smtp_user ?? "",
            smtp_pass: a.smtp_pass ?? "",
            smtp_from: a.smtp_from ?? "",
            smtp_from_name: a.smtp_from_name ?? "",
          });
        });
    });
  }, []);

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
    </div>
  );
}
