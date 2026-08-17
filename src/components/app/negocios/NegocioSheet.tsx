"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Phone, MessageSquare, Mail, Clock, History, Plus, ChevronDown, ChevronUp, Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Negocio, Pipeline } from "@/types/database";
import { NegocioTimeline } from "./NegocioTimeline";
import { LeadTimeline, type TimelineEvent } from "@/components/app/LeadTimeline";
import { TemplatePickerModal } from "@/components/app/inbox/TemplatePickerModal";
import { SITUACAO_PAGAMENTO_LABEL } from "@/lib/leads/situacao-pagamento";
import { maskPhone } from "@/lib/format";

interface NegocioSheetProps {
  negocio: Negocio;
  tenantId: string;
  pipelines: Pipeline[];
  onClose: () => void;
  onAtualizado: () => void;
}

const TIPO_OPTIONS = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Nota" },
];

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  color: "var(--text-primary)",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function enderecoCompleto(lead: Negocio["leads"]): string | null {
  if (!lead) return null;
  const partes = [
    lead.endereco_rua && lead.endereco_numero ? `${lead.endereco_rua}, ${lead.endereco_numero}` : lead.endereco_rua,
    lead.endereco_complemento,
    lead.endereco_bairro,
    lead.endereco_cidade && lead.endereco_estado ? `${lead.endereco_cidade}/${lead.endereco_estado}` : lead.endereco_cidade,
    lead.endereco_cep,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" — ") : null;
}

export function NegocioSheet({ negocio, tenantId, pipelines, onClose, onAtualizado }: NegocioSheetProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [form, setForm] = useState({
    titulo: negocio.titulo,
    valor: negocio.valor?.toString() ?? "",
    pipeline_id: negocio.pipeline_id ?? "",
    pipeline_etapa_id: negocio.pipeline_etapa_id ?? "",
    motivo_perda: negocio.motivo_perda ?? "",
  });
  const [contato, setContato] = useState({
    nome: negocio.leads?.nome ?? "",
    whatsapp: negocio.leads?.whatsapp ?? "",
    email: negocio.leads?.email ?? "",
    instagram: negocio.leads?.instagram ?? "",
    servico_interesse: negocio.leads?.servico_interesse ?? "",
    observacoes: negocio.leads?.observacoes ?? "",
  });

  const [atividades, setAtividades] = useState<Array<{ id: string; tipo: string; titulo: string; descricao: string | null; created_at: string }>>([]);
  const [showAddAtiv, setShowAddAtiv] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savingAtiv, setSavingAtiv] = useState(false);
  const [newAtiv, setNewAtiv] = useState({ tipo: "ligacao", titulo: "", descricao: "" });

  const [showTimelineNegocio, setShowTimelineNegocio] = useState(true);
  const [showTimelineContato, setShowTimelineContato] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  const pipelineSelecionado = pipelines.find((p) => p.id === form.pipeline_id);
  const situacao = negocio.situacao_pagamento ? SITUACAO_PAGAMENTO_LABEL[negocio.situacao_pagamento] : null;
  const endereco = enderecoCompleto(negocio.leads);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("atividades").select("id,tipo,titulo,descricao,created_at")
      .eq("lead_id", negocio.lead_id)
      .order("created_at", { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => setAtividades(data ?? []));

    fetch(`/api/leads/${negocio.lead_id}/timeline`)
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((d) => setTimelineEvents(d.events ?? []))
      .catch(() => setTimelineEvents([]));
  }, [negocio.lead_id]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setContatoField(key: string, value: string) {
    setContato((c) => ({ ...c, [key]: value }));
  }

  async function saveAtividade() {
    if (!newAtiv.titulo.trim()) return;
    setSavingAtiv(true);
    const supabase = createClient();
    const { data } = await supabase.from("atividades").insert({
      tenant_id: tenantId,
      lead_id: negocio.lead_id,
      tipo: newAtiv.tipo,
      titulo: newAtiv.titulo.trim(),
      descricao: newAtiv.descricao.trim() || null,
      concluida: true,
      concluida_em: new Date().toISOString(),
    }).select("id,tipo,titulo,descricao,created_at").single() as { data: { id: string; tipo: string; titulo: string; descricao: string | null; created_at: string } | null };
    if (data) setAtividades((prev) => [data, ...prev]);
    setNewAtiv({ tipo: "ligacao", titulo: "", descricao: "" });
    setShowAddAtiv(false);
    setSavingAtiv(false);
  }

  function openWA() {
    if (contato.whatsapp) setShowTemplatePicker(true);
  }

  function handleTemplateEnviado(conversaId: string) {
    setShowTemplatePicker(false);
    router.push(`/inbox?conversa=${conversaId}`);
  }

  function ligar() {
    if (contato.whatsapp) window.open(`tel:${contato.whatsapp.replace(/\D/g, "")}`, "_blank");
  }

  function enviarEmail() {
    if (contato.email) window.open(`mailto:${contato.email}`, "_blank");
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/negocios/${negocio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        titulo: form.titulo,
        valor: form.valor ? Number(form.valor) : null,
        pipeline_id: form.pipeline_id || null,
        pipeline_etapa_id: form.pipeline_etapa_id || null,
        motivo_perda: form.motivo_perda || null,
        origem_mudanca: "manual",
      }),
    });

    const supabase = createClient();
    await supabase.from("leads").update({
      nome: contato.nome,
      whatsapp: contato.whatsapp ? contato.whatsapp.replace(/\D/g, "") : null,
      email: contato.email || null,
      instagram: contato.instagram || null,
      servico_interesse: contato.servico_interesse || null,
      observacoes: contato.observacoes || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).eq("id", negocio.lead_id);

    setSaving(false);
    if (!res.ok) { alert("Erro ao salvar negócio"); return; }
    onAtualizado();
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "var(--scrim)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col"
        style={{ background: "var(--bg-subtle)", borderLeft: "1px solid var(--border-subtle)", boxShadow: "-24px 0 80px rgba(0,0,0,0.2)" }}>

        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{negocio.titulo}</h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{contato.nome}</p>
            {situacao && (
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5" style={{ color: situacao.color, background: situacao.bg }}>
                {situacao.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ações rápidas */}
        <div className="flex gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {[
            { icon: Phone, label: "Ligar", action: ligar },
            { icon: MessageSquare, label: "WhatsApp", action: openWA },
            { icon: Mail, label: "E-mail", action: enviarEmail },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg text-xs font-medium"
              style={{ background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Dados do negócio */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Título</label>
            <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Valor (R$)</label>
            <input type="number" value={form.valor} onChange={(e) => set("valor", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Pipeline</label>
            <select value={form.pipeline_id} onChange={(e) => set("pipeline_id", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle}>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Etapa</label>
            <select value={form.pipeline_etapa_id} onChange={(e) => set("pipeline_etapa_id", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle}>
              {[...(pipelineSelecionado?.pipeline_etapas ?? [])].sort((a, b) => a.posicao - b.posicao).map((etapa) => (
                <option key={etapa.id} value={etapa.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{etapa.nome}</option>
              ))}
            </select>
          </div>

          {negocio.estagio === "perdido" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Motivo da perda</label>
              <textarea value={form.motivo_perda} onChange={(e) => set("motivo_perda", e.target.value)}
                rows={3} className="w-full rounded-lg text-sm p-3 resize-none outline-none" style={inputStyle} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            {negocio.canal && <p>Canal: <span style={{ color: "var(--text-primary)" }}>{negocio.canal}</span></p>}
            {negocio.origem && <p>Origem: <span style={{ color: "var(--text-primary)" }}>{negocio.origem}</span></p>}
          </div>

          {/* Venda Kiwify (só quando ganho e vinculado) */}
          {negocio.estagio === "ganho" && negocio.vendas && (
            <div className="rounded-lg p-3 space-y-1" style={{ background: "var(--active-soft-bg)", border: "1px solid var(--active-soft-border)" }}>
              <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--status-ganho)" }}>
                <Handshake className="w-3.5 h-3.5" /> Venda Kiwify
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>ID: <span style={{ color: "var(--text-primary)" }}>{negocio.vendas.external_id ?? "—"}</span></p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Produto: <span style={{ color: "var(--text-primary)" }}>{negocio.vendas.produto_nome}</span></p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Valor: <span style={{ color: "var(--text-primary)" }}>R$ {Number(negocio.vendas.valor).toLocaleString("pt-BR")}</span></p>
              {negocio.vendas.paid_at && <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Pago em: <span style={{ color: "var(--text-primary)" }}>{fmtDate(negocio.vendas.paid_at)}</span></p>}
              {negocio.vendas.tipo_cobranca && <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Tipo: <span style={{ color: "var(--text-primary)" }}>{negocio.vendas.tipo_cobranca === "renovacao" ? "Renovação" : "Venda nova"}</span></p>}
            </div>
          )}

          {/* Contato */}
          <div className="space-y-3 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Contato</p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Nome</label>
              <input value={contato.nome} onChange={(e) => setContatoField("nome", e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>WhatsApp</label>
              <input value={contato.whatsapp} onChange={(e) => setContatoField("whatsapp", maskPhone(e.target.value))}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>E-mail</label>
              <input value={contato.email} onChange={(e) => setContatoField("email", e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Instagram</label>
              <input value={contato.instagram} onChange={(e) => setContatoField("instagram", e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Serviço de interesse</label>
              <input value={contato.servico_interesse} onChange={(e) => setContatoField("servico_interesse", e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Observações</label>
              <textarea value={contato.observacoes} onChange={(e) => setContatoField("observacoes", e.target.value)}
                rows={3} className="w-full rounded-lg text-sm p-3 resize-none outline-none" style={inputStyle} />
            </div>

            {(negocio.leads?.cpf || endereco) && (
              <div className="grid grid-cols-1 gap-1 text-xs pt-1" style={{ color: "var(--text-secondary)" }}>
                {negocio.leads?.cpf && <p>CPF: <span style={{ color: "var(--text-primary)" }}>{negocio.leads.cpf}</span></p>}
                {endereco && <p>Endereço: <span style={{ color: "var(--text-primary)" }}>{endereco}</span></p>}
              </div>
            )}
          </div>

          {/* Timeline do negócio */}
          <div className="pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button className="w-full flex items-center justify-between py-2 text-left" onClick={() => setShowTimelineNegocio((v) => !v)}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <History className="inline w-3 h-3 mr-1.5 mb-0.5" />Timeline do negócio
              </span>
              {showTimelineNegocio
                ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />}
            </button>
            {showTimelineNegocio && (
              <div className="mt-1">
                <NegocioTimeline negocioId={negocio.id} tenantId={tenantId} />
              </div>
            )}
          </div>

          {/* Timeline do contato */}
          <div className="pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button className="w-full flex items-center justify-between py-2 text-left" onClick={() => setShowTimelineContato((v) => !v)}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <History className="inline w-3 h-3 mr-1.5 mb-0.5" />Timeline do contato
              </span>
              {showTimelineContato
                ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />}
            </button>
            {showTimelineContato && (
              <div className="mt-1">
                <LeadTimeline events={timelineEvents} tenantId={tenantId} />
              </div>
            )}
          </div>

          {/* Histórico de atividades manuais */}
          <div className="pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button className="w-full flex items-center justify-between py-2 text-left" onClick={() => setShowHistory((v) => !v)}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <Clock className="inline w-3 h-3 mr-1.5 mb-0.5" />Histórico
              </span>
              {showHistory
                ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />}
            </button>

            {showHistory && (
              <div className="space-y-2 mt-1">
                {!showAddAtiv ? (
                  <button onClick={() => setShowAddAtiv(true)}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium"
                    style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)", color: "var(--status-ganho)" }}>
                    <Plus className="w-3.5 h-3.5" /> Registrar atividade
                  </button>
                ) : (
                  <div className="rounded-lg p-3 space-y-2.5" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                    <select value={newAtiv.tipo} onChange={(e) => setNewAtiv((a) => ({ ...a, tipo: e.target.value }))}
                      className="w-full h-8 rounded-lg text-xs px-2 outline-none"
                      style={{ background: "var(--border-subtle)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
                      {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{o.label}</option>)}
                    </select>
                    <input value={newAtiv.titulo} onChange={(e) => setNewAtiv((a) => ({ ...a, titulo: e.target.value }))}
                      placeholder="Título da atividade *"
                      className="w-full h-8 rounded-lg text-xs px-2 outline-none"
                      style={{ background: "var(--border-subtle)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                    <textarea value={newAtiv.descricao} onChange={(e) => setNewAtiv((a) => ({ ...a, descricao: e.target.value }))}
                      placeholder="Descrição (opcional)" rows={2}
                      className="w-full rounded-lg text-xs p-2 resize-none outline-none"
                      style={{ background: "var(--border-subtle)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                    <div className="flex gap-2">
                      <button onClick={saveAtividade} disabled={savingAtiv || !newAtiv.titulo.trim()}
                        className="flex-1 h-7 rounded-lg text-xs font-bold"
                        style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: savingAtiv ? 0.6 : 1 }}>
                        {savingAtiv ? "Salvando..." : "Salvar"}
                      </button>
                      <button onClick={() => setShowAddAtiv(false)}
                        className="flex-1 h-7 rounded-lg text-xs font-medium"
                        style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {atividades.map((atv, idx) => (
                  <div key={atv.id} className="flex gap-3 py-1">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ background: "var(--status-contato)" }} />
                      {idx < atividades.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "var(--border-subtle)" }} />}
                    </div>
                    <div className="pb-3 flex-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style={{ background: "rgba(96,165,250,0.12)", color: "var(--status-contato)" }}>
                        {TIPO_OPTIONS.find((o) => o.value === atv.tipo)?.label ?? atv.tipo}
                      </span>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{atv.titulo}</p>
                      {atv.descricao && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{atv.descricao}</p>}
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>{fmtDate(atv.created_at)}</p>
                    </div>
                  </div>
                ))}
                {atividades.length === 0 && (
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nenhuma atividade registrada ainda.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <button onClick={handleSave} disabled={saving}
            className="w-full h-9 rounded-lg text-sm font-bold flex items-center justify-center"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>

      {showTemplatePicker && (
        <TemplatePickerModal
          tenantId={tenantId}
          leadId={negocio.lead_id}
          negocioId={negocio.id}
          onClose={() => setShowTemplatePicker(false)}
          onEnviado={handleTemplateEnviado}
        />
      )}
    </>
  );
}
