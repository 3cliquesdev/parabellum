"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Bot, Trash2, Edit2, Zap, Headphones, Wallet, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const PAPEL_INFO: Record<string, { label: string; icon: typeof Bot; color: string }> = {
  vendas: { label: "Vendas", icon: Zap, color: "var(--status-ganho)" },
  suporte: { label: "Suporte", icon: Headphones, color: "#60a5fa" },
  financeiro: { label: "Financeiro", icon: Wallet, color: "#facc15" },
  geral: { label: "Geral (RAG)", icon: Bot, color: "#a78bfa" },
  personalizado: { label: "Personalizado", icon: Bot, color: "var(--text-secondary)" },
};

const MODELOS = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"];

interface Agente {
  id: string;
  papel: string;
  nome: string;
  persona: string;
  modelo: string;
  temperatura: number;
  ativo: boolean;
  n8n_workflow_id: string | null;
  ultima_sincronizacao: string | null;
  ultimo_erro_sincronizacao: string | null;
}

const cardStyle = {
  background: "var(--surface-gradient)",
  border: "1px solid var(--border-subtle)",
};

export default function AgentsPage() {
  const { tenantId } = useTenant();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Agente | null>(null);
  const [form, setForm] = useState({ nome: "", persona: "", modelo: "gpt-4o", temperatura: 0.7, ativo: true });
  const [saving, setSaving] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ id: string; ok: boolean; texto: string } | null>(null);

  const fetchAgentes = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const res = await fetch(`/api/ia/agentes?tenant_id=${tenantId}`);
    const data = await res.json().catch(() => ({}));
    setAgentes(data.agentes ?? []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    queueMicrotask(() => {
      void fetchAgentes();
    });
  }, [fetchAgentes, tenantId]);

  function abrirEdicao(agente: Agente) {
    setEditing(agente);
    setForm({ nome: agente.nome, persona: agente.persona, modelo: agente.modelo, temperatura: agente.temperatura, ativo: agente.ativo });
    setShowForm(true);
  }

  function abrirNovo() {
    setEditing(null);
    setForm({ nome: "", persona: "", modelo: "gpt-4o-mini", temperatura: 0.7, ativo: true });
    setShowForm(true);
  }

  async function salvar() {
    if (!tenantId || !form.nome) return;
    setSaving(true);
    setSyncMsg(null);

    if (editing) {
      const res = await fetch(`/api/ia/agentes/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.sync) {
        setSyncMsg({ id: editing.id, ok: data.sync.ok, texto: data.sync.ok ? "Sincronizado com o n8n" : data.sync.error });
      }
    } else {
      await fetch("/api/ia/agentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, ...form }),
      });
    }

    setSaving(false);
    setShowForm(false);
    setEditing(null);
    await fetchAgentes();
  }

  async function excluir(agente: Agente) {
    if (!tenantId) return;
    if (!confirm(`Excluir "${agente.nome}"?`)) return;
    const res = await fetch(`/api/ia/agentes/${agente.id}?tenant_id=${tenantId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao excluir");
      return;
    }
    fetchAgentes();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Agentes de IA</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Nome, persona, modelo e temperatura dos agentes que atendem no WhatsApp — editar aqui atualiza o n8n direto.
          </p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold shrink-0"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          <Plus className="w-4 h-4" /> Novo agente
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-6 space-y-5" style={cardStyle}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{editing ? `Editar ${editing.nome}` : "Novo agente personalizado"}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" style={{ color: "var(--text-secondary)" }} /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Nome do agente</label>
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Hunter"
                className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Modelo</label>
              <select value={form.modelo} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
                {MODELOS.map((m) => (
                  <option key={m} value={m} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Persona / instruções</label>
            <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              Isso define como o agente fala e vende. O bloco técnico que faz as ferramentas funcionarem (identificação de lead, tenant, conversa) fica protegido e é anexado automaticamente — não precisa se preocupar com ele aqui.
            </p>
            <textarea value={form.persona} onChange={(e) => setForm((f) => ({ ...f, persona: e.target.value }))}
              rows={12} placeholder="Ex: Você é o especialista de vendas da 3Cliques..."
              className="w-full p-3 rounded-xl text-xs text-white outline-none resize-y font-mono leading-relaxed"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Temperatura</label>
                <span className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>{form.temperatura}</span>
              </div>
              <input type="range" min="0" max="1" step="0.1" value={form.temperatura}
                onChange={(e) => setForm((f) => ({ ...f, temperatura: parseFloat(e.target.value) }))}
                className="w-full accent-[#10B981]" />
            </div>
            <label className="flex items-center gap-2 h-10">
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Ativo</span>
            </label>
          </div>

          {!editing && (
            <p className="text-[11px] rounded-lg p-2.5" style={{ background: "rgba(250,204,21,0.08)", color: "#facc15" }}>
              Agente personalizado — fica salvo aqui, mas ainda não conecta automaticamente a um fluxo do n8n.
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 h-9 rounded-xl text-sm"
              style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>Cancelar</button>
            <button onClick={salvar} disabled={saving || !form.nome}
              className="px-6 h-9 rounded-xl text-sm font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: saving || !form.nome ? 0.6 : 1 }}>
              {saving ? "Salvando..." : "Salvar agente"}
            </button>
          </div>
        </div>
      )}

      {agentes.length === 0 && !showForm ? (
        <div className="py-20 text-center rounded-xl" style={{ border: "1px solid var(--border-subtle)", background: "var(--surface)" }}>
          <Bot className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(147,157,164,0.3)" }} />
          <p className="text-sm font-medium text-white mb-1">Nenhum agente ainda</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Crie agentes especializados para diferentes funções</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agentes.map((agente) => {
            const info = PAPEL_INFO[agente.papel] ?? PAPEL_INFO.personalizado;
            const Icon = info.icon;
            const mensagemSync = syncMsg?.id === agente.id ? syncMsg : null;
            return (
              <div key={agente.id} className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${info.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: info.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{agente.nome}</p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: info.color }}>{info.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => abrirEdicao(agente)}>
                      <Edit2 className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                    </button>
                    {agente.papel === "personalizado" && (
                      <button onClick={() => excluir(agente)}>
                        <Trash2 className="w-4 h-4" style={{ color: "rgba(248,113,113,0.5)" }} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs line-clamp-3 mb-4 font-mono" style={{ color: "var(--text-secondary)" }}>
                  {agente.persona || "Sem persona definida"}
                </p>

                <div className="flex items-center justify-between text-[10px] mb-2" style={{ color: "rgba(147,157,164,0.5)" }}>
                  <span>{agente.modelo} · temp {agente.temperatura}</span>
                  <span className="font-bold" style={{ color: agente.ativo ? "var(--status-ganho)" : "var(--text-faint)" }}>
                    {agente.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>

                {agente.n8n_workflow_id && (
                  <div className="pt-2 flex items-center gap-1.5 text-[10px]" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-faint)" }}>
                    {agente.ultimo_erro_sincronizacao ? (
                      <>
                        <AlertTriangle className="w-3 h-3" style={{ color: "#f87171" }} />
                        <span style={{ color: "#f87171" }} title={agente.ultimo_erro_sincronizacao}>Não sincronizado com o n8n</span>
                      </>
                    ) : agente.ultima_sincronizacao ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" style={{ color: "var(--status-ganho)" }} />
                        <span>Sincronizado com o n8n</span>
                      </>
                    ) : (
                      <span>Ainda não sincronizado</span>
                    )}
                  </div>
                )}

                {mensagemSync && (
                  <p className="text-[10px] mt-2" style={{ color: mensagemSync.ok ? "var(--status-ganho)" : "#f87171" }}>
                    {mensagemSync.texto}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
