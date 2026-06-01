"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { NavBar } from "@/components/marketing/NavBar";
import { Footer } from "@/components/marketing/Footer";
import { MRRCalculator } from "@/components/marketing/MRRCalculator";
import {
  CheckCircle, ArrowRight, Zap, Users, MessageSquare, Bot,
  BarChart2, Megaphone, Globe, DollarSign, ShieldCheck,
  Workflow, Layers, TrendingUp, Wifi, Mic, Volume2
} from "lucide-react";

// ─── Design Tokens ───
const BG = "#050608";
const BG2 = "#0B0F14";
const CARD = "#101720";
const BORDER = "#1F2937";
const WHITE = "#F8FAFC";
const MUTED = "#94A3B8";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";

const fade = { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true as const }, transition: { duration: 0.6 } };
const fadeF = (delay: number) => ({ ...fade, transition: { duration: 0.6, delay } });

// ─── CSS Mockup do CRM ───
function CRMMockup() {
  return (
    <div className="relative w-full max-w-[540px]" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Main card */}
      <div className="rounded-[20px] overflow-hidden" style={{
        background: "linear-gradient(180deg, #131B2A 0%, #0B1120 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div className="px-5 h-12 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0D1526" }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: GREEN }}>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
          </div>
          <span className="text-xs font-bold" style={{ color: WHITE }}>Minha Agência CRM</span>
          <div className="ml-auto flex gap-1.5">
            {[GREEN, "#EAB308", "#EF4444"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: 99, background: c, opacity: 0.7 }} />)}
          </div>
        </div>

        <div className="p-5 grid grid-cols-5 gap-3">
          {/* Sidebar */}
          <div className="col-span-1 space-y-3">
            {[Users, MessageSquare, BarChart2, Megaphone, Workflow].map((Icon, i) => (
              <div key={i} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: i === 0 ? `${GREEN}20` : "rgba(255,255,255,0.04)" }}>
                <Icon size={14} style={{ color: i === 0 ? GREEN : "#64748B" }} />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="col-span-4 space-y-3">
            {/* Client list */}
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#4B5563" }}>Workspaces</p>
              {[{ name: "Empresa A", dot: GREEN }, { name: "Studio B", dot: BLUE }, { name: "Clínica C", dot: "#A78BFA" }].map(c => (
                <div key={c.name} className="flex items-center gap-2 py-1.5">
                  <div style={{ width: 6, height: 6, borderRadius: 99, background: c.dot }} />
                  <span className="text-xs font-medium" style={{ color: MUTED }}>{c.name}</span>
                  <div className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${c.dot}18`, color: c.dot }}>Ativo</div>
                </div>
              ))}
            </div>

            {/* Mini pipeline */}
            <div className="grid grid-cols-3 gap-1.5">
              {[{ label: "Novos", n: 4, c: "#3B82F6" }, { label: "Proposta", n: 2, c: "#EAB308" }, { label: "Ganhos", n: 6, c: GREEN }].map(p => (
                <div key={p.label} className="rounded-lg p-2 text-center" style={{ background: `${p.c}10`, border: `1px solid ${p.c}25` }}>
                  <p className="text-lg font-extrabold" style={{ color: p.c }}>{p.n}</p>
                  <p className="text-[9px]" style={{ color: p.c, opacity: 0.7 }}>{p.label}</p>
                </div>
              ))}
            </div>

            {/* IA card */}
            <div className="rounded-xl p-3" style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}20` }}>
              <div className="flex items-center gap-2 mb-2">
                <Bot size={12} style={{ color: GREEN }} />
                <span className="text-[10px] font-bold" style={{ color: GREEN }}>IA respondendo</span>
                <div className="ml-auto flex gap-0.5">
                  {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: GREEN, animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
              <p className="text-[10px]" style={{ color: "#4B5563" }}>
                "Olá! Como posso ajudar hoje? 😊"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <motion.div
        animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-5 -right-4 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: "linear-gradient(135deg, #101720, #0B0F14)", border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: MUTED }}>Recorrência</p>
        <p className="text-xl font-extrabold" style={{ color: GREEN }}>85%</p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>do que você cobrar</p>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-4 -left-4 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: "linear-gradient(135deg, #101720, #0B0F14)", border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: MUTED }}>MRR exemplo</p>
        <p className="text-xl font-extrabold" style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          +R$14.910
        </p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>30 clientes ativos</p>
      </motion.div>
    </div>
  );
}

const DORES = [
  { title: "Receita imprevisível", desc: "Projeto entra, projeto sai." },
  { title: "Sem recorrência", desc: "Começa do zero todo mês." },
  { title: "Escala limitada", desc: "Horas trocadas por dinheiro." },
  { title: "Alta dependência", desc: "Tráfego e fechamento constante." },
  { title: "Pouco ativo", desc: "Entrega mas não acumula valor." },
];

const HOW = [
  { n: "01", title: "Ative seu painel white-label", desc: "Receba acesso ao painel com sua marca, logotipo e cores." },
  { n: "02", title: "Crie workspaces para clientes", desc: "Cada cliente tem seu próprio CRM separado e isolado." },
  { n: "03", title: "Personalize marca e domínio", desc: "Logo, cores, domínio próprio — tudo com sua identidade." },
  { n: "04", title: "Defina quanto você cobra", desc: "Você controla os preços. A plataforma roda nos bastidores." },
  { n: "05", title: "Receba todos os meses", desc: "Recorrência automática enquanto o cliente estiver ativo." },
];

const FEATURES = [
  { icon: Bot, title: "IA contextual com memória", desc: "Entende produtos, preços, objeções e histórico da conversa." },
  { icon: Layers, title: "RAG com documentos", desc: "Treina com PDFs, sites e materiais da empresa." },
  { icon: Workflow, title: "Fluxos visuais", desc: "Automatiza atendimento sem depender de técnico." },
  { icon: MessageSquare, title: "WhatsApp com IA 24h", desc: "Atendimento automático, transfere para humano quando necessário." },
  { icon: ShieldCheck, title: "White-label real", desc: "Seu cliente nunca vê Liberty CRM." },
  { icon: DollarSign, title: "Split automático ASAAS", desc: "Comissões distribuídas automaticamente." },
];

const TECH = [
  { icon: Bot, label: "Gemini IA", sub: "contextual" },
  { icon: Layers, label: "RAG", sub: "pgvector" },
  { icon: Mic, label: "STT", sub: "entende áudio" },
  { icon: Volume2, label: "TTS", sub: "voz natural" },
  { icon: Wifi, label: "Multi-agente", sub: "round-robin" },
  { icon: MessageSquare, label: "WhatsApp API", sub: "oficial Meta" },
  { icon: DollarSign, label: "ASAAS Split", sub: "automático" },
  { icon: Globe, label: "Custom Domain", sub: "white-label" },
];

const TARGETS = [
  "Agências de marketing", "Gestores de tráfego", "Consultores",
  "Especialistas em automação", "Social medias", "Freelancers",
  "Empreendedores digitais", "Agências de IA", "WhatsApp Marketing",
];

const FAQ = [
  { q: "O que é um CRM white-label?", a: "É um CRM que funciona com sua marca, domínio e identidade visual. Seus clientes veem apenas a sua empresa." },
  { q: "Posso cobrar meus próprios clientes?", a: "Sim. Você define os valores e condições. A plataforma não interfere no seu relacionamento comercial." },
  { q: "Liberty CRM aparece para meu cliente?", a: "Não. O ambiente é totalmente personalizado com a sua marca." },
  { q: "Preciso saber programar?", a: "Não. Tudo é configurado via painel, sem linha de código." },
  { q: "A IA responde WhatsApp automaticamente?", a: "Sim, 24h por dia, 7 dias por semana." },
  { q: "Posso treinar a IA com PDFs e sites?", a: "Sim. A IA aprende com qualquer documento ou URL que você fornecer." },
  { q: "Existe recorrência mensal?", a: "Sim. O modelo foi criado exatamente para gerar receita recorrente para parceiros." },
];

export default function ParceirosPage() {
  return (
    <main style={{ background: BG, color: WHITE, fontFamily: "var(--font-sans)", overflowX: "hidden" }}>
      <NavBar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16 px-6 md:px-12">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle at 70% 30%, rgba(34,197,94,0.14), transparent 40%), radial-gradient(circle at 25% 70%, rgba(59,130,246,0.12), transparent 40%)`,
        }} />
        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div className="relative max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-20">
          {/* Left */}
          <motion.div {...fade}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-bold uppercase tracking-widest"
              style={{ background: `${GREEN}12`, border: `1px solid ${GREEN}25`, color: GREEN }}>
              <Zap size={11} /> CRM WHITE-LABEL PARA AGÊNCIAS
            </div>
            <h1 className="font-extrabold leading-[1.0] tracking-[-0.04em] mb-6"
              style={{ fontSize: "clamp(44px, 5.5vw, 84px)", fontFamily: "var(--font-sans)" }}>
              Tenha seu próprio CRM com sua marca e{" "}
              <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                gere recorrência
              </span>{" "}
              todos os meses
            </h1>
            <p className="text-lg md:text-xl mb-10 leading-relaxed" style={{ color: MUTED, maxWidth: 520 }}>
              Venda CRM, WhatsApp com IA e automações para seus clientes sem precisar desenvolver tecnologia do zero.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <Link href="/signup"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`,
                  color: WHITE,
                  boxShadow: `0 0 40px rgba(34,197,94,0.25)`,
                }}>
                Quero virar parceiro <ArrowRight size={18} />
              </Link>
              <Link href="#como-funciona"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: WHITE }}>
                Ver como funciona
              </Link>
            </div>
            <div className="flex flex-wrap gap-4">
              {["Setup rápido", "White-label", "IA integrada", "Receita recorrente"].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-sm" style={{ color: "#64748B" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />{t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right — Mockup */}
          <motion.div {...fadeF(0.2)} className="flex justify-center lg:justify-end">
            <CRMMockup />
          </motion.div>
        </div>
      </section>

      {/* ── PROVA RÁPIDA ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: BG2 }}>
        <div className="max-w-[1100px] mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {[
            { icon: Globe, label: "CRM com sua marca" },
            { icon: MessageSquare, label: "WhatsApp com IA" },
            { icon: Users, label: "Workspaces por cliente" },
            { icon: ShieldCheck, label: "Domínio próprio" },
            { icon: TrendingUp, label: "Receita recorrente" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon size={16} style={{ color: GREEN }} />
              <span className="text-sm font-semibold" style={{ color: "#CBD5E1" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── O PROBLEMA ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <motion.div {...fade}>
            <p className="section-label mb-4">O Problema</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]"
              style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>
              Sua agência ainda vende serviço como se fosse{" "}
              <span style={{ color: MUTED }}>projeto único?</span>
            </h2>
          </motion.div>
          <motion.div {...fadeF(0.15)} className="space-y-3">
            {DORES.map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: CARD, border: "1px solid rgba(239,68,68,0.1)" }}>
                <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: "#F97316" }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: WHITE }}>{title}</p>
                  <p className="text-sm" style={{ color: MUTED }}>{desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── VIRADA ESTRATÉGICA ── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(34,197,94,0.07), transparent 70%)`,
        }} />
        <motion.div {...fade} className="relative max-w-[800px] mx-auto">
          <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-8"
            style={{ fontSize: "clamp(32px, 4.5vw, 64px)" }}>
            Pare de vender apenas serviço.{" "}
            <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Comece a vender infraestrutura.
            </span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: MUTED }}>
            Com Liberty CRM Parceiro, sua agência deixa de entregar só campanhas e passa a oferecer uma operação completa de vendas, atendimento e automação com sua própria marca.
          </p>
        </motion.div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona" className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-16">
            <p className="section-label mb-4">Como Funciona</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>
              Você vende. Seu cliente usa.{" "}
              <span style={{ color: GREEN }}>Você recebe todos os meses.</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {HOW.map(({ n, title, desc }, i) => (
              <motion.div key={n} {...fadeF(i * 0.1)} className="relative rounded-[20px] p-6"
                style={{ background: `linear-gradient(180deg, ${CARD} 0%, ${BG2} 100%)`, border: `1px solid ${BORDER}` }}>
                <p className="font-extrabold mb-4 leading-none tracking-tighter"
                  style={{ fontSize: 48, background: `linear-gradient(135deg, ${GREEN}40, ${BLUE}40)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {n}
                </p>
                <p className="text-sm font-bold mb-1.5" style={{ color: WHITE }}>{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{desc}</p>
                {i < HOW.length - 1 && (
                  <div className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight size={14} style={{ color: `${GREEN}40` }} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SIMULADOR MRR ── */}
      <section className="py-20 px-6">
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade} className="text-center mb-10">
            <p className="section-label mb-4">Simulador de Recorrência</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              Veja o potencial da{" "}
              <span style={{ color: GREEN }}>sua operação</span>
            </h2>
          </motion.div>
          <motion.div {...fadeF(0.15)}>
            <MRRCalculator />
          </motion.div>
        </div>
      </section>

      {/* ── DIFERENCIAL TÉCNICO ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-16">
            <p className="section-label mb-4">Muito além de um CRM comum</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>
              Diferenciais que{" "}
              <span style={{ color: GREEN }}>seus clientes vão sentir</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fadeF(i * 0.08)} className="rounded-[20px] p-7"
                style={{ background: `linear-gradient(180deg, ${CARD} 0%, ${BG2} 100%)`, border: `1px solid ${BORDER}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: `${GREEN}12` }}>
                  <Icon size={20} style={{ color: GREEN }} />
                </div>
                <p className="text-base font-bold mb-2" style={{ color: WHITE }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Tech pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TECH.map(({ icon: Icon, label, sub }, i) => (
              <motion.div key={label} {...fadeF(i * 0.06)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <Icon size={16} style={{ color: BLUE }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: WHITE }}>{label}</p>
                  <p className="text-[10px]" style={{ color: "#4B5563" }}>{sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHITE-LABEL ANTES/DEPOIS ── */}
      <section className="py-20 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <p className="section-label mb-4">White-Label Real</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              Seu cliente compra da{" "}
              <span style={{ color: GREEN }}>sua marca.</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div {...fade} className="rounded-[20px] p-6" style={{ background: CARD, border: "1px solid rgba(239,68,68,0.12)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#F87171" }}>Sem white-label</p>
              {["Logo de terceiro", "URL genérica", "Visual padrão", "Pouca credibilidade", "Cliente desconfiante"].map(i => (
                <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#EF4444" }} />
                  <span className="text-sm" style={{ color: MUTED }}>{i}</span>
                </div>
              ))}
            </motion.div>
            <motion.div {...fadeF(0.15)} className="rounded-[20px] p-6" style={{ background: `linear-gradient(180deg, rgba(34,197,94,0.07), ${CARD})`, border: `1px solid ${GREEN}20` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: GREEN }}>Com Liberty Parceiro</p>
              {["Sua logo no topo", "Seu domínio próprio", "Suas cores e identidade", "Máxima credibilidade", "Experiência exclusiva"].map(i => (
                <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: `1px solid rgba(34,197,94,0.1)` }}>
                  <CheckCircle size={14} style={{ color: GREEN }} />
                  <span className="text-sm font-medium" style={{ color: WHITE }}>{i}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PARA QUEM É ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1000px] mx-auto text-center">
          <motion.div {...fade}>
            <p className="section-label mb-4">Para Quem É</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-12" style={{ fontSize: "clamp(36px, 4vw, 52px)" }}>
              Perfeito para:
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {TARGETS.map(t => (
                <span key={t} className="px-5 py-2.5 rounded-full text-sm font-semibold"
                  style={{ background: CARD, border: `1px solid ${BORDER}`, color: "#CBD5E1" }}>
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,197,94,0.08), transparent 70%)`,
        }} />
        <motion.div {...fade} className="relative max-w-[700px] mx-auto text-center">
          <div className="rounded-[28px] p-12 md:p-16" style={{
            background: `linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(59,130,246,0.05) 100%)`,
            border: `1px solid rgba(34,197,94,0.15)`,
          }}>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-6"
              style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Construa sua{" "}
              <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                recorrência hoje
              </span>
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: MUTED }}>
              Você cuida dos clientes. A Liberty cuida da tecnologia.
            </p>
            <Link href="/signup"
              className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-base transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`,
                color: WHITE,
                boxShadow: `0 0 50px rgba(34,197,94,0.3)`,
              }}>
              QUERO VIRAR PARCEIRO <ArrowRight size={18} />
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
              {["Trial gratuito", "Sem cartão de crédito", "Suporte incluso"].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={13} style={{ color: GREEN }} />
                  <span className="text-xs" style={{ color: "#64748B" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FAQ SEO ── */}
      <section className="py-20 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[700px] mx-auto">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] mb-8" style={{ color: WHITE }}>Perguntas Frequentes</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 16 }}>
                <p className="text-sm font-bold mb-1.5" style={{ color: WHITE }}>{q}</p>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
