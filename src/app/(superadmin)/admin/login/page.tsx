"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError("Credenciais inválidas."); setLoading(false); return; }

    // Verificar via API server-side com service role
    const res = await fetch("/api/admin/check");
    const { isAdmin } = await res.json();

    if (!isAdmin) {
      await supabase.auth.signOut();
      setError("Acesso não autorizado para este painel.");
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--font-sans)" }}>

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "#000000" }}>

        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(154,234,98,0.06) 0%, transparent 70%)",
        }} />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#9aea62" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
            </svg>
          </div>
          <span className="font-bold text-sm text-white">Liberty CRM</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold"
            style={{ background: "rgba(154,234,98,0.12)", color: "#9aea62" }}>ADMIN</span>
        </div>

        {/* Middle */}
        <div className="relative space-y-8">
          <div>
            <p className="section-label mb-3">Painel restrito</p>
            <h2 className="text-[32px] font-extrabold text-white leading-[1.1] tracking-[-0.03em]">
              Visão completa do{" "}
              <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>
                seu SaaS.
              </span>
            </h2>
          </div>

          <ul className="space-y-5">
            {[
              { title: "Todos os clientes", desc: "Veja cada workspace, plano e status de assinatura." },
              { title: "Métricas de receita", desc: "MRR, novos tenants e taxa de churn em tempo real." },
              { title: "Gestão de acessos", desc: "Ative, bloqueie ou mude o plano de qualquer cliente." },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(154,234,98,0.12)" }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#9aea62" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#939da4" }}>{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs" style={{ color: "rgba(147,157,164,0.4)" }}>
          © 2026 Liberty CRM · Acesso restrito
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 relative"
        style={{ background: "#ffffff" }}>

        <div className="w-full max-w-[360px]">
          <div className="mb-8">
            <h1 className="text-[28px] font-extrabold tracking-[-0.03em] mb-2" style={{ color: "#0a0a0a" }}>
              Bem-vindo, admin
            </h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Entre com suas credenciais de administrador.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: "#374151" }}>E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email"
                placeholder="admin@email.com" required
                className="h-11 rounded-xl text-sm"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#0a0a0a" }} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: "#374151" }}>Senha</Label>
              <div className="relative">
                <Input id="password" name="password" autoComplete="current-password"
                  type={showPassword ? "text" : "password"} placeholder="••••••••" required
                  className="h-11 rounded-xl text-sm pr-10"
                  style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#0a0a0a" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#9ca3af" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm px-3 py-2 rounded-lg"
                style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className={cn(
                "w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center transition-opacity",
                loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
              )}
              style={{ background: "#0a0a0a", color: "#ffffff" }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : "Entrar no painel admin"}
            </button>
          </form>
        </div>

        <p className="absolute bottom-8 text-xs text-center" style={{ color: "#d1d5db" }}>
          Acesso restrito · Liberty CRM © 2026
        </p>
      </div>
    </div>
  );
}
