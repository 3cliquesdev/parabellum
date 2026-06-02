"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Kanban, Users, CheckSquare,
  MessageSquare, Settings, LogOut, Sparkles, Megaphone, Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBranding } from "@/hooks/useBranding";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/pipeline", icon: Kanban, label: "Pipeline" },
  { href: "/contacts", icon: Users, label: "Contatos" },
  { href: "/activities", icon: CheckSquare, label: "Atividades" },
  { href: "/inbox", icon: MessageSquare, label: "Inbox IA" },
  { href: "/broadcasts", icon: Megaphone, label: "Broadcast" },
  { href: "/ia", icon: Sparkles, label: "Studio IA", separator: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const branding = useBranding();
  const cor = branding.primary_color;
  const [isAgencyUser, setIsAgencyUser] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("agency_users").select("id").eq("user_id", user.id).limit(1)
        .then(({ data }: { data: any }) => setIsAgencyUser((data ?? []).length > 0));
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full" style={{
      background: "linear-gradient(180deg, #0c0c0c 0%, #080808 100%)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    }}>

      {/* Logo */}
      <div className="px-5 h-16 flex items-center gap-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {branding.logo_url
          ? <img src={branding.logo_url} alt={branding.display_name} className="h-7 w-auto shrink-0" />
          : <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: cor, boxShadow: `0 0 12px ${cor}40` }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
              </svg>
            </div>
        }
        <span className="font-bold text-sm text-white tracking-tight truncate">{branding.display_name}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label, separator }) => {
          const active = href === "/ia"
            ? pathname.startsWith("/ia")
            : pathname.startsWith(href);
          const hovered = hoveredHref === href;

          return (
            <div key={href}>
              {separator && (
                <div className="my-2 relative">
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }} />
                  {active && (
                    <div className="absolute inset-x-0 -top-px h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${cor}40, transparent)` }} />
                  )}
                </div>
              )}
              <Link href={href}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  color: active ? cor : hovered ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.4)",
                  background: active ? `${cor}12` : hovered ? "rgba(255,255,255,0.04)" : "transparent",
                  border: active ? `1px solid ${cor}20` : "1px solid transparent",
                  transform: hovered && !active ? "translateX(2px)" : "none",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={() => setHoveredHref(href)}
                onMouseLeave={() => setHoveredHref(null)}>
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: cor, boxShadow: `0 0 8px ${cor}80` }} />
                )}
                <Icon className="w-4 h-4 shrink-0"
                  style={{ color: active ? cor : hovered ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }} />
                {label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="pt-3">
          {isAgencyUser && (
            <Link href="/agency" className="flex items-start gap-3 px-3 py-2.5 rounded-xl font-medium mb-1"
              style={{ background: `${cor}10`, border: `1px solid ${cor}18`, transition: "all 0.15s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${cor}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${cor}10`; }}>
              <Building2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: cor }} />
              <div>
                <p className="text-sm font-bold leading-tight" style={{ color: cor }}>Painel da Agência</p>
                <p className="text-[10px] leading-tight mt-0.5" style={{ color: `${cor}70` }}>Gerencie seus clientes CRM</p>
              </div>
            </Link>
          )}
          {/* Theme toggle */}
          <div className="flex items-center justify-between px-3 py-2 mb-0.5">
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.22)" }}>Aparência</span>
            <ThemeToggle />
          </div>

          <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.35)", border: "1px solid transparent", transition: "all 0.15s ease" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = "rgba(255,255,255,0.6)"; el.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = "rgba(255,255,255,0.35)"; el.style.background = "transparent"; }}>
            <Settings className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
            Configurações
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.22)", border: "1px solid transparent", transition: "all 0.15s ease" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "rgba(248,113,113,0.7)"; el.style.background = "rgba(248,113,113,0.05)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "rgba(255,255,255,0.22)"; el.style.background = "transparent"; }}>
            <LogOut className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
