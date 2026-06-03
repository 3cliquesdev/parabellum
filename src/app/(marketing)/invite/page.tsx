"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function InviteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [state, setState] = useState<"loading" | "valid" | "invalid" | "accepting" | "done">("loading");
  const [invite, setInvite] = useState<{ email: string; role: string; tenant_name: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!token) {
        if (!cancelled) {
          setState("invalid");
        }
        return;
      }

      void (async () => {
        const res = await fetch(`/api/team/accept?token=${token}`);
        const data = await res.json();
        if (cancelled) return;

        if (!data.valid) {
          setState("invalid");
          return;
        }

        setInvite(data);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        setIsLoggedIn(!!user);
        setState("valid");
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function accept() {
    setState("accepting");
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (data.success) {
      setState("done");
      setTimeout(() => router.push("/dashboard"), 2000);
    } else {
      setState("invalid");
    }
  }

  const ROLE_LABEL: Record<string, string> = { admin: "Administrador", member: "Membro" };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#000000", fontFamily: "var(--font-sans)" }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(154,234,98,0.05) 0%, transparent 70%)",
      }} />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#9aea62" }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
              </svg>
            </div>
            <span className="font-bold text-sm text-white">Liberty CRM</span>
          </Link>
        </div>

        <div className="rounded-[24px] p-8" style={{
          background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          {state === "loading" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#9aea62" }} />
              <p className="text-sm" style={{ color: "#939da4" }}>Validando convite...</p>
            </div>
          )}

          {state === "invalid" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <AlertCircle className="w-10 h-10" style={{ color: "#f87171" }} />
              <div>
                <h2 className="text-base font-bold text-white mb-1">Convite inválido</h2>
                <p className="text-sm" style={{ color: "#939da4" }}>Este link expirou ou já foi utilizado.</p>
              </div>
              <Link href="/" className="text-sm font-medium" style={{ color: "#9aea62" }}>Voltar ao início</Link>
            </div>
          )}

          {state === "done" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="w-10 h-10" style={{ color: "#9aea62" }} />
              <div>
                <h2 className="text-base font-bold text-white mb-1">Bem-vindo!</h2>
                <p className="text-sm" style={{ color: "#939da4" }}>Você entrou no workspace. Redirecionando...</p>
              </div>
            </div>
          )}

          {state === "accepting" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#9aea62" }} />
              <p className="text-sm" style={{ color: "#939da4" }}>Entrando no workspace...</p>
            </div>
          )}

          {state === "valid" && invite && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-white tracking-[-0.02em] mb-1">
                  Você foi convidado!
                </h2>
                <p className="text-sm" style={{ color: "#939da4" }}>
                  Para entrar no workspace de
                </p>
                <p className="text-base font-bold mt-1" style={{ color: "#9aea62" }}>{invite.tenant_name}</p>
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#939da4" }}>E-mail</span>
                  <span className="text-xs font-medium text-white">{invite.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#939da4" }}>Função</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                    {ROLE_LABEL[invite.role] ?? invite.role}
                  </span>
                </div>
              </div>

              {isLoggedIn ? (
                <button onClick={accept} className="w-full h-11 rounded-xl text-sm font-bold"
                  style={{ background: "#9aea62", color: "#0a0a0a" }}>
                  Entrar no workspace
                </button>
              ) : (
                <div className="space-y-3">
                  <Link href={`/signup?invite=${token}&email=${encodeURIComponent(invite.email)}`}
                    className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center"
                    style={{ background: "#9aea62", color: "#0a0a0a" }}>
                    Criar conta e entrar
                  </Link>
                  <Link href={`/login?invite=${token}`}
                    className="w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
                    Já tenho conta — fazer login
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#000" }} />}>
      <InviteContent />
    </Suspense>
  );
}
