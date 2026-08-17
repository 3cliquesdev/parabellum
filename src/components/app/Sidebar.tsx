"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  Sparkles,
  Megaphone,
  Ticket,
  Handshake,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBranding } from "@/hooks/useBranding";
import { useTenant } from "@/hooks/useTenant";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const AVAILABILITY_ORDER = ["online", "away", "offline"] as const;
const AVAILABILITY_COLOR: Record<string, string> = { online: "#10B981", away: "#facc15", offline: "#939da4" };
const AVAILABILITY_LABEL: Record<string, string> = { online: "Disponivel", away: "Ausente", offline: "Offline" };

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/negocios", icon: Handshake, label: "Negócios" },
  { href: "/contacts", icon: Users, label: "Contatos" },
  { href: "/activities", icon: CheckSquare, label: "Atividades" },
  { href: "/inbox", icon: MessageSquare, label: "Inbox IA" },
  { href: "/tickets", icon: Ticket, label: "Tickets" },
  { href: "/broadcasts", icon: Megaphone, label: "Broadcast" },
  { href: "/ia", icon: Sparkles, label: "Studio IA", separator: true },
];

// Papeis do time financeiro so tratam tickets (ex: reembolso) - nao precisam
// nem devem ver a inbox de conversas dos outros times.
const ROLES_SO_TICKETS = ["financeiro", "gerente_financeiro"];

const SIDEBAR_COLLAPSED_KEY = "3cliques-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const branding = useBranding();
  const { tenantId } = useTenant();
  const cor = branding.primary_color;
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("offline");
  const [savingStatus, setSavingStatus] = useState(false);
  const [atendimentosAtivos, setAtendimentosAtivos] = useState(0);
  const [myRole, setMyRole] = useState<string | null>(null);

  useEffect(() => {
    function inicializar() {
      setMounted(true);
      const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved === "1") setCollapsed(true);
    }
    inicializar();
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: member } = await supabase
        .from("tenant_members")
        .select("id, availability_status, role")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .maybeSingle();
      const row = member as { id: string; availability_status: string | null; role: string } | null;
      if (!row) return;
      setMemberId(row.id);
      setStatus(row.availability_status ?? "offline");
      setMyRole(row.role);

      const { count } = await supabase
        .from("conversas")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .eq("dispatch_status", "atribuido")
        .eq("status", "ativo");
      setAtendimentosAtivos(count ?? 0);
    });
  }, [tenantId]);

  async function updateStatus(novoStatus: string) {
    if (!memberId || !tenantId) return;
    setSavingStatus(true);
    setStatus(novoStatus);
    await fetch("/api/team/member", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId, tenant_id: tenantId, availability_status: novoStatus }),
    });
    setSavingStatus(false);
    if (novoStatus === "offline") setAtendimentosAtivos(0);
  }

  function cycleMyStatus() {
    const novo = AVAILABILITY_ORDER[(AVAILABILITY_ORDER.indexOf(status as typeof AVAILABILITY_ORDER[number]) + 1) % AVAILABILITY_ORDER.length];
    void updateStatus(novo);
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  const logoSrc = branding.logo_url && mounted && resolvedTheme === "dark"
    ? branding.logo_url.replace(/\.png$/, "-white.png")
    : branding.logo_url;

  const somenteTickets = myRole ? ROLES_SO_TICKETS.includes(myRole) : false;
  const visibleNavItems = somenteTickets ? navItems.filter((item) => item.href === "/tickets") : navItems;

  async function handleLogout() {
    if (atendimentosAtivos > 0) {
      const confirmado = window.confirm(
        `Voce tem ${atendimentosAtivos} atendimento(s) em andamento. Tem certeza que quer sair? Suas conversas serao redistribuidas para outro atendente disponivel.`
      );
      if (!confirmado) return;
      await updateStatus("offline");
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`crm-sidebar ${collapsed ? "w-16" : "w-56"} shrink-0 flex flex-col h-full transition-[width] duration-150`}
      style={{
        background: "var(--sidebar-gradient)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      <div
        className={`h-24 flex items-center shrink-0 ${collapsed ? "justify-center px-2" : "justify-between px-4 gap-3"}`}
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {!collapsed && (
          <div className="flex-1 min-w-0 overflow-hidden flex items-center">
            {branding.logo_url ? (
              // Logo completa (ja contem o nome) — nao repete o texto ao lado.
              <img src={logoSrc ?? undefined} alt={branding.display_name} className="h-16 w-auto max-w-full min-w-0" /> // eslint-disable-line @next/next/no-img-element
            ) : (
              <>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: cor, boxShadow: `0 0 12px ${cor}40` }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
                  </svg>
                </div>
                <span className="font-bold text-sm tracking-tight truncate ml-3" style={{ color: "var(--sidebar-foreground)" }}>
                  {branding.display_name}
                </span>
              </>
            )}
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ color: "var(--text-secondary)", background: "var(--surface-soft)", border: "1px solid var(--sidebar-border)" }}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {visibleNavItems.map(({ href, icon: Icon, label, separator }) => {
          const active = href === "/ia" ? pathname.startsWith("/ia") : pathname.startsWith(href);
          const hovered = hoveredHref === href;

          return (
            <div key={href}>
              {separator && (
                <div className="my-2 relative">
                  <div style={{ borderTop: "1px solid var(--sidebar-border)" }} />
                  {active && (
                    <div
                      className="absolute inset-x-0 -top-px h-px"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(21,128,61,0.35), transparent)" }}
                    />
                  )}
                </div>
              )}

              <Link
                href={href}
                title={collapsed ? label : undefined}
                className={`relative flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium ${collapsed ? "justify-center px-0" : "px-3"}`}
                style={{
                  color: active ? "var(--status-ganho)" : hovered ? "var(--sidebar-foreground)" : "var(--text-secondary)",
                  background: active ? "var(--primary-bg)" : hovered ? "var(--surface-soft)" : "transparent",
                  border: active ? "1px solid var(--primary-border)" : "1px solid transparent",
                  transform: hovered && !active ? "translateX(2px)" : "none",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={() => setHoveredHref(href)}
                onMouseLeave={() => setHoveredHref(null)}
              >
                {active && !collapsed && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: "var(--status-ganho)", boxShadow: "0 0 8px rgba(21,128,61,0.45)" }}
                  />
                )}
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: active ? "var(--status-ganho)" : hovered ? "var(--sidebar-foreground)" : "var(--text-faint)" }}
                />
                {!collapsed && label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="px-3 pb-5 space-y-0.5" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="pt-3">
          {!collapsed && memberId && (
            <button
              onClick={cycleMyStatus}
              disabled={savingStatus}
              title="Clique para mudar seu status"
              className="w-full flex items-center gap-2 px-3 py-2 mb-0.5 rounded-lg text-xs font-bold"
              style={{ background: `${AVAILABILITY_COLOR[status]}18`, color: AVAILABILITY_COLOR[status], border: `1px solid ${AVAILABILITY_COLOR[status]}30` }}
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: AVAILABILITY_COLOR[status] }} />
              {AVAILABILITY_LABEL[status]}
            </button>
          )}
          {!collapsed && (
            <div className="flex items-center justify-between px-3 py-2 mb-0.5">
              <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>Aparencia</span>
              <ThemeToggle />
            </div>
          )}

          <Link
            href="/settings"
            title={collapsed ? "Configuracoes" : undefined}
            className={`flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium ${collapsed ? "justify-center px-0" : "px-3"}`}
            style={{ color: "var(--text-secondary)", border: "1px solid transparent", transition: "all 0.15s ease" }}
            onMouseEnter={(event) => {
              const el = event.currentTarget as HTMLAnchorElement;
              el.style.color = "var(--sidebar-foreground)";
              el.style.background = "var(--surface-soft)";
            }}
            onMouseLeave={(event) => {
              const el = event.currentTarget as HTMLAnchorElement;
              el.style.color = "var(--text-secondary)";
              el.style.background = "transparent";
            }}
          >
            <Settings className="w-4 h-4 shrink-0" style={{ color: "var(--text-faint)" }} />
            {!collapsed && "Configuracoes"}
          </Link>

          <button
            onClick={handleLogout}
            title={collapsed ? "Sair" : undefined}
            className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium ${collapsed ? "justify-center px-0" : "px-3"}`}
            style={{ color: "var(--text-faint)", border: "1px solid transparent", transition: "all 0.15s ease" }}
            onMouseEnter={(event) => {
              const el = event.currentTarget as HTMLButtonElement;
              el.style.color = "rgba(248,113,113,0.75)";
              el.style.background = "rgba(248,113,113,0.08)";
            }}
            onMouseLeave={(event) => {
              const el = event.currentTarget as HTMLButtonElement;
              el.style.color = "var(--text-faint)";
              el.style.background = "transparent";
            }}
          >
            <LogOut className="w-4 h-4 shrink-0" style={{ color: "var(--text-faint)" }} />
            {!collapsed && "Sair"}
          </button>
        </div>
      </div>
    </aside>
  );
}
