"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/marketing/NavBar";
import { Footer } from "@/components/marketing/Footer";
import {
  ArrowRight, CheckCircle, Bot, MessageSquare, BarChart2,
  Workflow, Users, Globe, ShieldCheck, Layers,
  Building2, Home, Stethoscope, ShoppingBag, Briefcase, GraduationCap,
  FileText, Database, Key, TrendingUp, Cpu, Plus, Minus, Zap
} from "lucide-react";

const BG = "#040405";
const BG2 = "#090B10";
const BG_BLUE = "#0B1220";
const CARD = "#111318";
const BORDER = "#252A33";
const WHITE = "#F8FAFC";
const MUTED = "#A1A1AA";
const SOFT = "#71717A";
const CHAMP = "#D6B36A";
const GOLD = "#C8A75D";
const BLUE = "#2563EB";
const BLUE_L = "#60A5FA";
const SILVER = "#CBD5E1";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true as const },
  transition: { duration: 0.8, delay },
});
// Premium cinematic reveal — ease-out-expo (design skills)
const premiumReveal = (delay = 0) => ({
  initial: { opacity: 0, y: 40, scale: 0.97 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true as const },
  transition: { duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] as const },
});

// AnimatedNumber — countUp on scroll (champagne version)
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
          const progress = 1 - Math.pow(1 - frame / frames, 4);
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
    : Math.round(display).toString();

  return (
    <p ref={ref} className="text-base font-extrabold" style={{ color }}>
      R${formatted}{suffix}
    </p>
  );
}

// ─── Grain Overlay ───
function GrainOverlay({ opacity = 0.025 }: { opacity?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0, opacity,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
    }} />
  );
}

// ─── Mockup Premium — imagem real do produto ───
function OpusMockup() {
  return (
    <div className="relative w-full max-w-[720px]">
      <div style={{ transform: "perspective(1200px) rotateX(3deg) rotateY(-2deg)" }}>
        <div style={{
          borderRadius: 24,
          overflow: "hidden",
          border: "1px solid rgba(214,179,106,0.20)",
          boxShadow: "0 80px 160px rgba(0,0,0,0.9), 0 0 100px rgba(214,179,106,0.10)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/opus/mockup-product-theatre.png"
            alt="Atlas Sales OS — CRM exclusivo com sua marca"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
      </div>

      {/* Floating cards */}
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}
        className="absolute -top-5 -right-5 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: `linear-gradient(135deg, ${CARD}, ${BG2})`, border: `1px solid ${CHAMP}25`, backdropFilter: "blur(16px)", boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 20px ${CHAMP}08` }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SOFT }}>Visibilidade</p>
        <p className="text-base font-extrabold" style={{ color: CHAMP }}>100% invisível</p>
        <p className="text-[9px]" style={{ color: SOFT }}>Sem menção à Liberty</p>
      </motion.div>

      <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1.5 }}
        className="absolute -bottom-5 -left-5 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: `linear-gradient(135deg, ${CARD}, ${BG2})`, border: `1px solid ${BLUE}28`, backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SOFT }}>IA treinada</p>
        <p className="text-base font-extrabold" style={{ color: BLUE_L }}>Setup completo</p>
        <p className="text-[9px]" style={{ color: SOFT }}>Para sua operação</p>
      </motion.div>

      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 2.5 }}
        className="absolute -bottom-5 -right-5 rounded-2xl px-4 py-3 hidden lg:block"
        style={{ background: `linear-gradient(135deg, ${CARD}, ${BG2})`, border: `1px solid ${SILVER}18`, backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SOFT }}>Liberty</p>
        <p className="text-base font-extrabold" style={{ color: SILVER }}>Invisível</p>
        <p className="text-[9px]" style={{ color: SOFT }}>Nos bastidores</p>
      </motion.div>

      <motion.div animate={{ y: [0, 9, 0] }} transition={{ duration: 4.5, repeat: Infinity, delay: 3.5 }}
        className="absolute -top-5 -left-5 rounded-2xl px-4 py-3 hidden lg:block"
        style={{ background: `linear-gradient(135deg, ${CARD}, ${BG2})`, border: `1px solid ${BLUE_L}22`, backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SOFT }}>Pipeline</p>
        <AnimatedNumber value="340k" color={BLUE_L} />
        <p className="text-[9px]" style={{ color: SOFT }}>Em andamento</p>
      </motion.div>
    </div>
  );
}

// ─── Accordion FAQ ───
const FAQ_ITEMS = [
  { q: "O CRM fica com minha marca?", a: "Sim. White-label completo — logo, domínio e cores." },
  { q: "A Liberty CRM aparece em algum lugar?", a: "Não. Nenhuma menção à Liberty CRM. A experiência é 100% da sua empresa." },
  { q: "A IA responde WhatsApp?", a: "Sim, 24h por dia. Transfere para humano quando necessário." },
  { q: "A IA aprende com meus documentos?", a: "Sim. PDF, site, tabela de preços — tudo vira conhecimento da IA." },
  { q: "Vocês fazem o setup completo?", a: "Sim. Desde a identidade visual até o treinamento da equipe." },
  { q: "Preciso de equipe técnica?", a: "Não. Cuidamos de tudo no onboarding." },
  { q: "Qual o investimento?", a: "Setup a partir de R$2.000 + manutenção mensal. Detalhamos na apresentação." },
];

function AccordionFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map(({ q, a }, i) => (
        <div key={i} className="rounded-2xl overflow-hidden transition-all duration-200"
          style={{ background: open === i ? `${CHAMP}06` : CARD, border: open === i ? `1px solid ${CHAMP}25` : `1px solid ${BORDER}` }}>
          <button className="w-full flex items-center justify-between px-6 py-4 text-left" onClick={() => setOpen(open === i ? null : i)}>
            <span className="text-sm font-bold" style={{ color: WHITE }}>{q}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-4 transition-all duration-200"
              style={{ background: open === i ? `${CHAMP}18` : "rgba(255,255,255,0.06)" }}>
              {open === i ? <Minus size={12} style={{ color: CHAMP }} /> : <Plus size={12} style={{ color: MUTED }} />}
            </div>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: MUTED }}>{a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}


const NICHES = [
  { icon: Stethoscope, name: "Clínicas", desc: "Triagem, agendamento e follow-up automático." },
  { icon: Home, name: "Imobiliárias", desc: "Captação, qualificação e distribuição de leads." },
  { icon: Building2, name: "Agências", desc: "Atendimento, pipeline e gestão de clientes." },
  { icon: ShoppingBag, name: "E-commerce", desc: "Atendimento, recuperação e campanhas para base." },
  { icon: GraduationCap, name: "Cursos", desc: "Captação, nutrição e matrícula automatizada." },
  { icon: Briefcase, name: "Serviços locais", desc: "Orçamentos, agenda e atendimento 24h." },
  { icon: Users, name: "Times comerciais", desc: "Pipeline, metas e atendimento centralizado." },
  { icon: MessageSquare, name: "Ops. WhatsApp", desc: "Atendimento em escala com IA." },
];

// ─── ZPPIA Steps (Opus) ───
const OPUS_STEPS = [
  { num: "01", title: "Diagnóstico", desc: "Mapeamos atendimento, vendas, equipe, gargalos e objetivos do negócio." },
  { num: "02", title: "Arquitetura", desc: "Desenhamos funil, etapas comerciais e jornada do lead exclusivamente para você." },
  { num: "03", title: "IA treinada", desc: "A IA aprende seus produtos, preços, objeções e a linguagem da sua empresa." },
  { num: "04", title: "Marca aplicada", desc: "Logo, domínio, cores e identidade visual configurados em cada ponto do sistema." },
  { num: "05", title: "Operação no ar", desc: "Treinamos sua equipe, ajustamos tudo e acionamos a operação completa." },
];

function ZPPIAStepsOpus({ steps, color }: { steps: { num: string; title: string; desc: string }[]; color: string }) {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      {steps.map(({ num, title, desc }, i) => (
        <motion.div
          key={num}
          {...fade(i * 0.08)}
          className="relative flex items-start gap-8 py-10 px-8 cursor-default overflow-hidden"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.3s, border-left 0.3s, padding-left 0.3s" }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.background = `${color}04`;
            el.style.borderLeft = `4px solid ${color}60`;
            el.style.paddingLeft = "28px";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.background = "";
            el.style.borderLeft = "";
            el.style.paddingLeft = "32px";
          }}
        >
          {/* Número watermark */}
          <div
            className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none font-black leading-none"
            style={{ fontSize: "clamp(80px, 12vw, 160px)", color: `${color}06`, letterSpacing: "-0.05em" }}
          >
            {num}
          </div>
          {/* Conteúdo */}
          <div className="relative" style={{ zIndex: 1 }}>
            <p className="font-mono font-bold mb-3" style={{ fontSize: 11, color: `${color}60` }}>{num}</p>
            <h3
              className="font-extrabold tracking-[-0.02em] mb-2"
              style={{ fontSize: "clamp(22px, 2.5vw, 34px)", color: WHITE }}
            >
              {title}
            </h3>
            <p className="text-base leading-relaxed" style={{ color: MUTED, maxWidth: 560 }}>{desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function OpusPage() {
  return (
    <main style={{ background: BG, color: WHITE, fontFamily: "var(--font-sans)", overflowX: "hidden", scrollBehavior: "smooth" }}>
      <NavBar
        hideCTA
        links={[
          { label: "Estrutura", href: "#estrutura" },
          { label: "IA", href: "#ia" },
          { label: "Implantação", href: "#implantacao" },
          { label: "FAQ", href: "#faq" },
        ]}
      />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16 px-6 md:px-12">
        {/* Background atmosférico */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/opus/bg-hero.png" alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.28, mixBlendMode: "luminosity", zIndex: 0 }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `
          radial-gradient(ellipse 700px 500px at 65% -15%, rgba(214,179,106,0.12), transparent),
          radial-gradient(ellipse 500px 400px at 100% 40%, rgba(37,99,235,0.08), transparent),
          radial-gradient(ellipse 600px 450px at 30% 75%, rgba(37,99,235,0.07), transparent),
          radial-gradient(ellipse 350px 250px at 50% 50%, rgba(214,179,106,0.04), transparent),
          radial-gradient(ellipse 300px 200px at 80% 90%, rgba(96,165,250,0.05), transparent)
        ` }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(214,179,106,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(214,179,106,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        <GrainOverlay opacity={0.025} />
        <div className="relative max-w-[1260px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-20">
          <motion.div {...fade()}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-bold uppercase tracking-widest"
              style={{ background: `${CHAMP}10`, border: `1px solid ${CHAMP}22`, color: CHAMP }}>
              <ShieldCheck size={11} /> CRM EXCLUSIVO COM IA E WHATSAPP
            </div>
            <h1 className="font-extrabold leading-[0.97] tracking-[-0.05em] mb-6"
              style={{ fontSize: "clamp(48px, 6vw, 92px)" }}>
              Seu CRM.<br />Sua Marca.<br />
              <span className="font-serif italic font-normal" style={{ color: CHAMP }}>Sua Operação.</span>
            </h1>
            <p className="text-lg md:text-xl mb-10 leading-relaxed" style={{ color: SILVER, maxWidth: 500 }}>
              Uma estrutura premium com IA, WhatsApp e automações personalizadas para sua empresa operar vendas e atendimento como uma grande operação tecnológica.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <motion.div
                animate={{ boxShadow: ["0 0 50px rgba(214,179,106,0.22)", "0 0 80px rgba(214,179,106,0.48)", "0 0 50px rgba(214,179,106,0.22)"] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ borderRadius: 16, display: "inline-flex" }}>
                <Link href="/opus/agendar"
                  className="inline-flex items-center gap-3 rounded-2xl font-bold transition-all hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2, ${GOLD})`, color: BG2, padding: "14px 32px", fontSize: 16, letterSpacing: "-0.01em" }}>
                  Agendar apresentação estratégica <ArrowRight size={20} />
                </Link>
              </motion.div>
              <Link href="#estrutura" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: WHITE }}>
                Ver estrutura do Opus
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {["✓ Domínio próprio", "✓ Login personalizado", "✓ Dashboard com sua marca", "✓ Sem menção à Liberty", "✓ IA treinada"].map(t => (
                <span key={t} className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: `${CHAMP}08`, border: `1px solid ${CHAMP}18`, color: CHAMP }}>{t}</span>
              ))}
            </div>
          </motion.div>
          <motion.div {...fade(0.2)} className="flex justify-center lg:justify-end">
            <OpusMockup />
          </motion.div>
        </div>
      </section>

      {/* ── POSICIONAMENTO EDITORIAL ── */}
      <section className="py-40 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[860px] mx-auto text-center">
          <motion.div {...fade()}>
            <h2 className="font-extrabold leading-[1.03] tracking-[-0.04em] mb-8"
              style={{ fontSize: "clamp(40px, 6vw, 84px)" }}>
              Você não precisa usar o{" "}
              <span className="font-serif italic font-normal" style={{ color: SILVER }}>CRM de outra empresa.</span>
            </h2>
            <div className="w-16 h-px mx-auto mb-8" style={{ background: `linear-gradient(90deg, transparent, ${CHAMP}, transparent)` }} />
            <p className="text-xl leading-relaxed" style={{ color: MUTED, maxWidth: 660, margin: "0 auto" }}>
              O Opus entrega uma estrutura com sua marca, seus fluxos, sua IA e sua operação — como se tivesse sido desenvolvida exclusivamente para você.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── ANTES/DEPOIS ── */}
      <section className="py-28 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="section-label mb-4">Transformação</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Antes e depois da <span className="font-serif italic font-normal" style={{ color: CHAMP }}>sua operação</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ANTES — caótico */}
            <motion.div {...fade()} className="rounded-[24px] p-7 relative overflow-hidden"
              style={{ background: "#07080A", border: "1px solid rgba(239,68,68,0.06)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: "#F87171" }}>Como está hoje</p>
              {[
                "WhatsApp desorganizado", "Planilhas soltas", "Leads perdidos",
                "Atendimento manual", "Sem visão da equipe", "Sem follow-up",
              ].map(i => (
                <div key={i} className="flex items-start gap-2.5 py-2.5" style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                  <div className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: "#EF4444", opacity: 0.4 }} />
                  <span className="text-sm" style={{ color: "#374151" }}>{i}</span>
                </div>
              ))}
            </motion.div>

            {/* DEPOIS — premium iluminado */}
            <motion.div {...fade(0.15)} className="rounded-[24px] p-7"
              style={{
                background: `linear-gradient(180deg, rgba(214,179,106,0.07), ${CARD})`,
                border: `1px solid ${CHAMP}30`,
                boxShadow: `0 0 40px rgba(214,179,106,0.08)`,
              }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: CHAMP }}>Com Liberty Opus</p>
              {[
                "CRM com sua marca", "IA atendendo 24h", "Pipeline organizado",
                "Equipe roteada", "Dashboard executivo", "Automação de follow-up",
              ].map(i => (
                <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid rgba(214,179,106,0.08)` }}>
                  <CheckCircle size={15} style={{ color: CHAMP }} />
                  <span className="text-sm font-medium" style={{ color: WHITE }}>{i}</span>
                </div>
              ))}
            </motion.div>
          </div>
          <motion.div {...fade(0.2)} className="text-center mt-8">
            <p className="text-base font-medium" style={{ color: SOFT }}>
              A transformação não é só visual. <strong style={{ color: SILVER }}>É operacional.</strong>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── TECNOLOGIA DESAPARECE ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 50% 60% at 50% 50%, rgba(214,179,106,0.07), transparent 70%)`,
        }} />
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="font-extrabold select-none" style={{ fontSize: "clamp(80px,15vw,200px)", color: `${CHAMP}04`, letterSpacing: "-0.05em" }}>INVISÍVEL</p>
        </div>

        <div className="relative max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Coluna esquerda — texto + orbital */}
          <div className="text-center md:text-left">
            <motion.div {...fade()}>
              <p className="section-label mb-5">White-Label Total</p>
              <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-10"
                style={{ fontSize: "clamp(32px, 4vw, 56px)" }}>
                A tecnologia desaparece.<br />
                <span className="font-serif italic font-normal" style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Sua marca aparece.
                </span>
              </h2>
            </motion.div>

            {/* Orbital */}
            <div className="relative flex items-center justify-center mb-8 h-56">
              <div className="absolute w-56 h-56 rounded-full" style={{ border: `1px dashed ${CHAMP}15` }} />
              <motion.div {...fade(0.1)} className="relative z-10 w-16 h-16 rounded-2xl flex flex-col items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${CHAMP}18, ${GOLD}12)`, border: `2px solid ${CHAMP}35`, boxShadow: `0 0 40px ${CHAMP}18` }}>
                <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                  <p className="text-xl font-extrabold" style={{ color: CHAMP }}>A</p>
                </motion.div>
                <p className="text-[8px] font-bold" style={{ color: SOFT }}>Atlas</p>
              </motion.div>
              {[
                { label: "Domínio próprio", deg: 0, icon: Globe },
                { label: "Login pers.", deg: 60, icon: Key },
                { label: "WhatsApp IA", deg: 120, icon: MessageSquare },
                { label: "Pipeline", deg: 180, icon: BarChart2 },
                { label: "Dashboard", deg: 240, icon: TrendingUp },
                { label: "Base de KB", deg: 300, icon: Database },
              ].map(({ label, deg, icon: Icon }, i) => {
                const rad = (deg - 90) * (Math.PI / 180);
                const r = 108;
                const x = Math.cos(rad) * r;
                const y = Math.sin(rad) * r;
                return (
                  <motion.div key={label} {...fade(i * 0.08)} className="absolute flex flex-col items-center gap-1"
                    style={{ transform: `translate(${x}px, ${y}px)` }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${CHAMP}10`, border: `1px solid ${CHAMP}20` }}>
                      <Icon size={13} style={{ color: CHAMP, opacity: 0.8 }} />
                    </div>
                    <p className="text-[8px] font-bold text-center whitespace-nowrap" style={{ color: MUTED, maxWidth: 64 }}>{label}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div {...fade(0.3)}>
              <p className="text-sm leading-relaxed mb-3" style={{ color: MUTED }}>
                Seu cliente, sua equipe e sua operação enxergam apenas a sua marca.<br />
                O Opus roda por trás, de forma invisível.
              </p>
              <p className="text-xs" style={{ color: `${CHAMP}30` }}>Powered by Liberty CRM — invisível nos bastidores</p>
            </motion.div>
          </div>

          {/* Coluna direita — login personalizado */}
          <motion.div {...fade(0.2)} className="hidden md:block">
            <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(214,179,106,0.18)", boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(214,179,106,0.08)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/opus/mockup-login.png" alt="Login personalizado — sua marca"
                style={{ display: "block", width: "100%", height: "auto" }} loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MONTAMOS SUA OPERAÇÃO — ZPPIA ── */}
      <section id="implantacao" className="py-32 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade()} className="mb-16">
            <p className="section-label mb-4">Nossa Entrega</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 56px)" }}>
              Não instalamos um CRM.<br />
              <span className="font-serif italic font-normal" style={{ color: CHAMP }}>Montamos sua operação.</span>
            </h2>
          </motion.div>
          <ZPPIAStepsOpus steps={OPUS_STEPS} color={CHAMP} />
        </div>
      </section>

      {/* ── O QUE VOCÊ RECEBE (com micro-mockups) ── */}
      <section id="estrutura" className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="section-label mb-4">O Que Você Recebe</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Tudo configurado para <span style={{ color: CHAMP }}>sua operação</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Globe, title: "Identidade visual", desc: "Logo, cores, domínio e interface personalizada.",
                mini: (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: `${CHAMP}15`, color: CHAMP }}>A</div>
                    <div className="flex gap-1.5">
                      {[CHAMP, BLUE_L, "#4ADE80"].map(c => <div key={c} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />)}
                    </div>
                  </div>
                ),
              },
              {
                icon: MessageSquare, title: "WhatsApp", desc: "Conexão e configuração dos canais de atendimento.",
                mini: (
                  <div className="space-y-1 mt-3">
                    <div className="px-2 py-1 rounded-lg text-[9px] w-fit" style={{ background: "#1E3A2F", color: "#86EFAC" }}>Olá! Como posso ajudar?</div>
                    <div className="px-2 py-1 rounded-lg text-[9px] w-fit ml-auto" style={{ background: `${CHAMP}12`, color: CHAMP }}>Preciso de um orçamento</div>
                  </div>
                ),
              },
              {
                icon: Bot, title: "Agente de IA", desc: "Treinamento com produtos, preços e objeções.",
                mini: (
                  <div className="mt-3 px-2 py-1.5 rounded-lg text-[9px]" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                    <span style={{ color: CHAMP }}>→</span> <span style={{ color: SOFT }}>"Qual o plano?"</span><br />
                    <span style={{ color: MUTED }}>O plano inclui pipeline, IA e WhatsApp…</span>
                  </div>
                ),
              },
              {
                icon: BarChart2, title: "Pipeline comercial", desc: "Etapas personalizadas para seu processo de vendas.",
                mini: (
                  <div className="flex gap-1.5 mt-3">
                    {[{ l: "Novo", n: 8, c: BLUE_L }, { l: "Prop.", n: 4, c: CHAMP }, { l: "Ganho", n: 11, c: "#4ADE80" }].map(p => (
                      <div key={p.l} className="flex-1 rounded-lg p-1.5 text-center" style={{ background: `${p.c}10`, border: `1px solid ${p.c}20` }}>
                        <p className="text-xs font-extrabold" style={{ color: p.c }}>{p.n}</p>
                        <p className="text-[8px]" style={{ color: SOFT }}>{p.l}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: Workflow, title: "Fluxos automáticos", desc: "Boas-vindas, qualificação e follow-up automático.",
                mini: (
                  <div className="flex items-center gap-1 mt-3">
                    {["Início", "IA", "Humano"].map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${CHAMP}12`, color: CHAMP, border: `1px solid ${CHAMP}20` }}>{s}</div>
                        {i < 2 && <div style={{ width: 12, height: 1, background: `${CHAMP}40` }} />}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: Users, title: "Equipe", desc: "Usuários, permissões e roteamento inteligente.",
                mini: (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex -space-x-2">
                      {[CHAMP, BLUE_L, "#4ADE80"].map(c => <div key={c} className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: `${c}20`, color: c, outline: `2px solid ${BG2}` }}>A</div>)}
                    </div>
                    <ArrowRight size={10} style={{ color: CHAMP, opacity: 0.6 }} />
                    <div className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${CHAMP}12`, color: CHAMP }}>Roteado</div>
                  </div>
                ),
              },
            ].map(({ icon: Icon, title, desc, mini }, i) => (
              <motion.div key={title} {...fade(i * 0.08)} className="rounded-[20px] p-7"
                style={{ background: `linear-gradient(180deg, ${CARD}, ${BG2})`, border: `1px solid ${BORDER}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: `${CHAMP}10` }}>
                  <Icon size={20} style={{ color: CHAMP }} />
                </div>
                <p className="text-base font-bold mb-1.5" style={{ color: WHITE }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{desc}</p>
                {mini}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT THEATRE ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(214,179,106,0.06), transparent 70%)` }} />
        <GrainOverlay opacity={0.02} />
        <div className="relative max-w-[1100px] mx-auto">
          <motion.div {...fade()} className="text-center mb-12">
            <p className="section-label mb-4">Product Theatre</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Uma operação exclusiva <span className="font-serif italic font-normal" style={{ color: CHAMP }}>com a sua marca</span>
            </h2>
            <p className="text-lg mt-4" style={{ color: MUTED }}>É assim que sua empresa opera com o Liberty Opus</p>
          </motion.div>

          <motion.div {...premiumReveal(0.15)} style={{ transform: "perspective(2000px) rotateX(3deg)" }}>
            <div style={{
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(214,179,106,0.22)",
              boxShadow: "0 80px 160px rgba(0,0,0,0.9), 0 0 120px rgba(214,179,106,0.10)",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/opus/mockup-product-theatre.png"
                alt="Uma operação exclusiva com a sua marca"
                style={{ display: "block", width: "100%", height: "auto" }} loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── IA REAL ── */}
      <section id="ia" className="py-28 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div {...fade()}>
            <p className="section-label mb-4">Inteligência Artificial</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-8" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Não é <span className="font-serif italic font-normal" style={{ color: CHAMP }}>chatbot simples</span>
            </h2>
            <div className="space-y-3">
              {["entende contexto da conversa,", "consulta documentos reais,", "responde objeções naturalmente,", "interpreta mensagens de áudio,", "transfere para humanos,", "mantém histórico da conversa."].map(i => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: CHAMP }} />
                  <p className="text-base font-medium" style={{ color: SILVER }}>{i}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...premiumReveal(0.15)}>
            <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(214,179,106,0.18)", boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(214,179,106,0.08)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/opus/mockup-inbox.png" alt="WhatsApp com IA treinada"
                style={{ display: "block", width: "100%", height: "auto" }} loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── BASE DE CONHECIMENTO (nova) ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="section-label mb-4">Base de Conhecimento</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Sua IA aprende com o conteúdo<br />
              <span className="font-serif italic font-normal" style={{ color: CHAMP }}>real da sua empresa</span>
            </h2>
            <p className="text-lg mt-4 max-w-xl mx-auto" style={{ color: MUTED }}>
              O Opus transforma documentos, páginas e materiais da sua empresa em uma base de conhecimento para respostas precisas e naturais.
            </p>
          </motion.div>

          <motion.div {...premiumReveal(0.1)} className="mt-12">
            <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(214,179,106,0.15)", boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/opus/mockup-knowledge.png" alt="Base de conhecimento com IA"
                style={{ display: "block", width: "100%", height: "auto" }} loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── DASHBOARD EXECUTIVO (nova) ── */}
      <section className="py-28 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[900px] mx-auto">
          <motion.div {...fade()} className="text-center mb-12">
            <p className="section-label mb-4">Visão da Operação</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Controle sua operação <span style={{ color: CHAMP }}>com clareza</span>
            </h2>
          </motion.div>
          <motion.div {...premiumReveal(0.1)}>
            <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(214,179,106,0.15)", boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(214,179,106,0.06)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/opus/mockup-dashboard.png" alt="Dashboard executivo — visão da operação"
                style={{ display: "block", width: "100%", height: "auto" }} loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CASOS DE USO ── */}
      <section className="py-28 px-6">
        <div className="max-w-[1000px] mx-auto text-center">
          <motion.div {...fade()} className="mb-14">
            <p className="section-label mb-4">Ideal Para</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Empresas que querem profissionalizar <span style={{ color: CHAMP }}>atendimento e vendas</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {NICHES.map(({ icon: Icon, name, desc }, i) => (
              <motion.div key={name} {...fade(i * 0.06)} className="rounded-[18px] p-6 text-left cursor-default"
                style={{ background: CARD, border: `1px solid ${BORDER}`, transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `${CHAMP}08` }}>
                  <Icon size={22} style={{ color: CHAMP, opacity: 0.8 }} />
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: WHITE }}>{name}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: SOFT }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL PREMIUM ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/opus/bg-cta.png" alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.22, mixBlendMode: "screen", zIndex: 0 }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 50% 60% at 50% 50%, rgba(214,179,106,0.07), transparent 70%)` }} />
        <motion.div {...fade()} className="relative max-w-[780px] mx-auto text-center">
          <div className="rounded-[32px] p-16 md:p-24" style={{
            background: `linear-gradient(135deg, rgba(214,179,106,0.07), rgba(37,99,235,0.04))`,
            border: `1px solid ${CHAMP}28`,
            boxShadow: `0 0 100px rgba(214,179,106,0.12)`,
          }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: CHAMP, letterSpacing: "0.15em" }}>DEMONSTRAÇÃO PERSONALIZADA</p>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-6"
              style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
              Sua empresa merece uma estrutura{" "}
              <span className="font-serif italic font-normal" style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>feita para ela</span>
            </h2>
            <p className="text-lg mb-4" style={{ color: MUTED }}>Demonstração personalizada para sua operação.</p>
            <p className="text-sm mb-10" style={{ color: SOFT }}>
              Diagnóstico gratuito • Setup completo • IA treinada • Suporte dedicado
            </p>
            <Link href="/opus/agendar"
              className="inline-flex items-center gap-3 rounded-2xl font-bold transition-all hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2, ${GOLD})`, color: BG2, boxShadow: `0 0 60px rgba(214,179,106,0.28)`, fontSize: 16, padding: "16px 40px", letterSpacing: "-0.01em" }}>
              Agendar apresentação estratégica <ArrowRight size={20} />
            </Link>
            <p className="mt-6 text-xs" style={{ color: SOFT }}>Setup a partir de R$2.000 • Manutenção mensal</p>
          </div>
        </motion.div>
      </section>

      {/* ── FAQ ACCORDION ── */}
      <section id="faq" className="py-20 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade()} className="mb-8">
            <h2 className="text-2xl font-extrabold tracking-[-0.02em]" style={{ color: WHITE }}>Perguntas Frequentes</h2>
          </motion.div>
          <motion.div {...fade(0.1)}><AccordionFAQ /></motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
