"use client";

import { useState, useEffect } from "react";
import { X, Phone, MessageSquare, Mail, Clock, History, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeadTimeline, type TimelineEvent } from "@/components/app/LeadTimeline";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "em_contato", label: "Em Contato" },
  { value: "qualificado", label: "Qualificado" },
  { value: "proposta", label: "Proposta Enviada" },
  { value: "negociacao", label: "Em Negociação" },
  { value: "ganho", label: "Ganho" },
  { value: "perdido", label: "Perdido" },
];

interface LeadSheetProps {
  lead: Lead;
  onClose: () => void;
  onUpdated: () => void;
  tenantId: string;
}

const TIPO_OPTIONS = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Nota" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function LeadSheet({ lead, onClose, onUpdated, tenantId }: LeadSheetProps) {
  const [saving, setSaving] = useState(false);
  const [atividades, setAtividades] = useState<Array<{ id: string; tipo: string; titulo: string; descricao: string | null; created_at: string }>>([]);
  const [showAddAtiv, setShowAddAtiv] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [savingAtiv, setSavingAtiv] = useState(false);
  const [newAtiv, setNewAtiv] = useState({ tipo: "ligacao", titulo: "", descricao: "" });
  const [form, setForm] = useState({
    nome: lead.nome,
    whatsapp: lead.whatsapp ?? "",
    email: lead.email ?? "",
    instagram: lead.instagram ?? "",
    servico_interesse: lead.servico_interesse ?? "",
    valor_estimado: lead.valor_estimado?.toString() ?? "",
    observacoes: lead.observacoes ?? "",
    status: lead.status,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.from("atividades").select("id,tipo,titulo,descricao,created_at")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => setAtividades(data ?? []));

    fetch(`/api/leads/${lead.id}/timeline`)
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((d) => setTimelineEvents(d.events ?? []))
      .catch(() => setTimelineEvents([]));
  }, [lead.id]);

  async function saveAtividade() {
    if (!newAtiv.titulo.trim()) return;
    setSavingAtiv(true);
    const supabase = createClient();
    const { data } = await supabase.from("atividades").insert({
      tenant_id: tenantId,
      lead_id: lead.id,
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

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("leads") as any).update({
      ...form,
      valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
    }).eq("id", lead.id);
    setSaving(false);
    onUpdated();
  }

  function openWA() {
    if (form.whatsapp) window.open(`https://wa.me/55${form.whatsapp.replace(/\D/g, "")}`, "_blank");
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: "var(--scrim)", backdropFilter: "blur(4px)" }}
        onClick={onClose} />

      {/* Sheet */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col"
        style={{
          background: "var(--bg-subtle)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.6)",
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{lead.nome}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{lead.servico_interesse ?? "Sem serviço"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {[
            { icon: Phone, label: "Ligar", action: () => {} },
            { icon: MessageSquare, label: "WhatsApp", action: openWA },
            { icon: Mail, label: "E-mail", action: () => {} },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Status</Label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}
              className="w-full h-9 rounded-lg text-sm px-3 outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{o.label}</option>
              ))}
            </select>
          </div>

          {[
            { key: "nome", label: "Nome", type: "text" },
            { key: "whatsapp", label: "WhatsApp", type: "tel" },
            { key: "email", label: "E-mail", type: "email" },
            { key: "instagram", label: "Instagram", type: "text" },
            { key: "servico_interesse", label: "Serviço de interesse", type: "text" },
            { key: "valor_estimado", label: "Valor estimado (R$)", type: "number" },
          ].map(({ key, label, type }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</Label>
              <Input type={type} value={(form as Record<string, string>)[key]}
                onChange={(e) => set(key, e.target.value)}
                className="h-9 rounded-lg text-sm"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Observações</Label>
            <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)}
              rows={4} className="w-full rounded-lg text-sm p-3 resize-none outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
          </div>

          {/* ── TIMELINE (mensagens, negócios, vendas, tickets, devoluções) ── */}
          <div className="pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button className="w-full flex items-center justify-between py-2 text-left"
              onClick={() => setShowTimeline(t => !t)}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <History className="inline w-3 h-3 mr-1.5 mb-0.5" />Timeline
              </span>
              {showTimeline
                ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />}
            </button>
            {showTimeline && (
              <div className="mt-1">
                <LeadTimeline events={timelineEvents} tenantId={tenantId} />
              </div>
            )}
          </div>

          {/* ── HISTÓRICO / ATIVIDADES MANUAIS ── */}
          <div className="pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button className="w-full flex items-center justify-between py-2 text-left"
              onClick={() => setShowHistory(h => !h)}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <Clock className="inline w-3 h-3 mr-1.5 mb-0.5" />Histórico
              </span>
              {showHistory
                ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />}
            </button>

            {showHistory && (
              <div className="space-y-2 mt-1">
                {/* Botão registrar */}
                {!showAddAtiv ? (
                  <button onClick={() => setShowAddAtiv(true)}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)", color: "var(--status-ganho)" }}>
                    <Plus className="w-3.5 h-3.5" /> Registrar atividade
                  </button>
                ) : (
                  <div className="rounded-lg p-3 space-y-2.5" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
                    <select value={newAtiv.tipo} onChange={e => setNewAtiv(a => ({ ...a, tipo: e.target.value }))}
                      className="w-full h-8 rounded-lg text-xs px-2 outline-none"
                      style={{ background: "var(--border-subtle)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
                      {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{o.label}</option>)}
                    </select>
                    <input value={newAtiv.titulo} onChange={e => setNewAtiv(a => ({ ...a, titulo: e.target.value }))}
                      placeholder="Título da atividade *"
                      className="w-full h-8 rounded-lg text-xs px-2 outline-none"
                      style={{ background: "var(--border-subtle)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                    <textarea value={newAtiv.descricao} onChange={e => setNewAtiv(a => ({ ...a, descricao: e.target.value }))}
                      placeholder="Descrição (opcional)" rows={2}
                      className="w-full rounded-lg text-xs p-2 resize-none outline-none"
                      style={{ background: "var(--border-subtle)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                    <div className="flex gap-2">
                      <button onClick={saveAtividade} disabled={savingAtiv || !newAtiv.titulo.trim()}
                        className="flex-1 h-7 rounded-lg text-xs font-bold transition-opacity"
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

                {/* Evento de criação */}
                <div className="flex gap-3 py-2">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ background: "var(--status-ganho)" }} />
                    {atividades.length > 0 && <div className="w-px flex-1 mt-1" style={{ background: "var(--border-subtle)" }} />}
                  </div>
                  <div className="pb-3 flex-1">
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Lead recebido</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {lead.utm_source ? `via ${lead.utm_source}` : "cadastro"} • {fmtDate(lead.created_at ?? new Date().toISOString())}
                    </p>
                    {lead.email && <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{lead.email}</p>}
                  </div>
                </div>

                {/* Atividades */}
                {atividades.map((atv, idx) => (
                  <div key={atv.id} className="flex gap-3 py-1">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ background: "var(--status-contato)" }} />
                      {idx < atividades.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "var(--border-subtle)" }} />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                          style={{ background: "rgba(96,165,250,0.12)", color: "var(--status-contato)" }}>
                          {TIPO_OPTIONS.find(o => o.value === atv.tipo)?.label ?? atv.tipo}
                        </span>
                      </div>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{atv.titulo}</p>
                      {atv.descricao && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{atv.descricao}</p>}
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>{fmtDate(atv.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <button onClick={handleSave} disabled={saving}
            className="w-full h-9 rounded-lg text-sm font-bold transition-opacity flex items-center justify-center"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </>
  );
}
