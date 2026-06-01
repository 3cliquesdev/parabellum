"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, ExternalLink, AlertTriangle, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  trial:     { label: "Trial", color: "#facc15" },
  active:    { label: "Pago", color: "#9aea62" },
  pending:   { label: "Pendente", color: "#f97316" },
  overdue:   { label: "Em atraso", color: "#f87171" },
  cancelled: { label: "Cancelado", color: "#939da4" },
};

export default function BillingClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    fetch("/api/agency/customers").then(r => r.json()).then(d => {
      setClients(d.customers ?? []);
      setLoading(false);
    });
  }, []);

  async function markPaid(tenantId: string) {
    setSaving(tenantId);
    await fetch("/api/agency/tenant-billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, payment_status: "active" }),
    });
    setClients(cs => cs.map(c => c.id === tenantId
      ? { ...c, billing: { ...(c.billing ?? {}), payment_status: "active" } }
      : c
    ));
    setSaving(null);
  }

  const totalMRR = clients.reduce((s, c) => s + (c.billing?.price_brl ? parseFloat(c.billing.price_brl) : 0), 0);
  const pendentes = clients.filter(c => ["pending", "overdue"].includes(c.billing?.payment_status));

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Cobranças dos clientes</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>
            Gerencie o que cada cliente paga à sua agência
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-white tracking-[-0.03em]">
            R$ {totalMRR.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs" style={{ color: "#939da4" }}>MRR total</p>
        </div>
      </div>

      {/* Alertas de pendências */}
      {pendentes.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#f87171" }} />
          <p className="text-xs font-medium" style={{ color: "#f87171" }}>
            <strong>{pendentes.length} cliente(s)</strong> com pagamento pendente ou em atraso.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          {/* Header */}
          <div className="grid px-6 py-3 text-xs font-bold"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px", color: "#939da4", background: "rgba(0,0,0,0.3)" }}>
            <span>Cliente</span>
            <span>Plano</span>
            <span>Valor/mês</span>
            <span>Status</span>
            <span>Vencimento</span>
            <span>Ações</span>
          </div>

          {clients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: "#939da4" }}>Nenhum cliente ainda.</p>
            </div>
          ) : clients.map((c, i) => {
            const billing = c.billing;
            const status = STATUS_CONFIG[billing?.payment_status ?? "trial"];
            const valor = billing?.price_brl ? `R$ ${parseFloat(billing.price_brl).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

            return (
              <div key={c.id} className="grid px-6 py-4 items-center transition-colors"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>

                {/* Cliente */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{c.name}</p>
                    <p className="text-[10px]" style={{ color: "#939da4" }}>{c.member_count ?? 0} membro(s)</p>
                  </div>
                </div>

                {/* Plano */}
                <span className="text-xs text-white">{billing?.plan_name ?? "—"}</span>

                {/* Valor */}
                <span className="text-sm font-bold" style={{ color: billing?.price_brl ? "white" : "rgba(147,157,164,0.4)" }}>
                  {valor}
                </span>

                {/* Status */}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full w-fit"
                  style={{ color: status.color, background: `${status.color}15` }}>
                  {status.label}
                </span>

                {/* Vencimento */}
                <span className="text-xs" style={{ color: billing?.next_billing_date ? "#939da4" : "rgba(147,157,164,0.3)" }}>
                  {billing?.next_billing_date
                    ? new Date(billing.next_billing_date).toLocaleDateString("pt-BR")
                    : "—"}
                </span>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  {billing?.payment_status !== "active" && billing?.payment_status && (
                    <button onClick={() => markPaid(c.id)} disabled={saving === c.id}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                      style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
                      {saving === c.id ? "..." : "Pago"}
                    </button>
                  )}
                  {billing?.payment_link && (
                    <a href={billing.payment_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    </a>
                  )}
                  <Link href={`/agency/customers/${c.id}`}>
                    <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(147,157,164,0.4)" }} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: "rgba(147,157,164,0.4)" }}>
        Para editar valor, ciclo ou link de pagamento de um cliente, clique na seta →
      </p>
    </div>
  );
}
