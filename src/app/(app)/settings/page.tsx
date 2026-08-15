"use client";

import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import { UserProfileSection } from "@/components/settings/UserProfileSection";
import { getInviteEmailFeatures, getInviteEmailPalette } from "@/lib/email/invite-template";
import {
  UserRound, Puzzle, Users, Settings, CreditCard,
  CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp,
  Plus, Trash2, Copy, Check, Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailTheme } from "@/types/database";

interface FacebookLoginResponse {
  authResponse?: { code?: string };
}

interface FacebookSdk {
  init(options: Record<string, unknown>): void;
  login(
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ): void;
}

interface PersonaSettings {
  nome: string;
  empresa?: string | null;
  descricao?: string | null;
  temperatura?: number | null;
  max_tokens?: number | null;
  responder_com_audio?: boolean | null;
  voz_tts?: string | null;
}

interface TeamMemberRow {
  id: string;
  user_id?: string;
  email?: string;
  role: string;
  availability_status?: string | null;
  max_concurrent_chats?: number | null;
  department_ids?: string[];
}

interface DepartmentRow {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface InviteRow {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

interface WebhookRow {
  id: string;
  nome: string;
  url: string;
  eventos?: string[];
  ultimo_envio?: string | null;
  ultimo_erro?: string | null;
}

declare global { interface Window { FB: FacebookSdk; fbAsyncInit: () => void; } }

const META_APP_ID = "2016623082257479";

// ─── Integration data ───
const INTEGRATIONS = [
  // Mensageiros
  { id: "whatsapp", name: "WhatsApp Business", desc: "Receba e envie mensagens com seus leads direto no CRM", categoria: "mensageiros", cor: "#25D366", status: "installed", icon: <WhatsAppIcon /> },
  { id: "instagram", name: "Instagram", desc: "Gerencie DMs do Instagram no mesmo inbox do CRM", categoria: "mensageiros", cor: "#E1306C", status: "available", icon: <InstagramIcon /> },
  { id: "facebook", name: "Facebook Messenger", desc: "Atenda leads que chegam pelo Facebook Messenger", categoria: "mensageiros", cor: "#0084FF", status: "soon", icon: <FacebookIcon /> },
  { id: "telegram", name: "Telegram", desc: "Conecte um bot do Telegram ao seu pipeline", categoria: "mensageiros", cor: "#229ED9", status: "soon", icon: <TelegramIcon /> },
  // IA
  { id: "gemini", name: "Gemini (Vertex AI)", desc: "IA da Google para respostas automáticas e análise de leads", categoria: "ia", cor: "#4285F4", status: "installed", icon: <GeminiIcon /> },
  { id: "openai", name: "OpenAI", desc: "GPT-4 para respostas mais criativas e contextuais", categoria: "ia", cor: "#10a37f", status: "soon", icon: <OpenAIIcon /> },
  // Automações
  { id: "zapier", name: "Zapier", desc: "Conecte o 3Cliques CRM com mais de 5.000 aplicativos", categoria: "automacoes", cor: "#FF4A00", status: "soon", icon: <ZapierIcon /> },
  { id: "make", name: "Make", desc: "Crie automações visuais entre o CRM e outros sistemas", categoria: "automacoes", cor: "#6D00CC", status: "soon", icon: <MakeIcon /> },
  { id: "webhooks", name: "Webhooks", desc: "Envie eventos do CRM para qualquer URL externa em tempo real", categoria: "automacoes", cor: "#10B981", status: "available", icon: <WebhookIcon /> },
  // Email
  { id: "resend", name: "Resend", desc: "E-mails transacionais e de convite com alta entregabilidade", categoria: "email", cor: "#000000", status: "installed", icon: <ResendIcon /> },
  { id: "sendgrid", name: "SendGrid", desc: "Plataforma de e-mail marketing em escala", categoria: "email", cor: "#1A82E2", status: "soon", icon: <SendGridIcon /> },
  { id: "gmail", name: "Gmail", desc: "Sincronize e-mails do Gmail com as conversas do CRM", categoria: "email", cor: "#EA4335", status: "soon", icon: <GmailIcon /> },
] as const;

const CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "mensageiros", label: "Mensageiros" },
  { id: "ia", label: "IA" },
  { id: "automacoes", label: "Automações" },
  { id: "email", label: "Email" },
  { id: "instalado", label: "Instalado" },
];

const NAV_ITEMS = [
  { id: "perfil", icon: UserRound, label: "Perfil" },
  { id: "integracoes", icon: Puzzle, label: "Integrações" },
  { id: "equipe", icon: Users, label: "Equipe" },
  { id: "workspace", icon: Settings, label: "Workspace" },
  { id: "plano", icon: CreditCard, label: "Plano" },
];

type NavSection = "perfil" | "integracoes" | "equipe" | "workspace" | "plano";
interface PhoneOption { id: string; display_phone_number: string; verified_name: string; }

// ─── Main Page ───
export default function SettingsPage() {
  const { tenant, tenantId, loading } = useTenant();
  const [section, setSection] = useState<NavSection>("perfil");
  const [category, setCategory] = useState("todos");
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);

  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };

  const filteredIntegrations = INTEGRATIONS.filter(i => {
    if (category === "todos") return true;
    if (category === "instalado") return i.status === "installed";
    return i.categoria === category;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "var(--font-sans)" }}>

      {/* Left Nav */}
      <aside className="w-52 shrink-0 flex flex-col py-6 px-3"
        style={{ borderRight: "1px solid var(--border-subtle)", background: "var(--bg-subtle)" }}>
        <p className="px-3 mb-3 text-xs font-bold" style={{ color: "rgba(147,157,164,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Configurações
        </p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setSection(id as NavSection)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={section === id ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }
                : { color: "var(--text-secondary)", border: "1px solid transparent" }}>
              <Icon className="w-4 h-4 shrink-0" style={{ color: section === id ? "var(--status-ganho)" : "var(--text-faint)" }} />
              {label}
            </button>
          ))}
        </div>

      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">

        {/* ─── PERFIL ─── */}
        {section === "perfil" && (
          <div className="p-6">
            <UserProfileSection />
          </div>
        )}

        {/* ─── INTEGRAÇÕES ─── */}
        {section === "integracoes" && (
          <div className="p-6 space-y-5">
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Integrações</h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Conecte o 3Cliques CRM com suas ferramentas favoritas</p>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className="px-4 h-8 rounded-full text-xs font-bold transition-all"
                  style={category === c.id
                    ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }
                    : { background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>
                  {c.label}
                  {c.id === "instalado" && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                      style={{ background: "var(--active-soft-bg)", color: "var(--status-ganho)" }}>
                      {INTEGRATIONS.filter(i => i.status === "installed").length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Integration cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredIntegrations.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  isActive={activeIntegration === integration.id}
                  onManage={() => setActiveIntegration(activeIntegration === integration.id ? null : integration.id)}
                  tenantId={tenantId}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── EQUIPE ─── */}
        {section === "equipe" && tenantId && (
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-white tracking-tight">Equipe</h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Gerencie os membros do seu workspace</p>
            </div>
            <TeamSection tenantId={tenantId} />
          </div>
        )}

        {/* ─── WORKSPACE ─── */}
        {section === "workspace" && (
          <div className="p-6 space-y-5 max-w-2xl">
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Workspace</h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Informações da sua empresa</p>
            </div>
            <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
              {[
                { label: "Nome da empresa", value: tenant?.name ?? "—" },
                { label: "Slug", value: tenant?.slug ?? "—" },
                { label: "Criado em", value: tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString("pt-BR") : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <span className="text-sm font-medium text-white">{value}</span>
                </div>
              ))}
            </div>
            <IdentidadeConfig tenantId={tenantId} />
            <PersonaConfig tenantId={tenantId} />
          </div>
        )}

        {/* ─── PLANO ─── */}
        {section === "plano" && (
          <div className="p-6 space-y-5 max-w-2xl">
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Plano & Faturamento</h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Gerencie sua assinatura</p>
            </div>
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-lg font-extrabold text-white">Starter — Trial</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>30 dias grátis · sem cartão de crédito</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>Trial ativo</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Mensagens IA / mês", used: 0, limit: 200 },
                  { label: "Leads", used: 0, limit: 500 },
                  { label: "Membros da equipe", used: 1, limit: 3 },
                ].map(({ label, used, limit }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{used} / {limit}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "var(--ghost-bg)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min((used / limit) * 100, 100)}%`, background: "#10B981" }} />
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 h-10 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                Fazer upgrade do plano
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Integration Card ───
function IntegrationCard({ integration, isActive, onManage, tenantId }: {
  integration: typeof INTEGRATIONS[number]; isActive: boolean; onManage: () => void; tenantId: string | null;
}) {
  const { id, name, desc, cor, status, icon } = integration;
  const [resolvedStatus, setResolvedStatus] = useState(status);
  const installed = resolvedStatus === "installed";
  const soon = resolvedStatus === "soon";
  const cardStyle = { background: "var(--surface-gradient)", border: `1px solid ${isActive ? cor + "40" : "var(--border-subtle)"}` };

  useEffect(() => {
    if (id !== "instagram" || !tenantId) {
      return;
    }

    fetch(`/api/instagram/status?tenant_id=${tenantId}`)
      .then((response) => response.json())
      .then((data) => setResolvedStatus(data.connected ? "installed" : "available"))
      .catch(() => setResolvedStatus("available"));
  }, [id, status, tenantId]);

  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200" style={cardStyle}>
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: cor + "20", border: `1px solid ${cor}30` }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{name}</p>
            <p className="text-xs mt-0.5 line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {installed && <><CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--status-ganho)" }} /><span className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>Instalado</span></>}
            {soon && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--chip-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>Em breve</span>}
            {resolvedStatus === "available" && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }}>Disponível</span>}
          </div>
          {installed && (
            <button onClick={onManage}
              className="px-3 h-7 rounded-lg text-xs font-bold transition-all"
              style={isActive ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>
              {isActive ? "Fechar" : "Gerenciar"}
            </button>
          )}
          {resolvedStatus === "available" && (
            <button onClick={onManage}
              className="px-3 h-7 rounded-lg text-xs font-bold transition-all"
              style={isActive ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }}>
              {isActive ? "Fechar" : "+ Instalar"}
            </button>
          )}
        </div>
      </div>

      {/* Expanded management panel */}
      {isActive && (installed || resolvedStatus === "available") && (
        <div style={{ borderTop: `1px solid ${cor}25`, background: "var(--surface-panel)" }}>
          {id === "whatsapp" && <WhatsAppManagePanel tenantId={tenantId} />}
          {id === "instagram" && <InstagramManagePanel tenantId={tenantId} onStatusChange={setResolvedStatus} />}
          {id === "gemini" && <GeminiManagePanel />}
          {id === "resend" && <ResendManagePanel />}
          {id === "webhooks" && <WebhooksManagePanel tenantId={tenantId} />}
        </div>
      )}
    </div>
  );
}

// ─── WhatsApp Manage Panel ───
function WhatsAppManagePanel({ tenantId }: { tenantId: string | null }) {
  const [waStatus, setWaStatus] = useState<"idle" | "connecting" | "select" | "connected">("idle");
  const [waPhone, setWaPhone] = useState("");
  const [waName, setWaName] = useState("");
  const [phoneOptions, setPhoneOptions] = useState<PhoneOption[]>([]);
  const [pendingToken, setPendingToken] = useState("");
  const [pendingWabaId, setPendingWabaId] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/whatsapp/status?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(d => { if (d.connected) { setWaStatus("connected"); setWaPhone(d.phone_number ?? ""); setWaName(d.verified_name ?? ""); } });
    if (document.getElementById("facebook-jssdk")) return;
    window.fbAsyncInit = () => window.FB.init({ appId: META_APP_ID, cookie: true, xfbml: true, version: "v20.0" });
    const s = document.createElement("script"); s.id = "facebook-jssdk"; s.src = "https://connect.facebook.net/pt_BR/sdk.js"; s.async = true; document.body.appendChild(s);
  }, [tenantId]);

  const handleConnect = useCallback(() => {
    if (!window.FB) return;
    setWaStatus("connecting");
    const timeout = setTimeout(() => setWaStatus("idle"), 30000);
    window.FB.login((resp: FacebookLoginResponse) => {
      clearTimeout(timeout);
      if (!resp.authResponse?.code) { setWaStatus("idle"); return; }
      fetch("/api/whatsapp/embedded-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: resp.authResponse.code, tenant_id: tenantId }) })
        .then(r => r.json().then(d => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) { alert(d.error ?? "Erro"); setWaStatus("idle"); return; }
          if (d.status === "connected") { setWaStatus("connected"); setWaPhone(d.phone_number ?? ""); setWaName(d.verified_name ?? ""); }
          else if (d.status === "select_phone") { setPhoneOptions(d.phones); setPendingToken(d.access_token); setPendingWabaId(d.waba_id); setWaStatus("select"); }
        }).catch(() => { setWaStatus("idle"); });
    }, { config_id: "1712571456601258", response_type: "code", override_default_response_type: true, extras: { sessionInfoVersion: "3" } });
  }, [tenantId]);

  async function disconnect() {
    if (!confirm("Desconectar WhatsApp?")) return;
    await fetch("/api/whatsapp/embedded-signup", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant_id: tenantId }) });
    setWaStatus("idle"); setWaPhone(""); setWaName("");
  }

  async function selectPhone(phone: PhoneOption) {
    setWaStatus("connecting");
    const r = await fetch("/api/whatsapp/embedded-signup", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant_id: tenantId, phone_number_id: phone.id, access_token: pendingToken, waba_id: pendingWabaId }) });
    if (r.ok) { setWaStatus("connected"); setWaPhone(phone.display_phone_number); setWaName(phone.verified_name); }
    else setWaStatus("idle");
  }

  return (
    <div className="p-5 space-y-4">
      {waStatus === "connected" ? (
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.15)" }}>
          <div>
            <p className="text-sm font-bold text-white">{waName || "Conectado"}</p>
            <p className="text-xs" style={{ color: "#25D366" }}>{waPhone}</p>
          </div>
          <button onClick={disconnect} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#f87171", background: "rgba(248,113,113,0.08)" }}>Desconectar</button>
        </div>
      ) : waStatus === "select" ? (
        <div className="space-y-2">
          {phoneOptions.map(p => (
            <button key={p.id} onClick={() => selectPhone(p)} className="w-full flex items-center justify-between p-3 rounded-xl text-left" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
              <div><p className="text-sm font-semibold text-white">{p.verified_name}</p><p className="text-xs" style={{ color: "var(--text-secondary)" }}>{p.display_phone_number}</p></div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "var(--status-ganho)" }}>Selecionar</span>
            </button>
          ))}
        </div>
      ) : waStatus === "connecting" ? (
        <div className="flex gap-2">
          <div className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs" style={{ background: "rgba(24,119,242,0.1)", color: "#60a5fa" }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Aguardando autorização...
          </div>
          <button onClick={() => setWaStatus("idle")} className="px-3 h-10 rounded-xl text-xs" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>Cancelar</button>
        </div>
      ) : (
        <button onClick={handleConnect} className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all" style={{ background: "#1877f2", color: "#fff" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Continuar com Facebook
        </button>
      )}
      <ManualWAForm tenantId={tenantId} onConnected={(p) => { setWaStatus("connected"); setWaPhone(p); }} />
    </div>
  );
}

function InstagramManagePanel({
  tenantId,
  onStatusChange,
}: {
  tenantId: string | null;
  onStatusChange: (status: "installed" | "available" | "soon") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingNames, setRefreshingNames] = useState(false);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [pageId, setPageId] = useState("");
  const [instagramBusinessAccountId, setInstagramBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/instagram/status?tenant_id=${tenantId}`)
      .then((response) => response.json())
      .then((data) => {
        setConnected(Boolean(data.connected));
        setUsername(data.username ?? "");
        setPageId(data.page_id ?? "");
        setInstagramBusinessAccountId(data.instagram_business_account_id ?? "");
        setVerifyToken(data.verify_token ?? "");
        setWebhookUrl(data.webhook_url ?? "");
        onStatusChange(data.connected ? "installed" : "available");
      })
      .finally(() => setLoading(false));
  }, [tenantId, onStatusChange]);

  async function saveConfig() {
    if (!tenantId || !pageId || !instagramBusinessAccountId || !accessToken) return;
    setSaving(true);
    const response = await fetch("/api/instagram/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        page_id: pageId,
        instagram_business_account_id: instagramBusinessAccountId,
        access_token: accessToken,
      }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      alert(data.error ?? "Erro ao conectar Instagram");
      return;
    }

    setConnected(true);
    setUsername(data.config?.username ?? username);
    setVerifyToken(data.config?.verify_token ?? verifyToken);
    onStatusChange("installed");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function disconnect() {
    if (!tenantId || !confirm("Desconectar Instagram?")) return;
    await fetch("/api/instagram/config", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    setConnected(false);
    onStatusChange("available");
  }

  async function refreshNames() {
    if (!tenantId) return;
    setRefreshingNames(true);

    const response = await fetch("/api/instagram/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    const data = await response.json().catch(() => null);
    setRefreshingNames(false);

    if (!response.ok) {
      alert(data?.error ?? "Erro ao atualizar nomes do Instagram");
      return;
    }

    alert(
      `Backfill concluido.\n` +
      `Leads verificados: ${data.scanned ?? 0}\n` +
      `Leads atualizados: ${data.updated ?? 0}\n` +
      `Nomes corrigidos: ${data.renamed ?? 0}\n` +
      `Usuarios sincronizados: ${data.usernames_synced ?? 0}\n` +
      `Sem external_id: ${data.skipped_without_external_id ?? 0}\n` +
      `Ainda sem nome real pela Meta: ${data.unresolved ?? 0}`,
    );
  }

  return (
    <div className="p-5 space-y-4">
      <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Instagram DM</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Configure sua Page + conta comercial do Instagram para receber DMs no inbox e responder com IA pelo mesmo pipeline do WhatsApp.
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-bold" style={connected
            ? { background: "rgba(16,185,129,0.12)", color: "var(--status-ganho)", border: "1px solid rgba(16,185,129,0.2)" }
            : { background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>
            {connected ? "Conectado" : "Manual"}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando status...
          </div>
        ) : (
          <>
            {connected && (
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <p className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>Canal operacional no inbox</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {username ? `@${username}` : "Conta conectada"} · Page ID {pageId || "—"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Page ID</Label>
                <Input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="123456789012345" className="h-9 rounded-xl text-sm text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Instagram Business Account ID</Label>
                <Input value={instagramBusinessAccountId} onChange={(e) => setInstagramBusinessAccountId(e.target.value)} placeholder="1784..." className="h-9 rounded-xl text-sm text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Access Token da Meta</Label>
              <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="EAAG..." className="h-9 rounded-xl text-sm text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
            </div>

            {connected && (
              <div className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: "var(--active-soft-bg)", border: "1px solid var(--active-soft-border)" }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>Corrigir nomes antigos do inbox</p>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Atualiza conversas antigas que ainda ficaram como &ldquo;Instagram 123456&rdquo; usando os dados reais disponiveis na Meta.
                  </p>
                </div>
                <button
                  onClick={refreshNames}
                  disabled={refreshingNames}
                  className="px-3 h-8 rounded-xl text-xs font-bold shrink-0"
                  style={{
                    background: refreshingNames ? "var(--ghost-bg)" : "var(--primary-bg)",
                    color: refreshingNames ? "var(--text-secondary)" : "var(--status-ganho)",
                    border: "1px solid var(--primary-border)",
                    opacity: refreshingNames ? 0.8 : 1,
                  }}
                >
                  {refreshingNames ? "Atualizando..." : "Atualizar nomes"}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="h-9 rounded-xl text-xs text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
                  <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="px-3 h-9 rounded-xl text-xs font-bold" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Verify Token</Label>
                <div className="flex gap-2">
                  <Input value={verifyToken} readOnly className="h-9 rounded-xl text-xs text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
                  <button onClick={() => navigator.clipboard.writeText(verifyToken)} className="px-3 h-9 rounded-xl text-xs font-bold" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                v1 inbound-first: recebe DM, abre conversa no inbox, roda IA/flows e faz handoff humano. O envio manual por humano fica para a próxima etapa.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {connected && (
                  <button onClick={disconnect} className="px-3 h-8 rounded-xl text-xs font-bold" style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                    Desconectar
                  </button>
                )}
                <button onClick={saveConfig} disabled={saving || !pageId || !instagramBusinessAccountId || !accessToken} className="px-4 h-8 rounded-xl text-xs font-bold" style={{ background: saved ? "var(--primary-bg)" : "var(--primary)", color: saved ? "var(--status-ganho)" : "var(--primary-foreground)", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Salvando..." : saved ? "Salvo!" : connected ? "Atualizar" : "Conectar"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GeminiManagePanel() {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.15)" }}>
        <CheckCircle className="w-4 h-4" style={{ color: "#4285F4" }} />
        <div>
          <p className="text-xs font-bold text-white">Vertex AI conectado</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Projeto: adsliberty · Modelo: gemini-2.0-flash</p>
        </div>
      </div>
    </div>
  );
}

function ResendManagePanel() {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <CheckCircle className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
        <div>
          <p className="text-xs font-bold text-white">Resend configurado</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Usado para e-mails de convite da equipe</p>
        </div>
      </div>
    </div>
  );
}

// ─── Brand icons (SVG inline) ───
function WhatsAppIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>; }
function InstagramIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="url(#ig)"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fd5949"/><stop offset="50%" stopColor="#d6249f"/><stop offset="100%" stopColor="#285AEB"/></linearGradient></defs><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>; }
function FacebookIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="#0084FF"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>; }
function TelegramIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="#229ED9"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>; }
function GeminiIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="#4285F4"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>; }
function OpenAIIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="#10a37f"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.843-3.371 2.019-1.168a.076.076 0 0 1 .071 0l4.83 2.786a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.4-.674zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>; }
function ZapierIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF4A00"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 13.5h-3.75v3.75a1.5 1.5 0 01-3 0V13.5H6.75a1.5 1.5 0 010-3h3.75V6.75a1.5 1.5 0 013 0v3.75h3.75a1.5 1.5 0 010 3z"/></svg>; }
function MakeIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="#6D00CC"><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">M</text></svg>; }
function WebhookIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"/></svg>; }
function ResendIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><text x="3" y="18" fontSize="14" fontWeight="900" fill="white">R</text></svg>; }
function SendGridIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="#1A82E2"><path d="M0 0h8v8H0zm8 8h8v8H8zm8-8h8v8h-8zM0 16h8v8H0zm16 0h8v8h-8z"/></svg>; }
function GmailIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="#EA4335"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>; }

// ─── Identidade Config ───
function IdentidadeConfig({ tenantId }: { tenantId: string | null }) {
  const [form, setForm] = useState({
    nome_fantasia: "",
    cor_primaria: "#10B981",
    logo_url: "",
    email_theme: "dark" as EmailTheme,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/tenant/branding?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(d => {
        if (d.branding) setForm({
          nome_fantasia: d.branding.nome_fantasia ?? "",
          cor_primaria: d.branding.cor_primaria ?? "#10B981",
          logo_url: d.branding.logo_url ?? "",
          email_theme: d.branding.email_theme === "light" ? "light" : "dark",
        });
      });
  }, [tenantId]);

  async function save() {
    if (!tenantId) return;
    setSaving(true);
    const r = await fetch("/api/tenant/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, ...form }),
    });
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return;
    }

    const data = await r.json().catch(() => null);
    alert(data?.error ?? "Erro ao salvar identidade");
  }

  const previewColor = form.cor_primaria || "#10B981";
  const previewName = form.nome_fantasia || "Sua Empresa";
  const previewPalette = getInviteEmailPalette(form.email_theme);
  const previewFeatures = getInviteEmailFeatures("member");
  const previewClientBg = form.email_theme === "light" ? "#EEF4F8" : "var(--surface-panel)";
  const previewClientBorder = form.email_theme === "light" ? "#D7E1EB" : "var(--border-subtle)";

  return (
    <div className="rounded-xl p-5 space-y-5" style={cardStyle}>
      <div>
        <h2 className="text-sm font-bold text-white">Identidade nos Emails</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Como sua marca aparece nos emails enviados pelo CRM
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Nome de exibição</Label>
          <Input value={form.nome_fantasia} onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))}
            placeholder="Ex: Agência Exemplo"
            className="h-9 rounded-xl text-sm text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.6)" }}>Aparece no remetente: <span style={{ color: previewColor }}>{previewName} | 3Cliques CRM</span></p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Cor primária</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.cor_primaria} onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))}
              className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0.5"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
            <Input value={form.cor_primaria} onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))}
              placeholder="#10B981" maxLength={7}
              className="h-9 rounded-xl text-sm font-mono text-white w-32" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: `${previewColor}20`, color: previewColor }}>
              Botão do email
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Tema do email</Label>
          <div className="flex gap-2">
            {(["dark", "light"] as EmailTheme[]).map(theme => {
              const active = form.email_theme === theme;
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, email_theme: theme }))}
                  className="px-4 h-9 rounded-xl text-xs font-bold transition-all"
                  style={active
                    ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }
                    : { background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}
                >
                  {theme === "dark" ? "Escuro" : "Claro"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview fiel ao email real */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(147,157,164,0.5)" }}>Preview do email</p>
          {/* Simula o fundo do cliente de email */}
          <div className="rounded-xl p-3" style={{ background: previewClientBg, border: `1px solid ${previewClientBorder}` }}>
            {/* Card do email */}
            <div className="rounded-xl overflow-hidden mx-auto" style={{ background: previewPalette.cardBg, border: `1px solid ${previewPalette.cardBorder}`, boxShadow: previewPalette.shadow, maxWidth: 480 }}>
              {/* Accent bar top */}
              <div style={{ height: 2, background: `linear-gradient(90deg,${previewColor} 0%,${previewColor}60 60%,transparent 100%)` }} />

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${previewPalette.divider}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: previewColor }}>
                    <span className="text-[8px] font-black" style={{ color: "#0a0a0a" }}>▲</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: previewPalette.brandWordmark }}>{previewName}</span>
                </div>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: previewPalette.pillBg, border: `1px solid ${previewPalette.pillBorder}`, color: previewPalette.pillText }}>
                  Convite de equipe
                </span>
              </div>

              {/* Body */}
              <div className="px-5 py-5 space-y-3">
                {/* Inviter row */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${previewColor}1a`, border: `1px solid ${previewColor}35` }}>
                    <span className="text-[9px] font-bold" style={{ color: previewColor }}>AL</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold leading-tight" style={{ color: previewPalette.bodyText }}>alguem@email.com</p>
                    <p className="text-[9px]" style={{ color: previewPalette.faintText }}>convidou voce para colaborar</p>
                  </div>
                </div>

                {/* Headline */}
                <div>
                  <p className="font-extrabold leading-tight" style={{ color: previewPalette.heading, fontSize: 17, letterSpacing: "-0.03em" }}>
                    Você foi convidado<br />para <span style={{ color: previewColor }}>{previewName}</span>
                  </p>
                </div>

                {/* Sub com badge */}
                <p className="text-[10px] leading-relaxed" style={{ color: previewPalette.mutedText }}>
                  Você foi adicionado como{" "}
                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${previewColor}18`, border: `1px solid ${previewColor}30`, color: previewColor }}>Membro</span>
                  {" "}neste workspace.
                </p>

                {/* Feature bullets */}
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: previewPalette.featureBg, border: `1px solid ${previewPalette.featureBorder}` }}>
                  {previewFeatures.map(feature => (
                    <div key={feature} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: previewColor }} />
                      <span className="text-[9px]" style={{ color: previewPalette.bodyText }}>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="w-full py-2.5 rounded-xl text-center" style={{ background: previewColor }}>
                  <span className="text-[11px] font-extrabold" style={{ color: previewPalette.ctaText }}>Aceitar convite e entrar →</span>
                </div>

                <p className="text-[9px] text-center" style={{ color: previewPalette.faintText }}>
                  Expira em 7 dias · Seguro e criptografado
                </p>
              </div>

              {/* Footer */}
              <div className="px-5 py-3" style={{ borderTop: `1px solid ${previewPalette.divider}` }}>
                <p className="text-[9px]" style={{ color: previewPalette.footerText, lineHeight: 1.5 }}>
                  Você recebeu este email porque alguem@email.com enviou um convite para {previewName}.
                </p>
                <p className="text-[9px] mt-1" style={{ color: previewPalette.poweredByText }}>
                  Enviado via 3Cliques CRM · O CRM de agências digitais
                </p>
              </div>

              {/* Bottom glow */}
              <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${previewColor}20,transparent)` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="px-5 h-8 rounded-xl text-xs font-bold"
          style={{ background: saved ? "var(--primary-bg)" : "var(--primary)", color: saved ? "var(--status-ganho)" : "var(--primary-foreground)" }}>
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar identidade"}
        </button>
      </div>
    </div>
  );
}

// ─── Persona Config ───
function PersonaConfig({ tenantId }: { tenantId: string | null }) {
  const [form, setForm] = useState({ nome: "Assistente", empresa: "", descricao: "", temperatura: 0.7, max_tokens: 1000, responder_com_audio: false, voz_tts: "pt-BR-feminina" });
  const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false); const [exists, setExists] = useState(false);
  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };
  useEffect(() => {
    if (!tenantId) return;
    createClient().from("personas").select("*").eq("tenant_id", tenantId).limit(1).maybeSingle().then(({ data }) => {
      const persona = data as unknown as PersonaSettings | null;
      if (persona) { setForm({ nome: persona.nome, empresa: persona.empresa ?? "", descricao: persona.descricao ?? "", temperatura: persona.temperatura ?? 0.7, max_tokens: persona.max_tokens ?? 1000, responder_com_audio: persona.responder_com_audio ?? false, voz_tts: persona.voz_tts ?? "pt-BR-feminina" }); setExists(true); }
    });
  }, [tenantId]);
  async function save() {
    if (!tenantId) return; setSaving(true);
    const supabase = createClient(); const payload = { tenant_id: tenantId, ...form };
    if (exists) await supabase.from("personas").update(payload).eq("tenant_id", tenantId);
    else { await supabase.from("personas").insert(payload); setExists(true); }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
  }
  return (
    <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
      <h2 className="text-sm font-bold text-white">Personalidade da IA</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="h-9 rounded-xl text-sm text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} /></div>
        <div className="space-y-1.5"><Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Empresa</Label><Input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} className="h-9 rounded-xl text-sm text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Instruções</Label><textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} /></div>

      {/* TTS */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.1)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">Responder com áudio</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>IA converte respostas em voz e envia como áudio no WhatsApp</p>
          </div>
          <button onClick={() => setForm(f => ({ ...f, responder_com_audio: !f.responder_com_audio }))}
            className="relative w-10 h-5 rounded-full transition-colors shrink-0"
            style={{ background: form.responder_com_audio ? "#10B981" : "rgba(255,255,255,0.1)" }}>
            <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
              style={{ transform: form.responder_com_audio ? "translateX(22px)" : "translateX(2px)" }} />
          </button>
        </div>
        {form.responder_com_audio && (
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>Voz</Label>
            <select value={form.voz_tts} onChange={e => setForm(f => ({ ...f, voz_tts: e.target.value }))}
              className="w-full h-9 px-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
              <option value="pt-BR-feminina" style={{ background: "var(--surface-solid)" }}>Feminina (Natural)</option>
              <option value="pt-BR-masculina" style={{ background: "var(--surface-solid)" }}>Masculina</option>
              <option value="pt-BR-feminina-2" style={{ background: "var(--surface-solid)" }}>Feminina 2</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end"><button onClick={save} disabled={saving} className="px-5 h-8 rounded-xl text-xs font-bold" style={{ background: saved ? "var(--primary-bg)" : "var(--primary)", color: saved ? "var(--status-ganho)" : "var(--primary-foreground)" }}>{saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}</button></div>
    </div>
  );
}

// ─── Manual WA Form ───
function ManualWAForm({ tenantId, onConnected }: { tenantId: string | null; onConnected: (phone: string) => void }) {
  const [open, setOpen] = useState(false); const [form, setForm] = useState({ phone_number_id: "", access_token: "" }); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  async function save() {
    if (!tenantId || !form.phone_number_id || !form.access_token) return; setSaving(true);
    await createClient().from("whatsapp_configs").upsert({ tenant_id: tenantId, ...form, verify_token: "3cliques-crm", active: true }, { onConflict: "tenant_id" });
    setSaving(false); setSaved(true); onConnected(form.phone_number_id); setTimeout(() => setSaved(false), 3000);
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium" style={{ background: "var(--surface-soft)", color: "var(--text-secondary)" }}>
        Configurar manualmente (avançado) {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <Input value={form.phone_number_id} onChange={e => setForm(f => ({ ...f, phone_number_id: e.target.value }))} placeholder="Phone Number ID" className="h-9 rounded-xl text-sm text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          <Input type="password" value={form.access_token} onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))} placeholder="Access Token" className="h-9 rounded-xl text-sm text-white" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          <div className="flex justify-end"><button onClick={save} disabled={saving || !form.phone_number_id || !form.access_token} className="px-4 h-8 rounded-xl text-xs font-bold" style={{ background: saved ? "var(--primary-bg)" : "var(--primary)", color: saved ? "var(--status-ganho)" : "var(--primary-foreground)" }}>{saving ? "..." : saved ? "Salvo!" : "Salvar"}</button></div>
        </div>
      )}
    </div>
  );
}

// ─── Team Section ───
function TeamSection({ tenantId }: { tenantId: string }) {
  const [members, setMembers] = useState<TeamMemberRow[]>([]); const [invites, setInvites] = useState<InviteRow[]>([]);
  const [showInvite, setShowInvite] = useState(false); const [inviteForm, setInviteForm] = useState({ email: "", role: "vendedor" });
  const [inviting, setInviting] = useState(false); const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };
  const ROLE_COLOR: Record<string, string> = { owner: "#10B981", gerente: "#60a5fa", vendedor: "#facc15", atendente: "#c084fc" };
  const ROLE_LABEL: Record<string, string> = { owner: "Dono", gerente: "Gerente", vendedor: "Vendedor", atendente: "Atendente" };

  useEffect(() => {
    fetch(`/api/team/members?tenant_id=${tenantId}`).then(r => r.ok ? r.json() : { members: [] }).then(d => setMembers(d.members ?? []));
    createClient().from("invite_tokens").select("id, email, role, expires_at").eq("tenant_id", tenantId).is("accepted_at", null)
      .then(({ data }) => setInvites(((data ?? []) as InviteRow[]).filter((invite) => new Date(invite.expires_at) > new Date())));
  }, [tenantId]);

  async function sendInvite() {
    if (!inviteForm.email) return; setInviting(true);
    const r = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...inviteForm, tenant_id: tenantId }) });
    const d = await r.json(); setInviting(false);
    if (d.invite_url) { setInviteLink(d.invite_url); setInviteForm({ email: "", role: "vendedor" }); }
    else alert(d.error ?? "Erro ao convidar");
  }

  async function removeMember(id: string) {
    if (!confirm("Remover membro?")) return;
    await fetch("/api/team/member", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ member_id: id, tenant_id: tenantId }) });
    setMembers(m => m.filter(x => x.id !== id));
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-bold text-white">Membros</p><p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{members.length} membro(s)</p></div>
          <button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold" style={{ background: "rgba(16,185,129,0.1)", color: "var(--status-ganho)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Plus className="w-3.5 h-3.5" /> Convidar
          </button>
        </div>
        {showInvite && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex gap-2">
              <input value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="email@vendedor.com" type="email" className="flex-1 h-9 px-3 rounded-xl text-sm text-white outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
              <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} className="h-9 px-3 rounded-xl text-sm outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
                <option value="vendedor" style={{ background: "var(--surface-solid)" }}>Vendedor</option>
                <option value="atendente" style={{ background: "var(--surface-solid)" }}>Atendente</option>
                <option value="gerente" style={{ background: "var(--surface-solid)" }}>Gerente</option>
              </select>
              <button onClick={sendInvite} disabled={inviting || !inviteForm.email} className="px-4 h-9 rounded-lg text-xs font-semibold" style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: inviting ? 0.6 : 1 }}>
                {inviting ? "..." : "Enviar"}
              </button>
            </div>
            {inviteLink && (
              <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <p className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>Link de convite gerado!</p>
                <p className="text-xs font-mono break-all" style={{ color: "var(--text-secondary)" }}>{inviteLink}</p>
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--status-ganho)" }}>
                  {copied ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar link</>}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="rounded-xl p-3" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(16,185,129,0.1)", color: "var(--status-ganho)" }}>
                  {(m.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{m.email ?? m.user_id}</p></div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: ROLE_COLOR[m.role], background: `${ROLE_COLOR[m.role]}15` }}>{ROLE_LABEL[m.role]}</span>
                {m.role !== "owner" && (
                  <button onClick={() => removeMember(m.id)}><Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.5)" }} /></button>
                )}
              </div>
              {/* Departamento + Disponível */}
              <MemberConfig member={m} tenantId={tenantId} />
            </div>
          ))}
        </div>
        {invites.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "var(--text-secondary)" }}>Convites pendentes</p>
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 py-2 px-3 rounded-xl mb-1.5" style={{ background: "rgba(250,204,21,0.04)", border: "1px solid rgba(250,204,21,0.1)" }}>
                <p className="flex-1 text-xs font-medium text-white truncate">{inv.email}</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>{ROLE_LABEL[inv.role]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Member Config (departamentos + disponibilidade) ───
const AVAILABILITY_COLOR: Record<string, string> = { online: "#10B981", away: "#facc15", offline: "#939da4" };
const AVAILABILITY_LABEL: Record<string, string> = { online: "Disponível", away: "Ausente", offline: "Offline" };

function MemberConfig({ member, tenantId }: { member: TeamMemberRow; tenantId: string }) {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [selected, setSelected] = useState<string[]>(member.department_ids ?? []);
  const [status, setStatus] = useState(member.availability_status ?? "online");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/departments?tenant_id=${tenantId}`).then(r => r.json()).then(d => setDepartments(d.departments ?? []));
  }, [tenantId]);

  async function save(newDepartmentIds?: string[], newStatus?: string) {
    setSaving(true);
    await fetch("/api/team/member", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: member.id,
        tenant_id: tenantId,
        department_ids: newDepartmentIds ?? selected,
        availability_status: newStatus ?? status,
      }),
    });
    setSaving(false);
  }

  function toggleDept(id: string) {
    const novo = selected.includes(id) ? selected.filter(d => d !== id) : [...selected, id];
    setSelected(novo);
    void save(novo);
  }

  function cycleStatus() {
    const ordem = ["online", "away", "offline"];
    const novo = ordem[(ordem.indexOf(status) + 1) % ordem.length];
    setStatus(novo);
    void save(undefined, novo);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <button onClick={() => setOpen(o => !o)} disabled={saving}
          className="h-7 px-2.5 rounded-lg text-xs font-medium"
          style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
          {selected.length === 0 ? "Sem departamento" : `${selected.length} departamento(s)`}
        </button>
        {open && (
          <div className="absolute z-10 mt-1 w-56 rounded-xl p-2 space-y-1" style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)" }}>
            {departments.map(d => (
              <label key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer" style={{ color: "var(--text-primary)" }}>
                <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleDept(d.id)} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                {d.name}
              </label>
            ))}
          </div>
        )}
      </div>
      <button onClick={cycleStatus}
        disabled={saving}
        className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-bold transition-all"
        style={{ background: `${AVAILABILITY_COLOR[status]}18`, color: AVAILABILITY_COLOR[status], border: `1px solid ${AVAILABILITY_COLOR[status]}30` }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: AVAILABILITY_COLOR[status] }} />
        {AVAILABILITY_LABEL[status]}
      </button>
    </div>
  );
}

// ─── Webhooks Manage Panel ───
const WEBHOOK_EVENTS = [
  { id: "lead.created", label: "Lead criado" },
  { id: "lead.status_changed", label: "Status do lead mudou" },
  { id: "lead.won", label: "Lead ganho" },
  { id: "lead.lost", label: "Lead perdido" },
  { id: "message.received", label: "Mensagem recebida" },
  { id: "message.sent", label: "Mensagem enviada" },
  { id: "activity.created", label: "Atividade criada" },
];

function WebhooksManagePanel({ tenantId }: { tenantId: string | null }) {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", url: "", eventos: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { sucesso: boolean; message: string }>>({});

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/webhooks/outgoing?tenant_id=${tenantId}`).then(r => r.json()).then(d => setWebhooks(d.webhooks ?? []));
  }, [tenantId]);

  async function save() {
    if (!tenantId || !form.nome || !form.url || !form.eventos.length) return;
    setSaving(true);
    const r = await fetch("/api/webhooks/outgoing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, tenant_id: tenantId }) });
    const d = await r.json(); setSaving(false);
    if (d.webhook) { setWebhooks(w => [d.webhook, ...w]); setShowForm(false); setForm({ nome: "", url: "", eventos: [] }); }
  }

  async function remove(id: string) {
    if (!confirm("Remover webhook?")) return;
    await fetch("/api/webhooks/outgoing", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhook_id: id }) });
    setWebhooks(w => w.filter(x => x.id !== id));
  }

  async function test(id: string) {
    setTesting(id);
    const r = await fetch("/api/webhooks/outgoing/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhook_id: id }) });
    const d = await r.json(); setTesting(null);
    setTestResult(prev => ({ ...prev, [id]: d }));
    setTimeout(() => setTestResult(prev => { const n = { ...prev }; delete n[id]; return n; }), 5000);
  }

  function toggleEvento(id: string) {
    setForm(f => ({ ...f, eventos: f.eventos.includes(id) ? f.eventos.filter(e => e !== id) : [...f.eventos, id] }));
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white">Seus webhooks</p>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-bold" style={{ background: "rgba(16,185,129,0.1)", color: "var(--status-ganho)" }}>
          <Plus className="w-3 h-3" /> Novo webhook
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome (ex: Notificar n8n)"
            className="w-full h-9 px-3 rounded-xl text-sm text-white outline-none" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://hooks.zapier.com/..."
            className="w-full h-9 px-3 rounded-xl text-sm text-white outline-none font-mono" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Eventos:</p>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map(ev => (
                <button key={ev.id} onClick={() => toggleEvento(ev.id)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={form.eventos.includes(ev.id)
                    ? { background: "rgba(16,185,129,0.15)", color: "var(--status-ganho)", border: "1px solid rgba(16,185,129,0.3)" }
                    : { background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 h-8 rounded-xl text-xs" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>Cancelar</button>
            <button onClick={save} disabled={saving || !form.nome || !form.url || !form.eventos.length}
              className="px-5 h-8 rounded-xl text-xs font-bold" style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando..." : "Salvar webhook"}
            </button>
          </div>
        </div>
      )}

      {webhooks.length === 0 && !showForm ? (
        <p className="text-xs text-center py-4" style={{ color: "rgba(147,157,164,0.5)" }}>Nenhum webhook ainda. Crie um para receber eventos do CRM.</p>
      ) : (
        <div className="space-y-2">
          {webhooks.map(wh => (
            <div key={wh.id} className="rounded-xl p-3 space-y-2" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{wh.nome}</p>
                  <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-secondary)" }}>{wh.url}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button onClick={() => test(wh.id)} disabled={testing === wh.id}
                    className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>
                    {testing === wh.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Testar
                  </button>
                  <button onClick={() => remove(wh.id)}>
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.5)" }} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(wh.eventos ?? []).map((ev: string) => (
                  <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.08)", color: "var(--status-ganho)" }}>
                    {WEBHOOK_EVENTS.find(e => e.id === ev)?.label ?? ev}
                  </span>
                ))}
              </div>
              {testResult[wh.id] && (
                <div className="flex items-center gap-1.5 text-[10px] font-medium"
                  style={{ color: testResult[wh.id].sucesso ? "#10B981" : "#f87171" }}>
                  {testResult[wh.id].sucesso ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {testResult[wh.id].message}
                </div>
              )}
              {wh.ultimo_envio && (
                <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.4)" }}>
                  Último envio: {new Date(wh.ultimo_envio).toLocaleString("pt-BR")}
                  {wh.ultimo_erro && <span style={{ color: "#f87171" }}> · Erro: {wh.ultimo_erro}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
