"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { NavBar } from "@/components/marketing/NavBar";
import { Footer } from "@/components/marketing/Footer";
import {
  ArrowRight, CheckCircle, Bot, MessageSquare, BarChart2,
  Workflow, Users, Globe, ShieldCheck, Layers,
  Building2, Home, Stethoscope, ShoppingBag, Briefcase, GraduationCap,
  FileText, Database, Key, TrendingUp, Cpu
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

// ─── Mockup Premium "Atlas Sales OS" ───
function OpusMockup() {
  return (
    <div className="relative w-full max-w-[560px]">
      <div className="rounded-[24px] overflow-hidden" style={{
        background: `linear-gradient(180deg, #141B2A 0%, #0C1321 100%)`,
        border: `1px solid rgba(214,179,106,0.18)`,
        boxShadow: "0 60px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(214,179,106,0.08)",
      }}>
        {/* Login bar style */}
        <div className="px-5 h-11 flex items-center gap-3" style={{ borderBottom: `1px solid rgba(214,179,106,0.1)`, background: "#0D1526" }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs" style={{ background: `linear-gradient(135deg, ${CHAMP}, ${GOLD})`, color: "#000" }}>A</div>
          <span className="text-xs font-bold" style={{ color: WHITE }}>Atlas Sales OS</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] font-mono" style={{ color: SOFT }}>atlas.vendas.com</span>
            <div className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${CHAMP}12`, color: CHAMP, border: `1px solid ${CHAMP}20` }}>100% white-label</div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Revenue metrics */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Oportunidades", value: "R$340k", color: CHAMP },
              { label: "Conversões", value: "38%", color: BLUE_L },
              { label: "IA ativa", value: "97%", color: "#4ADE80" },
            ].map(m => (
              <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}15` }}>
                <p className="text-lg font-extrabold leading-none" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] mt-1" style={{ color: SOFT }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue graph mockup */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SOFT }}>Receita mensal</p>
              <span className="text-[9px] font-bold" style={{ color: CHAMP }}>▲ +31% vs mês anterior</span>
            </div>
            <div className="flex items-end gap-1.5 h-10">
              {[25, 38, 45, 52, 48, 65, 72, 80].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm" style={{
                  height: `${h}%`,
                  background: i === 7 ? `linear-gradient(180deg, ${CHAMP}, ${GOLD})` : `${CHAMP}25`,
                  boxShadow: i === 7 ? `0 0 8px ${CHAMP}40` : "none",
                }} />
              ))}
            </div>
          </div>

          {/* Pipeline */}
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: SOFT }}>Pipeline — Atlas Sales</p>
            <div className="flex gap-1.5">
              {[
                { l: "Lead", n: 12, c: BLUE_L },
                { l: "Proposta", n: 7, c: CHAMP },
                { l: "Negoc.", n: 4, c: "#F97316" },
                { l: "Ganho", n: 15, c: "#4ADE80" },
              ].map(p => (
                <div key={p.l} className="flex-1 rounded-lg py-2 text-center" style={{ background: `${p.c}10`, border: `1px solid ${p.c}20` }}>
                  <p className="text-sm font-extrabold" style={{ color: p.c }}>{p.n}</p>
                  <p className="text-[8px]" style={{ color: SOFT }}>{p.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* IA card */}
          <div className="rounded-xl p-3 flex items-start gap-3" style={{ background: `${CHAMP}06`, border: `1px solid ${CHAMP}18` }}>
            <Bot size={13} style={{ color: CHAMP, marginTop: 2 }} />
            <div className="flex-1">
              <p className="text-[10px] font-bold mb-0.5" style={{ color: CHAMP }}>Atlas IA respondendo</p>
              <p className="text-[9px]" style={{ color: SOFT }}>"Olá! Analisei seu histórico e tenho 3 oportunidades para você hoje."</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}
        className="absolute -top-5 -right-5 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: `linear-gradient(135deg, ${CARD}, ${BG2})`, border: `1px solid ${CHAMP}22`, backdropFilter: "blur(16px)", boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${CHAMP}08` }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SOFT }}>Visibilidade</p>
        <p className="text-base font-extrabold" style={{ color: CHAMP }}>100% invisível</p>
        <p className="text-[9px]" style={{ color: SOFT }}>Sem menção à Liberty</p>
      </motion.div>

      <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1.5 }}
        className="absolute -bottom-5 -left-5 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: `linear-gradient(135deg, ${CARD}, ${BG2})`, border: `1px solid ${BLUE}25`, backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SOFT }}>IA treinada</p>
        <p className="text-base font-extrabold" style={{ color: BLUE_L }}>Setup completo</p>
        <p className="text-[9px]" style={{ color: SOFT }}>Para sua operação</p>
      </motion.div>
    </div>
  );
}

const SETUP_CARDS = [
  { icon: Globe, title: "Identidade visual", desc: "Logo, cores, domínio e interface personalizada." },
  { icon: MessageSquare, title: "WhatsApp", desc: "Conexão e configuração dos canais de atendimento." },
  { icon: Bot, title: "Agente de IA", desc: "Treinamento com produtos, preços e objeções." },
  { icon: BarChart2, title: "Pipeline comercial", desc: "Etapas personalizadas para seu processo de vendas." },
  { icon: Workflow, title: "Fluxos automáticos", desc: "Boas-vindas, qualificação e follow-up." },
  { icon: Users, title: "Equipe", desc: "Usuários, permissões e roteamento inteligente." },
];

const MONTAMOS_CARDS = [
  { n: "01", icon: Cpu, title: "Diagnóstico da operação", desc: "Mapeamos seu processo, gargalos e oportunidades." },
  { n: "02", icon: TrendingUp, title: "Mapeamento do funil", desc: "Definimos as etapas ideais para sua venda." },
  { n: "03", icon: Bot, title: "Treinamento da IA", desc: "Alimentamos a IA com seus produtos, preços e objeções." },
  { n: "04", icon: MessageSquare, title: "Configuração do WhatsApp", desc: "Conectamos e testamos todos os canais." },
  { n: "05", icon: Workflow, title: "Criação dos fluxos", desc: "Automações personalizadas para seu negócio." },
  { n: "06", icon: Users, title: "Implantação com equipe", desc: "Treinamos cada membro do seu time." },
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
  { q: "Qual o investimento?", a: "Setup a partir de R$2.000 + manutenção mensal. Detalhamos na apresentação." },
];

export default function OpusPage() {
  return (
    <main style={{ background: BG, color: WHITE, fontFamily: "var(--font-sans)", overflowX: "hidden" }}>
      <NavBar hideCTA />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16 px-6 md:px-12">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle at 65% 25%, rgba(214,179,106,0.12), transparent 38%), radial-gradient(circle at 30% 70%, rgba(37,99,235,0.1), transparent 40%)`,
        }} />
        <div className="relative max-w-[1260px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-20">
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
            <div className="flex flex-wrap gap-4 mb-10">
              <Link href="mailto:contato@libertycrm.com.br?subject=Liberty Opus"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2, ${GOLD})`, color: BG2, boxShadow: `0 0 50px rgba(214,179,106,0.2)` }}>
                Agendar apresentação <ArrowRight size={18} />
              </Link>
              <Link href="#estrutura" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: WHITE }}>
                Ver estrutura do Opus
              </Link>
            </div>
            {/* White-label badges */}
            <div className="flex flex-wrap gap-2">
              {["✓ Domínio próprio", "✓ Login personalizado", "✓ Dashboard com sua marca", "✓ Sem menção à Liberty", "✓ IA treinada"].map(t => (
                <span key={t} className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: `${CHAMP}08`, border: `1px solid ${CHAMP}18`, color: CHAMP }}>
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div {...fade(0.2)} className="flex flex-col items-center lg:items-end gap-4">
            <OpusMockup />
          </motion.div>
        </div>
      </section>

      {/* ── POSICIONAMENTO ── */}
      <section className="py-28 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[860px] mx-auto text-center">
          <motion.div {...fade()}>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-8"
              style={{ fontSize: "clamp(36px, 5vw, 80px)" }}>
              Você não precisa usar o{" "}
              <span style={{ color: SILVER }}>CRM de outra empresa.</span>
            </h2>
            <p className="text-lg leading-relaxed" style={{ color: MUTED }}>
              Com Liberty Opus, sua empresa recebe uma estrutura totalmente personalizada com sua marca, domínio e identidade visual.
              Como se o sistema tivesse sido desenvolvido exclusivamente para você.
              <br /><br />
              <strong style={{ color: WHITE }}>Sem aparência genérica. Sem limitações de plataformas comuns.</strong>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── ANTES/DEPOIS COM CONTRASTE ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="section-label mb-4">Transformação</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Antes e depois da <span style={{ color: CHAMP }}>sua operação</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ANTES — caótico, apagado */}
            <motion.div {...fade()} className="rounded-[24px] p-7 relative overflow-hidden"
              style={{ background: "#0A0B0D", border: "1px solid rgba(239,68,68,0.08)" }}>
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(45deg, #FF0000 0px, #FF0000 1px, transparent 1px, transparent 10px)" }} />
              <p className="text-xs font-bold uppercase tracking-wider mb-5 relative" style={{ color: "#F87171" }}>Como está agora</p>
              {[
                { t: "WhatsApp pessoal desorganizado", s: "Mensagens perdidas" },
                { t: "Planilhas soltas", s: "Dados inconsistentes" },
                { t: "Leads sem follow-up", s: "Dinheiro na mesa" },
                { t: "Atendimento manual", s: "Time sobrecarregado" },
                { t: "Sem visão da equipe", s: "Zero controle" },
                { t: "Processos no papel", s: "Ineficiência constante" },
              ].map(item => (
                <div key={item.t} className="flex items-start gap-2.5 py-2 relative" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#EF4444", opacity: 0.5 }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "#71717A" }}>{item.t}</p>
                    <p className="text-[10px]" style={{ color: "#374151" }}>{item.s}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* DEPOIS — premium, iluminado */}
            <motion.div {...fade(0.15)} className="rounded-[24px] p-7 relative overflow-hidden"
              style={{
                background: `linear-gradient(180deg, rgba(214,179,106,0.06), ${CARD})`,
                border: `1px solid ${CHAMP}25`,
                boxShadow: `0 0 60px rgba(214,179,106,0.08)`,
              }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: CHAMP }}>Com Liberty Opus</p>
              {[
                { t: "CRM com sua marca", s: "Identidade profissional" },
                { t: "IA atendendo 24h", s: "Nunca perde um lead" },
                { t: "Pipeline organizado", s: "Visão clara do funil" },
                { t: "Equipe roteada", s: "Cada lead no lugar certo" },
                { t: "Dashboard executivo", s: "Decisões com dados" },
                { t: "Automação de follow-up", s: "Receita previsível" },
              ].map(item => (
                <div key={item.t} className="flex items-start gap-2.5 py-2.5" style={{ borderBottom: `1px solid rgba(214,179,106,0.08)` }}>
                  <CheckCircle size={14} style={{ color: CHAMP, marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: WHITE }}>{item.t}</p>
                    <p className="text-[10px]" style={{ color: SOFT }}>{item.s}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── A TECNOLOGIA DESAPARECE (cinematográfico) ── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: BG_BLUE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <p className="font-extrabold select-none" style={{ fontSize: "clamp(80px,15vw,200px)", color: `${CHAMP}04`, letterSpacing: "-0.05em" }}>INVISÍVEL</p>
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 50% 60% at 50% 50%, rgba(214,179,106,0.05), transparent 70%)` }} />

        <div className="relative max-w-[800px] mx-auto text-center">
          <motion.div {...fade()}>
            <p className="section-label mb-5">White-Label Total</p>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-12"
              style={{ fontSize: "clamp(32px, 4.5vw, 60px)" }}>
              A tecnologia desaparece.<br />
              <span style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Sua marca aparece.
              </span>
            </h2>
          </motion.div>

          {/* Orbital layout */}
          <div className="relative flex items-center justify-center mb-10">
            {/* Center brand */}
            <motion.div {...fade(0.1)} className="relative z-10 w-20 h-20 rounded-2xl flex flex-col items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${CHAMP}18, ${GOLD}12)`, border: `2px solid ${CHAMP}30`, boxShadow: `0 0 40px ${CHAMP}15` }}>
              <p className="text-2xl font-extrabold" style={{ color: CHAMP }}>A</p>
              <p className="text-[8px] font-bold" style={{ color: SOFT }}>Atlas</p>
            </motion.div>

            {/* Orbital elements */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 rounded-full" style={{ border: `1px dashed ${CHAMP}15` }} />
            </div>
            {[
              { label: "Domínio próprio", deg: 0, icon: Globe },
              { label: "Login personalizado", deg: 60, icon: Key },
              { label: "WhatsApp com IA", deg: 120, icon: MessageSquare },
              { label: "Pipeline", deg: 180, icon: BarChart2 },
              { label: "Dashboard", deg: 240, icon: TrendingUp },
              { label: "Base de conhecimento", deg: 300, icon: Database },
            ].map(({ label, deg, icon: Icon }, i) => {
              const rad = (deg - 90) * (Math.PI / 180);
              const r = 130;
              const x = Math.cos(rad) * r;
              const y = Math.sin(rad) * r;
              return (
                <motion.div key={label} {...fade(i * 0.08)}
                  className="absolute flex flex-col items-center gap-1"
                  style={{ transform: `translate(${x}px, ${y}px)` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${CHAMP}10`, border: `1px solid ${CHAMP}20` }}>
                    <Icon size={14} style={{ color: CHAMP, opacity: 0.8 }} />
                  </div>
                  <p className="text-[9px] font-bold text-center whitespace-nowrap" style={{ color: MUTED, maxWidth: 70 }}>{label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Liberty invisible note */}
          <motion.div {...fade(0.3)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs" style={{ color: SOFT }}>
              Liberty CRM <span style={{ opacity: 0.3 }}>— invisível nos bastidores</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── MONTAMOS SUA OPERAÇÃO ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="section-label mb-4">Nossa Entrega</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 56px)" }}>
              Não instalamos um CRM.<br />
              <span style={{ color: CHAMP }}>Montamos sua operação.</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MONTAMOS_CARDS.map(({ n, icon: Icon, title, desc }, i) => (
              <motion.div key={n} {...fade(i * 0.08)} className="rounded-[20px] p-6"
                style={{ background: `linear-gradient(180deg, ${CARD}, ${BG2})`, border: `1px solid ${BORDER}` }}>
                <div className="flex items-start gap-4">
                  <p className="font-extrabold leading-none shrink-0" style={{ fontSize: 40, background: `linear-gradient(135deg, ${CHAMP}35, ${BLUE}35)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{n}</p>
                  <div>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${CHAMP}10` }}>
                      <Icon size={16} style={{ color: CHAMP }} />
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: WHITE }}>{title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── O QUE VOCÊ RECEBE ── */}
      <section id="estrutura" className="py-28 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade()} className="text-center mb-14">
            <p className="section-label mb-4">O Que Você Recebe</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Tudo configurado para <span style={{ color: CHAMP }}>sua operação</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SETUP_CARDS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fade(i * 0.08)} className="rounded-[20px] p-7"
                style={{ background: `linear-gradient(180deg, ${CARD}, ${BG2})`, border: `1px solid ${BORDER}` }}>
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

      {/* ── IA REAL — chat maior ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div {...fade()}>
            <p className="section-label mb-4">Inteligência Artificial</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-8" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Não é <span style={{ color: CHAMP }}>chatbot simples</span>
            </h2>
            <div className="space-y-3">
              {["entende contexto da conversa,", "possui memória das interações,", "aprende com documentos e PDFs,", "interpreta mensagens de áudio,", "responde com voz humanizada,", "transfere para humanos quando necessário."].map(i => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: CHAMP }} />
                  <p className="text-base font-medium" style={{ color: WHITE }}>{i}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Chat expandido */}
          <motion.div {...fade(0.15)}>
            <div className="rounded-[20px] overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#0D1526", borderBottom: `1px solid ${BORDER}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${CHAMP}20` }}>
                  <Bot size={14} style={{ color: CHAMP }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: WHITE }}>Atlas IA</p>
                  <p className="text-[10px]" style={{ color: "#4ADE80" }}>● online</p>
                </div>
              </div>

              {/* PDF source */}
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: `${CHAMP}08`, border: `1px solid ${CHAMP}15` }}>
                <FileText size={12} style={{ color: CHAMP }} />
                <span className="text-[10px] font-medium" style={{ color: CHAMP }}>Consultando: Tabela de preços 2026.pdf</span>
              </div>

              <div className="p-4 space-y-2.5">
                {[
                  { from: "client", text: "Qual o valor do plano premium?", time: "14:22" },
                  { from: "ai", text: "O plano premium inclui automação completa, pipeline, suporte e relatórios avançados.", time: "14:22" },
                  { from: "client", text: "E tem diferença para o plano básico?", time: "14:23" },
                  { from: "ai", text: "No básico você tem o CRM essencial. No premium, adicionamos IA avançada, integração WhatsApp e relatórios executivos. Posso te mostrar uma comparação?", time: "14:23" },
                  { from: "client", text: "Sim, por favor!", time: "14:24" },
                  { from: "ai", text: "Perfeito! Vou te enviar a comparação completa agora. Para fechar hoje, temos uma condição especial. Quer que eu te conecte com nosso consultor?", time: "14:24" },
                ].map((m, i) => (
                  <div key={i} className={`flex ${m.from === "client" ? "justify-end" : "justify-start gap-1.5"}`}>
                    {m.from === "ai" && (
                      <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center" style={{ background: `${CHAMP}18` }}>
                        <Bot size={9} style={{ color: CHAMP }} />
                      </div>
                    )}
                    <div>
                      <div className="px-2.5 py-1.5 rounded-xl text-[10px] max-w-[85%] leading-relaxed"
                        style={m.from === "client" ? { background: "#1E3A2F", color: "#86EFAC" } : { background: "#1C1F2E", color: MUTED }}>
                        {m.text}
                      </div>
                      <p className="text-[8px] mt-0.5 px-1" style={{ color: "#374151", textAlign: m.from === "client" ? "right" : "left" }}>{m.time}</p>
                    </div>
                  </div>
                ))}

                {/* Transfer button */}
                <div className="flex justify-center pt-1">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
                    style={{ background: `${CHAMP}10`, border: `1px solid ${CHAMP}20`, color: CHAMP }}>
                    <Users size={10} /> Transferir para consultor
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CASOS DE USO ── */}
      <section className="py-28 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1000px] mx-auto text-center">
          <motion.div {...fade()} className="mb-14">
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

      {/* ── CTA FINAL PREMIUM ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 50% 60% at 50% 50%, rgba(214,179,106,0.07), transparent 70%)` }} />
        <motion.div {...fade()} className="relative max-w-[760px] mx-auto text-center">
          <div className="rounded-[32px] p-14 md:p-20" style={{
            background: `linear-gradient(135deg, rgba(214,179,106,0.07), rgba(37,99,235,0.04))`,
            border: `1px solid ${CHAMP}25`,
            boxShadow: `0 0 80px rgba(214,179,106,0.1)`,
          }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: CHAMP, letterSpacing: "0.15em" }}>
              DEMONSTRAÇÃO PERSONALIZADA
            </p>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-6"
              style={{ fontSize: "clamp(36px, 4.5vw, 56px)" }}>
              Sua empresa merece uma{" "}
              <span style={{ background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                estrutura feita para ela
              </span>
            </h2>
            <p className="text-lg mb-3 leading-relaxed" style={{ color: MUTED }}>
              Agende uma análise da sua operação e veja como o Opus pode transformar seu atendimento, vendas e automações em uma estrutura exclusiva com sua marca.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-10 text-sm" style={{ color: SOFT }}>
              {["Diagnóstico gratuito", "Setup completo", "IA treinada", "Suporte dedicado"].map((t, i) => (
                <span key={t} className="flex items-center gap-1.5">
                  {i > 0 && <span style={{ color: `${CHAMP}40` }}>•</span>}
                  <CheckCircle size={12} style={{ color: CHAMP }} /> {t}
                </span>
              ))}
            </div>
            <Link href="mailto:contato@libertycrm.com.br?subject=Liberty Opus - Agendar"
              className="inline-flex items-center gap-2.5 px-12 py-5 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${CHAMP}, #F4E3B2, ${GOLD})`,
                color: BG2,
                boxShadow: `0 0 60px rgba(214,179,106,0.28)`,
                fontSize: 15,
              }}>
              AGENDAR APRESENTAÇÃO ESTRATÉGICA <ArrowRight size={18} />
            </Link>
            <p className="mt-6 text-xs" style={{ color: SOFT }}>
              Setup completo a partir de R$2.000 • Manutenção mensal sob demanda
            </p>
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
