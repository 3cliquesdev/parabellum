"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, ExternalLink, CheckCircle, Clock } from "lucide-react";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agency/customers").then(r => r.json()),
      fetch(`/api/agency/tenant-billing?tenant_id=${id}`).then(r => r.json()),
      fetch("/api/agency/stats").then(r => r.json()),
    ]).then(([customers, billing, stats]) => {
      const customer = (customers.customers ?? []).find((c: any) => c.id === id);
      setData({ customer, billing: billing.billing, agency: stats.agency });
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
  );

  if (!data?.customer || !data?.billing) return (
    <div className="p-8 text-center">
      <p className="text-sm" style={{ color: "#939da4" }}>Sem dados de cobrança para este cliente.</p>
      <Link href={`/agency/customers/${id}`} className="text-xs mt-2 inline-block" style={{ color: "#9aea62" }}>← Voltar</Link>
    </div>
  );

  const { customer, billing, agency } = data;
  const agencyName = agency?.display_name ?? agency?.name ?? "Liberty CRM";
  const isPaid = billing.payment_status === "active";
  const hoje = new Date().toLocaleDateString("pt-BR");
  const valor = parseFloat(billing.price_brl ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-8 max-w-2xl" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Ações (não imprimem) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href={`/agency/customers/${id}`} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#939da4" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 h-8 rounded-xl text-xs font-bold"
          style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
          <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
        </button>
      </div>

      {/* Fatura */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(23,23,23,0.95) 0%, rgba(10,10,10,0.98) 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
        {/* Header da fatura */}
        <div className="p-8 flex items-start justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-xl font-extrabold text-white tracking-[-0.03em]">{agencyName}</p>
            <p className="text-xs mt-1" style={{ color: "#939da4" }}>Fatura de serviços</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isPaid ? "" : ""}`}
              style={isPaid ? { background: "rgba(154,234,98,0.1)", color: "#9aea62" } : { background: "rgba(250,204,21,0.1)", color: "#facc15" }}>
              {isPaid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {isPaid ? "Pago" : "Aguardando pagamento"}
            </span>
          </div>
        </div>

        {/* Dados */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: "rgba(147,157,164,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cliente</p>
              <p className="text-sm font-bold text-white">{customer.name}</p>
              <p className="text-xs" style={{ color: "#939da4" }}>{customer.slug}</p>
            </div>
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: "rgba(147,157,164,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Data</p>
              <p className="text-sm font-bold text-white">{hoje}</p>
              {billing.next_billing_date && (
                <p className="text-xs" style={{ color: "#939da4" }}>
                  Vencimento: {new Date(billing.next_billing_date).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>

          {/* Item */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-5 py-3 flex items-center justify-between text-xs font-bold" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(147,157,164,0.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <span>Serviço</span><span>Valor</span>
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Plano {billing.plan_name ?? "CRM"}</p>
                <p className="text-xs" style={{ color: "#939da4" }}>{billing.billing_cycle ?? "mensal"} · {agencyName}</p>
              </div>
              <p className="text-lg font-extrabold text-white">{valor}</p>
            </div>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(154,234,98,0.03)" }}>
              <p className="text-sm font-bold text-white">Total</p>
              <p className="text-lg font-extrabold" style={{ color: "#9aea62" }}>{valor}</p>
            </div>
          </div>

          {/* Pagar */}
          {!isPaid && billing.payment_link && (
            <a href={billing.payment_link} target="_blank" rel="noopener noreferrer"
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
              style={{ background: "#9aea62", color: "#0a0a0a" }}>
              <ExternalLink className="w-4 h-4" />
              Pagar agora
            </a>
          )}

          {billing.notes && (
            <p className="text-xs p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", color: "#939da4" }}>
              {billing.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
