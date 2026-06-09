"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  LayoutDashboard,
  Users,
  Palette,
  Globe,
  Settings,
  LogOut,
  Building2,
  CreditCard,
  SlidersHorizontal,
  Link2,
  DollarSign,
  ShieldCheck,
  LayoutList,
} from "lucide-react";
import {
  agencyGhostButtonStyle,
  agencyPageStyle,
  agencyPrimaryPanelStyle,
} from "@/app/agency/theme";

const NAV = [
  { href: "/agency", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/agency/customers", icon: Users, label: "Clientes" },
  { href: "/agency/billing-clients", icon: DollarSign, label: "Cobranças" },
  { href: "/agency/plans", icon: LayoutList, label: "Planos" },
  { href: "/agency/links", icon: Link2, label: "Links" },
  { href: "/agency/branding", icon: Palette, label: "Branding" },
  { href: "/agency/domain", icon: Globe, label: "Domínio" },
  { href: "/agency/team", icon: Settings, label: "Equipe" },
  { href: "/agency/billing", icon: CreditCard, label: "Meu Plano" },
  { href: "/agency/audit", icon: ShieldCheck, label: "Auditoria" },
  { href: "/agency/settings", icon: SlidersHorizontal, label: "Configurações" },
];

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [agencyName, setAgencyName] = useState("Minha Agência");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }

      supabase
        .from("agency_users")
        .select("agencies(name, display_name)")
        .eq("user_id", user.id)
        .single()
        .then(({ data }: { data: any }) => {
          if (!data) {
            router.push("/dashboard");
            return;
          }

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
        <div
          className="w-5 h-5 rounded-full animate-spin"
          style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--text-secondary)" }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={agencyPageStyle}>
      <aside
        className="w-56 shrink-0 flex flex-col py-6 px-3"
        style={{ borderRight: "1px solid var(--sidebar-border)", background: "var(--sidebar-gradient)" }}
      >
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#9aea62" }}>
              <Building2 className="w-4 h-4" style={{ color: "#0a0a0a" }} />
            </div>
            <div>
              <p className="text-xs font-extrabold leading-tight" style={{ color: "var(--sidebar-foreground)" }}>
                {agencyName}
              </p>
              <p className="text-[9px]" style={{ color: "var(--text-faint)" }}>Painel da Agência</p>
            </div>
          </div>

          <div className="mt-3 px-2 py-2 rounded-lg" style={agencyPrimaryPanelStyle}>
            <p className="text-[9px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Aqui você gerencia os workspaces CRM que vende para seus clientes.
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/agency" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={
                  active
                    ? { background: "var(--primary-bg)", color: "var(--status-ganho)", border: "1px solid var(--primary-border)" }
                    : { color: "var(--text-secondary)", border: "1px solid transparent" }
                }
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "var(--status-ganho)" : "var(--text-faint)" }} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center justify-between px-3 py-2 mb-1">
            <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>Aparência</span>
            <ThemeToggle />
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium mb-1"
            style={{ ...agencyGhostButtonStyle, background: "transparent", border: "1px solid transparent" }}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Meu CRM
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ color: "#dc2626", border: "1px solid transparent" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
