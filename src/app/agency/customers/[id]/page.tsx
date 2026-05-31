"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LogIn, Users, Calendar, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loginReason, setLoginReason] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    fetch("/api/agency/customers").then(r => r.json()).then(d => {
      const c = (d.customers ?? []).find((x: any) => x.id === id);
      setCustomer(c ?? null);
      setLoading(false);
    });
  }, [id]);

  async function loginAs() {
    setLoggingIn(true);
    const r = await fetch(`/api/agency/customers/${id}/login-as`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: loginReason || "Suporte técnico" }),
    });
    const d = await r.json();
    setLoggingIn(false);
    if (d.success) {
      // Redirecionar para o app do cliente
      window.location.href = "/dashboard";
    } else {
      alert(d.error ?? "Erro ao entrar no workspace");
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  if (!customer) return (
    <div className="p-8 text-center">
      <p className="text-sm" style={{ color: "#939da4" }}>Cliente não encontrado</p>
      <Link href="/agency/customers" className="text-xs mt-2 inline-block" style={{ color: "#9aea62" }}>← Voltar</Link>
    </div>
  );

  return (
    <div className="p-8 space-y-6 max-w-2xl" style={{ fontFamily: "var(--font-sans)" }}>
      <Link href="/agency/customers" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#939da4" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Clientes
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-extrabold"
          style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">{customer.name}</h1>
          <p className="text-sm" style={{ color: "#939da4" }}>{customer.slug}</p>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl p-5 grid grid-cols-2 gap-4" style={cardStyle}>
        {[
          { icon: Users, label: "Membros", value: customer.member_count ?? 0 },
          { icon: Calendar, label: "Criado em", value: new Date(customer.created_at).toLocaleDateString("pt-BR") },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <Icon className="w-4 h-4" style={{ color: "#939da4" }} />
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>{label}</p>
              <p className="text-sm font-bold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Login as */}
      <div className="rounded-2xl p-5 space-y-4" style={{ ...cardStyle, border: "1px solid rgba(250,204,21,0.15)" }}>
        <div>
          <h2 className="text-sm font-bold text-white">Entrar como este cliente</h2>
          <p className="text-xs mt-0.5" style={{ color: "#939da4" }}>
            Acesse o workspace do cliente para dar suporte. Toda a sessão será registrada.
          </p>
        </div>
        <input value={loginReason} onChange={e => setLoginReason(e.target.value)}
          placeholder="Motivo do acesso (ex: Configurar WhatsApp)"
          className="w-full h-9 px-3 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <button onClick={loginAs} disabled={loggingIn}
          className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: "rgba(250,204,21,0.1)", color: "#facc15", border: "1px solid rgba(250,204,21,0.2)" }}>
          <LogIn className="w-4 h-4" />
          {loggingIn ? "Entrando..." : "Entrar no workspace do cliente"}
        </button>
        <p className="text-[10px] text-center" style={{ color: "rgba(147,157,164,0.4)" }}>
          A sessão expira em 30 minutos automaticamente
        </p>
      </div>
    </div>
  );
}
