"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Users, TrendingUp, DollarSign, Activity, LogOut, RefreshCw, LayoutDashboard } from "lucide-react";

interface TenantOverview {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  plan_name: string;
  price_brl: number;
  subscription_status: string;
  current_period_end: string | null;
  member_count: number;
  lead_count: number;
}

const statusLabel: Record<string, string> = {
  active: "Ativo", trialing: "Trial", cancelled: "Cancelado", past_due: "Vencido",
};
const statusColor: Record<string, string> = {
  active: "#9aea62", trialing: "#facc15", cancelled: "#f87171", past_due: "#fb923c",
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantOverview[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, leads: 0, mrr: 0 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Verificar sessão e autorização
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/admin/login"; return; }

      const { data: sa } = await supabase
        .from("super_admins").select("id").eq("email", user.email).single() as { data: { id: string } | null; error: unknown };
      if (!sa) { window.location.href = "/admin/login"; return; }

      // Buscar dados diretamente (authenticated tem GRANT SELECT na view)
      const { data, error } = await supabase
        .from("admin_tenant_overview")
        .select("*")
        .order("created_at", { ascending: false }) as { data: TenantOverview[] | null; error: unknown };
      if (error) console.error("admin_tenant_overview error:", error);
      const list: TenantOverview[] = data ?? [];
      setTenants(list);
      setStats({
        total: list.length,
        active: list.filter(t => ["active", "trialing"].includes(t.subscription_status)).length,
        leads: list.reduce((s, t) => s + Number(t.lead_count ?? 0), 0),
        mrr: list.filter(t => t.subscription_status === "active").reduce((s, t) => s + Number(t.price_brl ?? 0), 0),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/admin/login");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#000000", fontFamily: "var(--font-sans)" }}>

      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col h-full"
        style={{ background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-5 h-16 flex items-center gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "#9aea62" }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-xs text-white leading-none">Liberty CRM</p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: "#9aea62" }}>SUPER ADMIN</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.15)" }}>
            <LayoutDashboard className="w-4 h-4 shrink-0" style={{ color: "#9aea62" }} />
            Painel do Dono
          </div>
        </nav>

        <div className="px-3 pb-5 space-y-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="pt-3">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{ color: "rgba(255,255,255,0.35)", border: "1px solid transparent" }}>
              <LogOut className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Painel do Dono</h1>
            <p className="text-sm mt-1 font-medium" style={{ color: "#939da4" }}>
              Visão geral de todos os clientes do Liberty CRM
            </p>
          </div>
          <button onClick={loadData}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#939da4" }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Clientes totais", value: stats.total, color: "#9aea62" },
            { icon: Activity, label: "Contas ativas", value: stats.active, color: "#60a5fa" },
            { icon: TrendingUp, label: "Total de leads", value: stats.leads, color: "#a78bfa" },
            { icon: DollarSign, label: "MRR", value: `R$ ${stats.mrr.toLocaleString("pt-BR")}`, color: "#9aea62" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl p-6 flex flex-col gap-4"
              style={{
                background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              </div>
              <div>
                <p className="text-[22px] font-extrabold text-white tracking-[-0.02em]">{value}</p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: "#939da4" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tenants table */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
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
              <p className="text-xs mt-2" style={{ color: "rgba(147,157,164,0.4)" }}>Os clientes aparecerão aqui após criar uma conta no CRM.</p>
            </div>
          ) : (
            <>
              <div className="grid px-6 py-3 text-xs font-bold"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 80px 80px", color: "#939da4", background: "rgba(0,0,0,0.3)" }}>
                <span>Empresa</span>
                <span>Plano</span>
                <span>Status</span>
                <span>Leads</span>
                <span>Desde</span>
              </div>
              {tenants.map((t, i) => (
                <div key={t.id} className="grid px-6 py-4 items-center transition-colors"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 80px 80px",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                  }}
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
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: statusColor[t.subscription_status] ?? "#939da4",
                        background: `${statusColor[t.subscription_status] ?? "#939da4"}15`,
                      }}>
                      {statusLabel[t.subscription_status] ?? t.subscription_status}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-white">{t.lead_count ?? 0}</span>
                  <span className="text-xs" style={{ color: "#939da4" }}>
                    {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
