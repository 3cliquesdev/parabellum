"use client";

import { useEffect, useState } from "react";
import { CreditCard, CheckCircle, ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

const PLANS = [
  { id: "starter", name: "Starter", price: "R$ 497", period: "/mês", tenants: 5, ai: "10.000", msgs: "50.000", highlight: false },
  { id: "growth", name: "Growth", price: "R$ 1.497", period: "/mês", tenants: 20, ai: "50.000", msgs: "250.000", highlight: true },
  { id: "scale", name: "Scale", price: "R$ 2.997", period: "/mês", tenants: 50, ai: "200.000", msgs: "1.000.000", highlight: false },
];

export default function BillingPage() {
  const [agencyData, setAgencyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    fetch("/api/agency/stats").then(r => r.json()).then(d => {
      setAgencyData(d);
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
    <div className="p-8 space-y-6 max-w-3xl" style={{ fontFamily: "var(--font-sans)" }}>
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Meu Plano</h1>
        <p className="text-sm mt-1" style={{ color: "#939da4" }}>Seu plano com a Liberty CRM</p>
      </div>

      {/* Banners de contexto */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#60a5fa" }}>Estes são os planos que você paga à Liberty CRM</p>
          <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.6)" }}>
            Dão acesso à plataforma e definem seus limites de clientes e uso de IA.
          </p>
        </div>
        <Link href="/agency/billing-clients" className="rounded-xl p-4 transition-all hover:border-[#9aea62]/30"
          style={{ background: "rgba(154,234,98,0.06)", border: "1px solid rgba(154,234,98,0.15)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#9aea62" }}>Cobranças dos seus clientes →</p>
          <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.6)" }}>
            Defina o que cada cliente paga à sua agência por usar o CRM.
          </p>
        </Link>
      </div>

      {/* Status atual */}
      {!loading && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-white">Plano atual: <span style={{ color: "#9aea62" }}>{plan?.display_name ?? "Starter"}</span></p>
              {agency?.payment_status === "trial" ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>
                    Trial ativo
                  </span>
                  <span className="text-xs" style={{ color: "#939da4" }}>{trialDaysLeft} dias restantes</span>
                </div>
              ) : (
                <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full font-bold" style={{
                  background: agency?.payment_status === "active" ? "rgba(154,234,98,0.1)" : "rgba(248,113,113,0.1)",
                  color: agency?.payment_status === "active" ? "#9aea62" : "#f87171"
                }}>
                  {agency?.payment_status === "active" ? "Ativo" : agency?.payment_status === "past_due" ? "Pagamento em atraso" : "Cancelado"}
                </span>
              )}
            </div>
            <CreditCard className="w-5 h-5" style={{ color: "#939da4" }} />
          </div>

          {/* Uso */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { label: "Clientes", used: totals.tenants ?? 0, max: totals.max_tenants ?? 10 },
              { label: "IA/mês", used: totals.ai_calls_this_month ?? 0, max: plan?.max_ai_calls_per_month ?? 10000 },
              { label: "Mensagens/mês", used: totals.messages_this_month ?? 0, max: plan?.max_messages_per_month ?? 50000 },
            ].map(({ label, used, max }) => {
              const pct = Math.min(Math.round((used / max) * 100), 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: "#939da4" }}>{label}</span>
                    <span style={{ color: pct >= 80 ? "#f87171" : "#939da4" }}>{used.toLocaleString("pt-BR")} / {max.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${pct}%`,
                      background: pct >= 80 ? "#f87171" : pct >= 60 ? "#facc15" : "#9aea62"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Planos disponíveis */}
      <h2 className="text-sm font-bold text-white">Planos disponíveis</h2>
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map(p => (
          <div key={p.id} className="rounded-2xl p-5 flex flex-col"
            style={p.highlight
              ? { background: "linear-gradient(180deg, rgba(154,234,98,0.08) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(154,234,98,0.25)" }
              : cardStyle}>
            {p.highlight && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full self-start mb-2" style={{ background: "#9aea62", color: "#0a0a0a" }}>
                MAIS POPULAR
              </span>
            )}
            <p className="text-sm font-extrabold text-white">{p.name}</p>
            <p className="text-xl font-extrabold mt-1" style={{ color: p.highlight ? "#9aea62" : "white" }}>
              {p.price}<span className="text-xs font-normal" style={{ color: "#939da4" }}>{p.period}</span>
            </p>
            <div className="space-y-1.5 mt-4 flex-1">
              {[
                `${p.tenants} clientes`,
                `${p.ai} chamadas IA/mês`,
                `${p.msgs} msgs/mês`,
              ].map(f => (
                <div key={f} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 shrink-0" style={{ color: p.highlight ? "#9aea62" : "#939da4" }} />
                  <span className="text-xs" style={{ color: "#939da4" }}>{f}</span>
                </div>
              ))}
            </div>
            <button className="w-full h-8 rounded-xl text-xs font-bold mt-4 transition-all"
              disabled={p.id === currentPlanId}
              style={p.id === currentPlanId
                ? { background: "rgba(255,255,255,0.06)", color: "#939da4", cursor: "default" }
                : { background: p.highlight ? "#9aea62" : "rgba(154,234,98,0.1)", color: p.highlight ? "#0a0a0a" : "#9aea62" }}>
              {p.id === currentPlanId ? "Plano atual" : "Fazer upgrade"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4" style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.1)" }}>
        <p className="text-xs" style={{ color: "#939da4" }}>
          Para fazer upgrade ou cancelar, entre em contato: {" "}
          <a href="mailto:suporte@libertycrm.com.br" className="font-bold" style={{ color: "#9aea62" }}>
            suporte@libertycrm.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
