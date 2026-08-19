"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Invite = { valid: boolean; email?: string; tenant_name?: string };

function SignupForm() {
  const router = useRouter();
  const token = useSearchParams().get("invite") ?? "";
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setInvite({ valid: false }); return; }
    fetch(`/api/team/accept?token=${encodeURIComponent(token)}`).then(r => r.json()).then(setInvite).catch(() => setInvite({ valid: false }));
  }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invite?.valid || !invite.email) return;
    setLoading(true); setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/team/register-invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name: String(form.get("full_name") ?? ""), password: String(form.get("password") ?? "") }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error ?? "Nao foi possivel criar o acesso."); setLoading(false); return; }
    router.push("/login");
  }

  if (!invite) return <main className="min-h-screen grid place-items-center bg-white">Validando convite...</main>;
  if (!invite.valid) return <main className="min-h-screen grid place-items-center bg-white p-6"><section className="max-w-md text-center"><h1 className="text-xl font-bold text-slate-900">Convite inválido ou expirado</h1><p className="mt-3 text-sm text-slate-600">Peça um novo convite ao administrador.</p><Link className="mt-5 inline-block font-semibold" href="/login">Entrar</Link></section></main>;

  const labelStyle = { color: "#374151" };
  const inputStyle = { background: "#ffffff", border: "1px solid #d1d5db", color: "#111827" };
  return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><p className="text-sm font-bold text-emerald-600">Convite para {invite.tenant_name}</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Crie sua senha de acesso</h1><p className="mt-2 text-sm text-slate-600">Você entrará como membro da equipe, sem criar agência ou empresa.</p><form onSubmit={submit} className="mt-7 space-y-4"><div><Label htmlFor="full_name" style={labelStyle}>Nome</Label><Input id="full_name" name="full_name" required autoComplete="name" placeholder="Seu nome" className="mt-1" style={inputStyle} /></div><div><Label htmlFor="email" style={labelStyle}>E-mail do convite</Label><Input id="email" value={invite.email ?? ""} readOnly className="mt-1" style={{ ...inputStyle, background: "#f3f4f6", color: "#4b5563" }} /></div><div><Label htmlFor="password" style={labelStyle}>Crie sua senha</Label><Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="mt-1" style={inputStyle} /></div>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="h-11 w-full rounded-xl bg-slate-950 text-sm font-bold text-white disabled:opacity-60">{loading ? "Criando..." : "Criar senha"}</button></form><p className="mt-5 text-center text-sm text-slate-500">Já possui uma conta? <Link href={`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`} className="font-semibold text-slate-900">Entrar</Link></p></section></main>;
}

export default function SignupPage() { return <Suspense fallback={<main className="min-h-screen bg-white" />}><SignupForm /></Suspense>; }
