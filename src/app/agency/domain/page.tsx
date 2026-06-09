"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, CheckCircle, Clock, Copy, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  agencyBadgeStyle,
  agencyCardStyle,
  agencyGhostButtonStyle,
  agencyInputClass,
  agencyInputStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPrimaryButtonStyle,
} from "@/app/agency/theme";

type DomainStatus = "pending" | "verifying" | "active" | "failed" | "disabled";

interface AgencyDomainState {
  id: string;
  custom_domain: string | null;
  domain_status: DomainStatus;
  slug?: string | null;
}

interface AgencyDomainQueryRow {
  agency_id: string;
  agencies?: {
    custom_domain?: string | null;
    domain_status?: DomainStatus | null;
    slug?: string | null;
  } | null;
}

interface DomainApiResponse {
  error?: string;
}

const STATUS_CONFIG: Record<DomainStatus, { label: string; color: string; icon: LucideIcon }> = {
  pending: { label: "Pendente", color: "#939da4", icon: Clock },
  verifying: { label: "Verificando DNS...", color: "#facc15", icon: Clock },
  active: { label: "Ativo", color: "#9aea62", icon: CheckCircle },
  failed: { label: "Falhou", color: "#f87171", icon: AlertCircle },
  disabled: { label: "Desativado", color: "#939da4", icon: AlertCircle },
};

export default function DomainPage() {
  const [agency, setAgency] = useState<AgencyDomainState | null>(null);
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      void supabase
        .from("agency_users")
        .select("agency_id, agencies(custom_domain, domain_status, slug)")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          const result = data as AgencyDomainQueryRow | null;
          if (!result?.agencies) return;

          const nextAgency: AgencyDomainState = {
            id: result.agency_id,
            custom_domain: result.agencies.custom_domain ?? null,
            domain_status: result.agencies.domain_status ?? "pending",
            slug: result.agencies.slug ?? null,
          };

          setAgency(nextAgency);
          setDomain(nextAgency.custom_domain ?? "");
        });
    });
  }, []);

  async function addDomain() {
    if (!domain) return;

    setSaving(true);
    setError("");

    const response = await fetch("/api/agency/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = (await response.json()) as DomainApiResponse;

    setSaving(false);
    if (data.error) {
      setError(data.error);
      return;
    }

    setAgency((currentAgency) =>
      currentAgency
        ? { ...currentAgency, custom_domain: domain, domain_status: "verifying" }
        : null
    );
  }

  const status = STATUS_CONFIG[agency?.domain_status ?? "pending"];
  const StatusIcon = status.icon;

  return (
    <div className="p-8 space-y-6 max-w-xl" style={agencyPageStyle}>
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Domínio personalizado</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Use seu próprio domínio para o CRM dos seus clientes
        </p>
      </div>

      {agency?.custom_domain && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={agencyOutlineButtonStyle(status.color)}>
          <StatusIcon className="w-4 h-4 shrink-0" style={{ color: status.color }} />
          <div>
            <p className="text-sm font-bold" style={{ color: status.color }}>{agency.custom_domain}</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{status.label}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-6 space-y-4" style={agencyCardStyle}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {agency?.custom_domain ? "Alterar domínio" : "Adicionar domínio"}
        </h2>

        <div className="flex gap-2">
          <input
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="crm.minhaagencia.com.br"
            className={`${agencyInputClass} flex-1 font-mono h-10`}
            style={agencyInputStyle}
          />
          <button onClick={addDomain} disabled={saving || !domain} className="px-4 h-10 rounded-xl text-sm font-bold" style={{ ...agencyPrimaryButtonStyle, opacity: !domain ? 0.5 : 1 }}>
            {saving ? "..." : "Salvar"}
          </button>
        </div>

        {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={agencyCardStyle}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Configurar DNS</h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Adicione o registro abaixo no painel DNS do seu provedor (ex: Cloudflare, GoDaddy, Registro.br):
        </p>

        <div className="rounded-xl p-4 font-mono text-xs space-y-2" style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)" }}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] mb-1" style={{ color: "var(--text-faint)" }}>TIPO</p>
              <p style={{ color: "var(--text-primary)" }} className="font-bold">CNAME</p>
            </div>
            <div>
              <p className="text-[10px] mb-1" style={{ color: "var(--text-faint)" }}>NOME</p>
              <p style={{ color: "var(--text-primary)" }}>{domain ? domain.split(".")[0] : "crm"}</p>
            </div>
            <div>
              <p className="text-[10px] mb-1" style={{ color: "var(--text-faint)" }}>DESTINO</p>
              <div className="flex items-center gap-1.5">
                <p className="truncate" style={{ color: "var(--text-primary)" }}>cname.vercel-dns.com</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("cname.vercel-dns.com");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={agencyGhostButtonStyle}
                >
                  {copied ? <Check className="w-3 h-3" style={{ color: "#9aea62" }} /> : <Copy className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
          A propagação DNS pode levar até 48h. Após configurar, o status mudará para &quot;Ativo&quot; automaticamente.
        </p>
      </div>
    </div>
  );
}
