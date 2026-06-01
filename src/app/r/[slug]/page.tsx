"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Zap, Users, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ReferralPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Buscar agência pelo slug do link
    const supabase = createClient();
    supabase
      .from("agency_referral_links")
      .select("agency_id, slug, agencies(id, display_name, name, primary_color, logo_url, support_email, plan)")
      .eq("slug", slug)
      .eq("ativo", true)
      .single()
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setAgency({ ...data.agencies, link_slug: data.slug });
          // Registrar click (fire and forget)
          fetch(`/api/r/${slug}/click`, { method: "POST" }).catch(() => {});
        }
        setLoading(false);
      });
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#000" }}>
      <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#000" }}>
      <p className="text-white font-bold text-lg">Link não encontrado</p>
      <Link href="/" className="text-sm" style={{ color: "#9aea62" }}>Voltar ao início</Link>
    </div>
  );

  const cor = agency?.primary_color ?? "#9aea62";
  const nome = agency?.display_name ?? agency?.name ?? "Liberty CRM";

  return (
    <div className="min-h-screen" style={{ background: "#000", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          {agency?.logo_url
            ? <img src={agency.logo_url} alt={nome} className="h-8 w-auto" />
            : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cor }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" /></svg>
              </div>
          }
          <span className="font-bold text-white text-sm">{nome}</span>
        </div>
        <Link href={`/signup?ref=${slug}&agency=${agency?.id}`}
          className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: cor, color: "#0a0a0a" }}>
          Começar grátis
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-3xl mx-auto px-6 py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold"
          style={{ background: `${cor}15`, border: `1px solid ${cor}30`, color: cor }}>
          <Zap className="w-3.5 h-3.5" />
          30 dias grátis — sem cartão de crédito
        </div>

        <h1 className="text-4xl font-extrabold text-white mb-6 leading-tight tracking-[-0.03em]">
          O CRM que vai{" "}
          <span style={{ color: cor }}>transformar<br />sua agência</span>
        </h1>

        <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: "rgba(147,157,164,0.8)" }}>
          Pipeline visual, inbox com IA, broadcast e muito mais —
          tudo em uma plataforma criada para agências digitais.
        </p>

        <Link href={`/signup?ref=${slug}&agency=${agency?.id}`}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-opacity hover:opacity-90"
          style={{ background: cor, color: "#0a0a0a" }}>
          Criar minha conta grátis
          <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="text-xs mt-4" style={{ color: "rgba(147,157,164,0.4)" }}>
          Parceiro: {nome}{agency?.support_email ? ` · ${agency.support_email}` : ""}
        </p>
      </main>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Users, title: "Pipeline de vendas", desc: "Kanban visual com todas as etapas do seu funil" },
            { icon: MessageSquare, title: "Inbox com IA", desc: "Respostas automáticas via WhatsApp com Gemini" },
            { icon: Zap, title: "Automações", desc: "Fluxos visuais que atendem leads 24h por dia" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl p-6"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${cor}15` }}>
                <Icon className="w-5 h-5" style={{ color: cor }} />
              </div>
              <p className="text-sm font-bold text-white mb-1">{title}</p>
              <p className="text-xs" style={{ color: "#939da4" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8">
        <p className="text-xs" style={{ color: "rgba(147,157,164,0.3)" }}>
          {nome} · Powered by Liberty CRM
        </p>
      </footer>
    </div>
  );
}
