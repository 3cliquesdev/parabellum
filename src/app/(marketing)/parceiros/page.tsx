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

// ─── Grain Overlay ───
function GrainOverlay({ opacity = 0.025 }: { opacity?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0, opacity,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
    }} />
  );
}

// ─── CRM Mockup V2 (maior e mais elaborado) ───
function CRMMockup() {
  return (
    <div className="relative w-full max-w-[680px]" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="rounded-[22px] overflow-hidden" style={{
        background: "linear-gradient(180deg, #131B2A 0%, #0B1120 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 60px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(34,197,94,0.08)",
      }}>
        {/* Header */}
        <div className="px-5 h-11 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0D1526" }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: GREEN }}>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
          </div>
          <span className="text-xs font-bold" style={{ color: WHITE }}>Digital Pro CRM</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>● Online</span>
            <div className="flex gap-1">{["#22C55E","#EAB308","#EF4444"].map(c=><div key={c} style={{width:7,height:7,borderRadius:99,background:c,opacity:0.7}}/>)}</div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-12 flex flex-col items-center gap-3 py-4 shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "#0A1020" }}>
            {[
              { Icon: BarChart2, active: false },
              { Icon: Users, active: true },
              { Icon: MessageSquare, active: false },
              { Icon: Megaphone, active: false },
              { Icon: Bot, active: false },
            ].map(({ Icon, active }, i) => (
              <div key={i} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: active ? `${GREEN}20` : "rgba(255,255,255,0.04)" }}>
                <Icon size={13} style={{ color: active ? GREEN : "#4B5563" }} />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-3">
            {/* MRR row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}18` }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#4B5563" }}>MRR</p>
                <p className="text-lg font-extrabold leading-none" style={{ color: GREEN }}>R$14.910</p>
                <p className="text-[9px] mt-0.5 font-bold" style={{ color: `${GREEN}70` }}>▲ +23% este mês</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: `${BLUE}08`, border: `1px solid ${BLUE}18` }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#4B5563" }}>Sua comissão</p>
                <p className="text-lg font-extrabold leading-none" style={{ color: BLUE }}>R$12.673</p>
                <p className="text-[9px] mt-0.5 font-bold" style={{ color: `${BLUE}70` }}>85% do MRR</p>
              </div>
            </div>

            {/* Clients */}
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>Workspaces ativos</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${GREEN}15`, color: GREEN }}>30 total</span>
              </div>
              {[
                { name: "Studio Pixel", color: GREEN, mrr: "R$497" },
                { name: "Clínica Vital", color: BLUE, mrr: "R$397" },
                { name: "Imóveis Plus", color: "#A78BFA", mrr: "R$597" },
              ].map(c => (
                <div key={c.name} className="flex items-center gap-2 py-1.5">
                  <div className="shrink-0" style={{ width: 6, height: 6, borderRadius: 99, background: c.color }} />
                  <span className="flex-1 text-[10px] font-medium" style={{ color: MUTED }}>{c.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: c.color }}>{c.mrr}/mês</span>
                </div>
              ))}
            </div>

            {/* Pipeline mini */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { l: "Novo", n: 8, c: BLUE, w: "60%" },
                { l: "Proposta", n: 5, c: "#EAB308", w: "40%" },
                { l: "Negoc.", n: 3, c: "#F97316", w: "25%" },
                { l: "Ganhos", n: 11, c: GREEN, w: "85%" },
              ].map(p => (
                <div key={p.l} className="rounded-lg p-2" style={{ background: `${p.c}10`, border: `1px solid ${p.c}22` }}>
                  <p className="text-base font-extrabold leading-none" style={{ color: p.c }}>{p.n}</p>
                  <p className="text-[8px] mt-1" style={{ color: `${p.c}80` }}>{p.l}</p>
                  <div className="mt-1.5 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ width: p.w, height: "100%", borderRadius: 99, background: p.c }} />
                  </div>
                </div>
              ))}
            </div>

            {/* IA card */}
            <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: `${GREEN}07`, border: `1px solid ${GREEN}18` }}>
              <Bot size={14} style={{ color: GREEN }} />
              <div className="flex-1">
                <p className="text-[10px] font-bold" style={{ color: GREEN }}>IA respondendo agora</p>
                <p className="text-[9px]" style={{ color: "#4B5563" }}>"Olá! Posso ajudar com o que precisar 😊"</p>
              </div>
              <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{background:GREEN,animationDelay:`${i*0.15}s`}}/>)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Floating Cards */}
      <motion.div animate={{ y: [0, -9, 0] }} transition={{ duration: 3.2, repeat: Infinity }}
        className="absolute -top-5 -right-3 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: "rgba(16,23,32,0.92)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>Recorrência</p>
        <p className="text-xl font-extrabold" style={{ color: GREEN }}>85%</p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>do que você cobrar</p>
      </motion.div>

      <motion.div animate={{ y: [0, 9, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 0.8 }}
        className="absolute -bottom-4 -right-3 rounded-2xl px-4 py-3 hidden md:block"
        style={{ background: "rgba(16,23,32,0.92)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>Sua comissão</p>
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
        <p className="text-base font-extrabold" style={{ color: "#A78BFA" }}>✓ Ativo</p>
        <p className="text-[9px]" style={{ color: "#4B5563" }}>Sua marca, seu domínio</p>
      </motion.div>

      {/* 5º card — WhatsApp + IA */}
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

// ─── Accordion FAQ ───
const FAQ_ITEMS = [
  { q: "O que é um CRM white-label?", a: "É um CRM que funciona com sua marca, domínio e identidade visual. Seus clientes veem apenas a sua empresa." },
  { q: "Posso cobrar meus próprios clientes?", a: "Sim. Você define os valores e condições. A plataforma não interfere no seu relacionamento comercial." },
  { q: "Liberty CRM aparece para meu cliente?", a: "Não. O ambiente é totalmente personalizado com a sua marca." },
  { q: "Preciso saber programar?", a: "Não. Tudo é configurado via painel, sem linha de código." },
  { q: "A IA responde WhatsApp automaticamente?", a: "Sim, 24h por dia, 7 dias por semana." },
  { q: "Posso treinar a IA com PDFs e sites?", a: "Sim. A IA aprende com qualquer documento ou URL que você fornecer." },
  { q: "Existe recorrência mensal?", a: "Sim. O modelo foi criado exatamente para gerar receita recorrente para parceiros." },
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

// ─── Delivery Mockups ───
function InboxMockup() {
  return (
    <div className="rounded-[18px] overflow-hidden" style={{ background: "linear-gradient(180deg,#131B2A,#0B1120)", border:`1px solid ${BORDER}` }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom:`1px solid ${BORDER}`, background:"#0D1526" }}>
        <MessageSquare size={12} style={{color:"#4ADE80"}}/>
        <span className="text-[10px] font-bold" style={{color:WHITE}}>Inbox WhatsApp</span>
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{background:`${GREEN}18`,color:GREEN}}>IA ativa 24h</span>
      </div>
      <div className="p-4 space-y-2">
        {[
          { from:"client", text:"Qual o plano ideal para mim?", time:"14:23" },
          { from:"ai", text:"Para até 500 leads, o plano Pro é perfeito! Quer que eu mostre o que inclui?", time:"14:23" },
          { from:"client", text:"Sim, me mostra!", time:"14:24" },
          { from:"ai", text:"O plano Pro inclui: pipeline ilimitado, WhatsApp com IA, relatórios avançados e suporte. Por apenas R$197/mês 🚀", time:"14:24" },
        ].map((m,i)=>(
          <div key={i} className={`flex ${m.from==="client"?"justify-end":"justify-start gap-1.5"}`}>
            {m.from==="ai" && <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{background:`${GREEN}18`}}><Bot size={9} style={{color:GREEN}}/></div>}
            <div>
              <div className="px-2.5 py-1.5 rounded-xl text-[10px] max-w-[82%] leading-relaxed"
                style={m.from==="client" ? {background:"#1E3A2F",color:"#86EFAC"} : {background:"#1C1F2E",color:MUTED}}>
                {m.text}
              </div>
              <p className="text-[8px] mt-0.5 px-1" style={{color:"#374151",textAlign:m.from==="client"?"right":"left"}}>{m.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineMockup() {
  return (
    <div className="rounded-[18px] overflow-hidden" style={{ background: "linear-gradient(180deg,#131B2A,#0B1120)", border:`1px solid ${BORDER}` }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom:`1px solid ${BORDER}`, background:"#0D1526" }}>
        <BarChart2 size={12} style={{color:BLUE}}/>
        <span className="text-[10px] font-bold" style={{color:WHITE}}>Pipeline Comercial</span>
        <span className="ml-auto text-[9px] font-bold" style={{color:"#EAB308"}}>R$47.000 em negociação</span>
      </div>
      <div className="p-3 grid grid-cols-4 gap-2">
        {[
          {l:"Novo",items:["João S.","Maria C.","Pedro L."],c:BLUE},
          {l:"Proposta",items:["Ana T.","Carlos M."],c:"#EAB308"},
          {l:"Negoc.",items:["Lucia F."],c:"#F97316"},
          {l:"Ganho",items:["Bruno K.","Carla N.","Rita S."],c:GREEN},
        ].map(col=>(
          <div key={col.l}>
            <p className="text-[9px] font-bold mb-1.5 px-1" style={{color:`${col.c}90`}}>{col.l} ({col.items.length})</p>
            {col.items.map(n=>(
              <div key={n} className="mb-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium" style={{background:`${col.c}12`,border:`1px solid ${col.c}20`,color:WHITE}}>
                {n}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="rounded-[18px] overflow-hidden" style={{ background: "linear-gradient(180deg,#131B2A,#0B1120)", border:`1px solid ${BORDER}` }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom:`1px solid ${BORDER}`, background:"#0D1526" }}>
        <TrendingUp size={12} style={{color:CYAN}}/>
        <span className="text-[10px] font-bold" style={{color:WHITE}}>Dashboard Performance</span>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[{l:"Leads",v:"248",c:BLUE},{l:"Conversão",v:"34%",c:GREEN},{l:"MRR",v:"R$14.910",c:CYAN},{l:"Mensagens",v:"1.247",c:"#A78BFA"}].map(m=>(
            <div key={m.l} className="rounded-lg p-2.5" style={{background:`${m.c}09`,border:`1px solid ${m.c}18`}}>
              <p className="text-base font-extrabold leading-none" style={{color:m.c}}>{m.v}</p>
              <p className="text-[9px] mt-0.5" style={{color:"#4B5563"}}>{m.l}</p>
            </div>
          ))}
        </div>
        {/* Mini bar chart */}
        <div className="rounded-lg p-2.5" style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${BORDER}`}}>
          <p className="text-[9px] font-bold mb-2" style={{color:"#4B5563"}}>Leads / semana</p>
          <div className="flex items-end gap-1 h-8">
            {[30,45,38,60,55,80,72].map((h,i)=>(
              <div key={i} className="flex-1 rounded-sm" style={{height:`${h}%`,background:i===5?GREEN:BLUE,opacity:i===5?1:0.4}}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CHECKS = [
  { icon: Globe, label: "CRM com sua marca" },
  { icon: MessageSquare, label: "WhatsApp com IA" },
  { icon: Users, label: "Workspaces por cliente" },
  { icon: ShieldCheck, label: "Domínio próprio" },
  { icon: TrendingUp, label: "Receita recorrente" },
];

const DORES = [
  { title: "Receita imprevisível", desc: "Projeto entra, projeto sai." },
  { title: "Sem recorrência", desc: "Começa do zero todo mês." },
  { title: "Escala limitada", desc: "Horas trocadas por dinheiro." },
  { title: "Alta dependência", desc: "Tráfego e fechamento constante." },
  { title: "Pouco ativo", desc: "Entrega mas não acumula valor." },
];


const TECH_CARDS = [
  {
    icon: Bot, title: "Gemini IA contextual", desc: "Memória, contexto e aprendizado com documentos.", color: "#A78BFA",
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
        <div className="px-2 py-1.5 rounded-lg text-[9px] flex items-center gap-1" style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}20`, color: BLUE }}>📄 PDF</div>
        <div style={{ color: "#4B5563", fontSize: 10 }}>→</div>
        <div className="px-2 py-1.5 rounded-lg text-[9px]" style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}20`, color: BLUE }}>🧠 IA</div>
        <div style={{ color: "#4B5563", fontSize: 10 }}>→</div>
        <div className="px-2 py-1.5 rounded-lg text-[9px]" style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}20`, color: BLUE }}>💬 Resp.</div>
      </div>
    ),
  },
  {
    icon: MessageSquare, title: "WhatsApp API oficial", desc: "Meta Cloud API, sem risco de banimento.", color: "#4ADE80",
    mini: (
      <div className="mt-3 rounded-lg p-2.5" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)" }}>
        <div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" /><span className="text-[9px] font-bold text-[#4ADE80]">online • IA ativa</span></div>
        <p className="text-[9px]" style={{ color: LIGHT }}>"Olá! Como posso ajudar hoje? 😊"</p>
      </div>
    ),
  },
  {
    icon: CreditCard, title: "Split ASAAS", desc: "Comissões distribuídas automaticamente.", color: GREEN,
    mini: (
      <div className="mt-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${GREEN}18` }}>
        <div className="h-2 flex">
          <div style={{ width: "15%", background: "#4B5563" }} />
          <div style={{ width: "85%", background: `linear-gradient(90deg, ${GREEN}, ${BLUE})` }} />
        </div>
        <div className="flex justify-between px-2 py-1">
          <span className="text-[9px]" style={{ color: "#4B5563" }}>Liberty 15%</span>
          <span className="text-[9px] font-bold" style={{ color: GREEN }}>Agência 85%</span>
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
    icon: ShieldCheck, title: "White-label completo", desc: "Zero menção à Liberty em nenhum lugar.", color: "#F97316",
    mini: (
      <div className="mt-3 flex items-center gap-2">
        <div className="px-2 py-1 rounded text-[9px] line-through" style={{ background: "rgba(248,113,113,0.08)", color: "#F87171" }}>Liberty CRM</div>
        <div style={{ color: "#4B5563", fontSize: 10 }}>→</div>
        <div className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", color: "#F97316" }}>Sua Marca</div>
      </div>
    ),
  },
];

const TARGETS = [
  "Agências de marketing", "Gestores de tráfego", "Consultores",
  "Especialistas em automação", "Social medias", "Freelancers",
  "Empreendedores digitais", "Agências de IA", "WhatsApp Marketing",
];

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun"];
const MRR_GROWTH = [2490, 4970, 7460, 9940, 12430, 14910];

// ─── ZPPIA Steps ───
const PARCEIROS_STEPS = [
  { num: "01", title: "Ative sua marca", desc: "Configure logo, cores, domínio e URL personalizada em menos de 30 minutos." },
  { num: "02", title: "Cadastre seus clientes", desc: "Cada cliente recebe um workspace isolado com acesso e dados individuais." },
  { num: "03", title: "Venda a mensalidade", desc: "Defina o valor que quiser. 85% do MRR fica com você todo mês, automaticamente." },
  { num: "04", title: "Acompanhe seu MRR", desc: "Dashboard exclusivo: veja faturamento, comissões e crescimento em tempo real." },
  { num: "05", title: "Escale sem desenvolver", desc: "Adicione novos clientes sem custo de infraestrutura, código ou equipe técnica." },
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

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16 px-6 md:px-12">
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
              <Zap size={11} /> CRM WHITE-LABEL PARA AGÊNCIAS
            </div>
            <h1 className="font-extrabold leading-[1.0] tracking-[-0.04em] mb-6"
              style={{ fontSize: "clamp(42px, 5.5vw, 80px)" }}>
              Tenha seu próprio CRM com sua marca e{" "}
              <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                gere recorrência
              </span>{" "}todos os meses
            </h1>
            <p className="text-lg md:text-xl mb-10 leading-relaxed" style={{ color: LIGHT, maxWidth: 520 }}>
              Venda CRM, WhatsApp com IA e automações para seus clientes sem precisar desenvolver tecnologia do zero.
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
              {["Setup rápido", "White-label", "IA integrada", "Receita recorrente"].map(t => (
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

      {/* ── PROVA RÁPIDA ── */}
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

      {/* ── O PROBLEMA ── */}
      <section className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <motion.div {...fade}>
            <p className="section-label mb-4">O Problema</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(36px, 4vw, 52px)" }}>
              Sua agência ainda vende serviço como se fosse{" "}
              <span style={{ color: MUTED }}>projeto único?</span>
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

      {/* ── VIRADA ── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(34,197,94,0.07), transparent 70%)` }} />
        <motion.div {...fade} className="relative max-w-[800px] mx-auto">
          <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em] mb-8" style={{ fontSize: "clamp(32px, 4.5vw, 64px)" }}>
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

      {/* ── COMO FUNCIONA — ZPPIA ── */}
      <section id="como-funciona" className="py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="mb-16">
            <p className="section-label mb-4">Como Funciona</p>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.03em]" style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>
              5 passos para sua agência{" "}
              <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                virar SaaS
              </span>
            </h2>
          </motion.div>
          <ZPPIASteps steps={PARCEIROS_STEPS} color={GREEN} />
        </div>
      </section>

      {/* ── SUA AGÊNCIA COMO SAAS ── */}
      <section className="py-32 px-6 relative overflow-hidden" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 30% 50%, rgba(34,197,94,0.06), transparent 70%)` }} />
        <GrainOverlay opacity={0.02} />
        <div className="relative max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Mockup painel agência — 3 colunas */}
          <motion.div {...fadeF(0.1)} className="lg:col-span-3">
            <div className="rounded-[22px] overflow-hidden" style={{
              background: "linear-gradient(180deg, #0D1526 0%, #080F1C 100%)",
              border: `1px solid rgba(34,197,94,0.2)`,
              boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(34,197,94,0.08)`,
              transform: "perspective(1800px) rotateX(2deg) rotateY(1deg)",
            }}>
              {/* Header */}
              <div className="px-5 h-10 flex items-center gap-3" style={{ borderBottom: `1px solid rgba(34,197,94,0.12)`, background: "#060D19" }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: GREEN }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
                </div>
                <span className="text-xs font-bold" style={{ color: WHITE }}>Agência Digital Pro — Painel de Parceiro</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[9px] font-mono" style={{ color: "#4B5563" }}>agenciadigitalpro.crm.com.br</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>white-label: ativo</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { l: "Clientes ativos", v: "30", c: GREEN },
                    { l: "MRR total", v: "R$14.910", c: BLUE },
                    { l: "Sua comissão", v: "R$12.673", c: CYAN },
                    { l: "Workspaces", v: "30/50", c: "#A78BFA" },
                  ].map(m => (
                    <div key={m.l} className="rounded-xl p-3" style={{ background: `${m.c}08`, border: `1px solid ${m.c}18` }}>
                      <p className="text-sm font-extrabold leading-none" style={{ color: m.c }}>{m.v}</p>
                      <p className="text-[9px] mt-1" style={{ color: "#4B5563" }}>{m.l}</p>
                    </div>
                  ))}
                </div>
                {/* Client list */}
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4B5563" }}>Clientes</p>
                    <button className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${GREEN}15`, color: GREEN }}>+ Criar novo cliente</button>
                  </div>
                  {[
                    { name: "Studio Pixel", mrr: "R$497", status: "Pago", sc: GREEN },
                    { name: "Clínica Vital", mrr: "R$397", status: "Pago", sc: GREEN },
                    { name: "Imóveis Plus", mrr: "R$597", status: "Trial 12d", sc: "#EAB308" },
                    { name: "Escritório JM", mrr: "R$297", status: "Pendente", sc: "#F97316" },
                  ].map(c => (
                    <div key={c.name} className="flex items-center gap-3 py-1.5" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold shrink-0" style={{ background: `${GREEN}15`, color: GREEN }}>{c.name[0]}</div>
                      <span className="flex-1 text-[10px] font-medium" style={{ color: MUTED }}>{c.name}</span>
                      <span className="text-[9px] font-bold" style={{ color: GREEN }}>{c.mrr}/mês</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${c.sc}12`, color: c.sc }}>{c.status}</span>
                    </div>
                  ))}
                </div>
                {/* Growth chart */}
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#4B5563" }}>Crescimento MRR</p>
                  <div className="flex items-end gap-1.5 h-10">
                    {[15, 25, 35, 48, 60, 75, 88, 100].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 7 ? `linear-gradient(180deg,${GREEN},${BLUE})` : `${GREEN}25`, boxShadow: i === 7 ? `0 0 10px ${GREEN}40` : "none" }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Benefits — 2 colunas */}
          <motion.div {...fade} className="lg:col-span-2 space-y-6">
            <p className="section-label">Sua agência como SaaS</p>
            <h2 className="font-extrabold leading-[1.05] tracking-[-0.04em]" style={{ fontSize: "clamp(32px, 3.5vw, 48px)" }}>
              Sua agência.{" "}
              <span style={{ background: `linear-gradient(135deg,${GREEN},${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Agora com um produto SaaS próprio.
              </span>
            </h2>
            <div className="space-y-4">
              {[
                { title: "Receita que não acaba", desc: "Cada cliente paga todo mês. Sem precisar vender novamente." },
                { title: "Produto com sua marca", desc: "Seu cliente nunca vê Liberty CRM. Só vê você." },
                { title: "Escala sem limites", desc: "Adicione 1 ou 100 clientes com o mesmo esforço." },
                { title: "Tecnologia pronta", desc: "Zero desenvolvimento. Zero servidor. Zero manutenção." },
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

      {/* ── MRR SEÇÃO MELHORADA ── */}
      <section id="mrr" className="py-20 px-6 relative overflow-hidden" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <p className="section-label mb-4">Potencial de Recorrência</p>
            <h2 className="font-extrabold leading-[1.0] tracking-[-0.05em]" style={{ fontSize: "clamp(64px, 10vw, 128px)", background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              R$14.910
            </h2>
            <p className="text-lg mt-2" style={{ color: MUTED }}>por mês com apenas 30 clientes pagando R$497</p>
          </motion.div>

          {/* Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            <motion.div {...fade} className="rounded-2xl p-6" style={{ background: CARD, border: "1px solid rgba(239,68,68,0.12)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#F87171" }}>Serviço pontual</p>
              <p className="text-4xl font-extrabold mb-1" style={{ color: "#F87171" }}>R$5.000</p>
              <p className="text-sm" style={{ color: MUTED }}>por projeto • entra uma vez • não volta</p>
              <div className="mt-4 h-1.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)" }}>
                <div style={{ width: "33%", height: "100%", borderRadius: 99, background: "#F87171" }} />
              </div>
            </motion.div>
            <motion.div {...fadeF(0.15)} className="rounded-2xl p-6" style={{ background: `linear-gradient(180deg, rgba(34,197,94,0.07), ${CARD})`, border: `1px solid ${GREEN}22` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: GREEN }}>Receita recorrente</p>
              <p className="text-4xl font-extrabold mb-1" style={{ color: GREEN }}>R$14.910</p>
              <p className="text-sm" style={{ color: MUTED }}>todo mês • cresce • multiplica</p>
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
              Quero construir minha recorrência <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── CTA INTERMEDIÁRIO ── */}
      <section className="py-10 px-6">
        <motion.div {...fade} className="max-w-[600px] mx-auto text-center">
          <p className="text-base font-medium mb-4" style={{ color: MUTED }}>
            Pronto para transformar sua agência em uma empresa de tecnologia?
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl font-bold text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GREEN}25`, color: GREEN }}>
            Quero transformar minha agência em SaaS <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* ── SIMULADOR MRR ── */}
      <section className="py-20 px-6">
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fade} className="text-center mb-10">
            <p className="section-label mb-4">Simulador</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              Veja o potencial da <span style={{ color: GREEN }}>sua operação</span>
            </h2>
          </motion.div>
          <motion.div {...fadeF(0.15)}><MRRCalculator /></motion.div>
        </div>
      </section>

      {/* ── O QUE SUA AGÊNCIA ENTREGA ── */}
      <section id="produto" className="py-32 px-6" style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-14">
            <p className="section-label mb-4">O Produto</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              O que sua agência entrega para{" "}
              <span style={{ color: GREEN }}>cada cliente</span>
            </h2>
            <p className="text-lg mt-4 max-w-xl mx-auto" style={{ color: MUTED }}>Três módulos integrados que transformam a operação do seu cliente</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: "Inbox WhatsApp com IA", desc: "Atendimento 24h via WhatsApp, com IA que entende o contexto e responde como vendedor.", Component: InboxMockup, color: "#4ADE80" },
              { title: "Pipeline Comercial", desc: "Kanban visual para acompanhar leads do primeiro contato até o fechamento.", Component: PipelineMockup, color: BLUE },
              { title: "Dashboard de Performance", desc: "Métricas em tempo real para a agência e o cliente acompanharem os resultados.", Component: DashboardMockup, color: CYAN },
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

      {/* ── TECH ENTERPRISE ── */}
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

      {/* ── PRODUCT THEATRE ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(34,197,94,0.07), transparent 70%)` }} />
        <GrainOverlay opacity={0.025} />
        <div className="relative max-w-[1100px] mx-auto">
          <motion.div {...fade} className="text-center mb-12">
            <p className="section-label mb-4">Product Theatre</p>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Seu SaaS white-label <span style={{ color: GREEN }}>em operação</span>
            </h2>
            <p className="text-lg mt-4" style={{ color: MUTED }}>É assim que seus clientes veem o produto que você vende</p>
          </motion.div>

          <motion.div {...fadeF(0.15)} style={{ transform: "perspective(2000px) rotateX(3deg)" }}>
            <div className="rounded-[20px] overflow-hidden" style={{
              background: "linear-gradient(180deg, #0D1526, #060D19)",
              border: `1px solid rgba(34,197,94,0.2)`,
              boxShadow: `0 80px 160px rgba(0,0,0,0.9), 0 0 120px rgba(34,197,94,0.08)`,
            }}>
              {/* App header */}
              <div className="px-6 h-12 flex items-center gap-3" style={{ borderBottom: `1px solid rgba(34,197,94,0.12)`, background: "#040C1A" }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: GREEN }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
                </div>
                <span className="text-sm font-bold" style={{ color: WHITE }}>Digital Pro CRM</span>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: "#4B5563" }}>digitalpro.crm.com.br</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: `${GREEN}15`, color: GREEN }}>✓ white-label</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-0">
                {/* Sidebar */}
                <div className="col-span-2 py-5 px-3 space-y-2" style={{ borderRight: `1px solid rgba(255,255,255,0.05)`, background: "rgba(0,0,0,0.2)" }}>
                  {[Building2, Users, MessageSquare, BarChart2, Bot, DollarSign].map((Icon, i) => (
                    <div key={i} className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto" style={{ background: i === 0 ? `${GREEN}20` : "rgba(255,255,255,0.04)" }}>
                      <Icon size={14} style={{ color: i === 0 ? GREEN : "#4B5563" }} />
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="col-span-10 p-5 space-y-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { l: "Clientes", v: "30", c: GREEN, sub: "+3 este mês" },
                      { l: "MRR", v: "R$14.910", c: BLUE, sub: "▲ +23%" },
                      { l: "Comissão", v: "R$12.673", c: CYAN, sub: "85% do MRR" },
                      { l: "IA ativa", v: "100%", c: "#A78BFA", sub: "24h por dia" },
                    ].map(m => (
                      <div key={m.l} className="rounded-xl p-3" style={{ background: `${m.c}08`, border: `1px solid ${m.c}15` }}>
                        <p className="text-lg font-extrabold leading-none" style={{ color: m.c }}>{m.v}</p>
                        <p className="text-[10px] mt-1 font-medium" style={{ color: WHITE }}>{m.l}</p>
                        <p className="text-[9px]" style={{ color: "#4B5563" }}>{m.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Content grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Client list */}
                    <div className="col-span-2 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#4B5563" }}>Workspaces ativos</p>
                      {[
                        { n: "Studio Pixel", v: "R$497/mês", s: "Pago", c: GREEN },
                        { n: "Clínica Vital", v: "R$397/mês", s: "Pago", c: GREEN },
                        { n: "Imóveis Plus", v: "R$597/mês", s: "Trial", c: "#EAB308" },
                        { n: "Escritório JM", v: "R$297/mês", s: "Pago", c: GREEN },
                        { n: "E-shop Br", v: "R$497/mês", s: "Pendente", c: "#F97316" },
                      ].map(c => (
                        <div key={c.n} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: `${GREEN}15`, color: GREEN }}>{c.n[0]}</div>
                          <span className="flex-1 text-[10px] font-medium" style={{ color: MUTED }}>{c.n}</span>
                          <span className="text-[9px] font-bold" style={{ color: GREEN }}>{c.v}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${c.c}12`, color: c.c }}>{c.s}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chart */}
                    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#4B5563" }}>Crescimento MRR</p>
                      <div className="flex items-end gap-1 h-16 mb-2">
                        {[10, 20, 30, 42, 55, 68, 80, 95, 100].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t-sm" style={{
                            height: `${h}%`,
                            background: i === 8 ? `linear-gradient(180deg,${GREEN},${BLUE})` : `${GREEN}20`,
                            boxShadow: i === 8 ? `0 0 8px ${GREEN}50` : "none",
                          }} />
                        ))}
                      </div>
                      <p className="text-[10px] font-bold" style={{ color: GREEN }}>R$14.910/mês ▲</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHITE-LABEL ANTES/DEPOIS ── */}
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

      {/* ── CTA FINAL ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,197,94,0.08), transparent 70%)` }} />
        <motion.div {...fade} className="relative max-w-[700px] mx-auto text-center">
          <div className="rounded-[28px] p-12 md:p-16" style={{
            background: `linear-gradient(135deg, rgba(34,197,94,0.07), rgba(59,130,246,0.05))`,
            border: `1px solid rgba(34,197,94,0.15)`,
          }}>
            <h2 className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-6" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Comece a construir sua{" "}
              <span style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>recorrência hoje</span>
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: MUTED }}>Você cuida dos clientes. A Liberty cuida da tecnologia.</p>
            <Link href="/signup" className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, color: WHITE, boxShadow: `0 0 50px rgba(34,197,94,0.3)` }}>
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

      {/* ── FAQ ACCORDION ── */}
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
