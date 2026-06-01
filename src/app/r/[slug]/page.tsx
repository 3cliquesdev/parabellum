"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, ArrowRight, Zap, Users, MessageSquare, Bot,
  BarChart2, Megaphone, Workflow, Layers, Database, Plus, Minus,
  TrendingUp, ShieldCheck, Clock, Target, Repeat, Eye
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Design Tokens ───
const BG = "#050608";
const BG2 = "#0B0F14";
const CARD = "#101720";
const BORDER = "rgba(255,255,255,0.08)";
const WHITE = "#F8FAFC";
const MUTED = "#A1A1AA";
const LIGHT = "#CBD5E1";

const fade = { initial: { opacity: 0, y: 32 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true as const }, transition: { duration: 0.6 } };
const fadeF = (delay: number) => ({ ...fade, transition: { duration: 0.6, delay } });

function GrainOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0, opacity: 0.025,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
    }} />
  );
}

// ─── Hero Mockup ───
function HeroMockup({ cor }: { cor: string }) {
  return (
    <div className="relative w-full max-w-[600px]" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ transform: "perspective(1800px) rotateX(3deg) rotateY(-1deg)" }}>
        <div className="rounded-[20px] overflow-hidden" style={{
          background: "linear-gradient(180deg, #0D1526 0%, #080F1C 100%)",
          border: `1px solid rgba(255,255,255,0.1)`,
          boxShadow: `0 60px 120px rgba(0,0,0,0.9), 0 0 80px ${cor}10`,
        }}>
          <div className="px-4 h-10 flex items-center gap-2" style={{ borderBottom: `1px solid ${cor}15`, background: "#060D19" }}>
            <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: cor }}>
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
            </div>
            <span className="text-xs font-bold" style={{ color: WHITE }}>CRM</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${cor}18`, color: cor }}>● IA ativa</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[{ l: "Leads", v: "248", c: cor }, { l: "Conversão", v: "34%", c: "#60a5fa" }, { l: "MRR", v: "R$14k", c: "#4ADE80" }].map(m => (
                <div key={m.l} className="rounded-lg p-2.5 text-center" style={{ background: `${m.c}09`, border: `1px solid ${m.c}18` }}>
                  <p className="text-sm font-extrabold leading-none" style={{ color: m.c }}>{m.v}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>{m.l}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#4B5563" }}>Pipeline</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[{ l: "Novo", n: 8, c: "#60a5fa" }, { l: "Proposta", n: 5, c: "#EAB308" }, { l: "Negoc.", n: 3, c: "#F97316" }, { l: "Ganho", n: 11, c: "#4ADE80" }].map(p => (
                  <div key={p.l} className="rounded text-center py-1.5" style={{ background: `${p.c}10`, border: `1px solid ${p.c}20` }}>
                    <p className="text-xs font-extrabold" style={{ color: p.c }}>{p.n}</p>
                    <p className="text-[8px]" style={{ color: MUTED }}>{p.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg p-2.5" style={{ background: `${cor}07`, border: `1px solid ${cor}18` }}>
              <div className="flex items-center gap-2 mb-1">
                <Bot size={11} style={{ color: cor }} />
                <span className="text-[9px] font-bold" style={{ color: cor }}>IA respondendo</span>
                <div className="flex gap-0.5 ml-auto">{[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: cor, animationDelay: `${i*0.15}s` }} />)}</div>
              </div>
              <p className="text-[9px]" style={{ color: LIGHT }}>"Olá! Entendi sua dúvida. Posso te mostrar a melhor opção?"</p>
            </div>
          </div>
        </div>
      </div>

      {[
        { top: "-top-5 -right-4", txt: ["IA ativa 24h", "Responde automaticamente"], c: cor, delay: 0, dy: [-8, 0] },
        { top: "-bottom-4 -left-4", txt: ["+32% conversões", "Follow-up automático"], c: "#60a5fa", delay: 1, dy: [8, 0] },
        { top: "-top-5 -left-4", txt: ["Pipeline organizado", "Nenhum lead perdido"], c: "#4ADE80", delay: 2, dy: [-7, 0] },
      ].map(({ top, txt, c, delay, dy }) => (
        <motion.div key={txt[0]} animate={{ y: [dy[0], dy[1], dy[0]] }} transition={{ duration: 3.5 + delay, repeat: Infinity }}
          className={`absolute ${top} rounded-2xl px-3 py-2 hidden md:block`}
          style={{ background: "rgba(13,19,32,0.95)", border: `1px solid ${c}25`, backdropFilter: "blur(12px)", boxShadow: `0 8px 24px rgba(0,0,0,0.6)` }}>
          <p className="text-[9px] font-bold" style={{ color: c }}>{txt[0]}</p>
          <p className="text-[9px]" style={{ color: MUTED }}>{txt[1]}</p>
        </motion.div>
      ))}
    </div>
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
          style={{ background: open === i ? `${cor}06` : CARD, border: open === i ? `1px solid ${cor}25` : `1px solid ${BORDER}`, transition: "all 0.2s" }}>
          <button className="w-full flex items-center justify-between px-6 py-4 text-left" onClick={() => setOpen(open === i ? null : i)}>
            <span className="text-sm font-bold" style={{ color: WHITE }}>{q}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-4" style={{ background: open === i ? `${cor}18` : "rgba(255,255,255,0.06)" }}>
              {open === i ? <Minus size={12} style={{ color: cor }} /> : <Plus size={12} style={{ color: MUTED }} />}
            </div>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: LIGHT }}>{a}</p>
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
      <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
      <p className="text-white font-bold text-lg">Link não encontrado</p>
      <Link href="/" className="text-sm" style={{ color: "#9aea62" }}>Voltar ao início</Link>
    </div>
  );

  const cor = agency?.primary_color ?? "#9aea62";
  const nome = agency?.display_name ?? agency?.name ?? "CRM";
  const agId = agency?.id ?? "";
  const signupUrl = `/signup?ref=${slug}&agency=${agId}`;
  const CYCLE_LABEL: Record<string, string> = { mensal: "/mês", trimestral: "/trim.", semestral: "/sem.", anual: "/ano" };
  const middleIdx = Math.floor(plans.length / 2);

  return (
    <main style={{ background: BG, color: WHITE, fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif", overflowX: "hidden" }}>

      {/* ── NAVBAR ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: `1px solid ${BORDER}`, background: "rgba(5,6,8,0.85)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {agency?.logo_url
              ? <img src={agency.logo_url} alt={nome} style={{ height: 26, width: "auto" }} />
              : <div style={{ width: 26, height: 26, borderRadius: 7, background: cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" /></svg>
                </div>
            }
            <span style={{ fontWeight: 700, fontSize: 14, color: WHITE }}>{nome}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href={signupUrl} style={{ padding: "8px 20px", borderRadius: 10, background: cor, color: "#0a0a0a", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center px-6 pt-8 pb-16">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle at 65% 30%, ${cor}14, transparent 40%), radial-gradient(circle at 25% 70%, rgba(59,130,246,0.10), transparent 40%)`,
        }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
          backgroundImage: `linear-gradient(${cor}50 1px, transparent 1px), linear-gradient(90deg, ${cor}50 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        <GrainOverlay />

        <div className="relative max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div {...fade}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-bold"
              style={{ background: `${cor}12`, border: `1px solid ${cor}25`, color: cor }}>
              <Zap size={11} /> 30 dias grátis • sem cartão de crédito
            </div>
            <h1 className="font-extrabold leading-[1.0] tracking-[-0.04em] mb-5"
              style={{ fontSize: "clamp(40px, 5vw, 76px)" }}>
              O CRM que vende{" "}
              <span style={{ background: `linear-gradient(135deg, ${cor}, #60a5fa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                enquanto você dorme
              </span>
            </h1>
            <p className="text-lg md:text-xl mb-8 leading-relaxed" style={{ color: LIGHT, maxWidth: 520 }}>
              Centralize atendimento, pipeline, automações e campanhas em uma plataforma simples e feita para negócios que vendem pelo WhatsApp.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <Link href={signupUrl} className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${cor}, #60a5fa)`, color: "#fff", boxShadow: `0 0 40px ${cor}25`, textDecoration: "none" }}>
                Criar minha conta grátis <ArrowRight size={18} />
              </Link>
              <a href="#funcionalidades" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: WHITE, textDecoration: "none" }}>
                Ver como funciona
              </a>
            </div>
            <p style={{ fontSize: 12, color: MUTED }}>Sem cartão de crédito • Configure em minutos • Cancele quando quiser</p>
          </motion.div>
          <motion.div {...fadeF(0.2)} className="flex justify-center lg:justify-end">
            <HeroMockup cor={cor} />
          </motion.div>
        </div>
      </section>

      {/* ── PROVA RÁPIDA ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: BG2 }}>
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-8">
          {[
            { icon: Megaphone, label: "Pipeline visual" },
            { icon: MessageSquare, label: "WhatsApp com IA" },
            { icon: Workflow, label: "Fluxos automáticos" },
            { icon: BarChart2, label: "Dashboard em tempo real" },
            { icon: Bot, label: "IA 24h" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={14} style={{ color: cor }} />
              <span className="text-sm font-medium" style={{ color: LIGHT }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROBLEMA ── */}
      <section className="py-28 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: cor, letterSpacing: "0.1em" }}>O PROBLEMA</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Seu WhatsApp não foi feito para{" "}
              <span style={{ color: MUTED }}>gerenciar vendas</span>
            </h2>
            <p className="text-lg mt-4 max-w-xl mx-auto" style={{ color: LIGHT }}>
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
              <motion.div key={title} {...fadeF(i * 0.07)} className="rounded-[18px] p-5"
                style={{ background: CARD, border: "1px solid rgba(239,68,68,0.1)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>
                  <Icon size={15} style={{ color: "#F87171" }} />
                </div>
                <p className="text-sm font-bold mb-1.5" style={{ color: WHITE }}>{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div {...fade} className="text-center mt-10">
            <p className="text-lg font-bold" style={{ color: LIGHT }}>
              O problema não é falta de lead.{" "}
              <strong style={{ background: `linear-gradient(135deg, ${cor}, #60a5fa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                É falta de operação.
              </strong>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── VIRADA ── */}
      <section className="py-20 px-6 relative overflow-hidden" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${cor}07, transparent 70%)` }} />
        <motion.div {...fade} className="relative max-w-[800px] mx-auto text-center">
          <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em]" style={{ fontSize: "clamp(32px, 4.5vw, 60px)" }}>
            Pare de improvisar atendimento.{" "}
            <span style={{ background: `linear-gradient(135deg, ${cor}, #60a5fa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Comece a operar vendas.
            </span>
          </h2>
          <p className="text-lg mt-6 leading-relaxed" style={{ color: LIGHT }}>
            Com <strong style={{ color: WHITE }}>{nome}</strong>, seu WhatsApp deixa de ser apenas um canal de conversa e passa a funcionar como uma operação comercial completa: com IA, pipeline, automações, campanhas e relatórios.
          </p>
        </motion.div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: cor, letterSpacing: "0.1em" }}>FUNCIONALIDADES</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Tudo que você precisa{" "}
              <span style={{ color: cor }}>em um lugar só</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Users, title: "Pipeline de vendas", desc: "Visualize o funil em kanban e acompanhe oportunidades do primeiro contato até o fechamento.",
                mini: (
                  <div className="mt-3 flex gap-1">
                    {["Novo", "Prop.", "Fechou"].map((l, i) => (
                      <div key={l} className="flex-1 py-1.5 rounded text-center text-[9px] font-bold" style={{ background: `${i === 2 ? "#4ADE80" : cor}10`, border: `1px solid ${i === 2 ? "#4ADE80" : cor}20`, color: i === 2 ? "#4ADE80" : cor }}>{l}</div>
                    ))}
                  </div>
                ),
              },
              {
                icon: MessageSquare, title: "Inbox WhatsApp com IA", desc: "Centralize conversas com IA respondendo dúvidas e transferindo para humano quando necessário.",
                mini: (
                  <div className="mt-3 space-y-1">
                    <div className="px-2 py-1 rounded-lg text-[9px] w-fit" style={{ background: "#1E3A2F", color: "#86EFAC" }}>Qual o preço do plano?</div>
                    <div className="px-2 py-1 rounded-lg text-[9px]" style={{ background: `${cor}10`, color: cor }}>O plano Pro inclui IA e R$497/mês…</div>
                  </div>
                ),
              },
              {
                icon: Bot, title: "Agente de IA treinado", desc: "Treine a IA com seus produtos, preços e objeções para responder com precisão.",
                mini: (
                  <div className="mt-3 rounded-lg p-2" style={{ background: `${cor}08`, border: `1px solid ${cor}15` }}>
                    <p className="text-[9px] font-bold" style={{ color: cor }}>Base consultada:</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>FAQ, tabela de preços, objeções</p>
                  </div>
                ),
              },
              {
                icon: Megaphone, title: "Broadcast em massa", desc: "Envie campanhas para sua base sem processos manuais e com alta taxa de entrega.",
                mini: (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="text-[9px] px-2 py-1 rounded font-bold" style={{ background: `${cor}10`, color: cor }}>248 enviados</div>
                    <div className="text-[9px] px-2 py-1 rounded font-bold" style={{ background: "rgba(74,222,128,0.1)", color: "#4ADE80" }}>89% entregues</div>
                  </div>
                ),
              },
              {
                icon: Workflow, title: "Fluxos automáticos", desc: "Crie automações de boas-vindas, qualificação, follow-up e transferência.",
                mini: (
                  <div className="mt-3 flex items-center gap-1">
                    {["Início", "IA", "Humano"].map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${cor}10`, color: cor }}>{s}</div>
                        {i < 2 && <div style={{ width: 10, height: 1, background: `${cor}40` }} />}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: BarChart2, title: "Dashboard e relatórios", desc: "Acompanhe leads, mensagens, vendas e performance em tempo real.",
                mini: (
                  <div className="mt-3 flex items-end gap-1 h-8">
                    {[30, 45, 60, 48, 75, 85, 100].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 6 ? cor : `${cor}30` }} />
                    ))}
                  </div>
                ),
              },
            ].map(({ icon: Icon, title, desc, mini }, i) => (
              <motion.div key={title} {...fadeF(i * 0.08)} className="rounded-[20px] p-6 flex flex-col cursor-default"
                style={{ background: CARD, border: `1px solid ${BORDER}`, transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.5)`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = ""; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${cor}12` }}>
                  <Icon size={18} style={{ color: cor }} />
                </div>
                <p className="text-sm font-bold mb-1.5" style={{ color: WHITE }}>{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: LIGHT }}>{desc}</p>
                {mini}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IA NO ATENDIMENTO ── */}
      <section className="py-28 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div {...fade}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: cor, letterSpacing: "0.1em" }}>IA NO ATENDIMENTO</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-8" style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}>
              Uma IA treinada para responder como{" "}
              <span style={{ color: cor }}>seu melhor vendedor</span>
            </h2>
            <div className="space-y-3">
              {["Responde dúvidas frequentes automaticamente", "Qualifica leads antes do humano entrar", "Entende produtos, preços e objeções", "Consulta documentos e informações da empresa", "Transfere para humano quando necessário", "Mantém histórico e contexto da conversa"].map(b => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle size={15} style={{ color: cor, marginTop: 2, flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: LIGHT }}>{b}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...fadeF(0.15)}>
            <div className="rounded-[20px] overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: BG2, borderBottom: `1px solid ${BORDER}` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${cor}20` }}>
                  <Bot size={13} style={{ color: cor }} />
                </div>
                <div><p className="text-xs font-bold" style={{ color: WHITE }}>Assistente</p><p className="text-[10px]" style={{ color: "#4ADE80" }}>● online</p></div>
              </div>
              <div className="px-3 py-2 text-[9px] font-bold flex items-center gap-1.5" style={{ background: `${cor}06`, borderBottom: `1px solid ${cor}12`, color: cor }}>
                <Layers size={10} /> Consultou: FAQ, tabela de preços, regras comerciais
              </div>
              <div className="p-4 space-y-2.5">
                {[
                  { from: "c", text: "Oi, queria saber os valores." },
                  { from: "ai", text: "Claro! Antes de te passar a melhor opção, pode me dizer o que precisa organizar: atendimento, vendas ou automação?" },
                  { from: "c", text: "Principalmente atendimento pelo WhatsApp." },
                  { from: "ai", text: "Perfeito. Nesse caso, o plano com Inbox WhatsApp e IA centraliza suas conversas e responde automaticamente. Quer ver como funciona?" },
                  { from: "c", text: "Sim, quero!" },
                  { from: "ai", text: "Ótimo! Vou te mostrar como configurar em menos de 5 minutos. Pode começar o teste grátis agora?" },
                ].map((m, i) => (
                  <div key={i} className={`flex ${m.from === "c" ? "justify-end" : "justify-start gap-1.5"}`}>
                    {m.from === "ai" && <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center" style={{ background: `${cor}18` }}><Bot size={9} style={{ color: cor }} /></div>}
                    <div className="px-2.5 py-1.5 rounded-xl text-[10px] max-w-[84%] leading-relaxed"
                      style={m.from === "c" ? { background: "#1E3A2F", color: "#86EFAC" } : { background: "rgba(255,255,255,0.04)", color: LIGHT }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["Criar oportunidade", "Transferir", "Enviar proposta"].map(b => (
                    <button key={b} className="px-2.5 py-1 rounded-full text-[9px] font-bold" style={{ background: `${cor}10`, border: `1px solid ${cor}20`, color: cor }}>{b}</button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="py-28 px-6">
        <div className="max-w-[900px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}>
              O que nossos clientes dizem
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { name: "Carlos M.", role: "Agência de Marketing", text: "Antes a equipe se perdia nas conversas do WhatsApp. Agora cada lead entra no pipeline e a IA ajuda no primeiro atendimento." },
              { name: "Ana P.", role: "Infoprodutora", text: "Conseguimos responder mais rápido e organizar melhor os follow-ups. A operação ficou muito mais profissional." },
              { name: "Renato S.", role: "Consultoria Comercial", text: "O dashboard nos deu clareza do que estava acontecendo. Hoje sabemos quantos leads entram e onde estão as oportunidades." },
              { name: "Marina L.", role: "E-commerce", text: "A IA reduziu perguntas repetidas e deixou nossa equipe focada em quem realmente queria comprar." },
            ].map(({ name, role, text }, i) => (
              <motion.div key={name} {...fadeF(i * 0.08)} className="rounded-[18px] p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-sm leading-relaxed mb-5" style={{ color: LIGHT }}>"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${cor}15`, color: cor }}>
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: WHITE }}>{name}</p>
                    <p className="text-xs" style={{ color: MUTED }}>{role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARATIVO ── */}
      <section className="py-20 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[800px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}>
              Antes era conversa solta.{" "}
              <span style={{ color: cor }}>Agora é operação.</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div {...fade} className="rounded-[18px] p-6" style={{ background: "#07080A", border: "1px solid rgba(239,68,68,0.08)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#F87171" }}>Sem CRM</p>
              {["Conversas espalhadas", "Leads perdidos", "Follow-up manual", "Sem visão do funil", "Atendimento lento", "Campanhas difíceis"].map(i => (
                <div key={i} className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#EF4444", opacity: 0.5 }} />
                  <span className="text-xs" style={{ color: "#4B5563" }}>{i}</span>
                </div>
              ))}
            </motion.div>
            <motion.div {...fadeF(0.15)} className="rounded-[18px] p-6"
              style={{ background: `linear-gradient(180deg, ${cor}07, ${CARD})`, border: `1px solid ${cor}25`, boxShadow: `0 0 32px ${cor}08` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: cor }}>Com {nome}</p>
              {["Tudo centralizado", "Leads organizados no pipeline", "Follow-up automático", "Dashboard em tempo real", "IA respondendo 24h", "Broadcast para toda a base"].map(i => (
                <div key={i} className="flex items-center gap-2 py-2" style={{ borderBottom: `1px solid ${cor}10` }}>
                  <CheckCircle size={12} style={{ color: cor }} />
                  <span className="text-xs font-medium" style={{ color: WHITE }}>{i}</span>
                </div>
              ))}
            </motion.div>
          </div>
          <motion.div {...fade} className="text-center mt-8">
            <p className="text-base font-medium" style={{ color: LIGHT }}>
              O mesmo WhatsApp.{" "}
              <strong style={{ background: `linear-gradient(135deg, ${cor}, #60a5fa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Uma operação muito mais inteligente.
              </strong>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      {plans.length > 0 && (
        <section id="planos" className="py-28 px-6">
          <div className="max-w-[1000px] mx-auto">
            <motion.div {...fade} className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: cor, letterSpacing: "0.1em" }}>PLANOS</p>
              <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}>
                Escolha o plano ideal para sua operação
              </h2>
              <p className="text-lg mt-3" style={{ color: LIGHT }}>30 dias grátis em todos os planos</p>
            </motion.div>
            <div className={`grid gap-5 ${plans.length === 1 ? "max-w-sm mx-auto" : plans.length === 2 ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
              {plans.map((plan, i) => {
                const isHighlight = plans.length >= 3 && i === middleIdx;
                return (
                  <motion.div key={plan.id} {...fadeF(i * 0.1)} className="rounded-[20px] p-7 flex flex-col"
                    style={{ background: isHighlight ? `linear-gradient(180deg, ${cor}09, ${CARD})` : CARD, border: isHighlight ? `1px solid ${cor}30` : `1px solid ${BORDER}`, boxShadow: isHighlight ? `0 0 40px ${cor}10` : "none" }}>
                    {isHighlight && <span className="text-[9px] font-black px-2 py-0.5 rounded-full self-start mb-3 uppercase tracking-wider" style={{ background: cor, color: "#0a0a0a" }}>MAIS POPULAR</span>}
                    <p className="text-lg font-extrabold mb-1" style={{ color: WHITE }}>{plan.nome}</p>
                    {plan.descricao && <p className="text-xs mb-4" style={{ color: MUTED }}>{plan.descricao}</p>}
                    <div className="mb-5">
                      <span className="text-4xl font-extrabold" style={{ color: isHighlight ? cor : WHITE }}>
                        R${parseFloat(plan.price_brl).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                      <span className="text-sm" style={{ color: MUTED }}>{CYCLE_LABEL[plan.billing_cycle] ?? "/mês"}</span>
                    </div>
                    <div className="flex-1 space-y-2 mb-6">
                      {(plan.features ?? []).map((f: string) => (
                        <div key={f} className="flex items-center gap-2">
                          <CheckCircle size={13} style={{ color: isHighlight ? cor : "#4ADE80" }} />
                          <span className="text-xs" style={{ color: LIGHT }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={`/signup?ref=${slug}&agency=${agId}&plan=${plan.id}`}
                      className="block text-center py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                      style={{ background: isHighlight ? cor : "rgba(255,255,255,0.08)", color: isHighlight ? "#0a0a0a" : WHITE, textDecoration: "none" }}>
                      Começar com {plan.nome}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: MUTED }}>30 dias grátis • Sem cartão de crédito • Cancele quando quiser</p>
          </div>
        </section>
      )}

      {/* ── GARANTIA ── */}
      <section className="py-20 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade} className="rounded-[24px] p-10 text-center" style={{ background: `${cor}06`, border: `1px solid ${cor}20` }}>
            <ShieldCheck size={32} style={{ color: cor, margin: "0 auto 16px" }} />
            <h2 className="font-extrabold tracking-[-0.03em] mb-4" style={{ fontSize: "clamp(24px, 3vw, 36px)" }}>
              Teste por 30 dias sem compromisso
            </h2>
            <p className="text-base mb-8 leading-relaxed" style={{ color: LIGHT }}>
              Você pode criar sua conta, conhecer a plataforma e entender como o CRM se encaixa na sua operação antes de decidir continuar.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {["Sem cartão de crédito", "Sem fidelidade", "Cancele quando quiser", "Suporte para começar"].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={13} style={{ color: cor }} />
                  <span className="text-sm" style={{ color: LIGHT }}>{t}</span>
                </div>
              ))}
            </div>
            <Link href={signupUrl} className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${cor}, #60a5fa)`, color: "#fff", textDecoration: "none", boxShadow: `0 0 40px ${cor}20` }}>
              Criar conta grátis <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-28 px-6">
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade} className="text-center mb-10">
            <h2 className="font-extrabold tracking-[-0.02em]" style={{ fontSize: "clamp(24px, 3vw, 38px)" }}>Perguntas frequentes</h2>
          </motion.div>
          <motion.div {...fadeF(0.1)}>
            <FAQAccordion cor={cor} />
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 50% 60% at 50% 50%, ${cor}08, transparent 70%)` }} />
        <motion.div {...fade} className="relative max-w-[700px] mx-auto text-center">
          <div className="rounded-[28px] p-12 md:p-16" style={{ background: `${cor}06`, border: `1px solid ${cor}20`, boxShadow: `0 0 80px ${cor}08` }}>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-5" style={{ fontSize: "clamp(28px, 4vw, 48px)" }}>
              Comece hoje,{" "}
              <span style={{ background: `linear-gradient(135deg, ${cor}, #60a5fa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                grátis por 30 dias
              </span>
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: LIGHT }}>
              Centralize seu WhatsApp, organize seus leads e deixe a IA ajudar sua equipe a vender mais.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Link href={signupUrl} className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${cor}, #60a5fa)`, color: "#fff", textDecoration: "none", boxShadow: `0 0 50px ${cor}25` }}>
                Criar conta grátis <ArrowRight size={18} />
              </Link>
            </div>
            <p className="text-xs" style={{ color: MUTED }}>Sem cartão de crédito • Configure em minutos • Cancele quando quiser</p>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6" style={{ borderTop: `1px solid ${BORDER}`, background: BG2 }}>
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            {agency?.logo_url
              ? <img src={agency.logo_url} alt={nome} style={{ height: 22, width: "auto" }} />
              : <div style={{ width: 22, height: 22, borderRadius: 6, background: cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" /></svg>
                </div>
            }
            <span className="text-sm font-bold" style={{ color: WHITE }}>{nome}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacidade" className="text-xs hover:text-white transition-colors" style={{ color: MUTED, textDecoration: "none" }}>Privacidade</Link>
            <Link href="/termos" className="text-xs hover:text-white transition-colors" style={{ color: MUTED, textDecoration: "none" }}>Termos</Link>
          </div>
          <p className="text-xs" style={{ color: "#374151" }}>Powered by Liberty CRM</p>
        </div>
      </footer>

    </main>
  );
}
