"use client";

import { useState } from "react";
import { X, Phone, MessageSquare, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function LeadSheet({ lead, onClose, onUpdated, tenantId }: LeadSheetProps) {
  const [saving, setSaving] = useState(false);
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
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose} />

      {/* Sheet */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col"
        style={{
          background: "#0d0d0d",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.6)",
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <h2 className="text-base font-bold text-white">{lead.nome}</h2>
            <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>{lead.servico_interesse ?? "Sem serviço"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {[
            { icon: Phone, label: "Ligar", action: () => {} },
            { icon: MessageSquare, label: "WhatsApp", action: openWA },
            { icon: Mail, label: "E-mail", action: () => {} },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", color: "#939da4", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Status</Label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}
              className="w-full h-10 rounded-xl text-sm px-3 outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ffffff" }}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} style={{ background: "#111" }}>{o.label}</option>
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
              <Label className="text-xs font-medium" style={{ color: "#939da4" }}>{label}</Label>
              <Input type={type} value={(form as Record<string, string>)[key]}
                onChange={(e) => set(key, e.target.value)}
                className="h-10 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Observações</Label>
            <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)}
              rows={4} className="w-full rounded-xl text-sm p-3 resize-none outline-none text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={handleSave} disabled={saving}
            className="w-full h-10 rounded-xl text-sm font-bold transition-opacity flex items-center justify-center"
            style={{ background: "#9aea62", color: "#0a0a0a", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </>
  );
}
