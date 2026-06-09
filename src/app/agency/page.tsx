"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, TrendingUp, Building2, Bot, MessageSquare, AlertTriangle, Activity, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import {
  agencyBadgeStyle,
  agencyCardStrongStyle,
  agencyCardStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPanelStyle,
  agencyPrimaryButtonStyle,
} from "@/app/agency/theme";

interface AgencyInfo {
  display_name: string | null;
  trial_ends_at: string | null;
  payment_status: string | null;
}

interface AgencyTotals {
  tenants: number;
  max_tenants: number;
  members: number;
  ai_calls_this_month: number;
  messages_this_month: number;
}

interface AgencyPlanInfo {
  display_name: string | null;
  max_tenants: number | null;
  max_ai_calls_per_month: number | null;
}

interface TenantStat {
  id: string;
  name: string;
  ai_calls: number;
  usage_pct: number;
}

interface RecentAuditLog {
  action: string;
  details: { tenant_name?: string } | null;
  created_at: string;
}

interface AgencyDashboardData {
  agency: AgencyInfo | null;
  totals: AgencyTotals;
  plan: AgencyPlanInfo | null;
  tenant_stats: TenantStat[];
  near_limit: TenantStat[];
  recent_audit: RecentAuditLog[];
}

export default function AgencyDashboard() {
  const [data, setData] = useState<AgencyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/agency/stats").then((response) => response.json()).then((payload) => {
      setData(payload);
      setLoading(false);
    });
  }, []);

  const agency = data?.agency;
  const totals = data?.totals ?? { tenants: 0, max_tenants: 0, members: 0, ai_calls_this_month: 0, messages_this_month: 0 };
  const tenantStats = data?.tenant_stats ?? [];
  const nearLimit = data?.near_limit ?? [];
  const recentAudit = data?.recent_audit ?? [];

  const trialDaysLeft = agency?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(agency.trial_ends_at).getTime() - currentTime) / 86400000))
    : null;

  const actionLabels: Record<string, string> = {
    "tenant.created": "Criou cliente",
    login_as: "Entrou como cliente",
    "branding.updated": "Atualizou branding",
    "domain.added": "Adicionou domínio",
    "team.invited": "Convidou membro",
  };

  return (
    <div className="p-8 space-y-6" style={agencyPageStyle}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>
            {agency?.display_name ?? "Dashboard"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Visão consolidada de todos os clientes</p>
        </div>
        <Link href="/agency/customers/new" className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold" style={agencyPrimaryButtonStyle}>
          <Plus className="w-4 h-4" />
          Novo cliente
        </Link>
      </div>

      {agency?.payment_status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={agencyOutlineButtonStyle("#facc15")}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#facc15" }} />
          <p className="text-xs font-medium" style={{ color: "#facc15" }}>
            Trial expira em <strong>{trialDaysLeft} dias</strong>. <Link href="/agency/billing" style={{ textDecoration: "underline" }}>Fazer upgrade</Link>
          </p>
        </div>
      )}
      {agency?.payment_status === "past_due" && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={agencyOutlineButtonStyle("#f87171")}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#f87171" }} />
          <p className="text-xs font-medium" style={{ color: "#f87171" }}>
            Pagamento em atraso — regularize para evitar suspensão dos clientes. <Link href="/agency/billing" style={{ textDecoration: "underline" }}>Ver fatura</Link>
          </p>
        </div>
      )}

      {!loading && tenantStats.length === 0 && (
        <div className="rounded-2xl p-8 text-center space-y-6" style={agencyCardStrongStyle}>
          <div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--primary-bg)" }}>
              <Building2 className="w-7 h-7" style={{ color: "var(--status-ganho)" }} />
            </div>
            <h2 className="text-lg font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Bem-vindo ao Painel da Agência!</h2>
            <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
              Aqui você gerencia os workspaces CRM que vende para seus clientes. Seu CRM pessoal continua no botão <strong style={{ color: "var(--text-primary)" }}>Meu CRM</strong> abaixo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
            {[
              { n: "1", title: "Crie um cliente", desc: "Crie o workspace CRM de um novo cliente seu", href: "/agency/customers/new", cta: "Criar cliente" },
              { n: "2", title: "Gere um link", desc: "Link de captação para clientes se cadastrarem sozinhos", href: "/agency/links", cta: "Ver links" },
              { n: "3", title: "Configure sua marca", desc: "Logo, cor e domínio personalizado", href: "/agency/branding", cta: "Configurar" },
            ].map((step) => (
              <div key={step.n} className="rounded-xl p-4 space-y-2" style={agencyPanelStyle}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: "var(--primary-bg)", color: "var(--status-ganho)" }}>{step.n}</div>
                <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{step.title}</p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{step.desc}</p>
                <Link href={step.href} className="text-[10px] font-bold" style={{ color: "var(--status-ganho)" }}>{step.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="rounded-2xl h-24 animate-pulse" style={{ background: "var(--surface-panel)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { icon: Building2, label: "Clientes", value: totals.tenants, suffix: `/ ${totals.max_tenants}`, color: "#9aea62", href: "/agency/customers" },
            { icon: Users, label: "Membros totais", value: totals.members, color: "#60a5fa" },
            { icon: Bot, label: "IA usada (mês)", value: totals.ai_calls_this_month?.toLocaleString("pt-BR"), color: "#a78bfa" },
            { icon: MessageSquare, label: "Mensagens (mês)", value: totals.messages_this_month?.toLocaleString("pt-BR"), color: "#f97316" },
          ].map(({ icon: Icon, label, value, suffix, color, href }, index) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.07 }} className="rounded-2xl p-5" style={agencyCardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={agencyOutlineButtonStyle(color)}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
              </div>
              <p className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>
                {value ?? "—"}
                {suffix && <span className="text-sm font-medium ml-1" style={{ color: "var(--text-secondary)" }}>{suffix}</span>}
              </p>
              {href && <Link href={href} className="text-[10px] mt-2 block" style={{ color }}>Ver todos →</Link>}
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 space-y-4" style={agencyCardStyle}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Clientes por uso de IA</h2>
            <TrendingUp className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, index) => <div key={index} className="h-8 rounded-lg animate-pulse" style={{ background: "var(--surface-panel)" }} />)}</div>
          ) : tenantStats.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--text-secondary)" }}>Nenhum dado ainda</p>
          ) : (
            <div className="space-y-3">
              {tenantStats.slice(0, 6).map((tenant) => (
                <div key={tenant.id}>
                  <div className="flex items-center justify-between mb-1">
                    <Link href={`/agency/customers/${tenant.id}`} className="text-xs font-medium transition-colors" style={{ color: "var(--text-primary)" }}>{tenant.name}</Link>
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{tenant.ai_calls} chamadas</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--ghost-bg)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(tenant.usage_pct, 100)}%`, background: tenant.usage_pct >= 80 ? "#f87171" : tenant.usage_pct >= 60 ? "#facc15" : "#9aea62" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {nearLimit.length > 0 && (
            <div className="rounded-2xl p-5 space-y-3" style={{ ...agencyCardStyle, border: "1px solid rgba(248,113,113,0.25)" }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "#f87171" }} />
                <h2 className="text-sm font-bold" style={{ color: "#f87171" }}>Perto do limite ({nearLimit.length})</h2>
              </div>
              {nearLimit.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between">
                  <Link href={`/agency/customers/${tenant.id}`} className="text-xs" style={{ color: "var(--text-primary)" }}>{tenant.name}</Link>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={agencyBadgeStyle("#f87171")}>{tenant.usage_pct}% usado</span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl p-5 space-y-3" style={agencyCardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Atividade recente</h2>
              <Activity className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_, index) => <div key={index} className="h-6 rounded animate-pulse" style={{ background: "var(--surface-panel)" }} />)}</div>
            ) : recentAudit.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: "var(--text-secondary)" }}>Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-2">
                {recentAudit.map((log, index) => (
                  <div key={`${log.action}-${index}`} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {actionLabels[log.action] ?? log.action}
                      {log.details?.tenant_name && <span style={{ color: "var(--text-primary)" }}> · {log.details.tenant_name}</span>}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                      {new Date(log.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!loading && (
        <div className="rounded-2xl p-5 flex items-center justify-between" style={agencyCardStyle}>
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Plano {data?.plan?.display_name ?? "Starter"}
              </p>
              {agency?.payment_status === "trial" && trialDaysLeft !== null && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={agencyBadgeStyle("#facc15")}>
                  Trial - {trialDaysLeft}d restantes
                </span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              {totals.max_tenants} clientes · {data?.plan?.max_ai_calls_per_month?.toLocaleString("pt-BR") ?? "0"} chamadas IA/mês
            </p>
          </div>
          <Link href="/agency/billing" className="px-4 h-9 rounded-xl text-sm font-bold inline-flex items-center" style={agencyOutlineButtonStyle("#9aea62")}>
            Gerenciar plano
          </Link>
        </div>
      )}
    </div>
  );
}
