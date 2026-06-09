"use client";

import { useEffect, useState } from "react";
import { CreditCard, CheckCircle } from "lucide-react";
import Link from "next/link";
import {
  agencyBadgeStyle,
  agencyCardStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPrimaryButtonStyle,
  agencyPrimaryPanelStyle,
} from "@/app/agency/theme";

const PLANS = [
  { id: "starter", name: "Starter", price: "R$ 497", period: "/mês", tenants: 5, ai: "10.000", msgs: "50.000", highlight: false },
  { id: "growth", name: "Growth", price: "R$ 1.497", period: "/mês", tenants: 20, ai: "50.000", msgs: "250.000", highlight: true },
  { id: "scale", name: "Scale", price: "R$ 2.997", period: "/mês", tenants: 50, ai: "200.000", msgs: "1.000.000", highlight: false },
];

export default function BillingPage() {
  const [agencyData, setAgencyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agency/stats").then((response) => response.json()).then((payload) => {
      setAgencyData(payload);
      setLoading(false);
    });
  }, []);

  const agency = agencyData?.agency;
  const plan = agencyData?.plan;
  const totals = agencyData?.totals ?? {};
  const currentPlanId = agency?.plan ?? "starter";

  const trialDaysLeft = agency?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(agency.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="p-8 space-y-6 max-w-3xl" style={agencyPageStyle}>
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Meu Plano</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Seu plano com a Liberty CRM</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={agencyOutlineButtonStyle("#60a5fa")}>
          <p className="text-xs font-bold mb-1" style={{ color: "#60a5fa" }}>Estes são os planos que você paga à Liberty CRM</p>
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            Dão acesso à plataforma e definem seus limites de clientes e uso de IA.
          </p>
        </div>
        <Link href="/agency/billing-clients" className="rounded-xl p-4 transition-all" style={agencyPrimaryPanelStyle}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--status-ganho)" }}>Cobranças dos seus clientes →</p>
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            Defina o que cada cliente paga à sua agência por usar o CRM.
          </p>
        </Link>
      </div>

      {!loading && (
        <div className="rounded-2xl p-5" style={agencyCardStyle}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Plano atual: <span style={{ color: "var(--status-ganho)" }}>{plan?.display_name ?? "Starter"}</span>
              </p>
              {agency?.payment_status === "trial" ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={agencyBadgeStyle("#facc15")}>
                    Trial ativo
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{trialDaysLeft} dias restantes</span>
                </div>
              ) : (
                <span
                  className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full font-bold"
                  style={agencyBadgeStyle(agency?.payment_status === "active" ? "#9aea62" : "#f87171")}
                >
                  {agency?.payment_status === "active" ? "Ativo" : agency?.payment_status === "past_due" ? "Pagamento em atraso" : "Cancelado"}
                </span>
              )}
            </div>
            <CreditCard className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            {[
              { label: "Clientes", used: totals.tenants ?? 0, max: totals.max_tenants ?? 10 },
              { label: "IA/mês", used: totals.ai_calls_this_month ?? 0, max: plan?.max_ai_calls_per_month ?? 10000 },
              { label: "Mensagens/mês", used: totals.messages_this_month ?? 0, max: plan?.max_messages_per_month ?? 50000 },
            ].map(({ label, used, max }) => {
              const pct = Math.min(Math.round((used / max) * 100), 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                    <span style={{ color: pct >= 80 ? "#f87171" : "var(--text-secondary)" }}>
                      {used.toLocaleString("pt-BR")} / {max.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--ghost-bg)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? "#f87171" : pct >= 60 ? "#facc15" : "#9aea62" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Planos disponíveis</h2>
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((planItem) => (
          <div
            key={planItem.id}
            className="rounded-2xl p-5 flex flex-col"
            style={planItem.highlight ? { ...agencyCardStyle, border: "1px solid var(--primary-border)", background: "linear-gradient(180deg, var(--primary-bg) 0%, var(--surface-gradient) 100%)" } : agencyCardStyle}
          >
            {planItem.highlight && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full self-start mb-2" style={agencyPrimaryButtonStyle}>
                MAIS POPULAR
              </span>
            )}
            <p className="text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>{planItem.name}</p>
            <p className="text-xl font-extrabold mt-1" style={{ color: planItem.highlight ? "var(--status-ganho)" : "var(--text-primary)" }}>
              {planItem.price}
              <span className="text-xs font-normal ml-1" style={{ color: "var(--text-secondary)" }}>{planItem.period}</span>
            </p>
            <div className="space-y-1.5 mt-4 flex-1">
              {[`${planItem.tenants} clientes`, `${planItem.ai} chamadas IA/mês`, `${planItem.msgs} msgs/mês`].map((feature) => (
                <div key={feature} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 shrink-0" style={{ color: planItem.highlight ? "#9aea62" : "var(--text-secondary)" }} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{feature}</span>
                </div>
              ))}
            </div>
            <button
              className="w-full h-8 rounded-xl text-xs font-bold mt-4 transition-all"
              disabled={planItem.id === currentPlanId}
              style={
                planItem.id === currentPlanId
                  ? { background: "var(--ghost-bg)", border: "1px solid var(--chip-border)", color: "var(--text-secondary)" }
                  : planItem.highlight
                    ? agencyPrimaryButtonStyle
                    : agencyOutlineButtonStyle("#9aea62")
              }
            >
              {planItem.id === currentPlanId ? "Plano atual" : "Fazer upgrade"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4" style={agencyPrimaryPanelStyle}>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Para fazer upgrade ou cancelar, entre em contato:{" "}
          <a href="mailto:suporte@libertycrm.com.br" className="font-bold" style={{ color: "var(--status-ganho)" }}>
            suporte@libertycrm.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
