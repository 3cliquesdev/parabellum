"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

const CENARIOS = [
  { id: "normal", label: "Normal", cor: "#9aea62", desc: "Conversa padrão de vendas" },
  { id: "objecao_preco", label: "Objeção de Preço", cor: "#facc15", desc: "Lead acha caro" },
  { id: "cliente_irritado", label: "Cliente Irritado", cor: "#f87171", desc: "Lead insatisfeito" },
  { id: "fechamento", label: "Fechamento", cor: "#60a5fa", desc: "Lead pronto para fechar" },
  { id: "suporte", label: "Suporte", cor: "#a78bfa", desc: "Lead com dúvidas técnicas" },
];

const EXEMPLOS_PADRAO = [
  { cenario: "objecao_preco", input_text: "Achei muito caro, tem desconto?", output_text: "Entendo sua preocupação! O valor já inclui [descreva o que está incluído]. Além disso, temos condições especiais para pagamento à vista. Posso te mostrar exatamente o que você vai receber?" },
  { cenario: "cliente_irritado", input_text: "Já faz dias que não recebo retorno!", output_text: "Peço desculpas pelo transtorno! Vou verificar agora o que aconteceu e te dar um retorno em até 30 minutos. Pode me passar seu nome completo e o assunto para agilizar?" },
  { cenario: "fechamento", input_text: "Gostei, vamos fechar!", output_text: "Que ótimo! Vou te enviar o contrato agora mesmo. Tem alguma dúvida antes de assinar? O próximo passo é [descreva o processo de início]." },
];

export default function TrainingPage() {
  const { tenantId } = useTenant();
  const [examples, setExamples] = useState<any[]>([]);
  const [cenario, setCenario] = useState("normal");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ input_text: "", output_text: "", cenario: "normal" });
  const [saving, setSaving] = useState(false);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  async function fetchExamples() {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase.from("training_examples").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setExamples(data ?? []);
  }

  useEffect(() => { if (tenantId) fetchExamples(); }, [tenantId]);

  async function saveExample() {
    if (!tenantId || !form.input_text || !form.output_text) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("training_examples").insert({ tenant_id: tenantId, ...form });
    setSaving(false);
    setShowForm(false);
    setForm({ input_text: "", output_text: "", cenario: "normal" });
    fetchExamples();
  }

  async function deleteExample(id: string) {
    const supabase = createClient();
    await supabase.from("training_examples").delete().eq("id", id);
    fetchExamples();
  }

  async function addDefault() {
    if (!tenantId) return;
    const supabase = createClient();
    await supabase.from("training_examples").insert(EXEMPLOS_PADRAO.map(e => ({ ...e, tenant_id: tenantId })));
    fetchExamples();
  }

  const filtered = examples.filter(e => e.cenario === cenario);
  const cenarioInfo = CENARIOS.find(c => c.id === cenario);

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Exemplos de Treinamento</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Ensine a IA como responder em cada situação</p>
        </div>
        <div className="flex gap-2">
          {examples.length === 0 && (
            <button onClick={addDefault} className="px-4 h-9 rounded-xl text-sm font-bold"
              style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
              Adicionar exemplos padrão
            </button>
          )}
          <button onClick={() => { setShowForm(true); setForm({ input_text: "", output_text: "", cenario }); }}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
            style={{ background: "#9aea62", color: "#0a0a0a" }}>
            <Plus className="w-4 h-4" /> Novo exemplo
          </button>
        </div>
      </div>

      {/* Cenários tabs */}
      <div className="flex gap-2 flex-wrap">
        {CENARIOS.map(c => (
          <button key={c.id} onClick={() => setCenario(c.id)}
            className="px-4 h-8 rounded-xl text-xs font-bold transition-all"
            style={cenario === c.id
              ? { background: `${c.cor}15`, color: c.cor, border: `1px solid ${c.cor}30` }
              : { background: "rgba(255,255,255,0.04)", color: "#939da4", border: "1px solid rgba(255,255,255,0.06)" }}>
            {c.label} ({examples.filter(e => e.cenario === c.id).length})
          </button>
        ))}
      </div>

      {cenarioInfo && (
        <p className="text-xs" style={{ color: "#939da4" }}>
          {cenarioInfo.desc} — exemplos ensinados são injetados no contexto da IA
        </p>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          <h2 className="text-sm font-bold text-white">Novo exemplo</h2>
          <select value={form.cenario} onChange={e => setForm(f => ({ ...f, cenario: e.target.value }))}
            className="w-full h-10 px-3 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
            {CENARIOS.map(c => <option key={c.id} value={c.id} style={{ background: "#111" }}>{c.label}</option>)}
          </select>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "#939da4" }}>O que o lead diz (input)</label>
            <textarea value={form.input_text} onChange={e => setForm(f => ({ ...f, input_text: e.target.value }))} rows={2}
              placeholder="Ex: Achei muito caro, tem desconto?" className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "#939da4" }}>Como a IA deve responder (ideal)</label>
            <textarea value={form.output_text} onChange={e => setForm(f => ({ ...f, output_text: e.target.value }))} rows={4}
              placeholder="Ex: Entendo! O valor inclui..." className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 h-9 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Cancelar</button>
            <button onClick={saveExample} disabled={saving} className="px-5 h-9 rounded-xl text-sm font-bold" style={{ background: "#9aea62", color: "#0a0a0a" }}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Examples list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-sm" style={{ color: "#939da4" }}>Nenhum exemplo para este cenário.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => (
            <div key={e.id} className="rounded-xl p-5 group" style={cardStyle}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: cenarioInfo?.cor }}>Lead diz:</p>
                    <p className="text-sm text-white">{e.input_text}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: "#939da4" }}>IA responde:</p>
                    <p className="text-sm" style={{ color: "#939da4" }}>{e.output_text}</p>
                  </div>
                </div>
                <button onClick={() => deleteExample(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" style={{ color: "rgba(248,113,113,0.5)" }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
