"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, TrendingUp, Globe, Building2, ArrowRight, Bot, MessageSquare, AlertTriangle, Activity, CreditCard } from "lucide-react";

export default function AgencyDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    fetch("/api/agency/stats").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const agency = data?.agency;
  const totals = data?.totals ?? {};
  const plan = data?.plan;
  const tenantStats: any[] = data?.tenant_stats ?? [];
  const nearLimit: any[] = data?.near_limit ?? [];
  const recentAudit: any[] = data?.recent_audit ?? [];

  const trialDaysLeft = agency?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(agency.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  const ACTION_LABELS: Record<string, string> = {
    "tenant.created": "Criou cliente",
    "login_as": "Entrou como cliente",
    "branding.updated": "Atualizou branding",
    "domain.added": "Adicionou domínio",
    "team.invited": "Convidou membro",
  };

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">
            {agency?.display_name ?? "Dashboard"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Visão consolidada de todos os clientes</p>
        </div>
        <Link href="/agency/customers/new" className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "#9aea62", color: "#0a0a0a" }}>
          <Plus className="w-4 h-4" /> Novo cliente
        </Link>
      </div>

      {/* Trial / payment alert */}
      {agency?.payment_status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#facc15" }} />
          <p className="text-xs font-medium" style={{ color: "#facc15" }}>
            Trial expira em <strong>{trialDaysLeft} dias</strong>.{" "}
            <Link href="/agency/billing" style={{ textDecoration: "underline" }}>Fazer upgrade</Link>
          </p>
        </div>
      )}
      {agency?.payment_status === "past_due" && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#f87171" }} />
          <p className="text-xs font-medium" style={{ color: "#f87171" }}>
            Pagamento em atraso — regularize para evitar suspensão dos clientes.{" "}
            <Link href="/agency/billing" style={{ textDecoration: "underline" }}>Ver fatura</Link>
          </p>
        </div>
      )}

      {/* Onboarding — primeiro acesso sem clientes */}
      {!loading && tenantStats.length === 0 && (
        <div className="rounded-2xl p-8 text-center space-y-6"
          style={{ background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(154,234,98,0.15)" }}>
          <div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(154,234,98,0.1)" }}>
              <Building2 className="w-7 h-7" style={{ color: "#9aea62" }} />
            </div>
            <h2 className="text-lg font-extrabold text-white tracking-[-0.03em]">Bem-vindo ao Painel da Agência!</h2>
            <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: "#939da4" }}>
              Aqui você gerencia os workspaces CRM que vende para seus clientes.
              Seu CRM pessoal continua no botão <strong className="text-white">Meu CRM</strong> abaixo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
            {[
              { n: "1", title: "Crie um cliente", desc: "Crie o workspace CRM de um novo cliente seu", href: "/agency/customers/new", cta: "Criar cliente" },
              { n: "2", title: "Gere um link", desc: "Link de captação para clientes se cadastrarem sozinhos", href: "/agency/links", cta: "Ver links" },
              { n: "3", title: "Configure sua marca", desc: "Logo, cor e domínio personalizado", href: "/agency/branding", cta: "Configurar" },
            ].map(({ n, title, desc, href, cta }) => (
              <div key={n} className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: "rgba(154,234,98,0.15)", color: "#9aea62" }}>{n}</div>
                <p className="text-xs font-bold text-white">{title}</p>
                <p className="text-[10px]" style={{ color: "#939da4" }}>{desc}</p>
                <Link href={href} className="text-[10px] font-bold" style={{ color: "#9aea62" }}>{cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats principais */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { icon: Building2, label: "Clientes", value: totals.tenants, suffix: `/ ${totals.max_tenants}`, color: "#9aea62", href: "/agency/customers" },
            { icon: Users, label: "Membros totais", value: totals.members, color: "#60a5fa" },
            { icon: Bot, label: "IA usada (mês)", value: totals.ai_calls_this_month?.toLocaleString("pt-BR"), color: "#a78bfa" },
            { icon: MessageSquare, label: "Mensagens (mês)", value: totals.messages_this_month?.toLocaleString("pt-BR"), color: "#f97316" },
          ].map(({ icon: Icon, label, value, suffix, color, href }) => (
            <div key={label} className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-xs font-medium" style={{ color: "#939da4" }}>{label}</span>
              </div>
              <p className="text-2xl font-extrabold text-white tracking-[-0.03em]">
                {value ?? "—"}
                {suffix && <span className="text-sm font-medium ml-1" style={{ color: "#939da4" }}>{suffix}</span>}
              </p>
              {href && (
                <Link href={href} className="text-[10px] mt-2 block" style={{ color }}>Ver todos →</Link>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Top clientes por uso */}
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Clientes por uso de IA</h2>
            <TrendingUp className="w-4 h-4" style={{ color: "#939da4" }} />
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
          ) : tenantStats.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "#939da4" }}>Nenhum dado ainda</p>
          ) : (
            <div className="space-y-3">
              {tenantStats.slice(0, 6).map(t => (
                <div key={t.id}>
                  <div className="flex items-center justify-between mb-1">
                    <Link href={`/agency/customers/${t.id}`} className="text-xs font-medium text-white hover:text-[#9aea62] transition-colors">{t.name}</Link>
                    <span className="text-[10px]" style={{ color: "#939da4" }}>{t.ai_calls} chamadas</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(t.usage_pct, 100)}%`,
                      background: t.usage_pct >= 80 ? "#f87171" : t.usage_pct >= 60 ? "#facc15" : "#9aea62"
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de limite + Auditoria recente */}
        <div className="space-y-4">
          {/* Perto do limite */}
          {nearLimit.length > 0 && (
            <div className="rounded-2xl p-5 space-y-3" style={{ ...cardStyle, border: "1px solid rgba(248,113,113,0.15)" }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "#f87171" }} />
                <h2 className="text-sm font-bold" style={{ color: "#f87171" }}>Perto do limite ({nearLimit.length})</h2>
              </div>
              {nearLimit.map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  <Link href={`/agency/customers/${t.id}`} className="text-xs text-white hover:text-[#9aea62]">{t.name}</Link>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                    {t.usage_pct}% usado
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Auditoria recente */}
          <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Atividade recente</h2>
              <Activity className="w-4 h-4" style={{ color: "#939da4" }} />
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-6 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
            ) : recentAudit.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: "#939da4" }}>Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-2">
                {recentAudit.map((log, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#939da4" }}>
                      {ACTION_LABELS[log.action] ?? log.action}
                      {log.details?.tenant_name && <span className="text-white ml-1">· {log.details.tenant_name}</span>}
                    </span>
                    <span className="text-[10px]" style={{ color: "rgba(147,157,164,0.4)" }}>
                      {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plano atual */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(154,234,98,0.1)" }}>
              <CreditCard className="w-4 h-4" style={{ color: "#9aea62" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Plano {plan?.display_name ?? "Starter"}
                {agency?.payment_status === "trial" && (
                  <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>
                    Trial — {trialDaysLeft}d restantes
                  </span>
                )}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>
                {plan?.max_tenants} clientes · {plan?.max_ai_calls_per_month?.toLocaleString("pt-BR")} chamadas IA/mês
              </p>
            </div>
          </div>
          <Link href="/agency/billing" className="px-4 h-8 rounded-xl text-xs font-bold inline-flex items-center"
            style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
            Gerenciar plano
          </Link>
        </div>
      </div>

    </div>
  );
}
