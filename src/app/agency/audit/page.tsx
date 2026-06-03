"use client";

import { useEffect, useState } from "react";
import { Activity, LogIn, Building2, Globe, Palette, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AgencyMembershipRow {
  agency_id: string;
}

interface AuditLogRow {
  id?: string;
  action: string;
  details: {
    tenant_name?: string;
    reason?: string;
  } | null;
  ip_address?: string | null;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  login_as: { label: "Suporte - entrou como cliente", color: "#facc15", icon: LogIn },
  "tenant.created": { label: "Cliente criado", color: "#9aea62", icon: Building2 },
  "branding.updated": { label: "Branding atualizado", color: "#60a5fa", icon: Palette },
  "domain.added": { label: "Dominio adicionado", color: "#a78bfa", icon: Globe },
  "team.invited": { label: "Membro convidado", color: "#f97316", icon: Activity },
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from("agency_users")
        .select("agency_id")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          const membership = data as unknown as AgencyMembershipRow | null;
          if (!membership) return;

          supabase
            .from("agency_audit_logs")
            .select("*")
            .eq("agency_id", membership.agency_id)
            .order("created_at", { ascending: false })
            .limit(200)
            .then(({ data: logData }) => {
              setLogs((logData ?? []) as unknown as AuditLogRow[]);
              setLoading(false);
            });
        });
    });
  }, []);

  const filters = [
    { id: "todos", label: "Todos" },
    { id: "login_as", label: "Suporte" },
    { id: "tenant.created", label: "Clientes criados" },
    { id: "branding.updated", label: "Branding" },
  ];

  const filteredLogs = filter === "todos" ? logs : logs.filter((log) => log.action === filter);

  function exportCSV() {
    const rows: string[][] = [["Data", "Acao", "Detalhes", "IP"]];
    filteredLogs.forEach((log) => {
      rows.push([
        new Date(log.created_at).toLocaleString("pt-BR"),
        ACTION_CONFIG[log.action]?.label ?? log.action,
        JSON.stringify(log.details ?? {}),
        log.ip_address ?? "-",
      ]);
    });

    const csv = rows.map((row) => row.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "auditoria.csv";
    anchor.click();
  }

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Auditoria</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Historico de todas as acoes da agencia</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "#939da4", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((currentFilter) => (
          <button
            key={currentFilter.id}
            onClick={() => setFilter(currentFilter.id)}
            className="px-4 h-8 rounded-xl text-xs font-bold transition-all"
            style={filter === currentFilter.id
              ? { background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }
              : { background: "rgba(255,255,255,0.04)", color: "#939da4", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {currentFilter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <Activity className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(147,157,164,0.3)" }} />
          <p className="text-sm" style={{ color: "#939da4" }}>Nenhum evento registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredLogs.map((log, index) => {
            const config = ACTION_CONFIG[log.action] ?? { label: log.action, color: "#939da4", icon: Activity };
            const Icon = config.icon;

            return (
              <div
                key={log.id ?? `${log.action}-${index}`}
                className="flex items-start gap-4 px-5 py-4 rounded-xl transition-all"
                style={cardStyle}
                onMouseEnter={(event) => (event.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(event) => (event.currentTarget.style.background = "")}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${config.color}12` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{config.label}</p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>
                      {log.details.tenant_name && `Cliente: ${log.details.tenant_name}`}
                      {log.details.reason && ` · Motivo: ${log.details.reason}`}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs" style={{ color: "rgba(147,157,164,0.5)" }}>
                    {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {log.ip_address && (
                    <p className="text-[10px] mt-0.5 font-mono" style={{ color: "rgba(147,157,164,0.3)" }}>{log.ip_address}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
