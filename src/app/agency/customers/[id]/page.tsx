"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LogIn, Users, Calendar, CreditCard, ExternalLink, CheckCircle, Clock, AlertTriangle, XCircle, Save } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  trial:     { label: "Trial", color: "#facc15", icon: Clock },
  active:    { label: "Ativo — Pago", color: "#9aea62", icon: CheckCircle },
  pending:   { label: "Aguardando pagamento", color: "#f97316", icon: Clock },
  overdue:   { label: "Em atraso", color: "#f87171", icon: AlertTriangle },
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
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loginReason, setLoginReason] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [savedBilling, setSavedBilling] = useState(false);
  const [billingForm, setBillingForm] = useState({
    price_brl: "", billing_cycle: "mensal", plan_name: "Básico",
    payment_status: "trial", payment_link: "", next_billing_date: "", notes: "",
  });

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };
  const inputClass = "w-full h-9 px-3 rounded-xl text-sm text-white outline-none";
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

  useEffect(() => {
    Promise.all([
      fetch("/api/agency/customers").then(r => r.json()),
      fetch(`/api/agency/tenant-billing?tenant_id=${id}`).then(r => r.json()),
    ]).then(([customersData, billingData]) => {
      const c = (customersData.customers ?? []).find((x: any) => x.id === id);
      setCustomer(c ?? null);
      const b = billingData.billing;
      setBilling(b);
      if (b) setBillingForm({
        price_brl: String(b.price_brl ?? ""),
        billing_cycle: b.billing_cycle ?? "mensal",
        plan_name: b.plan_name ?? "Básico",
        payment_status: b.payment_status ?? "trial",
        payment_link: b.payment_link ?? "",
        next_billing_date: b.next_billing_date ?? "",
        notes: b.notes ?? "",
      });
      setLoading(false);
    });
  }, [id]);

  async function loginAs() {
    setLoggingIn(true);
    const r = await fetch(`/api/agency/customers/${id}/login-as`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: loginReason || "Suporte técnico" }),
    });
    const d = await r.json();
    setLoggingIn(false);
    if (d.success) window.location.href = "/dashboard";
    else alert(d.error ?? "Erro ao entrar no workspace");
  }

  async function saveBilling() {
    setSavingBilling(true);
    const r = await fetch("/api/agency/tenant-billing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: id, ...billingForm, price_brl: parseFloat(billingForm.price_brl) || 0 }),
    });
    const d = await r.json();
    setSavingBilling(false);
    if (d.success) { setBilling(d.billing); setSavedBilling(true); setTimeout(() => setSavedBilling(false), 3000); }
  }

  async function markAsPaid() {
    await fetch("/api/agency/tenant-billing", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: id, payment_status: "active" }),
    });
    setBillingForm(f => ({ ...f, payment_status: "active" }));
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  if (!customer) return (
    <div className="p-8 text-center">
      <p className="text-sm" style={{ color: "#939da4" }}>Cliente não encontrado</p>
      <Link href="/agency/customers" className="text-xs mt-2 inline-block" style={{ color: "#9aea62" }}>← Voltar</Link>
    </div>
  );

  const statusCfg = STATUS_CONFIG[billingForm.payment_status] ?? STATUS_CONFIG.trial;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="p-8 space-y-6 max-w-2xl" style={{ fontFamily: "var(--font-sans)" }}>
      <Link href="/agency/customers" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#939da4" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Clientes
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-extrabold"
          style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">{customer.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm" style={{ color: "#939da4" }}>{customer.slug}</p>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${statusCfg.color}15`, color: statusCfg.color }}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* Info básica */}
      <div className="rounded-2xl p-5 grid grid-cols-3 gap-4" style={cardStyle}>
        {[
          { icon: Users, label: "Membros", value: customer.member_count ?? 0 },
          { icon: Calendar, label: "Criado em", value: new Date(customer.created_at).toLocaleDateString("pt-BR") },
          { icon: CreditCard, label: "Mensalidade", value: billingForm.price_brl ? `R$ ${parseFloat(billingForm.price_brl).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Icon className="w-4 h-4" style={{ color: "#939da4" }} />
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>{label}</p>
              <p className="text-sm font-bold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── COBRANÇA ── */}
      <div className="rounded-2xl p-5 space-y-5" style={{ ...cardStyle, border: "1px solid rgba(154,234,98,0.12)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4" style={{ color: "#9aea62" }} />
              Cobrança do cliente
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>Defina o valor e acompanhe o pagamento</p>
          </div>
          {billingForm.payment_status !== "active" && (
            <button onClick={markAsPaid} className="px-3 h-7 rounded-lg text-xs font-bold flex items-center gap-1.5"
              style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
              <CheckCircle className="w-3 h-3" /> Marcar como pago
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Nome do plano</label>
            <input value={billingForm.plan_name} onChange={e => setBillingForm(f => ({ ...f, plan_name: e.target.value }))}
              placeholder="Ex: Essencial, Pro, Premium" className={inputClass} style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Valor (R$)</label>
            <input type="number" value={billingForm.price_brl} onChange={e => setBillingForm(f => ({ ...f, price_brl: e.target.value }))}
              placeholder="297,00" className={inputClass} style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Ciclo de cobrança</label>
            <select value={billingForm.billing_cycle} onChange={e => setBillingForm(f => ({ ...f, billing_cycle: e.target.value }))}
              className={inputClass} style={{ ...inputStyle, color: "#fff" }}>
              {BILLING_CYCLES.map(c => <option key={c.value} value={c.value} style={{ background: "#111" }}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Status</label>
            <select value={billingForm.payment_status} onChange={e => setBillingForm(f => ({ ...f, payment_status: e.target.value }))}
              className={inputClass} style={{ ...inputStyle, color: statusCfg.color }}>
              {Object.entries(STATUS_CONFIG).map(([v, s]) => (
                <option key={v} value={v} style={{ background: "#111", color: "#fff" }}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Próximo vencimento</label>
            <input type="date" value={billingForm.next_billing_date} onChange={e => setBillingForm(f => ({ ...f, next_billing_date: e.target.value }))}
              className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Link de pagamento</label>
            <div className="flex gap-1">
              <input value={billingForm.payment_link} onChange={e => setBillingForm(f => ({ ...f, payment_link: e.target.value }))}
                placeholder="https://..." className={inputClass} style={inputStyle} />
              {billingForm.payment_link && (
                <a href={billingForm.payment_link} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(154,234,98,0.1)", border: "1px solid rgba(154,234,98,0.2)" }}>
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: "#9aea62" }} />
                </a>
              )}
            </div>
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "#939da4" }}>Observações internas</label>
            <textarea value={billingForm.notes} onChange={e => setBillingForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ex: Cliente pediu desconto para contrato anual..." rows={2}
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none resize-none"
              style={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={saveBilling} disabled={savingBilling}
            className="flex items-center gap-2 px-5 h-9 rounded-xl text-sm font-bold"
            style={{ background: savedBilling ? "rgba(154,234,98,0.1)" : "#9aea62", color: savedBilling ? "#9aea62" : "#0a0a0a" }}>
            <Save className="w-3.5 h-3.5" />
            {savingBilling ? "Salvando..." : savedBilling ? "Salvo!" : "Salvar cobrança"}
          </button>
        </div>
      </div>

      {/* Login as */}
      <div className="rounded-2xl p-5 space-y-4" style={{ ...cardStyle, border: "1px solid rgba(250,204,21,0.15)" }}>
        <div>
          <h2 className="text-sm font-bold text-white">Entrar como este cliente</h2>
          <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>Acesse o workspace para dar suporte. Sessão registrada.</p>
        </div>
        <input value={loginReason} onChange={e => setLoginReason(e.target.value)}
          placeholder="Motivo do acesso (ex: Configurar WhatsApp)"
          className="w-full h-9 px-3 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <button onClick={loginAs} disabled={loggingIn}
          className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: "rgba(250,204,21,0.1)", color: "#facc15", border: "1px solid rgba(250,204,21,0.2)" }}>
          <LogIn className="w-4 h-4" />
          {loggingIn ? "Entrando..." : "Entrar no workspace do cliente"}
        </button>
        <p className="text-[10px] text-center" style={{ color: "rgba(147,157,164,0.4)" }}>A sessão expira em 30 minutos automaticamente</p>
      </div>
    </div>
  );
}
