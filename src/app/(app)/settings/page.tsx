"use client";

import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const META_APP_ID = "2016623082257479"; // LibertyCRM app

interface PhoneOption {
  id: string;
  display_phone_number: string;
  verified_name: string;
}

export default function SettingsPage() {
  const { tenant, tenantId, loading } = useTenant();
  const [waStatus, setWaStatus] = useState<"idle" | "connecting" | "select" | "connected">("idle");
  const [waPhone, setWaPhone] = useState<string>("");
  const [waName, setWaName] = useState<string>("");
  const [phoneOptions, setPhoneOptions] = useState<PhoneOption[]>([]);
  const [pendingToken, setPendingToken] = useState<string>("");
  const [pendingWabaId, setPendingWabaId] = useState<string>("");

  const cardStyle = {
    background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
  };

  // Carregar Facebook SDK
  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) return;
    window.fbAsyncInit = function () {
      window.FB.init({ appId: META_APP_ID, cookie: true, xfbml: true, version: "v20.0" });
    };
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  // Checar se já tem WA configurado
  useEffect(() => {
    if (!tenantId) return;
    async function check() {
      const res = await fetch(`/api/whatsapp/status?tenant_id=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setWaStatus("connected");
          setWaPhone(data.phone_number ?? "");
          setWaName(data.verified_name ?? "");
        }
      }
    }
    check();
  }, [tenantId]);

  const handleConnect = useCallback(() => {
    if (!window.FB) { alert("Facebook SDK carregando, aguarde 2 segundos e tente novamente."); return; }
    setWaStatus("connecting");

    // Reset automático se popup for fechado ou bloqueado
    const timeout = setTimeout(() => setWaStatus("idle"), 30000);

    // FB.login NÃO aceita callback async — usar função normal + Promise interna
    window.FB.login((response: any) => {
      clearTimeout(timeout);

      if (!response.authResponse?.code) {
        setWaStatus("idle");
        return;
      }

      const code = response.authResponse.code;

      fetch("/api/whatsapp/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, tenant_id: tenantId }),
      })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) {
            alert(data.error ?? "Erro ao conectar. Tente novamente.");
            setWaStatus("idle");
            return;
          }
          if (data.status === "connected") {
            setWaStatus("connected");
            setWaPhone(data.phone_number ?? "");
            setWaName(data.verified_name ?? "");
          } else if (data.status === "select_phone") {
            setPhoneOptions(data.phones);
            setPendingToken(data.access_token);
            setPendingWabaId(data.waba_id);
            setWaStatus("select");
          }
        })
        .catch(() => {
          alert("Erro de conexão. Tente novamente.");
          setWaStatus("idle");
        });
    }, {
      config_id: "1712571456601258",
      response_type: "code",
      override_default_response_type: true,
      extras: { sessionInfoVersion: "3" },
    });
  }, [tenantId]);

  async function selectPhone(phone: PhoneOption) {
    setWaStatus("connecting");
    const res = await fetch("/api/whatsapp/embedded-signup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        phone_number_id: phone.id,
        access_token: pendingToken,
        waba_id: pendingWabaId,
      }),
    });
    if (res.ok) {
      setWaStatus("connected");
      setWaPhone(phone.display_phone_number);
      setWaName(phone.verified_name);
    } else {
      setWaStatus("idle");
    }
  }

  async function disconnect() {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;
    const res = await fetch("/api/whatsapp/embedded-signup", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    if (res.ok) {
      setWaStatus("idle");
      setWaPhone("");
      setWaName("");
    }
  }

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

      {/* WhatsApp — Embedded Signup */}
      <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">WhatsApp Business</h2>
            <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>
              Conecte seu número para receber e enviar mensagens com IA
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {waStatus === "connected"
              ? <><CheckCircle className="w-4 h-4" style={{ color: "#9aea62" }} /><span className="text-xs font-bold" style={{ color: "#9aea62" }}>Conectado</span></>
              : <><AlertCircle className="w-4 h-4" style={{ color: "#939da4" }} /><span className="text-xs" style={{ color: "#939da4" }}>Não conectado</span></>}
          </div>
        </div>

        {/* Conectado */}
        {waStatus === "connected" && (
          <div className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: "rgba(154,234,98,0.06)", border: "1px solid rgba(154,234,98,0.15)" }}>
            <div>
              <p className="text-sm font-bold text-white">{waName || "WhatsApp conectado"}</p>
              <p className="text-xs mt-0.5" style={{ color: "#9aea62" }}>{waPhone}</p>
            </div>
            <button onClick={disconnect} className="text-xs px-3 py-1.5 rounded-xl transition-colors"
              style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>
              Desconectar
            </button>
          </div>
        )}

        {/* Seleção de número */}
        {waStatus === "select" && (
          <div className="space-y-2">
            <p className="text-xs font-medium" style={{ color: "#939da4" }}>Selecione o número para conectar:</p>
            {phoneOptions.map(phone => (
              <button key={phone.id} onClick={() => selectPhone(phone)}
                className="w-full flex items-center justify-between p-4 rounded-xl transition-colors text-left"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(154,234,98,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>
                <div>
                  <p className="text-sm font-semibold text-white">{phone.verified_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>{phone.display_phone_number}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>Selecionar</span>
              </button>
            ))}
          </div>
        )}

        {/* Botão conectar */}
        {waStatus === "idle" && (
          <button onClick={handleConnect}
            className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: "#1877f2", color: "#ffffff" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Conectar WhatsApp Business
          </button>
        )}

        {waStatus === "connecting" && (
          <div className="flex gap-2">
            <div className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm"
              style={{ background: "rgba(24,119,242,0.15)", border: "1px solid rgba(24,119,242,0.3)", color: "#60a5fa" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Aguardando autorização no Facebook...
            </div>
            <button onClick={() => setWaStatus("idle")}
              className="px-4 h-11 rounded-xl text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.05)", color: "#939da4", border: "1px solid rgba(255,255,255,0.08)" }}>
              Cancelar
            </button>
          </div>
        )}

        {/* Modo manual */}
        {waStatus === "idle" && <ManualWAForm tenantId={tenantId} onConnected={(phone) => { setWaStatus("connected"); setWaPhone(phone); }} />}

        <p className="text-xs text-center" style={{ color: "rgba(147,157,164,0.4)" }}>
          O botão acima abre o fluxo oficial Meta. Se não funcionar, use o modo manual abaixo.
        </p>
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

// ─── Componente de configuração manual ───
function ManualWAForm({ tenantId, onConnected }: { tenantId: string | null; onConnected: (phone: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ phone_number_id: "", access_token: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!tenantId || !form.phone_number_id || !form.access_token) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("whatsapp_configs").upsert({
      tenant_id: tenantId,
      phone_number_id: form.phone_number_id,
      access_token: form.access_token,
      verify_token: "liberty-crm",
      active: true,
    }, { onConflict: "tenant_id" });
    setSaving(false);
    setSaved(true);
    onConnected(form.phone_number_id);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium transition-colors"
        style={{ background: "rgba(255,255,255,0.03)", color: "#939da4" }}>
        Configurar manualmente (avançado)
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="px-4 py-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "#939da4" }}>Phone Number ID</Label>
            <Input value={form.phone_number_id} onChange={e => setForm(f => ({ ...f, phone_number_id: e.target.value }))}
              placeholder="Ex: 123456789012345" className="h-9 rounded-lg text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "#939da4" }}>Access Token</Label>
            <Input type="password" value={form.access_token} onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))}
              placeholder="EAAxxxx..." className="h-9 rounded-lg text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs" style={{ color: "rgba(147,157,164,0.5)" }}>
              Webhook: <span className="font-mono">/api/webhooks/whatsapp</span> · Token: <span className="font-mono">liberty-crm</span>
            </p>
            <button onClick={save} disabled={saving || !form.phone_number_id || !form.access_token}
              className="px-4 h-8 rounded-lg text-xs font-bold transition-all ml-3 shrink-0"
              style={{ background: saved ? "rgba(154,234,98,0.1)" : "#9aea62", color: saved ? "#9aea62" : "#0a0a0a", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
