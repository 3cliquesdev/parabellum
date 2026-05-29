"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Kanban, Users, CheckSquare,
  MessageSquare, Settings, LogOut, Brain,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/pipeline", icon: Kanban, label: "Pipeline" },
  { href: "/contacts", icon: Users, label: "Contatos" },
  { href: "/activities", icon: CheckSquare, label: "Atividades" },
  { href: "/inbox", icon: MessageSquare, label: "Inbox IA" },
  { href: "/ia/knowledge", icon: Brain, label: "Central de IA", separator: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#9aea62" }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
          </svg>
        </div>
        <span className="font-bold text-sm text-white tracking-tight">Liberty CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label, separator }) => {
          const active = pathname.startsWith(href);
          return (
            <div key={href}>
              {separator && <div className="my-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }} />}
              <Link href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={active ? {
                  background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.15)",
                } : { color: "rgba(255,255,255,0.45)", border: "1px solid transparent" }}>
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "#9aea62" : "rgba(255,255,255,0.3)" }} />
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
