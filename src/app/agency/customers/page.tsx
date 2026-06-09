"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, ArrowRight, Search } from "lucide-react";
import {
  agencyBadgeStyle,
  agencyCardStyle,
  agencyInputClass,
  agencyInputStyle,
  agencyPageStyle,
  agencyPanelStyle,
} from "@/app/agency/theme";

const STATUS_DOT: Record<string, string> = {
  trial: "#facc15",
  active: "#9aea62",
  pending: "#f97316",
  overdue: "#f87171",
  cancelled: "#939da4",
};

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Pago",
  pending: "Pendente",
  overdue: "Em atraso",
  cancelled: "Cancelado",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/agency/customers").then((response) => response.json()).then((payload) => {
      setCustomers(payload.customers ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6" style={agencyPageStyle}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Clientes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{customers.length} cliente(s) ativo(s)</p>
        </div>
        <Link
          href="/agency/customers/new"
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "var(--status-ganho)", color: "#0a0a0a" }}
        >
          <Plus className="w-4 h-4" />
          Novo cliente
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-faint)" }} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar cliente..."
          className={`${agencyInputClass} pl-9 pr-4`}
          style={agencyInputStyle}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--text-secondary)" }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center rounded-2xl" style={agencyPanelStyle}>
          <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Nenhum cliente encontrado</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>Crie seu primeiro cliente para começar</p>
          <Link
            href="/agency/customers/new"
            className="px-4 h-9 rounded-xl text-sm font-bold inline-flex items-center gap-2"
            style={{ background: "var(--status-ganho)", color: "#0a0a0a" }}
          >
            <Plus className="w-4 h-4" />
            Criar cliente
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => (
            <Link
              key={customer.id}
              href={`/agency/customers/${customer.id}`}
              className="flex items-center justify-between p-4 rounded-2xl transition-all"
              style={agencyCardStyle}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0"
                  style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)", color: "var(--status-ganho)" }}
                >
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{customer.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {customer.slug} · {customer.member_count} membro(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {customer.billing ? (
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_DOT[customer.billing.payment_status] ?? "#939da4" }} />
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={agencyBadgeStyle(STATUS_DOT[customer.billing.payment_status] ?? "#939da4")}
                      >
                        {STATUS_LABEL[customer.billing.payment_status] ?? "—"}
                      </span>
                    </div>
                    {customer.billing.price_brl > 0 && (
                      <p className="text-xs font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                        R$ {parseFloat(customer.billing.price_brl).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/
                        {customer.billing.billing_cycle === "mensal" ? "mês" : customer.billing.billing_cycle}
                      </p>
                    )}
                  </div>
                ) : (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "var(--ghost-bg)", border: "1px solid var(--chip-border)", color: "var(--text-secondary)" }}
                  >
                    Sem cobrança
                  </span>
                )}
                <ArrowRight className="w-4 h-4" style={{ color: "var(--text-faint)" }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
