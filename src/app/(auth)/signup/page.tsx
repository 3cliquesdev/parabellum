"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const full_name = form.get("full_name") as string;
    const company_name = form.get("company_name") as string;

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, company_name } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "rgba(154,234,98,0.04)" }} />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: "rgba(154,234,98,0.03)" }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "#9aea62" }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white">Liberty CRM</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Criar sua conta</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>30 dias grátis, sem cartão de crédito</p>
        </div>

        <div className="card-dark rounded-[24px] p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-sm" style={{ color: "#939da4" }}>Nome completo</Label>
              <Input id="full_name" name="full_name" type="text" placeholder="Seu nome" required
                className="h-11 rounded-xl text-white placeholder:text-white/20"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company_name" className="text-sm" style={{ color: "#939da4" }}>Nome da empresa</Label>
              <Input id="company_name" name="company_name" type="text" placeholder="Sua agência" required
                className="h-11 rounded-xl text-white placeholder:text-white/20"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm" style={{ color: "#939da4" }}>E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="seu@email.com" required
                className="h-11 rounded-xl text-white placeholder:text-white/20"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm" style={{ color: "#939da4" }}>Senha</Label>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres" required minLength={8}
                  className="h-11 rounded-xl text-white placeholder:text-white/20 pr-10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className={cn("btn-lime w-full h-11 rounded-xl text-sm flex items-center justify-center mt-2",
                loading && "opacity-60 cursor-not-allowed")}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Criando conta...
                </span>
              ) : "Criar conta grátis"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "rgba(147,157,164,0.6)" }}>
            Já tem conta?{" "}
            <Link href="/login" className="font-medium" style={{ color: "#9aea62" }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
