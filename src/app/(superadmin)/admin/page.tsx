"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Users, TrendingUp, DollarSign, Activity, LogOut, RefreshCw, LayoutDashboard, Puzzle, MessageSquare, CheckCircle, XCircle } from "lucide-react";

interface TenantOverview {
  id: string; name: string; slug: string; created_at: string;
  plan_name: string; price_brl: number; subscription_status: string;
  current_period_end: string | null; member_count: number; lead_count: number;
}
interface WaConfig {
  tenant_id: string; phone_number_id: string; active: boolean; created_at: string;
}

const statusLabel: Record<string, string> = { active: "Ativo", trialing: "Trial", cancelled: "Cancelado", past_due: "Vencido" };
const statusColor: Record<string, string> = { active: "#9aea62", trialing: "#facc15", cancelled: "#f87171", past_due: "#fb923c" };

export default function SuperAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"clientes" | "integracoes">("clientes");
  const [tenants, setTenants] = useState<TenantOverview[]>([]);
  const [waConfigs, setWaConfigs] = useState<WaConfig[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, leads: 0, mrr: 0 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/admin/login"; return; }
      const { data: sa } = await supabase.from("super_admins").select("id").eq("email", user.email).single() as { data: { id: string } | null; error: unknown };
      if (!sa) { window.location.href = "/admin/login"; return; }

      // Buscar direto via client (GRANT SELECT já concedido)
      const [{ data: tenantData }, { data: waData }] = await Promise.all([
        supabase.from("admin_tenant_overview").select("*").order("created_at", { ascending: false }),
        supabase.from("whatsapp_configs").select("tenant_id, phone_number_id, active, created_at"),
      ]);
      const list: TenantOverview[] = (tenantData as TenantOverview[]) ?? [];
      setTenants(list);
      setWaConfigs((waData as WaConfig[]) ?? []);
      setStats({
        total: list.length,
        active: list.filter(t => ["active", "trialing"].includes(t.subscription_status)).length,
        leads: list.reduce((s, t) => s + Number(t.lead_count ?? 0), 0),
        mrr: list.filter(t => t.subscription_status === "active").reduce((s, t) => s + Number(t.price_brl ?? 0), 0),
      });
    } finally { setLoading(false); }
  }

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/admin/login");
  }

  const waByTenant = Object.fromEntries(waConfigs.map(w => [w.tenant_id, w]));
  const whatsappTotal = waConfigs.length;
  const whatsappActive = waConfigs.filter(w => w.active).length;

  const cardStyle = {
    background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#000000", fontFamily: "var(--font-sans)" }}>

      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col h-full"
        style={{ background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-5 h-16 flex items-center gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#9aea62" }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" /></svg>
          </div>
          <div>
            <p className="font-bold text-xs text-white leading-none">Liberty CRM</p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: "#9aea62" }}>SUPER ADMIN</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {[
            { id: "clientes", icon: LayoutDashboard, label: "Clientes" },
            { id: "integracoes", icon: Puzzle, label: "Integrações" },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id as typeof tab)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={tab === id ? { background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.15)" }
                : { color: "rgba(255,255,255,0.45)", border: "1px solid transparent" }}>
              <Icon className="w-4 h-4 shrink-0" style={{ color: tab === id ? "#9aea62" : "rgba(255,255,255,0.3)" }} />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="pt-3">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              <LogOut className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">
              {tab === "clientes" ? "Painel do Dono" : "Integrações"}
            </h1>
            <p className="text-sm mt-1 font-medium" style={{ color: "#939da4" }}>
              {tab === "clientes" ? "Visão geral de todos os clientes" : "Quem usa cada integração"}
            </p>
          </div>
          <button onClick={loadData} className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#939da4" }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ─── ABA CLIENTES ─── */}
        {tab === "clientes" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { icon: Users, label: "Clientes totais", value: stats.total, color: "#9aea62" },
                { icon: Activity, label: "Contas ativas", value: stats.active, color: "#60a5fa" },
                { icon: TrendingUp, label: "Total de leads", value: stats.leads, color: "#a78bfa" },
                { icon: DollarSign, label: "MRR", value: `R$ ${stats.mrr.toLocaleString("pt-BR")}`, color: "#9aea62" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-2xl p-6 flex flex-col gap-4" style={cardStyle}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-[22px] font-extrabold text-white tracking-[-0.02em]">{value}</p>
                    <p className="text-xs mt-0.5 font-medium" style={{ color: "#939da4" }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 className="text-sm font-bold text-white">Todos os clientes</h2>
                <span className="text-xs font-medium" style={{ color: "#939da4" }}>{tenants.length} workspaces</span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
                </div>
              ) : tenants.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm" style={{ color: "#939da4" }}>Nenhum cliente ainda.</p>
                </div>
              ) : (
                <>
                  <div className="grid px-6 py-3 text-xs font-bold"
                    style={{ gridTemplateColumns: "2fr 1fr 1fr 80px 80px 60px", color: "#939da4", background: "rgba(0,0,0,0.3)" }}>
                    <span>Empresa</span><span>Plano</span><span>Status</span><span>Leads</span><span>Desde</span><span>WA</span>
                  </div>
                  {tenants.map((t, i) => {
                    const wa = waByTenant[t.id];
                    return (
                      <div key={t.id} className="grid px-6 py-4 items-center transition-colors"
                        style={{ gridTemplateColumns: "2fr 1fr 1fr 80px 80px 60px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                            {t.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{t.name}</p>
                            <p className="text-xs" style={{ color: "#939da4" }}>@{t.slug}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-white">{t.plan_name ?? "Starter"}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full w-fit"
                          style={{ color: statusColor[t.subscription_status] ?? "#939da4", background: `${statusColor[t.subscription_status] ?? "#939da4"}15` }}>
                          {statusLabel[t.subscription_status] ?? t.subscription_status}
                        </span>
                        <span className="text-sm font-semibold text-white">{t.lead_count ?? 0}</span>
                        <span className="text-xs" style={{ color: "#939da4" }}>{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                        <div>
                          {wa?.active
                            ? <CheckCircle className="w-4 h-4" style={{ color: "#9aea62" }} />
                            : <XCircle className="w-4 h-4" style={{ color: "rgba(147,157,164,0.3)" }} />}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}

        {/* ─── ABA INTEGRAÇÕES ─── */}
        {tab === "integracoes" && (
          <div className="space-y-6">
            {/* Stats de integrações */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl p-6 flex flex-col gap-4" style={cardStyle}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)" }}>
                  <MessageSquare className="w-4 h-4" style={{ color: "#25d366" }} />
                </div>
                <div>
                  <p className="text-[22px] font-extrabold text-white">{whatsappActive}<span className="text-sm font-medium ml-1" style={{ color: "#939da4" }}>/ {whatsappTotal}</span></p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: "#939da4" }}>WhatsApp Business ativo</p>
                </div>
              </div>
              <div className="rounded-2xl p-6 flex flex-col gap-4" style={cardStyle}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(154,234,98,0.08)", border: "1px solid rgba(154,234,98,0.12)" }}>
                  <Puzzle className="w-4 h-4" style={{ color: "#9aea62" }} />
                </div>
                <div>
                  <p className="text-[22px] font-extrabold text-white">1</p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: "#939da4" }}>Integrações disponíveis</p>
                </div>
              </div>
            </div>

            {/* WhatsApp por tenant */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="px-6 py-4 flex items-center gap-3"
                style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(37,211,102,0.15)" }}>
                  <MessageSquare className="w-3.5 h-3.5" style={{ color: "#25d366" }} />
                </div>
                <h2 className="text-sm font-bold text-white">WhatsApp Business</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold ml-auto"
                  style={{ background: "rgba(37,211,102,0.1)", color: "#25d366" }}>
                  {whatsappActive} ativos
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
                </div>
              ) : tenants.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: "#939da4" }}>Nenhum cliente ainda.</p>
                </div>
              ) : (
                <>
                  <div className="grid px-6 py-3 text-xs font-bold"
                    style={{ gridTemplateColumns: "2fr 1.5fr 1fr 100px", color: "#939da4", background: "rgba(0,0,0,0.3)" }}>
                    <span>Empresa</span><span>Phone Number ID</span><span>Status</span><span>Conectado em</span>
                  </div>
                  {tenants.map((t, i) => {
                    const wa = waByTenant[t.id];
                    return (
                      <div key={t.id} className="grid px-6 py-4 items-center transition-colors"
                        style={{ gridTemplateColumns: "2fr 1.5fr 1fr 100px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                            {t.name?.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-semibold text-white">{t.name}</p>
                        </div>
                        <span className="text-xs font-mono" style={{ color: wa ? "#939da4" : "rgba(147,157,164,0.3)" }}>
                          {wa ? `...${wa.phone_number_id.slice(-8)}` : "—"}
                        </span>
                        <div>
                          {wa?.active
                            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: "#25d366", background: "rgba(37,211,102,0.1)" }}>Ativo</span>
                            : <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: "#939da4", background: "rgba(255,255,255,0.05)" }}>Inativo</span>}
                        </div>
                        <span className="text-xs" style={{ color: "#939da4" }}>
                          {wa ? new Date(wa.created_at).toLocaleDateString("pt-BR") : "—"}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
