"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { NavBar } from "@/components/marketing/NavBar";
import { Footer } from "@/components/marketing/Footer";
import {
  ArrowRight, CheckCircle, Bot, MessageSquare, BarChart2,
  Workflow, Users, Globe, ShieldCheck, Layers, Mic,
  Building2, Home, Stethoscope, ShoppingBag, Briefcase, GraduationCap
} from "lucide-react";

// ─── Design Tokens Opus (Luxury Dark) ───
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

// ─── Mockup Premium do CRM do cliente ───
function OpusMockup() {
  return (
    <div className="relative w-full max-w-[520px]">
      <div className="rounded-[24px] overflow-hidden" style={{
        background: `linear-gradient(180deg, #131B2A 0%, #0C1422 100%)`,
        border: "1px solid rgba(214,179,106,0.15)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(214,179,106,0.08)",
      }}>
        {/* Header com marca do cliente */}
        <div className="px-5 h-12 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(214,179,106,0.1)", background: "#0D1526" }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${CHAMP}, ${GOLD})` }}>
            <span className="text-[8px] font-black" style={{ color: "#000" }}>A</span>
          </div>
          <span className="text-xs font-bold" style={{ color: WHITE }}>Aurora Clinic</span>
          <div className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${CHAMP}12`, color: CHAMP, border: `1px solid ${CHAMP}25` }}>
            100% white-label
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Atendimentos", value: "248", color: BLUE_L },
              { label: "Agendamentos", value: "67", color: CHAMP },
              { label: "Taxa IA", value: "94%", color: "#4ADE80" },
            ].map(m => (
              <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}18` }}>
                <p className="text-xl font-extrabold" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] mt-0.5" style={{ color: SOFT }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* WhatsApp chat preview */}
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={12} style={{ color: "#4ADE80" }} />
              <span className="text-[10px] font-bold" style={{ color: "#4ADE80" }}>WhatsApp IA ativo</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-end">
                <div className="px-3 py-1.5 rounded-xl text-[10px]" style={{ background: "#1E3A2F", color: "#86EFAC", maxWidth: "80%" }}>
                  Qual o valor da consulta?
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${CHAMP}20` }}>
                  <Bot size={9} style={{ color: CHAMP }} />
                </div>
                <div className="px-3 py-1.5 rounded-xl text-[10px]" style={{ background: "#1C1F2E", color: MUTED, maxWidth: "85%" }}>
                  A consulta inicial é R$180. Posso agendar para você agora?
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline mini */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: SOFT }}>Pipeline — Aurora Clinic</p>
            <div className="flex gap-1.5">
              {[{ l: "Novo", n: 8, c: BLUE_L }, { l: "Consulta", n: 5, c: CHAMP }, { l: "Retorno", n: 12, c: "#4ADE80" }].map(p => (
                <div key={p.l} className="flex-1 rounded-lg py-2 text-center" style={{ background: `${p.c}10`, border: `1px solid ${p.c}20` }}>
                  <p className="text-base font-extrabold" style={{ color: p.c }}>{p.n}</p>
                  <p className="text-[8px]" style={{ color: SOFT }}>{p.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-5 -right-5 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: `linear-gradient(135deg, ${CARD}, ${BG2})`, border: `1px solid ${CHAMP}25`, boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${CHAMP}10` }}>
        <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: SOFT }}>Visibilidade</p>
        <p className="text-base font-extrabold" style={{ color: CHAMP }}>100% invisível</p>
        <p className="text-[9px]" style={{ color: SOFT }}>Sem menção à Liberty</p>
      </motion.div>

      <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute -bottom-5 -left-5 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: `linear-gradient(135deg, ${CARD}, ${BG2})`, border: `1px solid ${BLUE}30`, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: SOFT }}>IA treinada</p>
        <p className="text-base font-extrabold" style={{ color: BLUE_L }}>Setup completo</p>
        <p className="text-[9px]" style={{ color: SOFT }}>Configurado para você</p>
      </motion.div>
    </div>
  );
}

const SETUP_CARDS = [
  { icon: Globe, title: "Identidade visual", desc: "Logo, cores, domínio e interface personalizada." },
  { icon: MessageSquare, title: "WhatsApp", desc: "Conexão e configuração dos canais de atendimento." },
  { icon: Bot, title: "Agente de IA", desc: "Treinamento com produtos, preços e objeções." },
  { icon: BarChart2, title: "Pipeline comercial", desc: "Etapas personalizadas para seu processo de vendas." },
  { icon: Workflow, title: "Fluxos automáticos", desc: "Boas-vindas, qualificação e follow-up automático." },
  { icon: Users, title: "Equipe", desc: "Usuários, permissões e roteamento inteligente." },
];

const IA_ITEMS = [
  "entende contexto da conversa,",
  "possui memória das interações,",
  "aprende com documentos e PDFs,",
  "interpreta mensagens de áudio,",
  "responde com voz humanizada,",
  "transfere para humanos quando necessário.",
];

const STEPS = [
  { n: "01", title: "Diagnóstico", desc: "Entendemos sua operação, processo e equipe." },
  { n: "02", title: "Personalização visual", desc: "Aplicamos logo, cores, domínio e identidade." },
  { n: "03", title: "Configuração WhatsApp", desc: "Conectamos e configuramos os canais." },
  { n: "04", title: "Treinamento da IA", desc: "IA aprende com seus produtos, preços e objeções." },
  { n: "05", title: "Criação dos fluxos", desc: "Automações de atendimento personalizadas." },
  { n: "06", title: "Treinamento da equipe", desc: "Seus colaboradores aprendem a usar o sistema." },
  { n: "07", title: "Go Live", desc: "Sua operação entra no ar, 100% com sua marca." },
];

const NICHES = [
  { icon: Stethoscope, name: "Clínicas", desc: "Agendamento, triagem e follow-up automático." },
  { icon: Home, name: "Imobiliárias", desc: "Captação, qualificação e distribuição de leads." },
  { icon: Building2, name: "Agências", desc: "Atendimento, leads e automação de clientes." },
  { icon: ShoppingBag, name: "E-commerces", desc: "Atendimento, recuperação e campanhas." },
  { icon: Briefcase, name: "Consultores", desc: "Qualificação e gestão de prospects." },
  { icon: GraduationCap, name: "Infoprodutores", desc: "Vendas, suporte e comunidade integrados." },
  { icon: Users, name: "Times comerciais", desc: "Pipeline, metas e atendimento centralizado." },
  { icon: MessageSquare, name: "Operações WhatsApp", desc: "Atendimento em escala com IA." },
];

const FAQ = [
  { q: "O CRM fica com minha marca?", a: "Sim. White-label completo — logo, domínio e cores." },
  { q: "A Liberty CRM aparece em algum lugar?", a: "Não. Nenhuma menção à Liberty CRM. A experiência é 100% da sua empresa." },
  { q: "A IA responde WhatsApp?", a: "Sim, 24h por dia. Transfere para humano quando necessário." },
  { q: "A IA aprende com meus documentos?", a: "Sim. PDF, site, tabela de preços — tudo vira conhecimento da IA." },
  { q: "Vocês fazem o setup completo?", a: "Sim. Desde a identidade visual até o treinamento da equipe." },
  { q: "Preciso de equipe técnica?", a: "Não. Cuidamos de tudo no onboarding." },
  { q: "Posso usar meu domínio próprio?", a: "Sim. Seu cliente acessa pelo seu endereço." },
  { q: "Qual o investimento?", a: "Setup a partir de R$2.000 + manutenção mensal. Falamos em detalhes na apresentação." },
];

export default function OpusPage() {
  return (
    <main style={{ background: BG, color: WHITE, fontFamily: "var(--font-sans)", overflowX: "hidden" }}>
      <NavBar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16 px-6 md:px-12">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle at 65% 25%, rgba(214,179,106,0.12), transparent 38%), radial-gradient(circle at 30% 70%, rgba(37,99,235,0.1), transparent 40%)`,
        }} />

        <div className="relative max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center py-20">
          {/* Left */}
          <motion.div {...fade()}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-bold uppercase tracking-widest"
              style={{ background: `${CHAMP}10`, border: `1px solid ${CHAMP}22`, color: CHAMP }}>
              <ShieldCheck size={11} /> CRM EXCLUSIVO COM IA E WHATSAPP
            </div>
            <h1 className="font-extrabold leading-[0.98] tracking-[-0.05em] mb-6"
              style={{ fontSize: "clamp(48px, 6vw, 92px)" }}>
              Seu CRM.<br />Sua Marca.<br />
              <span style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Sua Operação.
              </span>
            </h1>
            <p className="text-lg md:text-xl mb-10 leading-relaxed" style={{ color: MUTED, maxWidth: 500 }}>
              Uma estrutura premium com IA, WhatsApp e automações personalizadas para sua empresa operar vendas e atendimento como uma grande operação tecnológica.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <Link href="mailto:contato@libertycrm.com.br?subject=Liberty Opus"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2, ${GOLD})`,
                  color: BG2,
                  boxShadow: `0 0 50px rgba(214,179,106,0.2)`,
                }}>
                Agendar apresentação <ArrowRight size={18} />
              </Link>
              <Link href="#estrutura"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: WHITE }}>
                Ver estrutura do Opus
              </Link>
            </div>
            <div className="flex flex-wrap gap-5">
              {["Setup completo", "White-label invisível", "IA treinada"].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-sm" style={{ color: SOFT }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: CHAMP }} />{t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right — Mockup */}
          <motion.div {...fade(0.2)} className="flex justify-center lg:justify-end">
            <OpusMockup />
          </motion.div>
        </div>
      </section>

      {/* ── POSICIONAMENTO MANIFESTO ── */}
      <section className="py-28 px-6 text-center relative" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 50% 60% at 50% 50%, rgba(214,179,106,0.05), transparent 70%)`,
        }} />
        <motion.div {...fade()} className="relative max-w-[860px] mx-auto">
          <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-8"
            style={{ fontSize: "clamp(32px, 4.5vw, 64px)" }}>
            Você não precisa usar o{" "}
            <span style={{ color: SILVER }}>CRM de outra empresa.</span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: MUTED }}>
            Com Liberty Opus, sua empresa recebe uma estrutura totalmente personalizada com sua marca, seu domínio, sua identidade visual, seus fluxos e sua operação.
            Como se o sistema tivesse sido desenvolvido exclusivamente para você.
            <br /><br />
            <strong style={{ color: WHITE }}>Sem aparência genérica. Sem limitações de plataformas comuns.</strong>
          </p>
        </motion.div>
      </section>

      {/* ── ANTES / DEPOIS ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="section-label mb-4">Transformação</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Antes e depois da{" "}
              <span style={{ color: CHAMP }}>sua operação</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div {...fade()} className="rounded-[24px] p-7" style={{ background: CARD, border: "1px solid rgba(239,68,68,0.1)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: "#F87171" }}>Antes</p>
              {["WhatsApp desorganizado", "Planilhas soltas", "Leads perdidos", "Atendimento manual", "Sem visão da equipe", "Sem follow-up"].map(i => (
                <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#EF4444", opacity: 0.6 }} />
                  <span className="text-sm" style={{ color: MUTED }}>{i}</span>
                </div>
              ))}
            </motion.div>
            <motion.div {...fade(0.15)} className="rounded-[24px] p-7" style={{
              background: `linear-gradient(180deg, rgba(214,179,106,0.06), ${CARD})`,
              border: `1px solid ${CHAMP}20`,
            }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: CHAMP }}>Com Liberty Opus</p>
              {["CRM com sua marca", "IA atendendo 24h", "Pipeline organizado", "Equipe roteada", "Dashboard executivo", "Follow-up automático"].map(i => (
                <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid rgba(214,179,106,0.1)` }}>
                  <CheckCircle size={14} style={{ color: CHAMP }} />
                  <span className="text-sm font-medium" style={{ color: WHITE }}>{i}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── A TECNOLOGIA DESAPARECE ── */}
      <section className="py-24 px-6" style={{ background: BG_BLUE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[800px] mx-auto text-center">
          <motion.div {...fade()}>
            <p className="section-label mb-5">White-Label Invisível</p>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-10"
              style={{ fontSize: "clamp(32px, 4.5vw, 60px)" }}>
              A tecnologia desaparece.<br />
              <span style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Sua marca aparece.
              </span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {["Seu domínio", "Sua identidade", "Sua comunicação", "Sua operação"].map(i => (
              <motion.div key={i} {...fade(0.1)} className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl"
                style={{ background: `${CHAMP}07`, border: `1px solid ${CHAMP}18` }}>
                <CheckCircle size={16} style={{ color: CHAMP }} />
                <span className="text-xs font-semibold text-center" style={{ color: WHITE }}>{i}</span>
              </motion.div>
            ))}
          </div>
          <div className="px-6 py-4 rounded-2xl" style={{ background: `${CHAMP}06`, border: `1px solid ${CHAMP}15` }}>
            <p className="text-base font-bold" style={{ color: CHAMP }}>
              Sem qualquer menção à Liberty CRM. Uma experiência completamente exclusiva.
            </p>
          </div>
        </div>
      </section>

      {/* ── O QUE É CONFIGURADO ── */}
      <section id="estrutura" className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="section-label mb-4">O Que Você Recebe</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Tudo configurado para{" "}
              <span style={{ color: CHAMP }}>sua operação</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SETUP_CARDS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fade(i * 0.08)} className="rounded-[20px] p-7"
                style={{ background: `linear-gradient(180deg, ${CARD} 0%, ${BG2} 100%)`, border: `1px solid ${BORDER}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: `${CHAMP}10` }}>
                  <Icon size={20} style={{ color: CHAMP }} />
                </div>
                <p className="text-base font-bold mb-2" style={{ color: WHITE }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IA REAL ── */}
      <section className="py-28 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div {...fade()}>
            <p className="section-label mb-4">Inteligência Artificial</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-8"
              style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Não é{" "}
              <span style={{ color: CHAMP }}>chatbot simples</span>
            </h2>
            <p className="text-lg mb-6" style={{ color: MUTED }}>A IA da Liberty Opus:</p>
            <div className="space-y-3">
              {IA_ITEMS.map(i => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: CHAMP }} />
                  <p className="text-base font-medium" style={{ color: WHITE }}>{i}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* WhatsApp mockup */}
          <motion.div {...fade(0.15)}>
            <div className="rounded-[20px] overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#0D1526", borderBottom: `1px solid ${BORDER}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${CHAMP}20` }}>
                  <Bot size={14} style={{ color: CHAMP }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: WHITE }}>Assistente</p>
                  <p className="text-[10px]" style={{ color: "#4ADE80" }}>online</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { from: "client", text: "Qual o valor do plano premium?" },
                  { from: "ai", text: "O plano premium inclui automação, pipeline e suporte completo. Posso mostrar a melhor opção para sua operação?" },
                  { from: "client", text: "Quanto custa por mês?" },
                  { from: "ai", text: "A mensalidade começa em R$297. Quer agendar uma apresentação rápida para entender o que encaixa melhor?" },
                ].map((m, i) => (
                  <div key={i} className={`flex ${m.from === "client" ? "justify-end" : "justify-start gap-2"}`}>
                    {m.from === "ai" && (
                      <div className="w-6 h-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center" style={{ background: `${CHAMP}18` }}>
                        <Bot size={10} style={{ color: CHAMP }} />
                      </div>
                    )}
                    <div className="px-3 py-2 rounded-xl text-xs max-w-[80%] leading-relaxed"
                      style={m.from === "client"
                        ? { background: "#1E3A2F", color: "#86EFAC" }
                        : { background: "#1C1F2E", color: MUTED }}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="section-label mb-4">Implementação</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Feito{" "}
              <span style={{ color: CHAMP }}>com você</span>
              , do início ao fim
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {STEPS.map(({ n, title, desc }, i) => (
              <motion.div key={n} {...fade(i * 0.07)} className="relative rounded-[18px] p-5"
                style={{ background: `linear-gradient(180deg, ${CARD} 0%, ${BG2} 100%)`, border: `1px solid ${BORDER}` }}>
                <p className="font-extrabold mb-3 leading-none tracking-tighter"
                  style={{ fontSize: 40, background: `linear-gradient(135deg, ${CHAMP}35, ${BLUE}35)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {n}
                </p>
                <p className="text-xs font-bold mb-1" style={{ color: WHITE }}>{title}</p>
                <p className="text-[10px] leading-relaxed" style={{ color: SOFT }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CASOS DE USO ── */}
      <section className="py-28 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1000px] mx-auto text-center">
          <motion.div {...fade()} className="mb-16">
            <p className="section-label mb-4">Ideal Para</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Empresas que querem profissionalizar{" "}
              <span style={{ color: CHAMP }}>atendimento e vendas</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {NICHES.map(({ icon: Icon, name, desc }, i) => (
              <motion.div key={name} {...fade(i * 0.06)} className="rounded-[18px] p-5 text-left"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${CHAMP}08` }}>
                  <Icon size={18} style={{ color: CHAMP, opacity: 0.8 }} />
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: WHITE }}>{name}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: SOFT }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 50% 60% at 50% 50%, rgba(214,179,106,0.07), transparent 70%)`,
        }} />
        <motion.div {...fade()} className="relative max-w-[700px] mx-auto text-center">
          <div className="rounded-[32px] p-12 md:p-16" style={{
            background: `linear-gradient(135deg, rgba(214,179,106,0.06), rgba(37,99,235,0.04))`,
            border: `1px solid ${CHAMP}15`,
          }}>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-6"
              style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Sua empresa merece uma{" "}
              <span style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                estrutura feita para ela
              </span>
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: MUTED }}>
              Agende uma apresentação e descubra como ter um CRM com IA totalmente personalizado para sua operação.
            </p>
            <Link href="mailto:contato@libertycrm.com.br?subject=Liberty Opus - Agendar Apresentação"
              className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-base transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2, ${GOLD})`,
                color: BG2,
                boxShadow: `0 0 50px rgba(214,179,106,0.22)`,
              }}>
              AGENDAR DEMONSTRAÇÃO <ArrowRight size={18} />
            </Link>
            <p className="mt-6 text-xs" style={{ color: SOFT }}>
              Setup completo a partir de R$2.000 • Manutenção mensal sob demanda
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
              {["White-label completo", "Setup incluso", "Sem equipe técnica"].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={13} style={{ color: CHAMP }} />
                  <span className="text-xs" style={{ color: SOFT }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FAQ ── */}
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
