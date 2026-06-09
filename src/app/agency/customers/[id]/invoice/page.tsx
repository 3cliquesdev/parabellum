"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, ExternalLink, CheckCircle, Clock } from "lucide-react";
import {
  agencyBadgeStyle,
  agencyCardStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPrimaryButtonStyle,
} from "@/app/agency/theme";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agency/customers").then((response) => response.json()),
      fetch(`/api/agency/tenant-billing?tenant_id=${id}`).then((response) => response.json()),
      fetch("/api/agency/stats").then((response) => response.json()),
    ]).then(([customers, billing, stats]) => {
      const customer = (customers.customers ?? []).find((item: any) => item.id === id);
      setData({ customer, billing: billing.billing, agency: stats.agency });
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--text-secondary)" }} />
      </div>
    );
  }

  if (!data?.customer || !data?.billing) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sem dados de cobrança para este cliente.</p>
        <Link href={`/agency/customers/${id}`} className="text-xs mt-2 inline-block" style={{ color: "var(--status-ganho)" }}>← Voltar</Link>
      </div>
    );
  }

  const { customer, billing, agency } = data;
  const agencyName = agency?.display_name ?? agency?.name ?? "Liberty CRM";
  const isPaid = billing.payment_status === "active";
  const today = new Date().toLocaleDateString("pt-BR");
  const amount = parseFloat(billing.price_brl ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-8 max-w-2xl" style={agencyPageStyle}>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href={`/agency/customers/${id}`} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 h-8 rounded-xl text-xs font-bold" style={agencyOutlineButtonStyle("#9aea62")}>
          <Printer className="w-3.5 h-3.5" />
          Imprimir / PDF
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={agencyCardStyle}>
        <div className="p-8 flex items-start justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <p className="text-xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>{agencyName}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Fatura de serviços</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={agencyBadgeStyle(isPaid ? "#9aea62" : "#facc15")}>
              {isPaid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {isPaid ? "Pago" : "Aguardando pagamento"}
            </span>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cliente</p>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{customer.name}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{customer.slug}</p>
            </div>
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Data</p>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{today}</p>
              {billing.next_billing_date && (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Vencimento: {new Date(billing.next_billing_date).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
            <div className="px-5 py-3 flex items-center justify-between text-xs font-bold" style={{ background: "var(--surface-panel)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <span>Serviço</span>
              <span>Valor</span>
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Plano {billing.plan_name ?? "CRM"}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{billing.billing_cycle ?? "mensal"} · {agencyName}</p>
              </div>
              <p className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>{amount}</p>
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--active-soft-bg)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Total</p>
              <p className="text-lg font-extrabold" style={{ color: "var(--status-ganho)" }}>{amount}</p>
            </div>
          </div>

          {!isPaid && billing.payment_link && (
            <a href={billing.payment_link} target="_blank" rel="noopener noreferrer" className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold" style={agencyPrimaryButtonStyle}>
              <ExternalLink className="w-4 h-4" />
              Pagar agora
            </a>
          )}

          {billing.notes && (
            <p className="text-xs p-3 rounded-xl" style={{ background: "var(--surface-panel)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              {billing.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
