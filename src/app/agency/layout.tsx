"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, Users, Palette, Globe, Settings, LogOut, Building2,
} from "lucide-react";

const NAV = [
  { href: "/agency", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/agency/customers", icon: Users, label: "Clientes" },
  { href: "/agency/branding", icon: Palette, label: "Branding" },
  { href: "/agency/domain", icon: Globe, label: "Domínio" },
  { href: "/agency/team", icon: Settings, label: "Equipe" },
];

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [agencyName, setAgencyName] = useState("Minha Agência");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase
        .from("agency_users")
        .select("agencies(name, display_name)")
        .eq("user_id", user.id)
        .single()
        .then(({ data }: { data: any }) => {
          if (!data) { router.push("/dashboard"); return; }
          const agency = data.agencies as any;
          setAgencyName(agency?.display_name ?? agency?.name ?? "Minha Agência");
          setLoading(false);
        });
    });
  }, [router]);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: "#000" }}>
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#000", fontFamily: "var(--font-sans)" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col py-6 px-3"
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "#050505" }}>

        {/* Brand */}
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "#9aea62" }}>
              <Building2 className="w-4 h-4" style={{ color: "#0a0a0a" }} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white leading-tight">{agencyName}</p>
              <p className="text-[9px]" style={{ color: "rgba(147,157,164,0.5)" }}>Painel da Agência</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/agency" && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={active
                  ? { background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.15)" }
                  : { color: "rgba(255,255,255,0.5)", border: "1px solid transparent" }}>
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "#9aea62" : "rgba(255,255,255,0.3)" }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium mb-1"
            style={{ color: "rgba(147,157,164,0.5)", border: "1px solid transparent" }}>
            <LayoutDashboard className="w-3.5 h-3.5" />
            Meu CRM
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ color: "rgba(248,113,113,0.6)", border: "1px solid transparent" }}>
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
