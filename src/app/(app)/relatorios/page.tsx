"use client";

import { useEffect, useState } from "react";
import { Clock, Users, BarChart3 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

interface GrupoSla {
  id: string;
  nome: string;
  total_conversas: number;
  tempo_medio_primeira_resposta_min: number | null;
  tempo_medio_resolucao_min: number | null;
}

interface SlaResponse {
  periodo: { de: string; ate: string };
  geral: GrupoSla;
  por_departamento: GrupoSla[];
  por_agente: GrupoSla[];
}

function formatarMin(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

export default function RelatoriosPage() {
  const { tenantId } = useTenant();
  const [dados, setDados] = useState<SlaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    if (!tenantId) return;
    queueMicrotask(() => {
      setLoading(true);
      const de = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
      fetch(`/api/relatorios/sla-conversas?tenant_id=${tenantId}&de=${encodeURIComponent(de)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setDados)
        .finally(() => setLoading(false));
    });
  }, [tenantId, dias]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>
            Relatório de SLA — Conversas
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Tempo médio de primeira resposta e de resolução, do início da conversa até o fim.
          </p>
        </div>
        <select
          value={dias}
          onChange={(e) => setDias(Number(e.target.value))}
          className="h-9 px-3 rounded-lg text-sm outline-none"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--status-ganho)" }} />
        </div>
      ) : !dados ? (
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Não foi possível carregar o relatório.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] p-5" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
                <p className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Conversas no período</p>
              </div>
              <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{dados.geral.total_conversas}</p>
            </div>
            <div className="rounded-[24px] p-5" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
                <p className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Tempo médio de 1ª resposta</p>
              </div>
              <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{formatarMin(dados.geral.tempo_medio_primeira_resposta_min)}</p>
            </div>
            <div className="rounded-[24px] p-5" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
                <p className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Tempo médio de resolução</p>
              </div>
              <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{formatarMin(dados.geral.tempo_medio_resolucao_min)}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] p-5" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>Por departamento</p>
              {dados.por_departamento.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>Sem dados no período.</p>
              ) : (
                <div className="space-y-2">
                  {dados.por_departamento.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{g.nome}</span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {g.total_conversas} conv · 1ª resp {formatarMin(g.tempo_medio_primeira_resposta_min)} · resol. {formatarMin(g.tempo_medio_resolucao_min)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[24px] p-5" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>Por atendente</p>
              {dados.por_agente.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>Sem dados no período.</p>
              ) : (
                <div className="space-y-2">
                  {dados.por_agente.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{g.nome}</span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {g.total_conversas} conv · 1ª resp {formatarMin(g.tempo_medio_primeira_resposta_min)} · resol. {formatarMin(g.tempo_medio_resolucao_min)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
