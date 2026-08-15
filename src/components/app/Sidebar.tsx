"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Kanban,
  Users,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  Sparkles,
  Megaphone,
  Ticket,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBranding } from "@/hooks/useBranding";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/pipeline", icon: Kanban, label: "Pipeline" },
  { href: "/contacts", icon: Users, label: "Contatos" },
  { href: "/activities", icon: CheckSquare, label: "Atividades" },
  { href: "/inbox", icon: MessageSquare, label: "Inbox IA" },
  { href: "/tickets", icon: Ticket, label: "Tickets" },
  { href: "/broadcasts", icon: Megaphone, label: "Broadcast" },
  { href: "/ia", icon: Sparkles, label: "Studio IA", separator: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const branding = useBranding();
  const cor = branding.primary_color;
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const logoSrc = branding.logo_url && mounted && resolvedTheme === "dark"
    ? branding.logo_url.replace(/\.png$/, "-white.png")
    : branding.logo_url;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="crm-sidebar w-56 shrink-0 flex flex-col h-full"
      style={{
        background: "var(--sidebar-gradient)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      <div
        className="px-4 h-24 flex items-center gap-3 shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {branding.logo_url ? (
          // Logo completa (ja contem o nome) — nao repete o texto ao lado.
          <img src={logoSrc ?? undefined} alt={branding.display_name} className="h-16 w-auto max-w-full shrink-0" /> // eslint-disable-line @next/next/no-img-element
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
            <span className="font-bold text-sm tracking-tight truncate" style={{ color: "var(--sidebar-foreground)" }}>
              {branding.display_name}
            </span>
          </>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label, separator }) => {
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
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
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
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: "var(--status-ganho)", boxShadow: "0 0 8px rgba(21,128,61,0.45)" }}
                  />
                )}
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: active ? "var(--status-ganho)" : hovered ? "var(--sidebar-foreground)" : "var(--text-faint)" }}
                />
                {label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="px-3 pb-5 space-y-0.5" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="pt-3">
          <div className="flex items-center justify-between px-3 py-2 mb-0.5">
            <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>Aparencia</span>
            <ThemeToggle />
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
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
            Configuracoes
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
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
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
