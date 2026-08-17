"use client";

import { useState } from "react";
import { X, Search, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { maskPhone, maskCurrency, parseCurrency } from "@/lib/format";

interface NovoNegocioModalProps {
  tenantId: string;
  pipelineId: string;
  onClose: () => void;
  onCriado: () => void;
}

interface LeadEncontrado {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
}

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  color: "var(--text-primary)",
};

export function NovoNegocioModal({ tenantId, pipelineId, onClose, onCriado }: NovoNegocioModalProps) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<LeadEncontrado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState<LeadEncontrado | null>(null);
  const [modoNovoLead, setModoNovoLead] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [novoLead, setNovoLead] = useState({ nome: "", whatsapp: "", email: "", servico_interesse: "" });
  const [negocio, setNegocio] = useState({ titulo: "", valor_display: "" });

  async function buscarLead() {
    if (!busca.trim()) { setResultados([]); return; }
    setBuscando(true);
    const supabase = createClient();
    const termo = busca.trim();
    const { data } = await supabase
      .from("leads")
      .select("id, nome, whatsapp, email")
      .eq("tenant_id", tenantId)
      .or(`nome.ilike.%${termo}%,email.ilike.%${termo}%,whatsapp.ilike.%${termo.replace(/\D/g, "")}%`)
      .limit(8);
    setResultados((data ?? []) as LeadEncontrado[]);
    setBuscando(false);
  }

  async function criarLeadNovo(): Promise<string | null> {
    if (!novoLead.nome.trim()) { alert("Nome do contato é obrigatório."); return null; }
    const supabase = createClient();
    const whatsapp = novoLead.whatsapp ? novoLead.whatsapp.replace(/\D/g, "") : null;
    const email = novoLead.email || null;

    if (whatsapp || email) {
      let dupQuery = supabase.from("leads").select("id, nome").eq("tenant_id", tenantId).limit(1);
      dupQuery = email
        ? dupQuery.or(`email.ilike.${email},whatsapp.ilike.%${whatsapp ?? ""}%`)
        : dupQuery.ilike("whatsapp", `%${whatsapp}%`);
      const { data: possivelDuplicado } = await dupQuery.maybeSingle();
      if (possivelDuplicado) {
        const seguir = window.confirm(`Já existe um lead com esse WhatsApp/e-mail ("${(possivelDuplicado as { nome: string }).nome}"). Criar mesmo assim?`);
        if (!seguir) return null;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("leads") as any).insert({
      tenant_id: tenantId,
      nome: novoLead.nome.trim(),
      whatsapp,
      email,
      servico_interesse: novoLead.servico_interesse || null,
      status: "novo",
      origem_lead: "manual",
    }).select("id").single();

    if (error) { alert(`Erro ao criar contato: ${error.message}`); return null; }
    return (data as { id: string }).id;
  }

  async function confirmar() {
    if (!negocio.titulo.trim()) { alert("Título do negócio é obrigatório."); return; }
    setSalvando(true);

    let leadId = leadSelecionado?.id ?? null;
    if (!leadId && modoNovoLead) {
      leadId = await criarLeadNovo();
    }
    if (!leadId) {
      alert("Selecione um contato existente ou preencha os dados de um novo.");
      setSalvando(false);
      return;
    }

    const res = await fetch("/api/negocios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        lead_id: leadId,
        titulo: negocio.titulo.trim(),
        valor: parseCurrency(negocio.valor_display),
        pipeline_id: pipelineId,
      }),
    });
    setSalvando(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao criar negócio");
      return;
    }
    onCriado();
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "var(--scrim)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl p-5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Novo Negócio</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {!leadSelecionado && !modoNovoLead && (
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Buscar contato (nome, WhatsApp ou e-mail)</label>
              <div className="flex gap-2">
                <input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscarLead()}
                  placeholder="Digite pra buscar..." className="flex-1 h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
                <button onClick={buscarLead} disabled={buscando} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {resultados.length > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
                  {resultados.map((lead) => (
                    <button key={lead.id} onClick={() => setLeadSelecionado(lead)}
                      className="w-full text-left px-3 py-2 text-xs"
                      style={{ background: "var(--surface-panel)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                      <p className="font-semibold">{lead.nome}</p>
                      <p style={{ color: "var(--text-secondary)" }}>{lead.email ?? lead.whatsapp ?? "sem contato"}</p>
                    </button>
                  ))}
                </div>
              )}

              {busca.trim() && !buscando && resultados.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nenhum contato encontrado.</p>
              )}

              <button onClick={() => setModoNovoLead(true)}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold mt-2"
                style={{ background: "var(--primary-bg)", color: "var(--status-ganho)" }}>
                <UserPlus className="w-3.5 h-3.5" /> Criar contato novo
              </button>
            </div>
          )}

          {leadSelecionado && (
            <div className="rounded-lg p-3 flex items-center justify-between mb-4" style={{ background: "var(--active-soft-bg)", border: "1px solid var(--active-soft-border)" }}>
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>{leadSelecionado.nome}</p>
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{leadSelecionado.email ?? leadSelecionado.whatsapp}</p>
              </div>
              <button onClick={() => setLeadSelecionado(null)} className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>Trocar</button>
            </div>
          )}

          {modoNovoLead && !leadSelecionado && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Novo contato</label>
                <button onClick={() => setModoNovoLead(false)} className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>Buscar em vez disso</button>
              </div>
              <input value={novoLead.nome} onChange={(e) => setNovoLead((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo *" className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
              <input value={novoLead.whatsapp} onChange={(e) => setNovoLead((f) => ({ ...f, whatsapp: maskPhone(e.target.value) }))}
                placeholder="(11) 99999-9999" className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
              <input value={novoLead.email} onChange={(e) => setNovoLead((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com" className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
              <input value={novoLead.servico_interesse} onChange={(e) => setNovoLead((f) => ({ ...f, servico_interesse: e.target.value }))}
                placeholder="Serviço de interesse" className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
          )}

          {(leadSelecionado || modoNovoLead) && (
            <div className="space-y-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Título do negócio *</label>
              <input value={negocio.titulo} onChange={(e) => setNegocio((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Plano Mensal - Associado Premium" className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Valor estimado</label>
              <input value={negocio.valor_display} onChange={(e) => setNegocio((f) => ({ ...f, valor_display: maskCurrency(e.target.value) }))}
                placeholder="R$ 0,00" className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} className="flex-1 h-9 rounded-lg text-sm font-medium" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>Cancelar</button>
            <button onClick={confirmar} disabled={salvando || (!leadSelecionado && !modoNovoLead)}
              className="flex-1 h-9 rounded-lg text-sm font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: salvando || (!leadSelecionado && !modoNovoLead) ? 0.6 : 1 }}>
              {salvando ? "Criando..." : "Criar Negócio"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
