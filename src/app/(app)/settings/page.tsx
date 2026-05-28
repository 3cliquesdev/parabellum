"use client";

import { useTenant } from "@/hooks/useTenant";

export default function SettingsPage() {
  const { tenant, loading } = useTenant();

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-2xl" style={{ fontFamily: "var(--font-sans)" }}>
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Configurações</h1>
        <p className="text-sm mt-1 font-medium" style={{ color: "#939da4" }}>Gerencie seu workspace</p>
      </div>

      <div className="rounded-2xl p-6 space-y-5"
        style={{ background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 className="text-sm font-bold text-white">Workspace</h2>
        <div className="space-y-4">
          {[
            { label: "Nome da empresa", value: tenant?.name ?? "—" },
            { label: "Slug", value: tenant?.slug ?? "—" },
            { label: "Criado em", value: tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString("pt-BR") : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-sm" style={{ color: "#939da4" }}>{label}</span>
              <span className="text-sm font-medium text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-6"
        style={{ background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 className="text-sm font-bold text-white mb-4">Plano atual</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-white">Starter — Trial</p>
            <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>30 dias grátis</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>Trial ativo</span>
        </div>
      </div>
    </div>
  );
}
