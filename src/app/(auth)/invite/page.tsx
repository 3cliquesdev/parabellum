"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Invite = { valid: boolean; email?: string; role?: string; tenant_name?: string };

const ROLE_LABEL: Record<string, string> = { owner: "Proprietário", gerente: "Gerente", vendedor: "Vendedor", atendente: "Atendente" };

function InvitePageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setInvite({ valid: false }); return; }
    fetch(`/api/team/accept?token=${encodeURIComponent(token)}`)
      .then(response => response.json())
      .then(setInvite)
      .catch(() => setInvite({ valid: false }));
  }, [token]);

  async function accept() {
    setLoading(true); setMessage(null);
    const response = await fetch("/api/team/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.push(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`);
      return;
    }
    if (!response.ok) { setMessage(data.error ?? "Não foi possível aceitar o convite."); setLoading(false); return; }
    router.push("/dashboard"); router.refresh();
  }

  if (!invite) return <main className="min-h-screen grid place-items-center bg-white text-slate-700">Validando convite...</main>;
  if (!invite.valid) return <main className="min-h-screen grid place-items-center bg-white p-6"><section className="w-full max-w-md rounded-2xl border border-slate-200 p-8 text-center"><h1 className="text-xl font-bold text-slate-900">Convite inválido ou expirado</h1><p className="mt-3 text-sm text-slate-600">Peça um novo convite ao administrador da equipe.</p><Link href="/login" className="mt-6 inline-block text-sm font-semibold text-slate-900">Ir para entrar</Link></section></main>;

  return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200"><p className="text-sm font-semibold text-emerald-600">Convite para a equipe</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Você foi convidado para {invite.tenant_name}</h1><p className="mt-3 text-sm text-slate-600">E-mail: <strong>{invite.email}</strong><br />Cargo: <strong>{ROLE_LABEL[invite.role ?? ""] ?? invite.role}</strong></p>{message && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}<Link href={`/signup?invite=${encodeURIComponent(token)}`} className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">Criar minha senha</Link><p className="mt-5 text-center text-sm text-slate-500">Já tem conta? <button onClick={accept} disabled={loading} className="font-semibold text-slate-900">Entrar e aceitar</button></p></section></main>;
}

export default function InvitePage() {
  return <Suspense fallback={<main className="min-h-screen bg-white" />}><InvitePageInner /></Suspense>;
}
