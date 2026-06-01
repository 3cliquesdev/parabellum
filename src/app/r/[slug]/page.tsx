"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, ArrowRight, Zap, Users, MessageSquare, Bot,
  BarChart2, Megaphone, Workflow, Layers, Database, Plus, Minus,
  TrendingUp, ShieldCheck, Clock, Target, Repeat, Eye, CreditCard,
  Send, Bell
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Light Premium SaaS Tokens ───
const BG = "#F8FAFC";
const BG2 = "#EEF4F8";
const BG3 = "#F1F5F9";
const CARD = "#FFFFFF";
const BORDER = "#E2E8F0";
const TEXT = "#08111F";
const TEXT_SEC = "#475569";
const TEXT_MUT = "#64748B";
const ACCENT = "#06B6D4";
const BLUE = "#2563EB";
const GREEN = "#22C55E";

// Internal dark tokens — used only inside mock components
const M_BG = "#050608";
const M_BG2 = "#0B0F14";
const M_CARD = "#101720";
const M_BORDER = "rgba(255,255,255,0.10)";
const M_WHITE = "#F8FAFC";
const M_MUTED = "#A1A1AA";
const M_LIGHT = "#CBD5E1";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)";
const CARD_SHADOW_HOVER = "0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)";
const MOCK_SHADOW = "0 20px 60px rgba(8,17,31,0.15), 0 4px 16px rgba(8,17,31,0.08)";
const CTA_GRAD = "linear-gradient(135deg, #06B6D4, #2563EB)";

const fade = { initial: { opacity: 0, y: 32 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true as const }, transition: { duration: 0.6 } };
const fadeF = (delay: number) => ({ ...fade, transition: { duration: 0.6, delay } });

// ─── Hero Mockup (dark interior) ───
function HeroMockup({ cor, nome }: { cor: string; nome: string }) {
  return (
    <div className="relative w-full max-w-[780px]" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* White container wrapping the dark mockup */}
      <div style={{ background: "#FFFFFF", borderRadius: 28, padding: 4, boxShadow: "0 24px 80px rgba(8,17,31,0.18), 0 4px 20px rgba(8,17,31,0.10)" }}>
        <div style={{ transform: "perspective(1800px) rotateX(3deg) rotateY(-1deg)" }}>
          <div className="rounded-[22px] overflow-hidden" style={{
            background: "linear-gradient(180deg, #0D1526 0%, #080F1C 100%)",
            border: `1px solid rgba(255,255,255,0.12)`,
            boxShadow: `0 0 0 1px rgba(0,0,0,0.08)`,
          }}>
            <div className="px-4 h-10 flex items-center gap-2" style={{ borderBottom: `1px solid ${cor}15`, background: "#060D19" }}>
              <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: cor }}>
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
              </div>
              <span className="text-xs font-bold" style={{ color: M_WHITE }}>{nome}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${cor}18`, color: cor }}>● IA ativa</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: "Leads", v: "248", c: cor },
                  { l: "Conversão", v: "34%", c: "#4ADE80" },
                  { l: "MRR", v: "R$14k", c: "#60a5fa" },
                  { l: "IA ativa", v: "97%", c: "#22D3EE" },
                ].map(m => (
                  <div key={m.l} className="rounded-lg p-2.5 text-center" style={{ background: `${m.c}09`, border: `1px solid ${m.c}18` }}>
                    <p className="text-sm font-extrabold leading-none" style={{ color: m.c }}>{m.v}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: M_MUTED }}>{m.l}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${M_BORDER}` }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#4B5563" }}>Pipeline</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { l: "Novo", c: "#60a5fa", items: ["João S."] },
                    { l: "Prop.", c: "#EAB308", items: ["Maria C."] },
                    { l: "Negoc.", c: "#F97316", items: ["Pedro L."] },
                    { l: "Ganho", c: "#4ADE80", items: ["Ana T.", "Bruno K."] },
                  ].map(col => (
                    <div key={col.l}>
                      <p className="text-[8px] font-bold mb-1 px-0.5" style={{ color: `${col.c}80` }}>{col.l}</p>
                      {col.items.map(n => <div key={n} className="mb-1 px-1.5 py-1 rounded text-[8px] font-medium truncate" style={{ background: `${col.c}12`, border: `1px solid ${col.c}20`, color: M_WHITE }}>{n}</div>)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${M_BORDER}` }}>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.3)", borderBottom: `1px solid ${M_BORDER}` }}>
                  <MessageSquare size={10} style={{ color: "#4ADE80" }} />
                  <span className="text-[9px] font-bold" style={{ color: M_WHITE }}>Inbox WhatsApp</span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${cor}15`, color: cor }}>IA ativa</span>
                </div>
                <div className="p-2.5 space-y-1.5" style={{ background: "#060D19" }}>
                  <div className="flex justify-end">
                    <div className="px-2 py-1 rounded-lg text-[9px]" style={{ background: "#1E3A2F", color: "#86EFAC" }}>Qual o plano mais completo?</div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center" style={{ background: `${cor}18` }}><Bot size={8} style={{ color: cor }} /></div>
                    <div className="px-2 py-1 rounded-lg text-[9px] flex-1" style={{ background: `${cor}10`, color: cor }}>O plano Pro inclui IA, pipeline e broadcast. Quer começar agora?</div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg px-3 py-2 flex items-center gap-3" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
                <Send size={10} style={{ color: "#4ADE80" }} />
                <p className="text-[9px] font-bold" style={{ color: "#4ADE80" }}>Campanha ativa</p>
                <p className="text-[9px]" style={{ color: M_MUTED }}>1.248 enviados • 32% abertura</p>
                <div className="ml-auto flex-1 max-w-[60px] h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ width: "87%", height: "100%", borderRadius: 99, background: "#4ADE80" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Floating Cards — white */}
      <motion.div animate={{ y: [0, -9, 0] }} transition={{ duration: 3.5, repeat: Infinity }}
        className="absolute -top-5 -right-4 rounded-2xl px-3 py-2.5 hidden md:block"
        style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(8,17,31,0.12)" }}>
        <p className="text-[9px] font-bold" style={{ color: ACCENT }}>IA respondeu</p>
        <p className="text-xl font-extrabold leading-none" style={{ color: TEXT }}>{`1.247`}</p>
        <p className="text-[9px]" style={{ color: TEXT_MUT }}>mensagens este mês</p>
      </motion.div>

      <motion.div animate={{ y: [0, 9, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 0.8 }}
        className="absolute -bottom-4 -left-4 rounded-2xl px-3 py-2.5 hidden md:block"
        style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(8,17,31,0.12)" }}>
        <p className="text-[9px] font-bold" style={{ color: BLUE }}>Oportunidades</p>
        <p className="text-xl font-extrabold leading-none" style={{ color: TEXT }}>67</p>
        <p className="text-[9px]" style={{ color: TEXT_MUT }}>abertas no pipeline</p>
      </motion.div>

      <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 4.5, repeat: Infinity, delay: 1.5 }}
        className="absolute -top-5 -left-4 rounded-2xl px-3 py-2.5 hidden lg:block"
        style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(8,17,31,0.12)" }}>
        <p className="text-[9px] font-bold" style={{ color: GREEN }}>Taxa de conversão</p>
        <p className="text-xl font-extrabold leading-none" style={{ color: TEXT }}>38%</p>
        <p className="text-[9px]" style={{ color: TEXT_MUT }}>acima da média</p>
      </motion.div>

      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 2.2 }}
        className="absolute -bottom-4 -right-4 rounded-2xl px-3 py-2.5 hidden lg:block"
        style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(8,17,31,0.12)" }}>
        <p className="text-[9px] font-bold" style={{ color: "#A78BFA" }}>Follow-up automático</p>
        <p className="text-sm font-bold" style={{ color: TEXT }}>● ativo 24h</p>
        <p className="text-[9px]" style={{ color: TEXT_MUT }}>nenhum lead esquecido</p>
      </motion.div>

      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.8, repeat: Infinity, delay: 3 }}
        className="absolute top-1/2 -right-4 -translate-y-1/2 rounded-2xl px-3 py-2.5 hidden xl:block"
        style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(8,17,31,0.12)" }}>
        <p className="text-[9px] font-bold" style={{ color: cor }}>Lead qualificado</p>
        <p className="text-[9px] font-semibold" style={{ color: TEXT_MUT }}>pelo WhatsApp agora</p>
      </motion.div>
    </div>
  );
}

// ─── Product Theatre Mockup (dark interior) ───
function ProductTheatreMockup({ cor, nome }: { cor: string; nome: string }) {
  return (
    <div className="rounded-[22px] overflow-hidden" style={{
      background: "linear-gradient(180deg, #0D1526, #060D19)",
      border: `1px solid rgba(255,255,255,0.1)`,
      boxShadow: `0 0 0 1px rgba(0,0,0,0.08)`,
    }}>
      <div className="px-5 h-11 flex items-center gap-3" style={{ borderBottom: `1px solid ${cor}12`, background: "#040C1A" }}>
        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: cor }}>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
        </div>
        <span className="text-sm font-bold" style={{ color: M_WHITE }}>{nome}</span>
        <div className="hidden sm:flex items-center gap-5 ml-6">
          {["Dashboard", "Inbox", "Pipeline", "Campanhas", "IA"].map((t, i) => (
            <span key={t} className="text-[10px] font-semibold pb-0.5" style={{ color: i === 1 ? cor : "#4B5563", borderBottom: i === 1 ? `1px solid ${cor}` : "none" }}>{t}</span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${cor}18`, color: cor }}>● IA ativa</span>
        </div>
      </div>
      <div className="grid grid-cols-5 min-h-[260px]">
        <div className="col-span-3 p-4 space-y-3" style={{ borderRight: `1px solid rgba(255,255,255,0.05)` }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>Inbox WhatsApp</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${cor}18`, color: cor }}>IA respondendo</span>
          </div>
          <div className="space-y-2">
            {[
              { name: "João Silva", msg: "Tenho interesse no plano Pro", time: "14:22", unread: true },
              { name: "Maria Costa", msg: "Qual é a diferença do plano Premium?", time: "14:18", unread: false },
              { name: "Pedro Lima", msg: "Obrigado! Vou testar", time: "13:55", unread: false },
            ].map(c => (
              <div key={c.name} className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer" style={{ background: c.unread ? `${cor}08` : "rgba(255,255,255,0.02)", border: `1px solid ${c.unread ? `${cor}18` : "rgba(255,255,255,0.04)"}` }}>
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ background: `${cor}18`, color: cor }}>{c.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold" style={{ color: M_WHITE }}>{c.name}</p>
                    <p className="text-[8px]" style={{ color: "#4B5563" }}>{c.time}</p>
                  </div>
                  <p className="text-[9px] truncate" style={{ color: M_MUTED }}>{c.msg}</p>
                </div>
                {c.unread && <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ background: cor }} />}
              </div>
            ))}
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${cor}20` }}>
            <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: `${cor}08`, borderBottom: `1px solid ${cor}12` }}>
              <Bot size={10} style={{ color: cor }} />
              <span className="text-[9px] font-bold" style={{ color: cor }}>IA respondendo João Silva</span>
            </div>
            <div className="p-2.5 space-y-1.5" style={{ background: "#060D19" }}>
              <div className="flex justify-end"><div className="px-2 py-1 rounded-lg text-[9px]" style={{ background: "#1E3A2F", color: "#86EFAC" }}>Tenho interesse no plano Pro</div></div>
              <div className="flex gap-1.5">
                <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center" style={{ background: `${cor}18` }}><Bot size={7} style={{ color: cor }} /></div>
                <div className="px-2 py-1 rounded-lg text-[9px]" style={{ background: `${cor}10`, color: cor }}>Ótimo! O plano Pro inclui IA 24h, pipeline e broadcast. Posso te mostrar?</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-2 p-4 space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#4B5563" }}>Pipeline</p>
          <div className="space-y-1.5">
            {[
              { l: "Novo lead", n: 8, c: "#60a5fa", w: "55%" },
              { l: "Proposta", n: 5, c: "#EAB308", w: "35%" },
              { l: "Negociação", n: 3, c: "#F97316", w: "22%" },
              { l: "Ganho", n: 11, c: "#4ADE80", w: "80%" },
            ].map(p => (
              <div key={p.l} className="flex items-center gap-2">
                <p className="text-[9px] w-16 shrink-0" style={{ color: M_MUTED }}>{p.l}</p>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div style={{ width: p.w, height: "100%", borderRadius: 99, background: p.c }} />
                </div>
                <p className="text-[9px] font-bold w-4 text-right shrink-0" style={{ color: p.c }}>{p.n}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${M_BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#4B5563" }}>Receita mensal</p>
            <div className="flex items-end gap-1 h-10">
              {[25, 40, 55, 45, 65, 78, 90, 100].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 7 ? cor : `${cor}25`, boxShadow: i === 7 ? `0 0 8px ${cor}50` : "none" }} />
              ))}
            </div>
            <p className="text-[9px] font-bold mt-1" style={{ color: cor }}>R$14.248/mês ▲ +23%</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-2.5 flex items-center gap-4" style={{ borderTop: `1px solid rgba(255,255,255,0.05)`, background: "#040C1A" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ADE80" }} />
          <p className="text-[9px]" style={{ color: M_MUTED }}>Follow-up agendado 14:30</p>
        </div>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>•</p>
        <p className="text-[9px]" style={{ color: M_MUTED }}>Lead: João Silva</p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>•</p>
        <p className="text-[9px] font-bold" style={{ color: cor }}>Proposta enviada</p>
      </div>
    </div>
  );
}

// ─── Broadcast Mockup (dark interior) ───
function BroadcastMockup({ cor }: { cor: string }) {
  return (
    <div className="rounded-[20px] overflow-hidden" style={{ background: "linear-gradient(180deg, #0D1526, #080F1C)", border: `1px solid rgba(255,255,255,0.1)`, boxShadow: `0 0 0 1px rgba(0,0,0,0.08)` }}>
      <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)`, background: "#060D19" }}>
        <Send size={13} style={{ color: cor }} />
        <span className="text-xs font-bold" style={{ color: M_WHITE }}>Campanha — Black Friday Reativação</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4ADE80" }} />
            <span className="text-[9px] font-bold" style={{ color: "#4ADE80" }}>Enviando</span>
          </div>
          <span className="text-[9px]" style={{ color: "#4B5563" }}>15/11 • 14:30</span>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[
            { v: "1.248", l: "contatos", c: cor },
            { v: "32%", l: "abertura", c: "#60a5fa" },
            { v: "84", l: "respostas", c: "#4ADE80" },
            { v: "17", l: "oportunidades", c: "#A78BFA" },
          ].map(m => (
            <div key={m.l} className="rounded-xl p-3 text-center" style={{ background: `${m.c}09`, border: `1px solid ${m.c}18` }}>
              <p className="text-xl font-extrabold leading-none" style={{ color: m.c }}>{m.v}</p>
              <p className="text-[9px] mt-1" style={{ color: M_MUTED }}>{m.l}</p>
            </div>
          ))}
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <p className="text-[9px] font-bold" style={{ color: "#4B5563" }}>Entregues</p>
            <p className="text-[9px] font-bold" style={{ color: "#4ADE80" }}>87%</p>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div style={{ width: "87%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #4ADE80, #22D3EE)", boxShadow: "0 0 8px rgba(74,222,128,0.4)" }} />
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            { name: "João S.", status: "Leu 14:31", c: "#4ADE80", dot: "#4ADE80" },
            { name: "Maria C.", status: "Respondeu", c: "#22D3EE", dot: "#22D3EE" },
            { name: "Pedro L.", status: "Entregue", c: M_MUTED, dot: "#4B5563" },
            { name: "Ana T.", status: "Aguardando", c: "#374151", dot: "#374151" },
          ].map(d => (
            <div key={d.name} className="flex items-center gap-3 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.dot }} />
              <span className="flex-1 text-[10px] font-medium" style={{ color: M_WHITE }}>{d.name}</span>
              <span className="text-[9px] font-bold" style={{ color: d.c }}>{d.status}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3" style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.20)" }}>
          <p className="text-xs font-bold" style={{ color: "#4ADE80" }}>R$8.240 em oportunidades geradas</p>
          <p className="text-[10px] mt-0.5" style={{ color: M_MUTED }}>17 oportunidades × ticket médio R$484</p>
        </div>
      </div>
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
        <div key={i} className="rounded-2xl overflow-hidden transition-all"
          style={{ background: open === i ? `${cor}05` : CARD, border: open === i ? `1px solid ${cor}30` : `1px solid ${BORDER}`, boxShadow: CARD_SHADOW }}>
          <button className="w-full flex items-center justify-between px-6 py-4 text-left" onClick={() => setOpen(open === i ? null : i)}>
            <span className="text-sm font-semibold" style={{ color: TEXT }}>{q}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-4" style={{ background: open === i ? `${cor}12` : BG3 }}>
              {open === i ? <Minus size={12} style={{ color: cor }} /> : <Plus size={12} style={{ color: TEXT_MUT }} />}
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
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: BORDER, borderTopColor: ACCENT }} />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
      <p className="font-bold text-lg" style={{ color: TEXT }}>Link não encontrado</p>
      <Link href="/" className="text-sm font-medium" style={{ color: ACCENT }}>Voltar ao início</Link>
    </div>
  );

  const cor = agency?.primary_color ?? "#06B6D4";
  const nome = agency?.display_name ?? agency?.name ?? "CRM";
  const agId = agency?.id ?? "";
  const signupUrl = `/signup?ref=${slug}&agency=${agId}`;
  const CYCLE_LABEL: Record<string, string> = { mensal: "/mês", trimestral: "/trim.", semestral: "/sem.", anual: "/ano" };
  const middleIdx = Math.floor(plans.length / 2);

  return (
    <main style={{ background: BG, color: TEXT, fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif", overflowX: "hidden" }}>

      {/* ── NAVBAR ── */}
      <nav className="transition-all duration-300" style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: `1px solid ${scrolled ? BORDER : "transparent"}`,
        background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(248,250,252,0.90)",
        backdropFilter: "blur(16px)",
        boxShadow: scrolled ? "0 1px 12px rgba(8,17,31,0.08)" : "none",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {agency?.logo_url
              ? <img src={agency.logo_url} alt={nome} style={{ height: 28, width: "auto" }} />
              : <div style={{ width: 28, height: 28, borderRadius: 8, background: cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" /></svg>
                </div>
            }
            <span style={{ fontWeight: 700, fontSize: 15, color: TEXT, letterSpacing: "-0.01em" }}>{nome}</span>
          </div>
          <div className="hidden md:flex items-center gap-7">
            {[
              { label: "Funcionalidades", href: "#funcionalidades" },
              { label: "IA", href: "#ia" },
              { label: "Planos", href: "#planos" },
              { label: "FAQ", href: "#faq" },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC, textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                onMouseLeave={e => (e.currentTarget.style.color = TEXT_SEC)}>
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href={signupUrl} style={{
              padding: "9px 22px", borderRadius: 12,
              background: CTA_GRAD,
              color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 14px rgba(6,182,212,0.25)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}>
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center px-6 pt-8 pb-20" style={{ background: BG }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle at 65% 30%, ${cor}08, transparent 40%), radial-gradient(circle at 25% 70%, rgba(37,99,235,0.05), transparent 40%)`,
        }} />
        <div className="relative max-w-[1260px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div {...fade}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-bold"
              style={{ background: `${cor}10`, border: `1px solid ${cor}20`, color: cor }}>
              <Zap size={11} /> 30 dias grátis • sem cartão de crédito
            </div>
            <h1 className="font-extrabold leading-[1.0] tracking-[-0.04em] mb-5"
              style={{ fontSize: "clamp(40px, 5vw, 80px)", color: TEXT }}>
              O CRM que vende{" "}
              <span style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                enquanto você dorme
              </span>
            </h1>
            <p className="text-lg md:text-xl mb-8 leading-relaxed" style={{ color: TEXT_SEC, maxWidth: 520 }}>
              Centralize atendimento, pipeline, automações e campanhas em uma plataforma simples e feita para negócios que vendem pelo WhatsApp.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <Link href={signupUrl} className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
                style={{ background: CTA_GRAD, color: "#fff", boxShadow: "0 4px 20px rgba(6,182,212,0.30)", textDecoration: "none" }}>
                Criar minha conta grátis <ArrowRight size={18} />
              </Link>
              <a href="#funcionalidades" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base"
                style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT, textDecoration: "none", boxShadow: CARD_SHADOW }}>
                Ver como funciona
              </a>
            </div>
            <p style={{ fontSize: 12, color: TEXT_MUT }}>Sem cartão de crédito • Configure em minutos • Cancele quando quiser</p>
          </motion.div>
          <motion.div {...fadeF(0.2)} className="flex justify-center lg:justify-end">
            <HeroMockup cor={cor} nome={nome} />
          </motion.div>
        </div>
      </section>

      {/* ── PROVA RÁPIDA ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: BG3 }}>
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-8">
          {[
            { icon: Megaphone, label: "Pipeline visual" },
            { icon: MessageSquare, label: "WhatsApp com IA" },
            { icon: Workflow, label: "Fluxos automáticos" },
            { icon: BarChart2, label: "Dashboard em tempo real" },
            { icon: Bot, label: "IA 24h" },
            { icon: Send, label: "Broadcast em massa" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={14} style={{ color: cor }} />
              <span className="text-sm font-semibold" style={{ color: TEXT_SEC }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROBLEMA ── */}
      <section className="py-32 px-6" style={{ background: BG }}>
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: ACCENT, letterSpacing: "0.1em" }}>O PROBLEMA</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)", color: TEXT }}>
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
              <motion.div key={title} {...fadeF(i * 0.07)} className="rounded-[18px] p-6"
                style={{ background: CARD, border: `1px solid #FEE2E2`, boxShadow: CARD_SHADOW }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: "#FEF2F2" }}>
                  <Icon size={16} style={{ color: "#EF4444" }} />
                </div>
                <p className="text-sm font-bold mb-1.5" style={{ color: TEXT }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: TEXT_SEC }}>{desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div {...fade} className="text-center mt-10">
            <p className="text-lg font-bold" style={{ color: TEXT_SEC }}>
              O problema não é falta de lead.{" "}
              <strong style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                É falta de operação.
              </strong>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── VIRADA ── */}
      <section className="py-20 px-6 relative overflow-hidden" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${cor}06, transparent 70%)` }} />
        <motion.div {...fade} className="relative max-w-[800px] mx-auto text-center">
          <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em]" style={{ fontSize: "clamp(32px, 4.5vw, 60px)", color: TEXT }}>
            Pare de improvisar atendimento.{" "}
            <span style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Comece a operar vendas.
            </span>
          </h2>
          <p className="text-lg mt-6 leading-relaxed" style={{ color: TEXT_SEC }}>
            Com <strong style={{ color: TEXT }}>{nome}</strong>, seu WhatsApp deixa de ser apenas um canal de conversa e passa a funcionar como uma operação comercial completa: com IA, pipeline, automações, campanhas e relatórios.
          </p>
        </motion.div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-32 px-6" style={{ background: BG }}>
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: ACCENT, letterSpacing: "0.1em" }}>FUNCIONALIDADES</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)", color: TEXT }}>
              Tudo que você precisa{" "}
              <span style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>em um lugar só</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Users, title: "Pipeline de vendas", desc: "Visualize o funil em kanban e acompanhe oportunidades do primeiro contato até o fechamento.",
                mini: (
                  <div className="mt-3 grid grid-cols-4 gap-1">
                    {[{ l: "Novo", c: "#3B82F6", items: ["João S."] }, { l: "Prop.", c: "#EAB308", items: ["Maria C."] }, { l: "Negoc.", c: "#F97316", items: ["Pedro L."] }, { l: "Ganho", c: "#22C55E", items: ["Ana T.", "Bruno K."] }].map(col => (
                      <div key={col.l}>
                        <p className="text-[8px] font-bold mb-1 px-0.5" style={{ color: `${col.c}` }}>{col.l}</p>
                        {col.items.map(n => <div key={n} className="mb-1 px-1 py-0.5 rounded text-[7px] font-medium" style={{ background: `${col.c}10`, border: `1px solid ${col.c}20`, color: TEXT }}>{n}</div>)}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: MessageSquare, title: "Inbox WhatsApp com IA", desc: "Centralize conversas com IA respondendo dúvidas e transferindo para humano quando necessário.",
                mini: (
                  <div className="mt-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                    <div className="px-2 py-1" style={{ background: BG3, borderBottom: `1px solid ${BORDER}` }}>
                      <span className="text-[8px] font-bold" style={{ color: ACCENT }}>IA ativa</span>
                    </div>
                    <div className="p-2 space-y-1.5" style={{ background: "#0A1020" }}>
                      <div className="flex justify-end"><div className="px-2 py-1 rounded-lg text-[9px]" style={{ background: "#1E3A2F", color: "#86EFAC" }}>Qual o preço?</div></div>
                      <div className="px-2 py-1 rounded-lg text-[9px]" style={{ background: `${cor}10`, color: cor }}>O plano Pro inclui IA…</div>
                    </div>
                  </div>
                ),
              },
              {
                icon: Bot, title: "Agente de IA treinado", desc: "Treine a IA com seus produtos, preços e objeções para responder com precisão 24h por dia.",
                mini: (
                  <div className="mt-3 rounded-lg p-2.5 space-y-1.5" style={{ background: BG3, border: `1px solid ${BORDER}` }}>
                    <p className="text-[9px] font-bold" style={{ color: ACCENT }}>Base consultada:</p>
                    <div className="flex flex-wrap gap-1">
                      {["PDF", "Site", "Preços"].map(f => <span key={f} className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT_SEC }}>{f}</span>)}
                    </div>
                    <p className="text-[9px]" style={{ color: TEXT_MUT }}>→ "O plano inclui automação…"</p>
                  </div>
                ),
              },
              {
                icon: Megaphone, title: "Broadcast em massa", desc: "Envie campanhas para sua base sem processos manuais e com alta taxa de entrega.",
                mini: (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="text-[9px] px-2 py-1 rounded font-bold" style={{ background: `${cor}10`, color: cor }}>1.248 enviados</div>
                      <div className="text-[9px] px-2 py-1 rounded font-bold" style={{ background: "#DCFCE7", color: "#16A34A" }}>87% entregues</div>
                    </div>
                    <p className="text-[9px] font-bold" style={{ color: GREEN }}>R$8.240 em oportunidades</p>
                  </div>
                ),
              },
              {
                icon: Workflow, title: "Fluxos automáticos", desc: "Crie automações de boas-vindas, qualificação, follow-up e transferência sem código.",
                mini: (
                  <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {["Lead", "IA", "Fecha", "Follow-up"].map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className="px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={{ background: `${cor}10`, color: cor, border: `1px solid ${cor}20` }}>{s}</div>
                        {i < 3 && <div style={{ width: 8, height: 1, background: BORDER }} />}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: BarChart2, title: "Dashboard e relatórios", desc: "Acompanhe leads, mensagens, vendas e performance em tempo real.",
                mini: (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex gap-2">
                      {[{ v: "248", l: "leads", c: BLUE }, { v: "34%", l: "conv.", c: GREEN }, { v: "1.2k", l: "msgs", c: ACCENT }].map(m => (
                        <div key={m.l} className="flex-1 rounded p-1.5 text-center" style={{ background: `${m.c}08`, border: `1px solid ${m.c}15` }}>
                          <p className="text-[10px] font-extrabold leading-none" style={{ color: m.c }}>{m.v}</p>
                          <p className="text-[8px]" style={{ color: TEXT_MUT }}>{m.l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-end gap-0.5 h-6">
                      {[30, 45, 60, 48, 75, 85, 100].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 6 ? cor : `${cor}20` }} />
                      ))}
                    </div>
                  </div>
                ),
              },
            ].map(({ icon: Icon, title, desc, mini }, i) => (
              <motion.div key={title} {...fadeF(i * 0.08)} className="rounded-[20px] p-6 flex flex-col cursor-default"
                style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: CARD_SHADOW, transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = CARD_SHADOW_HOVER; el.style.borderColor = `${cor}25`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = CARD_SHADOW; el.style.borderColor = BORDER; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${cor}10` }}>
                  <Icon size={18} style={{ color: cor }} />
                </div>
                <p className="text-sm font-bold mb-1.5" style={{ color: TEXT }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: TEXT_SEC }}>{desc}</p>
                {mini}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BROADCAST ── */}
      <section className="py-32 px-6" style={{ background: BG3, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div {...fade}>
            <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: ACCENT, letterSpacing: "0.1em" }}>BROADCAST</p>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.03em] mb-6" style={{ fontSize: "clamp(28px, 3.5vw, 48px)", color: TEXT }}>
              Venda de novo para quem{" "}
              <span style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                já falou com você
              </span>
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: TEXT_SEC }}>
              Sua base de leads e clientes é ouro parado. Com broadcast, crie campanhas segmentadas para reativar contatos, anunciar lançamentos e gerar vendas recorrentes — tudo no WhatsApp.
            </p>
            <div className="space-y-3">
              {[
                "Segmente por comportamento, tag ou período",
                "Personalize a mensagem com o nome do contato",
                "Acompanhe abertura, resposta e oportunidades em tempo real",
                "Programe o envio para o melhor horário",
              ].map(b => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle size={15} style={{ color: cor, marginTop: 2, flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: TEXT_SEC }}>{b}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...fadeF(0.15)}>
            <div style={{ background: CARD, borderRadius: 24, padding: 4, boxShadow: MOCK_SHADOW }}>
              <BroadcastMockup cor={cor} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PRODUCT THEATRE ── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: BG }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${cor}05, transparent 70%)` }} />
        <div className="relative max-w-[1200px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: ACCENT, letterSpacing: "0.1em" }}>PRODUTO</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)", color: TEXT }}>
              Veja o CRM{" "}
              <span style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>trabalhando por você</span>
            </h2>
            <p className="text-lg mt-4" style={{ color: TEXT_SEC }}>É assim que sua operação fica com {nome}</p>
          </motion.div>
          <motion.div {...fadeF(0.15)} style={{ transform: "perspective(2000px) rotateX(3deg)" }}>
            <div className="relative">
              <div style={{ background: CARD, borderRadius: 28, padding: 4, boxShadow: "0 24px 80px rgba(8,17,31,0.18), 0 4px 20px rgba(8,17,31,0.10)" }}>
                <ProductTheatreMockup cor={cor} nome={nome} />
              </div>
              {/* Floating cards */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity }}
                className="absolute -top-4 -right-4 rounded-2xl px-3 py-2.5 hidden md:block"
                style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(8,17,31,0.12)" }}>
                <p className="text-[9px] font-bold" style={{ color: cor }}>Lead qualificado</p>
                <p className="text-[9px]" style={{ color: TEXT_MUT }}>pelo WhatsApp agora</p>
              </motion.div>
              <motion.div animate={{ y: [0, 9, 0] }} transition={{ duration: 4.2, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -left-4 rounded-2xl px-3 py-2.5 hidden md:block"
                style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(8,17,31,0.12)" }}>
                <p className="text-[9px] font-bold" style={{ color: BLUE }}>IA respondeu</p>
                <p className="text-base font-extrabold leading-none" style={{ color: TEXT }}>1.247</p>
                <p className="text-[9px]" style={{ color: TEXT_MUT }}>mensagens este mês</p>
              </motion.div>
              <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 2 }}
                className="absolute -top-4 -left-4 rounded-2xl px-3 py-2.5 hidden lg:block"
                style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(8,17,31,0.12)" }}>
                <p className="text-[9px] font-bold" style={{ color: GREEN }}>Follow-up enviado</p>
                <p className="text-[9px]" style={{ color: TEXT_MUT }}>automático</p>
              </motion.div>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4.8, repeat: Infinity, delay: 3 }}
                className="absolute -bottom-4 -right-4 rounded-2xl px-3 py-2.5 hidden lg:block"
                style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(8,17,31,0.12)" }}>
                <p className="text-[9px] font-bold" style={{ color: "#A78BFA" }}>Oportunidade criada</p>
                <p className="text-[9px]" style={{ color: TEXT_MUT }}>João Silva</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── IA NO ATENDIMENTO ── */}
      <section id="ia" className="py-32 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div {...fade}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: ACCENT, letterSpacing: "0.1em" }}>IA NO ATENDIMENTO</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-8" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", color: TEXT }}>
              Uma IA treinada para responder como{" "}
              <span style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>seu melhor vendedor</span>
            </h2>
            <div className="space-y-3">
              {["Responde dúvidas frequentes automaticamente", "Qualifica leads antes do humano entrar", "Entende produtos, preços e objeções", "Consulta documentos e informações da empresa", "Transfere para humano quando necessário", "Mantém histórico e contexto da conversa"].map(b => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle size={15} style={{ color: cor, marginTop: 2, flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: TEXT_SEC }}>{b}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...fadeF(0.15)}>
            <div style={{ background: CARD, borderRadius: 24, padding: 4, boxShadow: MOCK_SHADOW }}>
              <div className="rounded-[20px] overflow-hidden" style={{ background: "#0D1526", border: `1px solid rgba(255,255,255,0.08)` }}>
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#060D19", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${cor}20` }}>
                    <Bot size={13} style={{ color: cor }} />
                  </div>
                  <div><p className="text-xs font-bold" style={{ color: M_WHITE }}>Assistente</p><p className="text-[10px]" style={{ color: "#4ADE80" }}>● online</p></div>
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
                        style={m.from === "c" ? { background: "#1E3A2F", color: "#86EFAC" } : { background: "rgba(255,255,255,0.04)", color: M_LIGHT }}>
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
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="py-32 px-6" style={{ background: BG }}>
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(28px, 3.5vw, 48px)", color: TEXT }}>
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
                style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: `3px solid ${cor}`, boxShadow: CARD_SHADOW, minHeight: 200 }}>
                <p className="text-2xl font-extrabold mb-3" style={{ color: cor }}>{metric}</p>
                <p className="text-sm leading-relaxed italic mb-6 flex-1" style={{ color: TEXT_SEC }}>"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ background: `${cor}12`, color: cor }}>
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
      <section className="py-20 px-6" style={{ background: BG3, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[900px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", color: TEXT }}>
              Antes era conversa solta.{" "}
              <span style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Agora é operação.</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div {...fade} className="rounded-[20px] p-7" style={{ background: "#FFF5F5", border: "1px solid rgba(239,68,68,0.15)", boxShadow: CARD_SHADOW }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: "#EF4444" }}>Sem CRM</p>
              {["Conversas espalhadas", "Leads perdidos", "Follow-up manual", "Sem visão do funil", "Atendimento lento", "Campanhas difíceis"].map(item => (
                <div key={item} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: "1px solid rgba(239,68,68,0.08)" }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#EF4444", opacity: 0.4 }} />
                  <span className="text-sm" style={{ color: "#94A3B8" }}>{item}</span>
                </div>
              ))}
            </motion.div>
            <motion.div {...fadeF(0.15)} className="rounded-[20px] p-7"
              style={{ background: "linear-gradient(180deg, #EFF6FF, #FFFFFF)", border: `1px solid ${BLUE}25`, boxShadow: "0 4px 20px rgba(37,99,235,0.08)" }}>
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: BLUE }}>Com {nome}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${cor}12`, color: cor }}>● operação ativa</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[{ v: "248", l: "Leads", c: BLUE }, { v: "34%", l: "Conv.", c: GREEN }, { v: "97%", l: "IA ativa", c: ACCENT }].map(m => (
                  <div key={m.l} className="rounded-lg p-2 text-center" style={{ background: `${m.c}08`, border: `1px solid ${m.c}18` }}>
                    <p className="text-sm font-extrabold leading-none" style={{ color: m.c }}>{m.v}</p>
                    <p className="text-[8px] mt-0.5" style={{ color: TEXT_MUT }}>{m.l}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 mb-4">
                {[{ l: "Proposta", w: "45%", c: "#EAB308" }, { l: "Fechamento", w: "72%", c: GREEN }].map(p => (
                  <div key={p.l} className="flex items-center gap-2">
                    <p className="text-[9px] w-16 shrink-0" style={{ color: TEXT_MUT }}>{p.l}</p>
                    <div className="flex-1 h-1 rounded-full" style={{ background: BORDER }}>
                      <div style={{ width: p.w, height: "100%", borderRadius: 99, background: p.c }} />
                    </div>
                  </div>
                ))}
              </div>
              {["Tudo centralizado", "Pipeline organizado", "Follow-up automático", "IA respondendo 24h", "Dashboard em tempo real", "Broadcast para toda base"].map(item => (
                <div key={item} className="flex items-center gap-2.5 py-2" style={{ borderBottom: `1px solid ${BLUE}10` }}>
                  <CheckCircle size={13} style={{ color: cor }} />
                  <span className="text-sm font-medium" style={{ color: TEXT }}>{item}</span>
                </div>
              ))}
              <p className="text-lg font-extrabold mt-4" style={{ color: TEXT }}>
                O mesmo WhatsApp.{" "}
                <span style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Uma operação muito mais inteligente.
                </span>
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      {plans.length > 0 && (
        <section id="planos" className="py-32 px-6" style={{ background: BG }}>
          <div className="max-w-[1000px] mx-auto">
            <motion.div {...fade} className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: ACCENT, letterSpacing: "0.1em" }}>PLANOS</p>
              <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", color: TEXT }}>
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
                      background: isHighlight ? "linear-gradient(180deg, #EFF6FF, #FFFFFF)" : CARD,
                      border: isHighlight ? `2px solid ${BLUE}` : `1px solid ${BORDER}`,
                      boxShadow: isHighlight ? "0 8px 32px rgba(37,99,235,0.15)" : CARD_SHADOW,
                      transform: isHighlight ? "scale(1.04)" : "none",
                      padding: isHighlight ? "36px" : "28px",
                    }}>
                    {isHighlight && (
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-full self-start mb-4 uppercase tracking-wider"
                        style={{ background: BLUE, color: "#fff" }}>⭐ MAIS ESCOLHIDO</span>
                    )}
                    <p className="text-lg font-extrabold mb-1" style={{ color: TEXT }}>{plan.nome}</p>
                    {isHighlight && <p className="text-xs mt-0.5 mb-2" style={{ color: BLUE, opacity: 0.8 }}>Ideal para vender com IA e automação</p>}
                    {plan.descricao && <p className="text-xs mb-4" style={{ color: TEXT_MUT }}>{plan.descricao}</p>}
                    <div className="mb-6">
                      <span className="text-4xl font-extrabold" style={{ color: isHighlight ? BLUE : TEXT }}>
                        R${parseFloat(plan.price_brl).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                      <span className="text-sm" style={{ color: TEXT_MUT }}>{CYCLE_LABEL[plan.billing_cycle] ?? "/mês"}</span>
                    </div>
                    <div className="flex-1 space-y-2.5 mb-7">
                      {(plan.features ?? []).map((f: string) => (
                        <div key={f} className="flex items-center gap-2.5">
                          <CheckCircle size={14} style={{ color: isHighlight ? BLUE : GREEN }} />
                          <span className="text-sm" style={{ color: TEXT_SEC }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={`/signup?ref=${slug}&agency=${agId}&plan=${plan.id}`}
                      className="block text-center py-3.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                      style={{ background: isHighlight ? CTA_GRAD : BG3, color: isHighlight ? "#fff" : TEXT, textDecoration: "none", border: isHighlight ? "none" : `1px solid ${BORDER}`, boxShadow: isHighlight ? "0 4px 14px rgba(6,182,212,0.25)" : "none" }}>
                      Começar com {plan.nome}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {plans.length >= 3 && (
              <motion.div {...fadeF(0.3)} className="mt-10 rounded-[20px] overflow-hidden" style={{ border: `1px solid ${BORDER}`, boxShadow: CARD_SHADOW }}>
                <div className="grid" style={{ gridTemplateColumns: "1fr repeat(3, 1fr)", background: BG3 }}>
                  <div className="p-4" />
                  {plans.map((p, i) => (
                    <div key={p.id} className="p-4 text-center" style={{ borderLeft: `1px solid ${BORDER}` }}>
                      <p className="text-xs font-bold" style={{ color: i === middleIdx ? BLUE : TEXT }}>{p.nome}</p>
                    </div>
                  ))}
                </div>
                {["Pipeline visual", "WhatsApp + IA", "Broadcast em massa", "Fluxos avançados", "Suporte dedicado"].map((feature, fi) => (
                  <div key={feature} className="grid" style={{ gridTemplateColumns: "1fr repeat(3, 1fr)", borderTop: `1px solid ${BORDER}`, background: fi % 2 === 0 ? CARD : BG }}>
                    <div className="p-3.5 px-5">
                      <span className="text-xs font-medium" style={{ color: TEXT_SEC }}>{feature}</span>
                    </div>
                    {plans.map((_, i) => {
                      const has = fi === 0 ? true : fi === 1 ? i >= 1 : fi === 2 ? i >= 1 : fi === 3 ? i >= 2 : i >= 2;
                      return (
                        <div key={i} className="p-3.5 flex justify-center items-center" style={{ borderLeft: `1px solid ${BORDER}` }}>
                          {has
                            ? <CheckCircle size={14} style={{ color: i === middleIdx ? BLUE : GREEN }} />
                            : <span style={{ color: TEXT_MUT, fontSize: 16 }}>—</span>
                          }
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
          <motion.div {...fade} className="rounded-[24px] p-10 text-center" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: CARD_SHADOW }}>
            <ShieldCheck size={36} style={{ color: cor, margin: "0 auto 16px" }} />
            <h2 className="font-extrabold tracking-[-0.03em] mb-4" style={{ fontSize: "clamp(24px, 3vw, 36px)", color: TEXT }}>
              Teste por 30 dias sem compromisso
            </h2>
            <p className="text-base mb-8 leading-relaxed" style={{ color: TEXT_SEC }}>
              Você pode criar sua conta, conhecer a plataforma e entender como o CRM se encaixa na sua operação antes de decidir continuar.
            </p>
            <div className="flex flex-wrap justify-center gap-5 mb-8">
              {["Sem cartão de crédito", "Sem fidelidade", "Cancele quando quiser", "Suporte para começar"].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={13} style={{ color: cor }} />
                  <span className="text-sm" style={{ color: TEXT_SEC }}>{t}</span>
                </div>
              ))}
            </div>
            <Link href={signupUrl} className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
              style={{ background: CTA_GRAD, color: "#fff", textDecoration: "none", boxShadow: "0 4px 20px rgba(6,182,212,0.30)" }}>
              Criar conta grátis <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-32 px-6" style={{ background: BG }}>
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade} className="text-center mb-10">
            <h2 className="font-extrabold tracking-[-0.02em]" style={{ fontSize: "clamp(24px, 3vw, 38px)", color: TEXT }}>Perguntas frequentes</h2>
          </motion.div>
          <motion.div {...fadeF(0.1)}>
            <FAQAccordion cor={cor} />
          </motion.div>
        </div>
      </section>

      {/* ── TRUST SECTION ── */}
      <section className="py-16 px-6" style={{ background: BG3, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[900px] mx-auto">
          <motion.div {...fade} className="text-center mb-8">
            <h2 className="text-2xl font-extrabold tracking-[-0.02em]" style={{ color: TEXT }}>Comece sem risco</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShieldCheck, title: "30 dias grátis", desc: "Teste completo sem limitação" },
              { icon: CreditCard, title: "Sem cartão", desc: "Não pedimos dados de pagamento" },
              { icon: Repeat, title: "Cancele quando quiser", desc: "Sem fidelidade ou multa" },
              { icon: Users, title: "Suporte incluso", desc: "Ajuda para começar do zero" },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fadeF(i * 0.08)} className="rounded-[18px] p-5 text-center"
                style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: CARD_SHADOW }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${cor}10` }}>
                  <Icon size={18} style={{ color: cor }} />
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: TEXT_MUT }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-32 px-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #EFF6FF, #F0FDFA)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 50% 60% at 50% 50%, ${cor}08, transparent 70%)` }} />
        <motion.div {...fade} className="relative max-w-[700px] mx-auto text-center">
          <div className="rounded-[28px] p-14 md:p-20" style={{
            background: CARD,
            border: `1px solid ${BLUE}20`,
            boxShadow: "0 8px 40px rgba(37,99,235,0.10), 0 2px 8px rgba(8,17,31,0.06)",
          }}>
            <h2 className="font-extrabold leading-[1.0] tracking-[-0.04em] mb-5" style={{ fontSize: "clamp(32px, 4.5vw, 56px)", color: TEXT }}>
              Seu WhatsApp pode{" "}
              <span style={{ background: CTA_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                vender melhor ainda hoje
              </span>
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: TEXT_SEC }}>
              Crie sua conta grátis, centralize seus leads e veja o CRM trabalhando na sua operação antes de pagar.
            </p>
            <Link href={signupUrl} className="inline-flex items-center gap-2.5 px-12 py-5 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
              style={{ background: CTA_GRAD, color: "#fff", textDecoration: "none", boxShadow: "0 6px 24px rgba(6,182,212,0.35)", fontSize: 16 }}>
              Criar conta grátis agora <ArrowRight size={20} />
            </Link>
            <p className="text-sm mt-6" style={{ color: TEXT_MUT }}>30 dias grátis • sem cartão • configuração em minutos</p>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6" style={{ borderTop: `1px solid ${BORDER}`, background: BG3 }}>
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            {agency?.logo_url
              ? <img src={agency.logo_url} alt={nome} style={{ height: 24, width: "auto" }} />
              : <div style={{ width: 24, height: 24, borderRadius: 7, background: cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" /></svg>
                </div>
            }
            <span className="text-sm font-bold" style={{ color: TEXT }}>{nome}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacidade" className="text-xs transition-colors" style={{ color: TEXT_MUT, textDecoration: "none" }}>Privacidade</Link>
            <Link href="/termos" className="text-xs transition-colors" style={{ color: TEXT_MUT, textDecoration: "none" }}>Termos</Link>
          </div>
          <p className="text-xs" style={{ color: TEXT_MUT }}>Powered by Liberty CRM</p>
        </div>
      </footer>

    </main>
  );
}
