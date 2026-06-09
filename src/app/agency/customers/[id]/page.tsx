"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LogIn,
  Users,
  Calendar,
  CreditCard,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Save,
  FileText,
} from "lucide-react";
import {
  agencyBadgeStyle,
  agencyCardStrongStyle,
  agencyCardStyle,
  agencyGhostButtonStyle,
  agencyInputClass,
  agencyInputStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPrimaryButtonStyle,
} from "@/app/agency/theme";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  trial: { label: "Trial", color: "#facc15", icon: Clock },
  active: { label: "Ativo — Pago", color: "#9aea62", icon: CheckCircle },
  pending: { label: "Aguardando pagamento", color: "#f97316", icon: Clock },
  overdue: { label: "Em atraso", color: "#f87171", icon: AlertTriangle },
  cancelled: { label: "Cancelado", color: "#939da4", icon: XCircle },
};

const BILLING_CYCLES = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loginReason, setLoginReason] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [savedBilling, setSavedBilling] = useState(false);
  const [billingForm, setBillingForm] = useState({
    price_brl: "",
    billing_cycle: "mensal",
    plan_name: "Básico",
    payment_status: "trial",
    payment_link: "",
    next_billing_date: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/agency/customers").then((response) => response.json()),
      fetch(`/api/agency/tenant-billing?tenant_id=${id}`).then((response) => response.json()),
    ]).then(([customersData, billingData]) => {
      const selectedCustomer = (customersData.customers ?? []).find((item: any) => item.id === id);
      setCustomer(selectedCustomer ?? null);

      const billing = billingData.billing;
      if (billing) {
        setBillingForm({
          price_brl: String(billing.price_brl ?? ""),
          billing_cycle: billing.billing_cycle ?? "mensal",
          plan_name: billing.plan_name ?? "Básico",
          payment_status: billing.payment_status ?? "trial",
          payment_link: billing.payment_link ?? "",
          next_billing_date: billing.next_billing_date ?? "",
          notes: billing.notes ?? "",
        });
      }

      setLoading(false);
    });
  }, [id]);

  async function loginAs() {
    setLoggingIn(true);
    const response = await fetch(`/api/agency/customers/${id}/login-as`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: loginReason || "Suporte técnico" }),
    });
    const payload = await response.json();
    setLoggingIn(false);

    if (payload.success) {
      window.location.href = "/dashboard";
      return;
    }

    alert(payload.error ?? "Erro ao entrar no workspace");
  }

  async function saveBilling() {
    setSavingBilling(true);
    const response = await fetch("/api/agency/tenant-billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: id, ...billingForm, price_brl: parseFloat(billingForm.price_brl) || 0 }),
    });
    const payload = await response.json();
    setSavingBilling(false);
    if (payload.success) {
      setSavedBilling(true);
      setTimeout(() => setSavedBilling(false), 3000);
    }
  }

  async function markAsPaid() {
    await fetch("/api/agency/tenant-billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: id, payment_status: "active" }),
    });
    setBillingForm((current) => ({ ...current, payment_status: "active" }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--text-secondary)" }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Cliente não encontrado</p>
        <Link href="/agency/customers" className="text-xs mt-2 inline-block" style={{ color: "var(--status-ganho)" }}>← Voltar</Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[billingForm.payment_status] ?? STATUS_CONFIG.trial;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-8 space-y-6 max-w-2xl" style={agencyPageStyle}>
      <Link href="/agency/customers" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="w-3.5 h-3.5" />
        Clientes
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-extrabold" style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)", color: "var(--status-ganho)" }}>
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>{customer.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{customer.slug}</p>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={agencyBadgeStyle(statusConfig.color)}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5 grid grid-cols-3 gap-4" style={agencyCardStyle}>
        {[
          { icon: Users, label: "Membros", value: customer.member_count ?? 0 },
          { icon: Calendar, label: "Criado em", value: new Date(customer.created_at).toLocaleDateString("pt-BR") },
          { icon: CreditCard, label: "Mensalidade", value: billingForm.price_brl ? `R$ ${parseFloat(billingForm.price_brl).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
              <Icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{label}</p>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 space-y-5" style={agencyCardStrongStyle}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <CreditCard className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
              Cobrança do cliente
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Defina o valor e acompanhe o pagamento</p>
          </div>
          {billingForm.payment_status !== "active" && (
            <button onClick={markAsPaid} className="px-3 h-7 rounded-lg text-xs font-bold flex items-center gap-1.5" style={agencyOutlineButtonStyle("#9aea62")}>
              <CheckCircle className="w-3 h-3" />
              Marcar como pago
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Nome do plano</label>
            <input value={billingForm.plan_name} onChange={(event) => setBillingForm((current) => ({ ...current, plan_name: event.target.value }))} placeholder="Ex: Essencial, Pro, Premium" className={agencyInputClass} style={agencyInputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Valor (R$)</label>
            <input type="number" value={billingForm.price_brl} onChange={(event) => setBillingForm((current) => ({ ...current, price_brl: event.target.value }))} placeholder="297,00" className={agencyInputClass} style={agencyInputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Ciclo de cobrança</label>
            <select value={billingForm.billing_cycle} onChange={(event) => setBillingForm((current) => ({ ...current, billing_cycle: event.target.value }))} className={agencyInputClass} style={agencyInputStyle}>
              {BILLING_CYCLES.map((cycle) => <option key={cycle.value} value={cycle.value} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{cycle.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Status</label>
            <select value={billingForm.payment_status} onChange={(event) => setBillingForm((current) => ({ ...current, payment_status: event.target.value }))} className={agencyInputClass} style={agencyInputStyle}>
              {Object.entries(STATUS_CONFIG).map(([value, status]) => (
                <option key={value} value={value} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{status.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Próximo vencimento</label>
            <input type="date" value={billingForm.next_billing_date} onChange={(event) => setBillingForm((current) => ({ ...current, next_billing_date: event.target.value }))} className={agencyInputClass} style={agencyInputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Link de pagamento</label>
            <div className="flex gap-1">
              <input value={billingForm.payment_link} onChange={(event) => setBillingForm((current) => ({ ...current, payment_link: event.target.value }))} placeholder="https://..." className={agencyInputClass} style={agencyInputStyle} />
              {billingForm.payment_link && (
                <a href={billingForm.payment_link} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={agencyOutlineButtonStyle("#9aea62")}>
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: "#9aea62" }} />
                </a>
              )}
            </div>
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Observações internas</label>
            <textarea value={billingForm.notes} onChange={(event) => setBillingForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ex: Cliente pediu desconto para contrato anual..." rows={2} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ ...agencyInputStyle, color: "var(--text-primary)" }} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link href={`/agency/customers/${id}/invoice`} className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold" style={agencyGhostButtonStyle}>
            <FileText className="w-3.5 h-3.5" />
            Ver fatura
          </Link>
          <button onClick={saveBilling} disabled={savingBilling} className="flex items-center gap-2 px-5 h-9 rounded-xl text-sm font-bold" style={savedBilling ? agencyOutlineButtonStyle("#9aea62") : agencyPrimaryButtonStyle}>
            <Save className="w-3.5 h-3.5" />
            {savingBilling ? "Salvando..." : savedBilling ? "Salvo!" : "Salvar cobrança"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ ...agencyCardStyle, border: "1px solid rgba(250,204,21,0.25)" }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Entrar como este cliente</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Acesse o workspace para dar suporte. Sessão registrada.</p>
        </div>
        <input value={loginReason} onChange={(event) => setLoginReason(event.target.value)} placeholder="Motivo do acesso (ex: Configurar WhatsApp)" className={agencyInputClass} style={agencyInputStyle} />
        <button onClick={loginAs} disabled={loggingIn} className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={agencyOutlineButtonStyle("#facc15")}>
          <LogIn className="w-4 h-4" />
          {loggingIn ? "Entrando..." : "Entrar no workspace do cliente"}
        </button>
        <p className="text-[10px] text-center" style={{ color: "var(--text-faint)" }}>A sessão expira em 30 minutos automaticamente</p>
      </div>
    </div>
  );
}
