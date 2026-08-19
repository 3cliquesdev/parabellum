"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPage() {
  const router = useRouter();
  const [recovery, setRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setRecovery(Boolean(data.session)));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function sendReset(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
    setLoading(false);
    setMessage(error ? error.message : "Se esse e-mail possui conta, enviamos um link para criar uma nova senha.");
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) { setMessage(error.message); setLoading(false); return; }
    router.push("/login");
  }

  return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold text-slate-900">{recovery ? "Crie uma nova senha" : "Recuperar senha"}</h1><p className="mt-2 text-sm text-slate-600">{recovery ? "Defina uma senha nova para acessar sua conta." : "Informe seu e-mail para receber o link de recuperação."}</p><form onSubmit={recovery ? updatePassword : sendReset} className="mt-6 space-y-4">{recovery ? <div><Label htmlFor="password">Nova senha</Label><Input id="password" type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="mt-1" style={{ border: "1px solid #d1d5db", color: "#111827" }} /></div> : <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="mt-1" style={{ border: "1px solid #d1d5db", color: "#111827" }} /></div>}{message && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}<button disabled={loading} className="h-11 w-full rounded-xl bg-slate-950 text-sm font-bold text-white disabled:opacity-60">{loading ? "Aguarde..." : recovery ? "Salvar nova senha" : "Enviar link de recuperação"}</button></form><p className="mt-5 text-center text-sm text-slate-500"><Link href="/login" className="font-semibold text-slate-900">Voltar para entrar</Link></p></section></main>;
}
