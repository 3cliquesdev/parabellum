"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X } from "lucide-react";

interface AgencyBrandingRow {
  display_name: string | null;
  primary_color: string | null;
  support_email: string | null;
  logo_url: string | null;
  name: string | null;
}

interface AgencyUserBrandingRow {
  agency_id: string;
  agencies: AgencyBrandingRow | AgencyBrandingRow[] | null;
}

function getAgencyBranding(agencies: AgencyUserBrandingRow["agencies"]): AgencyBrandingRow | null {
  if (Array.isArray(agencies)) return agencies[0] ?? null;
  return agencies ?? null;
}

export default function BrandingPage() {
  const [form, setForm] = useState({ display_name: "", primary_color: "#9aea62", support_email: "" });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("agency_users").select("agency_id, agencies(display_name, primary_color, support_email, logo_url, name)")
        .eq("user_id", user.id).single().then(({ data }) => {
          const agencyUser = data as AgencyUserBrandingRow | null;
          if (!agencyUser) return;
          setAgencyId(agencyUser.agency_id);
          const agency = getAgencyBranding(agencyUser.agencies);
          setForm({
            display_name: agency?.display_name ?? agency?.name ?? "",
            primary_color: agency?.primary_color ?? "#9aea62",
            support_email: agency?.support_email ?? "",
          });
          setLogoUrl(agency?.logo_url ?? null);
        });
    });
  }, []);

  async function handleLogoUpload(file: File) {
    if (!agencyId) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo deve ter no máximo 2MB"); return; }
    setUploadingLogo(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${agencyId}/logo.${ext}`;
    const { error } = await supabase.storage.from("agency-logos").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { alert("Erro ao fazer upload"); setUploadingLogo(false); return; }
    const { data } = supabase.storage.from("agency-logos").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from("agencies").update({ logo_url: url }).eq("id", agencyId);
    setLogoUrl(url);
    setUploadingLogo(false);
  }

  async function removeLogo() {
    if (!agencyId) return;
    await createClient().from("agencies").update({ logo_url: null }).eq("id", agencyId);
    setLogoUrl(null);
  }

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

      {/* Logo upload */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div>
          <p className="text-sm font-bold text-white mb-1">Logo da agência</p>
          <p className="text-[11px]" style={{ color: "rgba(147,157,164,0.6)" }}>Substitui o ícone e o nome nos links de vendas. PNG, JPG, SVG ou WebP · máx. 2MB</p>
        </div>

        {logoUrl ? (
          <div className="flex items-center gap-4">
            <div className="rounded-xl p-3 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minWidth: 80 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo" style={{ height: 36, width: "auto", maxWidth: 160 }} />
            </div>
            <div className="space-y-2">
              <button onClick={() => fileRef.current?.click()} disabled={uploadingLogo}
                className="flex items-center gap-1.5 px-4 h-8 rounded-xl text-xs font-bold transition-opacity"
                style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Upload className="w-3 h-3" /> Trocar logo
              </button>
              <button onClick={removeLogo}
                className="flex items-center gap-1.5 px-4 h-8 rounded-xl text-xs font-medium transition-opacity"
                style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}>
                <X className="w-3 h-3" /> Remover
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} disabled={uploadingLogo}
            className="w-full flex flex-col items-center gap-2 py-6 rounded-xl transition-colors"
            style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.10)", cursor: "pointer" }}>
            <Upload className="w-5 h-5" style={{ color: "#939da4" }} />
            <span className="text-sm font-medium" style={{ color: "#939da4" }}>
              {uploadingLogo ? "Fazendo upload..." : "Clique para fazer upload da logo"}
            </span>
          </button>
        )}

        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: "#939da4" }}>Nome de exibição</label>
          <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            placeholder="Ex: Agência Digital Pro"
            className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>Substitui &quot;Liberty CRM&quot; em todo o painel</p>
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
