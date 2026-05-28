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

    // Verificar se é super admin
    const { data: sa } = await supabase
      .from("super_admins")
      .select("id")
      .eq("email", email)
      .single() as { data: { id: string } | null; error: unknown };

    if (!sa) {
      await supabase.auth.signOut();
      setError("Acesso não autorizado para este painel.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#000000" }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(154,234,98,0.05) 0%, transparent 70%)"
      }} />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#9aea62" }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
              </svg>
            </div>
            <span className="font-bold text-sm text-white">Liberty CRM</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold"
              style={{ background: "rgba(154,234,98,0.15)", color: "#9aea62" }}>ADMIN</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Acesso restrito</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Somente administradores autorizados</p>
        </div>

        <div className="rounded-[24px] p-8"
          style={{
            background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "#939da4" }}>E-mail</Label>
              <Input name="email" type="email" placeholder="admin@email.com" required autoComplete="email"
                className="h-11 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "#939da4" }}>Senha</Label>
              <div className="relative">
                <Input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  required autoComplete="current-password"
                  className="h-11 rounded-xl text-sm text-white pr-10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.3)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm px-3 py-2 rounded-lg"
                style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className={cn("w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center",
                loading && "opacity-60 cursor-not-allowed")}
              style={{ background: "#9aea62", color: "#0a0a0a" }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : "Entrar no painel admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
