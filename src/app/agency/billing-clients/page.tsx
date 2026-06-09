"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, ArrowRight } from "lucide-react";
import {
  agencyBadgeStyle,
  agencyCardStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPanelStyle,
  agencyPrimaryButtonStyle,
} from "@/app/agency/theme";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  trial: { label: "Trial", color: "#facc15" },
  active: { label: "Pago", color: "#9aea62" },
  pending: { label: "Pendente", color: "#f97316" },
  overdue: { label: "Em atraso", color: "#f87171" },
  cancelled: { label: "Cancelado", color: "#939da4" },
};

export default function BillingClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agency/customers").then((response) => response.json()).then((payload) => {
      setClients(payload.customers ?? []);
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
    setClients((current) => current.map((client) => (
      client.id === tenantId
        ? { ...client, billing: { ...(client.billing ?? {}), payment_status: "active" } }
        : client
    )));
    setSaving(null);
  }

  const totalMRR = clients.reduce((sum, client) => sum + (client.billing?.price_brl ? parseFloat(client.billing.price_brl) : 0), 0);
  const pendentes = clients.filter((client) => ["pending", "overdue"].includes(client.billing?.payment_status));

  return (
    <div className="p-8 space-y-6" style={agencyPageStyle}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Cobranças dos clientes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Gerencie o que cada cliente paga à sua agência</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>
            R$ {totalMRR.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>MRR total</p>
        </div>
      </div>

      {pendentes.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={agencyOutlineButtonStyle("#f87171")}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#f87171" }} />
          <p className="text-xs font-medium" style={{ color: "#f87171" }}>
            <strong>{pendentes.length} cliente(s)</strong> com pagamento pendente ou em atraso.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--text-secondary)" }} />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={agencyCardStyle}>
          <div
            className="grid px-6 py-3 text-xs font-bold"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px", color: "var(--text-secondary)", background: "var(--surface-panel)" }}
          >
            <span>Cliente</span>
            <span>Plano</span>
            <span>Valor/mês</span>
            <span>Status</span>
            <span>Vencimento</span>
            <span>Ações</span>
          </div>

          {clients.length === 0 ? (
            <div className="py-12 text-center" style={agencyPanelStyle}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum cliente ainda.</p>
            </div>
          ) : clients.map((client, index) => {
            const billing = client.billing;
            const status = STATUS_CONFIG[billing?.payment_status ?? "trial"];
            const value = billing?.price_brl ? `R$ ${parseFloat(billing.price_brl).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

            return (
              <div
                key={client.id}
                className="grid px-6 py-4 items-center transition-colors"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px", borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)", color: "var(--status-ganho)" }}
                  >
                    {client.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{client.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{client.member_count ?? 0} membro(s)</p>
                  </div>
                </div>

                <span className="text-xs" style={{ color: "var(--text-primary)" }}>{billing?.plan_name ?? "—"}</span>
                <span className="text-sm font-bold" style={{ color: billing?.price_brl ? "var(--text-primary)" : "var(--text-faint)" }}>{value}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full w-fit" style={agencyBadgeStyle(status.color)}>{status.label}</span>
                <span className="text-xs" style={{ color: billing?.next_billing_date ? "var(--text-secondary)" : "var(--text-faint)" }}>
                  {billing?.next_billing_date ? new Date(billing.next_billing_date).toLocaleDateString("pt-BR") : "—"}
                </span>

                <div className="flex items-center gap-2">
                  {billing?.payment_status !== "active" && billing?.payment_status && (
                    <button onClick={() => markPaid(client.id)} disabled={saving === client.id} className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all" style={agencyOutlineButtonStyle("#9aea62")}>
                      {saving === client.id ? "..." : "Pago"}
                    </button>
                  )}
                  {billing?.payment_link && (
                    <a href={billing.payment_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    </a>
                  )}
                  <Link href={`/agency/customers/${client.id}`}>
                    <ArrowRight className="w-3.5 h-3.5" style={{ color: "var(--text-faint)" }} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
        Para editar valor, ciclo ou link de pagamento de um cliente, clique na seta →
      </p>
    </div>
  );
}
