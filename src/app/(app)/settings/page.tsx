"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { tenant, tenantId, loading } = useTenant();
  const [waForm, setWaForm] = useState({ phone_number_id: "", access_token: "" });
  const [waLoading, setWaLoading] = useState(false);
  const [waSaved, setWaSaved] = useState(false);
  const [waExists, setWaExists] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    async function loadWA() {
      const supabase = createClient();
      const { data } = await supabase
        .from("whatsapp_configs")
        .select("phone_number_id, access_token")
        .eq("tenant_id", tenantId!)
        .single() as { data: { phone_number_id: string; access_token: string } | null; error: unknown };
      if (data) {
        setWaForm({ phone_number_id: data.phone_number_id, access_token: data.access_token });
        setWaExists(true);
      }
    }
    loadWA();
  }, [tenantId]);

  async function saveWA() {
    if (!tenantId || !waForm.phone_number_id || !waForm.access_token) return;
    setWaLoading(true);
    const supabase = createClient();
    if (waExists) {
      await supabase.from("whatsapp_configs")
        .update({ phone_number_id: waForm.phone_number_id, access_token: waForm.access_token })
        .eq("tenant_id", tenantId);
    } else {
      await supabase.from("whatsapp_configs").insert({
        tenant_id: tenantId,
        phone_number_id: waForm.phone_number_id,
        access_token: waForm.access_token,
        verify_token: "liberty-crm",
      });
      setWaExists(true);
    }
    setWaLoading(false);
    setWaSaved(true);
    setTimeout(() => setWaSaved(false), 3000);
  }

  const cardStyle = {
    background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 space-y-6 max-w-2xl" style={{ fontFamily: "var(--font-sans)" }}>
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Configurações</h1>
        <p className="text-sm mt-1 font-medium" style={{ color: "#939da4" }}>Gerencie seu workspace</p>
      </div>

      {/* Workspace */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h2 className="text-sm font-bold text-white">Workspace</h2>
        {[
          { label: "Nome da empresa", value: tenant?.name ?? "—" },
          { label: "Slug", value: tenant?.slug ?? "—" },
          { label: "Criado em", value: tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString("pt-BR") : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-sm" style={{ color: "#939da4" }}>{label}</span>
            <span className="text-sm font-medium text-white">{value}</span>
          </div>
        ))}
      </div>

      {/* WhatsApp */}
      <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">WhatsApp Business</h2>
            <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>
              Conecte seu número para receber e enviar mensagens
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {waExists
              ? <><CheckCircle className="w-4 h-4" style={{ color: "#9aea62" }} /><span className="text-xs font-bold" style={{ color: "#9aea62" }}>Conectado</span></>
              : <><AlertCircle className="w-4 h-4" style={{ color: "#939da4" }} /><span className="text-xs" style={{ color: "#939da4" }}>Não configurado</span></>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Phone Number ID</Label>
            <Input
              value={waForm.phone_number_id}
              onChange={e => setWaForm(f => ({ ...f, phone_number_id: e.target.value }))}
              placeholder="Ex: 123456789012345"
              className="h-10 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Access Token</Label>
            <Input
              type="password"
              value={waForm.access_token}
              onChange={e => setWaForm(f => ({ ...f, access_token: e.target.value }))}
              placeholder="EAAxxxx..."
              className="h-10 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs" style={{ color: "rgba(147,157,164,0.5)" }}>
              Webhook URL: <span className="font-mono" style={{ color: "#939da4" }}>
                {typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/whatsapp
              </span>
              <br />
              Verify Token: <span className="font-mono" style={{ color: "#939da4" }}>liberty-crm</span>
            </div>
            <button onClick={saveWA} disabled={waLoading || !waForm.phone_number_id || !waForm.access_token}
              className="px-5 h-9 rounded-xl text-sm font-bold transition-all ml-4 shrink-0"
              style={{ background: waSaved ? "rgba(154,234,98,0.1)" : "#9aea62", color: waSaved ? "#9aea62" : "#0a0a0a", opacity: waLoading ? 0.6 : 1 }}>
              {waLoading ? "Salvando..." : waSaved ? "Salvo!" : "Salvar"}
            </button>
          </div>
        </div>
      </div>

      {/* Plano */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <h2 className="text-sm font-bold text-white mb-4">Plano atual</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-white">Starter — Trial</p>
            <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>30 dias grátis</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>Trial ativo</span>
        </div>
      </div>
    </div>
  );
}
