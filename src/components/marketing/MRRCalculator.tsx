"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

const SCENARIOS = [
  { clientes: 10, ticket: 497, label: "10 clientes" },
  { clientes: 30, ticket: 497, label: "30 clientes" },
  { clientes: 50, ticket: 497, label: "50 clientes" },
];

export function MRRCalculator() {
  const [selected, setSelected] = useState(1);
  const { clientes, ticket } = SCENARIOS[selected];
  const mrrBruto = clientes * ticket;
  const mrrParceiro = Math.round(mrrBruto * 0.85);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{
      background: "linear-gradient(180deg, #101720 0%, #0B0F14 100%)",
      border: "1px solid #1F2937",
    }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
            <TrendingUp size={16} style={{ color: "#22C55E" }} />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "#22C55E", letterSpacing: "0.1em" }}>
            Simulador de Recorrência
          </p>
        </div>
        <p className="text-base" style={{ color: "#94A3B8" }}>
          Veja o potencial da sua operação
        </p>
      </div>

      <div className="p-8 space-y-8">
        {/* Selector */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#64748B" }}>
            Número de clientes ativos
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SCENARIOS.map((s, i) => (
              <button key={i} onClick={() => setSelected(i)}
                className="py-3 rounded-xl text-sm font-bold transition-all duration-200"
                style={selected === i ? {
                  background: "linear-gradient(135deg, #22C55E, #3B82F6)",
                  color: "#fff",
                  boxShadow: "0 0 24px rgba(34,197,94,0.3)",
                } : {
                  background: "#1F2937",
                  color: "#94A3B8",
                  border: "1px solid #374151",
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket */}
        <div className="flex items-center justify-between px-5 py-4 rounded-xl" style={{ background: "#1A2235", border: "1px solid #1F2937" }}>
          <span className="text-sm font-medium" style={{ color: "#64748B" }}>Ticket médio por cliente</span>
          <span className="text-lg font-bold" style={{ color: "#F8FAFC" }}>R${ticket}/mês</span>
        </div>

        {/* Result */}
        <div className="rounded-[18px] p-7 text-center" style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))",
          border: "1px solid rgba(34,197,94,0.2)",
        }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#94A3B8" }}>
            {clientes} clientes × R${ticket}/mês
          </p>
          <p className="font-extrabold leading-none mb-2 tracking-tight" style={{
            fontSize: "clamp(40px, 6vw, 64px)",
            background: "linear-gradient(135deg, #22C55E, #3B82F6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            R${mrrBruto.toLocaleString("pt-BR")}
          </p>
          <p className="text-sm font-medium" style={{ color: "#94A3B8" }}>MRR bruto por mês</p>
        </div>

        {/* Parceiro take */}
        <div className="flex items-center justify-between px-5 py-4 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#22C55E" }}>Você recebe (85%)</p>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Recorrente enquanto o cliente estiver ativo</p>
          </div>
          <p className="text-2xl font-extrabold" style={{ color: "#22C55E" }}>
            R${mrrParceiro.toLocaleString("pt-BR")}
          </p>
        </div>

        <p className="text-center text-xs" style={{ color: "#4B5563" }}>
          Sem precisar criar software • Sem equipe de dev • Sem anos de construção
        </p>
      </div>
    </div>
  );
}
