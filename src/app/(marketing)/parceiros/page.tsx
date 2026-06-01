"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/marketing/NavBar";
import { Footer } from "@/components/marketing/Footer";
import { MRRCalculator } from "@/components/marketing/MRRCalculator";
import {
  CheckCircle, ArrowRight, Zap, Users, MessageSquare, Bot,
  BarChart2, Megaphone, Globe, ShieldCheck,
  Workflow, Layers, TrendingUp, Wifi, Mic, Volume2, Plus, Minus,
  Building2, DollarSign, CreditCard
} from "lucide-react";

const BG = "#050608";
const BG2 = "#0B0F14";
const CARD = "#101720";
const BORDER = "#1F2937";
const WHITE = "#F8FAFC";
const MUTED = "#94A3B8";
const LIGHT = "#CBD5E1";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const CYAN = "#22D3EE";

const fade = { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true as const }, transition: { duration: 0.6 } };
const fadeF = (delay: number) => ({ ...fade, transition: { duration: 0.6, delay } });

// â”€â”€â”€ Grain Overlay â”€â”€â”€
function GrainOverlay({ opacity = 0.025 }: { opacity?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0, opacity,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
    }} />
  );
}

// â”€â”€â”€ CRM Mockup â€” imagem real do produto â”€â”€â”€
function CRMMockup() {
  return (
    <div className="relative w-full max-w-[720px]">
      <div style={{ transform: "perspective(1800px) rotateX(2deg) rotateY(-1deg)" }}>
        <div style={{
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 80px 160px rgba(0,0,0,0.9), 0 0 100px rgba(34,197,94,0.12)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/parceiros/mockup-parceiro.png"
            alt="Digital Pro CRM â€” Painel de Parceiro"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
      </div>

      {/* 4 Floating Cards */}
      <motion.div animate={{ y: [0, -9, 0] }} transition={{ duration: 3.2, repeat: Infinity }}
        className="absolute -top-5 -right-3 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: "rgba(16,23,32,0.92)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>RecorrÃªncia</p>
        <p className="text-xl font-extrabold" style={{ color: GREEN }}>85%</p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>do que vocÃª cobrar</p>
      </motion.div>

      <motion.div animate={{ y: [0, 9, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 0.8 }}
        className="absolute -bottom-4 -right-3 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: "rgba(16,23,32,0.92)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>Sua comissÃ£o</p>
        <p className="text-xl font-extrabold" style={{ background: `linear-gradient(135deg,${GREEN},${BLUE})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>+R$12.673</p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>30 clientes ativos</p>
      </motion.div>

      <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 3.5, repeat: Infinity, delay: 1.2 }}
        className="absolute -top-5 -left-3 rounded-2xl px-4 py-3 hidden lg:block"
        style={{ background: "rgba(16,23,32,0.92)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>Clientes</p>
        <p className="text-xl font-extrabold" style={{ color: CYAN }}>30</p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>workspaces ativos</p>
      </motion.div>

      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4.5, repeat: Infinity, delay: 2 }}
        className="absolute -bottom-4 -left-3 rounded-2xl px-4 py-3 hidden lg:block"
        style={{ background: "rgba(16,23,32,0.92)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>White-label</p>
        <p className="text-base font-extrabold" style={{ color: "#A78BFA" }}>âœ“ Ativo</p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>Sua marca, seu domÃ­nio</p>
      </motion.div>

      {/* 5Âº card â€” WhatsApp + IA */}
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5.5, repeat: Infinity, delay: 3 }}
        className="absolute top-1/2 -right-3 rounded-2xl px-4 py-3 hidden xl:block"
        style={{ background: "rgba(16,23,32,0.92)", border: "1px solid rgba(74,222,128,0.25)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(74,222,128,0.08)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>WhatsApp + IA</p>
        <p className="text-base font-extrabold" style={{ color: "#4ADE80" }}>24h / 7d</p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>Atendimento incluso</p>
      </motion.div>
    </div>
  );
}

// â”€â”€â”€ Accordion FAQ â”€â”€â”€
const FAQ_ITEMS = [
  { q: "O que Ã© um CRM white-label?", a: "Ã‰ um CRM que funciona com sua marca, domÃ­nio e identidade visual. Seus clientes veem apenas a sua empresa." },
  { q: "Posso cobrar meus prÃ³prios clientes?", a: "Sim. VocÃª define os valores e condiÃ§Ãµes. A plataforma nÃ£o interfere no seu relacionamento comercial." },
  { q: "Liberty CRM aparece para meu cliente?", a: "NÃ£o. O ambiente Ã© totalmente personalizado com a sua marca." },
  { q: "Preciso saber programar?", a: "NÃ£o. Tudo Ã© configurado via painel, sem linha de cÃ³digo." },
  { q: "A IA responde WhatsApp automaticamente?", a: "Sim, 24h por dia, 7 dias por semana." },
  { q: "Posso treinar a IA com PDFs e sites?", a: "Sim. A IA aprende com qualquer documento ou URL que vocÃª fornecer." },
  { q: "Existe recorrÃªncia mensal?", a: "Sim. O modelo foi criado exatamente para gerar receita recorrente para parceiros." },
];

function AccordionFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map(({ q, a }, i) => (
        <div key={i} className="rounded-2xl overflow-hidden transition-all duration-200"
          style={{ background: open===i ? `${GREEN}06` : CARD, border: open===i ? `1px solid ${GREEN}25` : `1px solid ${BORDER}` }}>
          <button className="w-full flex items-center justify-between px-6 py-4 text-left"
            onClick={() => setOpen(open===i ? null : i)}>
            <span className="text-sm font-bold" style={{ color: WHITE }}>{q}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-4 transition-all duration-200"
              style={{ background: open===i ? `${GREEN}18` : "rgba(255,255,255,0.06)" }}>
              {open===i ? <Minus size={12} style={{color:GREEN}}/> : <Plus size={12} style={{color:MUTED}}/>}
            </div>
          </button>
          <AnimatePresence>
            {open===i && (
              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.25}}>
                <p className="px-6 pb-5 text-sm leading-relaxed" style={{color:MUTED}}>{a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// â”€â”€â”€ Delivery Mockups â€” imagens reais â”€â”€â”€
function InboxMockup() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/parceiros/mockup-inbox.png"
      alt="Inbox WhatsApp com IA"
      loading="lazy"
      style={{ display: "block", width: "100%", borderRadius: 12 }}
    />
  );
}

function PipelineMockup() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/parceiros/mockup-pipeline.png"
      alt="Pipeline Comercial"
      loading="lazy"
      style={{ display: "block", width: "100%", borderRadius: 12 }}
    />
  );
}

function DashboardMockup() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/parceiros/mockup-dashboard.png"
      alt="Dashboard de Performance"
      loading="lazy"
      style={{ display: "block", width: "100%", borderRadius: 12 }}
    />
  );
}

const CHECKS = [
  { icon: Globe, label: "CRM com sua marca" },
  { icon: MessageSquare, label: "WhatsApp com IA" },
  { icon: Users, label: "Workspaces por cliente" },
  { icon: ShieldCheck, label: "DomÃ­nio prÃ³prio" },
  { icon: TrendingUp, label: "Receita recorrente" },
];

const DORES = [
  { title: "Receita imprevisÃ­vel", desc: "Projeto entra, projeto sai." },
  { title: "Sem recorrÃªncia", desc: "ComeÃ§a do zero todo mÃªs." },
  { title: "Escala limitada", desc: "Horas trocadas por dinheiro." },
  { title: "Alta dependÃªncia", desc: "TrÃ¡fego e fechamento constante." },
  { title: "Pouco ativo", desc: "Entrega mas nÃ£o acumula valor." },
];


const TECH_CARDS = [
  {
    icon: Bot, title: "Gemini IA contextual", desc: "MemÃ³ria, contexto e aprendizado com documentos.", color: "#A78BFA",
    mini: (
      <div className="mt-3 rounded-lg p-2.5 space-y-1.5" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.12)" }}>
        <div className="flex justify-end"><div className="px-2 py-1 rounded-lg text-[9px]" style={{ background: "#1E1B3A", color: "#C4B5FD" }}>Como funciona o plano?</div></div>
        <div className="px-2 py-1 rounded-lg text-[9px] max-w-[90%]" style={{ background: "rgba(255,255,255,0.04)", color: LIGHT }}>O plano inclui IA, pipeline e WhatsApp. Posso mostrar detalhes?</div>
      </div>
    ),
  },
  {
    icon: Layers, title: "RAG com documentos", desc: "PDF, sites e arquivos viram respostas da IA.", color: BLUE,
    mini: (
      <div className="mt-3 flex items-center gap-2">
        <div className="px-2 py-1.5 rounded-lg text-[9px] flex items-center gap-1" style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}20`, color: BLUE }}>ðŸ“„ PDF</div>
        <div style={{ color: "#4B5563", fontSize: 10 }}>â†’</div>
        <div className="px-2 py-1.5 rounded-lg text-[9px]" style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}20`, color: BLUE }}>ðŸ§  IA</div>
        <div style={{ color: "#4B5563", fontSize: 10 }}>â†’</div>
        <div className="px-2 py-1.5 rounded-lg text-[9px]" style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}20`, color: BLUE }}>ðŸ’¬ Resp.</div>
      </div>
    ),
  },
  {
    icon: MessageSquare, title: "WhatsApp API oficial", desc: "Meta Cloud API, sem risco de banimento.", color: "#4ADE80",
    mini: (
      <div className="mt-3 rounded-lg p-2.5" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)" }}>
        <div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" /><span className="text-[9px] font-bold text-[#4ADE80]">online â€¢ IA ativa</span></div>
        <p className="text-[9px]" style={{ color: LIGHT }}>"OlÃ¡! Como posso ajudar hoje? ðŸ˜Š"</p>
      </div>
    ),
  },
  {
    icon: CreditCard, title: "Split ASAAS", desc: "ComissÃµes distribuÃ­das automaticamente.", color: GREEN,
    mini: (
      <div className="mt-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${GREEN}18` }}>
        <div className="h-2 flex">
          <div style={{ width: "15%", background: "#4B5563" }} />
          <div style={{ width: "85%", background: `linear-gradient(90deg, ${GREEN}, ${BLUE})` }} />
        </div>
        <div className="flex justify-between px-2 py-1">
          <span className="text-[9px]" style={{ color: "#4B5563" }}>Liberty 15%</span>
          <span className="text-[9px] font-bold" style={{ color: GREEN }}>AgÃªncia 85%</span>
        </div>
      </div>
    ),
  },
  {
    icon: Globe, title: "Multi-workspace", desc: "Cada cliente tem seu ambiente isolado.", color: CYAN,
    mini: (
      <div className="mt-3 flex gap-1.5">
        {["SA", "PX", "CL"].map(c => (
          <div key={c} className="flex-1 py-2 rounded-lg text-center text-[9px] font-bold" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}18`, color: CYAN }}>{c}</div>
        ))}
      </div>
    ),
  },
  {
    icon: ShieldCheck, title: "White-label completo", desc: "Zero menÃ§Ã£o Ã  Liberty em nenhum lugar.", color: "#F97316",
    mini: (
      <div className="mt-3 flex items-center gap-2">
        <div className="px-2 py-1 rounded text-[9px] line-through" style={{ background: "rgba(248,113,113,0.08)", color: "#F87171" }}>Liberty CRM</div>
        <div style={{ color: "#4B5563", fontSize: 10 }}>â†’</div>
        <div className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", color: "#F97316" }}>Sua Marca</div>
      </div>
    ),
  },
];

const TARGETS = [
  "AgÃªncias de marketing", "Gestores de trÃ¡fego", "Consultores",
  "Especialistas em automaÃ§Ã£o", "Social medias", "Freelancers",
  "Empreendedores digitais", "AgÃªncias de IA", "WhatsApp Marketing",
];

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun"];
const MRR_GROWTH = [2490, 4970, 7460, 9940, 12430, 14910];

// â”€â”€â”€ ZPPIA Steps â”€â”€â”€
const PARCEIROS_STEPS = [
  { num: "01", title: "Ative sua marca", desc: "Configure logo, cores, domÃ­nio e URL personalizada em menos de 30 minutos." },
  { num: "02", title: "Cadastre seus clientes", desc: "Cada cliente recebe um workspace isolado com acesso e dados individuais." },
  { num: "03", title: "Venda a mensalidade", desc: "Defina o valor que quiser. 85% do MRR fica com vocÃª todo mÃªs, automaticamente." },
  { num: "04", title: "Acompanhe seu MRR", desc: "Dashboard exclusivo: veja faturamento, comissÃµes e crescimento em tempo real." },
  { num: "05", title: "Escale sem desenvolver", desc: "Adicione novos clientes sem custo de infraestrutura, cÃ³digo ou equipe tÃ©cnica." },
];

function ZPPIASteps({ steps, color }: { steps: { num: string; title: string; desc: string }[]; color: string }) {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      {steps.map(({ num, title, desc }, i) => (
        <motion.div
          key={num}
          {...fadeF(i * 0.08)}
          className="relative flex items-start gap-8 py-10 px-8 cursor-default overflow-hidden"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.3s, box-shadow 0.3s, border-left 0.3s, padding-left 0.3s" }}
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
          {/* NÃºmero watermark */}
          <div
            className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none font-black leading-none"
            style={{ fontSize: "clamp(80px, 12vw, 160px)", color: `${color}06`, letterSpacing: "-0.05em" }}
          >
            {num}
          </div>
          {/* ConteÃºdo */}
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

export default function ParceirosPage() {
  return (
    <main style={{ background: BG, color: WHITE, fontFamily: "var(--font-sans)", overflowX: "hidden" }}>
      <NavBar
        links={[
          { label: "Como funciona", href: "#como-funciona" },
          { label: "Ganhos", href: "#mrr" },
          { label: "Produto", href: "#produto" },
          { label: "FAQ", href: "#faq" },
        ]}
        ctaLabel="Quero virar parceiro"
        ctaHref="/signup"
      />

      {/* â”€â”€ HERO â”€â”€ */}
      <section className="relative min-h-screen flex items-center pt-16 px-6 md:px-12">
        {/* Background atmosfÃ©rico */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/parceiros/bg-hero.png" alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.30, mixBlendMode: "luminosity", zIndex: 0 }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle at 70% 30%, rgba(34,197,94,0.14), transparent 40%), radial-gradient(circle at 25% 70%, rgba(59,130,246,0.12), transparent 40%), radial-gradient(circle at 50% 50%, rgba(34,197,94,0.05), transparent 60%)`,
        }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]" style={{
          backgroundImage: `linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        <GrainOverlay opacity={0.03} />

        <div className="relative max-w-[1260px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20">
          <motion.div {...fade}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-bold uppercase tracking-widest"
              style={{ background: `${GREEN}12`, border: `1px solid ${GREEN}25`, color: GREEN }}>
              <Zap size={11} /> CRM WHITE-LABEL PARA AGÃŠNCIAS
            </div>
            <h1 className="font-extrabold leading-[1.0] tracking-[-0.04em] mb-6"
              style={{ fontSize: "clamp(42px, 5.5vw, 80px)" }}>
              Tenha seu prÃ³prio CRM com sua marca e{" "}
              <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                gere recorrÃªncia
              </span>{" "}todos os meses
            </h1>
            <p className="text-lg md:text-xl mb-10 leading-relaxed" style={{ color: LIGHT, maxWidth: 520 }}>
              Venda CRM, WhatsApp com IA e automaÃ§Ãµes para seus clientes sem precisar desenvolver tecnologia do zero.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <Link href="/signup" className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, color: WHITE, boxShadow: `0 0 40px rgba(34,197,94,0.25)` }}>
                Quero virar parceiro <ArrowRight size={18} />
              </Link>
              <Link href="#como-funciona" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: WHITE }}>
                Ver como funciona
              </Link>
            </div>
            <div className="flex flex-wrap gap-5">
              {["Setup rÃ¡pido", "White-label", "IA integrada", "Receita recorrente"].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-sm" style={{ color: "#64748B" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />{t}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div {...fadeF(0.2)} className="flex justify-center lg:justify-end">
            <CRMMockup />
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ PROVA RÃPIDA â”€â”€ */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: BG2 }}>
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {CHECKS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon size={15} style={{ color: GREEN }} />
              <span className="text-sm font-semibold" style={{ color: "#CBD5E1" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* â”€â”€ O PROBLEMA â”€â”€ */}
      <section className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <motion.div {...fade}>
            <p className="section-label mb-4">O Problema</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(36px, 4vw, 52px)" }}>
              Sua agÃªncia ainda vende serviÃ§o como se fosse{" "}
              <span style={{ color: MUTED }}>projeto Ãºnico?</span>
            </h2>
          </motion.div>
          <motion.div {...fadeF(0.15)} className="space-y-2">
            {DORES.map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: CARD, border: "1px solid rgba(239,68,68,0.1)" }}>
                <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: "#F97316" }} />
                <div><p className="text-sm font-bold" style={{ color: WHITE }}>{title}</p><p className="text-sm" style={{ color: MUTED }}>{desc}</p></div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ VIRADA â”€â”€ */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(34,197,94,0.07), transparent 70%)` }} />
        <motion.div {...fade} className="relative max-w-[800px] mx-auto">
          <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-8" style={{ fontSize: "clamp(32px, 4.5vw, 64px)" }}>
            Pare de vender apenas serviÃ§o.{" "}
            <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Comece a vender infraestrutura.
            </span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: MUTED }}>
            Com Liberty CRM Parceiro, sua agÃªncia deixa de entregar sÃ³ campanhas e passa a oferecer uma operaÃ§Ã£o completa de vendas, atendimento e automaÃ§Ã£o com sua prÃ³pria marca.
          </p>
        </motion.div>
      </section>

      {/* â”€â”€ COMO FUNCIONA â€” ZPPIA â”€â”€ */}
      <section id="como-funciona" className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="mb-16">
            <p className="section-label mb-4">Como Funciona</p>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.03em]" style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>
              5 passos para sua agÃªncia{" "}
              <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                virar SaaS
              </span>
            </h2>
          </motion.div>
          <ZPPIASteps steps={PARCEIROS_STEPS} color={GREEN} />
        </div>
      </section>

      {/* â”€â”€ SUA AGÃŠNCIA COMO SAAS â”€â”€ */}
      <section className="py-32 px-6 relative overflow-hidden" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 30% 50%, rgba(34,197,94,0.06), transparent 70%)` }} />
        <GrainOverlay opacity={0.02} />
        <div className="relative max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Mockup painel agÃªncia â€” 3 colunas */}
          <motion.div {...fadeF(0.1)} className="lg:col-span-3">
            <div style={{
              borderRadius: 22,
              overflow: "hidden",
              border: "1px solid rgba(34,197,94,0.18)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(34,197,94,0.10)",
              transform: "perspective(1800px) rotateX(2deg) rotateY(1deg)",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/parceiros/mockup-parceiro.png"
                alt="Painel de Parceiro â€” Digital Pro CRM"
                style={{ display: "block", width: "100%", height: "auto" }}
                loading="lazy"
              />
            </div>
          </motion.div>

          {/* Benefits â€” 2 colunas */}
          <motion.div {...fade} className="lg:col-span-2 space-y-6">
            <p className="section-label">Sua agÃªncia como SaaS</p>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em]" style={{ fontSize: "clamp(32px, 3.5vw, 48px)" }}>
              Sua agÃªncia.{" "}
              <span style={{ background: `linear-gradient(135deg,${GREEN},${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Agora com um produto SaaS prÃ³prio.
              </span>
            </h2>
            <div className="space-y-4">
              {[
                { title: "Receita que nÃ£o acaba", desc: "Cada cliente paga todo mÃªs. Sem precisar vender novamente." },
                { title: "Produto com sua marca", desc: "Seu cliente nunca vÃª Liberty CRM. SÃ³ vÃª vocÃª." },
                { title: "Escala sem limites", desc: "Adicione 1 ou 100 clientes com o mesmo esforÃ§o." },
                { title: "Tecnologia pronta", desc: "Zero desenvolvimento. Zero servidor. Zero manutenÃ§Ã£o." },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: `${GREEN}05`, border: `1px solid ${GREEN}12` }}>
                  <CheckCircle size={16} style={{ color: GREEN, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: WHITE }}>{title}</p>
                    <p className="text-xs mt-0.5" style={{ color: MUTED }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ MRR SEÃ‡ÃƒO MELHORADA â”€â”€ */}
      <section id="mrr" className="py-20 px-6 relative overflow-hidden" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <p className="section-label mb-4">Potencial de RecorrÃªncia</p>
            <h2 className="font-extrabold leading-[1.0] tracking-[-0.05em]" style={{ fontSize: "clamp(64px, 10vw, 128px)", background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              R$14.910
            </h2>
            <p className="text-lg mt-2" style={{ color: MUTED }}>por mÃªs com apenas 30 clientes pagando R$497</p>
          </motion.div>

          {/* Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            <motion.div {...fade} className="rounded-2xl p-6" style={{ background: CARD, border: "1px solid rgba(239,68,68,0.12)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#F87171" }}>ServiÃ§o pontual</p>
              <p className="text-4xl font-extrabold mb-1" style={{ color: "#F87171" }}>R$5.000</p>
              <p className="text-sm" style={{ color: MUTED }}>por projeto â€¢ entra uma vez â€¢ nÃ£o volta</p>
              <div className="mt-4 h-1.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)" }}>
                <div style={{ width: "33%", height: "100%", borderRadius: 99, background: "#F87171" }} />
              </div>
            </motion.div>
            <motion.div {...fadeF(0.15)} className="rounded-2xl p-6" style={{ background: `linear-gradient(180deg, rgba(34,197,94,0.07), ${CARD})`, border: `1px solid ${GREEN}22` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: GREEN }}>Receita recorrente</p>
              <p className="text-4xl font-extrabold mb-1" style={{ color: GREEN }}>R$14.910</p>
              <p className="text-sm" style={{ color: MUTED }}>todo mÃªs â€¢ cresce â€¢ multiplica</p>
              <div className="mt-4 h-1.5 rounded-full" style={{ background: `${GREEN}15` }}>
                <div style={{ width: "100%", height: "100%", borderRadius: 99, background: GREEN }} />
              </div>
            </motion.div>
          </div>

          {/* Growth bars */}
          <motion.div {...fade} className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#4B5563" }}>Crescimento mensal (30 clientes)</p>
            <div className="flex items-end gap-3 h-20">
              {MRR_GROWTH.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <p className="text-[9px] font-bold" style={{ color: i===5 ? GREEN : "#4B5563" }}>R${(v/1000).toFixed(1)}k</p>
                  <div className="w-full rounded-t-lg transition-all" style={{
                    height: `${(v / 14910) * 100}%`,
                    background: i===5 ? `linear-gradient(180deg, ${GREEN}, ${BLUE})` : `${BLUE}30`,
                    boxShadow: i===5 ? `0 0 12px ${GREEN}50` : "none",
                  }} />
                  <p className="text-[9px]" style={{ color: "#374151" }}>{MONTHS[i]}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Frase emocional */}
          <motion.div {...fadeF(0.15)} className="text-center py-8">
            <p className="text-xl font-medium" style={{ color: MUTED }}>
              Um projeto termina.{" "}
              <strong style={{ color: WHITE }}>Uma base recorrente cresce.</strong>
            </p>
          </motion.div>

          <motion.div {...fadeF(0.2)} className="text-center">
            <Link href="/signup" className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, color: WHITE, boxShadow: `0 0 40px rgba(34,197,94,0.2)` }}>
              Quero construir minha recorrÃªncia <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ CTA INTERMEDIÃRIO â”€â”€ */}
      <section className="py-10 px-6">
        <motion.div {...fade} className="max-w-[600px] mx-auto text-center">
          <p className="text-base font-medium mb-4" style={{ color: MUTED }}>
            Pronto para transformar sua agÃªncia em uma empresa de tecnologia?
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl font-bold text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GREEN}25`, color: GREEN }}>
            Quero transformar minha agÃªncia em SaaS <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* â”€â”€ SIMULADOR MRR â”€â”€ */}
      <section className="py-20 px-6">
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade} className="text-center mb-10">
            <p className="section-label mb-4">Simulador</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              Veja o potencial da <span style={{ color: GREEN }}>sua operaÃ§Ã£o</span>
            </h2>
          </motion.div>
          <motion.div {...fadeF(0.15)}><MRRCalculator /></motion.div>
        </div>
      </section>

      {/* â”€â”€ O QUE SUA AGÃŠNCIA ENTREGA â”€â”€ */}
      <section id="produto" className="py-32 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <p className="section-label mb-4">O Produto</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              O que sua agÃªncia entrega para{" "}
              <span style={{ color: GREEN }}>cada cliente</span>
            </h2>
            <p className="text-lg mt-4 max-w-xl mx-auto" style={{ color: MUTED }}>TrÃªs mÃ³dulos integrados que transformam a operaÃ§Ã£o do seu cliente</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: "Inbox WhatsApp com IA", desc: "Atendimento 24h via WhatsApp, com IA que entende o contexto e responde como vendedor.", Component: InboxMockup, color: "#4ADE80" },
              { title: "Pipeline Comercial", desc: "Kanban visual para acompanhar leads do primeiro contato atÃ© o fechamento.", Component: PipelineMockup, color: BLUE },
              { title: "Dashboard de Performance", desc: "MÃ©tricas em tempo real para a agÃªncia e o cliente acompanharem os resultados.", Component: DashboardMockup, color: CYAN },
            ].map(({ title, desc, Component, color }, i) => (
              <motion.div key={title} {...fadeF(i * 0.1)} className="rounded-[20px] overflow-hidden"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="p-5">
                  <p className="text-sm font-bold mb-1" style={{ color: WHITE }}>{title}</p>
                  <p className="text-xs mb-4 leading-relaxed" style={{ color: MUTED }}>{desc}</p>
                  <Component />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ TECH ENTERPRISE â”€â”€ */}
      <section className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-16">
            <p className="section-label mb-4">Tecnologia Enterprise</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Diferenciais que <span style={{ color: GREEN }}>seus clientes sentem</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TECH_CARDS.map(({ icon: Icon, title, desc, color, mini }, i) => (
              <motion.div key={title} {...fadeF(i * 0.08)} className="rounded-[20px] p-7 cursor-default flex flex-col"
                style={{ background: `linear-gradient(180deg, ${CARD}, ${BG2})`, border: `1px solid ${BORDER}`, transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-4px)"; el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.5), 0 0 20px ${color}12`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = ""; }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${color}12`, boxShadow: `0 0 20px ${color}18` }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <p className="text-base font-bold mb-1.5" style={{ color: WHITE }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: LIGHT }}>{desc}</p>
                {mini}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ PRODUCT THEATRE â”€â”€ */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(34,197,94,0.07), transparent 70%)` }} />
        <GrainOverlay opacity={0.025} />
        <div className="relative max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <p className="section-label mb-4">Product Theatre</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Seu SaaS white-label <span style={{ color: GREEN }}>em operaÃ§Ã£o</span>
            </h2>
            <p className="text-lg mt-4" style={{ color: MUTED }}>Ã‰ assim que seus clientes veem o produto que vocÃª vende</p>
          </motion.div>

          <motion.div {...fadeF(0.15)} style={{ transform: "perspective(2000px) rotateX(3deg)" }}>
            <div style={{
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid rgba(34,197,94,0.22)",
              boxShadow: "0 80px 160px rgba(0,0,0,0.9), 0 0 120px rgba(34,197,94,0.10)",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/parceiros/mockup-dashboard.png"
                alt="Digital Pro CRM â€” Seu SaaS white-label em operaÃ§Ã£o"
                style={{ display: "block", width: "100%", height: "auto" }}
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ WHITE-LABEL ANTES/DEPOIS â”€â”€ */}
      <section className="py-20 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[900px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              Seu cliente compra da <span style={{ color: GREEN }}>sua marca.</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div {...fade} className="rounded-[20px] p-6" style={{ background: CARD, border: "1px solid rgba(239,68,68,0.12)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#F87171" }}>Sem white-label</p>
              {["Logo de terceiro", "URL genÃ©rica", "Visual padrÃ£o", "Pouca credibilidade", "Cliente desconfiante"].map(i => (
                <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#EF4444" }} />
                  <span className="text-sm" style={{ color: MUTED }}>{i}</span>
                </div>
              ))}
            </motion.div>
            <motion.div {...fadeF(0.15)} className="rounded-[20px] p-6" style={{ background: `linear-gradient(180deg, rgba(34,197,94,0.07), ${CARD})`, border: `1px solid ${GREEN}20` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: GREEN }}>Com Liberty Parceiro</p>
              {["Sua logo no topo", "Seu domÃ­nio prÃ³prio", "Suas cores e identidade", "MÃ¡xima credibilidade", "ExperiÃªncia exclusiva"].map(i => (
                <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: `1px solid rgba(34,197,94,0.1)` }}>
                  <CheckCircle size={14} style={{ color: GREEN }} />
                  <span className="text-sm font-medium" style={{ color: WHITE }}>{i}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* â”€â”€ PARA QUEM Ã‰ â”€â”€ */}
      <section className="py-32 px-6">
        <div className="max-w-[1000px] mx-auto text-center">
          <motion.div {...fade}>
            <p className="section-label mb-4">Para Quem Ã‰</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-12" style={{ fontSize: "clamp(36px, 4vw, 52px)" }}>Perfeito para:</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {TARGETS.map(t => (
                <span key={t} className="px-5 py-2.5 rounded-full text-sm font-semibold"
                  style={{ background: CARD, border: `1px solid ${BORDER}`, color: "#CBD5E1" }}>{t}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ CTA FINAL â”€â”€ */}
      <section className="py-32 px-6 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/parceiros/bg-cta.png" alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.20, mixBlendMode: "screen", zIndex: 0 }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,197,94,0.08), transparent 70%)` }} />
        <motion.div {...fade} className="relative max-w-[700px] mx-auto text-center">
          <div className="rounded-[28px] p-12 md:p-16" style={{
            background: `linear-gradient(135deg, rgba(34,197,94,0.07), rgba(59,130,246,0.05))`,
            border: `1px solid rgba(34,197,94,0.15)`,
          }}>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-6" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Comece a construir sua{" "}
              <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>recorrÃªncia hoje</span>
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: MUTED }}>VocÃª cuida dos clientes. A Liberty cuida da tecnologia.</p>
            <Link href="/signup" className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, color: WHITE, boxShadow: `0 0 50px rgba(34,197,94,0.3)` }}>
              QUERO VIRAR PARCEIRO <ArrowRight size={18} />
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
              {["Trial gratuito", "Sem cartÃ£o de crÃ©dito", "Suporte incluso"].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={13} style={{ color: GREEN }} />
                  <span className="text-xs" style={{ color: "#64748B" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* â”€â”€ FAQ ACCORDION â”€â”€ */}
      <section id="faq" className="py-20 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade} className="mb-8">
            <h2 className="text-2xl font-extrabold tracking-[-0.02em]" style={{ color: WHITE }}>Perguntas Frequentes</h2>
          </motion.div>
          <motion.div {...fadeF(0.1)}><AccordionFAQ /></motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

