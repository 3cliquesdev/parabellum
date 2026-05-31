"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  async function create() {
    if (!form.name) { setError("Nome é obrigatório"); return; }
    setSaving(true); setError("");
    const r = await fetch("/api/agency/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (d.success) router.push(`/agency/customers/${d.tenant.id}`);
    else setError(d.error ?? "Erro ao criar cliente");
  }

  return (
    <div className="p-8 max-w-xl space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-center gap-3">
        <Link href="/agency/customers" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#939da4" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Clientes
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Novo cliente</h1>
        <p className="text-sm mt-1" style={{ color: "#939da4" }}>Crie um workspace para seu cliente</p>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Nome da empresa *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Empresa do João"
            className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Email do responsável</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="cliente@empresa.com"
            className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>O cliente poderá ser convidado depois pela aba Equipe</p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Link href="/agency/customers" className="px-4 h-9 rounded-xl text-sm inline-flex items-center" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
            Cancelar
          </Link>
          <button onClick={create} disabled={saving || !form.name}
            className="px-5 h-9 rounded-xl text-sm font-bold flex items-center gap-2"
            style={{ background: saving || !form.name ? "rgba(154,234,98,0.3)" : "#9aea62", color: "#0a0a0a" }}>
            <Building2 className="w-4 h-4" />
            {saving ? "Criando..." : "Criar workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
