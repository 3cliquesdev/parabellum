"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const highlights = [
  "Pipeline visual com kanban e valor por negócio",
  "Inbox com IA para respostas automáticas",
  "Multi-tenant: cada cliente com dados isolados",
  "30 dias grátis, sem cartão de crédito",
];

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.get("email") as string,
      password: form.get("password") as string,
      options: {
        data: {
          full_name: form.get("full_name") as string,
          company_name: form.get("company_name") as string,
        },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--font-sans)" }}>

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "#000000" }}>

        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Glow */}
        <div className="absolute top-1/2 -translate-y-1/2 -right-20 w-96 h-96 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(154,234,98,0.06) 0%, transparent 70%)",
        }} />

        {/* Logo */}
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#9aea62" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
              </svg>
            </div>
            <span className="text-white font-bold text-sm tracking-tight">Liberty CRM</span>
          </Link>
        </div>

        {/* Middle */}
        <div className="relative space-y-10">
          <div>
            <p className="section-label mb-3">Comece agora</p>
            <h2 className="text-[32px] font-extrabold text-white leading-[1.1] tracking-[-0.03em]">
              Sua agência merece um{" "}
              <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>
                CRM de verdade.
              </span>
            </h2>
          </div>

          <ul className="space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(154,234,98,0.12)" }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#9aea62" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#939da4" }}>{item}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom */}
        <p className="relative text-xs" style={{ color: "rgba(147,157,164,0.4)" }}>
          © 2026 Liberty CRM · Acesso restrito
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12"
        style={{ background: "#ffffff" }}>

        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#9aea62" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
              </svg>
            </div>
            <span className="font-bold text-sm" style={{ color: "#0a0a0a" }}>Liberty CRM</span>
          </Link>
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h1 className="text-[28px] font-extrabold tracking-[-0.03em] mb-2" style={{ color: "#0a0a0a" }}>
              Criar sua conta
            </h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              30 dias grátis. Sem cartão de crédito.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-sm font-medium" style={{ color: "#374151" }}>
                  Nome
                </Label>
                <Input id="full_name" name="full_name" type="text" autoComplete="name"
                  placeholder="Seu nome" required
                  className="h-11 rounded-xl text-sm"
                  style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#0a0a0a" }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company_name" className="text-sm font-medium" style={{ color: "#374151" }}>
                  Empresa
                </Label>
                <Input id="company_name" name="company_name" type="text" autoComplete="organization"
                  placeholder="Sua agência" required
                  className="h-11 rounded-xl text-sm"
                  style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#0a0a0a" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: "#374151" }}>
                E-mail
              </Label>
              <Input id="email" name="email" type="email" autoComplete="email"
                placeholder="seu@email.com" required
                className="h-11 rounded-xl text-sm"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#0a0a0a" }} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: "#374151" }}>
                Senha
              </Label>
              <div className="relative">
                <Input id="password" name="password" autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres" required minLength={8}
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
                  Criando conta...
                </span>
              ) : "Criar conta grátis"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "#9ca3af" }}>
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold transition-colors" style={{ color: "#0a0a0a" }}>
              Entrar
            </Link>
          </p>
        </div>

        <p className="mt-auto pt-12 text-xs text-center" style={{ color: "#d1d5db" }}>
          Acesso restrito · Liberty CRM © 2026
        </p>
      </div>
    </div>
  );
}
