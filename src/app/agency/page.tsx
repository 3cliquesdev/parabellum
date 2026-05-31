"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, TrendingUp, Globe, Building2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AgencyDashboard() {
  const [stats, setStats] = useState({ customers: 0, maxTenants: 10, plan: "starter" });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/agency/customers");
      if (!res.ok) return;
      const d = await res.json();
      setStats(s => ({ ...s, customers: d.customers?.length ?? 0 }));
      setRecent((d.customers ?? []).slice(0, 5));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Visão geral da sua agência</p>
        </div>
        <Link href="/agency/customers/new"
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "#9aea62", color: "#0a0a0a" }}>
          <Plus className="w-4 h-4" /> Novo cliente
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users, label: "Clientes ativos", value: stats.customers, suffix: `/ ${stats.maxTenants}`, color: "#9aea62" },
          { icon: TrendingUp, label: "Plano", value: stats.plan.charAt(0).toUpperCase() + stats.plan.slice(1), color: "#60a5fa" },
          { icon: Globe, label: "Status", value: "Ativo", color: "#a78bfa" },
        ].map(({ icon: Icon, label, value, suffix, color }) => (
          <div key={label} className="rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: "#939da4" }}>{label}</span>
            </div>
            <p className="text-2xl font-extrabold text-white tracking-[-0.03em]">
              {value}{suffix && <span className="text-sm font-medium ml-1" style={{ color: "#939da4" }}>{suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Clientes recentes */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Clientes recentes</h2>
          <Link href="/agency/customers" className="text-xs font-bold flex items-center gap-1" style={{ color: "#9aea62" }}>
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
        ) : recent.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(147,157,164,0.3)" }} />
            <p className="text-sm" style={{ color: "#939da4" }}>Nenhum cliente ainda</p>
            <Link href="/agency/customers/new" className="text-xs mt-2 inline-block font-bold" style={{ color: "#9aea62" }}>
              + Criar primeiro cliente
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(c => (
              <Link key={c.id} href={`/agency/customers/${c.id}`}
                className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    <p className="text-[10px]" style={{ color: "#939da4" }}>{c.member_count} membro(s)</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: "#939da4" }} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { href: "/agency/branding", label: "Configurar branding", desc: "Logo, cores e nome", icon: "🎨" },
          { href: "/agency/domain", label: "Configurar domínio", desc: "Domínio personalizado", icon: "🌐" },
        ].map(({ href, label, desc, icon }) => (
          <Link key={href} href={href} className="rounded-2xl p-5 transition-all hover:border-white/15"
            style={cardStyle}>
            <span className="text-2xl mb-2 block">{icon}</span>
            <p className="text-sm font-bold text-white">{label}</p>
            <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
