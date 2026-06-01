"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Kanban, Users, CheckSquare,
  MessageSquare, Settings, LogOut, Sparkles, Megaphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBranding } from "@/hooks/useBranding";

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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full"
      style={{ background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

      {/* Logo */}
      <div className="px-5 h-16 flex items-center gap-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {branding.logo_url
          ? <img src={branding.logo_url} alt={branding.display_name} className="h-7 w-auto shrink-0" />
          : <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: cor }}>
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
          return (
            <div key={href}>
              {separator && <div className="my-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }} />}
              <Link href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={active ? {
                  background: `${cor}18`, color: cor, border: `1px solid ${cor}25`,
                } : { color: "rgba(255,255,255,0.45)", border: "1px solid transparent" }}>
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? cor : "rgba(255,255,255,0.3)" }} />
                {label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="pt-3">
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.35)", border: "1px solid transparent" }}>
            <Settings className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
            Configurações
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.25)", border: "1px solid transparent" }}>
            <LogOut className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
