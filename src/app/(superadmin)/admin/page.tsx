"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Users, TrendingUp, DollarSign, Activity, LogOut, RefreshCw } from "lucide-react";

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

export default function SuperAdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantOverview[]>([]);
  const [stats, setStats] = useState({ tenants: 0, leads: 0, mrr: 0, active: 0 });

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }

      // Verificar se é super admin
      const { data: sa } = await supabase
        .from("super_admins")
        .select("id")
        .eq("email", user.email)
        .single() as { data: { id: string } | null; error: unknown };

      if (!sa) { router.push("/"); return; }

      setAuthorized(true);
      await loadData(supabase);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData(supabase: ReturnType<typeof createClient>) {
    const { data } = await supabase
      .from("admin_tenant_overview")
      .select("*")
      .order("created_at", { ascending: false }) as { data: TenantOverview[] | null };

    const list = data ?? [];
    setTenants(list);
    setStats({
      tenants: list.length,
      leads: list.reduce((s, t) => s + Number(t.lead_count), 0),
      mrr: list.filter(t => t.subscription_status === "active").reduce((s, t) => s + Number(t.price_brl), 0),
      active: list.filter(t => ["active", "trialing"].includes(t.subscription_status)).length,
    });
    setLoading(false);
  }

  async function refresh() {
    setLoading(true);
    const supabase = createClient();
    await loadData(supabase);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const statusColor: Record<string, string> = {
    active: "#9aea62",
    trialing: "#facc15",
    cancelled: "#f87171",
    past_due: "#fb923c",
  };

  if (!authorized && !loading) return null;

  return (
    <div className="min-h-screen" style={{ background: "#000000" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 h-16"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#9aea62" }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
            </svg>
          </div>
          <span className="font-bold text-sm text-white">Liberty CRM</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold"
            style={{ background: "rgba(154,234,98,0.15)", color: "#9aea62" }}>SUPER ADMIN</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", color: "#939da4" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.05)", color: "#939da4" }}>
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-[1200px] mx-auto">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Painel do Dono</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Visão geral de todos os clientes do Liberty CRM</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Tenants totais", value: stats.tenants, color: "#9aea62" },
            { icon: Activity, label: "Contas ativas", value: stats.active, color: "#60a5fa" },
            { icon: TrendingUp, label: "Total de leads", value: stats.leads, color: "#a78bfa" },
            { icon: DollarSign, label: "MRR", value: `R$ ${stats.mrr.toLocaleString("pt-BR")}`, color: "#9aea62" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl p-5"
              style={{
                background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-xl font-extrabold text-white tracking-tight">{value}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: "#939da4" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Tenants table */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="text-sm font-bold text-white">Todos os clientes</h2>
            <span className="text-xs" style={{ color: "#939da4" }}>{tenants.length} workspaces</span>
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
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {/* Header row */}
              <div className="grid grid-cols-6 px-6 py-3 text-xs font-bold"
                style={{ color: "#939da4", background: "rgba(0,0,0,0.3)" }}>
                <span className="col-span-2">Empresa</span>
                <span>Plano</span>
                <span>Status</span>
                <span>Leads</span>
                <span>Desde</span>
              </div>
              {tenants.map((t) => (
                <div key={t.id} className="grid grid-cols-6 px-6 py-4 items-center transition-colors"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs" style={{ color: "#939da4" }}>@{t.slug}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-white">{t.plan_name ?? "—"}</span>
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: statusColor[t.subscription_status] ?? "#939da4",
                        background: `${statusColor[t.subscription_status] ?? "#939da4"}15`,
                      }}>
                      {t.subscription_status === "trialing" ? "Trial" :
                       t.subscription_status === "active" ? "Ativo" :
                       t.subscription_status === "cancelled" ? "Cancelado" : t.subscription_status ?? "—"}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-white">{t.lead_count}</span>
                  <span className="text-xs" style={{ color: "#939da4" }}>
                    {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
