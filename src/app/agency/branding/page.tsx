"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BrandingPage() {
  const [form, setForm] = useState({ display_name: "", primary_color: "#9aea62", support_email: "" });
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("agency_users").select("agency_id, agencies(display_name, primary_color, support_email, name)")
        .eq("user_id", user.id).single().then(({ data }: { data: any }) => {
          if (!data) return;
          setAgencyId(data.agency_id);
          const a = data.agencies as any;
          setForm({
            display_name: a?.display_name ?? a?.name ?? "",
            primary_color: a?.primary_color ?? "#9aea62",
            support_email: a?.support_email ?? "",
          });
        });
    });
  }, []);

  async function save() {
    if (!agencyId) return;
    setSaving(true);
    await createClient().from("agencies").update(form).eq("id", agencyId);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  const previewColor = form.primary_color || "#9aea62";

  return (
    <div className="p-8 space-y-6 max-w-xl" style={{ fontFamily: "var(--font-sans)" }}>
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Branding</h1>
        <p className="text-sm mt-1" style={{ color: "#939da4" }}>Personalize como sua marca aparece para os clientes</p>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Nome de exibição</label>
          <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            placeholder="Ex: Agência Digital Pro"
            className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>Substitui "Liberty CRM" em todo o painel</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Cor primária</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
              className="w-10 h-10 rounded-xl cursor-pointer p-0.5 border-0"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
              placeholder="#9aea62" maxLength={7}
              className="h-10 px-3 rounded-xl text-sm text-white font-mono outline-none w-28"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: `${previewColor}20`, color: previewColor }}>
              Preview
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Email de suporte</label>
          <input type="email" value={form.support_email} onChange={e => setForm(f => ({ ...f, support_email: e.target.value }))}
            placeholder="suporte@minhaagencia.com.br"
            className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving}
            className="px-5 h-9 rounded-xl text-sm font-bold"
            style={{ background: saved ? "rgba(154,234,98,0.1)" : "#9aea62", color: saved ? "#9aea62" : "#0a0a0a" }}>
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar branding"}
          </button>
        </div>
      </div>
    </div>
  );
}
