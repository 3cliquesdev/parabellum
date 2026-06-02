"use client";

import { useState, useEffect } from "react";
import { Plus, Bot, Trash2, Edit2, Zap, BookOpen, Users, Headphones } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

const ROLES = [
  { id: "sales", label: "Vendas", icon: Zap, color: "var(--status-ganho)", desc: "Qualifica leads e fecha negócios" },
  { id: "support", label: "Suporte", icon: Headphones, color: "#60a5fa", desc: "Resolve dúvidas e problemas" },
  { id: "onboarding", label: "Onboarding", icon: Users, color: "#a78bfa", desc: "Recebe e orienta novos clientes" },
  { id: "custom", label: "Personalizado", icon: Bot, color: "var(--text-secondary)", desc: "Comportamento totalmente customizado" },
];

const MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Rápido e eficiente (recomendado)" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", desc: "Mais inteligente para casos complexos" },
];

const INTENT_OPTIONS = ["comercial", "proposta", "qualificado", "suporte", "fechamento", "desistencia"];

interface Agent {
  id: string; nome: string; role: string; modelo: string;
  descricao: string; temperatura: number; max_tokens: number;
  kb_categories: string[]; ativo: boolean; created_at: string;
}

interface RoutingRule {
  id: string; persona_id: string; canal: string;
  keywords: string[]; intents: string[]; priority: number; ativo: boolean;
}

export default function AgentsPage() {
  const { tenantId } = useTenant();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState({
    nome: "", role: "sales", modelo: "gemini-2.0-flash",
    descricao: "", temperatura: 0.7, max_tokens: 300,
    kb_categories: [] as string[], ativo: true,
  });
  const [saving, setSaving] = useState(false);

  const cardStyle = {
    background: "var(--surface-gradient)",
    border: "1px solid var(--border-subtle)",
  };

  async function fetchData() {
    if (!tenantId) return;
    setLoading(true);
    const supabase = createClient();
    const [{ data: ag }, { data: rl }] = await Promise.all([
      supabase.from("personas").select("*").eq("tenant_id", tenantId).order("created_at"),
      supabase.from("agent_routing_rules").select("*").eq("tenant_id", tenantId).order("priority"),
    ]);
    setAgents((ag as Agent[]) ?? []);
    setRules((rl as RoutingRule[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { if (tenantId) fetchData(); }, [tenantId]);

  async function saveAgent() {
    if (!tenantId || !form.nome) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { tenant_id: tenantId, ...form };
    if (editing) {
      await supabase.from("personas").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("personas").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({ nome: "", role: "sales", modelo: "gemini-2.0-flash", descricao: "", temperatura: 0.7, max_tokens: 300, kb_categories: [], ativo: true });
    fetchData();
  }

  async function deleteAgent(id: string) {
    if (!confirm("Excluir este agente?")) return;
    const supabase = createClient();
    await supabase.from("personas").delete().eq("id", id);
    fetchData();
  }

  async function toggleRule(ruleId: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("agent_routing_rules").update({ ativo: !current }).eq("id", ruleId);
    fetchData();
  }

  async function addRoutingRule(personaId: string, intents: string[]) {
    if (!tenantId) return;
    const supabase = createClient();
    await supabase.from("agent_routing_rules").insert({
      tenant_id: tenantId, persona_id: personaId,
      intents, canal: "whatsapp", priority: rules.length, ativo: true,
    });
    fetchData();
  }

  const roleInfo = (role: string) => ROLES.find(r => r.id === role) ?? ROLES[3];

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 space-y-8" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Agentes de IA</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Crie agentes especializados com personalidades e funções diferentes
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); }}
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "#9aea62", color: "#0a0a0a" }}>
          <Plus className="w-4 h-4" /> Novo agente
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
          <h2 className="text-sm font-bold text-white">{editing ? "Editar agente" : "Novo agente"}</h2>

          {/* Role selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ROLES.map(r => {
              const Icon = r.icon;
              return (
                <button key={r.id} onClick={() => setForm(f => ({ ...f, role: r.id }))}
                  className="p-3 rounded-xl text-left transition-all"
                  style={form.role === r.id
                    ? { background: `${r.color}15`, border: `1px solid ${r.color}30` }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Icon className="w-4 h-4 mb-2" style={{ color: form.role === r.id ? r.color : "#939da4" }} />
                  <p className="text-xs font-bold" style={{ color: form.role === r.id ? r.color : "#fff" }}>{r.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{r.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Nome do agente</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Ana Vendas, Carlos Suporte..."
                className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Modelo LLM</label>
              <select value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "#fff" }}>
                {MODELS.map(m => <option key={m.id} value={m.id} style={{ background: "#111" }}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Instruções do agente</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={3} placeholder="Ex: Você é um especialista em vendas de marketing digital. Seja direto, use gatilhos de urgência e sempre tente marcar uma reunião."
              className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Criatividade</label>
                <span className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>{form.temperatura}</span>
              </div>
              <input type="range" min="0.1" max="1.0" step="0.1" value={form.temperatura}
                onChange={e => setForm(f => ({ ...f, temperatura: parseFloat(e.target.value) }))}
                className="w-full accent-[#9aea62]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Tamanho da resposta</label>
              <select value={form.max_tokens} onChange={e => setForm(f => ({ ...f, max_tokens: parseInt(e.target.value) }))}
                className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "#fff" }}>
                <option value={150} style={{ background: "#111" }}>Curto</option>
                <option value={300} style={{ background: "#111" }}>Médio</option>
                <option value={600} style={{ background: "#111" }}>Longo</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 h-9 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>Cancelar</button>
            <button onClick={saveAgent} disabled={saving || !form.nome}
              className="px-6 h-9 rounded-xl text-sm font-bold"
              style={{ background: "#9aea62", color: "#0a0a0a", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando..." : "Salvar agente"}
            </button>
          </div>
        </div>
      )}

      {/* Agents grid */}
      {agents.length === 0 && !showForm ? (
        <div className="py-20 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <Bot className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(147,157,164,0.3)" }} />
          <p className="text-sm font-medium text-white mb-1">Nenhum agente ainda</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Crie agentes especializados para diferentes funções</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map(agent => {
            const role = roleInfo(agent.role);
            const Icon = role.icon;
            const agentRules = rules.filter(r => r.persona_id === agent.id);
            return (
              <div key={agent.id} className="rounded-2xl p-5" style={cardStyle}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${role.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: role.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{agent.nome}</p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: role.color }}>{role.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setEditing(agent); setForm({ nome: agent.nome, role: agent.role, modelo: agent.modelo ?? "gemini-2.0-flash", descricao: agent.descricao ?? "", temperatura: agent.temperatura ?? 0.7, max_tokens: agent.max_tokens ?? 300, kb_categories: agent.kb_categories ?? [], ativo: agent.ativo }); setShowForm(true); }}>
                      <Edit2 className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                    </button>
                    <button onClick={() => deleteAgent(agent.id)}>
                      <Trash2 className="w-4 h-4" style={{ color: "rgba(248,113,113,0.5)" }} />
                    </button>
                  </div>
                </div>

                <p className="text-xs line-clamp-2 mb-4" style={{ color: "var(--text-secondary)" }}>
                  {agent.descricao || "Sem instruções definidas"}
                </p>

                <div className="flex items-center justify-between text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>
                  <span>{MODELS.find(m => m.id === agent.modelo)?.label ?? "Gemini 2.0 Flash"}</span>
                  <span>{agentRules.filter(r => r.ativo).length} regra(s) ativa(s)</span>
                </div>

                {/* Routing intents */}
                {agentRules.length > 0 && (
                  <div className="mt-3 pt-3 flex flex-wrap gap-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    {agentRules.flatMap(r => r.intents).slice(0, 4).map(intent => (
                      <span key={intent} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: `${role.color}12`, color: role.color }}>
                        {intent}
                      </span>
                    ))}
                  </div>
                )}

                {/* Add routing */}
                {agentRules.length === 0 && (
                  <button onClick={() => {
                    const defaultIntents: Record<string, string[]> = {
                      sales: ["comercial", "proposta", "fechamento"],
                      support: ["suporte"],
                      onboarding: ["qualificado"],
                    };
                    addRoutingRule(agent.id, defaultIntents[agent.role] ?? []);
                  }}
                    className="mt-3 w-full h-8 rounded-xl text-xs font-medium transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    + Adicionar regra de roteamento
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Routing rules section */}
      {rules.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
          <div className="px-6 py-4" style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="text-sm font-bold text-white">Regras de roteamento automático</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Quando o lead manda uma mensagem, qual agente responde</p>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {rules.map(rule => {
              const agent = agents.find(a => a.id === rule.persona_id);
              const role = roleInfo(agent?.role ?? "custom");
              return (
                <div key={rule.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs font-medium text-white">{agent?.nome ?? "Agente"}</span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>responde quando:</span>
                    <div className="flex gap-1.5">
                      {rule.intents.map(i => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: `${role.color}12`, color: role.color }}>{i}</span>
                      ))}
                      {rule.keywords.map(k => (
                        <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>"{k}"</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => toggleRule(rule.id, rule.ativo)}
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={rule.ativo
                      ? { background: "rgba(154,234,98,0.1)", color: "var(--status-ganho)" }
                      : { background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                    {rule.ativo ? "Ativo" : "Inativo"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
