"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Edit2, CheckCircle, X, LayoutList } from "lucide-react";

const CYCLES = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const CYCLE_LABEL: Record<string, string> = {
  mensal: "/mês", trimestral: "/trim.", semestral: "/sem.", anual: "/ano",
};

function PlanForm({ plan, agencyId, onSave, onCancel }: {
  plan?: any; agencyId: string; onSave: (p: any) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    nome: plan?.nome ?? "",
    descricao: plan?.descricao ?? "",
    price_brl: plan?.price_brl ?? "",
    billing_cycle: plan?.billing_cycle ?? "mensal",
    features: plan?.features ?? [""],
  });
  const [saving, setSaving] = useState(false);

  const inputClass = "w-full h-9 px-3 rounded-xl text-sm text-white outline-none";
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

  async function save() {
    if (!form.nome) return;
    setSaving(true);
    const cleanFeatures = form.features.filter((f: string) => f.trim());
    const body = { ...form, features: cleanFeatures, price_brl: parseFloat(String(form.price_brl)) || 0 };

    if (plan?.id) {
      const r = await fetch("/api/agency/client-plans", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: plan.id, ...body }) });
      if (r.ok) onSave({ ...plan, ...body });
    } else {
      const r = await fetch("/api/agency/client-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.plan) onSave(d.plan);
    }
    setSaving(false);
  }

  function setFeature(i: number, val: string) {
    setForm(f => { const arr = [...f.features]; arr[i] = val; return { ...f, features: arr }; });
  }
  function addFeature() { setForm(f => ({ ...f, features: [...f.features, ""] })); }
  function removeFeature(i: number) { setForm(f => ({ ...f, features: f.features.filter((_: string, j: number) => j !== i) })); }

  return (
    <div className="rounded-2xl p-6 space-y-4" style={{ background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(154,234,98,0.2)" }}>
      <h3 className="text-sm font-bold text-white">{plan ? "Editar plano" : "Novo plano"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Nome do plano *</label>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Ex: Pro, Básico, Premium" className={inputClass} style={inputStyle} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Preço (R$) *</label>
          <input type="number" value={form.price_brl} onChange={e => setForm(f => ({ ...f, price_brl: e.target.value }))}
            placeholder="497" className={inputClass} style={inputStyle} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Ciclo</label>
          <select value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))}
            className={inputClass} style={{ ...inputStyle, color: "#fff" }}>
            {CYCLES.map(c => <option key={c.value} value={c.value} style={{ background: "#111" }}>{c.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Descrição curta</label>
          <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Para empresas que querem crescer" className={inputClass} style={inputStyle} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Features incluídas</label>
          <button onClick={addFeature} className="text-[10px] font-bold flex items-center gap-1" style={{ color: "#9aea62" }}>
            <Plus size={10} /> Adicionar
          </button>
        </div>
        {form.features.map((f: string, i: number) => (
          <div key={i} className="flex gap-2">
            <input value={f} onChange={e => setFeature(i, e.target.value)}
              placeholder={`Feature ${i + 1}`} className={`${inputClass} flex-1`} style={inputStyle} />
            <button onClick={() => removeFeature(i)} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>
              <X size={12} style={{ color: "#f87171" }} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 h-9 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Cancelar</button>
        <button onClick={save} disabled={saving || !form.nome}
          className="px-5 h-9 rounded-xl text-xs font-bold"
          style={{ background: "#9aea62", color: "#0a0a0a", opacity: !form.nome ? 0.5 : 1 }}>
          {saving ? "Salvando..." : plan ? "Salvar alterações" : "Criar plano"}
        </button>
      </div>
    </div>
  );
}

const DEFAULT_PREVIEW = [
  { nome: "Básico", price_brl: 297, desc: "Para quem está começando", features: ["Pipeline de vendas", "WhatsApp com IA", "Suporte por chat"] },
  { nome: "Pro", price_brl: 497, desc: "O mais popular", features: ["Pipeline de vendas", "WhatsApp com IA", "Agentes de IA", "Broadcast em massa", "Suporte prioritário"] },
  { nome: "Premium", price_brl: 797, desc: "Para operações completas", features: ["Tudo do Pro", "Chat Flows", "Base de conhecimento", "Suporte dedicado"] },
];

export default function AgencyPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [seeding, setSeeding] = useState(false);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("agency_users").select("agency_id").eq("user_id", user.id).single()
        .then(({ data }: { data: any }) => {
          if (!data) return;
          setAgencyId(data.agency_id);
          fetch(`/api/agency/client-plans?agency_id=${data.agency_id}&active=false`)
            .then(r => r.json()).then(d => { setPlans(d.plans ?? []); setLoading(false); });
        });
    });
  }, []);

  async function seedPlans() {
    if (!agencyId) return;
    setSeeding(true);
    const r = await fetch("/api/agency/client-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency_id: agencyId }),
    });
    const d = await r.json();
    if (d.plans) setPlans(d.plans);
    setSeeding(false);
  }

  async function deletePlan(id: string) {
    if (!confirm("Desativar este plano?")) return;
    await fetch("/api/agency/client-plans", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: id }) });
    setPlans(ps => ps.filter(p => p.id !== id));
  }

  function handleSave(plan: any) {
    if (editingPlan) {
      setPlans(ps => ps.map(p => p.id === plan.id ? plan : p));
      setEditingPlan(null);
    } else {
      setPlans(ps => [...ps, plan]);
      setShowForm(false);
    }
  }

  const activePlans = plans.filter(p => p.ativo);
  const middleIdx = Math.floor(activePlans.length / 2);

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Planos para clientes</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>
            Configure os planos que você oferece. Eles aparecem na sua página de vendas.
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingPlan(null); }}
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
          <Plus className="w-4 h-4" /> Novo plano
        </button>
      </div>

      {/* Info box */}
      <div className="rounded-xl p-4" style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.1)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "#9aea62" }}>Como funciona</p>
        <p className="text-xs" style={{ color: "#939da4" }}>
          Crie planos com nome, preço e features. Eles aparecem automaticamente na sua página de vendas
          (<strong className="text-white">/r/seu-link</strong>) para que os prospects escolham antes de se cadastrar.
        </p>
      </div>

      {/* Form criar */}
      {showForm && agencyId && (
        <PlanForm agencyId={agencyId} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {/* Form editar */}
      {editingPlan && agencyId && (
        <PlanForm plan={editingPlan} agencyId={agencyId} onSave={handleSave} onCancel={() => setEditingPlan(null)} />
      )}

      {/* Lista de planos */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
      ) : activePlans.length === 0 && !showForm ? (
        <div className="py-16 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-sm font-bold text-white mb-1">Nenhum plano configurado ainda</p>
          <p className="text-xs mb-8" style={{ color: "#939da4" }}>Use os planos sugeridos ou crie do zero</p>

          {/* Preview dos 3 planos padrão */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
            {DEFAULT_PREVIEW.map((p, i) => (
              <div key={p.nome} className="rounded-2xl p-5 text-left" style={{
                background: i === 1 ? "linear-gradient(180deg, rgba(154,234,98,0.06) 0%, rgba(13,13,13,0.92) 100%)" : cardStyle.background,
                border: i === 1 ? "1px solid rgba(154,234,98,0.25)" : cardStyle.border,
                opacity: 0.75,
              }}>
                {i === 1 && <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block" style={{ background: "#9aea62", color: "#0a0a0a" }}>SUGERIDO</span>}
                <p className="text-sm font-extrabold text-white mt-1">{p.nome}</p>
                <p className="text-xs mb-2" style={{ color: "#939da4" }}>{p.desc}</p>
                <p className="text-2xl font-extrabold mb-3" style={{ color: i === 1 ? "#9aea62" : "white" }}>R${p.price_brl}<span className="text-sm font-normal" style={{ color: "#939da4" }}>/mês</span></p>
                {p.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5 mb-1">
                    <CheckCircle size={10} style={{ color: "#9aea62" }} />
                    <span className="text-[10px]" style={{ color: "#939da4" }}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={seedPlans} disabled={seeding}
              className="px-6 h-10 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{ background: "#9aea62", color: "#0a0a0a" }}>
              {seeding ? "Criando..." : "Criar estes 3 planos"}
            </button>
            <button onClick={() => setShowForm(true)} className="px-6 h-10 rounded-xl text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.06)", color: "#939da4", border: "1px solid rgba(255,255,255,0.08)" }}>
              Criar do zero
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid gap-5 ${activePlans.length === 1 ? "grid-cols-1 max-w-sm" : activePlans.length === 2 ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
          {activePlans.map((plan, i) => {
            const isHighlight = activePlans.length >= 3 && i === middleIdx;
            return (
              <div key={plan.id} className="rounded-2xl p-6 flex flex-col" style={{
                ...cardStyle,
                border: isHighlight ? "1px solid rgba(154,234,98,0.3)" : cardStyle.border,
                background: isHighlight ? "linear-gradient(180deg, rgba(154,234,98,0.06) 0%, rgba(13,13,13,0.92) 100%)" : cardStyle.background,
              }}>
                {isHighlight && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full self-start mb-3 uppercase tracking-wider"
                    style={{ background: "#9aea62", color: "#0a0a0a" }}>MAIS POPULAR</span>
                )}
                <p className="text-base font-extrabold text-white mb-1">{plan.nome}</p>
                {plan.descricao && <p className="text-xs mb-3" style={{ color: "#939da4" }}>{plan.descricao}</p>}
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-white">R${parseFloat(plan.price_brl).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                  <span className="text-sm" style={{ color: "#939da4" }}>{CYCLE_LABEL[plan.billing_cycle] ?? "/mês"}</span>
                </div>
                {(plan.features ?? []).length > 0 && (
                  <div className="flex-1 space-y-1.5 mb-5">
                    {(plan.features ?? []).map((f: string) => (
                      <div key={f} className="flex items-center gap-2">
                        <CheckCircle size={12} style={{ color: "#9aea62" }} />
                        <span className="text-xs" style={{ color: "#CBD5E1" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => { setEditingPlan(plan); setShowForm(false); }}
                    className="flex-1 h-8 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
                    <Edit2 size={12} className="inline mr-1" /> Editar
                  </button>
                  <button onClick={() => deletePlan(plan.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.12)" }}>
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
