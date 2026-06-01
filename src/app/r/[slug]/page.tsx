"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Zap, Users, MessageSquare, Bot, BarChart2, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const FEATURES = [
  { icon: Users, title: "Pipeline de vendas", desc: "Kanban visual com todas as etapas do funil. Arraste leads de uma etapa para outra em segundos." },
  { icon: MessageSquare, title: "Inbox WhatsApp com IA", desc: "Resposta automática 24h via WhatsApp. A IA atende, qualifica e transfere para humano quando necessário." },
  { icon: Bot, title: "Agentes de IA treinados", desc: "Treine o agente com o seu produto, preços e objeções. Ele vende igual ao seu melhor vendedor, sem parar." },
  { icon: Megaphone, title: "Broadcast em massa", desc: "Envie campanhas para toda a base de leads com segmentação avançada e alta taxa de entrega." },
  { icon: BarChart2, title: "Dashboard e relatórios", desc: "Acompanhe leads ativos, valor do pipeline, mensagens enviadas e performance da equipe em tempo real." },
  { icon: Zap, title: "Fluxos de automação", desc: "Configure fluxos visuais que ativam ações automáticas: boas-vindas, qualificação, follow-up e muito mais." },
];

const TESTIMONIALS = [
  { name: "Carlos M.", role: "Agência de Marketing", text: "Automatizamos 80% do atendimento. A IA qualifica os leads e só transfere quando está pronto para fechar." },
  { name: "Ana P.", role: "Infoprodutora", text: "Triplicamos o volume de atendimento sem contratar. O CRM paga sozinho no primeiro mês." },
];

export default function ReferralPage() {
  const { slug } = useParams<{ slug: string }>();
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("agency_referral_links")
      .select("agency_id, slug, agencies(id, display_name, name, primary_color, logo_url, support_email, plan)")
      .eq("slug", slug)
      .eq("ativo", true)
      .single()
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) { setNotFound(true); }
        else {
          setAgency({ ...data.agencies, link_slug: data.slug });
          fetch(`/api/r/${slug}`, { method: "POST" }).catch(() => {});
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
  const signupUrl = `/signup?ref=${slug}&agency=${agency?.id}`;

  return (
    <div style={{ background: "#000", fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif", color: "#fff" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {agency?.logo_url
              ? <img src={agency.logo_url} alt={nome} style={{ height: 28, width: "auto" }} />
              : <div style={{ width: 28, height: 28, borderRadius: 8, background: cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" /></svg>
                </div>
            }
            <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{nome}</span>
          </div>
          <Link href={signupUrl} style={{ padding: "8px 20px", borderRadius: 10, background: cor, color: "#0a0a0a", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "100px 24px 80px", textAlign: "center" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: `${cor}15`, border: `1px solid ${cor}30`, marginBottom: 32 }}>
          <Zap size={13} color={cor} />
          <span style={{ fontSize: 12, fontWeight: 700, color: cor }}>30 dias grátis · sem cartão de crédito</span>
        </div>

        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em", marginBottom: 24 }}>
          O CRM que vende enquanto<br />
          <span style={{ color: cor }}>você dorme</span>
        </h1>

        <p style={{ fontSize: 18, color: "rgba(147,157,164,0.85)", lineHeight: 1.65, marginBottom: 40, maxWidth: 580, margin: "0 auto 40px" }}>
          Pipeline visual, inbox com IA, broadcast e automações em uma plataforma feita para agências e negócios digitais.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={signupUrl} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 14, background: cor, color: "#0a0a0a", fontSize: 15, fontWeight: 800, textDecoration: "none", letterSpacing: "-0.01em" }}>
            Criar minha conta grátis <ArrowRight size={16} />
          </Link>
        </div>

        <p style={{ fontSize: 12, color: "rgba(147,157,164,0.4)", marginTop: 16 }}>
          Parceiro: {nome}{agency?.support_email ? ` · ${agency.support_email}` : ""}
        </p>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, textAlign: "center" }}>
          {[
            { value: "+2.000", label: "empresas usando" },
            { value: "80%", label: "redução no tempo de atendimento" },
            { value: "3x", label: "mais leads convertidos" },
          ].map(({ value, label }) => (
            <div key={label} style={{ padding: "24px 16px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ fontSize: 32, fontWeight: 800, color: cor, letterSpacing: "-0.03em", marginBottom: 4 }}>{value}</p>
              <p style={{ fontSize: 13, color: "rgba(147,157,164,0.7)" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
            Tudo que você precisa em um lugar só
          </h2>
          <p style={{ fontSize: 16, color: "rgba(147,157,164,0.7)", maxWidth: 500, margin: "0 auto" }}>
            Pare de pagar por 5 ferramentas diferentes. O CRM tem tudo integrado.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ padding: "28px 28px", borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${cor}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon size={20} color={cor} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{title}</p>
              <p style={{ fontSize: 13, color: "rgba(147,157,164,0.7)", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 100px" }}>
        <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.03em", textAlign: "center", marginBottom: 40 }}>
          O que nossos clientes dizem
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
          {TESTIMONIALS.map(({ name, role, text }) => (
            <div key={name} style={{ padding: "28px", borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 20 }}>"{text}"</p>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700 }}>{name}</p>
                <p style={{ fontSize: 12, color: "rgba(147,157,164,0.55)" }}>{role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 120px", textAlign: "center" }}>
        <div style={{ padding: "60px 40px", borderRadius: 24, background: `linear-gradient(135deg, ${cor}10 0%, rgba(0,0,0,0) 100%)`, border: `1px solid ${cor}20` }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 16 }}>
            Comece hoje, grátis por 30 dias
          </h2>
          <p style={{ fontSize: 15, color: "rgba(147,157,164,0.75)", marginBottom: 32 }}>
            Sem cartão de crédito. Configure em menos de 5 minutos.
          </p>
          <Link href={signupUrl} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px", borderRadius: 14, background: cor, color: "#0a0a0a", fontSize: 16, fontWeight: 800, textDecoration: "none", letterSpacing: "-0.01em" }}>
            Criar conta grátis <ArrowRight size={18} />
          </Link>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 24 }}>
            {["30 dias grátis", "Cancele quando quiser", "Suporte incluso"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={13} color={cor} />
                <span style={{ fontSize: 12, color: "rgba(147,157,164,0.6)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: "center", paddingBottom: 40, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p style={{ fontSize: 12, color: "rgba(147,157,164,0.3)", paddingTop: 32 }}>
          {nome} · Powered by Liberty CRM
        </p>
      </footer>

    </div>
  );
}
