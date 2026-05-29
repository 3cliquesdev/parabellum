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

        {/* Wizard passo 1: checklist de requisitos */}
        {waStatus === "idle" && (
          <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold" style={{ color: "#939da4" }}>Antes de conectar, verifique se você tem:</p>
            <div className="space-y-2.5">
              {[
                { ok: true, text: "Conta no Meta Business Manager (business.facebook.com)" },
                { ok: true, text: "Número de telefone dedicado para o WhatsApp Business" },
                { ok: true, text: "App criado no Meta for Developers com WhatsApp ativado" },
              ].map(({ ok, text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: ok ? "rgba(154,234,98,0.15)" : "rgba(255,255,255,0.06)" }}>
                    {ok && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="#9aea62" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "#939da4" }}>{text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleConnect}
                className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: "#1877f2", color: "#ffffff" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Continuar com o Facebook
              </button>
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer"
                className="px-4 h-11 rounded-xl text-xs font-medium flex items-center"
                style={{ background: "rgba(255,255,255,0.04)", color: "#939da4", border: "1px solid rgba(255,255,255,0.07)" }}>
                Abrir Meta
              </a>
            </div>
          </div>
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

        {/* Webhook info */}
        {waStatus === "idle" && (
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xs font-bold mb-2" style={{ color: "#939da4" }}>Configure o webhook no Meta for Developers:</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "rgba(147,157,164,0.6)" }}>URL do Webhook</span>
                <code className="text-xs font-mono" style={{ color: "#60a5fa" }}>
                  {typeof window !== "undefined" ? window.location.origin : "https://..."}/api/webhooks/whatsapp
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "rgba(147,157,164,0.6)" }}>Verify Token</span>
                <code className="text-xs font-mono" style={{ color: "#9aea62" }}>liberty-crm</code>
              </div>
            </div>
          </div>
        )}

        {/* Modo manual */}
        {waStatus === "idle" && <ManualWAForm tenantId={tenantId} onConnected={(phone) => { setWaStatus("connected"); setWaPhone(phone); }} />
      </div>

      {/* IA — Persona */}
      <PersonaConfig tenantId={tenantId} />

      {/* Equipe */}
      <TeamSection tenantId={tenantId} />

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

// ─── Persona da IA ───
function PersonaConfig({ tenantId }: { tenantId: string | null }) {
  const [form, setForm] = useState({ nome: "Assistente", empresa: "", descricao: "", temperatura: 0.7, max_tokens: 300 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exists, setExists] = useState(false);

  const cardStyle = {
    background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
  };

  useEffect(() => {
    if (!tenantId) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("personas").select("*").eq("tenant_id", tenantId!).single() as { data: any; error: unknown };
      if (data) {
        setForm({ nome: data.nome, empresa: data.empresa ?? "", descricao: data.descricao ?? "", temperatura: data.temperatura ?? 0.7, max_tokens: data.max_tokens ?? 300 });
        setExists(true);
      }
    }
    load();
  }, [tenantId]);

  async function save() {
    if (!tenantId) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { tenant_id: tenantId, ...form };
    if (exists) {
      await supabase.from("personas").update(payload).eq("tenant_id", tenantId);
    } else {
      await supabase.from("personas").insert(payload);
      setExists(true);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
      <div>
        <h2 className="text-sm font-bold text-white">Personalidade da IA</h2>
        <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>Configure como a IA se comporta com seus leads</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Nome do assistente</Label>
          <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Ex: Ana, Carlos..." className="h-10 rounded-xl text-sm text-white"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Nome da empresa</Label>
          <Input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
            placeholder="Sua empresa..." className="h-10 rounded-xl text-sm text-white"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Instruções para a IA</Label>
        <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          rows={4} placeholder="Ex: Você é uma assistente de vendas especializada em marketing digital. Seja simpática, objetiva e sempre apresente os benefícios dos serviços."
          className="w-full rounded-xl text-sm p-3 resize-none outline-none text-white"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Criatividade</Label>
            <span className="text-xs font-bold" style={{ color: "#9aea62" }}>{form.temperatura}</span>
          </div>
          <input type="range" min="0.1" max="1.0" step="0.1" value={form.temperatura}
            onChange={e => setForm(f => ({ ...f, temperatura: parseFloat(e.target.value) }))}
            className="w-full accent-[#9aea62]" />
          <div className="flex justify-between text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>
            <span>Conservador</span><span>Criativo</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Tamanho máx. da resposta</Label>
          <select value={form.max_tokens} onChange={e => setForm(f => ({ ...f, max_tokens: parseInt(e.target.value) }))}
            className="w-full h-10 rounded-xl text-sm px-3 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
            <option value={150} style={{ background: "#111" }}>Curto (~2 linhas)</option>
            <option value={300} style={{ background: "#111" }}>Médio (~4 linhas)</option>
            <option value={600} style={{ background: "#111" }}>Longo (~8 linhas)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="px-6 h-9 rounded-xl text-sm font-bold transition-all"
          style={{ background: saved ? "rgba(154,234,98,0.1)" : "#9aea62", color: saved ? "#9aea62" : "#0a0a0a", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar personalidade"}
        </button>
      </div>
    </div>
  );
}

// ─── Equipe ───
function TeamSection({ tenantId }: { tenantId: string | null }) {
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<string>("owner");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "member" });
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const supabase = createClient();

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };
  const ROLE_COLOR: Record<string, string> = { owner: "#9aea62", admin: "#60a5fa", member: "#939da4" };
  const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Membro" };

  useEffect(() => {
    if (!tenantId) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      // Buscar membros via API (usa service role — retorna emails + roles)
      const res = await fetch(`/api/team/members?tenant_id=${tenantId}`);
      if (res.ok) {
        const { members: list } = await res.json();
        setMembers(list ?? []);
        const me = (list ?? []).find((m: any) => m.user_id === user?.id);
        setMyRole(me?.role ?? "owner"); // default owner se é o único
      }

      // Convites pendentes
      const { data: inv } = await supabase
        .from("invite_tokens").select("id, email, role, expires_at, created_at")
        .eq("tenant_id", tenantId!).is("accepted_at", null) as { data: any[]; error: unknown };
      setInvites((inv ?? []).filter((i: any) => new Date(i.expires_at) > new Date()));
    }
    load();
  }, [tenantId]);

  async function sendInvite() {
    if (!tenantId || !inviteForm.email) return;
    setInviting(true);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...inviteForm, tenant_id: tenantId }),
    });
    const data = await res.json();
    setInviting(false);
    if (data.invite_url) {
      setInviteLink(data.invite_url);
      setInviteForm({ email: "", role: "member" });
    } else {
      alert(data.error ?? "Erro ao convidar");
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remover este membro?")) return;
    await fetch("/api/team/member", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId, tenant_id: tenantId }),
    });
    setMembers(m => m.filter(x => x.id !== memberId));
  }

  async function cancelInvite(inviteId: string) {
    const sc = createClient();
    await (sc.from("invite_tokens") as any).update({ accepted_at: new Date().toISOString() }).eq("id", inviteId);
    setInvites(i => i.filter(x => x.id !== inviteId));
  }

  const canManage = ["owner", "admin"].includes(myRole);

  return (
    <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Equipe</h2>
          <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>{members.length} membro(s) · Gerencie quem acessa este workspace</p>
        </div>
        {canManage && (
          <button onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-3 h-8 rounded-xl text-xs font-bold"
            style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
            + Convidar
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex gap-2">
            <input value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@vendedor.com" type="email"
              className="flex-1 h-9 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
              className="h-9 px-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
              <option value="member" style={{ background: "#111" }}>Membro</option>
              <option value="admin" style={{ background: "#111" }}>Admin</option>
            </select>
            <button onClick={sendInvite} disabled={inviting || !inviteForm.email}
              className="px-4 h-9 rounded-xl text-xs font-bold"
              style={{ background: "#9aea62", color: "#0a0a0a", opacity: inviting ? 0.6 : 1 }}>
              {inviting ? "..." : "Enviar"}
            </button>
          </div>
          {inviteLink && (
            <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(154,234,98,0.06)", border: "1px solid rgba(154,234,98,0.15)" }}>
              <p className="text-xs font-bold" style={{ color: "#9aea62" }}>Link de convite gerado!</p>
              <p className="text-xs font-mono break-all" style={{ color: "#939da4" }}>{inviteLink}</p>
              <button onClick={() => { navigator.clipboard.writeText(inviteLink); }} className="text-xs font-bold" style={{ color: "#9aea62" }}>Copiar link</button>
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
              {(m.email ?? m.user_id ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{m.email ?? m.user_id}</p>
              <p className="text-xs" style={{ color: "#939da4" }}>
                desde {new Date(m.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ color: ROLE_COLOR[m.role], background: `${ROLE_COLOR[m.role]}15` }}>
              {ROLE_LABEL[m.role]}
            </span>
            {canManage && m.role !== "owner" && (
              <button onClick={() => removeMember(m.id)} className="text-xs shrink-0 transition-colors"
                style={{ color: "rgba(248,113,113,0.5)" }}>
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: "#939da4" }}>Convites pendentes</p>
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 py-2 px-3 rounded-xl"
                style={{ background: "rgba(250,204,21,0.04)", border: "1px solid rgba(250,204,21,0.1)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{inv.email}</p>
                  <p className="text-[10px]" style={{ color: "#939da4" }}>
                    Expira {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>
                  {ROLE_LABEL[inv.role]}
                </span>
                <button onClick={() => cancelInvite(inv.id)} className="text-[10px]" style={{ color: "rgba(248,113,113,0.5)" }}>
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
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
