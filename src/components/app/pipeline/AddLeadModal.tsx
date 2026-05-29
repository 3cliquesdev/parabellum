"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import type { LeadStatus } from "@/types/database";

interface AddLeadModalProps {
  tenantId: string;
  onClose: () => void;
  onCreated: () => void;
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function maskCurrency(v: string) {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  const n = parseInt(d, 10) / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseCurrency(v: string): number | null {
  const d = v.replace(/\D/g, "");
  if (!d) return null;
  return parseInt(d, 10) / 100;
}

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#ffffff",
  height: "40px",
  borderRadius: "12px",
  padding: "0 12px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
};

export function AddLeadModal({ tenantId, onClose, onCreated }: AddLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", whatsapp: "", email: "", servico_interesse: "", valor_display: "", status: "novo" as LeadStatus,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("leads") as any).insert({
        tenant_id: tenantId,
        nome: form.nome,
        whatsapp: form.whatsapp ? form.whatsapp.replace(/\D/g, "") : null,
        email: form.email || null,
        servico_interesse: form.servico_interesse || null,
        valor_estimado: parseCurrency(form.valor_display),
        status: form.status,
      });
      if (error) { alert(`Erro: ${error.message}`); setLoading(false); return; }
      onCreated();
    } catch { alert("Erro inesperado."); setLoading(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl p-6"
          style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-white">Novo lead</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Nome *</Label>
              <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo" style={inputStyle} />
            </div>

            {/* WhatsApp com máscara */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "#939da4" }}>WhatsApp</Label>
              <input type="tel" value={form.whatsapp}
                onChange={e => setForm(f => ({ ...f, whatsapp: maskPhone(e.target.value) }))}
                placeholder="(11) 99999-9999" style={inputStyle} />
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "#939da4" }}>E-mail</Label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com" style={inputStyle} />
            </div>

            {/* Serviço */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Serviço de interesse</Label>
              <input value={form.servico_interesse} onChange={e => setForm(f => ({ ...f, servico_interesse: e.target.value }))}
                placeholder="Ex: Marketing Digital, Consultoria..." style={inputStyle} />
            </div>

            {/* Valor com máscara de moeda */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Valor estimado</Label>
              <input value={form.valor_display}
                onChange={e => setForm(f => ({ ...f, valor_display: maskCurrency(e.target.value) }))}
                placeholder="R$ 0,00" style={{ ...inputStyle, color: form.valor_display ? "#9aea62" : "rgba(255,255,255,0.3)" }} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 h-10 rounded-xl text-sm font-bold"
                style={{ background: "#9aea62", color: "#0a0a0a", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Criando..." : "Criar lead"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
