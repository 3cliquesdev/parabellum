"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Edit2, Plus, Trash2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

const DEFAULTS = [
  {
    titulo: "Saudação inicial",
    atalho: "!ola",
    conteudo: "Olá! Tudo bem? Sou a [Nome], da [Empresa]. Como posso te ajudar hoje?",
    categoria: "Apresentação",
  },
  {
    titulo: "Solicitar contato",
    atalho: "!contato",
    conteudo: "Para eu te ajudar melhor, pode me passar seu nome completo e melhor horário para contato?",
    categoria: "Qualificação",
  },
  {
    titulo: "Enviar proposta",
    atalho: "!proposta",
    conteudo: "Ótimo! Vou preparar uma proposta personalizada para você. Posso enviar ainda hoje. Qual o melhor e-mail?",
    categoria: "Proposta",
  },
  {
    titulo: "Aguardar retorno",
    atalho: "!followup",
    conteudo: "Oi! Só passando para saber se você teve chance de analisar nossa proposta. Ficou alguma dúvida?",
    categoria: "Follow-up",
  },
  {
    titulo: "Fechar negócio",
    atalho: "!fechar",
    conteudo: "Que ótimo! Vamos dar início ao processo. Vou te enviar o contrato e as instruções para o próximo passo.",
    categoria: "Fechamento",
  },
] as const;

interface QuickResponse {
  id: string;
  titulo: string;
  atalho: string | null;
  conteudo: string;
  categoria: string;
  uso_count: number;
}

export default function ResponsesPage() {
  const { tenantId } = useTenant();
  const [responses, setResponses] = useState<QuickResponse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuickResponse | null>(null);
  const [form, setForm] = useState({ titulo: "", atalho: "", conteudo: "", categoria: "Geral" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };

  const fetchResponses = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("respostas_rapidas")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("uso_count", { ascending: false });
    setResponses((data ?? []) as unknown as QuickResponse[]);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;

    queueMicrotask(() => {
      void fetchResponses();
    });
  }, [fetchResponses, tenantId]);

  async function saveResponse() {
    if (!tenantId || !form.titulo || !form.conteudo) return;

    setSaving(true);
    const supabase = createClient();
    const payload = {
      tenant_id: tenantId,
      ...form,
      atalho: form.atalho ? (form.atalho.startsWith("!") ? form.atalho : `!${form.atalho}`) : null,
    };

    if (editing) {
      await supabase.from("respostas_rapidas").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("respostas_rapidas").insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({ titulo: "", atalho: "", conteudo: "", categoria: "Geral" });
    void fetchResponses();
  }

  async function deleteResponse(id: string) {
    const supabase = createClient();
    await supabase.from("respostas_rapidas").delete().eq("id", id);
    void fetchResponses();
  }

  async function addDefaults() {
    if (!tenantId) return;

    const supabase = createClient();
    await supabase
      .from("respostas_rapidas")
      .insert(DEFAULTS.map((response) => ({ ...response, tenant_id: tenantId })));
    void fetchResponses();
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const categorias = [...new Set(responses.map((response) => response.categoria))];

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-[-0.03em]">Respostas Rápidas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {responses.length} templates · Digite &quot;!&quot; no inbox para usar
          </p>
        </div>
        <div className="flex gap-2">
          {responses.length === 0 && (
            <button
              onClick={addDefaults}
              className="px-4 h-9 rounded-xl text-sm font-bold"
              style={{
                background: "rgba(16,185,129,0.1)",
                color: "var(--status-ganho)",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              Adicionar padrões
            </button>
          )}
          <button
            onClick={() => {
              setShowForm(true);
              setEditing(null);
              setForm({ titulo: "", atalho: "", conteudo: "", categoria: "Geral" });
            }}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
            style={{ background: "#10B981", color: "#0a0a0a" }}
          >
            <Plus className="w-4 h-4" /> Nova resposta
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl p-6 space-y-4" style={cardStyle}>
          <h2 className="text-sm font-bold text-white">{editing ? "Editar resposta" : "Nova resposta rápida"}</h2>
          <div className="grid grid-cols-3 gap-3">
            <input
              value={form.titulo}
              onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
              placeholder="Título"
              className="h-10 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            />
            <input
              value={form.atalho}
              onChange={(event) => setForm((current) => ({ ...current, atalho: event.target.value }))}
              placeholder="!atalho"
              className="h-10 px-3 rounded-xl text-sm text-white outline-none font-mono"
              style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}
            />
            <input
              value={form.categoria}
              onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}
              placeholder="Categoria"
              className="h-10 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            />
          </div>
          <textarea
            value={form.conteudo}
            onChange={(event) => setForm((current) => ({ ...current, conteudo: event.target.value }))}
            rows={3}
            placeholder="Conteúdo da resposta..."
            className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 h-9 rounded-xl text-sm"
              style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}
            >
              Cancelar
            </button>
            <button
              onClick={saveResponse}
              disabled={saving}
              className="px-5 h-9 rounded-xl text-sm font-bold"
              style={{ background: "#10B981", color: "#0a0a0a" }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {responses.length === 0 ? (
        <div className="py-16 text-center rounded-xl" style={{ border: "1px solid var(--border-subtle)", background: "var(--surface)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhuma resposta rápida ainda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categorias.map((categoria) => (
            <div key={categoria}>
              <p className="section-label mb-3">{categoria}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {responses
                  .filter((response) => response.categoria === categoria)
                  .map((response) => (
                    <div key={response.id} className="rounded-xl p-4 group" style={cardStyle}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{response.titulo}</span>
                          {response.atalho && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-mono font-bold"
                              style={{ background: "rgba(16,185,129,0.1)", color: "var(--status-ganho)" }}
                            >
                              {response.atalho}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyText(response.id, response.conteudo)}>
                            <Copy className="w-3.5 h-3.5" style={{ color: copied === response.id ? "#10B981" : "#939da4" }} />
                          </button>
                          <button
                            onClick={() => {
                              setEditing(response);
                              setForm({
                                titulo: response.titulo,
                                atalho: response.atalho ?? "",
                                conteudo: response.conteudo,
                                categoria: response.categoria,
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                          </button>
                          <button onClick={() => deleteResponse(response.id)}>
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.5)" }} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>{response.conteudo}</p>
                      {response.uso_count > 0 && (
                        <p className="text-[10px] mt-2" style={{ color: "rgba(147,157,164,0.4)" }}>
                          Usada {response.uso_count}x
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
