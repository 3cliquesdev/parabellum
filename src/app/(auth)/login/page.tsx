"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/hooks/useBranding";

const features = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="4" height="10" rx="1" fill="#9aea62" opacity="0.9"/>
        <rect x="6" y="1" width="4" height="12" rx="1" fill="#9aea62"/>
        <rect x="11" y="5" width="4" height="8" rx="1" fill="#9aea62" opacity="0.7"/>
      </svg>
    ),
    title: "Pipeline visual",
    desc: "Kanban com 7 etapas e valor por negócio em tempo real.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="3" stroke="#9aea62" strokeWidth="1.5"/>
        <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#9aea62" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M11 7l1.5 1.5L15 6" stroke="#9aea62" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Gestão de leads",
    desc: "Cadastro completo com histórico, UTM tracking e exportação.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="#9aea62" strokeWidth="1.5"/>
        <path d="M2 4l6 5 6-5" stroke="#9aea62" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Inbox com IA",
    desc: "Respostas automáticas por inteligência artificial.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const branding = useBranding();
  const cor = branding.primary_color;
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.get("email") as string,
      password: form.get("password") as string,
    });
    if (signInError) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(154,234,98,0.08) 0%, transparent 70%)",
        }} />

        {/* Top — Logo */}
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            {branding.logo_url
              // Painel escuro (preto fixo) - usa a versao branca da logo.
              ? <img src={branding.logo_url.replace(/\.png$/, "-white.png")} alt={branding.display_name} className="h-8 w-auto" /> // eslint-disable-line @next/next/no-img-element
              : <>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cor }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
                    </svg>
                  </div>
                  <span className="text-white font-bold text-sm tracking-tight">{branding.display_name}</span>
                </>
            }
          </Link>
        </div>

        {/* Middle — Headline + features */}
        <div className="relative space-y-10">
          <div>
            <p className="section-label mb-3">Plataforma SaaS</p>
            <h2 className="text-[32px] font-extrabold text-white leading-[1.1] tracking-[-0.03em]">
              CRM inteligente para{" "}
              <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>
                agências modernas.
              </span>
            </h2>
          </div>

          <ul className="space-y-6">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <div className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(154,234,98,0.08)", border: "1px solid rgba(154,234,98,0.15)" }}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{f.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#939da4" }}>{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom */}
        <div className="relative flex items-center gap-3">
          <p className="text-xs" style={{ color: "rgba(147,157,164,0.4)" }}>
            © {new Date().getFullYear()} {branding.display_name}
          </p>
          {branding.terms_url && <a href={branding.terms_url} target="_blank" className="text-xs" style={{ color: "rgba(147,157,164,0.4)" }}>Termos</a>}
          {branding.privacy_url && <a href={branding.privacy_url} target="_blank" className="text-xs" style={{ color: "rgba(147,157,164,0.4)" }}>Privacidade</a>}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 relative"
        style={{ background: "#ffffff" }}>

        {/* Mobile logo */}
        <div className="lg:hidden absolute top-8 left-8">
          <Link href="/" className="inline-flex items-center gap-2">
            {branding.logo_url
              // Painel claro (branco fixo) - usa a logo original (escura).
              ? <img src={branding.logo_url} alt={branding.display_name} className="h-8 w-auto" /> // eslint-disable-line @next/next/no-img-element
              : <>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cor }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm" style={{ color: "#0a0a0a" }}>{branding.display_name}</span>
                </>
            }
          </Link>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-8">
            <h1 className="text-[28px] font-extrabold tracking-[-0.03em] mb-2" style={{ color: "#0a0a0a" }}>
              Bem-vindo de volta
            </h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Entre com suas credenciais de acesso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: "#374151" }}>
                E-mail
              </Label>
              <Input id="email" name="email" type="email" autoComplete="email"
                placeholder="seu@email.com" required
                className="h-11 rounded-xl text-sm"
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  color: "#0a0a0a",
                }} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: "#374151" }}>
                  Senha
                </Label>
                <Link href="/reset" className="text-xs font-medium transition-colors"
                  style={{ color: "#9aea62" }}>
                  Esqueceu a senha?
                </Link>
              </div>
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
                  Entrando...
                </span>
              ) : "Entrar no painel"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "#9ca3af" }}>
            Não tem conta?{" "}
            <Link href="/signup" className="font-semibold transition-colors"
              style={{ color: "#0a0a0a" }}>
              Criar conta grátis
            </Link>
          </p>
        </div>

        <p className="absolute bottom-8 text-xs text-center" style={{ color: "#d1d5db" }}>
          Acesso restrito · Parabellum © 2026
        </p>
      </div>
    </div>
  );
}
