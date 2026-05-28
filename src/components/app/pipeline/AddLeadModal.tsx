"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LeadStatus } from "@/types/database";

interface AddLeadModalProps {
  tenantId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddLeadModal({ tenantId, onClose, onCreated }: AddLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", whatsapp: "", email: "", servico_interesse: "", valor_estimado: "", status: "novo" as LeadStatus,
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setLoading(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("leads") as any).insert({
      tenant_id: tenantId,
      nome: form.nome,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      servico_interesse: form.servico_interesse || null,
      valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
      status: form.status,
    });
    setLoading(false);
    onCreated();
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={onClose} />

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
            {[
              { key: "nome", label: "Nome *", type: "text", required: true },
              { key: "whatsapp", label: "WhatsApp", type: "tel", required: false },
              { key: "email", label: "E-mail", type: "email", required: false },
              { key: "servico_interesse", label: "Serviço de interesse", type: "text", required: false },
              { key: "valor_estimado", label: "Valor estimado (R$)", type: "number", required: false },
            ].map(({ key, label, type, required }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-medium" style={{ color: "#939da4" }}>{label}</Label>
                <Input type={type} required={required} value={(form as Record<string, string>)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="h-10 rounded-xl text-sm text-white"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 h-10 rounded-xl text-sm font-bold"
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
