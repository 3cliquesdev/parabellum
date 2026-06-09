"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Edit2, CheckCircle, X } from "lucide-react";
import {
  agencyCardStrongStyle,
  agencyCardStyle,
  agencyGhostButtonStyle,
  agencyInputClass,
  agencyInputStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPanelStyle,
  agencyPrimaryButtonStyle,
  agencyPrimaryPanelStyle,
} from "@/app/agency/theme";

const CYCLES = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const CYCLE_LABEL: Record<string, string> = {
  mensal: "/mes",
  trimestral: "/trim.",
  semestral: "/sem.",
  anual: "/ano",
};

interface AgencyPlan {
  id: string;
  nome: string;
  descricao: string | null;
  price_brl: number;
  billing_cycle: string;
  features: string[];
  ativo: boolean;
}

interface AgencyMembershipRow {
  agency_id: string;
}

interface PlanFormState {
  nome: string;
  descricao: string;
  price_brl: number | string;
  billing_cycle: string;
  features: string[];
}

interface PreviewPlan {
  nome: string;
  price_brl: number;
  desc: string;
  features: string[];
}

interface PlanFormProps {
  plan?: AgencyPlan;
  onSave: (plan: AgencyPlan) => void;
  onCancel: () => void;
}

function PlanForm({ plan, onSave, onCancel }: PlanFormProps) {
  const [form, setForm] = useState<PlanFormState>({
    nome: plan?.nome ?? "",
    descricao: plan?.descricao ?? "",
    price_brl: plan?.price_brl ?? "",
    billing_cycle: plan?.billing_cycle ?? "mensal",
    features: plan?.features ?? [""],
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nome) return;

    setSaving(true);
    const cleanFeatures = form.features.filter((feature) => feature.trim());
    const body = {
      ...form,
      features: cleanFeatures,
      price_brl: Number.parseFloat(String(form.price_brl)) || 0,
    };

    if (plan?.id) {
      const response = await fetch("/api/agency/client-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id, ...body }),
      });
      if (response.ok) onSave({ ...plan, ...body });
    } else {
      const response = await fetch("/api/agency/client-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.plan) onSave(data.plan as AgencyPlan);
    }

    setSaving(false);
  }

  function setFeature(index: number, value: string) {
    setForm((current) => {
      const nextFeatures = [...current.features];
      nextFeatures[index] = value;
      return { ...current, features: nextFeatures };
    });
  }

  return (
    <div className="rounded-2xl p-6 space-y-4" style={agencyCardStrongStyle}>
      <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{plan ? "Editar plano" : "Novo plano"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Nome do plano *</label>
          <input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Ex: Pro, Basico, Premium" className={agencyInputClass} style={agencyInputStyle} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Preco (R$) *</label>
          <input type="number" value={form.price_brl} onChange={(event) => setForm((current) => ({ ...current, price_brl: event.target.value }))} placeholder="497" className={agencyInputClass} style={agencyInputStyle} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Ciclo</label>
          <select value={form.billing_cycle} onChange={(event) => setForm((current) => ({ ...current, billing_cycle: event.target.value }))} className={agencyInputClass} style={agencyInputStyle}>
            {CYCLES.map((cycle) => <option key={cycle.value} value={cycle.value} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{cycle.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Descricao curta</label>
          <input value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} placeholder="Para empresas que querem crescer" className={agencyInputClass} style={agencyInputStyle} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Features incluidas</label>
          <button onClick={() => setForm((current) => ({ ...current, features: [...current.features, ""] }))} className="text-[10px] font-bold flex items-center gap-1" style={{ color: "var(--status-ganho)" }}>
            <Plus size={10} />
            Adicionar
          </button>
        </div>
        {form.features.map((feature, index) => (
          <div key={`${feature}-${index}`} className="flex gap-2">
            <input value={feature} onChange={(event) => setFeature(index, event.target.value)} placeholder={`Feature ${index + 1}`} className={`${agencyInputClass} flex-1`} style={agencyInputStyle} />
            <button onClick={() => setForm((current) => ({ ...current, features: current.features.filter((_, featureIndex) => featureIndex !== index) }))} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={agencyOutlineButtonStyle("#f87171")}>
              <X size={12} style={{ color: "#f87171" }} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 h-9 rounded-xl text-xs" style={agencyGhostButtonStyle}>Cancelar</button>
        <button onClick={save} disabled={saving || !form.nome} className="px-5 h-9 rounded-xl text-xs font-bold" style={{ ...agencyPrimaryButtonStyle, opacity: !form.nome ? 0.5 : 1 }}>
          {saving ? "Salvando..." : plan ? "Salvar alteracoes" : "Criar plano"}
        </button>
      </div>
    </div>
  );
}

const DEFAULT_PREVIEW: PreviewPlan[] = [
  { nome: "Basico", price_brl: 297, desc: "Para quem esta comecando", features: ["Pipeline de vendas", "WhatsApp com IA", "Suporte por chat"] },
  { nome: "Pro", price_brl: 497, desc: "O mais popular", features: ["Pipeline de vendas", "WhatsApp com IA", "Agentes de IA", "Broadcast em massa", "Suporte prioritario"] },
  { nome: "Premium", price_brl: 797, desc: "Para operacoes completas", features: ["Tudo do Pro", "Chat Flows", "Base de conhecimento", "Suporte dedicado"] },
];

export default function AgencyPlansPage() {
  const [plans, setPlans] = useState<AgencyPlan[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AgencyPlan | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }

      supabase
        .from("agency_users")
        .select("agency_id")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          const membership = data as unknown as AgencyMembershipRow | null;
          if (!membership) {
            setLoading(false);
            return;
          }

          setAgencyId(membership.agency_id);
          fetch(`/api/agency/client-plans?agency_id=${membership.agency_id}&active=false`)
            .then((response) => response.json())
            .then((payload) => {
              setPlans((payload.plans ?? []) as unknown as AgencyPlan[]);
              setLoading(false);
            });
        });
    });
  }, []);

  async function seedPlans() {
    if (!agencyId) return;

    setSeeding(true);
    const response = await fetch("/api/agency/client-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency_id: agencyId }),
    });
    const data = await response.json();
    if (data.plans) setPlans(data.plans as unknown as AgencyPlan[]);
    setSeeding(false);
  }

  async function deletePlan(id: string) {
    if (!confirm("Desativar este plano?")) return;

    await fetch("/api/agency/client-plans", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: id }),
    });
    setPlans((current) => current.filter((plan) => plan.id !== id));
  }

  function handleSave(plan: AgencyPlan) {
    if (editingPlan) {
      setPlans((current) => current.map((currentPlan) => (currentPlan.id === plan.id ? plan : currentPlan)));
      setEditingPlan(null);
      return;
    }

    setPlans((current) => [...current, plan]);
    setShowForm(false);
  }

  const activePlans = plans.filter((plan) => plan.ativo);
  const middleIdx = Math.floor(activePlans.length / 2);

  return (
    <div className="p-8 space-y-6" style={agencyPageStyle}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Planos para clientes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Configure os planos que voce oferece. Eles aparecem na sua pagina de vendas.
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingPlan(null); }} className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold" style={agencyOutlineButtonStyle("#9aea62")}>
          <Plus className="w-4 h-4" />
          Novo plano
        </button>
      </div>

      <div className="rounded-xl p-4" style={agencyPrimaryPanelStyle}>
        <p className="text-xs font-bold mb-1" style={{ color: "var(--status-ganho)" }}>Como funciona</p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Crie planos com nome, preco e features. Eles aparecem automaticamente na sua pagina de vendas
          (<strong style={{ color: "var(--text-primary)" }}>/r/seu-link</strong>) para que os prospects escolham antes de se cadastrar.
        </p>
      </div>

      {showForm && agencyId && <PlanForm onSave={handleSave} onCancel={() => setShowForm(false)} />}
      {editingPlan && agencyId && <PlanForm plan={editingPlan} onSave={handleSave} onCancel={() => setEditingPlan(null)} />}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--text-secondary)" }} />
        </div>
      ) : activePlans.length === 0 && !showForm ? (
        <div className="py-16 text-center rounded-2xl" style={agencyPanelStyle}>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>Nenhum plano configurado ainda</p>
          <p className="text-xs mb-8" style={{ color: "var(--text-secondary)" }}>Use os planos sugeridos ou crie do zero</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8 mx-auto">
            {DEFAULT_PREVIEW.map((plan, index) => (
              <div key={plan.nome} className="rounded-2xl p-5 text-left" style={index === 1 ? { ...agencyCardStyle, border: "1px solid var(--primary-border)", background: "linear-gradient(180deg, var(--primary-bg) 0%, var(--surface-gradient) 100%)", opacity: 0.9 } : { ...agencyCardStyle, opacity: 0.8 }}>
                {index === 1 && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block" style={agencyPrimaryButtonStyle}>
                    SUGERIDO
                  </span>
                )}
                <p className="text-sm font-extrabold mt-1" style={{ color: "var(--text-primary)" }}>{plan.nome}</p>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{plan.desc}</p>
                <p className="text-2xl font-extrabold mb-3" style={{ color: index === 1 ? "var(--status-ganho)" : "var(--text-primary)" }}>
                  R${plan.price_brl}
                  <span className="text-sm font-normal ml-1" style={{ color: "var(--text-secondary)" }}>/mes</span>
                </p>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-1.5 mb-1">
                    <CheckCircle size={10} style={{ color: "#9aea62" }} />
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{feature}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={seedPlans} disabled={seeding} className="px-6 h-10 rounded-xl text-sm font-bold flex items-center gap-2" style={agencyPrimaryButtonStyle}>
              {seeding ? "Criando..." : "Criar estes 3 planos"}
            </button>
            <button onClick={() => setShowForm(true)} className="px-6 h-10 rounded-xl text-sm font-bold" style={agencyGhostButtonStyle}>
              Criar do zero
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid gap-5 ${activePlans.length === 1 ? "grid-cols-1 max-w-sm" : activePlans.length === 2 ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
          {activePlans.map((plan, index) => {
            const isHighlight = activePlans.length >= 3 && index === middleIdx;

            return (
              <div key={plan.id} className="rounded-2xl p-6 flex flex-col" style={isHighlight ? { ...agencyCardStyle, border: "1px solid var(--primary-border)", background: "linear-gradient(180deg, var(--primary-bg) 0%, var(--surface-gradient) 100%)" } : agencyCardStyle}>
                {isHighlight && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full self-start mb-3 uppercase tracking-wider" style={agencyPrimaryButtonStyle}>
                    MAIS POPULAR
                  </span>
                )}
                <p className="text-base font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>{plan.nome}</p>
                {plan.descricao && <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{plan.descricao}</p>}
                <div className="mb-4">
                  <span className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
                    R${Number.parseFloat(String(plan.price_brl)).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </span>
                  <span className="text-sm ml-1" style={{ color: "var(--text-secondary)" }}>{CYCLE_LABEL[plan.billing_cycle] ?? "/mes"}</span>
                </div>
                {plan.features.length > 0 && (
                  <div className="flex-1 space-y-1.5 mb-5">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle size={12} style={{ color: "#9aea62" }} />
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => { setEditingPlan(plan); setShowForm(false); }} className="flex-1 h-8 rounded-xl text-xs font-bold" style={agencyGhostButtonStyle}>
                    <Edit2 size={12} className="inline mr-1" /> Editar
                  </button>
                  <button onClick={() => deletePlan(plan.id)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={agencyOutlineButtonStyle("#f87171")}>
                    <Trash2 size={12} style={{ color: "#f87171" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
