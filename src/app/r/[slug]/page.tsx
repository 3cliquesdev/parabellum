"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, ArrowRight, Zap, Users, MessageSquare, Bot,
  BarChart2, Megaphone, Workflow, Layers, Plus, Minus,
  ShieldCheck, Clock, Target, Repeat, Eye, CreditCard,
  Send, X
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Refined Neutral Tokens (80% neutral, 15% soft, 5% strong) ───
const BG = "#F8FAFC";
const BG2 = "#F1F5F9";
const BG3 = "#E8EEF4";
const CARD = "#FFFFFF";
const BORDER = "#E2E8F0";
const CARD_BORDER = "#E9EDF2";
const TEXT = "#0F172A";
const TEXT_SEC = "#475569";
const TEXT_MUT = "#94A3B8";
const BLUE = "#2563EB";        // destaque forte — uso mínimo
const BLUE_SOFT = "#DBEAFE";   // fundo suave
const SLATE = "#64748B";       // ícones neutros
const GREEN = "#22C55E";
// Gradiente: APENAS em H1 hero e CTA final (2 usos máximo)
const GRAD = "linear-gradient(90deg, #06B6D4 0%, #2563EB 100%)";
const CTA_GRAD = "linear-gradient(135deg, #06B6D4, #2563EB)";

// Sombras
const CARD_SHADOW = "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)";
const CARD_HOVER = "0 4px 20px rgba(15,23,42,0.09), 0 1px 4px rgba(15,23,42,0.04)";
const MOCK_SHADOW = "0 20px 60px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.07)";
const CARD_TRANSITION = "transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s cubic-bezier(0.4,0,0.2,1), border-color 0.2s ease";

// Internal dark tokens — mockup components only
const M_WHITE = "#F8FAFC";
const M_MUTED = "#A1A1AA";
const M_LIGHT = "#CBD5E1";
const M_BORDER = "rgba(255,255,255,0.10)";

const fade = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true as const }, transition: { duration: 0.6 } };
const fadeF = (delay: number) => ({ ...fade, transition: { duration: 0.6, delay } });
// Premium cinematic reveal — ease-out-expo, scale + lift (frontend-design skill)
const premiumReveal = (delay = 0) => ({
  initial: { opacity: 0, y: 40, scale: 0.97 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true as const },
  transition: { duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] as const },
});

// ─── Section Label — neutral, not colorful ───
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: TEXT_MUT, textTransform: "uppercase", marginBottom: 12 }}>
      {children}
    </p>
  );
}

// ─── Animated Number — countUp on scroll ───
function AnimatedNumber({ value, color }: { value: string; color: string }) {
  const numeric = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
  const suffix = value.replace(/[0-9.,\s]/g, "").trim();
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (started || numeric === 0) return;
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        setStarted(true);
        const dur = 1400;
        const fps = 60;
        const frames = (dur / 1000) * fps;
        let frame = 0;
        const tick = () => {
          frame++;
          const progress = 1 - Math.pow(1 - frame / frames, 4); // ease-out-quart
          setDisplay(numeric * Math.min(progress, 1));
          if (frame < frames) requestAnimationFrame(tick);
          else setDisplay(numeric);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [numeric, started]);

  const formatted = numeric >= 1000
    ? Math.round(display).toLocaleString("pt-BR")
    : display < 1 ? display.toFixed(0)
    : Math.round(display).toString();

  return (
    <p ref={ref} className="text-xl font-black leading-tight" style={{ color }}>
      {formatted}{suffix}
    </p>
  );
}

// ─── Icon Box — neutral ───
function IconBox({ icon: Icon, color = SLATE, size = 17 }: { icon: any; color?: string; size?: number }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 12,
      background: BG2, border: `1px solid ${CARD_BORDER}`,
      boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: 16, flexShrink: 0,
    }}>
      <Icon size={size} style={{ color }} />
    </div>
  );
}

// ─── Hero Mockup — imagem real do produto ───
function HeroMockup({ cor, nome }: { cor: string; nome: string }) {
  return (
    <div className="relative w-full max-w-[780px]">
      <div style={{ background: "#FFFFFF", borderRadius: 28, padding: 6, border: "1px solid #E9EDF2", boxShadow: "0 20px 60px rgba(15,23,42,0.14), 0 4px 16px rgba(15,23,42,0.07)" }}>
        <div style={{ transform: "perspective(1800px) rotateX(3deg) rotateY(-1deg)" }}>
          <div className="rounded-[22px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/sales/hero-dashboard.png" alt="Dashboard CRM em tempo real"
              style={{ display: "block", width: "100%", height: "auto" }} />
          </div>
        </div>
      </div>

      {/* 5 Floating Cards — white, neutral */}
      {[
        { pos: "absolute -top-5 -right-4", label: "IA respondeu", value: "1.247", sub: "mensagens este mês", delay: 0, dy: [-9, 0] },
        { pos: "absolute -bottom-4 -left-4", label: "Oportunidades", value: "67", sub: "abertas no pipeline", delay: 0.8, dy: [9, 0] },
        { pos: "absolute -top-5 -left-4 hidden lg:block", label: "Taxa de conversão", value: "38%", sub: "acima da média", delay: 1.5, dy: [-7, 0] },
        { pos: "absolute -bottom-4 -right-4 hidden lg:block", label: "Follow-up auto.", value: undefined, sub: "● ativo 24h", delay: 2.2, dy: [8, 0] },
        { pos: "absolute top-1/2 -right-4 -translate-y-1/2 hidden xl:block", label: "Lead qualificado", value: undefined, sub: "pelo WhatsApp agora", delay: 3, dy: [-8, 0] },
      ].map(({ pos, label, value, sub, delay, dy }) => (
        <motion.div key={label} animate={{ y: [dy[0], dy[1], dy[0]] }} transition={{ duration: 3.5 + delay * 0.3, repeat: Infinity, delay }}
          className={`${pos} rounded-2xl px-3 py-2.5`}
          style={{ background: "rgba(255,255,255,0.97)", border: `1px solid ${CARD_BORDER}`, backdropFilter: "blur(12px)", boxShadow: CARD_HOVER }}>
          <p className="text-[9px] font-medium" style={{ color: TEXT_MUT }}>{label}</p>
          {value && <AnimatedNumber value={value} color={BLUE} />}
          <p className="text-[9px] font-medium" style={{ color: value ? TEXT_MUT : BLUE }}>{sub}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Product Theatre Mockup — imagem real ───
function ProductTheatreMockup({ cor, nome }: { cor: string; nome: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/images/sales/product-theatre.png" alt="CRM trabalhando em tempo real"
      style={{ display: "block", width: "100%", height: "auto", borderRadius: 22 }} loading="lazy" />
  );
}

// ─── Broadcast Mockup — imagem real ───
function BroadcastMockup({ cor }: { cor: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/images/sales/broadcast-metrics.png" alt="Painel de campanhas e métricas"
      style={{ display: "block", width: "100%", height: "auto", borderRadius: 20 }} loading="lazy" />
  );
}

// ─── FAQ Accordion ───
const FAQ_ITEMS = [
  { q: "O CRM funciona com WhatsApp?", a: "Sim. Centralize conversas do WhatsApp e organize atendimentos, leads e oportunidades em um único painel." },
  { q: "A IA responde meus clientes?", a: "Sim. A IA é treinada com informações do seu negócio para responder dúvidas, qualificar leads e ajudar no atendimento automático." },
  { q: "Preciso saber configurar automações?", a: "Não. A plataforma foi pensada para ser simples. Comece com o básico e evolua os fluxos conforme precisar." },
  { q: "Posso testar antes de pagar?", a: "Sim. Você começa com 30 dias grátis, sem cartão de crédito." },
  { q: "Consigo acompanhar minha equipe?", a: "Sim. O dashboard permite acompanhar leads, conversas, pipeline e performance de cada membro." },
  { q: "Posso enviar campanhas para minha base?", a: "Sim. Com o broadcast, crie campanhas para leads e clientes com segmentação avançada." },
  { q: "Funciona para minha área?", a: "Sim. O CRM se adapta para agências, clínicas, imobiliárias, e-commerces, infoprodutores e qualquer negócio que vende pelo WhatsApp." },
];

function FAQAccordion({ cor }: { cor: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map(({ q, a }, i) => (
        <div key={i} className="rounded-2xl overflow-hidden"
          style={{ background: open === i ? BLUE_SOFT : CARD, border: open === i ? `1px solid #BFDBFE` : `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW, transition: CARD_TRANSITION }}>
          <button className="w-full flex items-center justify-between px-6 py-4 text-left" onClick={() => setOpen(open === i ? null : i)}>
            <span className="text-sm font-semibold" style={{ color: TEXT }}>{q}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-4" style={{ background: open === i ? "#BFDBFE" : BG3 }}>
              {open === i ? <Minus size={12} style={{ color: BLUE }} /> : <Plus size={12} style={{ color: TEXT_MUT }} />}
            </div>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: TEXT_SEC }}>{a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───
export default function ReferralPage() {
  const { slug } = useParams<{ slug: string }>();
  const [agency, setAgency] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("agency_referral_links")
      .select("agency_id, slug, agencies(id, display_name, name, primary_color, logo_url, support_email)")
      .eq("slug", slug).eq("ativo", true).single()
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        const ag = { ...data.agencies, link_slug: data.slug };
        setAgency(ag);
        if (ag.id) {
          fetch(`/api/agency/client-plans?agency_id=${ag.id}`)
            .then(r => r.json()).then(d => setPlans(d.plans ?? [])).catch(() => {});
        }
        fetch(`/api/r/${slug}`, { method: "POST" }).catch(() => {});
        setLoading(false);
      });
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: BORDER, borderTopColor: BLUE }} />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
      <p className="font-bold text-lg" style={{ color: TEXT }}>Link não encontrado</p>
      <Link href="/" className="text-sm font-medium" style={{ color: BLUE }}>Voltar ao início</Link>
    </div>
  );

  const cor = agency?.primary_color ?? "#2563EB";
  const nome = agency?.display_name ?? agency?.name ?? "CRM";
  const agId = agency?.id ?? "";
  const signupUrl = `/signup?ref=${slug}&agency=${agId}`;
  const CYCLE_LABEL: Record<string, string> = { mensal: "/mês", trimestral: "/trim.", semestral: "/sem.", anual: "/ano" };
  const middleIdx = Math.floor(plans.length / 2);

  const PrimaryBtn = ({ href, children, large = false }: { href: string; children: React.ReactNode; large?: boolean }) => (
    <Link href={href} style={{
      display: "inline-flex", alignItems: "center", gap: large ? 12 : 10,
      padding: large ? "14px 32px" : "11px 22px",
      borderRadius: large ? 16 : 12,
      background: CTA_GRAD, color: "#fff",
      fontSize: large ? 16 : 14, fontWeight: 700,
      textDecoration: "none", letterSpacing: "-0.01em",
      boxShadow: "0 4px 14px rgba(37,99,235,0.22)",
      transition: CARD_TRANSITION,
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(37,99,235,0.30)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(37,99,235,0.22)"; }}>
      {children}
    </Link>
  );

  return (
    <main style={{ background: BG, color: TEXT, fontFamily: "var(--font-sans), -apple-system, system-ui, sans-serif", overflowX: "hidden", scrollBehavior: "smooth" }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: `1px solid ${scrolled ? BORDER : "transparent"}`,
        background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(248,250,252,0.92)",
        backdropFilter: "blur(20px)",
        boxShadow: scrolled ? "0 1px 10px rgba(15,23,42,0.06)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {agency?.logo_url
              ? <img src={agency.logo_url} alt={nome} style={{ height: 32, width: "auto", maxWidth: 160 }} />
              : <>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" /></svg>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 15, color: TEXT, letterSpacing: "-0.02em" }}>{nome}</span>
                </>
            }
          </div>
          <div className="hidden md:flex items-center gap-7">
            {[{ label: "Funcionalidades", href: "#funcionalidades" }, { label: "IA", href: "#ia" }, { label: "Planos", href: "#planos" }, { label: "FAQ", href: "#faq" }].map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC, textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                onMouseLeave={e => (e.currentTarget.style.color = TEXT_SEC)}>
                {l.label}
              </a>
            ))}
          </div>
          <PrimaryBtn href={signupUrl}>Começar grátis</PrimaryBtn>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center px-6 pt-8 pb-20" style={{ background: BG }}>
        {/* Gradient mesh premium — cria profundidade sem poluir */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `
          radial-gradient(ellipse 800px 600px at 70% -10%, rgba(37,99,235,0.06), transparent),
          radial-gradient(ellipse 600px 400px at 100% 50%, rgba(6,182,212,0.04), transparent),
          radial-gradient(ellipse 700px 500px at 0% 80%, rgba(37,99,235,0.05), transparent),
          radial-gradient(ellipse 400px 300px at 50% 50%, rgba(6,182,212,0.03), transparent)
        ` }} />
        <div className="relative max-w-[1260px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div {...fade}>
            {/* Badge neutro */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-medium"
              style={{ background: BG2, border: `1px solid ${CARD_BORDER}`, color: TEXT_MUT }}>
              <Zap size={11} style={{ color: TEXT_MUT }} /> 30 dias grátis • sem cartão de crédito
            </div>
            <h1 className="font-black leading-[1.0] mb-5"
              style={{ fontSize: "clamp(40px, 5vw, 80px)", color: TEXT, letterSpacing: "-0.05em" }}>
              O CRM que vende{" "}
              <span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                enquanto você dorme
              </span>
            </h1>
            <p className="text-xl mb-8 leading-relaxed" style={{ color: TEXT_SEC, maxWidth: 520 }}>
              Centralize atendimento, pipeline, automações e campanhas em uma plataforma simples e feita para negócios que vendem pelo WhatsApp.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <motion.div
                animate={{ boxShadow: ["0 4px 14px rgba(37,99,235,0.22)", "0 4px 32px rgba(37,99,235,0.42)", "0 4px 14px rgba(37,99,235,0.22)"] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ borderRadius: 16, display: "inline-flex" }}>
                <PrimaryBtn href={signupUrl} large>Criar minha conta grátis <ArrowRight size={18} /></PrimaryBtn>
              </motion.div>
              <a href="#funcionalidades" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
                style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, color: TEXT_SEC, textDecoration: "none", boxShadow: CARD_SHADOW }}>
                Ver como funciona
              </a>
            </div>
            <p style={{ fontSize: 12, color: TEXT_MUT }}>Sem cartão de crédito • Configure em minutos • Cancele quando quiser</p>
          </motion.div>
          <motion.div {...premiumReveal(0.15)} className="flex justify-center lg:justify-end">
            <HeroMockup cor={cor} nome={nome} />
          </motion.div>
        </div>
      </section>

      {/* ── PROVA RÁPIDA ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: BG2 }}>
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-8">
          {[{ icon: Megaphone, label: "Pipeline visual" }, { icon: MessageSquare, label: "WhatsApp com IA" }, { icon: Workflow, label: "Fluxos automáticos" }, { icon: BarChart2, label: "Dashboard em tempo real" }, { icon: Bot, label: "IA 24h" }, { icon: Send, label: "Broadcast em massa" }].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={15} style={{ color: SLATE }} />
              <span className="text-sm font-medium" style={{ color: TEXT_MUT }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROBLEMA ── */}
      <section className="py-32 px-6" style={{ background: BG }}>
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <SectionLabel>O PROBLEMA</SectionLabel>
            <h2 className="font-extrabold leading-[1.1]" style={{ fontSize: "clamp(32px, 4vw, 52px)", color: TEXT, letterSpacing: "-0.04em" }}>
              Seu WhatsApp não foi feito para{" "}
              <span style={{ color: TEXT_MUT }}>gerenciar vendas</span>
            </h2>
            <p className="text-lg mt-4 max-w-xl mx-auto" style={{ color: TEXT_SEC }}>
              Quando tudo fica espalhado em conversas, planilhas e lembretes manuais, oportunidades começam a escapar.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Users, title: "Leads perdidos", desc: "Conversas somem no meio do atendimento e ninguém sabe quem respondeu o quê." },
              { icon: Clock, title: "Follow-up esquecido", desc: "Clientes interessados esfriam porque ninguém voltou no momento certo." },
              { icon: Eye, title: "Equipe desorganizada", desc: "Cada vendedor atende de um jeito e a gestão perde visibilidade da operação." },
              { icon: Target, title: "Sem visão do funil", desc: "Você não sabe quantos leads entraram, avançaram ou fecharam." },
              { icon: Zap, title: "Atendimento lento", desc: "Clientes esperam respostas simples que poderiam ser automatizadas." },
              { icon: Megaphone, title: "Campanhas manuais", desc: "Fica difícil reativar leads e vender novamente para a base." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fadeF(i * 0.07)} className="rounded-[20px] p-6"
                style={{ background: "#FFFBFB", border: "1px solid #FECDD3", boxShadow: "0 1px 3px rgba(239,68,68,0.05)", transition: CARD_TRANSITION }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 6px 18px rgba(239,68,68,0.09)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = "0 1px 3px rgba(239,68,68,0.05)"; }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECDD3", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon size={17} style={{ color: "#F87171" }} />
                </div>
                <p className="text-sm font-bold mb-1.5" style={{ color: TEXT }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: TEXT_SEC }}>{desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div {...fade} className="text-center mt-10">
            <p className="text-lg font-semibold" style={{ color: TEXT_SEC }}>
              O problema não é falta de lead.{" "}
              <strong style={{ color: TEXT }}>É falta de operação.</strong>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── VIRADA ── */}
      <section className="py-20 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <motion.div {...fade} className="relative max-w-[800px] mx-auto text-center">
          <h2 className="font-extrabold leading-[1.05]" style={{ fontSize: "clamp(32px, 4.5vw, 60px)", color: TEXT, letterSpacing: "-0.04em" }}>
            Pare de improvisar atendimento.{" "}
            <span style={{ color: BLUE }}>Comece a operar vendas.</span>
          </h2>
          <p className="text-lg mt-6 leading-relaxed" style={{ color: TEXT_SEC }}>
            Com <strong style={{ color: TEXT }}>{nome}</strong>, seu WhatsApp deixa de ser apenas um canal de conversa e passa a funcionar como uma operação comercial completa.
          </p>
        </motion.div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-32 px-6" style={{ background: BG }}>
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <SectionLabel>FUNCIONALIDADES</SectionLabel>
            <h2 className="font-extrabold leading-[1.1]" style={{ fontSize: "clamp(32px, 4vw, 52px)", color: TEXT, letterSpacing: "-0.04em" }}>
              Tudo que você precisa{" "}
              <span style={{ color: BLUE }}>em um lugar só</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Users, title: "Pipeline de vendas", desc: "Visualize o funil em kanban e acompanhe oportunidades do primeiro contato até o fechamento.",
                mini: (
                  <div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
                    <div className="px-3 py-2 grid grid-cols-4 gap-1.5" style={{ background: BG2 }}>
                      {[{ l: "Novo", c: "#3B82F6", n: "2" }, { l: "Prop.", c: "#EAB308", n: "1" }, { l: "Negoc.", c: "#F97316", n: "1" }, { l: "Ganho", c: "#22C55E", n: "3" }].map(col => (
                        <div key={col.l} className="text-center py-1.5 rounded-lg" style={{ background: `${col.c}10`, border: `1px solid ${col.c}15` }}>
                          <p className="text-xs font-black" style={{ color: col.c }}>{col.n}</p>
                          <p className="text-[8px]" style={{ color: TEXT_MUT }}>{col.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                icon: MessageSquare, title: "Inbox WhatsApp com IA", desc: "Centralize conversas com IA respondendo dúvidas e transferindo para humano quando necessário.",
                mini: (
                  <div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
                    <div className="px-2.5 py-1.5 flex items-center gap-1.5" style={{ background: BG2, borderBottom: `1px solid ${CARD_BORDER}` }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} />
                      <span className="text-[9px] font-medium" style={{ color: TEXT_MUT }}>IA ativa</span>
                    </div>
                    <div className="p-2.5 space-y-1.5" style={{ background: "#0A1020" }}>
                      <div className="flex justify-end"><div className="px-2 py-1 rounded-lg text-[9px]" style={{ background: "#1E3A2F", color: "#86EFAC" }}>Qual o preço?</div></div>
                      <div className="px-2 py-1 rounded-lg text-[9px]" style={{ background: `${cor}10`, color: cor }}>O plano Pro inclui IA…</div>
                    </div>
                  </div>
                ),
              },
              {
                icon: Bot, title: "Agente de IA treinado", desc: "Treine a IA com seus produtos, preços e objeções para responder com precisão 24h por dia.",
                mini: (
                  <div className="mt-3 rounded-xl p-3 space-y-1.5" style={{ background: BG2, border: `1px solid ${CARD_BORDER}` }}>
                    <p className="text-[9px] font-medium" style={{ color: TEXT_MUT }}>Base consultada:</p>
                    <div className="flex flex-wrap gap-1">
                      {["PDF", "Site", "Preços"].map(f => <span key={f} className="px-2 py-0.5 rounded-md text-[8px] font-medium" style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, color: TEXT_SEC }}>{f}</span>)}
                    </div>
                    <p className="text-[9px]" style={{ color: TEXT_MUT }}>→ "O plano inclui automação…"</p>
                  </div>
                ),
              },
              {
                icon: Megaphone, title: "Broadcast em massa", desc: "Envie campanhas para sua base sem processos manuais e com alta taxa de entrega.",
                mini: (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[9px] px-2 py-1 rounded-lg font-medium" style={{ background: BG2, color: TEXT_SEC, border: `1px solid ${CARD_BORDER}` }}>1.248 enviados</div>
                      <div className="text-[9px] px-2 py-1 rounded-lg font-medium" style={{ background: "#DCFCE7", color: "#16A34A" }}>87% entregues</div>
                    </div>
                    <p className="text-[9px] font-medium" style={{ color: GREEN }}>R$8.240 em oportunidades</p>
                  </div>
                ),
              },
              {
                icon: Workflow, title: "Fluxos automáticos", desc: "Crie automações de boas-vindas, qualificação, follow-up e transferência sem código.",
                mini: (
                  <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {["Lead", "IA", "Fecha", "Follow"].map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className="px-2 py-0.5 rounded-full text-[8px] font-medium" style={{ background: BG2, color: TEXT_SEC, border: `1px solid ${CARD_BORDER}` }}>{s}</div>
                        {i < 3 && <div style={{ width: 8, height: 1, background: BORDER }} />}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: BarChart2, title: "Dashboard e relatórios", desc: "Acompanhe leads, mensagens, vendas e performance em tempo real.",
                mini: (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      {[{ v: "248", l: "leads", c: BLUE }, { v: "34%", l: "conv.", c: GREEN }, { v: "1.2k", l: "msgs", c: "#64748B" }].map(m => (
                        <div key={m.l} className="flex-1 rounded-lg p-1.5 text-center" style={{ background: BG2, border: `1px solid ${CARD_BORDER}` }}>
                          <p className="text-[10px] font-extrabold leading-none" style={{ color: m.c }}>{m.v}</p>
                          <p className="text-[8px]" style={{ color: TEXT_MUT }}>{m.l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-end gap-0.5 h-6 rounded overflow-hidden" style={{ background: BG3, padding: "3px 4px" }}>
                      {[30, 45, 60, 48, 75, 85, 100].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 6 ? BLUE : `${BLUE}15` }} />
                      ))}
                    </div>
                  </div>
                ),
              },
            ].map(({ icon: Icon, title, desc, mini }, i) => (
              <motion.div key={title} {...fadeF(i * 0.08)} className="rounded-[20px] p-6 flex flex-col cursor-default"
                style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW, transition: CARD_TRANSITION }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = CARD_HOVER; el.style.borderColor = SLATE_LIGHT; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = CARD_SHADOW; el.style.borderColor = CARD_BORDER; }}>
                <IconBox icon={Icon} color={SLATE} />
                <p className="text-sm font-bold mb-1.5" style={{ color: TEXT }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: TEXT_SEC }}>{desc}</p>
                {mini}
              </motion.div>
            ))}
          </div>

          {/* Showcase — painel completo de funcionalidades */}
          <motion.div {...fadeF(0.2)} className="mt-14">
            <div style={{ background: "#FFFFFF", borderRadius: 24, padding: 6, border: "1px solid #E9EDF2", boxShadow: "0 20px 60px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/sales/features-panel.png" alt="Painel completo de funcionalidades do CRM"
                style={{ display: "block", width: "100%", height: "auto", borderRadius: 20 }} loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── BROADCAST ── */}
      <section className="py-32 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div {...fade}>
            <SectionLabel>BROADCAST</SectionLabel>
            <h2 className="font-extrabold leading-[1.05] mb-6" style={{ fontSize: "clamp(28px, 3.5vw, 48px)", color: TEXT, letterSpacing: "-0.04em" }}>
              Venda de novo para quem{" "}
              <span style={{ color: BLUE }}>já falou com você</span>
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: TEXT_SEC }}>
              Sua base de leads e clientes é ouro parado. Com broadcast, crie campanhas segmentadas para reativar contatos, anunciar lançamentos e gerar vendas recorrentes.
            </p>
            <div className="space-y-3">
              {["Segmente por comportamento, tag ou período", "Personalize a mensagem com o nome do contato", "Acompanhe abertura, resposta e oportunidades em tempo real", "Programe o envio para o melhor horário"].map(b => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle size={15} style={{ color: BLUE, marginTop: 2, flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: TEXT_SEC }}>{b}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...premiumReveal(0.15)}>
            <div style={{ background: CARD, borderRadius: 24, padding: 4, boxShadow: MOCK_SHADOW, border: `1px solid ${CARD_BORDER}` }}>
              <BroadcastMockup cor={cor} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PRODUCT THEATRE ── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: BG }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(37,99,235,0.03), transparent 70%)` }} />
        <div className="relative max-w-[1200px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <SectionLabel>PRODUTO</SectionLabel>
            <h2 className="font-extrabold leading-[1.1]" style={{ fontSize: "clamp(32px, 4vw, 52px)", color: TEXT, letterSpacing: "-0.04em" }}>
              Veja o CRM{" "}
              <span style={{ color: BLUE }}>trabalhando por você</span>
            </h2>
            <p className="text-lg mt-4" style={{ color: TEXT_SEC }}>É assim que sua operação fica com {nome}</p>
          </motion.div>
          <motion.div {...premiumReveal(0.15)}>
            <div className="relative">
              <div style={{ background: "#FFFFFF", borderRadius: 30, padding: 14, border: "1px solid #E2E8F0", boxShadow: "0 30px 90px rgba(15,23,42,0.18)" }}>
                <ProductTheatreMockup cor={cor} nome={nome} />
              </div>
              {[
                { pos: "absolute -top-4 -right-4 hidden md:block", label: "Lead qualificado", sub: "pelo WhatsApp agora", dy: [-8, 0], delay: 0 },
                { pos: "absolute -bottom-4 -left-4 hidden md:block", label: "IA respondeu 1.247", sub: "mensagens este mês", dy: [9, 0], delay: 1 },
                { pos: "absolute -top-4 -left-4 hidden lg:block", label: "Follow-up enviado", sub: "automático", dy: [-7, 0], delay: 2 },
                { pos: "absolute -bottom-4 -right-4 hidden lg:block", label: "Oportunidade criada", sub: "João Silva", dy: [8, 0], delay: 3 },
              ].map(({ pos, label, sub, dy, delay }) => (
                <motion.div key={label} animate={{ y: [dy[0], dy[1], dy[0]] }} transition={{ duration: 4 + delay * 0.3, repeat: Infinity, delay }}
                  className={`${pos} rounded-2xl px-3 py-2.5`}
                  style={{ background: "rgba(255,255,255,0.97)", border: `1px solid ${CARD_BORDER}`, backdropFilter: "blur(12px)", boxShadow: CARD_HOVER }}>
                  <p className="text-[9px] font-medium" style={{ color: TEXT_MUT }}>{label}</p>
                  <p className="text-[9px] font-medium" style={{ color: TEXT_SEC }}>{sub}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── IA NO ATENDIMENTO ── */}
      <section id="ia" className="py-32 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div {...fade}>
            <SectionLabel>IA NO ATENDIMENTO</SectionLabel>
            <h2 className="font-extrabold leading-[1.1] mb-8" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", color: TEXT, letterSpacing: "-0.04em" }}>
              Uma IA treinada para responder como{" "}
              <span style={{ color: BLUE }}>seu melhor vendedor</span>
            </h2>
            <div className="space-y-3">
              {["Responde dúvidas frequentes automaticamente", "Qualifica leads antes do humano entrar", "Entende produtos, preços e objeções", "Consulta documentos e informações da empresa", "Transfere para humano quando necessário", "Mantém histórico e contexto da conversa"].map(b => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle size={15} style={{ color: BLUE, marginTop: 2, flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: TEXT_SEC }}>{b}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...premiumReveal(0.15)}>
            <div style={{ background: "#FFFFFF", borderRadius: 24, padding: 4, border: "1px solid #E9EDF2", boxShadow: "0 20px 60px rgba(15,23,42,0.14), 0 4px 16px rgba(15,23,42,0.07)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/sales/ia-chat.png" alt="IA treinada respondendo no WhatsApp"
                style={{ display: "block", width: "100%", height: "auto", borderRadius: 20 }} loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="py-32 px-6" style={{ background: BG }}>
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <h2 className="font-extrabold leading-[1.1]" style={{ fontSize: "clamp(28px, 3.5vw, 48px)", color: TEXT, letterSpacing: "-0.04em" }}>
              O que nossos clientes dizem
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { name: "Carlos M.", role: "Agência de Marketing", metric: "64% menos perguntas", text: "A IA reduziu em 64% as perguntas repetidas. Nossa equipe agora foca só em quem quer fechar." },
              { name: "Ana P.", role: "Infoprodutora", metric: "3× mais follow-ups", text: "Cada conversa no WhatsApp agora vira uma oportunidade no pipeline automaticamente." },
              { name: "Renato S.", role: "Consultoria Comercial", metric: "R$34k MRR em 4 meses", text: "O broadcast trouxe vendas da base parada. Reativamos clientes que estavam dormindo há meses." },
              { name: "Marina L.", role: "E-commerce", metric: "89% taxa de entrega", text: "O CRM integrou tudo: atendimento, pipeline e campanhas. Parece que a equipe dobrou de tamanho." },
            ].map(({ name, role, metric, text }, i) => (
              <motion.div key={name} {...fadeF(i * 0.08)} className="rounded-[20px] p-7 flex flex-col"
                style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderTop: `3px solid ${BORDER}`, boxShadow: CARD_SHADOW, minHeight: 200, transition: CARD_TRANSITION }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = CARD_HOVER; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = CARD_SHADOW; }}>
                <p className="text-2xl font-black mb-3" style={{ color: BLUE, letterSpacing: "-0.03em" }}>{metric}</p>
                <p className="text-sm leading-relaxed italic mb-6 flex-1" style={{ color: TEXT_SEC }}>"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ background: BG2, color: SLATE }}>
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: TEXT }}>{name}</p>
                    <p className="text-xs" style={{ color: TEXT_MUT }}>{role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARATIVO ── */}
      <section className="py-20 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[900px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <h2 className="font-extrabold leading-[1.1]" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", color: TEXT, letterSpacing: "-0.04em" }}>
              Antes era conversa solta.{" "}
              <span style={{ color: BLUE }}>Agora é operação.</span>
            </h2>
          </motion.div>
          <motion.div {...fadeF(0.1)}>
            <div style={{ background: "#FFFFFF", borderRadius: 24, padding: 4, border: "1px solid #E9EDF2", boxShadow: "0 16px 48px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.05)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/sales/comparison.png" alt="Antes e depois do CRM — Sem CRM vs Com Sales Sales"
                style={{ display: "block", width: "100%", height: "auto", borderRadius: 20 }} loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      {plans.length > 0 && (
        <section id="planos" className="py-32 px-6" style={{ background: BG }}>
          <div className="max-w-[1000px] mx-auto">
            <motion.div {...fade} className="text-center mb-12">
              <SectionLabel>PLANOS</SectionLabel>
              <h2 className="font-extrabold leading-[1.1]" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", color: TEXT, letterSpacing: "-0.04em" }}>
                Escolha o plano ideal para sua operação
              </h2>
              <p className="text-lg mt-3" style={{ color: TEXT_SEC }}>30 dias grátis em todos os planos</p>
            </motion.div>
            <div className={`grid gap-5 items-start ${plans.length === 1 ? "max-w-sm mx-auto" : plans.length === 2 ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
              {plans.map((plan, i) => {
                const isHighlight = plans.length >= 3 && i === middleIdx;
                return (
                  <motion.div key={plan.id} {...fadeF(i * 0.1)} className="rounded-[22px] flex flex-col"
                    style={{
                      background: isHighlight ? "#FAFCFF" : CARD,
                      border: isHighlight ? `2px solid #BFDBFE` : `1px solid ${CARD_BORDER}`,
                      boxShadow: isHighlight ? "0 4px 24px rgba(37,99,235,0.10)" : CARD_SHADOW,
                      transform: isHighlight ? "scale(1.03)" : "none",
                      padding: isHighlight ? "36px" : "28px",
                    }}>
                    {isHighlight && (
                      <span className="text-[9px] font-bold px-2.5 py-1 rounded-full self-start mb-4 uppercase tracking-wider"
                        style={{ background: BLUE, color: "#fff", letterSpacing: "0.08em" }}>MAIS ESCOLHIDO</span>
                    )}
                    <p className="text-lg font-extrabold mb-1" style={{ color: TEXT, letterSpacing: "-0.02em" }}>{plan.nome}</p>
                    {isHighlight && <p className="text-xs mt-0.5 mb-2 font-medium" style={{ color: BLUE, opacity: 0.8 }}>Ideal para vender com IA e automação</p>}
                    {plan.descricao && <p className="text-xs mb-4" style={{ color: TEXT_MUT }}>{plan.descricao}</p>}
                    <div className="mb-6">
                      <span style={{ fontSize: isHighlight ? 48 : 40, fontWeight: 900, color: isHighlight ? BLUE : TEXT, letterSpacing: "-0.04em" }}>
                        R${parseFloat(plan.price_brl).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                      <span className="text-sm" style={{ color: TEXT_MUT }}>{CYCLE_LABEL[plan.billing_cycle] ?? "/mês"}</span>
                    </div>
                    <div className="flex-1 space-y-2.5 mb-7">
                      {(plan.features ?? []).map((f: string) => (
                        <div key={f} className="flex items-center gap-2.5">
                          <CheckCircle size={14} style={{ color: isHighlight ? BLUE : GREEN, flexShrink: 0 }} />
                          <span className="text-sm" style={{ color: TEXT_SEC }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={`/signup?ref=${slug}&agency=${agId}&plan=${plan.id}`}
                      className="block text-center py-3.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                      style={{
                        background: isHighlight ? BLUE : BG2,
                        color: isHighlight ? "#fff" : TEXT_SEC,
                        textDecoration: "none",
                        border: isHighlight ? "none" : `1px solid ${CARD_BORDER}`,
                        boxShadow: isHighlight ? "0 4px 14px rgba(37,99,235,0.22)" : "none",
                        letterSpacing: "-0.01em",
                      }}>
                      Começar com {plan.nome}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {plans.length >= 3 && (
              <motion.div {...fadeF(0.3)} className="mt-10 rounded-[20px] overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
                <div className="grid" style={{ gridTemplateColumns: "1fr repeat(3, 1fr)", background: BG2 }}>
                  <div className="p-4" />
                  {plans.map((p, i) => (
                    <div key={p.id} className="p-4 text-center" style={{ borderLeft: `1px solid ${CARD_BORDER}` }}>
                      <p className="text-xs font-bold" style={{ color: i === middleIdx ? BLUE : TEXT }}>{p.nome}</p>
                    </div>
                  ))}
                </div>
                {["Pipeline visual", "WhatsApp + IA", "Broadcast em massa", "Fluxos avançados", "Suporte dedicado"].map((feature, fi) => (
                  <div key={feature} className="grid" style={{ gridTemplateColumns: "1fr repeat(3, 1fr)", borderTop: `1px solid ${CARD_BORDER}`, background: fi % 2 === 0 ? CARD : BG }}>
                    <div className="p-3.5 px-5"><span className="text-xs font-medium" style={{ color: TEXT_SEC }}>{feature}</span></div>
                    {plans.map((_, i) => {
                      const has = fi === 0 ? true : fi === 1 ? i >= 1 : fi === 2 ? i >= 1 : fi === 3 ? i >= 2 : i >= 2;
                      return (
                        <div key={i} className="p-3.5 flex justify-center items-center" style={{ borderLeft: `1px solid ${CARD_BORDER}` }}>
                          {has ? <CheckCircle size={14} style={{ color: i === middleIdx ? BLUE : GREEN }} /> : <span style={{ color: TEXT_MUT, fontSize: 16 }}>—</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </motion.div>
            )}
            <p className="text-center text-xs mt-6" style={{ color: TEXT_MUT }}>30 dias grátis • Sem cartão de crédito • Cancele quando quiser</p>
          </div>
        </section>
      )}

      {/* ── GARANTIA ── */}
      <section className="py-20 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade} className="rounded-[24px] p-10 text-center" style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: BG2, border: `1px solid ${CARD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <ShieldCheck size={22} style={{ color: BLUE }} />
            </div>
            <h2 className="font-extrabold tracking-tight mb-4" style={{ fontSize: "clamp(24px, 3vw, 36px)", color: TEXT, letterSpacing: "-0.03em" }}>
              Teste por 30 dias sem compromisso
            </h2>
            <p className="text-base mb-8 leading-relaxed" style={{ color: TEXT_SEC }}>
              Você pode criar sua conta, conhecer a plataforma e entender como o CRM se encaixa na sua operação antes de decidir continuar.
            </p>
            <div className="flex flex-wrap justify-center gap-5 mb-8">
              {["Sem cartão de crédito", "Sem fidelidade", "Cancele quando quiser", "Suporte para começar"].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={13} style={{ color: BLUE, flexShrink: 0 }} />
                  <span className="text-sm" style={{ color: TEXT_SEC }}>{t}</span>
                </div>
              ))}
            </div>
            <PrimaryBtn href={signupUrl} large>Criar conta grátis <ArrowRight size={18} /></PrimaryBtn>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-32 px-6" style={{ background: BG }}>
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade} className="text-center mb-10">
            <h2 className="font-extrabold tracking-tight" style={{ fontSize: "clamp(24px, 3vw, 38px)", color: TEXT, letterSpacing: "-0.03em" }}>Perguntas frequentes</h2>
          </motion.div>
          <motion.div {...fadeF(0.1)}><FAQAccordion cor={cor} /></motion.div>
        </div>
      </section>

      {/* ── TRUST SECTION ── */}
      <section className="py-16 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[900px] mx-auto">
          <motion.div {...fade} className="text-center mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: TEXT, letterSpacing: "-0.03em" }}>Comece sem risco</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShieldCheck, title: "30 dias grátis", desc: "Teste completo sem limitação" },
              { icon: CreditCard, title: "Sem cartão", desc: "Não pedimos dados de pagamento" },
              { icon: Repeat, title: "Cancele quando quiser", desc: "Sem fidelidade ou multa" },
              { icon: Users, title: "Suporte incluso", desc: "Ajuda para começar do zero" },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fadeF(i * 0.08)} className="rounded-[18px] p-5 text-center"
                style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW, transition: CARD_TRANSITION }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = CARD_HOVER; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = CARD_SHADOW; }}>
                <IconBox icon={Icon} color={BLUE} />
                <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: TEXT_MUT }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-32 px-6 relative overflow-hidden" style={{ background: BG }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(37,99,235,0.04), transparent 70%)" }} />
        <motion.div {...fade} className="relative max-w-[700px] mx-auto text-center">
          <div className="rounded-[28px] p-14 md:p-20" style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 8px 40px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)" }}>
            <h2 className="font-black leading-[1.0] mb-5" style={{ fontSize: "clamp(32px, 4.5vw, 56px)", color: TEXT, letterSpacing: "-0.05em" }}>
              Seu WhatsApp pode{" "}
              <span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                vender melhor ainda hoje
              </span>
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: TEXT_SEC }}>
              Crie sua conta grátis, centralize seus leads e veja o CRM trabalhando na sua operação antes de pagar.
            </p>
            <PrimaryBtn href={signupUrl} large>Criar conta grátis agora <ArrowRight size={20} /></PrimaryBtn>
            <p className="text-sm mt-6" style={{ color: TEXT_MUT }}>30 dias grátis • sem cartão • configuração em minutos</p>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6" style={{ borderTop: `1px solid ${BORDER}`, background: BG2 }}>
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            {agency?.logo_url
              ? <img src={agency.logo_url} alt={nome} style={{ height: 28, width: "auto", maxWidth: 140 }} />
              : <>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" /></svg>
                  </div>
                  <span className="text-sm font-bold" style={{ color: TEXT, letterSpacing: "-0.01em" }}>{nome}</span>
                </>
            }
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacidade" className="text-xs" style={{ color: TEXT_MUT, textDecoration: "none" }}>Privacidade</Link>
            <Link href="/termos" className="text-xs" style={{ color: TEXT_MUT, textDecoration: "none" }}>Termos</Link>
          </div>
          <p className="text-xs" style={{ color: TEXT_MUT }}>Powered by Liberty CRM</p>
        </div>
      </footer>

    </main>
  );
}

// Type alias to fix TS unused warning
const SLATE_LIGHT = "#CBD5E1";
