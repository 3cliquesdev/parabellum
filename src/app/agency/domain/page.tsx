"use client";

import { useEffect, useState } from "react";
import { Globe, CheckCircle, Clock, AlertCircle, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Pendente", color: "#939da4", icon: Clock },
  verifying: { label: "Verificando DNS...", color: "#facc15", icon: Clock },
  active:    { label: "Ativo", color: "#9aea62", icon: CheckCircle },
  failed:    { label: "Falhou", color: "#f87171", icon: AlertCircle },
  disabled:  { label: "Desativado", color: "#939da4", icon: AlertCircle },
};

export default function DomainPage() {
  const [agency, setAgency] = useState<any>(null);
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("agency_users").select("agency_id, agencies(custom_domain, domain_status, slug)")
        .eq("user_id", user.id).single().then(({ data }: { data: any }) => {
          if (data) { setAgency({ id: data.agency_id, ...data.agencies }); setDomain(data.agencies?.custom_domain ?? ""); }
        });
    });
  }, []);

  async function addDomain() {
    if (!domain) return;
    setSaving(true); setError("");
    const r = await fetch("/api/agency/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const d = await r.json();
    setSaving(false);
    if (d.error) setError(d.error);
    else setAgency((a: any) => ({ ...a, custom_domain: domain, domain_status: "verifying" }));
  }

  const status = STATUS_CONFIG[agency?.domain_status ?? "pending"];
  const StatusIcon = status.icon;

  return (
    <div className="p-8 space-y-6 max-w-xl" style={{ fontFamily: "var(--font-sans)" }}>
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Domínio personalizado</h1>
        <p className="text-sm mt-1" style={{ color: "#939da4" }}>Use seu próprio domínio para o CRM dos seus clientes</p>
      </div>

      {/* Status atual */}
      {agency?.custom_domain && (
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: `${status.color}10`, border: `1px solid ${status.color}30` }}>
          <StatusIcon className="w-4 h-4 shrink-0" style={{ color: status.color }} />
          <div>
            <p className="text-sm font-bold" style={{ color: status.color }}>{agency.custom_domain}</p>
            <p className="text-xs" style={{ color: "rgba(147,157,164,0.6)" }}>{status.label}</p>
          </div>
        </div>
      )}

      {/* Configurar domínio */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h2 className="text-sm font-bold text-white">
          {agency?.custom_domain ? "Alterar domínio" : "Adicionar domínio"}
        </h2>

        <div className="flex gap-2">
          <input value={domain} onChange={e => setDomain(e.target.value)}
            placeholder="crm.minhaagencia.com.br"
            className="flex-1 h-10 px-3 rounded-xl text-sm text-white outline-none font-mono"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <button onClick={addDomain} disabled={saving || !domain}
            className="px-4 h-10 rounded-xl text-sm font-bold"
            style={{ background: saving ? "rgba(154,234,98,0.3)" : "#9aea62", color: "#0a0a0a" }}>
            {saving ? "..." : "Salvar"}
          </button>
        </div>

        {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
      </div>

      {/* Instruções DNS */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h2 className="text-sm font-bold text-white">Configurar DNS</h2>
        <p className="text-xs" style={{ color: "#939da4" }}>
          Adicione o registro abaixo no painel DNS do seu provedor (ex: Cloudflare, GoDaddy, Registro.br):
        </p>

        <div className="rounded-xl p-4 font-mono text-xs space-y-2" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-[10px] mb-1" style={{ color: "rgba(147,157,164,0.5)" }}>TIPO</p><p className="text-white font-bold">CNAME</p></div>
            <div><p className="text-[10px] mb-1" style={{ color: "rgba(147,157,164,0.5)" }}>NOME</p><p className="text-white">{domain ? domain.split(".")[0] : "crm"}</p></div>
            <div>
              <p className="text-[10px] mb-1" style={{ color: "rgba(147,157,164,0.5)" }}>DESTINO</p>
              <div className="flex items-center gap-1.5">
                <p className="text-white truncate">cname.vercel-dns.com</p>
                <button onClick={() => { navigator.clipboard.writeText("cname.vercel-dns.com"); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? <Check className="w-3 h-3" style={{ color: "#9aea62" }} /> : <Copy className="w-3 h-3" style={{ color: "#939da4" }} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.4)" }}>
          ⚠️ A propagação DNS pode levar até 48h. Após configurar, o status mudará para "Ativo" automaticamente.
        </p>
      </div>
    </div>
  );
}
